"""
Database Connection Pooling for TRAVAIA Backend Services
Provides efficient connection management for Firebase Firestore
"""

import asyncio
from typing import Optional, Dict, Any
import firebase_admin
from firebase_admin import firestore, credentials
from google.cloud import secretmanager
import json
import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass
import time

logger = logging.getLogger(__name__)

@dataclass
class ConnectionPoolConfig:
    max_connections: int = 10
    min_connections: int = 2
    connection_timeout: float = 30.0
    idle_timeout: float = 300.0  # 5 minutes
    max_retries: int = 3
    retry_delay: float = 1.0

class FirestoreConnection:
    def __init__(self, client: firestore.Client):
        self.client = client
        self.created_at = time.time()
        self.last_used = time.time()
        self.in_use = False
        self.connection_id = id(self)

    def mark_used(self):
        self.last_used = time.time()
        self.in_use = True

    def mark_available(self):
        self.in_use = False

    def is_expired(self, idle_timeout: float) -> bool:
        return time.time() - self.last_used > idle_timeout

class FirestoreConnectionPool:
    def __init__(self, project_id: str, config: ConnectionPoolConfig = None):
        self.project_id = project_id
        self.config = config or ConnectionPoolConfig()
        self.connections: Dict[int, FirestoreConnection] = {}
        self.available_connections = asyncio.Queue()
        self.total_connections = 0
        self._lock = asyncio.Lock()
        self._initialized = False
        self._secret_client = None

    async def initialize(self):
        """Initialize the connection pool"""
        if self._initialized:
            return

        async with self._lock:
            if self._initialized:
                return

            try:
                # Get Firebase credentials from Secret Manager
                await self._load_firebase_credentials()
                
                # Create minimum number of connections
                for _ in range(self.config.min_connections):
                    await self._create_connection()
                
                self._initialized = True
                logger.info(f"Firestore connection pool initialized with {self.total_connections} connections")
                
            except Exception as e:
                logger.error(f"Failed to initialize Firestore connection pool: {e}")
                raise

    async def _load_firebase_credentials(self):
        """Load Firebase credentials from Google Secret Manager"""
        try:
            if not self._secret_client:
                self._secret_client = secretmanager.SecretManagerServiceClient()
            
            secret_name = f"projects/{self.project_id}/secrets/firebase-service-account/versions/latest"
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                self._secret_client.access_secret_version,
                {"name": secret_name}
            )
            
            credentials_data = json.loads(response.payload.data.decode('utf-8'))
            
            # Initialize Firebase Admin SDK if not already done
            if not firebase_admin._apps:
                cred = credentials.Certificate(credentials_data)
                firebase_admin.initialize_app(cred, {
                    'projectId': self.project_id
                })
            
        except Exception as e:
            logger.error(f"Failed to load Firebase credentials: {e}")
            raise

    async def _create_connection(self) -> FirestoreConnection:
        """Create a new Firestore connection"""
        try:
            client = firestore.client()
            connection = FirestoreConnection(client)
            
            self.connections[connection.connection_id] = connection
            await self.available_connections.put(connection)
            self.total_connections += 1
            
            logger.debug(f"Created new Firestore connection {connection.connection_id}")
            return connection
            
        except Exception as e:
            logger.error(f"Failed to create Firestore connection: {e}")
            raise

    @asynccontextmanager
    async def get_connection(self):
        """Get a connection from the pool (context manager)"""
        if not self._initialized:
            await self.initialize()

        connection = None
        try:
            # Try to get an available connection
            try:
                connection = await asyncio.wait_for(
                    self.available_connections.get(),
                    timeout=self.config.connection_timeout
                )
            except asyncio.TimeoutError:
                # If no connection available and we haven't reached max, create new one
                async with self._lock:
                    if self.total_connections < self.config.max_connections:
                        connection = await self._create_connection()
                    else:
                        raise ConnectionPoolExhaustedError("No connections available and pool is at maximum capacity")

            connection.mark_used()
            yield connection.client
            
        finally:
            if connection:
                connection.mark_available()
                await self.available_connections.put(connection)

    async def cleanup_expired_connections(self):
        """Remove expired connections from the pool"""
        async with self._lock:
            expired_connections = []
            
            for conn_id, connection in self.connections.items():
                if (not connection.in_use and 
                    connection.is_expired(self.config.idle_timeout) and
                    self.total_connections > self.config.min_connections):
                    expired_connections.append(conn_id)
            
            for conn_id in expired_connections:
                del self.connections[conn_id]
                self.total_connections -= 1
                logger.debug(f"Removed expired connection {conn_id}")

    async def get_pool_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        available_count = self.available_connections.qsize()
        in_use_count = sum(1 for conn in self.connections.values() if conn.in_use)
        
        return {
            "total_connections": self.total_connections,
            "available_connections": available_count,
            "in_use_connections": in_use_count,
            "max_connections": self.config.max_connections,
            "min_connections": self.config.min_connections,
            "pool_utilization": in_use_count / max(self.total_connections, 1),
            "initialized": self._initialized
        }

    async def close_all_connections(self):
        """Close all connections in the pool"""
        async with self._lock:
            self.connections.clear()
            
            # Clear the queue
            while not self.available_connections.empty():
                try:
                    self.available_connections.get_nowait()
                except asyncio.QueueEmpty:
                    break
            
            self.total_connections = 0
            self._initialized = False
            logger.info("All Firestore connections closed")

class ConnectionPoolExhaustedError(Exception):
    """Raised when connection pool is exhausted"""
    pass

# Global connection pool instance
_connection_pool: Optional[FirestoreConnectionPool] = None

async def get_firestore_pool(project_id: str) -> FirestoreConnectionPool:
    """Get or create the global Firestore connection pool"""
    global _connection_pool
    
    if _connection_pool is None:
        _connection_pool = FirestoreConnectionPool(project_id)
        await _connection_pool.initialize()
    
    return _connection_pool

async def get_firestore_client(project_id: str):
    """Get a Firestore client from the connection pool (context manager)"""
    pool = await get_firestore_pool(project_id)
    return pool.get_connection()

# Cleanup task for expired connections
async def connection_pool_cleanup_task(project_id: str, interval: int = 300):
    """Background task to clean up expired connections"""
    while True:
        try:
            pool = await get_firestore_pool(project_id)
            await pool.cleanup_expired_connections()
            await asyncio.sleep(interval)
        except Exception as e:
            logger.error(f"Error in connection pool cleanup: {e}")
            await asyncio.sleep(interval)
