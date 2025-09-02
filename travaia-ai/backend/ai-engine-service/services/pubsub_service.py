"""
Pub/Sub Service for AI Engine
Handles event-driven communication between microservices via Google Cloud Pub/Sub
"""

import asyncio
import json
import os
from typing import Dict, Any, Optional, Callable, List
import structlog
from google.cloud import pubsub_v1
from tenacity import retry, stop_after_attempt, wait_exponential
from concurrent.futures import TimeoutError

# Initialize logger
logger = structlog.get_logger(__name__)

class PubSubService:
    """Google Cloud Pub/Sub integration for enterprise event communication"""
    
    def __init__(self):
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
        self.publisher = pubsub_v1.PublisherClient()
        self.subscriber = pubsub_v1.SubscriberClient()
        
        # Topics related to AI Engine Service
        self.topics = {
            "job_analysis": f"projects/{self.project_id}/topics/job-analysis-events",
            "interview_questions": f"projects/{self.project_id}/topics/interview-questions-events",
            "interview_feedback": f"projects/{self.project_id}/topics/interview-feedback-events",
            "ai_report_generation": f"projects/{self.project_id}/topics/ai-report-events",
            "speech_processing": f"projects/{self.project_id}/topics/speech-processing-events"
        }
        
        # Subscriptions this service listens to
        self.subscriptions = {
            "job_analysis": f"projects/{self.project_id}/subscriptions/ai-engine-job-analysis-sub",
            "interview_requests": f"projects/{self.project_id}/subscriptions/ai-engine-interview-requests-sub",
            "feedback_requests": f"projects/{self.project_id}/subscriptions/ai-engine-feedback-requests-sub",
            "speech_processing": f"projects/{self.project_id}/subscriptions/ai-engine-speech-processing-sub"
        }
        
        # Active subscription listeners (for cleanup)
        self.active_listeners = {}
        
        logger.info("PubSub service initialized", project=self.project_id)
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def publish_event(self, topic_name: str, data: Dict[str, Any], attributes: Optional[Dict[str, str]] = None) -> str:
        """
        Publish an event to a specific topic with retry logic
        
        Args:
            topic_name: Key name of topic from self.topics dictionary
            data: Dictionary of data to publish
            attributes: Optional metadata for the message
            
        Returns:
            Message ID of the published message
        """
        try:
            # Get the full topic path
            if topic_name not in self.topics:
                raise ValueError(f"Topic {topic_name} is not configured")
                
            topic_path = self.topics[topic_name]
            message_data = json.dumps(data).encode("utf-8")
            
            # Add default attributes if none provided
            if attributes is None:
                attributes = {}
            
            # Add service identifier and timestamp
            attributes.update({
                "service": "ai-engine-service",
                "event_type": topic_name
            })
            
            # Use asyncio to run the synchronous publish in a thread pool
            future = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.publisher.publish(
                    topic_path,
                    data=message_data,
                    **attributes
                )
            )
            
            # Get the message ID
            message_id = await asyncio.wrap_future(future)
            
            logger.info("Event published successfully", 
                topic=topic_name, 
                message_id=message_id,
                attributes=attributes
            )
            
            return message_id
            
        except Exception as e:
            logger.error("Failed to publish event", 
                topic=topic_name, 
                error=str(e), 
                data_size=len(json.dumps(data))
            )
            raise
    
    async def subscribe_to_topic(self, subscription_name: str, callback: Callable, timeout: Optional[int] = None):
        """
        Subscribe to a topic and process messages with the provided callback
        
        Args:
            subscription_name: Key name from self.subscriptions dictionary
            callback: Async function to process messages (must accept message object)
            timeout: Optional timeout in seconds
        """
        try:
            if subscription_name not in self.subscriptions:
                raise ValueError(f"Subscription {subscription_name} is not configured")
                
            subscription_path = self.subscriptions[subscription_name]
            
            # Define the synchronous callback that will run the async callback
            def message_callback(message):
                try:
                    # Parse message data
                    data = json.loads(message.data.decode("utf-8"))
                    
                    # Create asyncio task to run the callback
                    loop = asyncio.get_event_loop()
                    task = loop.create_task(callback(data, dict(message.attributes)))
                    
                    # Acknowledge the message only after callback has processed it
                    task.add_done_callback(lambda _: message.ack())
                    
                except Exception as e:
                    logger.error("Error processing message", 
                        subscription=subscription_name, 
                        error=str(e),
                        message_id=message.message_id
                    )
                    # Don't ack the message on error so it can be retried
                    message.nack()
            
            # Start the subscriber
            streaming_pull_future = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.subscriber.subscribe(
                    subscription_path, 
                    callback=message_callback
                )
            )
            
            # Store for cleanup
            self.active_listeners[subscription_name] = streaming_pull_future
            
            logger.info("Subscribed to topic", subscription=subscription_name)
            
            # If timeout is provided, wait for that duration
            if timeout:
                try:
                    await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: streaming_pull_future.result(timeout=timeout)
                    )
                except TimeoutError:
                    streaming_pull_future.cancel()
                    logger.info("Subscription timed out", subscription=subscription_name)
            
        except Exception as e:
            logger.error("Error subscribing to topic", 
                subscription=subscription_name, 
                error=str(e)
            )
            raise
    
    async def stop_subscription(self, subscription_name: str):
        """Stop a specific subscription"""
        if subscription_name in self.active_listeners:
            try:
                self.active_listeners[subscription_name].cancel()
                logger.info("Subscription stopped", subscription=subscription_name)
            except Exception as e:
                logger.error("Error stopping subscription", 
                    subscription=subscription_name, 
                    error=str(e)
                )
            finally:
                del self.active_listeners[subscription_name]
    
    async def stop_all_subscriptions(self):
        """Stop all active subscriptions"""
        for subscription_name in list(self.active_listeners.keys()):
            await self.stop_subscription(subscription_name)
    
    @staticmethod
    async def create_topic_if_not_exists(publisher_client, topic_path: str) -> bool:
        """Create a topic if it doesn't exist"""
        try:
            publisher_client.create_topic(name=topic_path)
            logger.info(f"Topic created: {topic_path}")
            return True
        except Exception as e:
            if "AlreadyExists" in str(e):
                logger.info(f"Topic already exists: {topic_path}")
                return True
            logger.error(f"Error creating topic: {str(e)}")
            return False
            
    @staticmethod
    async def create_subscription_if_not_exists(subscriber_client, subscription_path: str, topic_path: str) -> bool:
        """Create a subscription if it doesn't exist"""
        try:
            subscriber_client.create_subscription(
                name=subscription_path, topic=topic_path
            )
            logger.info(f"Subscription created: {subscription_path}")
            return True
        except Exception as e:
            if "AlreadyExists" in str(e):
                logger.info(f"Subscription already exists: {subscription_path}")
                return True
            logger.error(f"Error creating subscription: {str(e)}")
            return False
    
    async def ensure_topics_and_subscriptions(self) -> bool:
        """Ensure all required topics and subscriptions exist"""
        try:
            # Create topics
            for topic_name, topic_path in self.topics.items():
                await self.create_topic_if_not_exists(self.publisher, topic_path)
            
            # Create subscriptions (mapping from subscription name to topic)
            subscription_to_topic = {
                "job_analysis": "job_analysis",
                "interview_requests": "interview_questions",
                "feedback_requests": "interview_feedback",
                "speech_processing": "speech_processing"
            }
            
            for sub_name, topic_name in subscription_to_topic.items():
                if sub_name in self.subscriptions and topic_name in self.topics:
                    await self.create_subscription_if_not_exists(
                        self.subscriber,
                        self.subscriptions[sub_name],
                        self.topics[topic_name]
                    )
            
            return True
        
        except Exception as e:
            logger.error("Failed to ensure topics and subscriptions", error=str(e))
            return False
