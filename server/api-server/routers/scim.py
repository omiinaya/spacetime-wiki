"""SCIM 2.0 identity provisioning API — for IdPs like Okta, Azure AD, OneLogin."""
import hashlib
import logging
import uuid

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from stdb_client import call_reducer, sql_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scim/v2", tags=["scim"])


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def _get_provider(request: Request) -> str | None:
    """Validate Authorization header against active SCIM providers.

    The token hash lives in the PRIVATE scim_provider_credential table, so
    the comparison is done inside the verify_scim_token reducer — never via
    SQL. We list active providers (public metadata), then verify the token
    against each via the reducer.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    rows = await sql_query("SELECT * FROM scim_provider WHERE is_active = true")
    for row in (rows or []):
        if isinstance(row, dict):
            pid = str(row.get("id", ""))
        else:
            pid = str(row[0]) if len(row) > 0 else ""
        if not pid:
            continue
        try:
            await call_reducer("verify_scim_token", [pid, token])
            return pid
        except RuntimeError:
            continue  # wrong token for this provider — try next
    return None


async def _record_event(provider_id: str, resource_type: str, operation: str,
                         external_id: str, local_id: str, status: str, detail: str):
    event_id = str(uuid.uuid4())
    try:
        await call_reducer("record_scim_event", [
            event_id, provider_id, resource_type, operation,
            external_id, local_id, status, detail,
        ])
    except RuntimeError:
        logger.exception("Failed to record SCIM event")


def _wiki_user_to_scim(rows: list) -> dict | None:
    if not rows:
        return None
    r = rows[0]
    if isinstance(r, dict):
        uid = str(r.get("id", ""))
        name = str(r.get("name", ""))
        email = str(r.get("email", ""))
        role = str(r.get("role", ""))
    else:
        uid = str(r[0] if len(r) > 0 else "")
        name = str(r[1] if len(r) > 1 else "")
        email = str(r[2] if len(r) > 2 else "")
        role = str(r[4] if len(r) > 4 else "")
    parts = name.split(" ", 1)
    return {
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
        "id": uid,
        "userName": email,
        "name": {
            "formatted": name,
            "givenName": parts[0] if parts else name,
            "familyName": parts[1] if len(parts) > 1 else "",
        },
        "displayName": name,
        "emails": [{"value": email, "type": "work", "primary": True}],
        "active": role != "viewer",
        "meta": {
            "resourceType": "User",
            "location": f"/scim/v2/Users/{uid}",
        },
    }


def _wiki_group_to_scim(rows: list) -> dict | None:
    if not rows:
        return None
    r = rows[0]
    if isinstance(r, dict):
        gid = str(r.get("id", ""))
        name = str(r.get("name", ""))
    else:
        gid = str(r[0] if len(r) > 0 else "")
        name = str(r[1] if len(r) > 1 else "")
    return {
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
        "id": gid,
        "displayName": name,
        "members": [],
        "meta": {
            "resourceType": "Group",
            "location": f"/scim/v2/Groups/{gid}",
        },
    }


# ─── ServiceProviderConfig ─────────────────────────────────────────────────

SCIM_CONFIG = {
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
    "patch": {"supported": True},
    "bulk": {"supported": False, "maxOperations": 0, "maxPayloadSize": 0},
    "filter": {"supported": True, "maxResults": 200},
    "changePassword": {"supported": False},
    "sort": {"supported": False},
    "etag": {"supported": False},
    "authenticationSchemes": [{
        "name": "OAuth Bearer Token",
        "description": "Authentication scheme using Bearer token",
        "specUri": "https://tools.ietf.org/html/rfc6750",
        "type": "bearer",
    }],
}


@router.get("/ServiceProviderConfig")
async def get_service_provider_config(request: Request):
    pid = await _get_provider(request)
    if not pid:
        raise HTTPException(status_code=401, detail="Invalid or missing SCIM token")
    return SCIM_CONFIG


# ─── /Schemas ──────────────────────────────────────────────────────────────

USER_SCHEMA = {
    "id": "urn:ietf:params:scim:schemas:core:2.0:User",
    "name": "User",
    "attributes": [
        {"name": "userName", "type": "string", "required": True, "mutability": "readWrite"},
        {"name": "name", "type": "complex", "required": False, "mutability": "readWrite",
         "subAttributes": [
             {"name": "givenName", "type": "string"},
             {"name": "familyName", "type": "string"},
             {"name": "formatted", "type": "string"},
         ]},
        {"name": "displayName", "type": "string", "required": False, "mutability": "readWrite"},
        {"name": "emails", "type": "complex", "multiValued": True, "required": True,
         "mutability": "readWrite",
         "subAttributes": [
             {"name": "value", "type": "string", "required": True},
             {"name": "type", "type": "string"},
             {"name": "primary", "type": "boolean"},
         ]},
        {"name": "active", "type": "boolean", "mutability": "readWrite"},
        {"name": "externalId", "type": "string", "mutability": "readWrite"},
    ],
}

GROUP_SCHEMA = {
    "id": "urn:ietf:params:scim:schemas:core:2.0:Group",
    "name": "Group",
    "attributes": [
        {"name": "displayName", "type": "string", "required": True, "mutability": "readWrite"},
        {"name": "members", "type": "complex", "multiValued": True,
         "subAttributes": [
             {"name": "value", "type": "string"},
             {"name": "type", "type": "string"},
         ]},
        {"name": "externalId", "type": "string", "mutability": "readWrite"},
    ],
}


@router.get("/Schemas")
async def list_schemas(
    request: Request,
    startIndex: int = Query(1, ge=1, description="SCIM 1-based start index"),
    count: int = Query(100, ge=0, le=1000, description="Max items per page"),
):
    pid = await _get_provider(request)
    if not pid:
        raise HTTPException(status_code=401, detail="Invalid or missing SCIM token")

    all_schemas = [USER_SCHEMA, GROUP_SCHEMA]
    total = len(all_schemas)
    start = max(0, startIndex - 1)
    page = all_schemas[start:start + count]

    return {
        "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        "totalResults": total,
        "startIndex": startIndex,
        "itemsPerPage": count,
        "Resources": page,
    }


@router.get("/Schemas/{schema_id}")
async def get_schema(request: Request, schema_id: str):
    pid = await _get_provider(request)
    if not pid:
        raise HTTPException(status_code=401, detail="Invalid or missing SCIM token")
    if schema_id == "urn:ietf:params:scim:schemas:core:2.0:User":
        return USER_SCHEMA
    elif schema_id == "urn:ietf:params:scim:schemas:core:2.0:Group":
        return GROUP_SCHEMA
    raise HTTPException(status_code=404, detail=f"Schema '{schema_id}' not found")


# ─── /Users ───────────────────────────────────────────────────────────────────


@router.get("/Users")
async def list_users(
    request: Request,
    filter: str | None = None,
    startIndex: int = 1,
    count: int = 100,
):
    pid = await _get_provider(request)
    if not pid:
        raise HTTPException(status_code=401, detail="Invalid or missing SCIM token")

    sql = "SELECT * FROM user"
    bind_args = []
    if filter and "userName eq" in filter:
        email = filter.split("eq")[-1].strip().strip('"').strip("'")
        sql += " WHERE email = ?"
        bind_args.append(email)

    # Get total count
    count_sql = "SELECT COUNT(*) AS n FROM user"
    if filter and "userName eq" in filter:
        count_sql += " WHERE email = ?"
    count_rows = await sql_query(count_sql, *bind_args)
    total = count_rows[0][0] if count_rows else 0

    # Fetch paginated results
    start = max(0, startIndex - 1)
    rows = await sql_query(sql + " LIMIT ?i OFFSET ?i", *bind_args, count, start)
    all_users = rows if isinstance(rows, list) else []
    scim_users = [_wiki_user_to_scim([u]) for u in all_users]
    scim_users = [u for u in scim_users if u is not None]

    return {
        "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        "totalResults": total,
        "startIndex": startIndex,
        "itemsPerPage": count,
        "Resources": scim_users,
    }


@router.get("/Users/{user_id}")
async def get_user(request: Request, user_id: str):
    pid = await _get_provider(request)
    if not pid:
        raise HTTPException(status_code=401, detail="Invalid or missing SCIM token")
    rows = await sql_query("SELECT * FROM user WHERE id = ?", user_id)
    scim_user = _wiki_user_to_scim(rows)
    if not scim_user:
        raise HTTPException(status_code=404, detail="User not found")
    return scim_user


@router.post("/Users")
async def create_user(request: Request):
    pid = await _get_provider(request)
    if not pid:
        raise HTTPException(status_code=401, detail="Invalid or missing SCIM token")

    body = await request.json()
    pr_rows = await sql_query("SELECT * FROM scim_provider WHERE id = ?", pid)
    if not pr_rows:
        raise HTTPException(status_code=500, detail="Provider config not found")

    pr = pr_rows[0]
    if isinstance(pr, dict):
        default_role = str(pr.get("default_role", "member"))
        auto_register = bool(pr.get("auto_register", True))
    else:
        default_role = str(pr[4] if len(pr) > 4 else "member")
        auto_register = bool(pr[5] if len(pr) > 5 else True)

    if not auto_register:
        raise HTTPException(status_code=400, detail="Auto-provisioning is disabled")

    emails = body.get("emails", [])
    email = emails[0].get("value", "") if emails else body.get("userName", "")
    name_obj = body.get("name", {})
    display_name = body.get("displayName", name_obj.get("formatted", email))
    external_id = body.get("externalId", "")

    if not email:
        raise HTTPException(status_code=400, detail="User must have an email")

    existing = await sql_query("SELECT id FROM user WHERE email = ?", email)
    if existing:
        uid = str(existing[0][0]) if isinstance(existing[0], list) else str(existing[0].get("id", ""))
        scim_user = _wiki_user_to_scim(await sql_query("SELECT * FROM user WHERE id = ?", uid))
        if scim_user:
            scim_user["meta"]["location"] = f"/scim/v2/Users/{uid}"
            return JSONResponse(status_code=200, content=scim_user)

    try:
        await call_reducer("scim_sync_user", [
            email, display_name, external_id, pid, default_role, True,
        ])
    except RuntimeError as e:
        await _record_event(pid, "User", "POST", external_id, "", "error", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to create user: {e}")

    rows = await sql_query("SELECT * FROM user WHERE email = ?", email)
    scim_user = _wiki_user_to_scim(rows)
    if scim_user:
        uid = scim_user["id"]
        scim_user["meta"]["location"] = f"/scim/v2/Users/{uid}"
        await _record_event(pid, "User", "POST", external_id, uid, "success",
                            f"Created user '{email}'")
        return JSONResponse(status_code=201, content=scim_user)
    raise HTTPException(status_code=500, detail="User created but not found")


@router.put("/Users/{user_id}")
async def update_user(request: Request, user_id: str):
    pid = await _get_provider(request)
    if not pid:
        raise HTTPException(status_code=401, detail="Invalid or missing SCIM token")

    body = await request.json()
    emails = body.get("emails", [])
    email = emails[0].get("value", "") if emails else body.get("userName", "")
    name_obj = body.get("name", {})
    display_name = body.get("displayName", name_obj.get("formatted", email))
    active = body.get("active", True)
    external_id = body.get("externalId", "")

    if not email:
        raise HTTPException(status_code=400, detail="User must have an email")

    try:
        await call_reducer("scim_sync_user", [
            email, display_name, external_id, pid, "member", True,
        ])
    except RuntimeError as e:
        await _record_event(pid, "User", "PUT", external_id, user_id, "error", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to update user: {e}")

    rows = await sql_query("SELECT * FROM user WHERE email = ?", email)
    if not rows:
        rows = await sql_query("SELECT * FROM user WHERE id = ?", user_id)

    scim_user = _wiki_user_to_scim(rows)
    if not scim_user:
        raise HTTPException(status_code=404, detail="User not found after update")

    uid = scim_user["id"]
    scim_user["meta"]["location"] = f"/scim/v2/Users/{uid}"

    if not active:
        pr2 = await sql_query("SELECT deprovision_behavior FROM scim_provider WHERE id = ?", pid)
        behavior = "deactivate"
        if pr2:
            r = pr2[0]
            behavior = str(r.get("deprovision_behavior", "deactivate")) if isinstance(r, dict) else str(r[5] if len(r) > 5 else "deactivate")
        try:
            await call_reducer("scim_deprovision_user", [email, behavior])
        except RuntimeError:
            pass

    await _record_event(pid, "User", "PUT", external_id, uid, "success", f"Updated user '{email}'")
    return scim_user


@router.delete("/Users/{user_id}")
async def delete_user(request: Request, user_id: str):
    pid = await _get_provider(request)
    if not pid:
        raise HTTPException(status_code=401, detail="Invalid or missing SCIM token")

    rows = await sql_query("SELECT email FROM user WHERE id = ?", user_id)
    if not rows:
        raise HTTPException(status_code=404, detail="User not found")

    email = str(rows[0][0]) if isinstance(rows[0], list) else str(rows[0].get("email", ""))

    try:
        await call_reducer("scim_deprovision_user", [email, "delete"])
        await _record_event(pid, "User", "DELETE", "", user_id, "success", f"Deleted user '{email}'")
    except RuntimeError as e:
        await _record_event(pid, "User", "DELETE", "", user_id, "error", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {e}")

    return JSONResponse(status_code=204, content={})


# ─── /Groups ──────────────────────────────────────────────────────────────────


@router.get("/Groups")
async def list_groups(
    request: Request,
    filter: str | None = None,
    startIndex: int = 1,
    count: int = 100,
):
    pid = await _get_provider(request)
    if not pid:
        raise HTTPException(status_code=401, detail="Invalid or missing SCIM token")

    sql = "SELECT * FROM \"group\""
    bind_args = []
    if filter and "displayName eq" in filter:
        name = filter.split("eq")[-1].strip().strip('"').strip("'")
        sql += " WHERE name = ?"
        bind_args.append(name)

    # Get total count
    count_sql = "SELECT COUNT(*) AS n FROM \"group\""
    if filter and "displayName eq" in filter:
        count_sql += " WHERE name = ?"
    count_rows = await sql_query(count_sql, *bind_args)
    total = count_rows[0][0] if count_rows else 0

    # Fetch paginated results
    start = max(0, startIndex - 1)
    rows = await sql_query(sql + " LIMIT ?i OFFSET ?i", *bind_args, count, start)
    all_groups = rows if isinstance(rows, list) else []
    scim_groups = []
    for g in all_groups:
        sg = _wiki_group_to_scim([g])
        if sg:
            gid = sg["id"]
            members = await sql_query("SELECT user_id FROM group_member WHERE group_id = ?", gid)
            if members:
                for m in members:
                    uid = str(m[0]) if isinstance(m, list) else str(m.get("user_id", ""))
                    sg["members"].append({"value": uid, "type": "User"})
            scim_groups.append(sg)

    return {
        "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        "totalResults": total,
        "startIndex": startIndex,
        "itemsPerPage": count,
        "Resources": scim_groups,
    }


@router.get("/Groups/{group_id}")
async def get_group(request: Request, group_id: str):
    pid = await _get_provider(request)
    if not pid:
        raise HTTPException(status_code=401, detail="Invalid or missing SCIM token")

    rows = await sql_query("SELECT * FROM \"group\" WHERE id = ?", group_id)
    sg = _wiki_group_to_scim(rows)
    if not sg:
        raise HTTPException(status_code=404, detail="Group not found")

    members = await sql_query("SELECT user_id FROM group_member WHERE group_id = ?", group_id)
    if members:
        for m in members:
            uid = str(m[0]) if isinstance(m, list) else str(m.get("user_id", ""))
            sg["members"].append({"value": uid, "type": "User"})
    return sg


@router.post("/Groups")
async def create_group(request: Request):
    pid = await _get_provider(request)
    if not pid:
        raise HTTPException(status_code=401, detail="Invalid or missing SCIM token")

    body = await request.json()
    display_name = body.get("displayName", "")
    external_id = body.get("externalId", "")

    if not display_name:
        raise HTTPException(status_code=400, detail="displayName is required")

    existing = await sql_query("SELECT id FROM \"group\" WHERE name = ?", display_name)
    if existing:
        gid = str(existing[0][0]) if isinstance(existing[0], list) else str(existing[0].get("id", ""))
        sg = _wiki_group_to_scim(await sql_query("SELECT * FROM \"group\" WHERE id = ?", gid))
        if sg:
            sg["meta"]["location"] = f"/scim/v2/Groups/{gid}"
            return JSONResponse(status_code=200, content=sg)

    gid = str(uuid.uuid4())
    try:
        await call_reducer("scim_sync_group", [gid, display_name, external_id, pid])
    except RuntimeError as e:
        await _record_event(pid, "Group", "POST", external_id, "", "error", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to create group: {e}")

    sg = _wiki_group_to_scim(await sql_query("SELECT * FROM \"group\" WHERE id = ?", gid))
    if sg:
        sg["meta"]["location"] = f"/scim/v2/Groups/{gid}"
        await _record_event(pid, "Group", "POST", external_id, gid, "success",
                            f"Created group '{display_name}'")
        return JSONResponse(status_code=201, content=sg)
    raise HTTPException(status_code=500, detail="Group created but not found")


@router.put("/Groups/{group_id}")
async def update_group(request: Request, group_id: str):
    pid = await _get_provider(request)
    if not pid:
        raise HTTPException(status_code=401, detail="Invalid or missing SCIM token")

    body = await request.json()
    display_name = body.get("displayName", "")
    external_id = body.get("externalId", "")

    if not display_name:
        raise HTTPException(status_code=400, detail="displayName is required")

    existing = await sql_query("SELECT * FROM \"group\" WHERE id = ?", group_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")

    try:
        await call_reducer("scim_sync_group", [group_id, display_name, external_id, pid])
    except RuntimeError as e:
        await _record_event(pid, "Group", "PUT", external_id, group_id, "error", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to update group: {e}")

    sg = _wiki_group_to_scim(await sql_query("SELECT * FROM \"group\" WHERE id = ?", group_id))
    if sg:
        sg["meta"]["location"] = f"/scim/v2/Groups/{group_id}"
        await _record_event(pid, "Group", "PUT", external_id, group_id, "success",
                            f"Updated group '{display_name}'")
        return sg
    raise HTTPException(status_code=500, detail="Group updated but not found")


@router.delete("/Groups/{group_id}")
async def delete_group(request: Request, group_id: str):
    pid = await _get_provider(request)
    if not pid:
        raise HTTPException(status_code=401, detail="Invalid or missing SCIM token")

    rows = await sql_query("SELECT name FROM \"group\" WHERE id = ?", group_id)
    if not rows:
        raise HTTPException(status_code=404, detail="Group not found")

    name = str(rows[0][1]) if isinstance(rows[0], list) else str(rows[0].get("name", ""))

    try:
        await call_reducer("scim_deprovision_group", [name])
        await _record_event(pid, "Group", "DELETE", "", group_id, "success",
                            f"Deleted group '{name}'")
    except RuntimeError as e:
        await _record_event(pid, "Group", "DELETE", "", group_id, "error", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete group: {e}")

    return JSONResponse(status_code=204, content={})
