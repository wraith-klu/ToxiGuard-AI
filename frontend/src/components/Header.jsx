import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

export default function Header({ onLogout, isDashboard = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navLinks = isDashboard
    ? []
    : [
      { path: "/", label: "Home" },
      { path: "/install", label: "Extension" },
    ];

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
          {isDashboard ? (
            <button className="tg-btn-ghost" onClick={onLogout}>
              Sign Out
            </button>
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
          {isDashboard ? (
            <button className="tg-mobile-link" onClick={onLogout}>
              Sign Out
            </button>
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
          backdrop-filter: blur(20px) saturate(140%);
          -webkit-backdrop-filter: blur(20px) saturate(140%);
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
