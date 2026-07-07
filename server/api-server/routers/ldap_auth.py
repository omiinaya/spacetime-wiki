"""LDAP authentication router — bind, search, and verify users against LDAP."""

from fastapi import APIRouter, HTTPException

from stdb_client import sql_query, call_reducer
from models import LDAPLoginResponse

router = APIRouter(prefix="/api/v1/auth/ldap", tags=["ldap"])


def _str(row: list, idx: int) -> str:
    return str(row[idx]) if idx < len(row) and row[idx] is not None else ""


def _int(row: list, idx: int) -> int:
    return int(row[idx]) if idx < len(row) and row[idx] is not None else 0


def _bool(row: list, idx: int) -> bool:
    return bool(row[idx]) if idx < len(row) else False


def _map_ldap_provider(row: list) -> dict | None:
    if not row:
        return None
    return {
        "id": _str(row, 0),
        "name": _str(row, 1),
        "slug": _str(row, 2),
        "host": _str(row, 3),
        "port": _int(row, 4),
        "is_secure": _bool(row, 5),
        "bind_dn": _str(row, 6),
        "bind_password": _str(row, 7),
        "base_dn": _str(row, 8),
        "user_filter": _str(row, 9),
        "username_attribute": _str(row, 10),
        "email_attribute": _str(row, 11),
        "name_attribute": _str(row, 12),
        "default_role": _str(row, 13),
        "auto_register": _bool(row, 14),
        "is_active": _bool(row, 15),
        "created_by": _str(row, 16),
        "created_at": _int(row, 17),
        "updated_at": _int(row, 18),
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


@router.post("/login", response_model=LDAPLoginResponse)
async def ldap_login(body: dict):
    """Authenticate a user against an LDAP directory."""
    provider_id = body.get("provider_id", "")
    username = body.get("username", "")
    password = body.get("password", "")

    if not provider_id or not username or not password:
        raise HTTPException(status_code=400, detail="provider_id, username, and password are required")

    # 1. Fetch LDAP provider config from STDB
    rows = await sql_query(
        "SELECT * FROM ldap_provider WHERE id = ? AND is_active = true", provider_id
    )
    if not rows:
        raise HTTPException(status_code=404, detail="LDAP provider not found or inactive")

    provider = _map_ldap_provider(rows[0])
    if not provider:
        raise HTTPException(status_code=404, detail="LDAP provider not found")

    # 2. Attempt LDAP authentication
    try:
        import ldap3
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="LDAP support not installed. Run: pip install ldap3"
        )

    server_kwargs = {
        "host": provider["host"],
        "port": provider["port"],
        "use_ssl": provider["is_secure"],
        "get_info": ldap3.NONE,
    }

    server = ldap3.Server(**server_kwargs)
    conn = None

    try:
        # 3. Bind with service account (or anonymously)
        bind_dn = provider["bind_dn"]
        bind_password = provider["bind_password"]

        if bind_dn:
            conn = ldap3.Connection(server, user=bind_dn, password=bind_password, auto_bind=True)
        else:
            conn = ldap3.Connection(server, auto_bind=True)

        # 4. Build the search filter by replacing {{username}}
        user_filter = provider["user_filter"].replace("{{username}}", username)
        base_dn = provider["base_dn"]

        # 5. Search for the user
        conn.search(
            search_base=base_dn,
            search_filter=user_filter,
            search_scope=ldap3.SUBTREE,
            attributes=[provider["username_attribute"], provider["email_attribute"], provider["name_attribute"]],
            size_limit=2,
        )

        if len(conn.entries) == 0:
            raise HTTPException(status_code=401, detail="User not found in LDAP directory")

        if len(conn.entries) > 1:
            raise HTTPException(status_code=401, detail="Multiple users found — refine your filter")

        entry = conn.entries[0]
        user_dn = entry.entry_dn

        # Extract attributes (handle missing values gracefully)
        email_attr = provider["email_attribute"]
        name_attr = provider["name_attribute"]

        email = ""
        if email_attr and hasattr(entry, email_attr):
            val = getattr(entry, email_attr)
            email = str(val) if val else ""

        display_name = ""
        if name_attr and hasattr(entry, name_attr):
            val = getattr(entry, name_attr)
            display_name = str(val) if val else ""

        if not email:
            # Fallback: use username as email
            email = f"{username}@ldap.local"

        if not display_name:
            display_name = username

        # 6. Verify the user's password by binding as the user
        # Close the service connection and open a new one as the user
        conn.unbind()

        try:
            user_conn = ldap3.Connection(server, user=user_dn, password=password, auto_bind=True)
            user_conn.unbind()
        except ldap3.core.exceptions.LDAPBindError:
            raise HTTPException(status_code=401, detail="Invalid LDAP credentials")

        # 7. Find or create the wiki user
        user_rows = await sql_query(
            "SELECT * FROM \"user\" WHERE email = ?", email
        )

        if user_rows:
            user = _map_user(user_rows[0])
            return {"user": user}
        else:
            # Auto-register if enabled
            if not provider["auto_register"]:
                raise HTTPException(
                    status_code=401,
                    detail="LDAP user not found and auto-register is disabled. Ask an admin to create your account first."
                )

            # Create new user
            import uuid
            import hashlib

            user_id = str(uuid.uuid4())
            # Generate a random password hash since LDAP users don't use local passwords
            random_pw = hashlib.sha256(f"ldap_{user_id}_{provider['id']}".encode()).hexdigest()

            await call_reducer("register_user", [
                user_id, display_name, email, random_pw, provider["default_role"],
            ])

            # Link the LDAP user record
            ext_id = user_dn  # Use DN as external ID
            ldap_user_id = f"lu_{uuid.uuid4().hex[:12]}"
            await call_reducer("link_ldap_user", [
                ldap_user_id, user_id, provider["id"], user_dn, ext_id,
            ])

            new_user = _map_user([user_id, display_name, email, "", provider["default_role"], "", 0])
            return {"user": new_user}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"LDAP authentication error: {exc}")
    finally:
        if conn and conn.bound:
            try:
                conn.unbind()
            except ldap3.core.exceptions.LDAPException:
                pass
