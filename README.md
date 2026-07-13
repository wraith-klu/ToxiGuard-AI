<div align="center">

<img src="toxiguard_architecture.png" alt="ToxiGuard AI Architecture" width="800"/>

# 🛡️ ToxiGuard AI v3.0

**Enterprise-grade, real-time AI content moderation for the open web.**

[![Live Frontend](https://img.shields.io/badge/Frontend-toxiai.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://toxiai.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend_API-Render-0ea5e9?style=for-the-badge&logo=render)](https://toxiguard-ai-agent-1.onrender.com/)
[![Swagger Docs](https://img.shields.io/badge/API_Docs-Swagger_UI-22d3ee?style=for-the-badge&logo=swagger)](https://toxiguard-ai-agent-1.onrender.com/docs)
[![License: MIT](https://img.shields.io/badge/License-MIT-a78bfa?style=for-the-badge)](LICENSE)

</div>

---

## 📖 What is ToxiGuard AI?

**ToxiGuard AI v3.0** is a full-stack, production-ready AI safety platform built to protect digital communities from toxic, abusive, and harmful content in real time. It spans three deployment targets:

| Component | What it does |
|-----------|-------------|
| 🌐 **React Web App** | SaaS landing page, user dashboard, live demo, and install flow |
| 🐍 **FastAPI Backend** | REST API powering 3-layer AI moderation, auth, and analytics |
| 🔌 **Chrome Extension** | Client-side shield injected into 8+ social media platforms |

---

## 🧠 3-Layer Hybrid AI Architecture

ToxiGuard never relies on a single model. Every text analysis passes through a **cascaded pipeline** of three distinct layers:

```
User Input
    │
    ▼
┌─────────────────────────────────────────┐
│  Layer 1: Rule Engine  (< 1ms)          │
│  RegEx + Keyword dictionaries           │
│  Catches: slurs, explicit threats       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Layer 2: ML Classifier  (~20ms)        │
│  TF-IDF + Logistic Regression (sklearn) │
│  Optional: ONNX Transformer (DeBERTa)   │
│  Catches: implicit toxicity, obfuscation│
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Layer 3: LLM Reasoning  (~600ms)       │
│  Primary:  Gemma 4 31B (free)           │
│  Fallback: Qwen3 Next 80B (free)        │
│  via OpenRouter API                     │
│  Catches: sarcasm, context, intent      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Ensemble Voting Engine                 │
│  Weighted confidence merge              │
│  → toxic: bool, confidence %, severity  │
└─────────────────────────────────────────┘
```

---

## 🏗️ Full Project Architecture

```text
ToxiGuard-AI/
│
├── backend/                        # Python FastAPI Application
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point, CORS, rate limiter, routes
│   │   ├── core/
│   │   │   └── limiter.py          # SlowAPI rate limiter singleton
│   │   ├── routes/
│   │   │   ├── auth.py             # /auth/signup, /auth/login, /auth/me
│   │   │   ├── moderation.py       # /predict, /predict/ml — main AI endpoints
│   │   │   └── realtime.py         # /chat/moderate — WebSocket/stream endpoint
│   │   ├── services/
│   │   │   └── model_service.py    # Lazy ML model loader & inference service
│   │   └── db/                     # DB session helpers
│   │
│   ├── utils/
│   │   ├── abuse_words.py          # Rule-based keyword dictionary + RegEx engine
│   │   ├── llm_guard.py            # OpenRouter LLM client, caching, fallback logic
│   │   ├── preprocessing.py        # Text normalization, cleaning, tokenization
│   │   └── sentiment.py            # VADER + TextBlob sentiment scoring
│   │
│   ├── ml/
│   │   ├── train_transformer.py    # HuggingFace transformer fine-tuning script
│   │   └── (model artifacts)       # .onnx / .joblib serialized models
│   │
│   ├── database.py                 # SQLAlchemy engine (SQLite ↔ PostgreSQL)
│   ├── models.py                   # User ORM model (email, api_key, plan, usage)
│   ├── auth_utils.py               # JWT creation, API key generation
│   ├── train_model.py              # scikit-learn TF-IDF pipeline training script
│   ├── requirements.txt            # All Python dependencies (pinned versions)
│   └── runtime.txt                 # Python version pin for Render
│
├── frontend/                       # React + Vite Web Application
│   ├── src/
│   │   ├── App.jsx                 # React Router SPA routing
│   │   ├── api.js                  # Axios/fetch API wrapper (auto dev/prod URL)
│   │   ├── styles.css              # Global Design System (CSS variables, tokens)
│   │   ├── components/
│   │   │   ├── LiveDemo.jsx        # Interactive real-time scanner (homepage)
│   │   │   ├── LiveResult.jsx      # Analysis result card + AI loading animation
│   │   │   ├── Header.jsx          # Top nav with auth state
│   │   │   ├── Charts.jsx          # Recharts toxicity visualizations
│   │   │   ├── AbuseTable.jsx      # Sortable/searchable abuse history table
│   │   │   ├── FileUpload.jsx      # Drag-and-drop CSV/text batch analysis
│   │   │   ├── Toast.jsx           # Notification toasts
│   │   │   └── ...                 # KPI cards, word clouds, sentiment viz
│   │   └── pages/
│   │       ├── Home.jsx / Home.css         # Landing page (hero, metrics, arch, CTA)
│   │       ├── Dashboard.jsx               # Authenticated analytics dashboard
│   │       ├── Login.jsx / Signup.jsx      # Auth pages
│   │       └── InstallExtension.jsx/.css   # Extension install flow
│   └── package.json
│
├── extension/                      # Chrome Extension (Manifest V3)
│   ├── manifest.json               # MV3 config: permissions, CSP, service worker
│   ├── background.js               # Service worker: routing, alarms, state broker
│   ├── content.js                  # Injected into pages: feed scanner, FAB, selection
│   ├── content.css                 # Injected styles: blur/highlight modes
│   ├── popup.html / popup.js       # Extension popup dashboard
│   ├── popup.css                   # Premium deep dark popup styles
│   ├── options.html / options.js   # Full analytics options page
│   └── sidepanel.html / .js        # Chrome Side Panel workspace
│
├── system_design.md                # Full system design explanation with diagram
├── interview_prep.md               # Technical interview guide for this project
├── 1-click-install.bat             # Windows 1-click Chrome extension loader
├── toxiguard_architecture.png      # Architecture diagram
└── README.md
```

---

## ⚙️ Technology Stack

### 🌐 Frontend — React + Vite

| Technology | Version | Used For |
|-----------|---------|----------|
| **React** | 18.x | Component-based SPA architecture |
| **Vite** | 5.x | Lightning-fast dev server and production bundler |
| **React Router** | 6.x | Client-side routing (Home, Dashboard, Login, Install) |
| **Vanilla CSS** | — | Custom design system with CSS variables (no Tailwind) |
| **Recharts** | 2.x | Toxicity pie charts, bar charts, and KPI visualizations |
| **Axios / Fetch** | — | API communication with FastAPI backend |
| **Vercel** | — | Production hosting with automatic CI/CD |

### 🐍 Backend — Python FastAPI

| Technology | Used For |
|-----------|----------|
| **FastAPI** | High-performance async REST API framework |
| **Uvicorn** | ASGI server running the FastAPI app |
| **Gunicorn** | Production process manager (used on Render) |
| **SQLAlchemy** | ORM for User model (SQLite in dev, PostgreSQL in prod) |
| **Alembic** | Database schema migrations |
| **Pydantic v2** | Request body validation and response serialization |
| **Passlib + Bcrypt** | Secure password hashing |
| **python-jose** | JWT token generation and verification |
| **SlowAPI** | Per-IP and per-token API rate limiting |
| **python-dotenv** | Environment variable loading from `.env` |
| **Render** | Production cloud hosting with auto-deploy from GitHub |

### 🧠 AI / ML Stack

| Technology | Used For |
|-----------|----------|
| **scikit-learn** | TF-IDF vectorizer + Logistic Regression classifier |
| **joblib** | Serializing and loading the trained `.joblib` ML model |
| **ONNX Runtime** | Fast CPU inference for exported transformer models |
| **HuggingFace Transformers** | DeBERTa/BERT fine-tuning for advanced classifier |
| **NLTK** | Tokenization, stopword removal, stemming |
| **TextBlob** | Polarity and subjectivity sentiment scoring |
| **VaderSentiment** | Rule-based sentiment for short social media text |
| **OpenAI SDK** | Client for OpenRouter API (LLM reasoning layer) |
| **Google Gemma 4 31B** | Primary free LLM (via OpenRouter) |
| **Qwen3 Next 80B Instruct** | Fallback free LLM (via OpenRouter) |

### 🔌 Chrome Extension

| Technology | Used For |
|-----------|----------|
| **Manifest V3** | Modern Chrome extension standard (MV3) |
| **Service Workers** | Event-driven background script (no persistent page) |
| **MutationObserver** | Detect dynamically loaded social media feed posts |
| **chrome.storage.local** | State sync across popup, options, and side panel |
| **chrome.sidePanel API** | Persistent companion workspace panel |
| **chrome.alarms API** | Daily counter resets and periodic health checks |
| **CSS Glassmorphism** | Premium deep dark mode UI (`backdrop-filter: blur`) |

---

## 🚀 Quick Start

### Option 1: Docker (Full Stack)

```bash
# Clone repo
git clone https://github.com/your-username/ToxiGuard-AI.git
cd ToxiGuard-AI

# Start everything
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:80 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

### Option 2: Manual Local Development

#### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=google/gemma-4-31b-it:free
OPENROUTER_FALLBACK_MODEL=qwen/qwen3-next-80b-a3b-instruct:free
DATABASE_URL=sqlite:///./toxiguard.db
JWT_SECRET=your_secure_jwt_secret_here
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

```bash
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_BACKEND_URL=http://127.0.0.1:8000
```

```bash
npm run dev
```

---

### Option 3: 1-Click Extension Installer (Windows)

Simply double-click `1-click-install.bat` in the project root. It will automatically launch Chrome (or Edge) with the ToxiGuard extension pre-loaded from the local `extension/` folder — no manual `chrome://extensions` steps needed.

---

## 🔗 API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/signup` | POST | Create account → returns `api_key` |
| `/auth/login` | POST | Authenticate → returns JWT `token` + `api_key` |
| `/auth/me` | GET | Get current user profile |

### Moderation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/predict` | POST | Full 3-layer analysis (Rule + ML + LLM) |
| `/predict/ml` | POST | ML-only fast analysis (no LLM call) |
| `/chat/moderate` | POST | Batch or real-time chat moderation |
| `/health` | GET | Server health + model status |

### Example Request

```bash
curl -X POST https://toxiguard-ai-agent-1.onrender.com/predict \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "You are an absolute idiot!"}'
```

### Example Response

```json
{
  "toxic": true,
  "confidence": 0.94,
  "severity": "high",
  "source": "llm",
  "category": "abusive",
  "abusive_words": ["idiot"],
  "sentiment": {
    "label": "negative",
    "polarity": -0.8
  },
  "llm": {
    "explanation": "The phrase 'absolute idiot' is a direct personal insult targeting the individual's intelligence, which constitutes harassment and abusive behavior.",
    "detected_phrases": ["absolute idiot"],
    "confidence": 0.94,
    "severity": "high"
  }
}
```

---

## 🔌 Chrome Extension Setup

1. Run `1-click-install.bat` (Windows) **OR** manually:
   - Open `chrome://extensions`
   - Enable **Developer Mode** (top-right toggle)
   - Click **Load Unpacked** → select the `extension/` folder
2. Click the ToxiGuard shield icon in your browser toolbar.
3. Enter your API key from the dashboard.
4. Toggle platforms on/off and choose your shield mode (Highlight / Blur / Remove).

**Supported Platforms:**
Instagram · X/Twitter · YouTube · Reddit · LinkedIn · Facebook · TikTok · Threads · Any Website (text selection tool)

---

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| ML Model Accuracy | ~94% on test set |
| Layer 1 Latency | < 1ms |
| Layer 2 Latency | ~20ms |
| Layer 3 Latency (LLM) | ~600ms |
| Supported Platforms | 8 + global text selection |
| Free LLM Models | 2 (primary + fallback) |
| Max Context Window | 262K tokens |

---

## 🔒 Security Features

- **JWT Authentication** with configurable expiry
- **API Key system** — each user gets a unique key on signup
- **Rate Limiting** — per-IP and per-token using SlowAPI
- **CORS whitelisting** — environment-based origin control
- **Password hashing** — bcrypt with salt rounds
- **No prompt training** — LLM models configured with `No prompt training` policy on OpenRouter

---

## 👨‍💻 Author

**Saurabh Yadav**

## 📜 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.