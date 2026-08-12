import { useState, useEffect } from "react";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

/**
 * TokenHeatmap — XAI visualization component
 * Renders each word as a colored tile based on its attention score.
 * High score = red (high influence on toxicity decision)
 * Low score  = blue/grey (low influence)
 */
export default function TokenHeatmap({ text, result }) {
  const [xaiData, setXaiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Auto-fetch when result changes and text is present
  useEffect(() => {
    if (!result || !text || text.trim().length < 3) {
      setXaiData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const apiKey = localStorage.getItem("api_key");

    fetch(`${BASE_URL}/explain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { "x-api-key": apiKey }),
      },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          if (data.status === "ok") setXaiData(data);
          else setError(data.message || "XAI unavailable");
        }
      })
      .catch(() => !cancelled && setError("XAI fetch failed"))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [result, text]);

  if (!result) return null;

  // Score → background color (premium SaaS tokens)
  const scoreToColor = (score) => {
    if (score < 0.2) return "rgba(148, 163, 184, 0.08)"; // Slate glass (neutral)
    if (score < 0.4) return "rgba(99, 102, 241, 0.12)";  // Indigo glass (low influence)
    if (score < 0.65) return "rgba(245, 158, 11, 0.15)"; // Amber glass (moderate)
    if (score < 0.85) return "rgba(244, 63, 94, 0.25)";  // Rose glass (high)
    return "rgba(244, 63, 94, 0.6)";                     // Deep Rose (critical)
  };

  const scoreToBorder = (score) => {
    if (score < 0.2) return "1px solid rgba(255, 255, 255, 0.03)";
    if (score < 0.4) return "1px solid rgba(99, 102, 241, 0.25)";
    if (score < 0.65) return "1px solid rgba(245, 158, 11, 0.35)";
    if (score < 0.85) return "1px solid rgba(244, 63, 94, 0.45)";
    return "1px solid rgba(244, 63, 94, 0.8)";
  };

  const scoreToTextColor = (score) => {
    if (score < 0.2) return "var(--text-secondary)";
    if (score < 0.4) return "var(--accent-indigo)";
    if (score < 0.65) return "#fbbf24"; // Amber-400
    if (score < 0.85) return "#f43f5e"; // Rose-500
    return "#ffffff";
  };

  return (
    <div className="glass xai-panel animate-fade-in">
      {/* Header */}
      <div className="xai-header" onClick={() => setExpanded(!expanded)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.2rem" }}>🧠</span>
          <div>
            <h4 style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.95rem",
              fontWeight: 700,
              margin: 0,
              color: "var(--text-primary)",
            }}>
              XAI Token Attribution
            </h4>
            <p style={{
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
              margin: "2px 0 0 0",
            }}>
              Which words most influenced the toxicity decision
            </p>
          </div>
        </div>
        <button className="xai-toggle-btn">
          {expanded ? "▲ Hide" : "▼ Show"}
        </button>
      </div>

      {expanded && (
        <div className="xai-body">
          {/* Loading */}
          {loading && (
            <div className="xai-loading">
              <div className="xai-spinner" />
              <span>Extracting attention weights…</span>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <p style={{ color: "var(--text-tertiary)", fontSize: "0.8rem" }}>
              ⚠️ {error}
            </p>
          )}

          {/* Heatmap tokens */}
          {xaiData && !loading && (
            <>
              {/* Top influential tokens */}
              {xaiData.top_tokens?.length > 0 && (
                <div className="xai-top-tokens">
                  <span className="xai-section-label">Top influential words:</span>
                  {xaiData.top_tokens.map((t, i) => (
                    <span
                      key={i}
                      className="xai-top-badge"
                      style={{ 
                        background: scoreToColor(t.score),
                        border: scoreToBorder(t.score),
                        color: scoreToTextColor(t.score)
                      }}
                    >
                      {t.token}
                      <span className="xai-score-pill" style={{ opacity: 0.7, fontSize: "0.68rem" }}>
                        {(t.score * 100).toFixed(0)}%
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {/* Token grid */}
              <div className="xai-token-grid">
                {xaiData.tokens
                  .filter((t) => !t.is_special)
                  .map((t, i) => (
                    <div
                      key={i}
                      className="xai-token"
                      style={{
                        background: scoreToColor(t.score),
                        border: scoreToBorder(t.score),
                        color: scoreToTextColor(t.score),
                      }}
                      title={`Attribution score: ${(t.score * 100).toFixed(1)}%`}
                    >
                      <span className="xai-token-word">{t.token}</span>
                      <span className="xai-token-score" style={{ opacity: 0.75 }}>
                        {(t.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
              </div>

              {/* Legend */}
              <div className="xai-legend">
                <span className="xai-legend-label">Influence:</span>
                <div className="xai-legend-bar" />
                <span className="xai-legend-lo">Low</span>
                <span className="xai-legend-hi">High</span>
                <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
                  Method: {xaiData.method} · {xaiData.num_tokens} tokens
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        .xai-panel {
          margin-top: 16px;
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .xai-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .xai-header:hover {
          background: rgba(255,255,255,0.03);
        }

        .xai-toggle-btn {
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.3);
          color: #818cf8;
          padding: 5px 14px;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font-body);
        }

        .xai-toggle-btn:hover {
          background: rgba(99,102,241,0.25);
        }

        .xai-body {
          padding: 0 20px 20px;
          border-top: 1px solid var(--surface-glass-border);
        }

        .xai-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 0;
          color: var(--text-tertiary);
          font-size: 0.85rem;
        }

        .xai-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(99,102,241,0.2);
          border-top-color: #818cf8;
          border-radius: 50%;
          animation: xaiSpin 0.8s linear infinite;
        }

        @keyframes xaiSpin { to { transform: rotate(360deg); } }

        .xai-top-tokens {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin: 16px 0 12px;
        }

        .xai-section-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-tertiary);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .xai-top-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .xai-top-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .xai-score-pill {
          font-size: 0.65rem;
          opacity: 0.85;
          background: rgba(0,0,0,0.15);
          padding: 1px 5px;
          border-radius: 4px;
        }

        .xai-token-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 16px 0;
        }

        .xai-token {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 12px;
          border-radius: 8px;
          min-width: 54px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: default;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }

        .xai-token:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
          filter: brightness(1.15);
        }

        .xai-token-word {
          font-size: 0.84rem;
          font-weight: 700;
          font-family: var(--font-body);
        }

        .xai-token-score {
          font-size: 0.64rem;
          opacity: 0.7;
          margin-top: 3px;
          font-family: var(--font-body);
          font-weight: 600;
        }

        .xai-legend {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          font-size: 0.72rem;
          color: var(--text-tertiary);
        }

        .xai-legend-bar {
          width: 80px;
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(90deg,
            rgba(99,102,241,0.15),
            rgba(245,158,11,0.4),
            rgba(239,68,68,0.8)
          );
        }

        .xai-legend-lo { color: var(--text-tertiary); }
        .xai-legend-hi { color: #f87171; font-weight: 600; }
      `}</style>
    </div>
  );
}
