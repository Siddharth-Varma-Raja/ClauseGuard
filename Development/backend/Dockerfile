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

# Render dynamically assigns $PORT (default 10000); expose for documentation
EXPOSE ${PORT:-10000}

# Run Alembic migrations on startup, then launch Uvicorn bound to Render's $PORT
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]