import React from "react";

/**
 * ErrorBoundary — catches any render-time JS error in its subtree
 * and shows a styled fallback instead of a white page.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught render error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary, #0f172a)",
          fontFamily: "var(--font-body, Inter, sans-serif)",
          padding: "24px",
        }}>
          <div style={{
            maxWidth: 520,
            width: "100%",
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 20,
            padding: "40px 36px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>⚠️</div>
            <h2 style={{
              fontFamily: "var(--font-heading, Outfit, sans-serif)",
              color: "var(--text-primary, #f8fafc)",
              fontSize: "1.4rem",
              fontWeight: 800,
              marginBottom: 12,
            }}>
              Something went wrong
            </h2>
            <p style={{
              color: "var(--text-secondary, #94a3b8)",
              fontSize: "0.9rem",
              marginBottom: 8,
            }}>
              A component crashed. Check the browser console for details.
            </p>
            {this.state.error && (
              <pre style={{
                background: "rgba(0,0,0,0.3)",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: "0.75rem",
                color: "#f87171",
                textAlign: "left",
                overflowX: "auto",
                marginBottom: 24,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              style={{
                padding: "10px 28px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #38bdf8, #6366f1)",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                fontFamily: "var(--font-heading, Outfit, sans-serif)",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
