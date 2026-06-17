import { useState, useRef, useEffect } from "react";

const MOCK_BAD_WORDS = ["idiot", "stupid", "dumb", "hate", "kill", "ugly", "scam", "trash", "loser"];

const MOCK_FEED_COMMENTS = [
  { id: 1, user: "sarah_tech", avatar: "👩‍💻", text: "This tool is amazing! Great work on the release.", toxic: false, category: "Safe" },
  { id: 2, user: "toxic_troll", avatar: "👿", text: "You are an absolute idiot for thinking this works.", toxic: true, category: "Insult" },
  { id: 3, user: "dev_guy", avatar: "👨‍💻", text: "Please check out our docs at github.com/toxiguard.", toxic: false, category: "Safe" },
  { id: 4, user: "hater_x", avatar: "👤", text: "I hate this group of people, they should leave.", toxic: true, category: "Hate Speech" },
  { id: 5, user: "threat_bot", avatar: "🤖", text: "I will find where you live and kill you.", toxic: true, category: "Threat" },
  { id: 6, user: "alice_w", avatar: "👩", text: "Looks great, integrating it in our project today!", toxic: false, category: "Safe" }
];

export default function LiveDemo() {
  const [activeTab, setActiveTab] = useState("scanner"); // "scanner" | "playground" | "feed"
  
  // Live Scanner States
  const [scannerMessages, setScannerMessages] = useState([
    { text: "This tool is amazing! Great work on the release.", toxic: false, conf: 98, scanning: false },
    { text: "You are an absolute idiot for thinking this works.", toxic: true, conf: 92, scanning: false }
  ]);
  const [scannerInput, setScannerInput] = useState("");
  const [isScannerScanning, setIsScannerScanning] = useState(false);
  const scannerScrollRef = useRef(null);

  // Playground States
  const [playgroundInput, setPlaygroundInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState(null);
  const [persona, setPersona] = useState("simple"); // "simple" | "compliance" | "developer"
  
  // Feed Simulator States
  const [extensionActive, setExtensionActive] = useState(true);
  const [comments, setComments] = useState(MOCK_FEED_COMMENTS);
  const [newCommentText, setNewCommentText] = useState("");
  const [revealedComments, setRevealedComments] = useState({});

  useEffect(() => {
    if (scannerScrollRef.current) {
      scannerScrollRef.current.scrollTop = scannerScrollRef.current.scrollHeight;
    }
  }, [scannerMessages, isScannerScanning]);

  const handleScannerSend = () => {
    if (!scannerInput.trim()) return;
    const newText = scannerInput.trim();
    setScannerInput("");
    setScannerMessages(prev => [...prev, { text: newText, toxic: false, conf: 0, scanning: true }]);
    setIsScannerScanning(true);
    setTimeout(() => {
      const isToxic = MOCK_BAD_WORDS.some(w => newText.toLowerCase().includes(w))
        || newText.toLowerCase().includes("kill")
        || newText.toLowerCase().includes("harm");
      const confidence = isToxic
        ? Math.floor(Math.random() * 10) + 88
        : Math.floor(Math.random() * 5) + 94;
      setScannerMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { text: newText, toxic: isToxic, conf: confidence, scanning: false };
        return updated;
      });
      setIsScannerScanning(false);
    }, 1200);
  };

  const handleScan = () => {
    if (!playgroundInput.trim()) return;
    setIsScanning(true);
    setPlaygroundResult(null);

    setTimeout(() => {
      const text = playgroundInput.toLowerCase();
      let type = "safe";
      let confidence = 98;
      let breakdown = { obscenity: 5, insult: 4, threat: 2, identity: 3 };

      if (text.includes("kill") || text.includes("harm") || text.includes("find you")) {
        type = "threat";
        confidence = 97;
        breakdown = { obscenity: 15, insult: 60, threat: 95, identity: 10 };
      } else if (text.includes("idiot") || text.includes("stupid") || text.includes("dumb") || text.includes("loser")) {
        type = "insult";
        confidence = 94;
        breakdown = { obscenity: 20, insult: 92, threat: 10, identity: 15 };
      } else if (text.includes("hate") || text.includes("group of people") || text.includes("ugly")) {
        type = "identity";
        confidence = 89;
        breakdown = { obscenity: 40, insult: 45, threat: 15, identity: 85 };
      } else if (MOCK_BAD_WORDS.some(w => text.includes(w))) {
        type = "obscenity";
        confidence = 92;
        breakdown = { obscenity: 90, insult: 30, threat: 10, identity: 12 };
      }

      setPlaygroundResult({
        type,
        confidence,
        breakdown,
        explanations: {
          simple: getSimpleExplanation(type),
          compliance: getComplianceExplanation(type),
          developer: getDeveloperExplanation(type, confidence, breakdown)
        }
      });
      setIsScanning(false);
    }, 1000);
  };

  const getSimpleExplanation = (type) => {
    switch(type) {
      case "threat": return "This message is flagged because it contains violent threats or expresses intent to cause harm.";
      case "insult": return "This comment is mean-spirited and targets someone personally.";
      case "identity": return "This message contains language targeting a specific group of people or expressing hostility.";
      case "obscenity": return "This message contains swear words or vulgar content that is inappropriate for public chat rooms.";
      default: return "This message is clean and safe to post.";
    }
  };

  const getComplianceExplanation = (type) => {
    switch(type) {
      case "threat": return "Violation of Safety Policy Section 1.1: Direct threats of violence, harm, or self-harm are strictly prohibited.";
      case "insult": return "Violation of Harassment Policy Section 2.4 regarding personal attacks, insults, or demeaning language.";
      case "identity": return "Violation of Hate Speech and Harassment Guidelines Section 5.2 regarding target group hostility.";
      case "obscenity": return "Violation of User Conduct Guidelines Section 3.1 regarding the use of profane, offensive, or obscene language.";
      default: return "Compliant with all standard community moderation guidelines.";
    }
  };

  const getDeveloperExplanation = (type, confidence, breakdown) => {
    return `[Engine logs] Class: ${type.toUpperCase()}. Confidence: ${confidence}%. Voting: 3/3 ensemble. Breakdown -> Obscenity: ${breakdown.obscenity}%, Insult: ${breakdown.insult}%, Threat: ${breakdown.threat}%, Identity: ${breakdown.identity}%. Action: ${type === "safe" ? "pass" : "block"}.`;
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const text = newCommentText.trim();
    const isToxic = MOCK_BAD_WORDS.some(w => text.toLowerCase().includes(w)) || text.toLowerCase().includes("kill") || text.toLowerCase().includes("hate");
    let category = "Safe";
    if (isToxic) {
      if (text.toLowerCase().includes("kill")) category = "Threat";
      else if (text.toLowerCase().includes("hate")) category = "Hate Speech";
      else category = "Insult";
    }

    const newComment = {
      id: Date.now(),
      user: "guest_user",
      avatar: "👤",
      text,
      toxic: isToxic,
      category
    };

    setComments(prev => [...prev, newComment]);
    setNewCommentText("");
  };

  const toggleRevealComment = (id) => {
    setRevealedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="live-demo-container">
      {/* Demo Header / Tabs */}
      <div className="demo-tabs-header">
        <button
          className={`demo-tab-btn ${activeTab === "scanner" ? "active" : ""}`}
          onClick={() => setActiveTab("scanner")}
        >
          🛡️ Live Scanner
        </button>
        <button 
          className={`demo-tab-btn ${activeTab === "playground" ? "active" : ""}`}
          onClick={() => setActiveTab("playground")}
        >
          🔍 Playground
        </button>
        <button 
          className={`demo-tab-btn ${activeTab === "feed" ? "active" : ""}`}
          onClick={() => setActiveTab("feed")}
        >
          💬 Feed Sim
        </button>
      </div>

      {/* LIVE SCANNER TAB (original widget) */}
      {activeTab === "scanner" && (
        <div className="scanner-tab-content animate-slide-up">
          <div className="scanner-chat-box" ref={scannerScrollRef}>
            {scannerMessages.map((msg, i) => (
              <div key={i} className={`scanner-msg-wrapper ${msg.scanning ? "scanning" : ""}`}>
                <div className="scanner-msg-bubble">{msg.text}</div>
                {!msg.scanning && (
                  <div className={`scanner-result-badge ${msg.toxic ? "toxic" : "safe"}`}>
                    <span>{msg.toxic ? "🛡️ Blocked" : "✅ Safe"}</span>
                    <span>{msg.conf}% Conf</span>
                  </div>
                )}
                {msg.scanning && (
                  <div className="scanner-scanning-badge">
                    <span className="scan-spinner"></span> Scanning...
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="scanner-input-area">
            <input
              type="text"
              placeholder="Type a message (try 'idiot' or 'stupid')..."
              value={scannerInput}
              onChange={(e) => setScannerInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScannerSend()}
              disabled={isScannerScanning}
            />
            <button onClick={handleScannerSend} disabled={isScannerScanning || !scannerInput.trim()}>
              Scan
            </button>
          </div>
        </div>
      )}

      {/* API PLAYGROUND TAB */}
      {activeTab === "playground" && (
        <div className="playground-tab-content">
          <div className="playground-input-row">
            <input 
              type="text" 
              placeholder="Type a test message (try using 'idiot' or 'kill')..." 
              value={playgroundInput}
              onChange={(e) => setPlaygroundInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              disabled={isScanning}
            />
            <button className="scan-btn" onClick={handleScan} disabled={isScanning || !playgroundInput.trim()}>
              {isScanning ? "Scanning..." : "Scan"}
            </button>
          </div>

          {isScanning && (
            <div className="playground-scanning">
              <span className="scan-spinner"></span> Analyzing payload across 3 Pipeline Layers...
            </div>
          )}

          {playgroundResult && (
            <div className="playground-results-container animate-slide-up">
              {/* Verdict Header */}
              <div className={`playground-verdict ${playgroundResult.type === "safe" ? "verdict-safe" : "verdict-toxic"}`}>
                <span className="verdict-icon">{playgroundResult.type === "safe" ? "✅" : "🛡️"}</span>
                <div>
                  <h4>Verdict: {playgroundResult.type === "safe" ? "SAFE" : playgroundResult.type.toUpperCase()}</h4>
                  <p>{playgroundResult.confidence}% confidence scoring</p>
                </div>
              </div>

              {/* Toxicity Breakdown Bars */}
              <div className="breakdown-section">
                <h5>Toxicity Categories</h5>
                <div className="category-grid">
                  {[
                    { key: "obscenity", label: "Obscenity", color: "var(--accent-cyan)" },
                    { key: "insult", label: "Insult", color: "var(--accent-violet)" },
                    { key: "threat", label: "Threat", color: "var(--accent-rose)" },
                    { key: "identity", label: "Identity Attack", color: "var(--accent-indigo)" }
                  ].map(cat => (
                    <div key={cat.key} className="cat-bar-row">
                      <div className="cat-label">
                        <span>{cat.label}</span>
                        <span>{playgroundResult.breakdown[cat.key]}%</span>
                      </div>
                      <div className="cat-bar-track">
                        <div 
                          className="cat-bar-fill" 
                          style={{ 
                            width: `${playgroundResult.breakdown[cat.key]}%`,
                            backgroundColor: cat.color,
                            boxShadow: `0 0 10px ${cat.color}`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Persona Switcher Section */}
              <div className="persona-section">
                <div className="persona-header">
                  <h5>Explainable AI Explanation</h5>
                  <div className="persona-switcher">
                    {["simple", "compliance", "developer"].map(p => (
                      <button 
                        key={p} 
                        className={`persona-btn ${persona === p ? "active" : ""}`}
                        onClick={() => setPersona(p)}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="explanation-bubble">
                  {playgroundResult.explanations[persona]}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SOCIAL FEED SIMULATOR TAB */}
      {activeTab === "feed" && (
        <div className="feed-tab-content animate-slide-up">
          {/* Extension Status Switcher */}
          <div className="extension-banner glassmorphism">
            <div className="extension-status">
              <span className={`status-dot ${extensionActive ? "active" : ""}`} />
              <div>
                <h4>ToxiGuard Chrome Extension</h4>
                <p>{extensionActive ? "Active & filtering comments in DOM" : "Inactive (Showing raw feed comments)"}</p>
              </div>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={extensionActive} 
                onChange={() => setExtensionActive(!extensionActive)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          {/* Social Post Mock */}
          <div className="mock-feed-post">
            <div className="post-header">
              <div className="post-avatar">◆</div>
              <div>
                <h5>ToxiGuard AI</h5>
                <p>@toxiguard_ai · Sponsored</p>
              </div>
            </div>
            <p className="post-content">
              Introducing our DeBERTa-v3 model package on ONNX Runtime. Moderate content natively at the edge with sub-10ms latencies. Check out our open release.
            </p>
          </div>

          {/* Comments List */}
          <div className="feed-comments-list">
            {comments.map(comment => {
              const isMasked = extensionActive && comment.toxic && !revealedComments[comment.id];
              return (
                <div key={comment.id} className="feed-comment">
                  <span className="comment-avatar">{comment.avatar}</span>
                  <div className="comment-body">
                    <div className="comment-author">
                      <h6>{comment.user}</h6>
                      {comment.toxic && (
                        <span className={`comment-flag ${comment.category.toLowerCase().replace(" ", "-")}`}>
                          {comment.category}
                        </span>
                      )}
                    </div>
                    
                    {isMasked ? (
                      <div className="masked-comment-overlay">
                        <span className="masked-text">🛡️ Comment flagged and hidden by ToxiGuard</span>
                        <button className="reveal-btn" onClick={() => toggleRevealComment(comment.id)}>
                          Reveal
                        </button>
                      </div>
                    ) : (
                      <p className="comment-text">
                        {comment.text}
                        {extensionActive && comment.toxic && revealedComments[comment.id] && (
                          <button className="hide-btn" onClick={() => toggleRevealComment(comment.id)}>
                            Hide
                          </button>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Mock Comment */}
          <form onSubmit={handleAddComment} className="feed-input-row">
            <input 
              type="text" 
              placeholder="Add to the conversation (try 'idiot' to see it auto-moderate)..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
            />
            <button type="submit" disabled={!newCommentText.trim()}>Post</button>
          </form>
        </div>
      )}

      <style>{`
        .live-demo-container {
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid var(--surface-glass-border);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 540px;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          backdrop-filter: blur(24px) saturate(140%);
          -webkit-backdrop-filter: blur(24px) saturate(140%);
          position: relative;
          z-index: 10;
        }

        /* Tabs Header */
        .demo-tabs-header {
          display: flex;
          background: rgba(0, 0, 0, 0.35);
          border-bottom: 1px solid var(--surface-glass-border);
        }

        .demo-tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          padding: 16px;
          font-family: var(--font-heading);
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-tertiary);
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
        }

        .demo-tab-btn:hover {
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.02);
        }

        .demo-tab-btn.active {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.05);
        }

        .demo-tab-btn.active::after {
          content: "";
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #38bdf8, #6366f1);
        }

        /* Playground styles */
        .playground-tab-content, .feed-tab-content {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .playground-input-row {
          display: flex;
          gap: 12px;
        }

        .playground-input-row input {
          flex: 1;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--surface-glass-border);
          border-radius: var(--radius-md);
          padding: 12px 18px;
          color: #ffffff;
          font-family: var(--font-body);
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .playground-input-row input:focus {
          outline: none;
          border-color: rgba(56, 189, 248, 0.5);
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.15);
        }

        .scan-btn {
          background: linear-gradient(135deg, #38bdf8, #6366f1);
          color: #ffffff;
          border: none;
          padding: 0 24px;
          border-radius: var(--radius-md);
          font-family: var(--font-heading);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .scan-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(56, 189, 248, 0.4);
        }

        .scan-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .playground-scanning {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 0.85rem;
          color: var(--text-tertiary);
          padding: 12px;
          background: rgba(0, 0, 0, 0.15);
          border-radius: var(--radius-md);
        }

        .scan-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Results Card */
        .playground-results-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .playground-verdict {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--surface-glass-border);
        }

        .verdict-safe {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .verdict-safe h4 { color: #34d399; }

        .verdict-toxic {
          background: rgba(244, 63, 94, 0.1);
          border-color: rgba(244, 63, 94, 0.2);
          animation: glowPulse 2s infinite alternate;
        }

        .verdict-toxic h4 { color: #f43f5e; }

        .verdict-icon {
          font-size: 1.8rem;
        }

        .playground-verdict h4 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .playground-verdict p {
          margin: 4px 0 0;
          font-size: 0.8rem;
          color: var(--text-tertiary);
        }

        /* Category Breakdown */
        .breakdown-section h5, .persona-section h5 {
          margin: 0 0 12px;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-tertiary);
        }

        .category-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .cat-bar-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cat-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .cat-bar-track {
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
          overflow: hidden;
        }

        .cat-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Persona Switcher */
        .persona-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .persona-header h5 {
          margin: 0;
        }

        .persona-switcher {
          display: flex;
          background: rgba(0, 0, 0, 0.2);
          padding: 3px;
          border-radius: 6px;
          border: 1px solid var(--surface-glass-border);
        }

        .persona-btn {
          background: transparent;
          border: none;
          padding: 4px 10px;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-tertiary);
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .persona-btn.active {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .explanation-bubble {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--surface-glass-border);
          border-radius: var(--radius-md);
          padding: 16px;
          font-size: 0.9rem;
          line-height: 1.6;
          color: var(--text-secondary);
          min-height: 70px;
        }

        /* Extension Switch Banner */
        .extension-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: rgba(56, 189, 248, 0.05);
          border-radius: var(--radius-md);
          border: 1px solid rgba(56, 189, 248, 0.15);
        }

        .extension-status {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--text-tertiary);
          position: relative;
        }

        .status-dot.active {
          background: #34d399;
          box-shadow: 0 0 8px #34d399;
        }

        .extension-status h4 {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .extension-status p {
          margin: 2px 0 0;
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        /* Toggle Switch */
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-color: rgba(255, 255, 255, 0.1);
          transition: .4s;
          border-radius: 34px;
          border: 1px solid var(--surface-glass-border);
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #38bdf8;
        }

        input:checked + .slider:before {
          transform: translateX(20px);
        }

        /* Mock Post */
        .mock-feed-post {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--surface-glass-border);
          border-radius: var(--radius-md);
          padding: 16px;
        }

        .post-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .post-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #38bdf8, #6366f1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .post-header h5 {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 800;
        }

        .post-header p {
          margin: 0;
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        .post-content {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        /* Comments List */
        .feed-comments-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-height: 240px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .feed-comment {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .comment-avatar {
          font-size: 1.2rem;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
        }

        .comment-body {
          flex: 1;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--surface-glass-border);
          border-radius: 12px;
          padding: 10px 14px;
          position: relative;
        }

        .comment-author {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .comment-author h6 {
          margin: 0;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .comment-flag {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .comment-flag.insult {
          background: rgba(139, 92, 246, 0.15);
          color: var(--accent-violet);
        }

        .comment-flag.threat {
          background: rgba(244, 63, 94, 0.15);
          color: var(--accent-rose);
        }

        .comment-flag.hate-speech {
          background: rgba(99, 102, 241, 0.15);
          color: var(--accent-indigo);
        }

        .comment-text {
          margin: 0;
          font-size: 0.85rem;
          line-height: 1.5;
          color: var(--text-secondary);
        }

        .masked-comment-overlay {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .masked-text {
          font-size: 0.8rem;
          color: var(--text-tertiary);
          font-style: italic;
          font-weight: 500;
        }

        .reveal-btn, .hide-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--surface-glass-border);
          color: var(--text-primary);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .reveal-btn:hover, .hide-btn:hover {
          background: rgba(255,255,255,0.12);
        }

        .hide-btn {
          margin-left: 10px;
        }

        .feed-input-row {
          display: flex;
          gap: 10px;
        }

        .feed-input-row input {
          flex: 1;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--surface-glass-border);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          color: white;
          font-size: 0.85rem;
        }

        .feed-input-row input:focus {
          outline: none;
          border-color: rgba(56, 189, 248, 0.4);
        }

        .feed-input-row button {
          background: #ffffff;
          color: #000;
          border: none;
          padding: 0 16px;
          border-radius: var(--radius-md);
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .feed-input-row button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes glowPulse {
          0% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.2); }
          100% { box-shadow: 0 0 12px rgba(244, 63, 94, 0.4); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-slide-up {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* ===== LIVE SCANNER TAB ===== */
        .scanner-tab-content {
          display: flex;
          flex-direction: column;
        }

        .scanner-chat-box {
          height: 300px;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .scanner-chat-box::-webkit-scrollbar {
          width: 4px;
        }
        .scanner-chat-box::-webkit-scrollbar-track {
          background: transparent;
        }
        .scanner-chat-box::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }

        .scanner-msg-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .scanner-msg-bubble {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          padding: 12px 18px;
          border-radius: 18px;
          border-bottom-right-radius: 4px;
          font-size: 0.9rem;
          max-width: 90%;
          line-height: 1.5;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .scanner-result-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .scanner-result-badge.safe {
          background: rgba(16, 185, 129, 0.1);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .scanner-result-badge.toxic {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
          animation: glowPulse 2s infinite;
        }

        .scanner-scanning-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
          font-size: 0.75rem;
          color: var(--text-tertiary);
          font-weight: 600;
        }

        .scanner-input-area {
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid var(--surface-glass-border);
          display: flex;
          gap: 10px;
        }

        .scanner-input-area input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          padding: 12px 20px;
          color: #ffffff;
          font-family: var(--font-body);
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .scanner-input-area input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(99, 102, 241, 0.5);
        }

        .scanner-input-area input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .scanner-input-area button {
          background: #ffffff;
          color: #000;
          border: none;
          padding: 0 24px;
          border-radius: 999px;
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .scanner-input-area button:hover:not(:disabled) {
          background: #f0f0f0;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255,255,255,0.2);
        }

        .scanner-input-area button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
