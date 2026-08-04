"""Shared rate-limiter instance.

Defined here (not in main.py) so routers can import it without a circular
dependency. The slowapi `Limiter` must be registered on the app via
`app.state.limiter` + the RateLimitExceeded exception handler — see main.py.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Sensible default limits for unauthenticated / high-cost endpoints. These are
# per-IP (key_func = remote address). Endpoints decorated with
# @limiter.limit(...) override the default.
DEFAULT_LIMITS = {
    "register_key": "10/minute",      # key minting is privileged
    "search": "120/minute",           # reducer-spawning, expensive
    "login": "30/minute",             # auth brute-force mitigation
    "oauth": "30/minute",
    "webauthn": "30/minute",
    "scim": "300/minute",             # provisioning bulk sync
    "create": "60/minute",            # page/collection/comment creation
}
