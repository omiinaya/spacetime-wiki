# Security Policy

## Reporting a Vulnerability

We take the security of SpacetimeWiki seriously. If you believe you have found
a security vulnerability, please **do not open a public issue**.

Instead, send a report to **security@spacetimewiki.dev** (or contact the
maintainers directly via the project's communication channels).

We will acknowledge receipt within 48 hours and work to understand, validate,
and fix the issue. We ask that you give us 90 days to release a fix before
publicly disclosing the vulnerability.

## Scope

The following are considered in-scope for security reports:

- Authentication bypass or privilege escalation
- Data leakage or unauthorized data access
- Cross-site scripting (XSS) in the web client
- Remote code execution
- Insecure direct object references
- Server-side request forgery

## Out of Scope

The following are **not** considered security vulnerabilities:

- Missing security headers on non-production deployments
- Outdated dependency versions already tracked by Dependabot
- Self-XSS (requires user to paste malicious content)
- Rate limiting bypass without demonstrated abuse
- Features working as designed that could be misused

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | ✅ Active          |
| < 1.0   | ❌ Pre-release     |

## Security Best Practices

### Production Deployment

1. **STDB Port**: Ensure `3001` (SpacetimeDB) is **not** exposed to the public
   internet. Only the REST API port (`8711`) and the web frontend ports (`5184`)
   should be publicly accessible.

2. **API Keys**: Store API keys in environment variables, never in code.
   Rotate keys regularly.

3. **HTTPS**: Always use HTTPS in production. The included nginx config can be
   extended with TLS certificates.

4. **CORS**: Configure `CORS_ORIGINS` to the specific origins your deployment
   serves — never use `*` with credentials enabled.
