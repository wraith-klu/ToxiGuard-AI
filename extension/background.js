// ============================================================
// ToxiGuard AI — Background Service Worker v3.0
// Production-Ready · Multi-Platform · Mobile-Friendly
// ============================================================

// ─── API Configuration ───────────────────────────────────────
let API_BASE = "https://toxiguard-ai-agent-v3.onrender.com";
let WEB_PORTAL_BASE = "https://toxiai-agent.vercel.app";

async function detectApiUrl() {
  const data = await chrome.storage.local.get(["api_url", "web_url"]);
  if (data.api_url) {
    API_BASE = data.api_url;
  } else {
    API_BASE = "https://toxiguard-ai-agent-v3.onrender.com";
    await chrome.storage.local.set({ api_url: API_BASE });
  }

  if (data.web_url) {
    WEB_PORTAL_BASE = data.web_url;
  } else {
    WEB_PORTAL_BASE = "https://toxiai-agent.vercel.app";
    await chrome.storage.local.set({ web_url: WEB_PORTAL_BASE });
  }
  console.log("🌐 ToxiGuard: Using API URL:", API_BASE);
  console.log("🌐 ToxiGuard: Using Web URL:", WEB_PORTAL_BASE);
}

// ─── Constants ────────────────────────────────────────────────
const TOXIC_ML_LABELS = new Set([
  "abusive", "toxic", "severe_toxic", "obscene",
  "threat", "insult", "identity_hate"
]);

const DEFAULT_SETTINGS = {
  enabled: true,
  api_url: "https://toxiguard-ai-agent-v3.onrender.com",
  web_url: "https://toxiai-agent.vercel.app",
  platforms: {
    instagram: true,
    twitter:   true,
    youtube:   true,
    reddit:    true,
    linkedin:  true,
    facebook:  true,
    tiktok:    true,
    threads:   true
  },
  mode:          "highlight",
  sensitivity:   "medium",
  notifications: true,
  fab_enabled:   true,
  stats: {
    scanned_total: 0,
    toxic_total:   0,
    scanned_today: 0,
    toxic_today:   0,
    last_reset:    new Date().toDateString(),
    recent:        []
  }
};

// ─── Normalize API result ─────────────────────────────────────
function normalizeAnalysisResult(data) {
  if (!data) return null;

  const ml = data.ml || {};
  const labels = data.labels || ml.labels || {};
  const detected = (data.detected_categories || ml.detected_categories || [])
    .map(v => String(v).toLowerCase());
  const label = String(data.label || ml.label || "").toLowerCase();
  const labelScores = Object.entries(labels)
    .filter(([name]) => TOXIC_ML_LABELS.has(String(name).toLowerCase()))
    .map(([, score]) => Number(score) || 0);
  const confidence = Math.max(
    Number(data.confidence) || 0,
    Number(data.toxicity_probability) || 0,
    Number(ml.toxicity_probability) || 0,
    ...labelScores
  );
  const toxic = (
    data.toxic === true ||
    data.is_toxic === true ||
    ml.toxic === true ||
    TOXIC_ML_LABELS.has(label) ||
    detected.some(category => TOXIC_ML_LABELS.has(category)) ||
    confidence >= 0.5
  );
  const severity = data.severity || ml.severity || (
    confidence >= 0.85 ? "high" : confidence >= 0.6 ? "medium" : "low"
  );
  const category = data.category || detected[0] || label || data.source || "ml";

  return {
    ...data,
    toxic,
    confidence,
    severity,
    category,
    source:   data.source || "ml",
    llm_used: data.llm_used || false,
    llm:      data.llm || null
  };
}

// ─── API Calls ────────────────────────────────────────────────
async function analyzeTextWithMl(text, apiKey) {
  const res = await fetch(`${API_BASE}/predict/ml`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key":    apiKey
    },
    body: JSON.stringify({ text })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.error || `ML analysis failed (${res.status})`);
  }

  return normalizeAnalysisResult(data);
}

// ─── Demo / Guest Mode (no auth required) ─────────────────────
async function analyzeTextDemo(text) {
  try {
    const res = await fetch(`${API_BASE}/predict/demo`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8000)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return normalizeAnalysisResult({ ...data, _demo: true });
  } catch (e) {
    console.warn("ToxiGuard demo endpoint failed:", e.message);
  }
  return null;
}

async function analyzeTextFull(text, apiKey) {
  // Try the full /predict endpoint which includes LLM analysis
  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key":    apiKey
      },
      body: JSON.stringify({ text })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return normalizeAnalysisResult({ ...data, llm_used: true });
    }
  } catch {}

  // Fallback to ML-only
  return analyzeTextWithMl(text, apiKey);
}

async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) return { online: true, ...(await res.json()) };
  } catch {}
  return { online: false };
}

// ─── On Install ───────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("✅ ToxiGuard AI v3.0 installed");

  // Detect API URL
  await detectApiUrl();

  if (details.reason === "install") {
    await chrome.storage.local.set(DEFAULT_SETTINGS);
  } else if (details.reason === "update") {
    // Merge new platform defaults without overwriting user preferences
    const data = await chrome.storage.local.get(["platforms", "fab_enabled"]);
    const platforms = data.platforms || {};
    const updated = { ...DEFAULT_SETTINGS.platforms, ...platforms };
    await chrome.storage.local.set({
      platforms:    updated,
      fab_enabled:  data.fab_enabled !== undefined ? data.fab_enabled : true
    });
  }

  // Daily reset alarm
  chrome.alarms.create("daily-reset", { periodInMinutes: 60 });

  // API health check alarm (every 30 minutes)
  chrome.alarms.create("api-health", { periodInMinutes: 30 });

  // Context menus
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id:       "toxiguard-analyze",
        title:    "🛡️ Analyze with ToxiGuard AI",
        contexts: ["selection"]
      });

      chrome.contextMenus.create({
        id:       "toxiguard-deep-analyze",
        title:    "🧠 Deep AI Analysis (with LLM)",
        contexts: ["selection"]
      });

      chrome.contextMenus.create({
        id:       "toxiguard-settings",
        title:    "⚙️ ToxiGuard Settings",
        contexts: ["action"]
      });

      chrome.contextMenus.create({
        id:       "toxiguard-sidepanel",
        title:    "📊 Open Side Panel",
        contexts: ["action"]
      });
    });
  } catch (e) {
    console.warn("Context menu creation error:", e);
  }
});

// ─── Startup — detect API ─────────────────────────────────────
chrome.runtime.onStartup.addListener(async () => {
  await detectApiUrl();
});

// ─── Alarm Handlers ───────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "daily-reset") {
    const data = await chrome.storage.local.get("stats");
    const stats = data.stats;
    if (!stats) return;

    const today = new Date().toDateString();
    if (stats.last_reset !== today) {
      stats.scanned_today = 0;
      stats.toxic_today = 0;
      stats.last_reset = today;
      await chrome.storage.local.set({ stats });
      updateBadge(0);
    }
  }

  if (alarm.name === "api-health") {
    await detectApiUrl();
  }
});

// ─── Context Menu Handlers ────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "toxiguard-analyze" && info.selectionText) {
    const { api_key } = await chrome.storage.local.get("api_key");
    if (!api_key) {
      showNotification("ToxiGuard AI", "Please login to ToxiGuard first.");
      return;
    }

    try {
      const data = await analyzeTextWithMl(info.selectionText, api_key);
      showAnalysisNotification(data);
    } catch (e) {
      console.error("Context menu analyze failed:", e);
      showNotification("ToxiGuard AI", "Analysis failed. Check your connection.");
    }
  }

  if (info.menuItemId === "toxiguard-deep-analyze" && info.selectionText) {
    const { api_key } = await chrome.storage.local.get("api_key");
    if (!api_key) {
      showNotification("ToxiGuard AI", "Please login to ToxiGuard first.");
      return;
    }

    try {
      showNotification("ToxiGuard AI", "🧠 Running deep AI analysis...");
      const data = await analyzeTextFull(info.selectionText, api_key);
      showAnalysisNotification(data);
    } catch (e) {
      console.error("Deep analyze failed:", e);
      showNotification("ToxiGuard AI", "Deep analysis failed. Check your connection.");
    }
  }

  if (info.menuItemId === "toxiguard-settings") {
    chrome.runtime.openOptionsPage();
  }

  if (info.menuItemId === "toxiguard-sidepanel") {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (e) {
      console.warn("Side panel not supported:", e);
    }
  }
});

// ─── Notification Helpers ─────────────────────────────────────
function showNotification(title, message) {
  chrome.notifications.create(`tg-${Date.now()}`, {
    type:    "basic",
    iconUrl: "icons/icon128.png",
    title,
    message
  });
}

function showAnalysisNotification(data) {
  const conf     = Math.round((data.confidence || 0) * 100);
  const category = data.category || data.source || "content";

  chrome.notifications.create(`ctx-${Date.now()}`, {
    type:    "basic",
    iconUrl: "icons/icon128.png",
    title:   data.toxic ? "🚨 Toxic Content Detected" : "✅ Content Appears Safe",
    message: data.toxic
      ? `Severity: ${data.severity || "medium"} | Category: ${category} | Confidence: ${conf}%`
      : `This text appears safe. Confidence: ${100 - conf}%`
  });
}

// ─── Message Router ───────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // All settings for content scripts
  if (msg.action === "GET_SETTINGS") {
    chrome.storage.local.get(null, data => sendResponse(data));
    return true;
  }

  // Content script reports a scan result
  if (msg.action === "REPORT_SCAN") {
    handleScanReport(msg, sender).then(() => sendResponse({ ok: true }));
    return true;
  }

  // ML-only analysis (used by content scripts for feed scanning)
  if (msg.action === "ANALYZE_TEXT") {
    chrome.storage.local.get("api_key", async ({ api_key }) => {
      try {
        if (api_key) {
          // Authenticated path — full ML model
          const result = await analyzeTextWithMl(msg.text || "", api_key);
          sendResponse({ ok: true, result, demo: false });
        } else {
          // Guest/demo path — public endpoint, no auth
          const result = await analyzeTextDemo(msg.text || "");
          if (result) {
            sendResponse({ ok: true, result, demo: true });
          } else {
            sendResponse({ ok: false, error: "Demo mode unavailable. Please log in.", demo: true });
          }
        }
      } catch (e) {
        // If authenticated request fails, try demo as fallback
        try {
          const result = await analyzeTextDemo(msg.text || "");
          if (result) { sendResponse({ ok: true, result, demo: true }); return; }
        } catch {}
        sendResponse({ ok: false, error: e.message || "ML analysis failed" });
      }
    });
    return true;
  }

  // Quick analyze (used by FAB widget & side panel — full analysis)
  if (msg.action === "ANALYZE_QUICK") {
    chrome.storage.local.get("api_key", async ({ api_key }) => {
      try {
        if (api_key) {
          const useFull = msg.deep === true;
          const result = useFull
            ? await analyzeTextFull(msg.text || "", api_key)
            : await analyzeTextWithMl(msg.text || "", api_key);
          sendResponse({ ok: true, result, demo: false });
        } else {
          // Guest/demo fallback
          const result = await analyzeTextDemo(msg.text || "");
          if (result) {
            sendResponse({ ok: true, result, demo: true });
          } else {
            sendResponse({
              ok: false,
              error: "Please sign up / log in to use full analysis. Demo mode is temporarily unavailable.",
              demo: true
            });
          }
        }
      } catch (e) {
        sendResponse({ ok: false, error: e.message || "Analysis failed" });
      }
    });
    return true;
  }

  // Check if running in demo mode
  if (msg.action === "GET_DEMO_STATUS") {
    chrome.storage.local.get("api_key", ({ api_key }) => {
      sendResponse({ isDemo: !api_key, hasKey: !!api_key });
    });
    return true;
  }

  // API health check
  if (msg.action === "CHECK_HEALTH") {
    checkApiHealth().then(result => sendResponse(result));
    return true;
  }

  // Get current API URL
  if (msg.action === "GET_API_URL") {
    const isProd = !API_BASE.includes("127.0.0.1") && !API_BASE.includes("localhost");
    sendResponse({ url: API_BASE, isProd });
    return true;
  }

  // Get current Web Portal URL
  if (msg.action === "GET_WEB_URL") {
    sendResponse({ url: WEB_PORTAL_BASE });
    return true;
  }

  // Sync session from Web App
  if (msg.action === "SYNC_WEB_SESSION") {
    const apiKey = msg.api_key;
    fetch(`${API_BASE}/auth/me`, {
      headers: { "X-API-Key": apiKey }
    })
    .then(res => res.json())
    .then(async (user) => {
      if (user && user.email) {
        await chrome.storage.local.set({
          api_key: apiKey,
          user_email: user.email,
          user_plan: user.plan || "free",
          enabled: true
        });
        sendResponse({ synced: true });
        chrome.runtime.sendMessage({ action: "SESSION_SYNCED" }).catch(() => {});
      } else {
        sendResponse({ synced: false });
      }
    })
    .catch(() => {
      sendResponse({ synced: false });
    });
    return true;
  }

  // Popup requests stats
  if (msg.action === "GET_STATS") {
    chrome.storage.local.get("stats", data => sendResponse(data.stats || {}));
    return true;
  }

  // Logout
  if (msg.action === "LOGOUT") {
    chrome.storage.local.clear();
    updateBadge(0);
    sendResponse({ ok: true });
    return true;
  }

  // Relay settings update to all active tabs
  if (msg.action === "SETTINGS_UPDATED") {
    if (msg.settings) {
      if (msg.settings.api_url) {
        API_BASE = msg.settings.api_url;
        console.log("🌐 ToxiGuard: API URL dynamically updated to:", API_BASE);
      }
      if (msg.settings.web_url) {
        WEB_PORTAL_BASE = msg.settings.web_url;
        console.log("🌐 ToxiGuard: Web URL dynamically updated to:", WEB_PORTAL_BASE);
      }
    }
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
      });
    });
    sendResponse({ ok: true });
    return true;
  }

  // Rescan: relay to specific tab
  if (msg.action === "TRIGGER_RESCAN") {
    const tabId = msg.tabId;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { action: "RESCAN" }).catch(() => {});
    }
    sendResponse({ ok: true });
    return true;
  }

  // Open side panel
  if (msg.action === "OPEN_SIDEPANEL") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        try {
          await chrome.sidePanel.open({ tabId: tabs[0].id });
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false, error: "Side panel not supported in this browser." });
        }
      } else {
        sendResponse({ ok: false, error: "No active tab." });
      }
    });
    return true;
  }
});

// ─── Handle Scan Report ───────────────────────────────────────
async function handleScanReport(msg) {
  const data = await chrome.storage.local.get(["stats", "notifications"]);
  let stats = data.stats || {
    scanned_total: 0, toxic_total: 0,
    scanned_today: 0, toxic_today: 0,
    last_reset: new Date().toDateString(),
    recent: []
  };

  const scanned = Number(msg.scanned) || 0;
  if (scanned > 0) {
    stats.scanned_total = (stats.scanned_total || 0) + scanned;
    stats.scanned_today = (stats.scanned_today || 0) + scanned;
  }

  if (msg.toxic) {
    stats.toxic_total = (stats.toxic_total || 0) + 1;
    stats.toxic_today = (stats.toxic_today || 0) + 1;

    // Store in recent feed (keep last 50 for better history)
    if (!Array.isArray(stats.recent)) stats.recent = [];
    stats.recent.unshift({
      text:       (msg.text || "").slice(0, 120),
      severity:   msg.severity || "medium",
      confidence: msg.confidence || 0,
      platform:   msg.platform || "unknown",
      category:   msg.category || "toxic",
      time:       Date.now()
    });
    stats.recent = stats.recent.slice(0, 50);

    // Badge
    updateBadge(stats.toxic_today);

    // Notification (throttled — every 5th toxic comment)
    if (data.notifications !== false && stats.toxic_today % 5 === 0) {
      showNotification(
        `🛡️ ToxiGuard — ${stats.toxic_today} blocked today`,
        `"${(stats.recent[0]?.text || "").slice(0, 60)}" on ${msg.platform || "this page"}`
      );
    }
  }

  await chrome.storage.local.set({ stats });
}

// ─── Badge ────────────────────────────────────────────────────
function updateBadge(count) {
  const text = count > 0 ? (count > 99 ? "99+" : String(count)) : "";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({
    color: count > 0 ? "#ff3b3b" : "#6c63ff"
  });
}
