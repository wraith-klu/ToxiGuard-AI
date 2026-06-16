// ============================================================
// ToxiGuard AI — Options / SaaS Analytics JavaScript v2.0
// ============================================================

let TG_API = "https://toxiguard-ai-agent-v3.onrender.com";

// Fetch the dynamic base URL from background on load
chrome.runtime.sendMessage({ action: "GET_API_URL" }, (res) => {
  if (res && res.url) {
    TG_API = res.url;
    console.log("🔗 Dynamic API configured:", TG_API);
  }
});

// ─── Local state ──────────────────────────────────────────────
let settings = {};

// ─── DOM Boot ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  bindNavigation();
  bindActions();
});

// ─── Core data loader ─────────────────────────────────────────
async function loadData() {
  settings = await new Promise(r => chrome.storage.local.get(null, r));
  
  if (!settings.api_key) {
    alert("Please log in via the extension popup first to view analytics.");
    return;
  }

  // Update profile info
  const email = settings.user_email || "developer@toxiguard.ai";
  const plan = settings.user_plan || "free";
  
  document.getElementById("sideUserEmail").textContent = email;
  document.getElementById("sideUserAvatar").textContent = email.charAt(0).toUpperCase();
  document.getElementById("sideUserPlan").textContent = `${plan.toUpperCase()} Account`;
  
  // Update stats counters
  const stats = settings.stats || { scanned_total: 0, toxic_total: 0, recent: [] };
  const totalScanned = stats.scanned_total || 0;
  const totalToxic = stats.toxic_total || 0;
  const ratio = totalScanned > 0 ? Math.round((totalToxic / totalScanned) * 100) : 0;

  document.getElementById("statProcessed").textContent = totalScanned.toLocaleString();
  document.getElementById("statToxic").textContent = totalToxic.toLocaleString();
  document.getElementById("statToxicityRatio").textContent = `${ratio}% toxicity rate flagged`;

  // Sync Global checkbox, Backend URL and Frontend URL
  document.getElementById("optionsGlobalSw").checked = settings.enabled !== false;
  document.getElementById("optionsSensLabel").textContent = cap(settings.sensitivity || "medium");
  document.getElementById("optionsBackendUrl").value = settings.api_url || "https://toxiguard-ai-agent-v3.onrender.com";
  document.getElementById("optionsFrontendUrl").value = settings.web_url || "https://toxiai-agent.vercel.app";

  // Load API limits
  const usageLimit = plan === "pro" ? 50000 : 1000;
  const usagePercent = Math.min(Math.round((totalScanned / usageLimit) * 100), 100);
  document.getElementById("statUsage").textContent = `${usagePercent}%`;
  document.getElementById("statUsageDesc").textContent = `${totalScanned.toLocaleString()} / ${usageLimit.toLocaleString()} monthly analyses`;

  // Render platform charts
  renderPlatformCharts(stats.recent || []);

  // Sync dev integration tab
  document.getElementById("devApiKeyField").value = settings.api_key;

  // Render recent table
  renderHistoryTable(stats.recent || []);

  // Update billing tab visual
  updateBillingTab(plan);
}

// ─── Render Platform Chart (dependency-free) ──────────────────
function renderPlatformCharts(recentList) {
  const counts = {
    instagram: 0,
    twitter:   0,
    youtube:   0,
    reddit:    0,
    linkedin:  0,
    facebook:  0,
    tiktok:    0,
    threads:   0
  };
  
  recentList.forEach(item => {
    if (counts.hasOwnProperty(item.platform)) {
      counts[item.platform]++;
    }
  });

  const chartWrap = document.getElementById("platformChart");
  chartWrap.innerHTML = ""; // Clear existing

  const maxVal = Math.max(...Object.values(counts), 1);
  const labels = {
    instagram: "Insta",
    twitter:   "Twitter",
    youtube:   "YT",
    reddit:    "Reddit",
    linkedin:  "L-In",
    facebook:  "FB",
    tiktok:    "TikTok",
    threads:   "Threads"
  };

  const colors = {
    instagram: "#d62976",
    twitter:   "#1da1f2",
    youtube:   "#ff0000",
    reddit:    "#ff4500",
    linkedin:  "#0a66c2",
    facebook:  "#1877f2",
    tiktok:    "#ff0050",
    threads:   "#000000"
  };

  Object.entries(counts).forEach(([platform, val]) => {
    const pct = Math.round((val / maxVal) * 90) + 10; // minimum height 10% for visualization
    const barCol = document.createElement("div");
    barCol.className = "chart-bar-col";
    barCol.innerHTML = `
      <div class="chart-bar-tooltip">${val} Flagged</div>
      <div class="chart-bar" style="height: ${pct}%; background: linear-gradient(180deg, ${colors[platform]}, ${colors[platform]}33);"></div>
      <div class="chart-x-label">${labels[platform]}</div>
    `;
    chartWrap.appendChild(barCol);
  });
}

// ─── Render Audit Logs ────────────────────────────────────────
function renderHistoryTable(recentList, filterText = "") {
  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = "";

  if (recentList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No logs recorded. Visit Instagram, Twitter, etc., to moderate comments!</td></tr>`;
    return;
  }

  const query = filterText.toLowerCase().trim();
  const filtered = recentList.filter(item => {
    return (item.text || "").toLowerCase().includes(query) || 
           (item.platform || "").toLowerCase().includes(query) ||
           (item.severity || "").toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No logs match your search.</td></tr>`;
    return;
  }

  const pfLabels = {
    instagram: "🟣 Instagram",
    twitter:   "🐦 Twitter/X",
    youtube:   "🔴 YouTube",
    reddit:    "🟠 Reddit",
    linkedin:  "💼 LinkedIn",
    facebook:  "📘 Facebook",
    tiktok:    "🎵 TikTok",
    threads:   "🧵 Threads"
  };

  filtered.forEach(item => {
    const row = document.createElement("tr");
    const pf = pfLabels[item.platform] || `🌐 ${item.platform}`;
    const time = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const conf = Math.round((item.confidence || 0) * 100);
    const sev = item.severity || "medium";

    row.innerHTML = `
      <td style="font-weight: 600;">${pf}</td>
      <td style="white-space: normal; word-break: break-all;">"${esc(item.text)}"</td>
      <td><span class="badge-sev sev-${sev}">${sev.toUpperCase()}</span></td>
      <td style="font-family: monospace; font-weight: 700; color: var(--accent);">${conf}%</td>
      <td style="color: var(--text-muted);">${time}</td>
    `;
    tbody.appendChild(row);
  });
}

// ─── Bind Navigation Tabs ─────────────────────────────────────
function bindNavigation() {
  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => {
      // Toggle sidebar active state
      document.querySelectorAll(".menu-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      // Toggle tab layouts
      const targetTab = item.dataset.tab;
      document.querySelectorAll(".tab-content").forEach(tc => tc.style.display = "none");
      document.getElementById(`tab-${targetTab}`).style.display = "block";

      // Update page title text
      const titles = {
        analytics: ["Analytics & Logs", "Monitor real-time toxicity detection and system usage."],
        history: ["Blocking History", "Review comments blocked by our AI across your social networks."],
        "api-keys": ["Developer Integrations", "Raw endpoint keys to implement automated safety rules into your backends."],
        billing: ["SaaS Plans & Subscription", "Choose your scanning quota for ML-powered moderation."]
      };
      
      const [h, s] = titles[targetTab];
      document.getElementById("pageMainHeader").textContent = h;
      document.getElementById("pageMainSub").textContent = s;
    });
  });
}

// ─── Interactive Actions ──────────────────────────────────────
function bindActions() {
  // Save Backend URL
  document.getElementById("saveBackendUrlBtn").addEventListener("click", async () => {
    const newUrl = document.getElementById("optionsBackendUrl").value.trim().replace(/\/$/, "");
    if (!newUrl) {
      alert("Please enter a valid Backend API Server URL.");
      return;
    }
    await chrome.storage.local.set({ api_url: newUrl });
    chrome.runtime.sendMessage({ action: "SETTINGS_UPDATED", settings: { api_url: newUrl } }).catch(() => {});
    alert("Backend Server URL updated successfully!");
    location.reload();
  });

  // Save Frontend URL
  document.getElementById("saveFrontendUrlBtn").addEventListener("click", async () => {
    const newUrl = document.getElementById("optionsFrontendUrl").value.trim().replace(/\/$/, "");
    if (!newUrl) {
      alert("Please enter a valid Frontend Web Portal URL.");
      return;
    }
    await chrome.storage.local.set({ web_url: newUrl });
    chrome.runtime.sendMessage({ action: "SETTINGS_UPDATED", settings: { web_url: newUrl } }).catch(() => {});
    alert("Frontend Web Portal URL updated successfully!");
    location.reload();
  });

  // Sync global moderation check
  document.getElementById("optionsGlobalSw").addEventListener("change", async (e) => {
    await chrome.storage.local.set({ enabled: e.target.checked });
    chrome.runtime.sendMessage({ action: "SETTINGS_UPDATED", settings: { enabled: e.target.checked } }).catch(() => {});
  });

  // Toggle sensitivity slider via option button
  document.getElementById("optionsSensToggleBtn").addEventListener("click", async () => {
    const levels = ["low", "medium", "high"];
    let idx = levels.indexOf(settings.sensitivity || "medium");
    idx = (idx + 1) % 3;
    
    settings.sensitivity = levels[idx];
    document.getElementById("optionsSensLabel").textContent = cap(levels[idx]);
    await chrome.storage.local.set({ sensitivity: levels[idx] });
    chrome.runtime.sendMessage({ action: "SETTINGS_UPDATED", settings: { sensitivity: levels[idx] } }).catch(() => {});
  });

  // Export Stats as CSV
  document.getElementById("exportStatsBtn").addEventListener("click", () => {
    const recent = settings.stats?.recent || [];
    if (recent.length === 0) {
      alert("No data available to export.");
      return;
    }

    let csv = "Platform,Text,Severity,Confidence,Timestamp\n";
    recent.forEach(row => {
      const cleanText = (row.text || "").replace(/"/g, '""');
      csv += `${row.platform},"${cleanText}",${row.severity},${row.confidence || 0},"${new Date(row.time).toISOString()}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `toxiguard_blocked_comments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Reset Stats Logs
  document.getElementById("resetStatsBtn").addEventListener("click", async () => {
    if (confirm("Are you sure you want to clear your local blocking statistics? This cannot be undone.")) {
      const stats = {
        scanned_total: 0,
        toxic_total: 0,
        scanned_today: 0,
        toxic_today: 0,
        last_reset: new Date().toDateString(),
        recent: []
      };
      await chrome.storage.local.set({ stats });
      alert("Statistics reset completed!");
      location.reload();
    }
  });

  // Search input in blocking history
  document.getElementById("historySearchInput").addEventListener("input", (e) => {
    const recent = settings.stats?.recent || [];
    renderHistoryTable(recent, e.target.value);
  });

  // Dev API Key Copying
  document.getElementById("copyDevKeyBtn").addEventListener("click", () => {
    const key = document.getElementById("devApiKeyField").value;
    navigator.clipboard.writeText(key).then(() => {
      const btn = document.getElementById("copyDevKeyBtn");
      btn.textContent = "Copied! ✓";
      btn.style.background = "#10b981";
      setTimeout(() => {
        btn.textContent = "Copy Key";
        btn.style.background = "";
      }, 2000);
    });
  });

  // Sync to chrome settings button
  document.getElementById("dashboardSettingsBtn").addEventListener("click", () => {
    alert("Please use the extension icon popup in your toolbar to fine-tune active moderation switches!");
  });

  // Refresh
  document.getElementById("refreshBtn").addEventListener("click", () => {
    location.reload();
  });

  // Simulated upgrade to Pro button (makes direct call or saves local mock user subscription)
  document.getElementById("billingUpgradeBtn").addEventListener("click", async () => {
    const apiKey = settings.api_key;
    if (!apiKey) return;
    
    // Call server API if possible to toggle mock plan or simulate billing success
    try {
      const res = await fetch(`${TG_API}/predict/ml`, { // simple ML-only check to confirm active connection
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ text: "test connection" })
      });
      
      if (res.ok) {
        // Upgrade simulated on client/server side
        await chrome.storage.local.set({ user_plan: "pro" });
        alert("Subscription upgraded successfully! You are now on SaaS Premium Pro with 50,000 requests limit.");
        location.reload();
      }
    } catch {
      alert("Simulated Stripe gateway timed out. Please verify your connection to the ToxiGuard Cloud backend!");
    }
  });
}

function updateBillingTab(plan) {
  const freeBtn = document.getElementById("billingDowngradeBtn");
  const proBtn = document.getElementById("billingUpgradeBtn");

  if (plan === "pro") {
    freeBtn.textContent = "Switch to Free";
    freeBtn.disabled = false;
    freeBtn.onclick = async () => {
      await chrome.storage.local.set({ user_plan: "free" });
      alert("Downgraded to free trial.");
      location.reload();
    };

    proBtn.textContent = "Premium Pro Active ✓";
    proBtn.disabled = true;
    proBtn.style.background = "rgba(16, 185, 129, 0.1)";
    proBtn.style.color = "#10b981";
    proBtn.style.border = "1px solid rgba(16, 185, 129, 0.3)";
    document.getElementById("pricingProCard").classList.add("premium");
  }
}

// ─── Utility helpers ──────────────────────────────────────────
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ""; }
function esc(t) { return t.replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[m]); }
