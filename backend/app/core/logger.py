"""
ToxiGuard AI — Structured Logger
==================================
Loguru-based logger with ISO timestamps and severity colours.
Import `logger` everywhere — never use bare print() in app code.
"""

import sys
from loguru import logger

# Remove default handler and replace with a clean, structured format
logger.remove()

logger.add(
    sys.stderr,
    level="INFO",
    format=(
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    ),
    colorize=True,
)

# Optional: file sink for persistent logs
# logger.add("logs/toxiguard.log", rotation="10 MB", retention="7 days", level="DEBUG")

__all__ = ["logger"]