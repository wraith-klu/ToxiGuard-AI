// ToxiGuard AI — API Client

const BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

// Shared fetch helper (API KEY BASED)

async function apiFetch(url, options = {}) {
  const apiKey = localStorage.getItem("api_key");

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(apiKey && { "x-api-key": apiKey }),
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error("Network error — server may be offline");
  }

  // Auth failure
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("api_key");
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Session expired. Please sign in again.");
  }

  // Rate limited
  if (res.status === 429) {
    throw new Error("Rate limit exceeded. Please wait a moment.");
  }

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      message = data.detail || data.error || message;
    } catch {
      message = await res.text() || message;
    }
    throw new Error(message);
  }

  return res.json();
}

// ─── Predict Toxicity ──────────────────────────────────────────────────────

export async function predictText(text) {
  return apiFetch(`${BASE_URL}/predict`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

// ─── XAI: Token Attribution ────────────────────────────────────────────────

export async function explainText(text) {
  return apiFetch(`${BASE_URL}/explain`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

// ─── File Upload (Batch Analysis) ─────────────────────────────────────────

export async function analyzeFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch(`${BASE_URL}/analyze-file`, {
    method: "POST",
    body: formData,
  });
}

// ─── Active Learning Feedback ─────────────────────────────────────────────

export async function submitFeedback({ inputText, predictedToxic, correctLabel, confidenceAtTime, notes }) {
  return apiFetch(`${BASE_URL}/feedback`, {
    method: "POST",
    body: JSON.stringify({
      input_text: inputText,
      predicted_toxic: predictedToxic,
      correct_label: correctLabel,
      confidence_at_time: confidenceAtTime ?? null,
      notes: notes ?? null,
    }),
  });
}

export async function getFeedbackStats() {
  return apiFetch(`${BASE_URL}/feedback/stats`);
}

// ─── Monitoring ───────────────────────────────────────────────────────────

export async function getMonitoringStats() {
  return apiFetch(`${BASE_URL}/monitoring/stats`);
}

export async function getDriftSeries(limit = 100) {
  return apiFetch(`${BASE_URL}/monitoring/drift?limit=${limit}`);
}

// ─── Auth ─────────────────────────────────────────────────────────────────

export async function loginUser(email, password) {
  const data = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const res = await data.json();

  if (res.api_key) {
    localStorage.setItem("api_key", res.api_key);
  }

  return res;
}

export async function signupUser(email, password) {
  const data = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const res = await data.json();

  if (res.api_key) {
    localStorage.setItem("api_key", res.api_key);
  }

  return res;
}