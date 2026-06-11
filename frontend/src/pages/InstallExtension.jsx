import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import "./InstallExtension.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

export default function InstallExtension() {
  const navigate = useNavigate();

  const installationSteps = [
    { n: "1", text: "Download the extension ZIP file using the button above." },
    { n: "2", text: "Extract the downloaded ZIP file to a local folder on your computer." },
    { n: "3", text: <>Start the <a href={BACKEND_URL} target="_blank" rel="noopener noreferrer">backend server</a> by clicking this link to wake it up.</> },
    { n: "4", text: <>Open Google Chrome and navigate to <strong>chrome://extensions</strong>.</> },
    { n: "5", text: <>Enable <strong>Developer Mode</strong> using the toggle in the top-right corner.</> },
    { n: "6", text: <>Click the <strong>Load Unpacked</strong> button in the top-left corner.</> },
    { n: "7", text: "Select the folder where you extracted the extension ZIP file." },
  ];

  const usageSteps = [
    { n: "1", text: "Click the ToxiGuard icon in your Chrome toolbar to open the control panel." },
    { n: "2", text: "Log in with your email or use the public guest demo mode directly." },
    { n: "3", text: "Enable the real-time moderation filter using the main toggle switch." },
    { n: "4", text: "Navigate to social media platforms like Instagram, X, LinkedIn, etc." },
    { n: "5", text: "Watch ToxiGuard scan, flag, and auto-moderate toxic feed comments in real time!" },
    { n: "6", text: "Select any text on any website to see the dynamic floating shield and scan it instantly." }
  ];

  return (
    <div className="install-page">
      <Header />

      {/* Hero Section (Space-Dark Theme) */}
      <div className="install-hero-wrapper">
        <div className="install-hero-glow" />
        <div className="install-hero-grid" />

        <div className="install-hero-content animate-fade-in-up">
          <span className="install-tag">
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#6366f1" }} />
            Chrome Extension
          </span>
          <h1>
            Install the <span className="install-hero-gradient">ToxiGuard Shield</span>
          </h1>
          <p>
            Experience seamless, real-time AI moderation across Instagram, X/Twitter, 
            LinkedIn, and other websites. Control your social feed on any desktop or mobile browser.
          </p>

          <a href="/extension.zip" download className="install-download-btn">
            Download Extension ZIP
            <span>→</span>
          </a>

          <div className="install-note">
            Compatible with Chrome, Brave, Edge, Opera, and mobile Chromium-based browsers
          </div>
        </div>
      </div>

      {/* Main Content (Blended Light Theme) */}
      <div className="install-main-container">
        
        {/* Installation Steps */}
        <section className="install-section animate-fade-in-up delay-2">
          <div className="install-section-header">
            <h2>Easy 1-Minute Setup</h2>
            <p>Follow these quick steps to get ToxiGuard running in developer mode</p>
          </div>

          <div className="install-steps-grid">
            {installationSteps.map((s, i) => (
              <div key={i} className="install-step-card">
                <div className="install-step-num-badge">{s.n}</div>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to Use */}
        <section className="install-section animate-fade-in-up delay-3">
          <div className="install-section-header">
            <h2>How to Use</h2>
            <p>Control the filter, moderate your feeds, and audit custom text</p>
          </div>

          <div className="install-steps-grid">
            {usageSteps.map((s, i) => (
              <div key={i} className="install-step-card">
                <div className="install-step-num-badge">{s.n}</div>
                <p>{s.text}</p>
              </div>
            ))}
          </div>

          <div className="install-tip-box">
            <span className="install-tip-icon">💡</span>
            <p>
              <strong>Pro-tip:</strong> If comments on social pages do not moderate immediately 
              after toggling settings, simply refresh the tab to initialize the target injection script.
            </p>
          </div>
        </section>

        {/* Security Summary (Premium Dark Panel) */}
        <section className="install-security-wrapper animate-fade-in-up delay-4">
          <div className="install-security-glow" />
          <div className="install-security-content">
            <span className="install-security-icon">🛡️</span>
            <h3>Privacy & Security Focused</h3>
            <p>
              ToxiGuard processes moderation decisions directly via API requests and never logs 
              your social media passwords or session cookies. Analyzed text fragments are matched 
              securely in memory and are never persisted on our hosting servers.
            </p>
          </div>
        </section>

        {/* Navigation */}
        <div className="install-navigation animate-fade-in-up delay-5">
          <button className="back-home-btn" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}