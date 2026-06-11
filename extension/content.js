// ============================================================
// ToxiGuard AI — Advanced Multi-Platform Content Script v3.0
// Supports: Instagram · Twitter/X · YouTube · Reddit · LinkedIn
//           Facebook · TikTok · Threads
// Features: Floating Action Button (FAB) · Mobile Touch Support
// ============================================================


// ─── Platform Detection ───────────────────────────────────────

const TG_PLATFORM = (() => {
  const h = location.hostname;
  if (h.includes("instagram"))                      return "instagram";
  if (h.includes("twitter") || h.includes("x.com")) return "twitter";
  if (h.includes("youtube"))                        return "youtube";
  if (h.includes("reddit"))                         return "reddit";
  if (h.includes("linkedin"))                       return "linkedin";
  if (h.includes("facebook") || h.includes("fb.com")) return "facebook";
  if (h.includes("tiktok"))                         return "tiktok";
  if (h.includes("threads.net"))                    return "threads";
  return "unknown";
})();

// ─── Mobile Detection ─────────────────────────────────────────

const TG_IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || (window.innerWidth <= 768);

// ─── Platform Selectors ───────────────────────────────────────

const TG_SEL = {
  instagram: {
    items:       "article ul li, div[role='dialog'] ul li, main ul li",
    needsUser:   null,
    textTargets: ["span[dir='auto']", "span[dir='ltr']", "span"],
    skipPattern: /^(Reply|Like|See translation|Edited|Follow|More|Report|less|View all \d+ replies|Hidden by Instagram|Add a comment\.\.\.|View replies|View all comments)$/i,
    minLen: 6
  },
  twitter: {
    items:       "article[data-testid='tweet']",
    needsUser:   null,
    textTargets: ["[data-testid='tweetText']", "[lang]"],
    skipPattern: null,
    minLen: 6
  },
  youtube: {
    items:       "ytd-comment-thread-renderer, ytd-comment-renderer",
    needsUser:   null,
    textTargets: ["#content-text", "#content-text span"],
    skipPattern: null,
    minLen: 6
  },
  reddit: {
    items:       "[data-testid='comment'], .Comment, shreddit-comment",
    needsUser:   null,
    textTargets: [
      "[data-click-id='text'] p",
      ".RichTextJSON-root p",
      ".md p",
      "p[id*='post-rtjson']"
    ],
    skipPattern: null,
    minLen: 6
  },
  linkedin: {
    items:       ".comments-comment-item, .feed-shared-update-v2, .comments-comment-entity",
    needsUser:   null,
    textTargets: [
      ".comments-comment-item__main-content span[dir='ltr']",
      ".feed-shared-text span",
      ".comments-comment-entity__content span"
    ],
    skipPattern: null,
    minLen: 6
  },
  facebook: {
    items:       "[role='article'], div[data-testid='UFI2Comment/body'], .x1lliihq",
    needsUser:   null,
    textTargets: [
      "[data-ad-preview='message'] span",
      "[dir='auto'] span",
      ".x1lliihq span[dir='auto']",
      "div[dir='auto']"
    ],
    skipPattern: /^(Like|Reply|Share|Comment|See more|Edited|Write a comment|Most relevant)$/i,
    minLen: 6
  },
  tiktok: {
    items:       "[data-e2e='comment-item'], .comment-item-wrapper, [class*='DivCommentItemContainer']",
    needsUser:   null,
    textTargets: [
      "[data-e2e='comment-level-1'] span",
      "[data-e2e='comment-text'] span",
      "p[data-e2e='comment-level-1']",
      "[class*='SpanCommentText']"
    ],
    skipPattern: /^(Reply|Like|Share|Report)$/i,
    minLen: 6
  },
  threads: {
    items:       "[data-pressable-container] > div, article div[role='presentation']",
    needsUser:   null,
    textTargets: [
      "span[dir='auto']",
      "span[dir='ltr']",
      "div[dir='auto'] span"
    ],
    skipPattern: /^(Reply|Like|Repost|Quote|Share|Report)$/i,
    minLen: 6
  },
  unknown: null
};

// ─── State ────────────────────────────────────────────────────

let tgSettings  = {};
let tgQueue     = [];
let tgScanning  = false;
let tgTooltip   = null;
let tgActive    = false;
let tgFab       = null;
let tgFabPanel  = null;

// ─── Messaging ────────────────────────────────────────────────

function tgGetSettings() {
  return new Promise(resolve => {
    try {
      chrome.runtime.sendMessage({ action: "GET_SETTINGS" }, res => {
        if (chrome.runtime.lastError) { resolve({}); return; }
        resolve(res || {});
      });
    } catch { resolve({}); }
  });
}

function tgReport(payload) {
  try { chrome.runtime.sendMessage({ action: "REPORT_SCAN", ...payload }); }
  catch {}
}

// ─── API Call ─────────────────────────────────────────────────

async function tgAnalyze(text) {
  return new Promise(resolve => {
    try {
      chrome.runtime.sendMessage({ action: "ANALYZE_TEXT", text }, response => {
        if (chrome.runtime.lastError || !response?.ok) {
          resolve(null);
          return;
        }
        resolve(response.result || null);
      });
    } catch {
      resolve(null);
    }
  });
}

async function tgQuickAnalyze(text, deep = false) {
  return new Promise(resolve => {
    try {
      chrome.runtime.sendMessage({ action: "ANALYZE_QUICK", text, deep }, response => {
        if (chrome.runtime.lastError || !response?.ok) {
          resolve(null);
          return;
        }
        resolve(response.result || null);
      });
    } catch {
      resolve(null);
    }
  });
}

function tgConfidence(result) {
  const ml = result?.ml || {};
  const labels = result?.labels || ml.labels || {};
  const labelScores = Object.values(labels).map(Number).filter(Number.isFinite);
  return Math.max(
    Number(result?.confidence) || 0,
    Number(result?.toxicity_probability) || 0,
    Number(ml.toxicity_probability) || 0,
    ...labelScores
  );
}

function tgCategory(result) {
  const ml = result?.ml || {};
  const detected = result?.detected_categories || ml.detected_categories || [];
  return result?.category || detected[0] || result?.label || ml.label || result?.source || "ml";
}

function tgReason(result) {
  return result?.reason || (
    result?.toxic
      ? `ML model flagged this as ${tgCategory(result)}.`
      : "ML model did not detect toxicity."
  );
}

function tgToxicFlag(result) {
  if (!result) return false;

  const toxicLabels = new Set([
    "abusive", "toxic", "severe_toxic", "obscene",
    "threat", "insult", "identity_hate"
  ]);
  const label = String(result.label || result.ml?.label || "").toLowerCase();
  const detected = (result.detected_categories || result.ml?.detected_categories || [])
    .map(v => String(v).toLowerCase());

  return (
    result.toxic === true ||
    result.is_toxic === true ||
    result.ml?.toxic === true ||
    toxicLabels.has(label) ||
    detected.some(category => toxicLabels.has(category))
  );
}

// ─── Toxicity Decision ────────────────────────────────────────

function tgIsToxic(result) {
  if (!result) return false;
  const flagged = tgToxicFlag(result);
  const conf = tgConfidence(result);
  // Accept if explicitly flagged AND above threshold,
  // OR if confidence is very high (≥0.62) even if flag is ambiguous (catches
  // legacy ML model edge cases where toxic field may be inconsistent)
  const thresholds = { low: 0.72, medium: 0.48, high: 0.28 };
  const baseThreshold = thresholds[tgSettings.sensitivity] || 0.48;
  if (flagged && conf >= baseThreshold) return true;
  // High-confidence override — catches backend "toxic:false" with high probability
  if (conf >= 0.62 && result.source !== "demo") return true;
  // Demo mode: slightly relaxed
  if (result._demo || result.demo) return flagged && conf >= (baseThreshold - 0.08);
  return false;
}

function tgGetSeverity(result) {
  if (result.severity && ["high", "medium", "low"].includes(result.severity))
    return result.severity;
  const c = tgConfidence(result);
  if (c >= 0.82) return "high";
  if (c >= 0.57) return "medium";
  return "low";
}

// ─── Tooltip ──────────────────────────────────────────────────

function tgEnsureTooltip() {
  if (tgTooltip && document.body.contains(tgTooltip)) return tgTooltip;
  tgTooltip = document.createElement("div");
  tgTooltip.id = "tg-global-tooltip";
  document.body.appendChild(tgTooltip);
  return tgTooltip;
}

function tgShowTooltip(anchor, result) {
  const tt = tgEnsureTooltip();
  const sev   = tgGetSeverity(result);
  const conf  = Math.round(tgConfidence(result) * 100);
  const cat   = tgCategory(result);
  const reason = tgReason(result).slice(0, 130);
  const words  = (result.abusive_words || []).slice(0, 4);

  const colors = { high: "#ff3b3b", medium: "#ff8c00", low: "#ffd700" };
  const icons  = { high: "🚨", medium: "⚠️", low: "⚡" };
  const color  = colors[sev] || "#ff3b3b";

  tt.innerHTML = `
    <div class="tg-tt-header">
      <span class="tg-tt-icon">${icons[sev]}</span>
      <span class="tg-tt-title">Toxic Content Detected</span>
      <span class="tg-tt-sevbadge" style="background:${color}22;color:${color};border:1px solid ${color}44">${sev.toUpperCase()}</span>
    </div>
    <div class="tg-tt-body">
      <div class="tg-tt-row">
        <span class="tg-tt-lbl">Confidence</span>
        <span class="tg-tt-val" style="color:${color}">${conf}%</span>
      </div>
      <div class="tg-conf-bar">
        <div class="tg-conf-fill" style="width:${conf}%;background:linear-gradient(90deg,${color},${color}88)"></div>
      </div>
      ${cat !== "safe" ? `
      <div class="tg-tt-row">
        <span class="tg-tt-lbl">Category</span>
        <span class="tg-tt-val">${cat}</span>
      </div>` : ""}
      ${words.length ? `
      <div class="tg-tt-row" style="margin-top:6px">
        <span class="tg-tt-lbl">Flagged Phrases</span>
      </div>
      <div class="tg-tt-words">
        ${words.map(w => `<span class="tg-tt-word">${w}</span>`).join("")}
      </div>` : ""}
      <div class="tg-tt-reason">${reason}</div>
    </div>
    <div class="tg-tt-footer">ToxiGuard AI v3.0 — ${result.llm_used ? "LLM + ML" : "ML model"}</div>
  `;

  // Position tooltip — mobile-aware
  const rect = anchor.getBoundingClientRect();
  if (TG_IS_MOBILE) {
    tt.style.left = "8px";
    tt.style.right = "8px";
    tt.style.width = "auto";
    tt.style.top = (rect.bottom + 8 + window.scrollY) + "px";
  } else {
    tt.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 296)) + "px";
    tt.style.top  = (rect.bottom + 10 + window.scrollY) + "px";
    tt.style.right = "auto";
    tt.style.width = "";
  }
  tt.classList.add("tg-tt-visible");
}

function tgHideTooltip() {
  if (tgTooltip) tgTooltip.classList.remove("tg-tt-visible");
}

// ─── Apply Result to DOM ──────────────────────────────────────

function tgApply(row, textEl, result) {
  const mode = tgSettings.mode || "highlight";
  const sev  = tgGetSeverity(result);

  row.dataset.tgChecked = "toxic";

  if (mode === "hide") {
    row.style.display = "none";
    return;
  }

  if (mode === "blur") {
    row.classList.add("tg-highlight", `tg-severity-${sev}`);
    textEl.classList.add("tg-blur-text");

    const btn = document.createElement("button");
    btn.className = "tg-reveal-btn";
    btn.innerHTML = `👁️ Show comment (${sev} risk)`;
    const revealHandler = (e) => {
      e.stopPropagation();
      e.preventDefault();
      textEl.classList.remove("tg-blur-text");
      btn.remove();
    };
    btn.addEventListener("click", revealHandler);
    btn.addEventListener("touchend", revealHandler);
    if (textEl.parentNode) textEl.parentNode.insertBefore(btn, textEl.nextSibling);
    return;
  }

  // Default: highlight
  row.classList.add("tg-highlight", `tg-severity-${sev}`);

  const badge = document.createElement("span");
  badge.className = `tg-badge tg-badge-${sev}`;
  const icons  = { high: "🚨", medium: "⚠️", low: "⚡" };
  const labels = { high: "TOXIC", medium: "WARN", low: "FLAG" };
  badge.textContent = `${icons[sev]} ${labels[sev]} ${Math.round(tgConfidence(result)*100)}%`;

  // Mobile: use tap instead of hover
  if (TG_IS_MOBILE) {
    badge.addEventListener("touchstart", (e) => {
      e.preventDefault();
      tgShowTooltip(badge, result);
      setTimeout(() => tgHideTooltip(), 4000);
    });
  } else {
    badge.addEventListener("mouseenter", () => tgShowTooltip(badge, result));
    badge.addEventListener("mouseleave", () => tgHideTooltip());
  }
  row.appendChild(badge);
}

// ─── Get Comments Per Platform ────────────────────────────────

function tgCleanText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function tgIsIgnoredUiText(text, skipPattern, minLen) {
  const clean = tgCleanText(text);
  if (!clean || clean.length < minLen) return true;
  if (skipPattern && skipPattern.test(clean)) return true;
  if (/^\d+[wdhms]$/i.test(clean)) return true;
  if (/^\d+(\.\d+)?[kKmM]?$/.test(clean)) return true;
  if (/^[@#]?[a-z0-9._]{2,30}$/i.test(clean) && !/\b(fuck\w*|bitch\w*|shit\w*|cum|idiot\w*|moron\w*|stupid|kill\w*|asshole\w*)\b/i.test(clean)) {
    return true;
  }
  return false;
}

function tgIsChromeUiElement(el) {
  return Boolean(el.closest(
    "nav, header, footer, aside, button, textarea, input, select, option, svg, " +
    "[role='navigation'], [aria-label='Like'], [aria-label='Reply'], " +
    ".tg-badge, #tg-global-tooltip, #tg-fab, #tg-fab-panel"
  ));
}

function tgInstagramRowFor(el) {
  return (
    el.closest("li") ||
    el.closest("article ul > div") ||
    el.closest("div[role='dialog'] ul > div") ||
    el.closest("article") ||
    el.parentElement
  );
}

function tgGetInstagramComments() {
  const sel = TG_SEL.instagram;
  const results = [];
  const seen = new Set();

  document
    .querySelectorAll("article span, div[role='dialog'] span, main span, ul li span, div[class*='Comment'] span")
    .forEach(el => {
      if (el.dataset.tgChecked) return;

      // Relaxed span check: only skip if there is a substantial nested span (>15 chars),
      // allowing emojis/user tags/small styles inside the comment to pass.
      if (el.querySelector("span")) {
        const innerSpans = el.querySelectorAll("span");
        let hasSubstantialSpan = false;
        for (const s of innerSpans) {
          if (s.textContent.trim().length > 15) {
            hasSubstantialSpan = true;
            break;
          }
        }
        if (hasSubstantialSpan) return;
      }
      
      if (el.closest("h1, h2, h3, time, button, a")) return;
      if (tgIsChromeUiElement(el)) return;

      const text = tgCleanText(el.innerText || el.textContent || "");
      if (tgIsIgnoredUiText(text, sel.skipPattern, sel.minLen)) return;

      const row = tgInstagramRowFor(el);
      if (!row || row.dataset.tgChecked === "toxic") return;

      const key = `${TG_PLATFORM}:${text.slice(0, 160)}`;
      if (seen.has(key)) return;
      seen.add(key);

      results.push({ row, textEl: el, text });
    });

  return results;
}

function tgGetComments() {
  const sel = TG_SEL[TG_PLATFORM];
  if (!sel) return [];
  if (TG_PLATFORM === "instagram") return tgGetInstagramComments();

  const results = [];
  const seen = new Set();

  document.querySelectorAll(sel.items).forEach(item => {
    if (item.dataset.tgChecked === "toxic") return;
    if (sel.needsUser && !item.querySelector(sel.needsUser)) return;

    for (const targetSel of sel.textTargets) {
      const els = item.querySelectorAll(targetSel);
      els.forEach(el => {
        const text = tgCleanText(el.innerText || el.textContent || "");
        if (tgIsIgnoredUiText(text, sel.skipPattern, sel.minLen)) return;
        if (el.dataset.tgChecked) return;
        const key = `${TG_PLATFORM}:${text.slice(0, 160)}`;
        if (seen.has(key)) return;
        seen.add(key);

        results.push({ row: item, textEl: el, text });
      });
    }
  });

  return results;
}

// ─── Queue Processor ──────────────────────────────────────────

async function tgProcessQueue() {
  if (tgScanning || tgQueue.length === 0) return;
  tgScanning = true;

  while (tgQueue.length > 0) {
    const { row, textEl, text } = tgQueue.shift();

    if (row.dataset.tgChecked === "toxic") continue;
    if (textEl.dataset.tgChecked) continue;

    textEl.dataset.tgChecked = "pending";

    const result = await tgAnalyze(text);

    if (!result) {
      textEl.dataset.tgChecked = "error";
      await new Promise(r => setTimeout(r, 500));
      continue;
    }

    tgReport({ scanned: 1, platform: TG_PLATFORM });

    if (tgIsToxic(result)) {
      tgApply(row, textEl, result);
      tgReport({
        toxic: true,
        platform: TG_PLATFORM,
        text,
        severity: tgGetSeverity(result),
        confidence: tgConfidence(result),
        category: tgCategory(result)
      });
    } else {
      textEl.dataset.tgChecked = "clean";
    }

    // Keep feed scanning under the ML-only API rate limit.
    await new Promise(r => setTimeout(r, 550));
  }

  tgScanning = false;
}

// ─── Main Scan Trigger ────────────────────────────────────────

async function tgScan() {
  if (!tgActive) {
    tgSettings = await tgGetSettings();
    tgActive = true;
  }

  // Only block if extension is explicitly disabled — missing api_key
  // now falls through to demo mode handled in background.js
  if (!tgSettings.enabled) return;

  const platforms = tgSettings.platforms || {};
  if (platforms[TG_PLATFORM] === false) return;

  const comments = tgGetComments();
  if (comments.length === 0) return;

  tgQueue.push(...comments);
  tgProcessQueue();
}

// ─── Reset & Rescan ───────────────────────────────────────────

function tgReset() {
  document.querySelectorAll("[data-tg-checked]").forEach(el => {
    delete el.dataset.tgChecked;
  });

  document.querySelectorAll(".tg-badge").forEach(b => b.remove());

  document.querySelectorAll(".tg-highlight").forEach(el => {
    el.classList.remove("tg-highlight", "tg-severity-high", "tg-severity-medium", "tg-severity-low");
  });

  document.querySelectorAll(".tg-blur-text").forEach(el => el.classList.remove("tg-blur-text"));
  document.querySelectorAll(".tg-reveal-btn").forEach(b => b.remove());

  tgQueue = [];
  tgScanning = false;
}

// ─── Toast ────────────────────────────────────────────────────

function tgToast(msg, icon = "🛡️") {
  const t = document.createElement("div");
  t.className = "tg-toast";
  t.innerHTML = `<span class="tg-toast-icon">${icon}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("tg-toast-in"));
  setTimeout(() => {
    t.classList.remove("tg-toast-in");
    setTimeout(() => t.remove(), 350);
  }, 3000);
}


// ─── Text Selection Context Analysis ──────────────────────────

let tgSelectionBtn = null;
let tgSelectedText = "";

function tgCreateSelectionBtn() {
  if (tgSelectionBtn) return tgSelectionBtn;
  tgSelectionBtn = document.createElement("div");
  tgSelectionBtn.className = "tg-selection-btn";
  tgSelectionBtn.innerHTML = "<span>🛡️</span>";
  tgSelectionBtn.style.display = "none";
  document.body.appendChild(tgSelectionBtn);

  tgSelectionBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  tgSelectionBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tgSelectedText) return;

    tgSelectionBtn.classList.add("tg-selection-btn-loading");

    const result = await tgQuickAnalyze(tgSelectedText, false);

    tgSelectionBtn.classList.remove("tg-selection-btn-loading");

    if (result) {
      tgShowTooltip(tgSelectionBtn, result);
    } else {
      tgToast("ToxiGuard: Analysis failed.", "❌");
    }
  });

  return tgSelectionBtn;
}

function tgHandleSelection() {
  const sel = window.getSelection();
  const text = sel.toString().trim();

  // Hide button if selection is invalid
  if (!text || text.length < 4 || text.length > 800) {
    if (tgSelectionBtn) {
      tgSelectionBtn.style.display = "none";
    }
    return;
  }

  tgSelectedText = text;
  const btn = tgCreateSelectionBtn();

  try {
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      btn.style.display = "none";
      return;
    }

    const x = rect.left + rect.width / 2 + window.scrollX - 16;
    const y = rect.top + window.scrollY - 38;

    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;
    btn.style.display = "flex";
  } catch (e) {
    btn.style.display = "none";
  }
}

document.addEventListener("mouseup", (e) => {
  if (tgIsChromeUiElement(e.target)) return;
  setTimeout(tgHandleSelection, 10);
});

document.addEventListener("mousedown", (e) => {
  if (tgSelectionBtn && e.target !== tgSelectionBtn && !tgSelectionBtn.contains(e.target)) {
    tgSelectionBtn.style.display = "none";
  }
  const tt = document.getElementById("tg-global-tooltip");
  if (tt && !tt.contains(e.target) && e.target !== tgSelectionBtn) {
    tgHideTooltip();
  }
});


// ═══════════════════════════════════════════════════════════════
//  FLOATING ACTION BUTTON (FAB) — Quick Analyze Widget
// ═══════════════════════════════════════════════════════════════

function tgCreateFab() {
  if (tgFab) return;

  // FAB button
  tgFab = document.createElement("div");
  tgFab.id = "tg-fab";
  tgFab.innerHTML = `
    <div class="tg-fab-btn" id="tg-fab-trigger">
      <span class="tg-fab-icon">🛡️</span>
    </div>
  `;
  document.body.appendChild(tgFab);

  // FAB Panel (inline mini-analyzer)
  tgFabPanel = document.createElement("div");
  tgFabPanel.id = "tg-fab-panel";
  tgFabPanel.innerHTML = `
    <div class="tg-fabp-header">
      <span class="tg-fabp-logo">🛡️</span>
      <span class="tg-fabp-title">ToxiGuard AI</span>
      <button class="tg-fabp-close" id="tg-fabp-close">✕</button>
    </div>
    <div class="tg-fabp-body">
      <textarea id="tg-fabp-input" class="tg-fabp-textarea" placeholder="Paste or type text to analyze for toxicity..." rows="3"></textarea>
      <div class="tg-fabp-actions">
        <button class="tg-fabp-btn tg-fabp-btn-primary" id="tg-fabp-analyze">
          <span class="tg-fabp-btn-label">⚡ Quick Scan</span>
        </button>
        <button class="tg-fabp-btn tg-fabp-btn-secondary" id="tg-fabp-deep">
          <span class="tg-fabp-btn-label">🧠 Deep AI</span>
        </button>
      </div>
      <div id="tg-fabp-result" class="tg-fabp-result" style="display:none;"></div>
    </div>
    <div class="tg-fabp-footer">
      Scanning on <strong>${tgPlatformLabel()}</strong> · v3.0
    </div>
  `;
  document.body.appendChild(tgFabPanel);

  // Show demo warning if no API key exists (not logged in)
  if (!tgSettings.api_key) {
    const demoWarning = document.createElement("div");
    demoWarning.className = "tg-fabp-demo-badge";
    demoWarning.style.margin = "0 0 10px 0";
    demoWarning.style.padding = "8px 12px";
    demoWarning.style.borderRadius = "12px";
    demoWarning.style.background = "rgba(245, 158, 11, 0.1)";
    demoWarning.style.border = "1px solid rgba(245, 158, 11, 0.25)";
    demoWarning.style.color = "#fbbf24";
    demoWarning.style.fontSize = "11px";
    demoWarning.style.textAlign = "center";
    const optionsUrl = chrome.runtime.getURL("options.html");
    demoWarning.innerHTML = `⚠️ <strong>Guest Mode:</strong> You are not logged in. Feed scanning is active, but quick scan is limited to 5 requests/min. <a href="${optionsUrl}" target="_blank" style="color:#60a5fa;text-decoration:underline;">Log in / Register</a>`;
    tgFabPanel.querySelector(".tg-fabp-body").prepend(demoWarning);
  }

  // Event listeners
  const trigger = document.getElementById("tg-fab-trigger");
  const closeBtn = document.getElementById("tg-fabp-close");
  const analyzeBtn = document.getElementById("tg-fabp-analyze");
  const deepBtn = document.getElementById("tg-fabp-deep");

  const togglePanel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    tgFabPanel.classList.toggle("tg-fabp-visible");
    tgFab.classList.toggle("tg-fab-active");
  };

  trigger.addEventListener("click", togglePanel);
  trigger.addEventListener("touchend", (e) => {
    e.preventDefault();
    togglePanel(e);
  });

  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    tgFabPanel.classList.remove("tg-fabp-visible");
    tgFab.classList.remove("tg-fab-active");
  });

  analyzeBtn.addEventListener("click", () => tgFabRunAnalysis(false));
  deepBtn.addEventListener("click", () => tgFabRunAnalysis(true));

  // Make FAB draggable on mobile
  if (TG_IS_MOBILE) {
    let isDragging = false;
    let startY = 0, startTop = 0;

    trigger.addEventListener("touchstart", (e) => {
      isDragging = false;
      startY = e.touches[0].clientY;
      startTop = tgFab.offsetTop;
    }, { passive: true });

    trigger.addEventListener("touchmove", (e) => {
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dy) > 10) {
        isDragging = true;
        const newTop = Math.max(60, Math.min(window.innerHeight - 80, startTop + dy));
        tgFab.style.bottom = "auto";
        tgFab.style.top = newTop + "px";
      }
    }, { passive: true });
  }
}

async function tgFabRunAnalysis(deep) {
  const input = document.getElementById("tg-fabp-input");
  const resultEl = document.getElementById("tg-fabp-result");
  const text = input.value.trim();

  if (!text) {
    resultEl.style.display = "block";
    resultEl.innerHTML = `<div class="tg-fabp-empty">Please enter some text to analyze.</div>`;
    return;
  }

  resultEl.style.display = "block";
  resultEl.innerHTML = `
    <div class="tg-fabp-loading">
      <span class="tg-fabp-spinner"></span>
      <span>${deep ? "Running deep AI analysis..." : "Analyzing text..."}</span>
    </div>
  `;

  // sendResponse now includes { ok, result, demo } flags
  const response = await new Promise(resolve => {
    try {
      chrome.runtime.sendMessage({ action: "ANALYZE_QUICK", text, deep }, res => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(res || null);
      });
    } catch { resolve(null); }
  });

  const isDemo   = response?.demo === true;
  const result   = response?.result || null;

  if (!response?.ok || !result) {
    const errMsg = response?.error || "Analysis failed. Check your connection.";
    const optionsUrl = chrome.runtime.getURL("options.html");
    resultEl.innerHTML = `
      <div class="tg-fabp-error">
        ❌ ${errMsg}
        ${isDemo ? `<br><a href="${optionsUrl}" target="_blank" style="color:#38bdf8;font-size:0.8rem;">Sign up for full access →</a>` : ''}
      </div>`;
    return;
  }

  const conf    = Math.round(tgConfidence(result) * 100);
  const sev     = tgGetSeverity(result);
  const cat     = tgCategory(result);
  const reason  = tgReason(result);
  const words   = (result.abusive_words || []).slice(0, 5);
  const isToxic = tgIsToxic(result) || result.toxic;

  const colors = { high: "#ff3b3b", medium: "#ff8c00", low: "#ffd700" };
  const color  = isToxic ? (colors[sev] || "#ff3b3b") : "#00e676";

  const optionsUrl = chrome.runtime.getURL("options.html");
  resultEl.innerHTML = `
    ${isDemo ? `<div class="tg-fabp-demo-badge">⚡ Demo Mode — <a href="${optionsUrl}" target="_blank">Sign up for full AI + LLM analysis</a></div>` : ''}
    <div class="tg-fabp-verdict ${isToxic ? 'tg-fabp-toxic' : 'tg-fabp-safe'}">
      <span class="tg-fabp-verdict-icon">${isToxic ? '🚨' : '✅'}</span>
      <span class="tg-fabp-verdict-text">${isToxic ? 'TOXIC CONTENT' : 'APPEARS SAFE'}</span>
    </div>
    <div class="tg-fabp-metrics">
      <div class="tg-fabp-metric">
        <span class="tg-fabp-metric-label">Confidence</span>
        <span class="tg-fabp-metric-value" style="color:${color}">${conf}%</span>
      </div>
      <div class="tg-fabp-metric">
        <span class="tg-fabp-metric-label">Severity</span>
        <span class="tg-fabp-metric-value">${sev.toUpperCase()}</span>
      </div>
      <div class="tg-fabp-metric">
        <span class="tg-fabp-metric-label">Category</span>
        <span class="tg-fabp-metric-value">${cat}</span>
      </div>
    </div>
    <div class="tg-fabp-conf-bar">
      <div class="tg-fabp-conf-fill" style="width:${conf}%;background:${color};"></div>
    </div>
    ${words.length ? `
    <div class="tg-fabp-words">
      ${words.map(w => `<span class="tg-fabp-word">${w}</span>`).join("")}
    </div>` : ""}
    <div class="tg-fabp-reason">${reason}</div>
    ${result.llm_used ? '<div class="tg-fabp-llm-badge">🧠 LLM Enhanced</div>' : ''}
  `;
}

function tgPlatformLabel() {
  const names = {
    instagram: "Instagram",
    twitter:   "Twitter/X",
    youtube:   "YouTube",
    reddit:    "Reddit",
    linkedin:  "LinkedIn",
    facebook:  "Facebook",
    tiktok:    "TikTok",
    threads:   "Threads",
    unknown:   "this page"
  };
  return names[TG_PLATFORM] || TG_PLATFORM;
}


// ═══════════════════════════════════════════════════════════════
//  OBSERVERS — MutationObserver for new comments + SPA nav
// ═══════════════════════════════════════════════════════════════

let tgScanDebounce = null;
const tgMutObs = new MutationObserver(() => {
  clearTimeout(tgScanDebounce);
  tgScanDebounce = setTimeout(tgScan, 600);
});

tgMutObs.observe(document.body, { childList: true, subtree: true });

// SPA Navigation
let tgLastUrl = location.href;
const tgUrlObs = new MutationObserver(() => {
  if (location.href !== tgLastUrl) {
    tgLastUrl = location.href;
    tgReset();
    setTimeout(tgScan, 1800);
  }
});
tgUrlObs.observe(document.body, { childList: true, subtree: true });

// ─── Listen for settings changes & rescan ─────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "SETTINGS_UPDATED") {
    tgSettings = { ...tgSettings, ...msg.settings };

    // Toggle FAB visibility
    if (msg.settings?.fab_enabled !== undefined && tgFab) {
      tgFab.style.display = msg.settings.fab_enabled ? "block" : "none";
    }
  }
  if (msg.action === "RESCAN") {
    tgReset();
    tgActive = false;
    setTimeout(tgScan, 300);
    tgToast("ToxiGuard: Rescanning page…", "🔄");
  }
});

// ─── Boot ─────────────────────────────────────────────────────

// Sync session from web app to extension if we are on the web app page
async function tgSyncWebSession() {
  try {
    const apiKey = localStorage.getItem("api_key");
    if (apiKey && apiKey.length > 10) {
      chrome.runtime.sendMessage({ 
        action: "SYNC_WEB_SESSION", 
        api_key: apiKey
      }, (response) => {
        if (response && response.synced) {
          console.log("🛡️ ToxiGuard: Session synced from web portal!");
        }
      });
    }
  } catch (e) {}
}

async function tgBoot() {
  if (document.title.includes("ToxiGuard") || document.body.innerText.includes("ToxiGuard AI")) {
    await tgSyncWebSession();
  }

  tgSettings = await tgGetSettings();
  tgActive = true;

  // Create FAB if enabled
  if (tgSettings.fab_enabled !== false) {
    tgCreateFab();
  }

  // Start scanning
  tgScan();
}

tgBoot();
