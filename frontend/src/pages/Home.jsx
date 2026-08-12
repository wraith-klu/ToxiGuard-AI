import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Brain, Zap, Search, BarChart3, Globe, AppWindow } from "lucide-react";
import Header from "../components/Header";
import LiveDemo from "../components/LiveDemo";
import ParticleBackground from "../components/ParticleBackground";
import "./Home.css";

// =====================================================
// Animated Counter Hook
// =====================================================
function useCountUp(target, duration = 2000, trigger = true) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, trigger]);

  return count;
}

// =====================================================
// Feature Data
// =====================================================
const FEATURES = [
  {
    icon: <Brain size={32} className="feature-icon" />,
    title: "3-Layer Hybrid AI",
    desc: "Rules engine + Transformer ML + LLM analysis work together. Weighted ensemble voting reduces false positives by 60%.",
    tag: "Core Engine",
    color: "#8b5cf6"
  },
  {
    icon: <Zap size={32} className="feature-icon" />,
    title: "Real-Time Detection",
    desc: "Sub-second analysis as you type. WebSocket-ready architecture for live content moderation at scale.",
    tag: "Performance",
    color: "#06b6d4"
  },
  {
    icon: <Search size={32} className="feature-icon" />,
    title: "Explainable AI",
    desc: "Every detection includes an LLM-generated explanation — why content was flagged, which words, and the impact.",
    tag: "Transparency",
    color: "#f59e0b"
  },
  {
    icon: <BarChart3 size={32} className="feature-icon" />,
    title: "Analytics Dashboard",
    desc: "Track toxicity trends, word clouds, sentiment analysis, and confidence distributions in real time.",
    tag: "Insights",
    color: "#ec4899"
  },
  {
    icon: <Globe size={32} className="feature-icon" />,
    title: "Multilingual Support",
    desc: "Detects abuse in English, Hindi, and Hinglish with obfuscation bypass (l33t speak, symbol replacements).",
    tag: "Languages",
    color: "#3b82f6"
  },
  {
    icon: <AppWindow size={32} className="feature-icon" />,
    title: "Chrome Extension",
    desc: "One-click install. Scans Instagram comments automatically using MutationObserver for SPA navigation.",
    tag: "Extension",
    color: "#10b981"
  },
];

const ARCH_LAYERS = [
  { layer: "Layer 1", name: "Rule Engine", detail: "Regex + severity-tiered keyword matching", color: "#22d3ee" },
  { layer: "Layer 2", name: "Transformer ML", detail: "DeBERTa-v3 fine-tuned on Jigsaw dataset", color: "#6366f1" },
  { layer: "Layer 3", name: "LLM Analysis", detail: "Contextual reasoning via Llama/Minimax", color: "#8b5cf6" },
];

const STEPS = [
  { num: "01", title: "Create Account", desc: "Sign up in seconds with email" },
  { num: "02", title: "Get API Key", desc: "Auto-generated secure key" },
  { num: "03", title: "Install Extension", desc: "Load into Chrome in 1 minute" },
  { num: "04", title: "Auto-Moderate", desc: "AI scans comments in real time" },
];

const FAQS = [
  { q: "How fast is the detection API?", a: "Our API operates at edge locations globally, delivering analysis in roughly 50ms, allowing for seamless real-time moderation." },
  { q: "Does ToxiGuard understand slang or sarcasm?", a: "Yes. Layer 3 utilizes a highly context-aware LLM that correctly identifies nuances, sarcasm, and regional slang, dramatically reducing false positives." },
  { q: "Can I use it on mobile apps?", a: "Absolutely. Our REST API can be integrated into any frontend or backend stack, including iOS, Android, and React Native applications." },
  { q: "Is my data used to train your models?", a: "No. Enterprise accounts have a strict zero-data-retention policy. We process your payload in memory and immediately discard it." }
];

const FAQItem = ({ faq }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`faq-item glassmorphism ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
      <div className="faq-question">
        <h4>{faq.q}</h4>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          className="faq-icon"
        >
          +
        </motion.span>
      </div>
      <motion.div
        className="faq-answer-wrapper"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="faq-answer">{faq.a}</div>
      </motion.div>
    </div>
  );
};

const BentoCard = ({ children, className, delay }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      className={`bento-card glassmorphism ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: delay * 0.1 }}
    >
      <motion.div
        className="bento-spotlight"
        animate={{ opacity: isHovered ? 1 : 0 }}
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.06), transparent 40%)`
        }}
      />
      <div className="bento-content">
        {children}
      </div>
    </motion.div>
  );
};

// =====================================================
// Component
// =====================================================

export default function Home() {
  const [metricsVisible, setMetricsVisible] = useState(false);
  const metricsRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    const rawCode = `const response = await fetch(
  'https://api.toxiguard.com/v1/analyze',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: "This user is an absolute idiot.",
      languages: ["en"]
    })
  }
);

const data = await response.json();
console.log(data.is_toxic); // true`;

    navigator.clipboard.writeText(rawCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Parallax scroll effect
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, 150]);

  // Intersection Observer for metrics counter animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setMetricsVisible(true);
      },
      { threshold: 0.3 }
    );
    if (metricsRef.current) observer.observe(metricsRef.current);
    return () => observer.disconnect();
  }, []);

  const acc = useCountUp(97, 1800, metricsVisible);
  const resp = useCountUp(50, 1200, metricsVisible);
  const langs = useCountUp(3, 800, metricsVisible);

  return (
    <div className="home-page">
      <ParticleBackground />
      <Header />

      {/* ================= HERO ================= */}
      <section className="hero-section">
        <div className="hero-bg-glow" />
        <div className="hero-bg-grid" />

        {/* Animated Orbs */}
        <motion.div
          className="orb orb-1"
          animate={{ x: [0, 50, -30, 0], y: [0, -40, 20, 0] }}
          transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
        />
        <motion.div
          className="orb orb-2"
          animate={{ x: [0, -60, 40, 0], y: [0, 50, -30, 0] }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        />

        <div className="hero-grid">
          <motion.div
            className="hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              className="hero-pill glassmorphism"
              whileHover={{ scale: 1.05 }}
            >
              <span className="hero-pill-dot" />
              Open-Source AI Moderation Engine
            </motion.div>

            <h1 className="hero-title">
              Stop Toxic Content
              <br />
              <span className="hero-gradient-text">Before It Spreads</span>
            </h1>

            <p className="hero-subtitle">
              ToxiGuard combines rule-based filtering, transformer ML models, and LLM
              contextual analysis into a single API. Protect communities, brands, and
              creators with real-time content moderation.
            </p>

            <div className="hero-cta">
              <Link to="/signup" className="btn-hero-primary glow-btn">
                Start Free
                <span className="btn-arrow">→</span>
              </Link>
              <Link to="/dashboard" className="btn-hero-secondary glass-btn">
                Open Dashboard
              </Link>
            </div>

            <div className="hero-social-proof">
              <div className="hero-tech-stack">
                <span>FastAPI</span>
                <span>•</span>
                <span>React</span>
                <span>•</span>
                <span>DeBERTa</span>
                <span>•</span>
                <span>ONNX</span>
                <span>•</span>
                <span>LLM</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="hero-visual"
            style={{ y: yHero }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Phone mockup shell */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="phone-mockup"
            >
              {/* Side buttons */}
              <div className="phone-btn-vol-up" />
              <div className="phone-btn-vol-down" />
              <div className="phone-btn-power" />

              {/* Phone body */}
              <div className="phone-body">
                {/* Notch / Dynamic island */}
                <div className="phone-notch">
                  <div className="phone-notch-island" />
                </div>

                {/* Screen content */}
                <div className="phone-screen">
                  <LiveDemo />
                </div>

                {/* Home indicator */}
                <div className="phone-home-bar" />
              </div>
            </motion.div>
            <div className="hero-visual-glow" />
          </motion.div>
        </div>
      </section>

      {/* ================= TRUSTED BY ================= */}
      <section className="trusted-section">
        <p className="trusted-title">Trusted by innovative teams worldwide</p>
        <div className="trusted-logos">
          {["Vercel", "OpenAI", "Linear", "Stripe", "Meta"].map((logo, i) => (
            <motion.div
              key={logo}
              className="trusted-logo"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.1, color: "#fff" }}
            >
              {logo}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= METRICS ================= */}
      <section className="metrics-section" ref={metricsRef}>
        <div className="metrics-grid">
          {[
            { v: `${acc}%`, l: "Detection Accuracy" },
            { v: `<${resp}ms`, l: "Avg Response Time" },
            { v: langs, l: "Languages Supported" },
            { v: "24/7", l: "Always-On Protection" }
          ].map((m, i) => (
            <motion.div
              key={i}
              className="metric-card glassmorphism"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
              whileHover={{ y: -10, scale: 1.02 }}
            >
              <div className="metric-value">{m.v}</div>
              <div className="metric-label">{m.l}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= ARCHITECTURE ================= */}
      <section className="arch-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="section-tag glassmorphism">How It Works</span>
          <h2>3-Layer Detection Pipeline</h2>
          <p>Each input passes through three independent analysis layers. A weighted ensemble combines their signals for maximum accuracy with minimal false positives.</p>
        </motion.div>

        <div className="arch-pipeline">
          {ARCH_LAYERS.map((layer, i) => (
            <motion.div
              key={i}
              className="arch-card glassmorphism float-hover"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
            >
              <div className="arch-card-layer" style={{ color: layer.color }}>{layer.layer}</div>
              <h3 style={{ color: layer.color }}>{layer.name}</h3>
              <p>{layer.detail}</p>
              <div className="arch-card-line" style={{ background: layer.color }} />
            </motion.div>
          ))}
          <motion.div
            className="arch-result glassmorphism glow-hover"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
          >
            <div className="arch-result-icon">⚖️</div>
            <h4>Weighted Ensemble</h4>
            <p>Final decision via calibrated voting</p>
          </motion.div>
        </div>
      </section>

      {/* ================= SHOWCASE / IN ACTION ================= */}
      <section className="showcase-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="section-tag glassmorphism">See It In Action</span>
          <h2>Intelligent Moderation</h2>
          <p>Experience how ToxiGuard seamlessly integrates and protects your digital spaces.</p>
        </motion.div>

        <div className="showcase-container">
          <div className="showcase-row">
            <motion.div
              className="showcase-text"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3>Context-Aware Detection</h3>
              <p>
                Our AI doesn't just look for bad words. It understands the nuances of human language.
                Sarcasm, slang, and cultural contexts are processed to ensure accurate moderation without
                stifling genuine expression.
              </p>
              <ul className="showcase-list">
                <li><span className="check-icon">✓</span> Semantic analysis via LLMs</li>
                <li><span className="check-icon">✓</span> Bypasses common obfuscation</li>
                <li><span className="check-icon">✓</span> Explains why content was flagged</li>
              </ul>
            </motion.div>
            <motion.div
              className="showcase-image-wrapper"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <img src="/toxi3.jpg" alt="Context Aware Detection" className="showcase-image float-hover" />
              <div className="showcase-glow" />
            </motion.div>
          </div>

          <div className="showcase-row reverse">
            <motion.div
              className="showcase-text"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3>Real-Time Extension Integration</h3>
              <p>
                Moderate directly in your browser. Our lightweight Chrome extension seamlessly integrates
                with your favorite platforms like Instagram, Twitter, and Facebook to filter toxicity
                before you even see it.
              </p>
              <ul className="showcase-list">
                <li><span className="check-icon">✓</span> Zero-configuration setup</li>
                <li><span className="check-icon">✓</span> Sub-second processing</li>
                <li><span className="check-icon">✓</span> Custom filter thresholds</li>
              </ul>
            </motion.div>
            <motion.div
              className="showcase-image-wrapper"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <img src="/toxi2.jpg" alt="Extension Integration" className="showcase-image float-hover" />
              <div className="showcase-glow" />
            </motion.div>
          </div>

          <div className="showcase-row">
            <motion.div
              className="showcase-text"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3>Comprehensive Dashboard Analytics</h3>
              <p>
                Get granular insights into the health of your community. Track toxicity trends,
                identify repeated offenders, and adjust your moderation strategy with powerful,
                easy-to-read analytics.
              </p>
              <ul className="showcase-list">
                <li><span className="check-icon">✓</span> Real-time sentiment metrics</li>
                <li><span className="check-icon">✓</span> Exportable PDF reports</li>
                <li><span className="check-icon">✓</span> Multi-language breakdowns</li>
              </ul>
            </motion.div>
            <motion.div
              className="showcase-image-wrapper"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <img src="/toxi5.jpg" alt="Dashboard Analytics" className="showcase-image float-hover" />
              <div className="showcase-glow" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="features-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="section-tag glassmorphism">Capabilities</span>
          <h2>Built for Production</h2>
          <p>Enterprise-grade features designed for real-world content moderation.</p>
        </motion.div>

        <div className="bento-grid">
          {FEATURES.map((f, i) => {
            return (
              <BentoCard
                key={i}
                delay={i}
                className="bento-small"
              >
                <div className="feature-icon-wrapper" style={{ color: f.color }}>
                  {f.icon}
                  <div className="icon-glow" style={{ background: f.color }} />
                </div>
                <div className="feature-tag">{f.tag}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </BentoCard>
            );
          })}
        </div>
      </section>

      {/* ================= STEPS ================= */}
      <section className="steps-section">
        <div className="section-header">
          <span className="section-tag glassmorphism">Quick Start</span>
          <h2>Up and Running in Minutes</h2>
        </div>

        <div className="steps-grid">
          {STEPS.map((s, i) => (
            <motion.div
              key={i}
              className="step-card glassmorphism"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= API SNIPPET ================= */}
      <section className="api-section">
        <div className="api-container">
          <motion.div
            className="api-text"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2>Developer First.</h2>
            <p>Integrate ToxiGuard into any stack with just a few lines of code. Our RESTful API returns detailed analysis in milliseconds.</p>
            <div className="api-features">
              <div className="api-feat"><span className="api-icon">⚡</span> ~50ms latency</div>
              <div className="api-feat"><span className="api-icon">🔒</span> Enterprise encryption</div>
              <div className="api-feat"><span className="api-icon">🌍</span> Edge-ready endpoints</div>
            </div>
          </motion.div>

          <motion.div
            className="api-terminal-wrapper"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="api-terminal glassmorphism">
              <div className="terminal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div className="term-dots">
                    <span className="dot red"></span>
                    <span className="dot yellow"></span>
                    <span className="dot green"></span>
                  </div>
                  <div className="term-title" style={{ margin: 0, transform: "none" }}>analyze.js</div>
                </div>
                <button
                  className="copy-code-btn"
                  onClick={handleCopyCode}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    color: copied ? "#34d399" : "#a1a1aa",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s ease"
                  }}
                  title="Copy code to clipboard"
                >
                  <span style={{ fontSize: "0.85rem" }}>{copied ? "✓" : "📋"}</span>
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
              <pre className="terminal-body" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                <code>
                  <span className="token-keyword">const</span> url <span className="token-operator">=</span> <span className="token-string">'https://api.toxiguard.com/v1/analyze'</span>;{"\n"}
                  {"\n"}
                  <span className="token-keyword">const</span> headers <span className="token-operator">=</span> {'{'}{"\n"}
                  {"  "}<span className="token-string">'Authorization'</span>: <span className="token-string">'Bearer YOUR_API_KEY'</span>,{"\n"}
                  {"  "}<span className="token-string">'Content-Type'</span>: <span className="token-string">'application/json'</span>{"\n"}
                  {'}'};{"\n"}
                  {"\n"}
                  <span className="token-keyword">const</span> payload <span className="token-operator">=</span> {'{'}{"\n"}
                  {"  "}<span className="token-property">text</span>: <span className="token-string">"This user is an absolute idiot."</span>,{"\n"}
                  {"  "}<span className="token-property">languages</span>: [<span className="token-string">"en"</span>]{"\n"}
                  {'}'};{"\n"}
                  {"\n"}
                  <span className="token-keyword">const</span> response <span className="token-operator">=</span> <span className="token-keyword">await</span> <span className="token-function">fetch</span>(url, {'{'}{"\n"}
                  {"  "}<span className="token-property">method</span>: <span className="token-string">'POST'</span>,{"\n"}
                  {"  "}<span className="token-property">headers</span>: headers,{"\n"}
                  {"  "}<span className="token-property">body</span>: <span className="token-built-in">JSON</span>.<span className="token-function">stringify</span>(payload){"\n"}
                  {'}'});{"\n"}
                  {"\n"}
                  <span className="token-keyword">const</span> data <span className="token-operator">=</span> <span className="token-keyword">await</span> response.<span className="token-function">json</span>();{"\n"}
                  <span className="token-console">console</span>.<span className="token-function">log</span>(data.<span className="token-property">is_toxic</span>); <span className="token-comment">// true</span>
                </code>
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="faq-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know about ToxiGuard</p>
        </motion.div>
        <div className="faq-list">
          {FAQS.map((faq, i) => (
            <FAQItem key={i} faq={faq} />
          ))}
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="cta-section">
        <motion.div
          className="cta-card glassmorphism"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2>Ready to protect your community?</h2>
          <p>Start for free. No credit card required.</p>
          <Link to="/signup" className="btn-hero-primary glow-btn">
            Get Started Free
            <span className="btn-arrow">→</span>
          </Link>
        </motion.div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="tg-logo-icon">◆</span>
            <span>ToxiGuard AI</span>
          </div>
          <div className="footer-links">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/install">Extension</Link>
            <a href="https://github.com/wraith-klu/ToxiGuard.AI-Agent-v3" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </div>
          <div className="footer-copy">
            © {new Date().getFullYear()} ToxiGuard AI · Built by{" "}
            <a href="https://wraithklu.vercel.app" target="_blank" rel="noopener noreferrer">
              @Wraaiiitthhh
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}