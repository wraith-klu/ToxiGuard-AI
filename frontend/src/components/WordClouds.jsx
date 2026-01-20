import React from "react";
import { TagCloud } from "react-tagcloud";

export default function WordClouds({
  wordFrequency = {},
  abusiveWords = [],
}) {
  if (!Object.keys(wordFrequency).length) return null;

  const abusiveSet = new Set(
    abusiveWords.map((w) => w.toLowerCase())
  );

  // Build tag data
  const tags = Object.entries(wordFrequency).map(
    ([text, value]) => ({
      value: text,
      count: value,
      abusive: abusiveSet.has(text.toLowerCase()),
    })
  );

  return (
    <div className="glass wordcloud-card">
      <h3>☁️ Word Cloud</h3>

      <TagCloud
        minSize={14}
        maxSize={44}
        tags={tags}
        renderer={(tag, size) => (
          <span
            key={tag.value}
            style={{
              fontSize: size,
              margin: "6px",
              padding: "4px 10px",
              display: "inline-block",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "default",
              color: tag.abusive ? "#fff" : "#020617",
              background: tag.abusive
                ? "linear-gradient(135deg,#ef4444,#f97316)"
                : "linear-gradient(135deg,#38bdf8,#6366f1)",
              boxShadow: tag.abusive
                ? "0 0 12px rgba(239,68,68,0.6)"
                : "0 0 10px rgba(56,189,248,0.5)",
            }}
          >
            {tag.value}
          </span>
        )}
      />
    </div>
  );
}
