import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.translation_router import router as translation_router
from app.api.lease_chat_router import router as lease_chat_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.dev_token import router as dev_router
from app.config import settings
from app.core.firebase import init_firebase
from app.core.rate_limit import limiter
from app.middleware.logging import RequestLoggingMiddleware

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)

app = FastAPI(
    title="ClauseGuard Identity & Analysis API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter

# ── CORS Middleware ────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://clause-guard-ten-chi.vercel.app", "http://localhost:3000","https://www.clauseguard.ie","https://clauseguard.ie"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.add_middleware(RequestLoggingMiddleware)

# ── Routers (All mounted under /api, no /v1) ──────────────────────────────────
app.include_router(auth_router, prefix="/api")
app.include_router(translation_router, prefix="/api")
app.include_router(lease_chat_router, prefix="/api")
app.include_router(dev_router, prefix="/api")


@app.on_event("startup")
async def startup() -> None:
    init_firebase()


@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok"}


# ── Global Exception Handlers (Standardizing {"message": ...}) ─────────────────

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Return all HTTP exceptions wrapped in {"message": ...} envelope."""
    msg = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": msg},
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Format schema validation errors into a single readable message string."""
    errors = exc.errors()
    if errors:
        first = errors[0]
        field = " -> ".join(str(loc) for loc in first.get("loc", []) if loc != "body")
        raw_msg = first.get("msg", "Invalid value")
        msg = f"{field}: {raw_msg}" if field else raw_msg
    else:
        msg = "Validation failed for the request payload."

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"message": msg},
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"message": f"Rate limit exceeded: {exc.detail}"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger = structlog.get_logger(__name__)
    logger.error("unhandled_exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": "An unexpected error occurred. Please try again later."},
    )