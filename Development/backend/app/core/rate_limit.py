from slowapi import Limiter
from starlette.requests import Request

from app.config import settings


def client_ip(request: Request) -> str:
    """
    Resolve the real client IP for rate limiting.

    Behind the Google external Application Load Balancer the LB APPENDS
    "<client-ip>,<lb-ip>" to any X-Forwarded-For value the client sent.
    The left-most entries are therefore client-controlled and must not be
    trusted; the real client IP is the entry just before the trusted proxies.

    ``settings.trusted_proxy_count`` = number of trusted proxies appending to
    the header (1 behind the Google LB, 0 locally = header ignored).
    """
    trusted = settings.trusted_proxy_count
    if trusted > 0:
        forwarded = request.headers.get("x-forwarded-for", "")
        hops = [h.strip() for h in forwarded.split(",") if h.strip()]
        if len(hops) > trusted:
            return hops[-(trusted + 1)]
        if hops:
            return hops[0]
    return request.client.host if request.client else "127.0.0.1"


# In-memory storage: limits are per Cloud Run instance. With max-instances N
# the effective ceiling per client is up to N x the configured limit. Cloud
# Armor's rate-based rule at the load balancer is the global backstop.
limiter = Limiter(
    key_func=client_ip,
    default_limits=[settings.rate_limit_api],
    storage_uri="memory://",
)
