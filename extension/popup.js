let API = "https://toxiguard-ai-agent-v3.onrender.com";

// Fetch the dynamic base URL from background on load
chrome.runtime.sendMessage({ action: "GET_API_URL" }, (res) => {
  if (res && res.url) {
    API = res.url;
    console.log("🔗 Dynamic API configured:", API);
  }
});

const store = {
  get:   (keys) => new Promise(r => chrome.storage.local.get(keys, r)),
  set:   (obj)  => new Promise(r => chrome.storage.local.set(obj, r)),
  all:   ()     => new Promise(r => chrome.storage.local.get(null, r)),
  clear: ()     => new Promise(r => chrome.storage.local.clear(r))
};

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const data = await store.all();

  // Set default api_url if not present
  if (!data.api_url) {
    await store.set({ api_url: "https://toxiguard-ai-agent-v3.onrender.com" });
    data.api_url = "https://toxiguard-ai-agent-v3.onrender.com";
  }

  if (data.api_key) {
    await renderDash(data);
  } else {
    showAuth();
  }
  bindAuth();
});

// Listen for Session Sync from Web App
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "SESSION_SYNCED") {
    location.reload();
  }
});

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════

function bindAuth() {
  const connectBtn = document.getElementById("connectWebBtn");
  if (connectBtn) {
    connectBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "GET_WEB_URL" }, (res) => {
        const url = (res && res.url) ? res.url : "https://toxiai-agent.vercel.app";
        chrome.tabs.create({ url: `${url}/login` });
      });
    });
  }
}

async function saveSession(data, email) {
  await store.set({
    api_key:    data.api_key,
    user_email: email,
    user_plan:  data.plan || "free",
    enabled:    true,
    platforms:  {
      instagram: true,
      twitter:   true,
      youtube:   true,
      reddit:    true,
      linkedin:  false,
      facebook:  true,
      tiktok:    true,
      threads:   true
    },
    mode:       "highlight",
    sensitivity:"medium",
    notifications: true,
    stats: {
      scanned_total: 0, toxic_total: 0,
      scanned_today: 0, toxic_today: 0,
      last_reset: new Date().toDateString(),
      recent: []
    }
  });
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════

async function renderDash(data) {
  showDash();

  // Header
  setText("hdrEmail", data.user_email || "—");
  const pill = document.getElementById("planPill");
  pill.textContent = (data.user_plan || "free").toUpperCase();
  if (data.user_plan === "pro") pill.classList.add("pro");

  // Master toggle
  const sw = document.getElementById("masterSw");
  sw.checked = data.enabled !== false;
  sw.onchange = async (e) => {
    await store.set({ enabled: e.target.checked });
    relay({ enabled: e.target.checked });
  };

  // Load sections
  loadStats(data.stats);
  detectPlatform(data);
  loadSettings(data);
  fetchUsage(data.api_key, data.user_plan);

  // Backend URL configuration
  const dashUrlField = document.getElementById("dashBackendUrl");
  if (dashUrlField) {
    dashUrlField.value = data.api_url || "https://toxiguard-ai-agent-v3.onrender.com";
  }
  
  const saveDashBtn = document.getElementById("saveDashBackendBtn");
  if (saveDashBtn) {
    saveDashBtn.onclick = async () => {
      const newUrl = dashUrlField.value.trim().replace(/\/$/, "");
      if (!newUrl) return;
      await store.set({ api_url: newUrl });
      chrome.runtime.sendMessage({ action: "SETTINGS_UPDATED", settings: { api_url: newUrl } }).catch(() => {});
      alert("Backend API URL updated!");
      location.reload();
    };
  }

  // Logout handler (shared)
  const doLogout = async () => {
    await store.clear();
    relay({ action: "LOGOUT" });
    location.reload();
  };

  document.getElementById("logoutBtn").onclick = doLogout;
  const hdrLogout = document.getElementById("hdrLogoutBtn");
  if (hdrLogout) hdrLogout.onclick = doLogout;

  // API key copy
  const apiKey = data.api_key || "";
  document.getElementById("apikeyVal").textContent =
    apiKey ? apiKey.slice(0, 6) + "••••••••" + apiKey.slice(-4) : "—";

  document.getElementById("apikeyCopyBtn").onclick = () => {
    navigator.clipboard.writeText(apiKey).then(() => {
      document.getElementById("apikeyCopyBtn").textContent = "✅";
      setTimeout(() => { document.getElementById("apikeyCopyBtn").textContent = "📋"; }, 1500);
    });
  };
}

// ─── Stats ────────────────────────────────────────────────────
function loadStats(stats) {
  if (!stats) return;
  animNum("sToxToday", stats.toxic_today   || 0);
  animNum("sScnToday", stats.scanned_today || 0);
  animNum("sToxAll",   stats.toxic_total   || 0);
  renderFeed(stats.recent || []);
}

function animNum(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 20));
  const iv = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur.toLocaleString();
    if (cur >= target) clearInterval(iv);
  }, 28);
}

function renderFeed(recent) {
  const feed = document.getElementById("feed");
  if (!recent.length) {
    feed.innerHTML = '<div class="feed-empty">No toxic content blocked yet 🌟</div>';
    return;
  }

  const icons  = { high: "🚨", medium: "⚠️", low: "⚡" };
  const pfNames = {
    instagram: "Instagram",
    twitter:   "Twitter/X",
    youtube:   "YouTube",
    reddit:    "Reddit",
    linkedin:  "LinkedIn",
    facebook:  "Facebook",
    tiktok:    "TikTok",
    threads:   "Threads"
  };

  feed.innerHTML = recent.slice(0, 6).map(item => {
    const sev  = item.severity || "medium";
    const pf   = pfNames[item.platform] || item.platform || "Unknown";
    const ago  = timeAgo(item.time);
    const txt  = esc(item.text || "");
    return `
      <div class="feed-item">
        <span class="fi-icon">${icons[sev] || "⚠️"}</span>
        <div class="fi-body">
          <div class="fi-text">"${txt}"</div>
          <div class="fi-meta">
            <span class="fi-sev fi-${sev}">${sev.toUpperCase()}</span>
            <span>${pf}</span>
            <span>·</span>
            <span>${ago}</span>
          </div>
        </div>
      </div>`;
  }).join("");
}

// ─── Platform detection ───────────────────────────────────────
async function detectPlatform(data) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url   = tab?.url || "";

    const map = {
      instagram: { name: "Instagram",  icon: "🟣", key: "instagram" },
      twitter:   { name: "Twitter / X",icon: "🐦", key: "twitter"   },
      "x.com":   { name: "Twitter / X",icon: "🐦", key: "twitter"   },
      youtube:   { name: "YouTube",    icon: "🔴", key: "youtube"   },
      reddit:    { name: "Reddit",     icon: "🟠", key: "reddit"    },
      linkedin:  { name: "LinkedIn",   icon: "💼", key: "linkedin"  },
      facebook:  { name: "Facebook",   icon: "📘", key: "facebook"  },
      tiktok:    { name: "TikTok",     icon: "🎵", key: "tiktok"    },
      threads:   { name: "Threads",    icon: "🧵", key: "threads"   }
    };

    let detected = null;
    for (const [kw, info] of Object.entries(map)) {
      if (url.includes(kw)) { detected = info; break; }
    }

    const icon   = document.getElementById("pfIcon");
    const name   = document.getElementById("pfName");
    const status = document.getElementById("pfStatus");

    if (detected) {
      icon.textContent = detected.icon;
      name.textContent = detected.name;
      const enabled = data.enabled && data.platforms?.[detected.key] !== false;
      status.textContent  = enabled ? "ACTIVE" : "PAUSED";
      status.className    = `pf-status ${enabled ? "on" : "off"}`;
    } else {
      icon.textContent   = "🌐";
      name.textContent   = "Not a monitored site";
      status.textContent = "—";
      status.className   = "pf-status off";
    }
  } catch {}
}

// ─── Usage ────────────────────────────────────────────────────
async function fetchUsage(apiKey, plan) {
  if (!apiKey) return;

  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { "X-API-Key": apiKey }
    });

    if (res.ok) {
      const d     = await res.json();
      const usage = d.usage_count || 0;
      const limit = d.plan === "pro" ? 50000 : 1000;
      const pct   = Math.min((usage / limit) * 100, 100);

      setText("usageTxt", `${usage.toLocaleString()} / ${limit.toLocaleString()}`);
      setText("usageSub", `${d.plan === "pro" ? "Pro" : "Free"} Plan · ${limit.toLocaleString()} analyses / month`);

      const bar = document.getElementById("ubarFill");
      bar.style.width = `${pct}%`;
      if (pct > 80) bar.classList.add("danger");

      if (d.plan === "pro") document.getElementById("upgradeLink").classList.add("hide");

      // Update stored plan
      await store.set({ user_plan: d.plan });
      return;
    }
  } catch {}

  // Fallback — use local stats
  const d     = await store.all();
  const usage = d.stats?.scanned_total || 0;
  const limit = plan === "pro" ? 50000 : 1000;
  const pct   = Math.min((usage / limit) * 100, 100);
  setText("usageTxt", `~${usage} / ${limit.toLocaleString()}`);
  document.getElementById("ubarFill").style.width = `${pct}%`;
}

// ═══════════════════════════════════════════════════════════════
//  SETTINGS PANEL
// ═══════════════════════════════════════════════════════════════

function loadSettings(data) {
  // Platform toggles
  document.querySelectorAll(".pf-sw").forEach(sw => {
    const pf = sw.dataset.pf;
    sw.checked = data.platforms?.[pf] !== false;
    sw.onchange = async (e) => {
      const pls = { ...(data.platforms || {}) };
      pls[pf] = e.target.checked;
      data.platforms = pls;
      await store.set({ platforms: pls });
      relay({ platforms: pls });
    };
  });

  // Mode
  const modeEl = document.getElementById(`m${cap(data.mode || "highlight")}`);
  if (modeEl) modeEl.checked = true;
  document.querySelectorAll('input[name="mode"]').forEach(r => {
    r.onchange = async (e) => {
      data.mode = e.target.value;
      await store.set({ mode: e.target.value });
      relay({ mode: e.target.value });
    };
  });

  // Sensitivity slider
  const levels  = ["low", "medium", "high"];
  const slider  = document.getElementById("sensRange");
  slider.value  = levels.indexOf(data.sensitivity || "medium");
  updateSensLabel(slider.value);

  slider.oninput = async (e) => {
    const val = levels[+e.target.value];
    updateSensLabel(e.target.value);
    data.sensitivity = val;
    await store.set({ sensitivity: val });
    relay({ sensitivity: val });
  };

  // Notifications
  const notifSw = document.getElementById("notifSw");
  notifSw.checked = data.notifications !== false;
  notifSw.onchange = async (e) => {
    await store.set({ notifications: e.target.checked });
  };
}

function updateSensLabel(idx) {
  const labels = ["Low", "Medium", "High"];
  setText("sensVal", labels[+idx] || "Medium");
}

// ═══════════════════════════════════════════════════════════════
//  PANEL / SCREEN NAVIGATION
// ═══════════════════════════════════════════════════════════════

function showPanel(name) {
  document.querySelectorAll(".ntab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
  document.getElementById(`ntab-${name}`).classList.add("active");
  document.getElementById(`panel-${name}`).classList.remove("hidden");
}

function showAuth() {
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("dash-screen").classList.add("hidden");
}

function showDash() {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("dash-screen").classList.remove("hidden");
}

// ═══════════════════════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════════════════════

async function doRescan() {
  const btn = document.getElementById("rescanBtn");
  btn.textContent = "✅ Rescanning...";
  btn.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "RESCAN" }).catch(() => {});
  }

  setTimeout(() => {
    btn.textContent = "🔄 Rescan Page";
    btn.disabled = false;
  }, 2500);
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

// ═══════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════

function v(id)         { return document.getElementById(id)?.value.trim() || ""; }
function setText(id,t) { const e = document.getElementById(id); if (e) e.textContent = t; }
function cap(s)        { return s ? s[0].toUpperCase() + s.slice(1) : ""; }
function esc(t)        { return t.replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[m]); }

function showErr(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 5000);
}

function setLoading(id, on) {
  const btn  = document.getElementById(id);
  const lbl  = btn.querySelector(".btn-label");
  const spin = btn.querySelector(".btn-spin");
  btn.disabled = on;
  lbl.classList.toggle("hidden", on);
  spin.classList.toggle("hidden", !on);
}

function timeAgo(ts) {
  if (!ts) return "—";
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function relay(settings) {
  chrome.runtime.sendMessage({ action: "SETTINGS_UPDATED", settings }).catch(() => {});
}