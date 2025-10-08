# Azure FastAPI Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM python:3.11-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Production stage
FROM python:3.11-slim as production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Create non-root user
RUN groupadd -r sageinsure && useradd -r -g sageinsure sageinsure

# Create app directory
WORKDIR /app

# Copy application code
COPY --chown=sageinsure:sageinsure . .

# Create logs directory
RUN mkdir -p /app/logs && chown -R sageinsure:sageinsure /app/logs

# Switch to non-root user
USER sageinsure

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/healthz || exit 1

# Default command
CMD ["python", "start_azure_api.py"]

# Labels for metadata
LABEL maintainer="SageInsure Team" \
      version="1.0.0" \
      description="SageInsure Azure FastAPI RAG Service" \
      org.opencontainers.image.source="https://github.com/sageinsure/azure-fastapi" \
      org.opencontainers.image.title="SageInsure Azure FastAPI" \
      org.opencontainers.image.description="RAG-powered insurance specialist API service" \
      org.opencontainers.image.version="1.0.0"