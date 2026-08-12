import React from "react";
import ToxicityGauge from "./ToxicityGauge";
import ExportReport from "./ExportReport";
import TokenHeatmap from "./TokenHeatmap";
import FeedbackWidget from "./FeedbackWidget";

// -----------------------------------------------------
// Highlight abusive words inside text
// -----------------------------------------------------
function highlightText(text, abusiveWords = []) {
  if (!text || typeof text !== "string") return "";
  if (abusiveWords.length === 0) return text;

  let highlighted = text;

  abusiveWords.forEach((word) => {
    if (!word) return;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b(${escaped})\\b`, "gi");
    highlighted = highlighted.replace(
      regex,
      `<span class="abusive-word">$1</span>`
    );
  });

  return highlighted;
}

// -----------------------------------------------------
// Format category label (self_harm → Self Harm)
// -----------------------------------------------------
function formatCategory(category) {
  if (!category) return "—";
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

// -----------------------------------------------------
// Severity Badge
// -----------------------------------------------------
function SeverityBadge({ severity }) {
  if (!severity) return null;

  const cls =
    severity === "high"
      ? "severity-high"
      : severity === "medium"
      ? "severity-medium"
      : "severity-low";

  return <span className={`severity-badge ${cls}`}>{severity}</span>;
}

// -----------------------------------------------------
// Mini Stat Card
// -----------------------------------------------------
function MiniStat({ title, value, sub }) {
  return (
    <div className="kpi-mini-card">
      <div className="kpi-mini-title">{title}</div>
      <div className="kpi-mini-value">{value}</div>
      {sub && <div className="kpi-mini-sub">{sub}</div>}
    </div>
  );
}

// -----------------------------------------------------
// AI Loading Overlay
// -----------------------------------------------------
const WAIT_MESSAGES = [
  "🧠 Neural network processing...",
  "🔍 Scanning for toxic patterns...",
  "⚡ Running dual-model inference...",
  "🛡️ Consulting the AI safety layer...",
  "🌐 Cross-referencing abuse database...",
  "💡 Generating contextual explanation...",
  "🤖 Deep LLM reasoning in progress...",
  "📡 Analyzing semantic context...",
];

function AILoadingState() {
  const [msgIndex, setMsgIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % WAIT_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ai-loading-panel">
      {/* Orbital ring animation */}
      <div className="ai-orbit-container">
        <div className="ai-orbit-ring ring-1" />
        <div className="ai-orbit-ring ring-2" />
        <div className="ai-orbit-ring ring-3" />
        <div className="ai-orbit-core">
          <span className="ai-orbit-icon">🛡️</span>
        </div>
      </div>

      {/* Cycling message */}
      <div className="ai-loading-msg-wrapper">
        <p className="ai-loading-msg" key={msgIndex}>
          {WAIT_MESSAGES[msgIndex]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="ai-loading-bar-track">
        <div className="ai-loading-bar-fill" />
      </div>

      <p className="ai-loading-sub">ToxiGuard AI is analyzing your content</p>

      <style>{`
        .ai-loading-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
          padding: 48px 32px;
          background: var(--surface-glass);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: var(--radius-xl);
          backdrop-filter: blur(24px);
          position: relative;
          overflow: hidden;
        }

        /* Background neon glow pulse */
        .ai-loading-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 50%, rgba(129,140,248,0.12) 0%, transparent 70%);
          animation: glowPulse 2.5s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }

        /* Orbital rings */
        .ai-orbit-container {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-orbit-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid transparent;
        }

        .ring-1 {
          width: 120px;
          height: 120px;
          border-top-color: #818cf8;
          border-right-color: rgba(129,140,248,0.2);
          animation: orbit1 2s linear infinite;
          box-shadow: 0 0 12px rgba(129,140,248,0.4);
        }

        .ring-2 {
          width: 88px;
          height: 88px;
          border-top-color: #22d3ee;
          border-left-color: rgba(34,211,238,0.2);
          animation: orbit2 1.4s linear infinite reverse;
          box-shadow: 0 0 8px rgba(34,211,238,0.3);
        }

        .ring-3 {
          width: 60px;
          height: 60px;
          border-bottom-color: #a78bfa;
          border-right-color: rgba(167,139,250,0.2);
          animation: orbit1 1.8s linear infinite;
          box-shadow: 0 0 6px rgba(167,139,250,0.3);
        }

        @keyframes orbit1 {
          to { transform: rotate(360deg); }
        }
        @keyframes orbit2 {
          to { transform: rotate(360deg); }
        }

        .ai-orbit-core {
          position: absolute;
          width: 40px;
          height: 40px;
          background: rgba(129,140,248,0.15);
          border: 1px solid rgba(129,140,248,0.4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          animation: corePulse 2s ease-in-out infinite;
        }

        @keyframes corePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.3); }
          50% { box-shadow: 0 0 0 10px rgba(129,140,248,0); }
        }

        /* Cycling message */
        .ai-loading-msg-wrapper {
          height: 28px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-loading-msg {
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          text-align: center;
          margin: 0;
          animation: msgFade 0.4s ease-in-out;
        }

        @keyframes msgFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Progress bar */
        .ai-loading-bar-track {
          width: 240px;
          height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 999px;
          overflow: hidden;
        }

        .ai-loading-bar-fill {
          height: 100%;
          width: 40%;
          background: linear-gradient(90deg, #818cf8, #22d3ee, #a78bfa);
          border-radius: 999px;
          animation: shimmer 1.8s ease-in-out infinite;
          background-size: 200% 100%;
        }

        @keyframes shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(350%); }
        }

        .ai-loading-sub {
          font-size: 0.78rem;
          color: var(--text-tertiary);
          text-align: center;
          margin: 0;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  );
}

// -----------------------------------------------------
// Main Component
// -----------------------------------------------------
export default function LiveResult({ loading, result, inputText }) {
  if (loading) {
    return <AILoadingState />;
  }

  if (!result) {
    return (
      <div className="glass result-card muted">
        <p>Start typing to analyze text in real-time...</p>
      </div>
    );
  }

  const {
    toxic,
    confidence,
    severity = "low",
    abusive_words = [],
    source,
    sentiment,
    llm,
  } = result;

  const highlightedHTML = highlightText(inputText, abusive_words);

  const llmExplanation =
    llm?.explanation &&
    llm.explanation !== "LLM unavailable or parsing failed" &&
    llm.explanation !== "No detailed analysis available. Based on rules and ML signals."
      ? llm.explanation
      : null;

  const categoryLabel = formatCategory(llm?.category);

  const wordsCount = inputText
    ? inputText.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const toxicity = Math.round(confidence * 100);

  return (
    <>
      {/* Detailed Result Card */}
      <div className={`glass result-card animate-fade-in ${toxic ? 'is-toxic' : 'is-safe'}`}>
        {/* Header */}
        <div className="result-header">
          <h3>{toxic ? "⚠️ Toxic Content Detected" : "✅ Content is Safe"}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <SeverityBadge severity={severity} />
            <ExportReport result={result} inputText={inputText} />
          </div>
        </div>

        {/* Toxicity Gauge */}
        <ToxicityGauge value={toxicity} size={220} />

        {/* Highlighted Text */}
        <div
          className={`highlight-box ${toxic ? "toxic-text" : ""}`}
          dangerouslySetInnerHTML={{ __html: highlightedHTML }}
        />

        {/* Meta Info */}
        <div className="meta-grid">
          <div>
            <b>Detected Words</b>
            <div>{abusive_words.length || "None"}</div>
          </div>

          <div>
            <b>Source</b>
            <div>{source}</div>
          </div>

          <div>
            <b>Category</b>
            <div>{categoryLabel}</div>
          </div>

          {sentiment && (
            <div>
              <b>Sentiment</b>
              <div>
                {sentiment.label} ({sentiment.polarity})
              </div>
            </div>
          )}
        </div>

        {/* LLM Explanation Block */}
        {llmExplanation && (
          <div className="llm-explanation">
            <h4>🧠 LLM Explanation</h4>
            <p>{llmExplanation}</p>

            {llm?.detected_phrases?.length > 0 && (
              <div className="llm-tags">
                {llm.detected_phrases.map((p, i) => (
                  <span key={i} className="tag">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* XAI Token Heatmap */}
      <TokenHeatmap text={inputText} result={result} />

      {/* Active Learning Feedback */}
      <FeedbackWidget result={result} inputText={inputText} />

      {/* Stats Grid */}
      <div className="kpi-mini-grid">
        <MiniStat title="Words" value={wordsCount} />
        <MiniStat title="Abusive" value={abusive_words.length} />
        <MiniStat title="Toxicity" value={`${toxicity}%`} />
        <MiniStat
          title="Sentiment"
          value={sentiment?.label || "—"}
          sub={sentiment ? `Polarity ${sentiment.polarity}` : ""}
        />
      </div>
    </>
  );
}
