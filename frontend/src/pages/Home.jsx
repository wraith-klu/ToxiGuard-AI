import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Brain, Zap, Search, BarChart3, Globe, AppWindow } from "lucide-react";
import Header from "../components/Header";
import LiveDemo from "../components/LiveDemo";
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

// =====================================================
// Component
// =====================================================

export default function Home() {
  const [metricsVisible, setMetricsVisible] = useState(false);
  const metricsRef = useRef(null);
  
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
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="live-demo-wrapper glassmorphism"
            >
              <LiveDemo />
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

        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <motion.div 
              key={i} 
              className="feature-card glassmorphism"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -10 }}
            >
              <div className="feature-icon-wrapper" style={{ color: f.color }}>
                {f.icon}
                <div className="icon-glow" style={{ background: f.color }} />
              </div>
              <div className="feature-tag">{f.tag}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
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
            <a href="https://github.com/wraith-klu/ToxiGuard.AI-Agent" target="_blank" rel="noopener noreferrer">
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