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

import logging
import os

import google.auth
from google.oauth2 import service_account
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from google.adk.cli.fast_api import get_fast_api_app
from google.cloud import logging as google_cloud_logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider, export

from config import app_config
from app.utils.gcs import create_bucket_if_not_exists
from app.utils.tracing import CloudTraceLoggingSpanExporter
from app.utils.typing import Feedback

# --- Local Development: Service Account Path ---
# For local development, specify the path to your service account key file.
# This is used as a fallback if Application Default Credentials (ADC) are not found.
SERVICE_ACCOUNT_FILE = "service-account.json"
# ---------------------------------------------

def initialize_services():
    """Initialize Google Cloud services and tracing."""
    credentials = None
    project = None

    # In production (e.g., Cloud Run), we rely on Workload Identity.
    # For local development, we use a service account file.
    is_production = os.getenv("ENV") == "production"

    if not is_production:
        # Set GOOGLE_APPLICATION_CREDENTIALS for local dev only
        service_account_path = os.path.abspath(SERVICE_ACCOUNT_FILE)
        if os.path.exists(service_account_path):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = service_account_path
            print(f"Set GOOGLE_APPLICATION_CREDENTIALS for local dev: {service_account_path}")
        else:
            print(f"Service account file not found for local dev: {service_account_path}")

    try:
        # In production, ADC uses the attached service account via Workload Identity.
        # In local dev, it uses GOOGLE_APPLICATION_CREDENTIALS if set.
        credentials, project = google.auth.default()
        print("Successfully authenticated using Application Default Credentials.")
    except google.auth.exceptions.DefaultCredentialsError:
        print("Application Default Credentials not found.")
        # Fallback to service account file is only for local development
        if not is_production and os.path.exists(SERVICE_ACCOUNT_FILE):
            try:
                credentials = service_account.Credentials.from_service_account_file(
                    SERVICE_ACCOUNT_FILE
                )
                app_config.project_id = credentials.project_id
                project = app_config.project_id
                print(
                    f"Authenticated using service account file: {SERVICE_ACCOUNT_FILE}"
                )
            except Exception as e:
                print(f"Error loading service account file: {e}")
        else:
            # In production, this is a fatal error if ADC fails.
            print(
                "Could not authenticate. Ensure ADC is configured for production or "
                "service account file is present for local dev."
            )

    if credentials and project:
        logging_client = google_cloud_logging.Client(credentials=credentials, project=project)
        logger = logging_client.logger(__name__)
        print("Successfully initialized Google Cloud Logging.")
        return logger, credentials
    else:
        print("--- GCloud Auth Missing ---")
        print("Could not find Google Cloud credentials.")
        print("Falling back to standard Python logging.")
        print("To enable Cloud Logging, configure ADC or check the SERVICE_ACCOUNT_FILE path.")
        print("---------------------------")
        logging.basicConfig(level=logging.INFO)
        return logging.getLogger(__name__), None

# Get the main FastAPI app from ADK
app: FastAPI = get_fast_api_app(
    agents_dir=".",
    web=True,
    allow_origins=app_config.allow_origins,
)
app.title = "TRAVAIA AI Service"
app.description = "AI-powered multi-agent platform for travel assistance."
app.version = "1.0.0"

# Global logger
logger = None

@app.on_event("startup")
async def startup_event():
    global logger
    logger, credentials = initialize_services()

    # Update app_config with the correct project ID from credentials if available
    if credentials and credentials.project_id:
        app_config.project_id = credentials.project_id

    # Create bucket for main app logs
    bucket_name = f"gs://{app_config.project_id}-{app_config.bucket_suffix}"
    create_bucket_if_not_exists(
        bucket_name=bucket_name,
        project=app_config.project_id,
        location=app_config.location,
        credentials=credentials
    )

    print(f"TRAVAIA AI Service starting on port {app_config.port}")
    print(f"Health check: http://localhost:{app_config.port}/health")
    print(f"API docs: http://localhost:{app_config.port}/docs")
    print(f"ADK Dev UI: http://localhost:{app_config.port}/dev-ui/")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "travaia-ai-service"}

@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect and log feedback."""
    if logger:
        logger.info("feedback_received", feedback=feedback.model_dump())
    return {"status": "success"}


