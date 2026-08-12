<div align="center">

<img src="toxiguard_architecture.png" alt="ToxiGuard AI Architecture" width="850"/>

# 🛡️ ToxiGuard AI `v4.0.0`

**Enterprise-Grade, Autonomous AI Content Safety, Threat Detection & Real-Time Moderation Platform**

[![Live Web Application](https://img.shields.io/badge/Frontend-toxiai.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://toxiai.vercel.app)
[![FastAPI Backend](https://img.shields.io/badge/Backend_API-Render-0ea5e9?style=for-the-badge&logo=render)](https://toxiguard-ai-agent-1.onrender.com/)
[![Swagger API Docs](https://img.shields.io/badge/API_Docs-Swagger_UI-22d3ee?style=for-the-badge&logo=swagger)](https://toxiguard-ai-agent-1.onrender.com/docs)
[![Chrome Extension MV3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=for-the-badge&logo=googlechrome)](extension/)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![React 18](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-a78bfa?style=for-the-badge)](LICENSE)


### *Real-Time Content Shielding • 3-Layer Hybrid AI Architecture • Token Heatmap Explainability (XAI) • Continuous Drift Monitoring • Universal Chrome Extension*

</div>


## 📌 Table of Contents

- [📖 Executive Summary \& Problem Statement](#-executive-summary--problem-statement)
- [🎯 Core Philosophy \& Architectural Principles](#-core-philosophy--architectural-principles)
- [🧠 3-Layer Cascaded Hybrid AI Pipeline](#-3-layer-cascaded-hybrid-ai-pipeline)
- [💡 Deep-Dive Platform Features](#-deep-dive-platform-features)
  - [1. 3-Layer Hybrid Moderation Engine](#1-3-layer-hybrid-moderation-engine)
  - [2. Explainable AI (XAI) \& Token Impact Heatmaps](#2-explainable-ai-xai--token-impact-heatmaps)
  - [3. High-Throughput Real-Time Stream Moderation](#3-high-throughput-real-time-stream-moderation)
  - [4. Automated Feedback Loop \& Concept Drift Monitoring](#4-automated-feedback-loop--concept-drift-monitoring)
  - [5. Universal Chrome Extension (Manifest V3)](#5-universal-chrome-extension-manifest-v3)
  - [6. React SaaS Analytics Dashboard](#6-react-saas-analytics-dashboard)
- [⚙️ Technology Stack \& "Why We Chose It"](#️-technology-stack--why-we-chose-it)
  - [🐍 Backend Stack](#-backend-stack)
  - [🌐 Frontend Stack](#-frontend-stack)
  - [🧠 AI / ML Stack](#-ai--ml-stack)
  - [🔌 Chrome Extension Stack](#-chrome-extension-stack)
- [🔄 End-to-End Execution Workflow \& Data Lifecycle](#-end-to-end-execution-workflow--data-lifecycle)
- [🏗️ Complete Project Directory Structure](#️-complete-project-directory-structure)
- [🔗 Comprehensive API Reference](#-comprehensive-api-reference)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Moderation \& Analysis Endpoints](#moderation--analysis-endpoints)
  - [Explainability, Stream \& Monitoring Endpoints](#explainability-stream--monitoring-endpoints)
- [🚀 Quick Start \& Local Setup Guide](#-quick-start--local-setup-guide)
  - [Option 1: Docker (Full Stack)](#option-1-docker-full-stack)
  - [Option 2: Local Backend Setup](#option-2-local-backend-setup)
  - [Option 3: Local Frontend Setup](#option-3-local-frontend-setup)
  - [Option 4: Chrome Extension Load](#option-4-chrome-extension-load)
- [🔒 Security, Rate Limiting \& Compliance](#-security-rate-limiting--compliance)
- [✅ Final System Verification \& Audit Checklist](#-final-system-verification--audit-checklist)
- [👨‍💻 Author \& License](#-author--license)


## 📖 Executive Summary & Problem Statement

Modern digital communications on social media platforms, live streams, comments sections, and enterprise communication channels generate **billions of user posts every single day**. However, online toxicity, hate speech, cyberbullying, harassment, and severe abusive threats pose a constant danger to user mental health, brand equity, and platform compliance.

Traditional moderation approaches fail at scale:
* ❌ **Rule-Based Filters & Dictionaries** are blazingly fast but naive—failing on obfuscated words (e.g. `k!ll`, `sh!t`), sarcasm, context-dependent phrasing, or evolving internet slang.
* ❌ **Standalone Heavy LLMs (GPT-4 / Claude)** provide deep contextual reasoning but are far too slow (~1–3 seconds per request) and prohibitively expensive ($0.01+ per call) to run on every single comment in a high-volume social feed.
* ❌ **Black-Box ML Classifiers** provide fast probability scores, but fail to provide *explainability* (why a post was flagged) or adapt when language patterns shift over time (model drift).

### The Solution: ToxiGuard AI v4.0

**ToxiGuard AI** solves this trilemma with an **Enterprise-Grade Cascaded Architecture**. It merges **sub-millisecond Regex rule processing**, **20ms ML feature classification**, and **sub-second Large Language Model (LLM) contextual reasoning** into a single self-calibrating pipeline. Paired with a client-side **Chrome Extension**, a real-time **React SaaS Dashboard**, and **Explainable AI (XAI)** token heatmaps, ToxiGuard provides instant safety without compromising performance or privacy.


## 🎯 Core Philosophy & Architectural Principles

ToxiGuard AI is built around 5 fundamental design pillars:

1. **Defence-in-Depth (Cascaded Fallback)**: Never rely on a single model. If a text string is an obvious slur, resolve it in **<1ms** via Layer 1. If it requires classification, evaluate via Layer 2 in **~20ms**. Reserve deep LLM inference (Layer 3) only for complex or low-confidence edge cases.
2. **Sub-Second Real-Time Performance**: High throughput is non-negotiable. Live stream chat buffers and social media scroll hooks require instant response times to prevent abusive text from ever rendering on screen.
3. **Explainability First (XAI)**: Machine learning models should not be opaque black boxes. ToxiGuard extracts and visualizes exact token impact weights (SHAP/LIME attribution) so moderators and users understand precisely *which words* triggered a flag.
4. **Self-Correcting & Drift-Resilient**: Modern internet speech evolves rapidly. ToxiGuard includes continuous model drift tracking, confidence calibration, automated user feedback collection, and auto-retraining loops.
5. **Universal Client-Side Enforcement**: Protect users anywhere on the open web through a Manifest V3 extension featuring feed mutation observers, shadow DOM injection, floating context selection buttons, and side-panel companion controls.


## 🧠 3-Layer Cascaded Hybrid AI Pipeline

The backbone of ToxiGuard AI is its 3-layer cascaded decision matrix. Text enters at the top and cascades downwards; early exit pathways ensure maximum throughput and minimum compute expenditure.

```
                      ┌─────────────────────────────────────────┐
                      │            Incoming Raw Text            │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │  Preprocessing & Sanitization Engine    │
                      │  • Lowercasing & Accents Normalization  │
                      │  • Leetspeak Regex Transformation      │
                      │  • Tokenization & Stopword Filtering    │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: Rule Engine & Keyword Dictionary (< 1ms Latency)                            │
│ • Fast Regex dictionary lookup for explicit slurs, severe threats, & illegal content │
│ • High-precision hard matching                                                      │
└──────────────────────────────────────────┬──────────────────────────────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        │  Matched Explicit Violation?        │
                        └─────────┬───────────────────┬───────┘
                                  │ YES               │ NO
                                  ▼                   ▼
                     [ Return Layer 1 Result ]    ┌──────────────────────────────────────────┐
                                                  │ LAYER 2: Machine Learning Classifier    │
                                                  │ (~20ms Latency)                          │
                                                  │ • TF-IDF + Logistic Regression           │
                                                  │ • Optional: ONNX DeBERTa Transformer     │
                                                  │ • Calculates toxicity probability p      │
                                                  └────────────────────┬─────────────────────┘
                                                                       │
                                              ┌────────────────────────┴─────────────────────┐
                                              │ Is Confidence High? (p > 0.85 or p < 0.15)   │
                                              └──────────┬───────────────────────────┬───────┘
                                                         │ YES                       │ NO (Borderline / Ambiguous)
                                                         ▼                           ▼
                                            [ Return Layer 2 Result ]   ┌──────────────────────────────────────────┐
                                                                        │ LAYER 3: Deep LLM Reasoning Engine       │
                                                                        │ (~600ms Latency)                         │
                                                                        │ • Primary:  Google Gemma 4 31B           │
                                                                        │ • Fallback: Qwen3 Next 80B Instruct      │
                                                                        │ • Evaluates sarcasm, intent, & context   │
                                                                        │ • Generates XAI natural language summary │
                                                                        └────────────────────┬─────────────────────┘
                                                                                             │
                                                                                             ▼
                                                                                ┌──────────────────────────┐
                                                                                │ Ensemble Voting Engine   │
                                                                                │ Merges Layer 1, 2, & 3   │
                                                                                │ Weights & Confidence     │
                                                                                └────────────┬─────────────┘
                                                                                             │
                                                                                             ▼
                                                                                [ Final JSON Response ]
```


## 💡 Deep-Dive Platform Features

### 1. 3-Layer Hybrid Moderation Engine
* **Layer 1 (Rule Engine)**: Built in `backend/utils/abuse_words.py`. Features regex string normalizers, leetspeak decoding (`a` $\rightarrow$ `@`, `i` $\rightarrow$ `!`, `e` $\rightarrow$ `3`), and dictionary lookup. Evaluates in **< 1ms**.
* **Layer 2 (Machine Learning Model)**: Implemented in `backend/app/services/model_service.py` & `backend/ml/inference.py`. Uses trained scikit-learn TF-IDF pipelines with calibrated Logistic Regression or ONNX Runtime DeBERTa models for sub-20ms probabilistic scoring.
* **Layer 3 (Large Language Model & OpenRouter API)**: Managed in `backend/utils/llm_guard.py`. Connects via OpenRouter to **Google Gemma 4 31B** (Primary) with automatic zero-downtime fallback to **Qwen3 Next 80B Instruct**. Resolves sarcasm, implicit micro-aggressions, and complex cultural slang, returning a structured JSON explanation.

### 2. Explainable AI (XAI) & Token Impact Heatmaps
* **Backend Endpoint**: `/explain` powered by `backend/ml/explainability.py`.
* **Frontend Component**: `TokenHeatmap.jsx`.
* **How it Works**: Calculates gradient feature attribution (SHAP/LIME approximation) for each individual word in the input text. Generates normalized weights from `-1.0` (strongly safe/positive) to `+1.0` (strongly toxic/abusive).
* **UI Visualization**: Renders interactive inline text heatmaps where toxic words highlight in vivid crimson red and safe context words highlight in emerald green, displaying exact percentage influence on hover.

### 3. High-Throughput Real-Time Stream Moderation
* **Backend Endpoint**: `/stream` powered by `backend/app/routes/stream.py`.
* **Frontend Component**: `StreamAnalyzer.jsx`.
* **How it Works**: Designed for Twitch, YouTube Live, Discord, and internal chat feeds. Processes multi-message arrays or live WebSocket payloads in parallel. Returns throughput stats (messages/second), average latency, overall channel toxicity sentiment, and flagged comment indices.

### 4. Automated Feedback Loop & Concept Drift Monitoring
* **Backend Endpoint**: `/feedback`, `/monitoring` powered by `backend/app/services/drift_monitor.py` & `calibration.py`.
* **Frontend Component**: `FeedbackWidget.jsx` & `MonitoringDashboard.jsx`.
* **How it Works**:
  1. Users can report false positives or missed toxic comments directly from the dashboard or extension.
  2. Reports update the SQLite/PostgreSQL feedback table and trigger continuous concept drift calculations (tracking changes in prediction distribution over time).
  3. When drift metrics exceed preset thresholds, `backend/app/services/retrainer.py` triggers an automated retraining job to update the ML model weights.

### 5. Universal Chrome Extension (Manifest V3)
* **Directory**: `extension/`.
* **Features**:
  * **MutationObserver Feed Scanner**: Watches DOM additions on Instagram, X/Twitter, YouTube, Reddit, LinkedIn, Facebook, TikTok, Threads, and custom platforms.
  * **Text Selection Floating Action Shield (FAB)**: Highlight any text on *any website* to spawn an inline ToxiGuard shield icon for instant analysis.
  * **Side Panel Companion App**: Uses `chrome.sidePanel` API to provide persistent workspace analytics, manual query tester, and live feed logs.
  * **Configurable Shield Modes**: Choose between **Highlight** (crimson border), **Blur** (CSS backdrop blur), or **Remove** (hides toxic DOM element completely).

### 6. React SaaS Analytics Dashboard
* **Directory**: `frontend/src/`.
* **Features**:
  * **Interactive Live Demo**: Instant real-time text analysis with animated step-by-step layer progress indicator.
  * **Analytics Dashboard**: Recharts-driven graphs showing toxicity trends, severity distributions, and word frequency clouds.
  * **CSV/Text Batch File Uploader**: Drag-and-drop file processing for bulk dataset content moderation.
  * **Auth & API Key Management**: User signup/login issuing JWT tokens and persistent API keys for custom developer integrations.


## ⚙️ Technology Stack & "Why We Chose It"

### 🐍 Backend Stack

| Technology | Used For | Why We Chose It |
| :--- | :--- | :--- |
| **FastAPI (Python 3.10+)** | Primary REST API Framework | Native async support (`async/await`), automatic OpenAPI/Swagger documentation generation, Pydantic v2 data validation, and superior performance compared to Flask/Django. |
| **Uvicorn / Gunicorn** | ASGI Server | Enterprise-grade asynchronous concurrency capable of handling thousands of requests/sec. |
| **SQLAlchemy** | Database ORM | Flexible abstraction supporting SQLite for local rapid dev and PostgreSQL for production deployments. |
| **Pydantic v2** | Data Serialization & Validation | Blazing fast Rust-backed validation ensuring strict schema enforcement across all endpoints. |
| **SlowAPI** | Rate Limiting | Protects API endpoints against DDoS attacks and brute-force key exploitation (per-IP & per-token limits). |

### 🌐 Frontend Stack

| Technology | Used For | Why We Chose It |
| :--- | :--- | :--- |
| **React 18** | UI Library | Component-based SPA architecture with fast virtual DOM reconciliation for smooth live updates. |
| **Vite 5** | Build Tool & Dev Server | Sub-second Instant Hot Module Replacement (HMR) and optimized esbuild bundle compilation. |
| **Vanilla CSS (Design Tokens)** | Styling & Animations | Built with custom CSS variables, glassmorphism (`backdrop-filter`), and zero reliance on heavy frameworks like Tailwind, ensuring 100% control over design and lightning-fast load times. |
| **Recharts** | Data Visualization | Modular SVG-based chart library providing responsive, animated charts for analytics. |

### 🧠 AI / ML Stack

| Technology | Used For | Why We Chose It |
| :--- | :--- | :--- |
| **scikit-learn** | ML Classification Pipeline | TF-IDF vectorization paired with Logistic Regression provides ultra-fast inference (~20ms) with lightweight memory overhead. |
| **ONNX Runtime** | Deep Learning Inference | Converts heavy HuggingFace Transformers (DeBERTa) into highly optimized cross-platform CPU execution binaries. |
| **OpenRouter API** | LLM Gateway | Provides seamless access to top-tier open models (**Gemma 4 31B** & **Qwen3 80B**) with automated zero-downtime fallback mechanisms. |
| **NLTK / TextBlob / VADER** | Text Processing & Sentiment | Fast rule-based sentiment scoring complementing ML probabilistic predictions. |

### 🔌 Chrome Extension Stack

| Technology | Used For | Why We Chose It |
| :--- | :--- | :--- |
| **Manifest V3** | Extension Standard | Modern Chrome security compliance utilizing event-driven Service Workers. |
| **MutationObserver API** | DOM Monitoring | Asynchronously detects new social media feed posts without polling or degrading browser FPS. |
| **Chrome SidePanel API** | Side Panel UI | Provides a clean, persistent side panel workspace within the user's browser workflow. |


## 🔄 End-to-End Execution Workflow & Data Lifecycle

To understand how a single piece of text moves through the ToxiGuard AI system, follow this sequence:

```text
[ User Action ]
  • Option A: Extension detects new post on Instagram feed via MutationObserver.
  • Option B: User types text into React Live Demo or calls /predict API endpoint.
         │
         ▼
[ Step 1: Preprocessing & Normalization ]
  • Raw text is lowercased, stripped of invisible control bytes, and normalized.
  • Leetspeak substitutions are resolved (e.g., "b!tch" -> "bitch").
         │
         ▼
[ Step 2: Layer 1 Rule Engine (< 1ms) ]
  • Regex dictionaries check for hardcoded explicit slurs or violence threats.
  • IF MATCHED: Instantly tag toxic=True, confidence=1.0, source="rule_engine" -> RETURN.
         │
         ▼
[ Step 3: Layer 2 Machine Learning Classifier (~20ms) ]
  • Text is vectorized via TF-IDF matrix.
  • Logistic Regression model computes toxicity probability score `p`.
  • IF confidence is decisive (p > 0.85 OR p < 0.15): Tag toxic=(p>0.5), source="ml_classifier" -> RETURN.
         │
         ▼
[ Step 4: Layer 3 LLM Reasoning (~600ms) ]
  • IF text is ambiguous (0.15 <= p <= 0.85): Forward payload to OpenRouter API (Gemma 4 31B).
  • If Gemma times out or fails: Instantly fallback to Qwen3 Next 80B Instruct.
  • LLM evaluates subtle context, sarcasm, and generates natural language explanation.
         │
         ▼
[ Step 5: Ensemble Merge & Explainability (XAI) ]
  • Merge layer predictions into weighted confidence score.
  • Compute SHAP/LIME token attribution weights for token heatmap generation.
         │
         ▼
[ Step 6: Response & Enforcement ]
  • API returns JSON payload to client.
  • Chrome Extension applies chosen shield action (Blur, Highlight, or Remove DOM element).
  • React Dashboard logs analytics entry in SQLite/PostgreSQL database.
```


## 🏗️ Complete Project Directory Structure

```text
ToxiGuard-AI/
├── backend/                        # Python FastAPI Backend Application
│   ├── app/
│   │   ├── main.py                 # FastAPI initialization, CORS, rate limiter, route mounting
│   │   ├── core/
│   │   │   └── limiter.py          # SlowAPI rate limiter singleton instance
│   │   ├── routes/
│   │   │   ├── auth.py             # Auth endpoints (/auth/signup, /auth/login, /auth/me)
│   │   │   ├── moderation.py       # Main AI endpoints (/predict, /predict/ml)
│   │   │   ├── realtime.py         # WebSocket / chat moderation endpoints (/chat/moderate)
│   │   │   ├── explain.py          # XAI token heatmap endpoint (/explain)
│   │   │   ├── stream.py           # High-throughput stream analysis endpoint (/stream)
│   │   │   ├── feedback.py         # False positive/negative reporting endpoint (/feedback)
│   │   │   └── monitoring.py       # Drift monitoring & system metrics (/monitoring)
│   │   ├── services/
│   │   │   ├── model_service.py    # Lazy ML model loader & prediction runner
│   │   │   ├── drift_monitor.py    # Concept drift evaluation algorithm
│   │   │   ├── calibration.py      # Model confidence calibration service
│   │   │   ├── retrainer.py        # Automated ML background retraining runner
│   │   │   └── overrides.py        # Manual override rules service
│   │   └── db/                     # DB session helpers & engine connections
│   │
│   ├── ml/                         # Machine Learning Modules & Training
│   │   ├── explainability.py       # SHAP/LIME token impact attribution generator
│   │   ├── inference.py            # Optimized ML model inference pipeline
│   │   ├── train_transformer.py    # HuggingFace Transformer fine-tuning script
│   │   └── models/                 # Model output directory (.joblib / .onnx artifacts)
│   │
│   ├── utils/
│   │   ├── abuse_words.py          # Rule-based keyword dictionary + RegEx engine
│   │   ├── llm_guard.py            # OpenRouter LLM client, caching, fallback logic
│   │   ├── preprocessing.py        # Text cleaning, normalization, tokenization
│   │   └── sentiment.py            # VADER + TextBlob sentiment scoring helpers
│   │
│   ├── database.py                 # SQLAlchemy DB configuration (SQLite / PostgreSQL)
│   ├── models.py                   # User & Feedback ORM models
│   ├── auth_utils.py               # JWT generation & API key utilities
│   ├── train_model.py              # scikit-learn TF-IDF training script
│   ├── Dockerfile                  # Container build config for backend
│   ├── requirements.txt            # Main Python dependencies
│   ├── requirements-prod.txt       # Production pinned Python dependencies
│   └── runtime.txt                 # Python version specification for Render hosting
│
├── frontend/                       # React + Vite Web Application
│   ├── src/
│   │   ├── App.jsx                 # React SPA Router & route definitions
│   │   ├── main.jsx                # React root mounting entry point
│   │   ├── api.js                  # Axios client wrapper with automatic environment switching
│   │   ├── styles.css              # Global Vanilla CSS design system (tokens & utilities)
│   │   ├── components/
│   │   │   ├── LiveDemo.jsx        # Interactive real-time scanner on homepage
│   │   │   ├── LiveResult.jsx      # Detailed analysis result card & score badges
│   │   │   ├── Header.jsx          # Navigation header with auth controls
│   │   │   ├── Charts.jsx          # Recharts visualizations (toxicity pie & bar charts)
│   │   │   ├── AbuseTable.jsx      # Sortable/searchable historical moderation logs table
│   │   │   ├── FileUpload.jsx      # Drag-and-drop CSV batch dataset analyzer
│   │   │   ├── TokenHeatmap.jsx    # Interactive XAI token feature attribution heatmap
│   │   │   ├── StreamAnalyzer.jsx  # High-volume streaming chat feed simulator
│   │   │   ├── FeedbackWidget.jsx  # User feedback submission component
│   │   │   ├── MonitoringDashboard.jsx # Model drift & health metrics widget
│   │   │   ├── ErrorBoundary.jsx   # React crash prevention boundary
│   │   │   └── Toast.jsx           # Global UI toast notifications
│   │   └── pages/
│   │       ├── Home.jsx / Home.css         # Hero landing page
│   │       ├── Dashboard.jsx               # Authenticated analytics workspace
│   │       ├── Login.jsx / Signup.jsx      # Authentication pages
│   │       └── InstallExtension.jsx/.css   # Chrome Extension installation guide
│   ├── package.json                # Frontend npm dependencies
│   └── vite.config.js              # Vite server & bundler configuration
│
├── extension/                      # Chrome Extension (Manifest V3)
│   ├── manifest.json               # MV3 configuration, host permissions, background scripts
│   ├── background.js               # Service Worker: background listener, alarms, sync
│   ├── content.js                  # Injected script: feed observer, selection FAB shield
│   ├── content.css                 # Injected styles: blur, highlight, and tooltip overlays
│   ├── popup.html / popup.js       # Extension toolbar popup dashboard
│   ├── popup.css                   # Deep dark glassmorphism popup UI
│   ├── options.html / options.js   # Extension settings & full analytics workspace
│   └── sidepanel.html / .js        # Chrome Side Panel companion app
│
├── docker-compose.yml              # Multi-container orchestration (Backend + Frontend)
├── system_design.md                # System design document & architecture breakdown
├── interview_prep.md               # Technical interview preparation guide
├── claim_justifications.md         # Production benchmark claim justifications
├── 1-click-install.bat             # Automated 1-click Chrome Extension launcher for Windows
├── toxiguard_architecture.png      # Full platform architecture diagram image
└── README.md                       # Comprehensive project documentation
```


## 🔗 Comprehensive API Reference

### Authentication Endpoints

#### 1. User Signup — `POST /auth/signup`
Creates a new account and returns a unique developer API key.

```bash
curl -X POST https://toxiguard-ai-agent-1.onrender.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "developer@company.com", "password": "SecurePassword123!"}'
```

#### 2. User Login — `POST /auth/login`
Authenticates credentials and returns a JWT token along with the user's API key.

```bash
curl -X POST https://toxiguard-ai-agent-1.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "developer@company.com", "password": "SecurePassword123!"}'
```


### Moderation & Analysis Endpoints

#### 1. Full 3-Layer Moderation — `POST /predict`
Executes complete cascaded analysis (Rule Engine $\rightarrow$ ML Classifier $\rightarrow$ LLM Reasoner).

```bash
curl -X POST https://toxiguard-ai-agent-1.onrender.com/predict \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "You are an absolute idiot and should quit!"}'
```

**Example Response**:
```json
{
  "toxic": true,
  "confidence": 0.95,
  "severity": "high",
  "source": "llm",
  "category": "harassment",
  "abusive_words": ["idiot"],
  "sentiment": {
    "label": "negative",
    "polarity": -0.85
  },
  "llm": {
    "explanation": "Direct personal attack disparaging the recipient's intelligence.",
    "detected_phrases": ["absolute idiot"],
    "confidence": 0.95,
    "severity": "high"
  }
}
```

#### 2. Fast ML-Only Moderation — `POST /predict/ml`
Runs fast Rule + ML classification only (**~20ms response time**, bypasses LLM call).

```bash
curl -X POST https://toxiguard-ai-agent-1.onrender.com/predict/ml \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Have a great day everyone!"}'
```


### Explainability, Stream & Monitoring Endpoints

#### 1. Token Feature Attribution — `POST /explain`
Returns word-level impact weights for interactive token heatmaps.

```bash
curl -X POST https://toxiguard-ai-agent-1.onrender.com/explain \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "This movie was terribly bad and stupid."}'
```

**Example Response**:
```json
{
  "text": "This movie was terribly bad and stupid.",
  "tokens": [
    {"word": "This", "weight": -0.02},
    {"word": "movie", "weight": 0.01},
    {"word": "was", "weight": -0.01},
    {"word": "terribly", "weight": 0.62},
    {"word": "bad", "weight": 0.74},
    {"word": "and", "weight": 0.00},
    {"word": "stupid", "weight": 0.89}
  ]
}
```

#### 2. Real-Time Stream Processing — `POST /stream`
Processes arrays of messages for high-throughput live streams.

```bash
curl -X POST https://toxiguard-ai-agent-1.onrender.com/stream \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"id": "1", "user": "alice", "text": "Hello world!"},
      {"id": "2", "user": "bob", "text": "Shut up u loser!"}
    ]
  }'
```


## 🚀 Quick Start & Local Setup Guide

### Option 1: Docker (Full Stack)

Ensure Docker and Docker Compose are installed on your system.

```bash
# 1. Clone the repository
git clone https://github.com/wraith-klu/toxiguard-ai.git
cd toxiguard-ai

# 2. Build and start all containers
docker-compose up --build
```

| Service | Local URL |
| :--- | :--- |
| **Frontend Web App** | `http://localhost:80` |
| **FastAPI Backend API** | `http://localhost:8000` |
| **Interactive Swagger Docs** | `http://localhost:8000/docs` |


### Option 2: Local Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate environment
# On Windows:
venv\Scripts\activate
# On macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=google/gemma-4-31b-it:free
OPENROUTER_FALLBACK_MODEL=qwen/qwen3-next-80b-a3b-instruct:free
DATABASE_URL=sqlite:///./toxiguard.db
JWT_SECRET=your_secure_jwt_secret_key_here
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Train ML model & run backend server:
```bash
# Train local TF-IDF model weights
python train_model.py

# Start uvicorn server
uvicorn app.main:app --reload --port 8000
```


### Option 3: Local Frontend Setup

```bash
cd frontend

# Install node packages
npm install
```

Create a `.env` file inside `frontend/`:
```env
VITE_BACKEND_URL=http://127.0.0.1:8000
```

Run Vite dev server:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.


### Option 4: Chrome Extension Load

#### Windows 1-Click Auto-Launcher:
Double-click `1-click-install.bat` in the project root folder. It automatically boots Chrome with the extension pre-loaded.

#### Manual Chrome Load:
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (toggle in top-right corner).
3. Click **Load unpacked** and select the `extension/` folder.
4. Click the ToxiGuard shield icon in your toolbar and enter your API key!


## 🔒 Security, Rate Limiting & Compliance

* **JWT Token Security**: Passwords hashed using `bcrypt` with salt rounds. Session tokens signed using `HS256`.
* **API Key Protection**: Key validation required for API routes; unique keys issued per account.
* **Per-IP & Per-Token Rate Limiting**: SlowAPI restricts unauthenticated abuse (e.g. 60 requests/minute).
* **CORS Domain Whitelisting**: Strict origin controls prevent unauthorized cross-domain browser requests.
* **Zero Prompt Training Guarantee**: OpenRouter LLM requests configured with `No prompt training` policies to guarantee user data privacy.


## ✅ Final System Verification & Audit Checklist

To verify that all components of the ToxiGuard AI ecosystem function properly:

| Category | Component | Status | Verification Method |
| :--- | :--- | :--- | :--- |
| **Backend** | 3-Layer Moderation Engine | `ACTIVE` | Tested `/predict` and `/predict/ml` endpoints |
| **Backend** | XAI Explainability Engine | `ACTIVE` | Verified token attribution via `/explain` |
| **Backend** | Concept Drift & Calibration | `ACTIVE` | Tested `/monitoring` and `/feedback` pipelines |
| **Frontend** | React SPA & Glassmorphism UI | `ACTIVE` | Compiled bundle with 0 esbuild errors (`npm run build`) |
| **Frontend** | Interactive Heatmap & Stream | `ACTIVE` | Verified `TokenHeatmap.jsx` & `StreamAnalyzer.jsx` |
| **Extension**| Manifest V3 Shield & Selection | `ACTIVE` | Verified `<all_urls>` injection, FAB, & side panel |
| **Docs** | Project Documentation | `COMPLETE` | Fully verified `README.md`, `system_design.md` & `walkthrough.md` |


## 👨‍💻 Author & License

**Author**: Saurabh Yadav  
**Repository**: [github.com/wraith-klu/toxiguard-ai](https://github.com/wraith-klu/toxiguard-ai)  
**License**: This project is open-source software licensed under the **[MIT License](LICENSE)**.
