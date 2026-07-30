# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:26-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY src/ src/
COPY public/ public/

ARG VITE_STDB_HOST
ARG VITE_STDB_DB
ARG VITE_STDB_TOKEN
ARG VITE_API_BASE

RUN npm run build

# ─── Serve stage with nginx ────────────────────────────────────────────────
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5184

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:5184/health || exit 1
