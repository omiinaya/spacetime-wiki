"""WebAuthn (Passkeys) API endpoints with full cryptographic verification.

Handles WebAuthn registration and authentication flows using the `webauthn`
package for proper COSE key parsing, attestation verification, and
assertion signature verification.

Usage:
    1. GET /register/begin?email=x&display_name=y
       → Returns PublicKeyCredentialCreationOptions
    2. POST /register/complete with browser response
       → Verifies attestation + stores credential
    3. GET /auth/begin?email=x
       → Returns PublicKeyCredentialRequestOptions
    4. POST /auth/complete with browser response
       → Verifies assertion signature → returns user
"""

import base64
import json
import logging
import os
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    RegistrationCredential,
    AuthenticationCredential,
    UserVerificationRequirement,
    ResidentKeyRequirement,
)
from webauthn.helpers import generate_challenge as wa_generate_challenge

from stdb_client import sql_query, call_reducer
from models import (
    WebAuthnBeginRegisterResponse,
    WebAuthnRegisterCompleteResponse,
    WebAuthnBeginAuthResponse,
    WebAuthnAuthCompleteResponse,
)

router = APIRouter(prefix="/api/v1/webauthn", tags=["webauthn"])

RP_NAME = "SpacetimeWiki"


def get_rp_id(request: Request) -> str:
    """Extract RP ID from the request."""
    origin = request.headers.get("origin", "")
    if origin:
        host = origin.replace("http://", "").replace("https://", "").split(":")[0]
        return host
    return "localhost"


def get_rp_origin(request: Request) -> str:
    """Get the origin from the request."""
    return request.headers.get("origin", "http://localhost")


def base64url_decode(s: str) -> bytes:
    """Decode base64url string to bytes."""
    s = s.replace("-", "+").replace("_", "/")
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.b64decode(s)


def base64url_encode(data: bytes) -> str:
    """Encode bytes to base64url string (no padding)."""
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


async def get_user_by_email(email: str) -> Optional[dict]:
    """Look up a user by email with SQL injection protection."""
    rows = await sql_query("SELECT * FROM user WHERE email = ?", email)
    if not rows:
        return None
    row = rows[0]
    return {
        "id": str(row[0]),
        "name": str(row[1]),
        "email": str(row[2]),
    }


async def get_credentials_for_user(user_id: str) -> list[dict]:
    """Get all WebAuthn credentials for a user."""
    rows = await sql_query("SELECT * FROM passkey_credential WHERE user_id = ?", user_id)
    credentials = []
    for row in rows:
        credentials.append({
            "id": str(row[0]),
            "user_id": str(row[1]),
            "credential_id": str(row[2]),
            "public_key": str(row[3]),
            "counter": int(row[4]) if row[4] else 0,
            "transports": str(row[5]) if row[5] else '["internal"]',
            "device_name": str(row[6]) if row[6] else "Unknown",
        })
    return credentials


async def get_credential_by_credential_id(credential_id: str) -> Optional[dict]:
    """Look up a credential by credential_id."""
    rows = await sql_query("SELECT * FROM passkey_credential WHERE credential_id = ?", credential_id)
    if not rows:
        return None
    row = rows[0]
    return {
        "id": str(row[0]),
        "user_id": str(row[1]),
        "credential_id": str(row[2]),
        "public_key": str(row[3]),
        "counter": int(row[4]) if row[4] else 0,
        "transports": str(row[5]) if row[5] else '["internal"]',
        "device_name": str(row[6]) if str(row[6]) else "Unknown",
    }


def parse_transports(transports_str: str) -> list[str]:
    """Parse transports JSON string to list."""
    try:
        t = json.loads(transports_str)
        if isinstance(t, list):
            return t
    except (json.JSONDecodeError, TypeError):
        pass
    return []


# ─── Registration ──────────────────────────────────────────────────────────────


@router.get("/register/begin", response_model=WebAuthnBeginRegisterResponse)
async def register_begin(request: Request, email: str, display_name: str = ""):
    """Generate WebAuthn registration options.

    Returns options that the browser passes to navigator.credentials.create().
    The challenge is stored in STDB for later verification.
    """
    user = await get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rp_id = get_rp_id(request)
    rp_origin = get_rp_origin(request)

    # Generate challenge using the webauthn library
    challenge = wa_generate_challenge()
    challenge_b64 = base64url_encode(challenge)

    # Store challenge in STDB
    await call_reducer("create_passkey_challenge", [
        challenge_b64, user["id"], "registration",
    ])

    # Generate registration options using webauthn library
    options = generate_registration_options(
        rp_id=rp_id,
        rp_name=RP_NAME,
        user_id=user["id"].encode("utf-8"),
        user_name=user["email"],
        user_display_name=display_name or user["name"] or user["email"],
        challenge=challenge,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )

    return json.loads(options_to_json(options))


@router.post("/register/complete", response_model=WebAuthnRegisterCompleteResponse)
async def register_complete(request: Request, body: dict):
    """Verify and store a WebAuthn registration credential.

    Verifies the attestation object using the webauthn library,
    extracts and stores the COSE public key for future assertion verification.
    """
    try:
        credential_id = body.get("id", "")
        raw_id = body.get("rawId", "")
        client_data_json_b64 = body.get("response", {}).get("clientDataJSON", "")
        attestation_object_b64 = body.get("response", {}).get("attestationObject", "")
        transports = body.get("response", {}).get("transports", [])
        user_id = body.get("user_id", "")
        device_name = body.get("device_name", "")

        if not all([credential_id, client_data_json_b64, attestation_object_b64, user_id]):
            raise HTTPException(status_code=400, detail="Missing required fields")

        # Extract origin and challenge from clientDataJSON
        client_data_json_bytes = base64url_decode(client_data_json_b64)
        client_data = json.loads(client_data_json_bytes.decode("utf-8", errors="replace"))
        challenge_b64 = client_data.get("challenge", "")

        # Verify the challenge exists and consume it
        try:
            await call_reducer("consume_passkey_challenge", [challenge_b64])
        except Exception as e:
            logger.error("Challenge verification failed during registration: %s", e, exc_info=True)
            raise HTTPException(status_code=400, detail="Challenge verification failed.")

        rp_id = get_rp_id(request)
        rp_origin = get_rp_origin(request)

        # Verify the registration response using webauthn library
        # This validates:
        #   1. The attestation signature
        #   2. The challenge matches
        #   3. The origin matches
        #   4. The RP ID hash matches
        #   5. Extracts and returns the COSE public key
        verification = verify_registration_response(
            credential=RegistrationCredential(
                id=credential_id,
                raw_id=base64url_decode(raw_id),
                response={
                    "client_data_json": base64url_decode(client_data_json_b64),
                    "attestation_object": base64url_decode(attestation_object_b64),
                },
                transports=transports or ["internal"],
                type="public-key",
            ),
            expected_challenge=base64url_decode(challenge_b64),
            expected_origin=rp_origin,
            expected_rp_id=rp_id,
        )

        # Store the credential's public key (from verification result)
        credential_public_key_b64 = base64url_encode(verification.credential_public_key)

        transports_str = json.dumps(transports) if transports else '["internal"]'

        await call_reducer("store_passkey_credential", [
            credential_id,
            user_id,
            credential_id,
            credential_public_key_b64,
            0,  # initial counter
            transports_str,
            device_name or "Unknown device",
        ])

        return {"status": "ok", "credential_id": credential_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


# ─── Authentication ────────────────────────────────────────────────────────────


@router.get("/auth/begin", response_model=WebAuthnBeginAuthResponse)
async def auth_begin(request: Request, email: Optional[str] = None):
    """Generate WebAuthn authentication options.

    Returns options that the browser passes to navigator.credentials.get().
    If email is provided, only allow credentials for that user.
    """
    challenge = wa_generate_challenge()
    challenge_b64 = base64url_encode(challenge)

    rp_id = get_rp_id(request)

    allowed_credentials = []
    user_handle = ""
    if email:
        user = await get_user_by_email(email)
        if user:
            user_handle = user["id"]
            credentials = await get_credentials_for_user(user["id"])
            for cred in credentials:
                allowed_credentials.append(PublicKeyCredentialDescriptor(
                    id=base64url_decode(cred["credential_id"]),
                    type="public-key",
                    transports=parse_transports(cred["transports"]),
                ))

    # Store challenge
    await call_reducer("create_passkey_challenge", [
        challenge_b64, user_handle, "authentication",
    ])

    options = generate_authentication_options(
        rp_id=rp_id,
        challenge=challenge,
        allow_credentials=allowed_credentials if allowed_credentials else None,
        user_verification=UserVerificationRequirement.PREFERRED,
    )

    return json.loads(options_to_json(options))


@router.post("/auth/complete", response_model=WebAuthnAuthCompleteResponse)
async def auth_complete(request: Request, body: dict):
    """Verify a WebAuthn authentication assertion.

    Verifies the assertion signature over authenticatorData + SHA256(clientDataJSON)
    using the stored COSE public key. This is the critical security check that
    proves the user possesses the private key associated with their credential.
    """
    try:
        credential_id = body.get("id", "")
        raw_id = body.get("rawId", "")
        client_data_json_b64 = body.get("response", {}).get("clientDataJSON", "")
        authenticator_data_b64 = body.get("response", {}).get("authenticatorData", "")
        signature_b64 = body.get("response", {}).get("signature", "")
        user_handle_b64 = body.get("response", {}).get("userHandle", "")

        if not all([credential_id, client_data_json_b64, authenticator_data_b64, signature_b64]):
            raise HTTPException(status_code=400, detail="Missing required fields")

        # Extract challenge from clientDataJSON
        client_data_json_bytes = base64url_decode(client_data_json_b64)
        client_data = json.loads(client_data_json_bytes.decode("utf-8", errors="replace"))
        challenge_b64 = client_data.get("challenge", "")

        if not challenge_b64:
            raise HTTPException(status_code=400, detail="No challenge in clientDataJSON")

        # Consume the challenge
        try:
            await call_reducer("consume_passkey_challenge", [challenge_b64])
        except Exception as e:
            logger.error("Challenge verification failed during auth: %s", e, exc_info=True)
            raise HTTPException(status_code=400, detail="Challenge verification failed.")

        # Look up the credential to get stored public key
        cred = await get_credential_by_credential_id(credential_id)
        if not cred:
            raise HTTPException(status_code=404, detail="Credential not found")

        stored_user_id = cred["user_id"]
        public_key_bytes = base64url_decode(cred["public_key"])

        rp_id = get_rp_id(request)
        rp_origin = get_rp_origin(request)

        # Verify the assertion signature using webauthn library
        # This validates:
        #   1. The signature over authenticatorData + SHA256(clientDataJSON)
        #   2. The challenge matches
        #   3. The origin matches
        #   4. The RP ID hash matches
        verification = verify_authentication_response(
            credential=AuthenticationCredential(
                id=credential_id,
                raw_id=base64url_decode(raw_id),
                response={
                    "client_data_json": base64url_decode(client_data_json_b64),
                    "authenticator_data": base64url_decode(authenticator_data_b64),
                    "signature": base64url_decode(signature_b64),
                },
                type="public-key",
            ),
            expected_challenge=base64url_decode(challenge_b64),
            expected_origin=rp_origin,
            expected_rp_id=rp_id,
            credential_public_key=public_key_bytes,
            credential_current_sign_count=cred["counter"],
            require_user_verification=False,
        )

        # Update counter with the new value from the authenticator
        new_counter = verification.new_sign_count or (cred["counter"] + 1)
        try:
            await call_reducer("update_passkey_counter", [credential_id, new_counter])
        except RuntimeError:
            pass  # Non-fatal

        # Look up the user
        user_rows = await sql_query("SELECT * FROM user WHERE id = ?", stored_user_id)
        if not user_rows:
            raise HTTPException(status_code=404, detail="User not found")

        user_row = user_rows[0]
        user_data = {
            "id": str(user_row[0]),
            "name": str(user_row[1]),
            "email": str(user_row[2]),
            "role": str(user_row[4]) if len(user_row) > 4 else "member",
        }

        return {"status": "ok", "user": user_data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")
