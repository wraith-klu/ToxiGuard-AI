# 🛡️ ToxiGuard AI

ToxiGuard AI is a **real-time toxic content detection platform** built using:

- ⚛️ React (Vite) — Premium frontend UI
- 🚀 FastAPI — High-performance backend API
- 🧠 Machine Learning — TF-IDF + Logistic Regression
- 🤖 LLM (OpenRouter) — Context-aware moderation
- 📊 Analytics — KPI, charts, history, word cloud

It detects abusive language, estimates toxicity, provides explanations, and visual analytics.

---

## 📁 Project Structure

ToxiGuard-AI/
│
├── backend/
│ ├── app.py
│ ├── main.py
│ ├── train_model.py
│ ├── requirements.txt
│ ├── abuse_model.joblib
│ ├── label_encoder.joblib
│ └── utils/
│ ├── abuse_words.py
│ ├── preprocessing.py
│ ├── sentiment.py
│ └── llm_guard.py
│
├── frontend/
│ ├── package.json
│ ├── vite.config.js
│ ├── index.html
│ └── src/
│ ├── main.jsx
│ ├── App.jsx
│ ├── api.js
│ ├── styles.css
│ └── components/
│ ├── Header.jsx
│ ├── TextInput.jsx
│ ├── LiveResult.jsx
│ ├── KPI.jsx
│ ├── Charts.jsx
│ ├── AbuseTable.jsx
│ ├── History.jsx
│ └── WordClouds.jsx
│
└── README.md


---

## 🚀 Features

- ✅ Live toxic word detection
- ✅ ML-based classification (97%+ accuracy)
- ✅ LLM fallback for contextual understanding
- ✅ Highlight abusive words
- ✅ KPI dashboard (words, abusive count, toxicity)
- ✅ Pie chart and toxicity bar
- ✅ Abuse table with CSV export
- ✅ Word cloud visualization
- ✅ Analysis history
- ✅ Premium glassmorphism UI

---

## 🧩 Backend Setup

### 1️⃣ Create virtual environment (recommended)

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
2️⃣ Install dependencies
pip install -r requirements.txt
3️⃣ Environment variables
Create file:

backend/.env
Add:

OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL=xiaomi/mimo-v2-flash:free
4️⃣ Train ML model (only once)
python train_model.py
This generates:

abuse_model.joblib
label_encoder.joblib
5️⃣ Run backend
Option A (recommended):

python main.py
Option B:

uvicorn app:app --host 0.0.0.0 --port 8090 --reload
Backend runs at:

http://127.0.0.1:8090
Swagger API:

http://127.0.0.1:8090/docs
⚛️ Frontend Setup
1️⃣ Install dependencies
cd frontend
npm install
2️⃣ Start frontend
npm run dev
Open browser:

http://localhost:5173
▶️ Restart Frontend
If UI breaks or new components are added:

npm run dev
(Stop previous process using CTRL + C if needed.)

🔗 API Usage
Endpoint
POST /predict
Request
{
  "text": "you are stupid"
}
Response
{
  "toxic": true,
  "confidence": 0.95,
  "severity": "high",
  "reason": "Matched abusive keywords",
  "abusive_words": ["stupid"],
  "word_frequency": { "stupid": 1 },
  "suggestions": { "stupid": "Use 'unwise' instead." },
  "sentiment": {
    "label": "negative",
    "polarity": -0.6,
    "confidence": 0.6
  },
  "source": "rules"
}
⚠️ Common Issues & Fixes
❌ Port not opening
Run backend again:

python main.py
Open:

http://127.0.0.1:8090
❌ Dependency conflicts (Node)
If frontend fails:

npm cache clean --force
npm install
npm run dev
Recommended Node version:

Node 18 LTS
❌ ML model not loading
If you see:

ML model load failed
Run:

python train_model.py
❌ CORS error
Ensure backend is running before frontend.

📦 Production Build
npm run build
Output folder:

frontend/dist
👨‍💻 Author
Developed by Saurabh Yadav.

📜 License
MIT License