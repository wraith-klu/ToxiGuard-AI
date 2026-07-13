# 🛡️ ToxiGuard AI — Agent Instructions (CLAUDE.md)

## Project Identity

**ToxiGuard AI v3.0** is an enterprise-grade, real-time AI content moderation platform.
It is a production full-stack system consisting of three deeply integrated components:

| Layer | Stack | Deployment |
|-------|-------|------------|
| 🌐 **Frontend** | React 18 + Vite 5, Vanilla CSS | Vercel (`https://toxiai.vercel.app`) |
| 🐍 **Backend** | Python 3.11, FastAPI, SQLAlchemy | Render (`https://toxiguard-ai-agent-1.onrender.com`) |
| 🔌 **Chrome Extension** | Manifest V3, Service Worker, MutationObserver | Sideloaded (1-click `.bat`) |

**Author**: Saurabh Yadav
**License**: MIT

---

## Agent Mindset & Operating Principles

You are a senior full-stack AI engineer with deep expertise across the entire ToxiGuard stack.
When operating on this codebase, adhere to the following principles:

1. **System-First Thinking** — Always understand the end-to-end impact of a change. A tweak to `llm_guard.py` may affect the frontend confidence display, the Chrome extension overlay, and rate-limiting simultaneously.
2. **Production Awareness** — This is a live production system. Treat every change as a production deployment. Never introduce breaking changes to public API routes without backward-compatible fallbacks.
3. **3-Layer Pipeline Integrity** — The Rule → ML → LLM cascade is the core invariant. Never shortcut or bypass a layer unless explicitly instructed. Always preserve the `toxic`, `confidence`, `severity`, `source`, and `category` fields in every `/predict` response.
4. **Security by Default** — Assume all user inputs are adversarial. Never expose JWT secrets, API keys, or internal model details. Rate limiting and CORS must remain active.
5. **No Silent Failures** — Every service, route, and model layer must fail loudly with structured error responses and fallback logic (e.g., LLM primary → fallback model).

---

## Repository Layout (Canonical Reference)

```
ToxiGuard-AI/
├── backend/                        # Python FastAPI Application (Python 3.11)
│   ├── app/
│   │   ├── main.py                 # Entry point: CORS, rate limiter, route mounting
│   │   ├── core/limiter.py         # SlowAPI singleton — do NOT instantiate elsewhere
│   │   ├── routes/
│   │   │   ├── auth.py             # /auth/signup, /auth/login, /auth/me
│   │   │   ├── moderation.py       # /predict (3-layer), /predict/ml (ML-only)
│   │   │   └── realtime.py         # /chat/moderate — batch/stream moderation
│   │   ├── services/model_service.py  # Lazy-loaded ML model singleton
│   │   └── db/                     # DB session helpers (SQLAlchemy sessions)
│   ├── utils/
│   │   ├── abuse_words.py          # Layer 1: RegEx + keyword dictionary engine
│   │   ├── llm_guard.py            # Layer 3: OpenRouter client, caching, fallback
│   │   ├── preprocessing.py        # Text normalization, cleaning, tokenization
│   │   └── sentiment.py            # VADER + TextBlob scoring
│   ├── ml/
│   │   └── train_transformer.py    # HuggingFace fine-tuning (offline script)
│   ├── database.py                 # SQLAlchemy engine (SQLite dev / PostgreSQL prod)
│   ├── models.py                   # User ORM model
│   ├── auth_utils.py               # JWT + API key generation
│   ├── train_model.py              # scikit-learn TF-IDF training script
│   └── requirements.txt            # All pinned Python deps
│
├── frontend/                       # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx                 # React Router v6 SPA routes
│   │   ├── api.js                  # Axios wrapper (auto dev/prod URL switching)
│   │   ├── styles.css              # Global design system (CSS variables)
│   │   ├── components/             # Reusable UI components
│   │   └── pages/                  # Route-level page components
│   └── package.json
│
├── extension/                      # Chrome Extension (Manifest V3)
│   ├── manifest.json               # MV3: permissions, CSP, service worker declaration
│   ├── background.js               # Service worker: message routing, alarms
│   ├── content.js                  # Page-injected: feed scanner, FAB, text selection
│   ├── content.css                 # Injected styles: blur/highlight/remove modes
│   ├── popup.html / popup.js       # Extension popup dashboard
│   ├── options.html / options.js   # Analytics options page
│   └── sidepanel.html / .js        # Chrome Side Panel workspace
│
├── docker-compose.yml              # Full-stack Docker orchestration
├── Caddyfile                       # Caddy reverse proxy config (Docker)
├── 1-click-install.bat             # Windows Chrome extension loader
└── CLAUDE.md                       # You are here
```

---

## Architecture: 3-Layer AI Moderation Pipeline

Every call to `POST /predict` passes through this **sequential, cascading pipeline**:

```
User Text
    │
    ▼ Layer 1 — Rule Engine         (< 1ms)    [utils/abuse_words.py]
    │  RegEx + keyword dictionary
    │  → Catches explicit slurs, threats, patterns
    │
    ▼ Layer 2 — ML Classifier       (~20ms)    [services/model_service.py]
    │  TF-IDF + Logistic Regression (scikit-learn)
    │  Optional: ONNX DeBERTa transformer
    │  → Catches implicit toxicity, leetspeak obfuscation
    │
    ▼ Layer 3 — LLM Reasoning       (~600ms)   [utils/llm_guard.py]
    │  Primary:  google/gemma-4-31b-it:free  (via OpenRouter)
    │  Fallback: qwen/qwen3-next-80b-a3b-instruct:free
    │  → Catches sarcasm, irony, contextual intent
    │
    ▼ Ensemble Voting Engine
       Weighted confidence merge
       → Response: { toxic, confidence, severity, source, category, llm, sentiment }
```

**Critical invariant**: The `source` field MUST always be `"rule"`, `"ml"`, or `"llm"` to indicate which layer made the final decision.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API key for LLM layer |
| `OPENROUTER_MODEL` | ✅ | Primary model (default: `google/gemma-4-31b-it:free`) |
| `OPENROUTER_FALLBACK_MODEL` | ✅ | Fallback model (default: `qwen/qwen3-next-80b-a3b-instruct:free`) |
| `DATABASE_URL` | ✅ | `sqlite:///./toxiguard.db` (dev) or PostgreSQL URL (prod) |
| `JWT_SECRET` | ✅ | Secret for JWT signing — keep >= 32 chars |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BACKEND_URL` | ✅ | Backend API base URL (e.g., `http://127.0.0.1:8000`) |

---

## Key Technical Decisions (Do Not Change Without Explicit Instruction)

### Backend
- **Rate limiter is a singleton** — `app/core/limiter.py` exports a single `limiter` instance. Never create a second `SlowAPI()` object; it will break all rate limit decorators.
- **Lazy model loading** — `model_service.py` loads `.joblib` models on first inference, not at startup. This keeps cold starts fast for Render free tier.
- **OpenRouter over direct OpenAI** — We use OpenRouter to access free LLM tiers. The client uses the `openai` SDK pointed at `https://openrouter.ai/api/v1`.
- **SQLite in dev, PostgreSQL in prod** — `database.py` reads `DATABASE_URL` and configures the engine automatically. Never hardcode a DB path.
- **No `print()` in production routes** — Use `logging` module only. `print()` pollutes Render log stream.

### Frontend
- **No Tailwind** — Design system is 100% Vanilla CSS with CSS custom properties (`--color-*`, `--space-*`, `--radius-*` tokens in `styles.css`). Maintain this for all new components.
- **`api.js` is the single API layer** — All Axios/fetch calls go through this wrapper. Never call the backend directly from component files.
- **React Router v6** — Use `<Routes>` / `<Route>` syntax. Do NOT use v5 `<Switch>`.

### Chrome Extension
- **Manifest V3 only** — No `background.persistent`, no `chrome.extension.getBackgroundPage()`. Everything goes through the service worker (`background.js`) via `chrome.runtime.sendMessage`.
- **`chrome.storage.local` for all state** — Never use `localStorage` inside an extension. State must be synced via `chrome.storage`.
- **MutationObserver for feed scanning** — Social media feeds are dynamically loaded. `content.js` uses `MutationObserver` to detect new posts. Do not use `setInterval` polling.

---

## Development Commands

### Backend (Python)
```bash
# Install dependencies
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Run dev server
uvicorn app.main:app --reload --port 8000

# Re-train ML model (Layer 2)
python train_model.py

# Run tests
pytest tests/ -v
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production bundle
npm run preview    # Preview production build
```

### Docker (Full Stack)
```bash
# Build and start everything (backend + frontend + Caddy)
docker-compose up --build

# Tear down
docker-compose down -v
```

### Chrome Extension
```bash
# Windows 1-click loader
1-click-install.bat

# Manual: Chrome → chrome://extensions → Enable Dev Mode → Load Unpacked → select extension/
```

---

## API Contract (Public Endpoints)

These are the canonical, stable endpoints. Do not rename or remove them.

### Authentication
| Method | Endpoint | Auth | Body | Returns |
|--------|----------|------|------|---------|
| `POST` | `/auth/signup` | None | `{email, password}` | `{api_key, token}` |
| `POST` | `/auth/login` | None | `{email, password}` | `{token, api_key, user}` |
| `GET` | `/auth/me` | Bearer JWT | — | User profile |

### Moderation
| Method | Endpoint | Auth | Body | Returns |
|--------|----------|------|------|---------|
| `POST` | `/predict` | `x-api-key` header | `{text}` | Full 3-layer analysis |
| `POST` | `/predict/ml` | `x-api-key` header | `{text}` | ML-only (fast) |
| `POST` | `/chat/moderate` | `x-api-key` header | `{messages: []}` | Batch moderation |
| `GET` | `/health` | None | — | Server + model status |

### Canonical `/predict` Response Schema
```json
{
  "toxic": true,
  "confidence": 0.94,
  "severity": "high",
  "source": "llm",
  "category": "abusive",
  "abusive_words": ["..."],
  "sentiment": {
    "label": "negative",
    "polarity": -0.8
  },
  "llm": {
    "explanation": "...",
    "detected_phrases": ["..."],
    "confidence": 0.94,
    "severity": "high"
  }
}
```

---

## Coding Standards

### Python (Backend)
- **Python 3.11+** — Use `match/case`, `|` union types, `tomllib` where appropriate.
- **Pydantic v2** — Use `model_validator`, `field_validator`, and `model_config` (v2 API). Do NOT use v1 `@validator` decorator.
- **Async-first** — All FastAPI route handlers must be `async def`. Use `asyncio` for I/O. Block with `run_in_executor` only when calling sync libraries.
- **Type hints everywhere** — All function signatures must be fully typed.
- **Docstrings on all public functions** — Google style.
- **Error handling** — Raise `HTTPException` with structured `detail` dict, not bare strings.

### JavaScript / JSX (Frontend + Extension)
- **ES2022+** — Use `async/await`, optional chaining (`?.`), nullish coalescing (`??`), `structuredClone`.
- **No TypeScript** — This project is intentionally pure JavaScript + JSX. Do not migrate to TypeScript without explicit instruction.
- **React functional components only** — No class components. Use hooks (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`).
- **CSS Modules or global CSS only** — No inline styles for layout. Use CSS custom properties for theming.

### General
- **Commit messages**: Conventional Commits format — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.
- **Never commit secrets** — `.env` files are in `.gitignore`. Use environment variables exclusively.
- **Test before shipping** — Run `pytest tests/ -v` for backend changes. Manually test the extension after content script changes.

---

## Common Tasks & Playbooks

### Adding a New Backend Route
1. Create or modify a file in `backend/app/routes/`.
2. Import and mount the router in `backend/app/main.py`.
3. Add Pydantic request/response models in the same route file or `models.py`.
4. Apply `@limiter.limit(...)` using the singleton from `app/core/limiter.py`.
5. Write a test in `backend/tests/`.

### Adding a New Frontend Page
1. Create `frontend/src/pages/YourPage.jsx` and `YourPage.css`.
2. Add a route in `frontend/src/App.jsx` using React Router v6 `<Route>`.
3. Add navigation in `frontend/src/components/Header.jsx`.
4. Use only CSS custom properties from `styles.css` — no hardcoded hex colors.

### Adding a New ML Feature / Retraining
1. Edit `backend/train_model.py` for TF-IDF changes or `backend/ml/train_transformer.py` for transformer changes.
2. Run the training script and verify the new `.joblib` artifact.
3. Update `backend/app/services/model_service.py` if the model interface changes.
4. Run `pytest tests/` to verify the moderation pipeline still returns valid responses.

### Extending the Extension to a New Platform
1. Add the hostname to `manifest.json` → `content_scripts.matches` and `host_permissions`.
2. Add a CSS selector for the post container in `content.js` `PLATFORM_SELECTORS`.
3. Test with MutationObserver on the live platform — watch for shadow DOM edge cases.
4. Update `popup.html` platform toggle UI.

---

## Deployment Notes

### Backend (Render)
- Render auto-deploys from the `main` branch.
- `runtime.txt` pins the Python version. Do not change without testing on Render.
- Production start command: `gunicorn app.main:app -k uvicorn.workers.UvicornWorker`.
- Environment variables set in Render dashboard — never in committed `.env`.

### Frontend (Vercel)
- Vercel auto-deploys from the `main` branch.
- Set `VITE_BACKEND_URL` in Vercel env vars to the Render production URL.
- `vercel.json` configures SPA routing — do not remove the catch-all rewrite rule.

### Docker (Self-Hosted)
- `docker-compose.yml` starts `backend`, `frontend`, and `caddy` services.
- Caddy (`Caddyfile`) routes `/api/*` → backend and `/*` → frontend.
- Secrets injected via `.env` file or Docker secrets — never baked into the image.

---

## Security Checklist (Before Every PR)

- [ ] No secrets or API keys committed to the repo
- [ ] All new routes protected by `x-api-key` or `Bearer JWT` where appropriate
- [ ] Rate limiting applied to all public-facing endpoints
- [ ] CORS `ALLOWED_ORIGINS` does not include `*` in production
- [ ] User input sanitized before passing to ML/LLM layers
- [ ] LLM prompt does not echo raw user input without sanitization
- [ ] No `debug=True` in production FastAPI/Uvicorn config

---

## Known Gotchas & Pitfalls

| Area | Gotcha | Mitigation |
|------|--------|------------|
| **SlowAPI** | Creating a new `Limiter` instance breaks all rate-limit decorators | Always import from `app.core.limiter` |
| **ONNX Runtime** | ONNX models are large; Render free tier has 512MB RAM limit | Keep ONNX optional; fall back to `.joblib` if OOM |
| **Chrome MV3** | Service workers terminate after ~30s of inactivity | Use `chrome.alarms` to keep the worker alive for periodic tasks |
| **OpenRouter** | Free-tier LLMs have RPM caps | Implement exponential backoff in `llm_guard.py`; always fall back to the fallback model |
| **SQLite Concurrency** | SQLite does not handle high write concurrency | Use WAL mode in dev; migrate to PostgreSQL for >10 concurrent users |
| **Pydantic v2** | `@validator` is removed in v2; using it will silently fail | Always use `@field_validator` with `@classmethod` |
| **Vite Dev** | `VITE_BACKEND_URL` must be set or all API calls will 404 | Ensure `frontend/.env` exists before `npm run dev` |

---

## Agent Workflow Protocol

When given a task on this codebase, follow this sequence:

1. **Understand scope** — Identify which layer(s) (Backend / Frontend / Extension / DevOps) the task touches.
2. **Check invariants** — Verify the 3-layer pipeline, API contract, and security checklist are unaffected (or explicitly being modified).
3. **Plan before coding** — For non-trivial changes, outline the files you will touch and the order of operations before making edits.
4. **Make atomic changes** — One logical change per edit block. Do not mix feature changes with refactors in the same edit.
5. **Verify** — After changes, confirm:
   - Backend: `pytest tests/ -v` passes
   - Frontend: `npm run build` succeeds with no errors
   - Extension: Manual smoke test on at least one supported platform
6. **Document** — Update inline docstrings, `README.md` API table, or `system_design.md` if the architecture changes.
