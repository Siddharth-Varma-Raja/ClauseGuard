"""
Dev Token Generator Endpoint
===============================
POST /api/v1/dev/token  — Generate a Firebase ID token for testing.

⚠  This is a DEVELOPMENT-ONLY endpoint. Do NOT expose in production.

Accepts either:
  • { "email": "...", "password": "..." }   → signs in via Firebase REST API
  • { "firebase_uid": "..." }               → mints a custom token via Admin SDK, then exchanges it

Returns a Bearer token you can copy straight into Postman.
"""

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.config import settings
from app.core.firebase import init_firebase

router = APIRouter(prefix="/dev", tags=["Dev — Token Generator"])

FIREBASE_SIGN_IN_URL = (
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
)
FIREBASE_CUSTOM_TOKEN_URL = (
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken"
)


# ── Request / Response schemas ────────────────────────────────────────────────


class TokenByEmailRequest(BaseModel):
    email: str
    password: str


class TokenByUidRequest(BaseModel):
    firebase_uid: str


class TokenResponse(BaseModel):
    id_token: str
    refresh_token: str
    expires_in: str
    message: str = "Use the id_token as your Bearer token in Postman."


# ── Helpers ───────────────────────────────────────────────────────────────────


def _check_api_key() -> str:
    if not settings.firebase_web_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "FIREBASE_WEB_API_KEY is not configured. "
                "Add it to your .env file. "
                "Find it at: Firebase Console → Project Settings → General → Web API Key."
            ),
        )
    return settings.firebase_web_api_key


# ── POST /dev/token  (email + password) ──────────────────────────────────────


@router.post(
    "/token",
    response_model=TokenResponse,
    summary="Get a Bearer token by email & password",
    description=(
        "Signs in with email/password via Firebase Auth REST API and returns "
        "a valid ID token. Use this token as `Bearer <token>` in Postman."
    ),
)
async def generate_token_by_email(body: TokenByEmailRequest) -> TokenResponse:
    api_key = _check_api_key()

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            FIREBASE_SIGN_IN_URL,
            params={"key": api_key},
            json={
                "email": body.email,
                "password": body.password,
                "returnSecureToken": True,
            },
        )

    if resp.status_code != 200:
        error_data = resp.json()
        error_msg = error_data.get("error", {}).get("message", resp.text)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Firebase sign-in failed: {error_msg}",
        )

    data = resp.json()
    return TokenResponse(
        id_token=data["idToken"],
        refresh_token=data["refreshToken"],
        expires_in=data.get("expiresIn", "3600"),
    )


# ── POST /dev/token-by-uid  (Firebase UID) ──────────────────────────────────


@router.post(
    "/token-by-uid",
    response_model=TokenResponse,
    summary="Get a Bearer token by Firebase UID",
    description=(
        "Mints a custom token for the given Firebase UID via Admin SDK, "
        "then exchanges it for a real ID token via REST API. "
        "Useful when you don't know the user's password."
    ),
)
async def generate_token_by_uid(body: TokenByUidRequest) -> TokenResponse:
    from firebase_admin import auth as firebase_auth

    api_key = _check_api_key()

    # Ensure Firebase is initialised
    init_firebase()

    # Verify the UID exists
    try:
        firebase_auth.get_user(body.firebase_uid)
    except firebase_auth.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Firebase UID not found: {body.firebase_uid}",
        )

    # Mint custom token
    custom_token: bytes = firebase_auth.create_custom_token(body.firebase_uid)
    if isinstance(custom_token, bytes):
        custom_token_str = custom_token.decode("utf-8")
    else:
        custom_token_str = custom_token

    # Exchange for ID token
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            FIREBASE_CUSTOM_TOKEN_URL,
            params={"key": api_key},
            json={
                "token": custom_token_str,
                "returnSecureToken": True,
            },
        )

    if resp.status_code != 200:
        error_data = resp.json()
        error_msg = error_data.get("error", {}).get("message", resp.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Token exchange failed: {error_msg}",
        )

    data = resp.json()
    return TokenResponse(
        id_token=data["idToken"],
        refresh_token=data.get("refreshToken", ""),
        expires_in=data.get("expiresIn", "3600"),
    )
