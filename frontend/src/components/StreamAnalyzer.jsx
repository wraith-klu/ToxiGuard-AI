import { useState, useRef, useEffect, useCallback } from "react";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
const WS_URL = BASE_URL.replace(/^http/, "ws");

const SEVERITY_COLOR = {
  high: "#f87171",
  medium: "#fbbf24",
  low: "#34d399",
};

const DEMO_MESSAGES = [
  "This is absolutely amazing work!",
  "You're such an idiot, go to hell",
  "Great job on the presentation today",
  "This is complete bullshit and you know it",
  "I love how you handled that situation",
  "You're the worst person I've ever met",
  "Can we schedule a meeting tomorrow?",
  "I'll destroy you if you try that again",
  "The weather is nice today",
  "You're a complete failure at everything",
];

export default function StreamAnalyzer() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [stats, setStats] = useState({ total: 0, toxic: 0, avgLatency: 0, msgPerSec: 0 });
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const msgCountRef = useRef(0);
  const startTimeRef = useRef(null);
  const latenciesRef = useRef([]);
  const feedRef = useRef(null);
  const demoIntervalRef = useRef(null);
  const [demoRunning, setDemoRunning] = useState(false);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const connect = useCallback(() => {
    const apiKey = localStorage.getItem("api_key");
    if (!apiKey) { setError("No API key found — please log in"); return; }

    setConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(`${WS_URL}/ws/stream`);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send auth handshake
        ws.send(JSON.stringify({ type: "auth", api_key: apiKey }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === "auth_ok") {
          setConnected(true);
          setConnecting(false);
          startTimeRef.current = Date.now();
          setMessages([{
            id: "sys-0",
            text: `✅ Connected as ${msg.user} — model: ${msg.model}`,
            isSystem: true,
            ts: new Date().toLocaleTimeString(),
          }]);
          return;
        }

        if (msg.type === "auth_error") {
          setError("Authentication failed — invalid API key");
          setConnecting(false);
          ws.close();
          return;
        }

        if (msg.type === "result") {
          const latency = msg.latency_ms || 0;
          latenciesRef.current.push(latency);
          msgCountRef.current += 1;

          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          const mps = elapsed > 0 ? (msgCountRef.current / elapsed).toFixed(1) : "0";
          const avgLat = Math.round(
            latenciesRef.current.slice(-20).reduce((a, b) => a + b, 0) /
            Math.min(latenciesRef.current.length, 20)
          );

          setStats((prev) => ({
            total: prev.total + 1,
            toxic: prev.toxic + (msg.toxic ? 1 : 0),
            avgLatency: avgLat,
            msgPerSec: parseFloat(mps),
          }));

          setMessages((prev) => [
            ...prev.slice(-49), // keep last 50
            {
              id: msg.id,
              text: msg.text,
              toxic: msg.toxic,
              confidence: msg.confidence,
              severity: msg.severity,
              abusive_words: msg.abusive_words || [],
              latency: msg.latency_ms,
              ts: new Date().toLocaleTimeString(),
              isSystem: false,
            },
          ]);
        }

        if (msg.type === "pong") {
          // keepalive handled silently
        }

        if (msg.type === "error") {
          setError(msg.message);
        }
      };

      ws.onerror = () => {
        setError("WebSocket error — check if backend is running");
        setConnecting(false);
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        stopDemo();
      };

    } catch (e) {
      setError(`Connection failed: ${e.message}`);
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    stopDemo();
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "disconnect" }));
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setMessages([]);
    msgCountRef.current = 0;
    latenciesRef.current = [];
    setStats({ total: 0, toxic: 0, avgLatency: 0, msgPerSec: 0 });
  }, []);

  const sendMessage = useCallback((text) => {
    if (!wsRef.current || !connected || !text.trim()) return;
    const id = `msg-${Date.now()}`;
    wsRef.current.send(JSON.stringify({ type: "message", text: text.trim(), id }));
  }, [connected]);

  const handleSend = () => {
    sendMessage(inputText);
    setInputText("");
  };

  const startDemo = () => {
    if (!connected || demoRunning) return;
    setDemoRunning(true);
    let i = 0;
    demoIntervalRef.current = setInterval(() => {
      sendMessage(DEMO_MESSAGES[i % DEMO_MESSAGES.length]);
      i++;
    }, 800);
  };

  const stopDemo = () => {
    setDemoRunning(false);
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
  };

  // Keep WS alive
  useEffect(() => {
    if (!connected) return;
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 15000);
    return () => clearInterval(ping);
  }, [connected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDemo();
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const toxicRate = stats.total > 0 ? Math.round((stats.toxic / stats.total) * 100) : 0;

  return (
    <div className="stream-root animate-fade-in">
      {/* Header */}
      <div className="stream-header glass">
        <div>
          <h3 className="stream-title">
            <span className={`stream-dot ${connected ? "online" : "offline"}`} />
            Real-Time Stream Analyzer
          </h3>
          <p className="stream-subtitle">
            WebSocket · DeBERTa-v3 ONNX · Live toxicity inference
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {!connected ? (
            <button className="primary-btn" onClick={connect} disabled={connecting}>
              {connecting ? "Connecting…" : "⚡ Connect"}
            </button>
          ) : (
            <>
              <button
                className={`primary-btn ${demoRunning ? "danger-btn" : ""}`}
                onClick={demoRunning ? stopDemo : startDemo}
              >
                {demoRunning ? "⏹ Stop Demo" : "▶ Auto Demo"}
              </button>
              <button className="danger-btn" onClick={disconnect}>
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="stream-error">⚠️ {error}</div>
      )}

      {/* Stats bar */}
      {connected && (
        <div className="stream-stats-bar glass">
          <div className="stream-stat">
            <span className="ss-val">{stats.total}</span>
            <span className="ss-lbl">Messages</span>
          </div>
          <div className="stream-stat">
            <span className="ss-val" style={{ color: toxicRate > 40 ? "#f87171" : "#34d399" }}>
              {toxicRate}%
            </span>
            <span className="ss-lbl">Toxic Rate</span>
          </div>
          <div className="stream-stat">
            <span className="ss-val" style={{ color: "#38bdf8" }}>{stats.avgLatency}ms</span>
            <span className="ss-lbl">Avg Latency</span>
          </div>
          <div className="stream-stat">
            <span className="ss-val" style={{ color: "#818cf8" }}>{stats.msgPerSec}</span>
            <span className="ss-lbl">msg/sec</span>
          </div>
        </div>
      )}

      {/* Message Feed */}
      <div className="stream-feed glass" ref={feedRef}>
        {messages.length === 0 && !connected && (
          <div className="stream-empty">
            <span style={{ fontSize: "2.5rem" }}>📡</span>
            <p>Connect to start analyzing a real-time message stream</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
              Uses WebSocket · DeBERTa-v3 · ~20ms latency per message
            </p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="stream-sys-msg">
                <span>{msg.text}</span>
                <span className="stream-ts">{msg.ts}</span>
              </div>
            );
          }
          return (
            <div
              key={msg.id}
              className={`stream-msg ${msg.toxic ? "stream-msg-toxic" : "stream-msg-safe"}`}
            >
              <div className="stream-msg-body">
                <div className="stream-msg-text">{msg.text}</div>
                {msg.abusive_words?.length > 0 && (
                  <div className="stream-flagged-words">
                    {msg.abusive_words.map((w, i) => (
                      <span key={i} className="stream-word-tag">{w}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="stream-msg-meta">
                <span
                  className="stream-verdict"
                  style={{ color: msg.toxic ? "#f87171" : "#34d399" }}
                >
                  {msg.toxic ? "☣ TOXIC" : "✓ SAFE"}
                </span>
                <span className="stream-conf">
                  {Math.round((msg.confidence || 0) * 100)}%
                </span>
                <span
                  className="stream-sev"
                  style={{ color: SEVERITY_COLOR[msg.severity] || "#818cf8" }}
                >
                  {msg.severity}
                </span>
                <span className="stream-lat">{msg.latency}ms</span>
                <span className="stream-ts">{msg.ts}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      {connected && (
        <div className="stream-input-row glass">
          <input
            className="stream-input"
            type="text"
            placeholder="Send a message to analyze…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            maxLength={500}
          />
          <button
            className="primary-btn"
            onClick={handleSend}
            disabled={!inputText.trim()}
          >
            Send
          </button>
        </div>
      )}

      <style>{`
        .stream-root { display: flex; flex-direction: column; gap: 12px; }

        .stream-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          padding: 18px 20px;
        }

        .stream-title {
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stream-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          display: inline-block;
          animation: streamPulse 2s ease-in-out infinite;
        }
        .stream-dot.online { background: #34d399; }
        .stream-dot.offline { background: #64748b; animation: none; }

        @keyframes streamPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(52,211,153,0); }
        }

        .stream-subtitle {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          margin: 3px 0 0;
        }

        .stream-error {
          padding: 10px 16px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 10px;
          color: #f87171;
          font-size: 0.83rem;
        }

        .stream-stats-bar {
          display: flex;
          gap: 1px;
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .stream-stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          background: var(--bg-card);
        }
        .ss-val {
          font-family: var(--font-heading);
          font-size: 1.3rem;
          font-weight: 900;
          color: var(--text-primary);
          line-height: 1;
        }
        .ss-lbl {
          font-size: 0.65rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }

        .stream-feed {
          height: 380px;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          scroll-behavior: smooth;
        }

        .stream-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--text-tertiary);
          text-align: center;
          padding: 40px;
        }

        .stream-sys-msg {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          background: rgba(99,102,241,0.08);
          border-radius: 8px;
          font-size: 0.78rem;
          color: #818cf8;
          font-style: italic;
        }

        .stream-msg {
          padding: 10px 14px;
          border-radius: 12px;
          border-left: 3px solid transparent;
          animation: streamFadeIn 0.25s ease-out;
        }

        @keyframes streamFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .stream-msg-toxic {
          background: rgba(239,68,68,0.06);
          border-left-color: #f87171;
        }
        .stream-msg-safe {
          background: rgba(52,211,153,0.04);
          border-left-color: #34d399;
        }

        .stream-msg-text {
          font-size: 0.88rem;
          color: var(--text-primary);
          margin-bottom: 5px;
        }

        .stream-flagged-words {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 4px;
        }

        .stream-word-tag {
          padding: 1px 8px;
          background: rgba(239,68,68,0.15);
          color: #f87171;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .stream-msg-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .stream-verdict { font-size: 0.72rem; font-weight: 700; }
        .stream-conf { font-size: 0.72rem; color: var(--text-tertiary); }
        .stream-sev { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
        .stream-lat { font-size: 0.68rem; color: var(--text-tertiary); }
        .stream-ts { font-size: 0.68rem; color: var(--text-tertiary); margin-left: auto; }

        .stream-input-row {
          display: flex;
          gap: 10px;
          padding: 12px 16px;
          align-items: center;
        }

        .stream-input {
          flex: 1;
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid var(--surface-glass-border);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.88rem;
          font-family: var(--font-body);
          outline: none;
          transition: border-color 0.2s;
        }

        .stream-input:focus {
          border-color: rgba(99,102,241,0.5);
        }
      `}</style>
    </div>
  );
}
