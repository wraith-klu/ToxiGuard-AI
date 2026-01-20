import React from "react";
import KPI from "./KPI";

// -----------------------------------------------------
// Highlight abusive words inside text
// -----------------------------------------------------
function highlightText(text, abusiveWords = []) {
    if (!text || abusiveWords.length === 0) return text;

    let highlighted = text;

    abusiveWords.forEach((word) => {
        const regex = new RegExp(`\\b(${word})\\b`, "gi");
        highlighted = highlighted.replace(
            regex,
            `<span class="abusive-word">$1</span>`
        );
    });

    return highlighted;
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
// Main Component
// -----------------------------------------------------
export default function LiveResult({ loading, result, inputText }) {
    if (loading) {
        return (
            <div className="glass result-card">
                <p>Analyzing...</p>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="glass result-card muted">
                <p>Start typing to analyze text in real-time.</p>
            </div>
        );
    }

    const {
        toxic,
        confidence,
        severity = "low",
        abusive_words = [],
        reason,
        source,
        sentiment,
    } = result;

    const highlightedHTML = highlightText(inputText, abusive_words);

    return (
        <>

            {/* ✅ Detailed Result Card */}
            <div className="glass result-card">
                {/* Header */}
                <div className="result-header">
                    <h3>{toxic ? "⚠️ Toxic Content" : "✅ Safe Content"}</h3>
                    <SeverityBadge severity={severity} />
                </div>

                {/* Confidence */}
                <div className="confidence-row">
                    <label>Confidence</label>
                    <progress value={confidence} max={1} />
                    <span>{Math.round(confidence * 100)}%</span>
                </div>

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
                        <b>Reason</b>
                        <div>{reason || "—"}</div>
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
            </div>
            {/* ✅ KPI Dashboard */}
            <KPI result={result} inputText={inputText} />
        </>
    );
}
