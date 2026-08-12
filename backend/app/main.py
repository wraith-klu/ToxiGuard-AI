import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.limiter import limiter
from app.core.logger import logger
from app.core.config import settings
from app.routes.moderation import router as moderation_router
from app.routes.auth import router as auth_router
from app.routes.realtime import router as realtime_router
from app.routes.explain import router as explain_router
from app.routes.monitoring import router as monitoring_router
from app.routes.feedback import router as feedback_router
from app.routes.stream import router as stream_router
from app.services.model_service import model_service

from database import engine, Base
Base.metadata.create_all(bind=engine)


# ──────────────────────────────────────────────────────────────────────────────
# LIFESPAN (startup / shutdown)
# ──────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=" * 50)
    logger.info(f"ToxiGuard AI v{settings.app_version} starting up")
    logger.info(f"Model status: {model_service.status}")
    logger.info(f"CORS origins: {settings.allowed_origins_list}")
    
    # Pre-warm XAI Explainer to avoid lag on first explain query
    try:
        from ml.explainability import get_explainer
        get_explainer(settings.model_dir)
        logger.info("[Lifespan] XAI Explainer pre-warmed successfully")
    except Exception as e:
        logger.warning(f"[Lifespan] Failed to pre-warm XAI explainer: {e}")
        
    logger.info("=" * 50)
    yield
    # Shutdown
    logger.info("ToxiGuard AI shutting down")


# ──────────────────────────────────────────────────────────────────────────────
# APP INIT
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.app_title,
    description=settings.app_description,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ──────────────────────────────────────────────────────────────────────────────
# RATE LIMITING
# ──────────────────────────────────────────────────────────────────────────────

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again shortly."},
    )


# ──────────────────────────────────────────────────────────────────────────────
# CORS — reads from ALLOWED_ORIGINS env var (not hardcoded ["*"])
# ──────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key", "Authorization"],
)


# ──────────────────────────────────────────────────────────────────────────────
# ROUTES
# ──────────────────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(moderation_router)
app.include_router(realtime_router)
app.include_router(explain_router)
app.include_router(monitoring_router)
app.include_router(feedback_router)
app.include_router(stream_router)


# ──────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ToxiGuard AI running",
        "version": settings.app_version,
    }


@app.get("/health", tags=["Health"])
def health():
    """Detailed health check with model and endpoint status."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "model": model_service.status,
        "endpoints": {
            "predict_full":     "POST /predict",
            "predict_ml":       "POST /predict/ml",
            "predict_demo":     "POST /predict/demo",
            "chat_moderate":    "POST /chat/moderate",
            "analyze_file":     "POST /analyze-file",
            "explain":          "POST /explain  [XAI]",
            "monitoring_stats": "GET /monitoring/stats  [Drift]",
            "monitoring_drift": "GET /monitoring/drift  [Drift]",
            "feedback":         "POST /feedback  [Active Learning]",
            "feedback_stats":   "GET /feedback/stats",
            "feedback_queue":   "GET /feedback/queue",
            "stream":           "WS /ws/stream  [Real-time]",
            "auth":             "POST /auth/signup, POST /auth/login",
            "docs":             "/docs",
        },
    }
