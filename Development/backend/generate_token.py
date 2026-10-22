"""
Firebase Token Generator for ClauseGuard
==========================================
Generates a valid Firebase ID token for any user UID registered in your
Firebase project — no need to log in via the browser or copy tokens from
the Firebase console.

HOW IT WORKS
────────────
1. Uses Firebase Admin SDK to mint a **custom token** for the given UID.
2. Exchanges the custom token for a real **ID token** via the Firebase
   Auth REST API (signInWithCustomToken).
3. Prints the ID token ready to paste into Postman's Authorization header.

SETUP
─────
1. Set your Firebase Web API Key below (find it in Firebase Console →
   Project Settings → General → Web API Key).
2. Make sure `firebase-service-account.json` is in the backend directory.

USAGE
─────
    python generate_token.py                       # interactive — prompts for UID
    python generate_token.py <firebase_uid>        # pass UID as argument
    python generate_token.py --email user@test.com # look up by email

The token is valid for ~1 hour (Firebase default).
"""

import json
import os
import sys

import firebase_admin
import requests
from dotenv import load_dotenv
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

# ── Configuration ─────────────────────────────────────────────────────────────

load_dotenv()  # loads from .env in the current directory

SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_CREDENTIALS_JSON", "./firebase-service-account.json")

# Firebase Web API Key — find it in Firebase Console → Project Settings → General
# This is the PUBLIC Web API key, NOT the service account private key.
# Add FIREBASE_WEB_API_KEY=AIzaSy... to your .env file.
FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY", "")

if not FIREBASE_WEB_API_KEY:
    print("❌  FIREBASE_WEB_API_KEY not found in .env")
    print("   Add this line to your .env file:")
    print("   FIREBASE_WEB_API_KEY=AIzaSy...")
    print()
    print("   Find it at: Firebase Console → Project Settings → General → Web API Key")
    sys.exit(1)

EXCHANGE_URL = (
    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken"
    f"?key={FIREBASE_WEB_API_KEY}"
)



# ── Firebase Admin init ──────────────────────────────────────────────────────

def _init_firebase() -> None:
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)


def _get_uid_by_email(email: str) -> str:
    """Look up a Firebase user by email and return their UID."""
    try:
        user = firebase_auth.get_user_by_email(email)
        print(f"  Found user: {user.display_name or '(no name)'} — UID: {user.uid}")
        return user.uid
    except firebase_auth.UserNotFoundError:
        print(f"❌  No Firebase user found with email: {email}")
        sys.exit(1)


def _list_users() -> None:
    """List first 20 Firebase users for quick reference."""
    print("\n  Firebase users (first 20):")
    print("  " + "-" * 60)
    page = firebase_auth.list_users()
    count = 0
    for user in page.users:
        print(f"    UID: {user.uid}")
        print(f"    Email: {user.email or '(none)'}")
        print(f"    Name: {user.display_name or '(none)'}")
        print()
        count += 1
        if count >= 20:
            break
    if count == 0:
        print("    (no users found)")
    print("  " + "-" * 60)


def generate_id_token(firebase_uid: str) -> str:
    """
    Mint a custom token for the UID, then exchange it for a real ID token
    via Firebase REST API.
    """
    _init_firebase()

    # Step 1 — Verify the UID exists in Firebase
    try:
        user_record = firebase_auth.get_user(firebase_uid)
    except firebase_auth.UserNotFoundError:
        print(f"❌  Firebase UID not found: {firebase_uid}")
        sys.exit(1)

    print(f"  User email : {user_record.email}")
    print(f"  Display name: {user_record.display_name or '(not set)'}")
    print()

    # Step 2 — Create custom token
    print("  Minting custom token …")
    custom_token: bytes = firebase_auth.create_custom_token(firebase_uid)

    if isinstance(custom_token, bytes):
        custom_token_str = custom_token.decode("utf-8")
    else:
        custom_token_str = custom_token

    # Step 3 — Exchange for ID token via REST API
    print("  Exchanging for ID token …")
    resp = requests.post(
        EXCHANGE_URL,
        json={"token": custom_token_str, "returnSecureToken": True},
        timeout=30,
    )

    if resp.status_code != 200:
        error_data = resp.json()
        error_msg = error_data.get("error", {}).get("message", resp.text)
        print(f"\n❌  Token exchange failed: {error_msg}")
        if "API key not valid" in str(error_msg) or "API_KEY_INVALID" in str(error_msg):
            print("\n  ⚠  Your FIREBASE_WEB_API_KEY is invalid or not set.")
            print("     Find it at: Firebase Console → Project Settings → General → Web API Key")
            print(f"     Then update FIREBASE_WEB_API_KEY in this script ({__file__})")
        sys.exit(1)

    data = resp.json()
    id_token = data["idToken"]
    expires_in = data.get("expiresIn", "3600")

    return id_token, expires_in


def main() -> None:
    print()
    print("=" * 60)
    print("  ClauseGuard — Firebase Token Generator")
    print("=" * 60)
    print()

    _init_firebase()

    # ── Parse arguments ───────────────────────────────────────────────────────
    firebase_uid = None

    if len(sys.argv) >= 2:
        if sys.argv[1] == "--email" and len(sys.argv) >= 3:
            firebase_uid = _get_uid_by_email(sys.argv[2])
        elif sys.argv[1] == "--list":
            _list_users()
            return
        elif sys.argv[1] in ("--help", "-h"):
            print("Usage:")
            print("  python generate_token.py                        # interactive")
            print("  python generate_token.py <firebase_uid>         # by UID")
            print("  python generate_token.py --email user@test.com  # by email")
            print("  python generate_token.py --list                 # list users")
            return
        else:
            firebase_uid = sys.argv[1]
    else:
        # Interactive mode — list users then ask
        _list_users()
        firebase_uid = input("\n  Enter Firebase UID: ").strip()
        if not firebase_uid:
            print("  No UID provided. Exiting.")
            return

    print(f"\n  Generating token for UID: {firebase_uid}")
    print()

    id_token, expires_in = generate_id_token(firebase_uid)

    print()
    print("✅  ID Token generated successfully!")
    print(f"    Expires in: {expires_in} seconds (~1 hour)")
    print()
    print("─" * 60)
    print("  BEARER TOKEN (copy this into Postman):")
    print("─" * 60)
    print()
    print(id_token)
    print()
    print("─" * 60)
    print()
    print("  Postman setup:")
    print("    1. Go to your collection → Authorization tab")
    print("    2. Type: Bearer Token")
    print("    3. Paste the token above")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n  Cancelled.")
    except Exception as error:
        print(f"\n❌  Error: {error}")
        sys.exit(1)
