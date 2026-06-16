"""
ToxiGuard AI — Centralised Configuration
==========================================
All environment variables and runtime constants are declared here.
Import `settings` anywhere — never read os.environ directly in app code.
"""

import os
from functools import lru_cache
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=("settings_",),  # Avoid conflict with model_dir field
    )

    # ── LLM ─────────────────────────────────────────────────────────
    openrouter_api_key: str = ""
    openrouter_model: str = "liquid/lfm-2.5-1.2b-thinking:free"
    openrouter_fallback_model: str = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
    llm_timeout: float = 20.0
    llm_cache_size: int = 128
    llm_temperature: float = 0.4
    llm_max_tokens: int = 2048

    # ── DATABASE ─────────────────────────────────────────────────────
    database_url: str = "sqlite:///./toxiguard.db"

    # ── AUTH ─────────────────────────────────────────────────────────
    secret_key: str = "toxiguard-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    allowed_origins: str = (
        "https://toxiai.vercel.app,https://toxiai-agent.vercel.app,http://localhost:5173,http://127.0.0.1:5173"
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    # ── MODEL ─────────────────────────────────────────────────────────
    model_dir: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "ml", "models", "toxiguard-deberta"
    )
    max_seq_length: int = 256

    # ── ENSEMBLE THRESHOLDS ───────────────────────────────────────────
    # DeBERTa is primary (50%), LLM is context layer (35%), Rules are fast-path (15%)
    ensemble_threshold: float = 0.45
    ml_trigger_threshold: float = 0.35   # Call LLM if ML >= this
    demo_ml_threshold: float = 0.45

    # Severity bands
    severity_high: float = 0.85
    severity_medium: float = 0.60

    # ── PLAN LIMITS ───────────────────────────────────────────────────
    plan_limit_free: int = 1_000
    plan_limit_pro: int = 50_000

    # ── APP META ─────────────────────────────────────────────────────
    app_version: str = "2.0.0"
    app_title: str = "ToxiGuard AI"
    app_description: str = (
        "Hybrid toxic content detection API combining rule-based filtering, "
        "DeBERTa transformer (ONNX-optimised), and LLM-powered contextual analysis. "
        "Built for real-time content moderation at scale."
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


# Module-level singleton
settings = get_settings()
