import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="notfound-page">
      <div className="notfound-content">
        <div className="notfound-code">404</div>
        <h1>Page not found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="notfound-link">
          ← Back to Home
        </Link>
      </div>

      <style>{`
        .notfound-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          padding: 24px;
          text-align: center;
        }

        .notfound-content {
          animation: fadeInUp 0.5s ease both;
        }

        .notfound-code {
          font-family: var(--font-heading);
          font-size: 8rem;
          font-weight: 900;
          line-height: 1;
          background: linear-gradient(135deg, #38bdf8, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 16px;
        }

        .notfound-content h1 {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          margin-bottom: 12px;
          color: var(--text-primary);
        }

        .notfound-content p {
          color: var(--text-tertiary);
          margin-bottom: 32px;
          font-size: 0.95rem;
        }

        .notfound-link {
          display: inline-block;
          padding: 12px 28px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .notfound-link:hover {
          border-color: rgba(56, 189, 248, 0.3);
          color: var(--text-primary);
          background: rgba(56, 189, 248, 0.05);
        }
      `}</style>
    </div>
  );
}
