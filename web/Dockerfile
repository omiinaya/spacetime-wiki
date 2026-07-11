# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

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

# ─── Serve stage with Node runtime ──────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist

RUN npm install -g serve

EXPOSE 5184

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:5184',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["serve", "dist", "-l", "5184"]
