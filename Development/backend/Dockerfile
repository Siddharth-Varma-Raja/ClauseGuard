FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# ── System dependencies ────────────────────────────────────────────────────────
# libmagic1      → MIME-type sniffing for python-magic (upload validation)
# build-essential → compile native Python extensions
# curl           → healthcheck probes
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies (cached layer) ────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Application code ──────────────────────────────────────────────────────────
COPY . .

# The host injects $PORT (Cloud Run and Render both set it); 8080 when unset.
EXPOSE 8080

# Migrations run on start-up by default (Render, local Docker). On Cloud Run
# they run as a separate job (`clauseguard-migrate`) so scaled-out instances
# never race each other, and the service sets RUN_MIGRATIONS=false.
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" != \"false\" ]; then alembic upgrade head; fi && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
