import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("tg-theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("tg-theme", theme);
  }, [theme]);

  const toggle = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const isDark = theme === "dark";

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <div className={`theme-toggle-track ${isDark ? "dark" : ""}`}>
        <span className="theme-icon sun">☀️</span>
        <span className="theme-icon moon">🌙</span>
        <div className="theme-toggle-thumb" />
      </div>

      <style>{`
        .theme-toggle {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .theme-toggle-track {
          position: relative;
          width: 52px;
          height: 28px;
          border-radius: 999px;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 1px solid rgba(0, 0, 0, 0.08);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .theme-toggle-track.dark {
          background: linear-gradient(135deg, #1e1b4b, #312e81);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .theme-icon {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          transition: all 0.4s ease;
          line-height: 1;
        }

        .theme-icon.sun {
          left: 6px;
          opacity: 1;
        }

        .theme-icon.moon {
          right: 6px;
          opacity: 0;
        }

        .theme-toggle-track.dark .theme-icon.sun {
          opacity: 0;
          transform: translateY(-50%) rotate(-90deg);
        }

        .theme-toggle-track.dark .theme-icon.moon {
          opacity: 1;
        }

        .theme-toggle-thumb {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .theme-toggle-track.dark .theme-toggle-thumb {
          left: calc(100% - 25px);
          background: #c7d2fe;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .theme-toggle:hover .theme-toggle-thumb {
          transform: scale(1.08);
        }

        .theme-toggle:active .theme-toggle-thumb {
          width: 26px;
        }
      `}</style>
    </button>
  );
}
