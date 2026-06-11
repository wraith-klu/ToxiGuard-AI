import React from "react";

export default function TextInput({ value, onChange }) {
  return (
    <div className="glass animate-fade-in delay-2">
      <h4 style={{
        color: "var(--accent-blue)",
        marginBottom: 12,
        fontFamily: "var(--font-heading)",
        fontSize: "0.9rem",
        fontWeight: 700,
      }}>
        Enter Text to Analyze
      </h4>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type or paste any text here to analyze for toxicity..."
        autoFocus
      />
    </div>
  );
}
