import React, { useEffect, useRef } from "react";

export default function TextInput({ value, onChange }) {
  const inputRef = useRef(null);

  // Auto focus on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="glass">
      <h4 style={{ color: "#38bdf8", marginBottom: 12 }}>
        ✍️ Enter Text
      </h4>

      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your message here..."
      />
    </div>
  );
}
