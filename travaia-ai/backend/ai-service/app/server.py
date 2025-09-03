# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import google.auth
import structlog
from fastapi import FastAPI, Depends, Request, HTTPException
from google.adk.cli.fast_api import get_fast_api_app
from google.cloud import logging as google_cloud_logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider, export
from vertexai import agent_engines

from app.utils.gcs import create_bucket_if_not_exists
from app.utils.tracing import CloudTraceLoggingSpanExporter
from app.utils.typing import Feedback

# Initialize structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)
logger = structlog.get_logger()

# Initialize services with error handling
session_service_uri = None

def initialize_services():
    """Initialize services with detailed error logging"""
    global session_service_uri
    try:
        logger.info("Initializing Firebase and AI services...")
        _, project_id = google.auth.default()
        os.environ.setdefault("GOOGLE_CLOUD_PROJECT", project_id)
        os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
        os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")

        bucket_name = f"gs://{project_id}-travaia-ai-logs-data"
        create_bucket_if_not_exists(
            bucket_name=bucket_name, project=project_id, location="us-central1"
        )

        provider = TracerProvider()
        processor = export.BatchSpanProcessor(CloudTraceLoggingSpanExporter())
        provider.add_span_processor(processor)
        trace.set_tracer_provider(provider)

        agent_name = os.environ.get("AGENT_ENGINE_SESSION_NAME", "app")
        existing_agents = list(agent_engines.list(filter=f'display_name="{agent_name}"'))

        if existing_agents:
            agent_engine = existing_agents[0]
        else:
            agent_engine = agent_engines.create(display_name=agent_name)

        session_service_uri = f"agentengine://{agent_engine.resource_name}"
        logger.info("AI services initialized successfully")

    except Exception as e:
        logger.error("AI service initialization failed", error=str(e))
        session_service_uri = "inmemory://"
        logger.warning("Fell back to InMemorySessionService due to initialization failure.")

app = FastAPI(
    title="TRAVAIA AI Service",
    description="AI-powered features for the Travaia platform.",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    initialize_services()
    global app
    AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    allow_origins = (
        os.getenv("ALLOW_ORIGINS", "").split(",") if os.getenv("ALLOW_ORIGINS") else ["*"]
    )
    _, project_id = google.auth.default()
    bucket_name = f"gs://{project_id}-travaia-ai-logs-data"
    adk_app = get_fast_api_app(
        agents_dir=AGENT_DIR,
        web=True,
        artifact_service_uri=bucket_name,
        allow_origins=allow_origins,
        session_service_uri=session_service_uri,
    )
    app.mount("/", adk_app)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "travaia-ai-service"}

@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect and log feedback."""
    logger.info("feedback_received", feedback=feedback.model_dump())
    return {"status": "success"}

# Main execution
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)