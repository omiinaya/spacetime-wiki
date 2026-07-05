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

# ─── Serve stage ─────────────────────────────────────────────────────────────
FROM nginx:1.31-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config with API proxy and security headers
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/spacetime-wiki.conf

EXPOSE 5184
CMD ["nginx", "-g", "daemon off;"]
