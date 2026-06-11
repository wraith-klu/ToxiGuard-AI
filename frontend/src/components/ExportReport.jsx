import { useState } from "react";

/**
 * Generates a styled HTML report and prints it as PDF using the browser's print dialog.
 * No external dependencies required.
 */
export default function ExportReport({ result, inputText }) {
  const [exporting, setExporting] = useState(false);

  if (!result) return null;

  const {
    toxic,
    confidence,
    severity = "low",
    abusive_words = [],
    source,
    sentiment,
    llm,
    suggestions = {},
  } = result;

  const toxicity = Math.round(confidence * 100);
  const date = new Date().toLocaleString();

  const handleExport = () => {
    setExporting(true);

    const sevColor =
      severity === "high" ? "#ef4444" : severity === "medium" ? "#f59e0b" : "#10b981";

    const abusiveWordsList = abusive_words
      .map(
        (w) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${w}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#666;">${
            suggestions[w] || "—"
          }</td></tr>`
      )
      .join("");

    const llmSection =
      llm?.explanation &&
      llm.explanation !== "LLM unavailable or parsing failed" &&
      llm.explanation !== "No detailed analysis available. Based on rules and ML signals."
        ? `
        <div style="margin-top:20px;padding:16px;background:#f0f7ff;border-left:3px solid #3b82f6;border-radius:8px;">
          <h3 style="margin:0 0 8px;font-size:14px;color:#3b82f6;">🧠 LLM Explanation</h3>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#475569;">${llm.explanation}</p>
          ${
            llm.detected_phrases?.length
              ? `<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">${llm.detected_phrases
                  .map(
                    (p) =>
                      `<span style="background:#e0e7ff;color:#4338ca;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;">${p}</span>`
                  )
                  .join("")}</div>`
              : ""
          }
        </div>`
        : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>ToxiGuard AI Report</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Outfit:wght@700;800;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; background: #fff; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #e2e8f0;">
          <div>
            <div style="font-family:'Outfit',sans-serif;font-size:24px;font-weight:900;display:flex;align-items:center;gap:8px;">
              <span style="background:linear-gradient(135deg,#0ea5e9,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">◆</span>
              ToxiGuard
              <span style="background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;">AI</span>
            </div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Content Moderation Report</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:#94a3b8;">Generated</div>
            <div style="font-size:13px;font-weight:600;">${date}</div>
          </div>
        </div>

        <!-- Verdict Banner -->
        <div style="background:${toxic ? "#fef2f2" : "#f0fdf4"};border:1px solid ${toxic ? "#fecaca" : "#bbf7d0"};border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
          <div style="font-size:28px;margin-bottom:4px;">${toxic ? "⚠️" : "✅"}</div>
          <div style="font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;color:${toxic ? "#dc2626" : "#16a34a"};">${
      toxic ? "Toxic Content Detected" : "Content is Safe"
    }</div>
        </div>

        <!-- Score Cards -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Toxicity</div>
            <div style="font-family:'Outfit',sans-serif;font-size:24px;font-weight:900;color:${
              toxicity > 70 ? "#ef4444" : toxicity > 40 ? "#f59e0b" : "#10b981"
            };">${toxicity}%</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Severity</div>
            <div style="font-family:'Outfit',sans-serif;font-size:16px;font-weight:800;color:${sevColor};text-transform:uppercase;">${severity}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Source</div>
            <div style="font-size:14px;font-weight:600;">${source || "—"}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Sentiment</div>
            <div style="font-size:14px;font-weight:600;">${sentiment?.label || "—"}</div>
          </div>
        </div>

        <!-- Analyzed Text -->
        <div style="margin-bottom:24px;">
          <h3 style="font-size:14px;font-weight:700;margin-bottom:8px;color:#64748b;">Analyzed Text</h3>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;font-size:14px;line-height:1.7;color:#334155;">
            ${inputText || "—"}
          </div>
        </div>

        <!-- Abusive Words Table -->
        ${
          abusive_words.length > 0
            ? `
          <div style="margin-bottom:24px;">
            <h3 style="font-size:14px;font-weight:700;margin-bottom:8px;color:#64748b;">Detected Words & Suggestions</h3>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              <thead>
                <tr style="background:#f1f5f9;">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;">Abusive Word</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;">Suggestion</th>
                </tr>
              </thead>
              <tbody>${abusiveWordsList}</tbody>
            </table>
          </div>`
            : ""
        }

        <!-- LLM Explanation -->
        ${llmSection}

        <!-- Footer -->
        <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;">
          <span>Generated by ToxiGuard AI — AI-powered content moderation</span>
          <span>toxiguard.ai</span>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        setExporting(false);
      }, 500);
    } else {
      setExporting(false);
    }
  };

  return (
    <button className="export-btn" onClick={handleExport} disabled={exporting}>
      {exporting ? (
        <>
          <span className="export-spinner" />
          Generating...
        </>
      ) : (
        <>📄 Export Report</>
      )}

      <style>{`
        .export-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border: 1px solid var(--surface-glass-border);
          border-radius: var(--radius-full);
          background: var(--surface-glass);
          color: var(--text-secondary);
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .export-btn:hover:not(:disabled) {
          background: rgba(99, 102, 241, 0.08);
          border-color: rgba(99, 102, 241, 0.2);
          color: var(--accent-indigo);
          transform: translateY(-1px);
        }

        .export-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .export-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-top-color: var(--accent-indigo);
          border-radius: 50%;
          animation: espin 0.6s linear infinite;
        }

        @keyframes espin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
