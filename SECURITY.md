# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| dev     | :white_check_mark: |

## Reporting a Vulnerability

SpacetimeWiki is an open-source project. If you discover a security vulnerability,
please report it privately by opening a security advisory at:

https://github.com/omiinaya/spacetime-wiki/security/advisories/new

Please **do not** report security vulnerabilities through public GitHub issues
or Discord messages.

We will acknowledge receipt within 48 hours and provide an expected timeline
for a fix.

## Security Considerations

When deploying SpacetimeWiki:

- **STDB port isolation**: The SpacetimeDB HTTP port (3001) should NOT be
  exposed to the public internet. It's intended for internal API-server
  communication only. The Docker Compose setup follows this convention.
- **HTTPS**: Use a reverse proxy (nginx, Caddy, Traefik) for TLS termination
  in production.
- **Rate limiting**: The API server has built-in rate limiting (configured via
  `RATE_LIMIT` env var). Enable it in production.
- **CORS**: Configure `CORS_ORIGINS` in production. Wildcard origins with
  `allow_credentials=true` are blocked by the server.
- **API keys**: Revoke unused API keys. Keys are hashed with Argon2 when
  stored in the database.
