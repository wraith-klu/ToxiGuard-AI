FROM python:3.11-slim

# ─── Environment ─────────────────────────────────────────────────────────────
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    # Disable PyTorch fallback — inference runs via ONNX Runtime only.
    # Remove this line if you want to allow the PyTorch fallback path.
    ONNX_ONLY=true

WORKDIR /app

# ─── System dependencies ──────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ─── Python dependencies (prod: no torch, ~2 GB lighter) ─────────────────────
# Use requirements-prod.txt for production (Oracle A1 / ARM64 / any VPS).
# Switch to requirements.txt only for local training or model export.
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# ─── Application source ───────────────────────────────────────────────────────
COPY . .

# ─── Port ─────────────────────────────────────────────────────────────────────
EXPOSE 8000

# ─── Start server ─────────────────────────────────────────────────────────────
CMD ["sh", "-c", "gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:${PORT:-8000}"]
