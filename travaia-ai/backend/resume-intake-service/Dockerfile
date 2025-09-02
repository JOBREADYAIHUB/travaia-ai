# TRAVAIA Resume Intake Service Dockerfile - Cloud Run Optimized for 10M+ users
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for enterprise performance
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    libffi-dev \
    libssl-dev \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables for production
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Create __init__.py files to make directories Python packages
RUN touch /app/__init__.py \
    && touch /app/api/__init__.py \
    && touch /app/services/__init__.py

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Health check for enterprise monitoring
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Expose port
EXPOSE 8080

# Run the application with production settings
CMD ["python", "main.py"]
