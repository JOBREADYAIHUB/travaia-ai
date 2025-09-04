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
from dataclasses import dataclass

import google.auth

# To use AI Studio credentials:
# 1. Create a .env file in the root directory with:
#    GOOGLE_GENAI_USE_VERTEXAI=FALSE
#    GOOGLE_API_KEY=PASTE_YOUR_ACTUAL_API_KEY_HERE
# 2. This will override the default Vertex AI configuration



@dataclass
class AppConfiguration:
    """Configuration for the TRAVAIA AI service.

    Attributes:
        project_id (str): Google Cloud project ID.
        allow_origins (list): CORS allowed origins.
        port (int): Server port (defaults to Cloud Run PORT env var).
        bucket_suffix (str): Suffix for GCS bucket names.
        location (str): Default GCP location.
    """

    project_id: str = None
    allow_origins: list = None
    port: int = int(os.getenv("PORT", "8000"))
    bucket_suffix: str = "travaia-ai-logs-data"
    location: str = "us-central1"

    def __post_init__(self):
        if self.project_id is None:
            try:
                _, self.project_id = google.auth.default()
            except google.auth.exceptions.DefaultCredentialsError:
                # Use a placeholder project ID if running locally without ADC
                self.project_id = "local-dev-project"

        os.environ.setdefault("GOOGLE_CLOUD_PROJECT", self.project_id)
        os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
        os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")

        if self.allow_origins is None:
            origins = os.getenv("ALLOW_ORIGINS", "")
            self.allow_origins = origins.split(",") if origins else ["*"]


@dataclass
class ResearchConfiguration:
    """Configuration for research-related models and parameters.

    Attributes:
        critic_model (str): Model for evaluation tasks.
        worker_model (str): Model for working/generation tasks.
        max_search_iterations (int): Maximum search iterations allowed.
    """

    critic_model: str = "gemini-2.5-pro"
    worker_model: str = "gemini-2.5-flash"
    max_search_iterations: int = 5


app_config = AppConfiguration()
research_config = ResearchConfiguration()
