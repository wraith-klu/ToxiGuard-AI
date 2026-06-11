// ============================================================
// ToxiGuard AI — Side Panel Logic v3.0
// Responsive · Real-Time Syncing · Model Selection
// ============================================================

const store = {
  get: (keys) => new Promise(r => chrome.storage.local.get(keys, r)),
  set: (obj) => new Promise(r => chrome.storage.local.set(obj, r)),
  all: () => new Promise(r => chrome.storage.local.get(null, r))
};

// State Variables
let currentTab = "workspace";
let isScanning = false;

// Supported Platform Configs
const PLATFORMS = {
  instagram: { name: "Instagram", icon: "🟣", emoji: "🟣" },
  twitter:   { name: "Twitter / X", icon: "🐦", emoji: "🐦" },
  youtube:   { name: "YouTube", icon: "🔴", emoji: "🔴" },
  reddit:    { name: "Reddit", icon: "🟠", emoji: "🟠" },
  linkedin:  { name: "LinkedIn", icon: "💼", emoji: "💼" },
  facebook:  { name: "Facebook", icon: "📘", emoji: "📘" },
  tiktok:    { name: "TikTok", icon: "🎵", emoji: "🎵" },
  threads:   { name: "Threads", icon: "🧵", emoji: "🧵" }
};

// ─── DOM Boot ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const data = await store.all();
  
  initUI(data);
  checkConnection();
  bindListeners();
  
  // Storage change listener to keep sidepanel perfectly synced
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      updateUIFromStorage();
    }
  });
});

// ─── Init UI ─────────────────────────────────────────────────
function initUI(data) {
  // Populate Platform Toggles dynamically
  const togglesWrap = document.getElementById("platformToggles");
  if (togglesWrap) {
    togglesWrap.innerHTML = Object.entries(PLATFORMS).map(([key, info]) => {
      const enabled = data.platforms?.[key] !== false;
      return `
        <div class="pf-item">
          <div class="pf-info">
            <span class="pf-emoji">${info.emoji}</span>
            <span>${info.name}</span>
          </div>
          <label class="sw">
            <input type="checkbox" data-pf="${key}" class="pf-switch" ${enabled ? "checked" : ""}>
            <span class="sw-track"></span>
          </label>
        </div>`;
    }).join("");
  }

  // Load and sync dashboard values
  syncStats(data.stats);
  syncMode(data.mode);
  syncFeed(data.stats?.recent || []);
}

// ─── Bind Active Action Listeners ─────────────────────────────
function bindListeners() {
  // Navigation Tabs
  window.switchTab = (tabId) => {
    currentTab = tabId;
    document.querySelectorAll(".nav-tab").forEach(tab => {
      tab.classList.toggle("active", tab.id === `tab-${tabId}`);
    });
    document.querySelectorAll(".tab-pane").forEach(pane => {
      pane.classList.toggle("active", pane.id === `content-${tabId}`);
    });
  };

  // Textarea input character limits
  const textarea = document.getElementById("analyzeTextarea");
  const charCounter = document.getElementById("charCount");
  textarea.addEventListener("input", (e) => {
    const val = e.target.value || "";
    charCounter.textContent = `${val.length}/1000`;
    if (val.length > 1000) {
      e.target.value = val.slice(0, 1000);
      charCounter.textContent = "1000/1000";
    }
  });

  // Shield Scan Click Handler
  const analyzeBtn = document.getElementById("analyzeBtn");
  analyzeBtn.addEventListener("click", performManualScan);

  // Platform Toggle Actions
  document.addEventListener("change", async (e) => {
    if (e.target.classList.contains("pf-switch")) {
      const pf = e.target.dataset.pf;
      const data = await store.all();
      const pls = { ...(data.platforms || {}) };
      pls[pf] = e.target.checked;
      await store.set({ platforms: pls });
      
      // Relay changes to open tabs
      chrome.runtime.sendMessage({ action: "SETTINGS_UPDATED", settings: { platforms: pls } }).catch(() => {});
    }
    
    // Moderation Mode Radio Buttons
    if (e.target.name === "sp-mode") {
      const mode = e.target.value;
      await store.set({ mode });
      
      // Relay changes
      chrome.runtime.sendMessage({ action: "SETTINGS_UPDATED", settings: { mode } }).catch(() => {});
    }
  });

  // Open Options Page
  document.getElementById("openOptionsBtn").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // Clear live threats feed
  document.getElementById("clearFeedBtn").addEventListener("click", async () => {
    const data = await store.all();
    if (data.stats) {
      data.stats.recent = [];
      await store.set({ stats: data.stats });
    }
  });
}

// ─── Dynamic Live Connection Checking ─────────────────────────
async function checkConnection() {
  const statusEl = document.getElementById("connStatus");
  if (!statusEl) return;
  
  try {
    const health = await chrome.runtime.sendMessage({ action: "CHECK_HEALTH" });
    if (health && health.online) {
      statusEl.textContent = "Online";
      statusEl.className = "status-indicator online";
    } else {
      statusEl.textContent = "Offline";
      statusEl.className = "status-indicator offline";
    }
  } catch {
    statusEl.textContent = "Offline";
    statusEl.className = "status-indicator offline";
  }
}

// ─── Perform Interactive Manual Analysis ──────────────────────
async function performManualScan() {
  if (isScanning) return;
  
  const textarea = document.getElementById("analyzeTextarea");
  const text = textarea.value.trim();
  const resEl = document.getElementById("analysisResult");
  
  if (!text) {
    showScanToast("Please enter some text to scan.");
    return;
  }
  
  setScanLoading(true);
  resEl.classList.add("hidden");
  
  const isDeep = document.getElementById("deepScanCheckbox").checked;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: "ANALYZE_QUICK",
      text: text,
      deep: isDeep
    });
    
    if (response && response.ok) {
      displayScanResult(response.result);
    } else {
      showScanToast(response.error || "Analysis failed. Please check backend API.");
    }
  } catch (err) {
    showScanToast("Error connecting to background script service.");
  } finally {
    setScanLoading(false);
  }
}

// ─── Display manual scan outputs ──────────────────────────────
function displayScanResult(res) {
  const resEl = document.getElementById("analysisResult");
  const badge = document.getElementById("resBadge");
  const meta = document.getElementById("resMeta");
  const verdict = document.getElementById("resVerdict");
  const meter = document.getElementById("resMeter");
  const explainBlock = document.getElementById("llmExplainBlock");
  const explainBody = document.getElementById("llmExplainBody");
  
  resEl.classList.remove("hidden");
  
  const conf = Math.round((res.confidence || 0) * 100);
  
  if (res.toxic) {
    badge.textContent = "TOXIC CONTENT";
    badge.className = "result-status-badge toxic";
    
    const cat = res.category ? res.category.toUpperCase() : "VIOLATION";
    verdict.textContent = `🚨 Flagged for ${cat} (Severity: ${res.severity || "medium"}).`;
    
    meter.style.width = `${conf}%`;
    meter.className = "meter-fill toxic";
    meta.textContent = `Toxicity Score: ${conf}%`;
  } else {
    badge.textContent = "CLEAN & SAFE";
    badge.className = "result-status-badge clean";
    verdict.textContent = `✅ Safe content check. No toxic elements detected.`;
    
    meter.style.width = `${100 - conf}%`;
    meter.className = "meter-fill clean";
    meta.textContent = `Safety Confidence: ${100 - conf}%`;
  }
  
  // If LLM Reasoning exists, display it
  if (res.llm_used && res.llm && res.llm.explanation) {
    explainBlock.classList.remove("hidden");
    explainBody.textContent = res.llm.explanation;
  } else if (res.llm_explanation) {
    explainBlock.classList.remove("hidden");
    explainBody.textContent = res.llm_explanation;
  } else {
    explainBlock.classList.add("hidden");
  }
}

// ─── Sync methods for live storage updates ────────────────────
async function updateUIFromStorage() {
  const data = await store.all();
  syncStats(data.stats);
  syncMode(data.mode);
  syncFeed(data.stats?.recent || []);
  
  // Sync checkbox state in active platform list
  Object.keys(PLATFORMS).forEach(key => {
    const sw = document.querySelector(`.pf-switch[data-pf="${key}"]`);
    if (sw) {
      sw.checked = data.platforms?.[key] !== false;
    }
  });
}

function syncStats(stats) {
  if (!stats) return;
  document.getElementById("sToxToday").textContent = (stats.toxic_today || 0).toLocaleString();
  document.getElementById("sScnToday").textContent = (stats.scanned_today || 0).toLocaleString();
}

function syncMode(mode) {
  const m = mode || "highlight";
  const rad = document.getElementById(`sp-m${m[0].toUpperCase() + m.slice(1)}`);
  if (rad) rad.checked = true;
}

function syncFeed(recent) {
  const feed = document.getElementById("detectionsFeed");
  if (!feed) return;
  
  if (!recent || recent.length === 0) {
    feed.innerHTML = `<div class="feed-empty">No content issues identified yet. Keep browsing safely! 🌟</div>`;
    return;
  }
  
  const emojis = { high: "🚨", medium: "⚠️", low: "⚡" };
  
  feed.innerHTML = recent.slice(0, 15).map(item => {
    const sev = item.severity || "medium";
    const pfInfo = PLATFORMS[item.platform] || { name: item.platform || "Web", emoji: "🌐" };
    const ago = timeAgo(item.time);
    const txt = escapeHtml(item.text || "");
    
    return `
      <div class="feed-item">
        <span class="fi-icon">${emojis[sev] || "⚠️"}</span>
        <div class="fi-body">
          <div class="fi-text">"${txt}"</div>
          <div class="fi-meta">
            <span class="fi-sev fi-${sev}">${sev.toUpperCase()}</span>
            <span class="fi-platform">${pfInfo.emoji} ${pfInfo.name}</span>
            <span>·</span>
            <span class="fi-time">${ago}</span>
          </div>
        </div>
      </div>`;
  }).join("");
}

// ─── UI State Helpers ─────────────────────────────────────────
function setScanLoading(loading) {
  isScanning = loading;
  const btn = document.getElementById("analyzeBtn");
  const txt = btn.querySelector(".btn-text");
  const spin = btn.querySelector(".btn-spin");
  const textarea = document.getElementById("analyzeTextarea");
  
  btn.disabled = loading;
  textarea.disabled = loading;
  
  if (loading) {
    txt.textContent = "Scanning...";
    spin.classList.remove("hidden");
  } else {
    txt.textContent = "Shield Scan";
    spin.classList.add("hidden");
  }
}

function showScanToast(msg) {
  const resEl = document.getElementById("analysisResult");
  const badge = document.getElementById("resBadge");
  const verdict = document.getElementById("resVerdict");
  const meter = document.getElementById("resMeter");
  const explainBlock = document.getElementById("llmExplainBlock");
  
  resEl.classList.remove("hidden");
  explainBlock.classList.add("hidden");
  badge.textContent = "SCAN ERROR";
  badge.className = "result-status-badge toxic";
  verdict.textContent = msg;
  meter.style.width = "0%";
}

// ─── Utilities ────────────────────────────────────────────────
function escapeHtml(t) {
  return t.replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[m]);
}

function timeAgo(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
