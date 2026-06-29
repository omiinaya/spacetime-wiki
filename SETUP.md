# Setup — for agents

## Prerequisites

- Node.js 20+
- SpacetimeDB running
- Python 3.10+ (backend)

## Step-by-Step

```bash
# 1. Clone the repo
git clone https://github.com/omiinaya/spacetime-wiki.git
cd spacetime-wiki

# 2. Frontend
cd web
npm install
npm run dev
# Frontend: http://localhost:5184, proxies /api to :8711

# 3. Full stack (with Docker)
cd ..
docker compose up -d
# Backend API: http://localhost:8711
# STDB WebSocket: http://localhost:3000
# STDB HTTP: http://localhost:3001
```

## Environment Variables

| Var | Default | Purpose |
|-----|---------|---------|
| STDB_HOST | localhost | SpacetimeDB host |
| STDB_PORT | 3001 | SpacetimeDB port |
| SERVER_PORT | 8711 | Backend API port |

For more details, see [AGENTS.md](./AGENTS.md).
