# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy ultra minimal requirements first for better caching
COPY api-gateway/requirements_ultra_minimal.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code from the api-gateway subdirectory
COPY api-gateway/ /app/

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port
EXPOSE 8080

# Test gunicorn to identify if it causes SIGABRT crashes
CMD ["gunicorn", "-w", "1", "-k", "uvicorn.workers.UvicornWorker", "main_ultra_minimal:app", "--bind", "0.0.0.0:8080"]
