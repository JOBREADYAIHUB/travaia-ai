install:
	@command -v uv >/dev/null 2>&1 || { echo "uv is not installed. Installing uv..."; curl -LsSf https://astral.sh/uv/0.6.12/install.sh | sh; source $HOME/.local/bin/env; }
	uv sync && npm --prefix demoUI install

dev:
	make dev-backend & make dev-frontend

dev-backend:
	uv run adk api_server backend/ai-service --allow_origins="*"

dev-frontend:
	npm --prefix demoUI run dev

playground:
	uv run adk web --port 8501

lint:
	uv sync --dev --extra lint
	uv run codespell
	uv run ruff check . --diff
	uv run ruff format . --check --diff
	uv run mypy .

# --- Commands from Agent Starter Pack ---

.PHONY: backend

backend:
	PROJECT_ID=$(gcloud config get-value project) && \
	gcloud beta run deploy travaia-ai \
		--source backend/ai-service \
		--memory "4Gi" \
		--project $PROJECT_ID \
		--region "us-central1" \
		--allow-unauthenticated \
		--service-account "firebase-app-hosting-compute@travaia-e1310.iam.gserviceaccount.com" \
		--no-cpu-throttling \
		--labels "created-by=adk" \
		--set-env-vars \
		"COMMIT_SHA=$(shell git rev-parse HEAD)" \
		$(if $(IAP),--iap) \
		$(if $(PORT),--port=$(PORT))

local-backend:
	uv run uvicorn app.server:app --host 0.0.0.0 --port 8000 --reload

setup-dev-env:
	PROJECT_ID=$$(gcloud config get-value project) && \
	(cd backend/ai-service/deployment/terraform/dev && terraform init && terraform apply --var-file vars/env.tfvars --var dev_project_id=$$PROJECT_ID --auto-approve)

test:
	uv run pytest tests/unit && uv run pytest tests/integration
