import { useState, useRef, useEffect } from "react";

// Basic frontend mock array for the landing page demo
const MOCK_BAD_WORDS = ["idiot", "stupid", "dumb", "hate", "kill", "ugly", "scam", "trash", "loser"];

export default function LiveDemo() {
  const [messages, setMessages] = useState([
    { text: "This tool is amazing! Great work on the release.", toxic: false, conf: 98, scanning: false },
    { text: "You are an absolute idiot for thinking this works.", toxic: true, conf: 92, scanning: false }
  ]);
  
  const [input, setInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isScanning]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newText = input.trim();
    setInput("");
    
    // Add message as 'scanning'
    const newMsg = { text: newText, toxic: false, conf: 0, scanning: true };
    setMessages(prev => [...prev, newMsg]);
    setIsScanning(true);

    // Simulate API delay
    setTimeout(() => {
      const isToxic = MOCK_BAD_WORDS.some(word => newText.toLowerCase().includes(word));
      const confidence = isToxic ? Math.floor(Math.random() * 15) + 85 : Math.floor(Math.random() * 10) + 90;
      
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { text: newText, toxic: isToxic, conf: confidence, scanning: false };
        return updated;
      });
      setIsScanning(false);
    }, 1200);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="live-demo-container">
      <div className="demo-header">
        <div className="demo-dots">
          <span className="dot red"></span>
          <span className="dot yellow"></span>
          <span className="dot green"></span>
        </div>
        <div className="demo-title">Live ToxiGuard Scanner</div>
      </div>
      
      <div className="demo-chat-box" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`demo-msg-wrapper ${msg.scanning ? "scanning" : ""}`}>
            <div className="demo-msg-bubble">
              {msg.text}
            </div>
            
            {!msg.scanning && (
              <div className={`demo-result-badge ${msg.toxic ? "toxic" : "safe"}`}>
                <span className="badge-icon">{msg.toxic ? "🛡️ Blocked" : "✅ Safe"}</span>
                <span className="badge-conf">{msg.conf}% Conf</span>
              </div>
            )}
            
            {msg.scanning && (
              <div className="demo-scanning-badge">
                <span className="scan-spinner"></span> Scanning...
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="demo-input-area">
        <input 
          type="text" 
          placeholder="Type a test message (try using 'idiot' or 'stupid')..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isScanning}
        />
        <button onClick={handleSend} disabled={isScanning || !input.trim()}>
          Scan
        </button>
      </div>

      <style>{`
        .live-demo-container {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 500px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(20px);
          position: relative;
          z-index: 10;
        }

        .demo-header {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .demo-dots {
          display: flex;
          gap: 6px;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .dot.red { background: #ff5f56; }
        .dot.yellow { background: #ffbd2e; }
        .dot.green { background: #27c93f; }

        .demo-title {
          margin-left: 16px;
          font-family: var(--font-heading);
          font-size: 0.9rem;
          color: var(--text-secondary);
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .demo-chat-box {
          height: 320px;
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .demo-msg-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .demo-msg-bubble {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          padding: 12px 18px;
          border-radius: 18px;
          border-bottom-right-radius: 4px;
          font-size: 0.95rem;
          max-width: 85%;
          line-height: 1.5;
        }

        .demo-result-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .demo-result-badge.safe {
          background: rgba(34, 197, 94, 0.1);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .demo-result-badge.toxic {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
          animation: pulse-red 2s infinite;
        }

        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .demo-scanning-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          font-size: 0.75rem;
          color: var(--text-tertiary);
          font-weight: 600;
        }

        .scan-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--accent-indigo);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .demo-input-area {
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          gap: 12px;
        }

        .demo-input-area input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          padding: 12px 20px;
          color: #ffffff;
          font-family: var(--font-body);
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .demo-input-area input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(99, 102, 241, 0.5);
        }

        .demo-input-area input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .demo-input-area button {
          background: var(--text-primary);
          color: #000;
          border: none;
          padding: 0 24px;
          border-radius: 999px;
          font-family: var(--font-heading);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .demo-input-area button:hover:not(:disabled) {
          background: #ffffff;
          transform: translateY(-2px);
        }

        .demo-input-area button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
