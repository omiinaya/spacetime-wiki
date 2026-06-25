# SpacetimeWiki REST API Server

A lightweight REST API gateway for programmatic access to SpacetimeWiki.
Sits on top of SpacetimeDB's HTTP interface with API key authentication.

## Architecture

```
External Client ──► API Server (port 3002) ──► STDB HTTP API (port 3001)
                         │
                    Bearer Auth
                   (api_key table)
```

The API server:
- Authenticates requests via `Authorization: Bearer <api_key>` header
- Validates keys against the `api_key` STDB table
- Translates RESTful requests into STDB SQL queries and reducer calls
- Returns consistent JSON responses (`{ data: ... }` or `{ error: "..." }`)

## Setup

```bash
# Install dependencies
cd server/api-server
npm install

# Configure (via environment variables)
export API_PORT=3002                          # default: 3002
export STDB_HOST=127.0.0.1:3001            # default: 127.0.0.1:3001
export STDB_DB_ID=your_database_id            # default: project DB ID

# Start
npm start
```

## API Endpoints

### Authentication
All endpoints (except `/api/v1/health`) require:
```
Authorization: Bearer <your_api_key>
```

### Pages
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/pages | List pages (filters: `collection_id`, `status`, `parent_page_id`) |
| GET | /api/v1/pages/:id | Get a single page |
| POST | /api/v1/pages | Create a page |
| PUT | /api/v1/pages/:id | Update a page |
| DELETE | /api/v1/pages/:id | Delete a page (`?permanent=true` for hard delete) |
| POST | /api/v1/pages/:id/restore | Restore a trashed page |
| POST | /api/v1/pages/:id/duplicate | Duplicate a page |
| POST | /api/v1/pages/:id/move | Move a page to another collection |
| POST | /api/v1/pages/:id/status | Set page status (draft/published/archived/deleted) |

### Collections
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/collections | List all collections |
| GET | /api/v1/collections/:id | Get a collection |
| POST | /api/v1/collections | Create a collection |
| PUT | /api/v1/collections/:id | Update a collection |
| DELETE | /api/v1/collections/:id | Delete a collection |

### Search
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/search?q=... | Full-text search (filters: `collection_id`, `author_id`, `from`, `to`) |

### Tags
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/tags?page_id=... | List tags |
| POST | /api/v1/tags | Add a tag to a page |
| DELETE | /api/v1/tags/:id | Remove a tag |

### Attachments
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/attachments?page_id=... | List attachments |
| POST | /api/v1/attachments | Upload an attachment (base64) |
| GET | /api/v1/attachments/:id | Get an attachment |
| DELETE | /api/v1/attachments/:id | Delete an attachment |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/users/me | Current user info (from API key) |
| GET | /api/v1/users | List all users (no password hashes) |
| GET | /api/v1/users/:id | Get a user |
| POST | /api/v1/users | Register a new user |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/health | Health check (no auth required) |

## Example Usage

```bash
# List pages
curl -H "Authorization: Bearer swk_abc123..." http://localhost:3002/api/v1/pages

# Create a page
curl -X POST \
  -H "Authorization: Bearer swk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"title":"My Page","content":"Hello world","collection_id":"col_abc"}' \
  http://localhost:3002/api/v1/pages

# Search
curl -H "Authorization: Bearer swk_abc123..." \
  "http://localhost:3002/api/v1/search?q=hello&collection_id=col_abc"

# Health check
curl http://localhost:3002/api/v1/health
```

## Generating API Keys

API keys can be created through the SpacetimeWiki web UI (Admin → API Keys) or by calling the `create_api_key` reducer directly:

```bash
# Key prefix: first 8 chars of the raw key (for lookup)
# Key hash: SHA-256 of the raw key
RAW_KEY="swk_$(openssl rand -hex 16)"
KEY_PREFIX="${RAW_KEY:0:8}"
KEY_HASH=$(echo -n "$RAW_KEY" | sha256sum | cut -d' ' -f1)

# Call the reducer (using STDB HTTP API directly)
curl -X POST \
  http://127.0.0.1:3001/v1/database/{DB_ID}/call/create_api_key \
  -H "Content-Type: application/json" \
  -d '["apk_xxx", "user_id_here", "My API Key", "'"$KEY_HASH"'", "'"$KEY_PREFIX"'", 365]'

echo "API Key: $RAW_KEY"
```
