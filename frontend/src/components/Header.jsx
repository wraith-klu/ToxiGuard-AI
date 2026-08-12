import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import ThemeToggle from "./ThemeToggle";

export default function Header({ onLogout, isDashboard = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const apiKey = localStorage.getItem("api_key");
  const email = localStorage.getItem("user_email") || (apiKey ? "user@toxiguard.ai" : null);

  const isActive = (path) => location.pathname === path;

  const navLinks = isDashboard
    ? []
    : [
      { path: "/", label: "Home" },
      { path: "/install", label: "Extension" },
    ];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getUsernameFromEmail = (emailStr) => {
    if (!emailStr) return "";
    const prefix = emailStr.split("@")[0];
    return prefix
      .split(/[\._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  
  const userName = email ? getUsernameFromEmail(email) : "";

  const handleDropdownLogout = () => {
    setDropdownOpen(false);
    localStorage.removeItem("api_key");
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    if (onLogout) {
      onLogout();
    } else {
      navigate("/login");
    }
  };

  const getHash = (str) => {
    let hash = 0;
    if (!str) return 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const renderAvatar = (emailStr) => {
    const hash = emailStr ? getHash(emailStr) : 0;
    const gradients = [
      ["#38bdf8", "#6366f1"],
      ["#ec4899", "#f43f5e"],
      ["#10b981", "#059669"],
      ["#f59e0b", "#d97706"],
      ["#8b5cf6", "#d946ef"]
    ];
    const [c1, c2] = gradients[hash % gradients.length];
    
    return (
      <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`grad-${hash}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="20" fill={`url(#grad-${hash})`} />
        
        {/* Character illustration overlay */}
        <rect x="12" y="12" width="16" height="13" rx="3" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.5" />
        <rect x="14" y="15" width="12" height="4" rx="1" fill="#0f172a" />
        <circle cx="17.5" cy="17" r="1" fill="#38bdf8" />
        <circle cx="22.5" cy="17" r="1" fill="#38bdf8" />
        <path d="M17 21H23" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="20" y1="12" x2="20" y2="8" stroke="white" strokeWidth="1.2" />
        <circle cx="20" cy="7" r="1" fill="#38bdf8" />
        <path d="M11 33C11 30 15 28 20 28C25 28 29 30 29 33" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  };

  return (
    <header className="tg-header">
      <div className="tg-header-inner">
        {/* Logo */}
        <Link to="/" className="tg-logo">
          <span className="tg-logo-icon">◆</span>
          <span className="tg-logo-text">ToxiGuard</span>
          <span className="tg-logo-badge">AI</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="tg-nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`tg-nav-link ${isActive(link.path) ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="tg-header-actions">
          <ThemeToggle />
          {apiKey ? (
            <div className="tg-user-dropdown-container" ref={dropdownRef}>
              <div 
                className="tg-user-profile-badge"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="tg-avatar-circle">
                  {renderAvatar(email)}
                </div>
                <div className="tg-user-info-text">
                  <span className="tg-user-name">{userName}</span>
                  <span className="tg-user-email">{email}</span>
                </div>
                <span className={`tg-dropdown-arrow ${dropdownOpen ? 'open' : ''}`}>▼</span>
              </div>
              
              {dropdownOpen && (
                <div className="tg-user-dropdown-menu animate-scale-in">
                  <div className="tg-dropdown-header">
                    <strong>{userName}</strong>
                    <span>{email}</span>
                  </div>
                  <hr className="tg-dropdown-divider" />
                  <Link to="/dashboard" className="tg-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    📊 Dashboard
                  </Link>
                  <Link to="/install" className="tg-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    🔌 Install Extension
                  </Link>
                  <hr className="tg-dropdown-divider" />
                  <button className="tg-dropdown-item tg-dropdown-logout" onClick={handleDropdownLogout}>
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="tg-btn-ghost">
                Log In
              </Link>
              <Link to="/signup" className="tg-btn-primary-sm">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="tg-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className={`tg-hamburger ${mobileOpen ? "open" : ""}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="tg-mobile-menu animate-slide-down">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--surface-glass-border)", marginBottom: "8px" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>THEME</span>
            <ThemeToggle />
          </div>

          {apiKey && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderBottom: "1px solid var(--surface-glass-border)", marginBottom: "8px" }}>
              <div className="tg-avatar-circle" style={{ width: "36px", height: "36px" }}>
                {renderAvatar(email)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{userName}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>{email}</span>
              </div>
            </div>
          )}

          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="tg-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          
          {apiKey ? (
            <>
              <Link
                to="/dashboard"
                className="tg-mobile-link"
                onClick={() => setMobileOpen(false)}
              >
                📊 Dashboard
              </Link>
              <button className="tg-mobile-link tg-dropdown-logout" onClick={() => { setMobileOpen(false); handleDropdownLogout(); }}>
                🚪 Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="tg-mobile-link"
                onClick={() => setMobileOpen(false)}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="tg-mobile-link tg-mobile-primary"
                onClick={() => setMobileOpen(false)}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      )}

      <style>{`
        .tg-header {
          position: sticky;
          top: 0;
          z-index: 100;
          -webkit-backdrop-filter: blur(20px) saturate(140%);
          backdrop-filter: blur(20px) saturate(140%);
          background: var(--surface-glass);
          border-bottom: 1px solid var(--surface-glass-border);
        }

        .tg-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
        }

        /* Logo */
        .tg-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          flex-shrink: 0;
        }

        .tg-logo-icon {
          font-size: 1.2rem;
          background: linear-gradient(135deg, #38bdf8, #6366f1);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .tg-logo-text {
          font-family: "Outfit", system-ui, sans-serif;
          font-weight: 800;
          font-size: 1.25rem;
          color: var(--text-primary);
          letter-spacing: -0.3px;
        }

        .tg-logo-badge {
          font-family: "Outfit", system-ui, sans-serif;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          background: linear-gradient(135deg, #38bdf8, #6366f1);
          color: #fff;
          letter-spacing: 0.5px;
        }

        /* Nav Links */
        .tg-nav {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .tg-nav-link {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .tg-nav-link:hover {
          color: var(--text-primary);
          background: var(--surface-glass-hover);
        }

        .tg-nav-link.active {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.08);
        }

        /* Actions */
        .tg-header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .tg-btn-ghost {
          padding: 8px 18px;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: none;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          font-family: "Inter", system-ui, sans-serif;
        }

        .tg-btn-ghost:hover {
          color: var(--text-primary);
          background: var(--surface-glass-hover);
          border-color: var(--surface-glass-border);
        }

        .tg-btn-primary-sm {
          padding: 8px 20px;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 700;
          background: linear-gradient(135deg, #38bdf8, #6366f1);
          color: #fff;
          text-decoration: none;
          transition: all 0.2s ease;
          font-family: "Outfit", system-ui, sans-serif;
        }

        .tg-btn-primary-sm:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(56, 189, 248, 0.3);
        }

        /* User Profile Dropdown Card */
        .tg-user-dropdown-container {
          position: relative;
        }

        .tg-user-profile-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px 6px 6px;
          background: rgba(255, 255, 255, 0.45);
          border: 1px solid var(--surface-glass-border);
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--neo-btn-shadow);
          user-select: none;
        }

        [data-theme="dark"] .tg-user-profile-badge {
          background: rgba(15, 23, 42, 0.45);
        }

        .tg-user-profile-badge:hover {
          background: rgba(255, 255, 255, 0.7);
          box-shadow: var(--neo-btn-shadow-hover);
          border-color: rgba(56, 189, 248, 0.3);
        }

        [data-theme="dark"] .tg-user-profile-badge:hover {
          background: rgba(15, 23, 42, 0.7);
        }

        .tg-avatar-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.2);
          box-shadow: var(--neo-btn-shadow);
        }

        .tg-user-info-text {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .tg-user-name {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 0.8rem;
          line-height: 1.2;
          color: var(--text-primary);
        }

        .tg-user-email {
          font-size: 0.65rem;
          line-height: 1.1;
          color: var(--text-tertiary);
          max-width: 110px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tg-dropdown-arrow {
          font-size: 0.6rem;
          color: var(--text-tertiary);
          transition: transform 0.2s ease;
        }

        .tg-dropdown-arrow.open {
          transform: rotate(180deg);
        }

        /* Dropdown Menu - Glassmorphic + Neomorphic outset */
        .tg-user-dropdown-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 200px;
          background: var(--surface-glass);
          -webkit-backdrop-filter: blur(20px);
          backdrop-filter: blur(20px);
          border: 1px solid var(--surface-glass-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--neo-outset);
          padding: 12px 8px;
          z-index: 1000;
          transform-origin: top right;
        }

        .tg-dropdown-header {
          display: flex;
          flex-direction: column;
          padding: 4px 10px 10px;
          text-align: left;
        }

        .tg-dropdown-header strong {
          font-family: var(--font-heading);
          font-size: 0.85rem;
          color: var(--text-primary);
        }

        .tg-dropdown-header span {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          word-break: break-all;
        }

        .tg-dropdown-divider {
          border: 0;
          height: 1px;
          background: var(--surface-glass-border);
          margin: 6px 0;
        }

        .tg-dropdown-item {
          display: block;
          width: 100%;
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-decoration: none;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          box-sizing: border-box;
          font-family: var(--font-body);
        }

        .tg-dropdown-item:hover {
          color: var(--text-primary);
          background: var(--surface-glass-hover);
        }

        .tg-dropdown-logout {
          color: var(--accent-rose);
        }

        .tg-dropdown-logout:hover {
          background: rgba(244, 63, 94, 0.08);
          color: var(--accent-rose);
        }

        /* Mobile Toggle */
        .tg-mobile-toggle {
          display: none;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
        }

        .tg-hamburger {
          display: block;
          width: 20px;
          height: 2px;
          background: var(--text-secondary);
          position: relative;
          transition: all 0.3s ease;
        }

        .tg-hamburger::before,
        .tg-hamburger::after {
          content: "";
          position: absolute;
          width: 20px;
          height: 2px;
          background: var(--text-secondary);
          transition: all 0.3s ease;
        }

        .tg-hamburger::before { top: -6px; }
        .tg-hamburger::after { top: 6px; }

        .tg-hamburger.open { background: transparent; }
        .tg-hamburger.open::before { top: 0; transform: rotate(45deg); }
        .tg-hamburger.open::after { top: 0; transform: rotate(-45deg); }

        /* Mobile Menu */
        .tg-mobile-menu {
          display: none;
          flex-direction: column;
          padding: 12px 24px 20px;
          border-top: 1px solid var(--surface-glass-border);
          background: var(--bg-card);
        }

        .tg-mobile-link {
          padding: 12px 16px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.2s;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: "Inter", system-ui, sans-serif;
        }

        .tg-mobile-link:hover {
          color: var(--text-primary);
          background: var(--surface-glass-hover);
        }

        .tg-mobile-primary {
          color: #fff;
          background: linear-gradient(135deg, #38bdf8, #6366f1);
          font-weight: 700;
          text-align: center;
          margin-top: 8px;
          border-radius: 999px;
        }

        @media (max-width: 768px) {
          .tg-nav,
          .tg-header-actions { display: none; }
          .tg-mobile-toggle { display: block; }
          .tg-mobile-menu { display: flex; }
        }
      `}</style>
    </header>
  );
}
