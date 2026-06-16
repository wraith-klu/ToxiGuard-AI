import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../components/Toast";
import "./Login.css";

const API = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.api_key) {
        localStorage.setItem("api_key", data.api_key);
        if (data.token) localStorage.setItem("token", data.token);

        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        toast.error(data.detail || "Invalid credentials");
      }
    } catch (err) {
      toast.error("Cannot connect to server");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left Form */}
        <div className="auth-card">
          <div className="auth-brand">
            <span className="auth-brand-icon">◆</span>
            <span className="auth-brand-text">ToxiGuard AI</span>
          </div>

          <h2>Welcome back</h2>

          <form onSubmit={handleLogin} className="auth-form">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="auth-alt">
            Don't have an account?{" "}
            <Link to="/signup" className="auth-link">
              Create one
            </Link>
          </p>

          <button
            className="back-home-btn"
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </button>
        </div>

        {/* Right Image */}
        <div className="auth-right">
          <img src="/lll.jpg" alt="ToxiGuard AI" />
        </div>
      </div>
    </div>
  );
}