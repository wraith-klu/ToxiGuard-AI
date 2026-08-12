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
  const [activeTab, setActiveTab] = useState("feed"); // "scanner" | "playground" | "feed"
  
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
  const [currentTime, setCurrentTime] = useState("");

  // Real-time status bar clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

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
      {/* Simulated Device Status Bar */}
      <div className="simulated-status-bar">
        <span className="sim-time">{currentTime || "9:41 AM"}</span>
        <div className="sim-status-icons">
          <span className="sim-icon">📶</span>
          <span className="sim-icon">LTE</span>
          <span className="sim-icon-battery">🔋</span>
        </div>
      </div>

      {/* Premium App Header Bar */}
      <div className="app-header-bar">
        <span className="app-back-btn">‹</span>
        <span className="app-header-title">ToxiGuard Social Feed</span>
        <span className="app-menu-dots">•••</span>
      </div>

      {/* SOCIAL FEED SIMULATOR */}
      <div className="feed-tab-content">
        {/* Extension Status Switcher */}
        <div className="extension-banner glassmorphism">
          <div className="extension-status">
            <span className={`status-dot ${extensionActive ? "active" : ""}`} />
            <div>
              <h4>ToxiGuard Shield</h4>
              <p>{extensionActive ? "Auto-moderating comments" : "Disabled (raw feed shown)"}</p>
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
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <h5>ToxiGuard AI</h5>
                <span className="verified-badge">✓</span>
              </div>
              <p>@toxiguard_ai · Sponsored</p>
            </div>
          </div>
          <p className="post-content">
            Introducing our DeBERTa-v3 model package on ONNX Runtime. Moderate content natively at the edge with sub-10ms latencies. Check out our open release.
          </p>

          {/* Post Interaction Bar */}
          <div className="post-interaction-bar">
            <span className="interaction-item">❤️ 1,248</span>
            <span className="interaction-item">💬 {comments.length}</span>
            <span className="interaction-item">🔁 314</span>
            <span className="interaction-item">✉️</span>
          </div>
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
                      <span className="masked-text">🛡️ Hidden by ToxiGuard AI</span>
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
            placeholder="Type comment (try 'idiot' or 'stupid')..."
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
          />
          <button type="submit" disabled={!newCommentText.trim()}>Send</button>
        </form>
      </div>

      {/* Simulated App Bottom Navigation Tab Bar */}
      <div className="app-bottom-nav-bar">
        <span className="nav-item active">🏠</span>
        <span className="nav-item">🔍</span>
        <span className="nav-item plus-btn">+</span>
        <span className="nav-item">🔔</span>
        <span className="nav-item">👤</span>
      </div>

      <style>{`
        .live-demo-container {
          background: #07070d;
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
          z-index: 10;
          font-family: var(--font-body);
          display: flex;
          flex-direction: column;
        }

        /* Simulated Status Bar */
        .simulated-status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #0b0b14;
          padding: 8px 24px 2px 24px;
          font-size: 0.68rem;
          color: #a5b4fc;
          font-weight: 700;
          letter-spacing: 0.5px;
          user-select: none;
        }
        .sim-status-icons {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .sim-icon {
          font-size: 0.65rem;
        }

        /* Verified Badge */
        .verified-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 12px;
          height: 12px;
          background: #38bdf8;
          color: #000000;
          font-size: 0.55rem;
          font-weight: 900;
          border-radius: 50%;
          line-height: 1;
        }

        /* Post Interaction Bar */
        .post-interaction-bar {
          display: flex;
          gap: 16px;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          color: #818cf8;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .interaction-item {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          transition: color 0.2s;
        }
        .interaction-item:hover {
          color: #a5b4fc;
        }

        /* Bottom Tab Bar */
        .app-bottom-nav-bar {
          display: flex;
          justify-content: space-around;
          align-items: center;
          background: #0b0b14;
          padding: 10px 0;
          border-top: 1px solid rgba(99, 102, 241, 0.15);
          user-select: none;
        }
        .nav-item {
          font-size: 1.1rem;
          color: #52525b;
          cursor: pointer;
          transition: color 0.2s;
        }
        .nav-item.active {
          color: #a5b4fc;
          text-shadow: 0 0 8px rgba(165, 180, 252, 0.4);
        }
        .nav-item.plus-btn {
          font-size: 1.3rem;
          color: #ffffff;
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
        }

        /* App Header Bar */
        .app-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #0b0b14;
          padding: 8px 16px 12px;
          border-bottom: 1px solid rgba(99, 102, 241, 0.15);
          user-select: none;
        }

        .app-back-btn {
          font-size: 1.6rem;
          color: #a5b4fc;
          cursor: pointer;
          line-height: 1;
        }

        .app-header-title {
          font-family: var(--font-heading);
          font-size: 0.85rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.5px;
        }

        .app-menu-dots {
          font-size: 0.6rem;
          color: #6366f1;
          letter-spacing: 1px;
          cursor: pointer;
        }

        /* Feed Content Container – scrollable so banner/post slide out of view */
        .feed-tab-content {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex: 1;
          overflow-y: auto;
          scroll-behavior: smooth;
        }

        .feed-tab-content::-webkit-scrollbar {
          width: 3px;
        }
        .feed-tab-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .feed-tab-content::-webkit-scrollbar-thumb {
          background: rgba(165, 180, 252, 0.2);
          border-radius: 2px;
        }

        /* Extension Switch Banner */
        .extension-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: rgba(13, 13, 26, 0.75);
          border-radius: 12px;
          border: 1px solid rgba(99, 102, 241, 0.22);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
        }

        .extension-status {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 8px #ef4444;
          transition: all 0.3s ease;
        }

        .status-dot.active {
          background: #10b981;
          box-shadow: 0 0 10px #10b981;
        }

        .extension-status h4 {
          margin: 0;
          font-size: 0.8rem;
          font-weight: 800;
          color: #ffffff;
        }

        .extension-status p {
          margin: 2px 0 0;
          font-size: 0.68rem;
          color: #818cf8;
        }

        /* Toggle Switch */
        .switch {
          position: relative;
          display: inline-block;
          width: 38px;
          height: 20px;
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
          background-color: rgba(255, 255, 255, 0.08);
          transition: .4s;
          border-radius: 34px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #6366f1;
        }

        input:checked + .slider:before {
          transform: translateX(18px);
        }

        /* Mock Post */
        .mock-feed-post {
          background: #0b0b14;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 12px;
          box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.3);
        }

        .post-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .post-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.8rem;
        }

        .post-header h5 {
          margin: 0;
          font-size: 0.8rem;
          font-weight: 800;
          color: #ffffff;
        }

        .post-header p {
          margin: 0;
          font-size: 0.68rem;
          color: #71717a;
        }

        .post-content {
          margin: 0;
          font-size: 0.8rem;
          line-height: 1.5;
          color: #d4d4d8;
        }

        .feed-comments-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .feed-comment {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .comment-avatar {
          font-size: 1.1rem;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
        }

        .comment-body {
          flex: 1;
          /* Raised Neomorphic Bubble on Dark Screen */
          background: linear-gradient(145deg, #111122, #0a0a16);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 8px 12px;
          position: relative;
          box-shadow:
            3px 3px 8px rgba(0,0,0,0.6),
            inset 1px 1px 0 rgba(255,255,255,0.02);
        }

        .comment-author {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .comment-author h6 {
          margin: 0;
          font-size: 0.75rem;
          font-weight: 800;
          color: #ffffff;
        }

        .comment-flag {
          font-size: 0.58rem;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .comment-flag.insult {
          background: rgba(6, 182, 212, 0.12);
          color: #22d3ee;
          border: 1px solid rgba(6, 182, 212, 0.25);
        }

        .comment-flag.threat {
          background: rgba(244, 63, 94, 0.12);
          color: #f43f5e;
          border: 1px solid rgba(244, 63, 94, 0.25);
        }

        .comment-flag.hate-speech {
          background: rgba(139, 92, 246, 0.12);
          color: #a78bfa;
          border: 1px solid rgba(139, 92, 246, 0.25);
        }

        .comment-text {
          margin: 0;
          font-size: 0.78rem;
          line-height: 1.4;
          color: #a1a1aa;
        }

        /* Masked overlay */
        .masked-comment-overlay {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.18);
          border-radius: 6px;
          padding: 4px 8px;
        }

        .masked-text {
          font-size: 0.72rem;
          color: #f87171;
          font-style: italic;
          font-weight: 600;
        }

        .reveal-btn, .hide-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }

        .reveal-btn:hover, .hide-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .hide-btn {
          margin-left: 6px;
        }

        /* Comment Input row – sticky at bottom of scroll area */
        .feed-input-row {
          display: flex;
          gap: 8px;
          position: sticky;
          bottom: 0;
          background: #07070d;
          padding: 10px 0 4px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          z-index: 10;
          margin-top: auto;
        }

        .feed-input-row input {
          flex: 1;
          background: #040408;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 999px;
          padding: 8px 14px;
          color: white;
          font-size: 0.75rem;
          /* Recessed Neomorphic Input on Dark Surface */
          box-shadow:
            inset 2px 2px 6px rgba(0,0,0,0.85),
            inset -1px -1px 3px rgba(255,255,255,0.02);
        }

        .feed-input-row input:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.4);
        }

        .feed-input-row button {
          background: linear-gradient(145deg, #ffffff, #d4d4d8);
          color: #09090b;
          border: none;
          padding: 0 14px;
          border-radius: 999px;
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow:
            3px 3px 8px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .feed-input-row button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            4px 5px 12px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .feed-input-row button:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow:
            inset 2px 2px 5px rgba(0,0,0,0.3);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
