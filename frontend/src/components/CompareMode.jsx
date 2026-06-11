import { useState, useRef } from "react";
import { predictText } from "../api";
import ToxicityGauge from "./ToxicityGauge";

export default function CompareMode() {
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [resultA, setResultA] = useState(null);
  const [resultB, setResultB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compared, setCompared] = useState(false);

  const handleCompare = async () => {
    if (!textA.trim() || !textB.trim()) return;
    setLoading(true);
    setCompared(false);

    try {
      const [resA, resB] = await Promise.all([
        predictText(textA),
        predictText(textB),
      ]);
      setResultA(resA);
      setResultB(resB);
      setCompared(true);
    } catch (err) {
      console.error("Compare error:", err);
    } finally {
      setLoading(false);
    }
  };

  const scoreA = resultA ? Math.round(resultA.confidence * 100) : 0;
  const scoreB = resultB ? Math.round(resultB.confidence * 100) : 0;
  const diff = Math.abs(scoreA - scoreB);

  const verdict = compared
    ? scoreA === scoreB
      ? "Both texts have equal toxicity"
      : scoreA > scoreB
      ? `Text A is ${diff}% more toxic`
      : `Text B is ${diff}% more toxic`
    : null;

  const verdictColor = compared
    ? scoreA === scoreB
      ? "#f59e0b"
      : scoreA > scoreB
      ? "#ef4444"
      : "#3b82f6"
    : "transparent";

  return (
    <div className="compare-container">
      <div className="compare-header">
        <h3>⚔️ Compare Toxicity</h3>
        <p>Paste two texts side-by-side and analyze which one is more toxic.</p>
      </div>

      <div className="compare-inputs">
        <div className="compare-side">
          <label className="compare-label">
            <span className="compare-badge badge-a">A</span>
            Text A
          </label>
          <textarea
            className="compare-textarea"
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            placeholder="Paste first text here..."
            rows={5}
          />
        </div>

        <div className="compare-divider">
          <span className="compare-vs">VS</span>
        </div>

        <div className="compare-side">
          <label className="compare-label">
            <span className="compare-badge badge-b">B</span>
            Text B
          </label>
          <textarea
            className="compare-textarea"
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            placeholder="Paste second text here..."
            rows={5}
          />
        </div>
      </div>

      <button
        className="compare-btn"
        onClick={handleCompare}
        disabled={loading || !textA.trim() || !textB.trim()}
      >
        {loading ? (
          <>
            <span className="compare-spinner" />
            Analyzing...
          </>
        ) : (
          <>⚡ Compare Now</>
        )}
      </button>

      {/* Results */}
      {compared && resultA && resultB && (
        <div className="compare-results animate-fade-in">
          {/* Verdict Banner */}
          <div className="compare-verdict" style={{ borderColor: verdictColor }}>
            <span className="verdict-icon">
              {scoreA === scoreB ? "⚖️" : scoreA > scoreB ? "🔴" : "🔵"}
            </span>
            <span className="verdict-text" style={{ color: verdictColor }}>
              {verdict}
            </span>
          </div>

          <div className="compare-gauges">
            <div className="compare-gauge-card">
              <div className="compare-gauge-label">
                <span className="compare-badge badge-a">A</span>
                {resultA.toxic ? "⚠️ Toxic" : "✅ Safe"}
              </div>
              <ToxicityGauge value={scoreA} size={180} />
              {resultA.abusive_words?.length > 0 && (
                <div className="compare-words">
                  {resultA.abusive_words.map((w, i) => (
                    <span key={i} className="compare-word-tag toxic-tag">{w}</span>
                  ))}
                </div>
              )}
              {resultA.severity && (
                <div className={`compare-severity sev-${resultA.severity}`}>
                  {resultA.severity.toUpperCase()}
                </div>
              )}
            </div>

            <div className="compare-diff-bar">
              <div className="diff-label">Difference</div>
              <div className="diff-value" style={{ color: verdictColor }}>
                {diff}%
              </div>
              <div className="diff-bar-track">
                <div
                  className="diff-bar-fill"
                  style={{ height: `${diff}%`, background: verdictColor }}
                />
              </div>
            </div>

            <div className="compare-gauge-card">
              <div className="compare-gauge-label">
                <span className="compare-badge badge-b">B</span>
                {resultB.toxic ? "⚠️ Toxic" : "✅ Safe"}
              </div>
              <ToxicityGauge value={scoreB} size={180} />
              {resultB.abusive_words?.length > 0 && (
                <div className="compare-words">
                  {resultB.abusive_words.map((w, i) => (
                    <span key={i} className="compare-word-tag toxic-tag">{w}</span>
                  ))}
                </div>
              )}
              {resultB.severity && (
                <div className={`compare-severity sev-${resultB.severity}`}>
                  {resultB.severity.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .compare-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .compare-header h3 {
          font-family: var(--font-heading);
          font-size: 1.2rem;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .compare-header p {
          font-size: 0.85rem;
          color: var(--text-tertiary);
        }

        .compare-inputs {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 16px;
          align-items: start;
        }

        @media (max-width: 768px) {
          .compare-inputs {
            grid-template-columns: 1fr;
          }
          .compare-divider {
            display: flex !important;
            justify-content: center;
          }
        }

        .compare-side {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .compare-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .compare-badge {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 800;
          color: white;
        }

        .badge-a {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }

        .badge-b {
          background: linear-gradient(135deg, #0ea5e9, #06b6d4);
        }

        .compare-textarea {
          width: 100%;
          min-height: 120px;
          resize: vertical;
          background: rgba(255, 255, 255, 0.9);
          color: var(--text-primary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--surface-glass-border);
          padding: var(--space-md);
          font-family: var(--font-body);
          font-size: 0.9rem;
          line-height: 1.6;
          transition: border 0.2s, box-shadow 0.2s;
        }

        .compare-textarea:focus {
          outline: none;
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
        }

        .compare-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          padding-top: 36px;
        }

        .compare-vs {
          font-family: var(--font-heading);
          font-weight: 900;
          font-size: 1rem;
          color: var(--text-tertiary);
          background: rgba(0, 0, 0, 0.04);
          padding: 8px 14px;
          border-radius: var(--radius-full);
          letter-spacing: 1px;
        }

        .compare-btn {
          align-self: center;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 32px;
          border: none;
          border-radius: var(--radius-full);
          background: var(--gradient-primary);
          color: white;
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
        }

        .compare-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 35px rgba(99, 102, 241, 0.5);
        }

        .compare-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .compare-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: cspin 0.6s linear infinite;
        }

        @keyframes cspin {
          to { transform: rotate(360deg); }
        }

        .compare-results {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .compare-verdict {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          background: var(--surface-glass);
          border-radius: var(--radius-lg);
          border: 2px solid;
          text-align: center;
        }

        .verdict-icon {
          font-size: 1.5rem;
        }

        .verdict-text {
          font-family: var(--font-heading);
          font-size: 1.1rem;
          font-weight: 800;
        }

        .compare-gauges {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 16px;
          align-items: start;
        }

        @media (max-width: 768px) {
          .compare-gauges {
            grid-template-columns: 1fr;
          }
        }

        .compare-gauge-card {
          background: var(--surface-glass);
          border: 1px solid var(--surface-glass-border);
          border-radius: var(--radius-xl);
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .compare-gauge-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 0.95rem;
        }

        .compare-words {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: center;
        }

        .compare-word-tag {
          padding: 3px 10px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 700;
        }

        .toxic-tag {
          background: rgba(244, 63, 94, 0.12);
          color: var(--accent-rose);
          border: 1px solid rgba(244, 63, 94, 0.25);
        }

        .compare-severity {
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .sev-low {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
        }

        .sev-medium {
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
        }

        .sev-high {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
        }

        .compare-diff-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px 12px;
        }

        .diff-label {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 700;
        }

        .diff-value {
          font-family: var(--font-heading);
          font-size: 1.8rem;
          font-weight: 900;
        }

        .diff-bar-track {
          width: 6px;
          height: 100px;
          background: rgba(0, 0, 0, 0.06);
          border-radius: 3px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .diff-bar-fill {
          width: 100%;
          border-radius: 3px;
          transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
