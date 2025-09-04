# TRAVAIA AI Service

AI-powered multi-agent platform for travel assistance, integrating Google ADK with FastAPI.

## Architecture

The service is structured as a modular FastAPI application with the following components:

### Directory Structure

```
ai-service/
├── __init__.py                 # Package initialization
├── config.py                   # Centralized configuration
├── server.py                   # Main entry point (uvicorn server:travaiai)
├── app/                        # Main travel agent application
│   ├── __init__.py
│   ├── server.py               # Travel agent FastAPI integration
│   ├── agent.py                # Travel agent definition
│   ├── config.py               # Travel agent configuration
│   └── utils/                  # Shared utilities
│       ├── gcs.py              # Google Cloud Storage utilities
│       ├── tracing.py          # OpenTelemetry tracing
│       └── typing.py           # Type definitions
└── chatbot/                    # Chatbot agent module
    ├── __init__.py
    ├── agent.py                # Chatbot agent definition
    ├── prompt.py               # Agent instructions and prompts
    ├── tools/                  # Chatbot-specific tools
    │   ├── __init__.py
    │   └── tools.py            # Tool definitions
    └── utils/                  # Chatbot utilities
        ├── __init__.py
        ├── gcs.py              # GCS utilities
        ├── tracing.py          # Tracing utilities
        └── typing.py           # Type definitions
```

## Key Features

- **Single Entry Point**: `server.py` contains the main `travaiai` FastAPI app
- **Modular Architecture**: Separate modules for different agent types
- **Google ADK Integration**: Uses Google's Agent Development Kit for AI capabilities
- **Multi-Agent Support**: Travel agents and chatbot agents with distinct capabilities
- **Cloud-Native**: Designed for Google Cloud Run deployment

## API Endpoints

### Main Service
- `GET /health` - Health check endpoint
- `POST /feedback` - Collect user feedback

### Travel Agents (mounted at `/app`)
- All Google ADK endpoints for travel assistance
- Session management and conversation handling

### Chatbot (mounted at `/chatbot`)
- All Google ADK endpoints for software bug assistance
- `POST /chatbot/feedback` - Chatbot-specific feedback collection

## Configuration

Configuration is centralized in `config.py`:

- **AppConfiguration**: Main service settings (project ID, CORS, port)
- **ResearchConfiguration**: AI model settings and parameters

Environment variables:
- `PORT`: Server port (defaults to 8000, Cloud Run sets this automatically)
- `ALLOW_ORIGINS`: CORS allowed origins (comma-separated)
- `GOOGLE_CLOUD_PROJECT`: GCP project ID (auto-detected)
- `AGENT_ENGINE_SESSION_NAME`: Agent engine name for chatbot

## Development

### Local Development

```bash
# Install dependencies
uv sync

# Run locally
uvicorn server:travaiai --host 0.0.0.0 --port 8000 --reload

# Or use the Makefile
make local-backend
```

### Testing

```bash
# Run tests
make test
```

### Deployment

```bash
# Deploy to Cloud Run
make backend
```

## Google ADK Integration

The service integrates with Google's Agent Development Kit (ADK) following best practices:

1. **Separate ADK Apps**: Each agent type has its own ADK FastAPI app
2. **Mounting Strategy**: ADK apps are mounted as sub-applications
3. **Resource Isolation**: Each agent has its own GCS bucket and session service
4. **Tool Integration**: Agents can use various tools (Google Search, LangChain, MCP)

## Cloud Run Deployment

The service is optimized for Google Cloud Run:

- Uses `PORT` environment variable for dynamic port assignment
- Implements proper health checks
- Includes OpenTelemetry tracing for observability
- Structured logging with Google Cloud Logging integration

## Security

- Firebase Authentication integration through API Gateway
- CORS configuration for frontend integration
- Secure credential management using Google Cloud services
