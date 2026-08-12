"""
ToxiGuard AI — Dynamic Rule Overrides Service
===============================================
Enables instant hot-patching and updates from active learning feedback.

How it works:
  - Whitelist (Allowlist): If a user flags a False Positive, we add the normalized text to the allowlist.
    Next time this exact phrase is checked, it bypasses DeBERTa/LLM and is instantly marked safe.
  - Blacklist (Blocklist): If a user flags a False Negative, we add the normalized text to the blocklist.
    Next time, it's instantly marked toxic.
  - Both allowlist/blocklist are persisted in `data/overrides.json`.
"""

from __future__ import annotations

import os
import json
import threading
from typing import Optional

from app.core.logger import logger
from utils.preprocessing import preprocess_for_rules

_OVERRIDES_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data", "overrides.json"
)


class DynamicOverrideService:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.allowlist: set[str] = set()  # Set of normalized texts
        self.blocklist: set[str] = set()  # Set of normalized texts
        self._load()

    def _load(self) -> None:
        try:
            if os.path.exists(_OVERRIDES_FILE):
                with open(_OVERRIDES_FILE, "r") as f:
                    data = json.load(f)
                self.allowlist = set(data.get("allowlist", []))
                self.blocklist = set(data.get("blocklist", []))
                logger.info(
                    f"[Overrides] Loaded {len(self.allowlist)} allowed and "
                    f"{len(self.blocklist)} blocked phrases."
                )
        except Exception as exc:
            logger.warning(f"[Overrides] Could not load overrides: {exc}")

    def _save(self) -> None:
        try:
            os.makedirs(os.path.dirname(_OVERRIDES_FILE), exist_ok=True)
            with open(_OVERRIDES_FILE, "w") as f:
                json.dump({
                    "allowlist": list(self.allowlist),
                    "blocklist": list(self.blocklist),
                }, f, indent=2)
        except Exception as exc:
            logger.warning(f"[Overrides] Could not save overrides: {exc}")

    def add_override(self, feedback_type: str, text: str) -> None:
        """Add phrase to blocklist or allowlist depending on feedback type."""
        normalized = preprocess_for_rules(text)
        if not normalized:
            return

        with self._lock:
            if feedback_type == "false_positive":
                # User says safe -> remove from blocklist, add to allowlist
                self.blocklist.discard(normalized)
                self.allowlist.add(normalized)
                logger.info(f"[Overrides] Added to allowlist: '{normalized}'")
            elif feedback_type == "false_negative":
                # User says toxic -> remove from allowlist, add to blocklist
                self.allowlist.discard(normalized)
                self.blocklist.add(normalized)
                logger.info(f"[Overrides] Added to blocklist: '{normalized}'")
            self._save()

    def check_override(self, text: str) -> Optional[bool]:
        """
        Check if text has an active override.
        Returns True (block), False (allow), or None (no override).
        """
        normalized = preprocess_for_rules(text)
        if not normalized:
            return None

        with self._lock:
            if normalized in self.allowlist:
                return False
            if normalized in self.blocklist:
                return True
        return None


# Module-level singleton
override_service = DynamicOverrideService()
