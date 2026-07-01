"""OAuth 2.0 authentication router — Slack, Discord, GitHub, GitLab, generic.

Handles the Authorization Code flow: redirect to provider, callback with code exchange,
and user info retrieval. Supports auto-registration for new users.
"""

from fastapi import APIRouter, HTTPException

from stdb_client import sql_query, call_reducer
from models import OAuthProviderResponse, OAuthLoginResponse, OAuthCallbackResponse, OAuthUserLinkResponse

router = APIRouter(prefix="/api/v1/auth/oauth", tags=["oauth"])


def _str(row: list, idx: int) -> str:
    return str(row[idx]) if idx < len(row) and row[idx] is not None else ""


def _int(row: list, idx: int) -> int:
    return int(row[idx]) if idx < len(row) and row[idx] is not None else 0


def _bool(row: list, idx: int) -> bool:
    return bool(row[idx]) if idx < len(row) else False


def _map_oauth_provider(row: list) -> dict | None:
    if not row:
        return None
    return {
        "id": _str(row, 0),
        "name": _str(row, 1),
        "slug": _str(row, 2),
        "provider_type": _str(row, 3),
        "authorize_url": _str(row, 4),
        "token_url": _str(row, 5),
        "userinfo_url": _str(row, 6),
        "scope": _str(row, 7),
        "client_id": _str(row, 8),
        # client_secret is intentionally omitted — never expose via API
        "icon": _str(row, 10),
        "is_active": _bool(row, 11),
        "auto_register": _bool(row, 12),
        "default_role": _str(row, 13),
        "created_by": _str(row, 14),
        "created_at": _int(row, 15),
        "updated_at": _int(row, 16),
    }


def _map_user(row: list) -> dict | None:
    if not row:
        return None
    return {
        "id": _str(row, 0),
        "name": _str(row, 1),
        "email": _str(row, 2),
        "role": _str(row, 4),
        "avatar_url": _str(row, 5),
        "created_at": _int(row, 6),
    }


def _map_oauth_user(row: list) -> dict | None:
    if not row:
        return None
    return {
        "id": _str(row, 0),
        "user_id": _str(row, 1),
        "provider_id": _str(row, 2),
        "external_id": _str(row, 3),
        "external_username": _str(row, 4),
        "external_email": _str(row, 5),
        "token_expires_at": _int(row, 8),
        "last_synced_at": _int(row, 9),
        "created_at": _int(row, 10),
        "updated_at": _int(row, 11),
    }


@router.get("/providers", response_model=list[OAuthProviderResponse])
async def list_providers():
    """List all active OAuth providers (without secrets)."""
    rows = await sql_query("SELECT * FROM oauth_provider WHERE is_active = true")
    return [_map_oauth_provider(r) for r in rows if _map_oauth_provider(r)]


@router.get("/providers/all", response_model=list[OAuthProviderResponse])
async def list_all_providers():
    """List all OAuth providers including inactive (admin only, without secrets)."""
    rows = await sql_query("SELECT * FROM oauth_provider")
    return [_map_oauth_provider(r) for r in rows if _map_oauth_provider(r)]


@router.get("/user-links/{user_id}", response_model=list[OAuthUserLinkResponse])
async def list_user_links(user_id: str):
    """List all OAuth provider links for a user."""
    rows = await sql_query(
        "SELECT * FROM oauth_user WHERE user_id = ?", user_id
    )
    return [_map_oauth_user(r) for r in rows if _map_oauth_user(r)]


@router.post("/login", response_model=OAuthLoginResponse)
async def oauth_login(body: dict):
    """Initiate OAuth login. Returns provider config for the frontend to build the redirect URL.

    The frontend should:
    1. Call this endpoint with the provider_id
    2. Generate PKCE code_verifier + code_challenge
    3. Build the authorize URL and redirect the user
    """
    provider_id = body.get("provider_id", "")
    if not provider_id:
        raise HTTPException(status_code=400, detail="provider_id is required")

    rows = await sql_query(
        "SELECT * FROM oauth_provider WHERE id = ? AND is_active = true", provider_id
    )
    if not rows:
        raise HTTPException(status_code=404, detail="OAuth provider not found or inactive")

    provider = _map_oauth_provider(rows[0])
    return {
        "provider": provider,
    }


@router.post("/callback", response_model=OAuthCallbackResponse)
async def oauth_callback(body: dict):
    """Handle OAuth callback.

    The frontend sends the authorization code, code_verifier, and provider_id.
    The backend exchanges the code for tokens and fetches user info.
    """
    provider_id = body.get("provider_id", "")
    code = body.get("code", "")
    code_verifier = body.get("code_verifier", "")
    redirect_uri = body.get("redirect_uri", "")

    if not provider_id or not code:
        raise HTTPException(status_code=400, detail="provider_id and code are required")

    # 1. Fetch provider config
    rows = await sql_query(
        "SELECT * FROM oauth_provider WHERE id = ? AND is_active = true", provider_id
    )
    if not rows:
        raise HTTPException(status_code=404, detail="OAuth provider not found or inactive")

    raw = rows[0]
    provider = _map_oauth_provider(raw)
    client_secret = _str(raw, 9)  # Access client_secret from raw row data

    # 2. Exchange authorization code for access token
    import httpx

    token_data = {
        "client_id": provider["client_id"],
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }
    if code_verifier:
        token_data["code_verifier"] = code_verifier

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            token_res = await client.post(provider["token_url"], data=token_data)
            if token_res.status_code != 200:
                raise HTTPException(
                    status_code=401,
                    detail=f"Token exchange failed: {token_res.text[:200]}",
                )
            token_json = token_res.json()
            access_token = token_json.get("access_token", "")
            refresh_token = token_json.get("refresh_token", "")
            expires_in = token_json.get("expires_in", 3600)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Token exchange request failed: {exc}")

    if not access_token:
        raise HTTPException(status_code=401, detail="No access_token in token response")

    # 3. Fetch user info from the provider
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            userinfo_res = await client.get(
                provider["userinfo_url"],
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_res.status_code != 200:
                raise HTTPException(
                    status_code=401,
                    detail=f"Userinfo fetch failed: {userinfo_res.text[:200]}",
                )
            userinfo = userinfo_res.json()
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Userinfo request failed: {exc}")

    # 4. Extract user info based on provider type
    provider_type = provider["provider_type"]

    if provider_type == "github":
        external_id = str(userinfo.get("id", ""))
        external_username = userinfo.get("login", "")
        email = userinfo.get("email", "")
        display_name = userinfo.get("name", "") or external_username
        # GitHub may not return email in /user; try /user/emails if needed
        if not email:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    emails_res = await client.get(
                        "https://api.github.com/user/emails",
                        headers={"Authorization": f"Bearer {access_token}"},
                    )
                    if emails_res.status_code == 200:
                        emails = emails_res.json()
                        primary = next(
                            (e for e in emails if e.get("primary") and e.get("verified")),
                            None,
                        )
                        if primary:
                            email = primary["email"]
            except Exception:
                pass
    elif provider_type == "discord":
        external_id = str(userinfo.get("id", ""))
        external_username = userinfo.get("username", "")
        email = userinfo.get("email", "")
        display_name = userinfo.get("global_name", "") or external_username
    elif provider_type == "slack":
        # Slack OpenID Connect userinfo response
        external_id = userinfo.get("sub", "")
        external_username = userinfo.get("preferred_username", "") or userinfo.get("name", "")
        email = userinfo.get("email", "")
        display_name = userinfo.get("name", "") or external_username
    elif provider_type == "gitlab":
        external_id = str(userinfo.get("id", ""))
        external_username = userinfo.get("username", "")
        email = userinfo.get("email", "")
        display_name = userinfo.get("name", "") or external_username
    else:
        # Generic: try common fields
        external_id = str(userinfo.get("sub", userinfo.get("id", userinfo.get("user_id", ""))))
        external_username = userinfo.get("preferred_username", userinfo.get("nickname", userinfo.get("login", "")))
        email = userinfo.get("email", "")
        display_name = userinfo.get("name", userinfo.get("display_name", "")) or external_username

    if not external_id:
        raise HTTPException(status_code=401, detail="Could not determine user identity from provider")

    # 5. Check if this OAuth user is already linked
    link_rows = await sql_query(
        "SELECT * FROM oauth_user WHERE external_id = ? AND provider_id = ?", external_id, provider_id
    )

    if link_rows:
        # User already linked — return their wiki user
        oauth_user = _map_oauth_user(link_rows[0])
        user_rows = await sql_query(
            "SELECT * FROM \"user\" WHERE id = ?", oauth_user["user_id"]
        )
        if user_rows:
            return {"user": _map_user(user_rows[0])}

    # 6. Try to find existing wiki user by email
    if email:
        user_rows = await sql_query(
            "SELECT * FROM \"user\" WHERE email = ?", email
        )
        if user_rows:
            existing_user = _map_user(user_rows[0])
            # Link the OAuth account to this user
            import uuid
            link_id = f"ou_{uuid.uuid4().hex[:12]}"
            import time
            expires_at = int(time.time() * 1000) + (expires_in * 1000)
            await call_reducer("link_oauth_user", [
                link_id, existing_user["id"], provider_id,
                external_id, external_username, email,
                access_token, refresh_token, expires_at,
            ])
            return {"user": existing_user}

    # 7. Auto-register if enabled
    if not provider["auto_register"]:
        raise HTTPException(
            status_code=401,
            detail="User not found and auto-register is disabled. Ask an admin to create your account first."
        )

    import uuid
    import hashlib
    import time

    user_id = str(uuid.uuid4())
    random_pw = hashlib.sha256(f"oauth_{user_id}_{provider_id}".encode()).hexdigest()

    await call_reducer("register_user", [
        user_id, display_name, email or f"{external_username}@oauth.local",
        random_pw, provider["default_role"],
    ])

    # Link the OAuth user record
    link_id = f"ou_{uuid.uuid4().hex[:12]}"
    expires_at = int(time.time() * 1000) + (expires_in * 1000)
    await call_reducer("link_oauth_user", [
        link_id, user_id, provider_id,
        external_id, external_username, email or "",
        access_token, refresh_token, expires_at,
    ])

    new_user = _map_user([user_id, display_name, email or "", "", provider["default_role"], "", 0])
    return {"user": new_user}
