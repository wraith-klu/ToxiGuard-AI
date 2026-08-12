import { useState } from "react";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

/**
 * FeedbackWidget — Active Learning correction UI
 * Appears below every prediction result.
 * Lets users flag False Positives (safe flagged as toxic) or
 * False Negatives (toxic missed as safe).
 */
export default function FeedbackWidget({ result, inputText }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null); // "fp" | "fn" | "correct"
  const [notes, setNotes] = useState("");
  const [abusiveWords, setAbusiveWords] = useState("");
  const [explanation, setExplanation] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [error, setError] = useState(null);

  if (!result || !inputText) return null;

  const handleSubmit = async (type) => {
    const feedbackType = type || selected || "correct";
    setSelected(feedbackType);
    setLoading(true);
    setError(null);

    const correctLabel =
      feedbackType === "fp" ? false   // model said toxic, user says safe
      : feedbackType === "fn" ? true  // model said safe, user says toxic
      : result.toxic;         // confirmed correct

    const apiKey = localStorage.getItem("api_key");

    try {
      const res = await fetch(`${BASE_URL}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey && { "x-api-key": apiKey }),
        },
        body: JSON.stringify({
          input_text: inputText,
          predicted_toxic: result.toxic,
          correct_label: correctLabel,
          confidence_at_time: result.confidence,
          notes: notes || null,
          abusive_words: abusiveWords || null,
          explanation: explanation || null,
        }),
      });
      const data = await res.json();
      if (res.ok) setSubmitted(true);
      else setError(data.detail || "Submission failed");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (type) => {
    setSelected(type);
    setShowNotes(true);
  };

  if (submitted) {
    return (
      <div className="feedback-widget submitted animate-fade-in" style={{
        background: "rgba(16, 185, 129, 0.08)",
        border: "1px solid rgba(16, 185, 129, 0.2)",
        boxShadow: "0 0 20px rgba(16, 185, 129, 0.05)",
        borderRadius: "12px",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginTop: "16px",
        transition: "all 0.3s ease"
      }}>
        <span style={{ fontSize: "1.2rem" }}>🛡️</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ color: "#34d399", fontSize: "0.84rem", fontWeight: 700, letterSpacing: "0.3px" }}>Feedback Captured Successfully</span>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.72rem", lineHeight: "1.4" }}>
            This sample has been catalogued. The specific tokens and explanations will guide our next Active Learning retraining cycle.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-widget">
      <div className="feedback-row">
        <span className="feedback-label">Was this result correct?</span>

        <div className="feedback-buttons">
          {/* False Positive — only show if model said TOXIC */}
          {result.toxic && (
            <button
              className={`fb-btn fb-fp ${selected === "fp" ? "active" : ""}`}
              onClick={() => handleSelect("fp")}
              disabled={loading}
              title="Model flagged as toxic, but it's actually safe"
            >
              👍 Not Toxic
            </button>
          )}

          {/* False Negative — only show if model said SAFE */}
          {!result.toxic && (
            <button
              className={`fb-btn fb-fn ${selected === "fn" ? "active" : ""}`}
              onClick={() => handleSelect("fn")}
              disabled={loading}
              title="Model said safe, but it is actually toxic"
            >
              ⚠️ Actually Toxic
            </button>
          )}

          {/* Confirm correct */}
          <button
            className={`fb-btn fb-ok ${selected === "correct" ? "active" : ""}`}
            onClick={() => handleSelect("correct")}
            disabled={loading}
            title="Model got it right"
          >
            ✓ Correct
          </button>

          {/* Add note toggle */}
          <button
            className="fb-note-toggle"
            onClick={() => setShowNotes(!showNotes)}
          >
            📝
          </button>
        </div>
      </div>

      {showNotes && (
        <div className="feedback-notes-row" style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
          <div className="feedback-input-group">
            <span className="feedback-field-label">Which word is abusive? (Optional)</span>
            <input
              type="text"
              className="fb-notes-input"
              placeholder="e.g. idiot, stupid"
              value={abusiveWords}
              onChange={(e) => setAbusiveWords(e.target.value)}
              maxLength={100}
              style={{ marginTop: "4px" }}
            />
          </div>

          <div className="feedback-input-group">
            <span className="feedback-field-label">Why is it abusive / explain (Optional)</span>
            <textarea
              className="fb-notes-textarea"
              placeholder="Provide comments or explanation why the prediction was correct/incorrect..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              maxLength={300}
              rows={3}
              style={{ marginTop: "4px" }}
            />
          </div>

          <div className="feedback-input-group">
            <span className="feedback-field-label">General comments (Optional)</span>
            <input
              type="text"
              className="fb-notes-input"
              placeholder="e.g. 'This is sarcasm', 'Obfuscated word'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              style={{ marginTop: "4px" }}
            />
          </div>

          <button
            className="fb-submit-action-btn"
            onClick={() => handleSubmit(selected || "correct")}
            disabled={loading}
            style={{
              marginTop: "4px",
              padding: "6px 16px",
              borderRadius: "8px",
              border: "none",
              background: "var(--accent-indigo)",
              color: "white",
              fontWeight: "600",
              fontSize: "0.78rem",
              cursor: "pointer",
              alignSelf: "flex-end",
              transition: "opacity 0.2s"
            }}
          >
            {loading ? "Submitting..." : "Submit Correction"}
          </button>
        </div>
      )}

      {error && (
        <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: 6 }}>
          ⚠️ {error}
        </p>
      )}

      <style>{`
        .feedback-widget {
          margin-top: 12px;
          padding: 10px 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--surface-glass-border);
          border-radius: 12px;
        }

        .feedback-widget.submitted {
          color: #34d399;
          font-size: 0.82rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .feedback-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .feedback-label {
          font-size: 0.78rem;
          color: var(--text-tertiary);
          font-weight: 500;
          white-space: nowrap;
        }

        .feedback-buttons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .fb-btn {
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font-body);
        }

        .fb-fp {
          background: rgba(16,185,129,0.1);
          color: #34d399;
          border-color: rgba(16,185,129,0.25);
        }
        .fb-fp:hover, .fb-fp.active {
          background: rgba(16,185,129,0.25);
        }

        .fb-fn {
          background: rgba(239,68,68,0.1);
          color: #f87171;
          border-color: rgba(239,68,68,0.25);
        }
        .fb-fn:hover, .fb-fn.active {
          background: rgba(239,68,68,0.25);
        }

        .fb-ok {
          background: rgba(99,102,241,0.1);
          color: #818cf8;
          border-color: rgba(99,102,241,0.25);
        }
        .fb-ok:hover, .fb-ok.active {
          background: rgba(99,102,241,0.25);
        }

        .fb-note-toggle {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 2px 6px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .fb-note-toggle:hover { opacity: 1; }

        .feedback-notes-row {
          margin-top: 8px;
        }

        .feedback-input-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .feedback-field-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .fb-notes-input {
          width: 100%;
          padding: 7px 12px;
          border-radius: 8px;
          border: 1px solid var(--surface-glass-border);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.8rem;
          font-family: var(--font-body);
          outline: none;
          box-sizing: border-box;
        }

        .fb-notes-input:focus, .fb-notes-textarea:focus {
          border-color: rgba(99,102,241,0.5);
        }

        .fb-notes-textarea {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--surface-glass-border);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.8rem;
          font-family: var(--font-body);
          outline: none;
          box-sizing: border-box;
          resize: vertical;
        }

        .fb-submit-action-btn:hover {
          opacity: 0.9;
        }

        .fb-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
