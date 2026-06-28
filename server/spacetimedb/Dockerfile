FROM rust:1.96-alpine AS builder

WORKDIR /module

# Install build dependencies for spacetimedb-cli
RUN apk add --no-cache musl-dev pkgconfig openssl-dev

# Build the module (just the Rust code, not spacetime CLI itself)
COPY Cargo.toml Cargo.lock ./
COPY src/ src/

# Build with the spacetimedb crate — we need the `spacetime` CLI
# to publish, so install it in a separate stage
RUN cargo build --release --target-dir /tmp/module-build 2>&1 || \
    echo "Module build will be done with spacetime CLI in final stage"

# ─── CLI + Publish stage ────────────────────────────────────────────────────
FROM rust:1.96-alpine

RUN apk add --no-cache musl-dev pkgconfig openssl-dev curl bash

# Install spacetimedb-cli
RUN cargo install spacetimedb-cli --version 2.6.0 --locked

WORKDIR /module
COPY --from=builder /module /module

# The entrypoint waits for STDB to be ready, builds, and publishes
COPY <<'SCRIPT' /entrypoint.sh
#!/bin/bash
set -e

STDB_HOST="${STDB_HOST:-spacetimedb:3001}"
DB_NAME="${DB_NAME:-spacetime_wiki}"

echo "Waiting for STDB at ${STDB_HOST}..."
until curl -s "http://${STDB_HOST}/health" > /dev/null 2>&1; do
  echo "  STDB not ready yet, retrying in 2s..."
  sleep 2
done
echo "STDB is ready!"

# Check if module already published
EXISTS=$(curl -s "http://${STDB_HOST}/v1/database" | grep -c "${DB_NAME}" || true)
if [ "$EXISTS" -gt 0 ]; then
  echo "Module '${DB_NAME}' already published, skipping."
  exit 0
fi

# Build the module
echo "Building module..."
spacetime build --target-dir /tmp/spacetime-build .

# Publish
echo "Publishing to ${STDB_HOST} as '${DB_NAME}'..."
spacetime publish --server "http://${STDB_HOST}" "${DB_NAME}"

echo "Module published successfully!"
SCRIPT
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
