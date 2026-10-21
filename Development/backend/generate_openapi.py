"""
OpenAPI YAML Generator for ClauseGuard API
=============================================
Fetches the live OpenAPI schema from the running FastAPI server
and saves it as a YAML file that can be imported directly into Postman.

Usage:
    1. Start the backend:  uvicorn app.main:app --reload
    2. Run this script:    python generate_openapi.py

The resulting `openapi.yaml` file can be imported into Postman via:
    File → Import → Upload Files → select openapi.yaml
"""

import json
import sys

import requests
import yaml

BASE_URL = "http://127.0.0.1:8000"
OPENAPI_URL = f"{BASE_URL}/openapi.json"
OUTPUT_FILE = "openapi.yaml"


def generate_openapi_yaml() -> None:
    print("=" * 60)
    print("  ClauseGuard — OpenAPI YAML Generator")
    print("=" * 60)
    print()
    print(f"Fetching OpenAPI schema from {OPENAPI_URL} ...")

    response = requests.get(OPENAPI_URL, timeout=30)
    response.raise_for_status()
    openapi_data = response.json()

    # ── Write YAML ────────────────────────────────────────────────────────────
    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        yaml.safe_dump(
            openapi_data,
            file,
            sort_keys=False,
            allow_unicode=True,
            default_flow_style=False,
        )

    # ── Summary ───────────────────────────────────────────────────────────────
    http_methods = {"get", "post", "put", "patch", "delete", "options", "head"}

    total_apis = sum(
        len([m for m in methods if m.lower() in http_methods])
        for methods in openapi_data.get("paths", {}).values()
    )

    paths = openapi_data.get("paths", {})

    print()
    print("✅  OpenAPI documentation generated!")
    print(f"    Output file   : {OUTPUT_FILE}")
    print(f"    OpenAPI version: {openapi_data.get('openapi')}")
    print(f"    API title     : {openapi_data.get('info', {}).get('title')}")
    print(f"    Total endpoints: {total_apis}")
    print()

    # ── List every endpoint ───────────────────────────────────────────────────
    print("Endpoints discovered:")
    print("-" * 60)
    for path, methods in paths.items():
        for method in methods:
            if method.lower() in http_methods:
                summary = ""
                if isinstance(methods[method], dict):
                    summary = methods[method].get("summary", "")
                print(f"  {method.upper():8s} {path:40s} {summary}")
    print("-" * 60)
    print()
    print(f"Import '{OUTPUT_FILE}' into Postman → File → Import → Upload Files")
    print()


if __name__ == "__main__":
    try:
        generate_openapi_yaml()
    except requests.ConnectionError:
        print("\n❌  Cannot connect to the server.")
        print(f"    Make sure your FastAPI server is running at {BASE_URL}")
        print("    Start it with:  uvicorn app.main:app --reload")
        sys.exit(1)
    except requests.RequestException as error:
        print(f"\n❌  API connection failed: {error}")
        print("    Make sure your FastAPI server is running.")
        sys.exit(1)
    except Exception as error:
        print(f"\n❌  Unexpected error: {error}")
        sys.exit(1)
