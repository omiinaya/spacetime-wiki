# ─── Builder stage ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install system build dependencies (needed for some Python native extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip, setuptools, and wheel first for reliable dependency resolution
# --no-compile avoids generating .pyc in the builder (they'd be stale anyway)
COPY requirements.txt .
RUN pip install --no-cache-dir --no-compile --upgrade pip setuptools wheel \
    && pip install --no-cache-dir --no-compile -r requirements.txt \
    && find /usr/local -name '*.pyc' -delete \
    && rm -rf /root/.cache/pip

# ─── Final stage ────────────────────────────────────────────────────────────
FROM python:3.11-slim

# Create a non-root user for runtime security and install runtime utilities
RUN addgroup --system --gid 1001 app \
    && adduser --system --uid 1001 --ingroup app --no-create-home app \
    && apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed packages from builder (system site-packages, not a venv)
# This avoids venv symlink breakage across stages and is the standard pattern
COPY --from=builder /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code only
COPY __init__.py main.py auth.py config.py models.py permissions.py rate_limit.py stdb_client.py ./
COPY routers/ routers/

# Security: drop root privileges
USER app

EXPOSE 8711

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${API_PORT:-8711}/health || exit 1

# Run with uvicorn (reload disabled for production, enabled via RELOAD env var)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${API_PORT:-8711} ${RELOAD:+--reload}"]
