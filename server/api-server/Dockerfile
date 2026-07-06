# ─── Builder stage ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install system build dependencies (compilers for native Python extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create and activate a virtual environment
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Install Python dependencies into the venv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ─── Final stage ────────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy the pre-built virtual environment from the builder (no gcc needed)
COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"

# Copy application code only
COPY __init__.py .
COPY main.py .
COPY auth.py .
COPY config.py .
COPY models.py .
COPY stdb_client.py .
COPY routers/ routers/.

EXPOSE 8711

# Run with uvicorn (reload disabled for production, enabled via RELOAD env var)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${API_PORT:-8711} ${RELOAD:+--reload}"]
