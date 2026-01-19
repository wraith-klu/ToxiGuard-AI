import React from "react";

export default function Header() {
  return (
    <div style={{ textAlign: "center", marginBottom: 10 }}>
      <h1
        style={{
          fontSize: "3rem",
          color: "#38bdf8",
          margin: 0,
          letterSpacing: "0.5px",
        }}
      >
        🛡️ ToxiGuard AI
      </h1>

      <p
        style={{
          marginTop: 6,
          color: "#e5e7eb",
          fontSize: "1rem",
          opacity: 0.9,
        }}
      >
        Real-time Abuse Detection • Sentiment • Toxicity Analytics
      </p>
    </div>
  );
}
