import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../components/Toast";
import "./Login.css";

const API = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.api_key) {
        localStorage.setItem("api_key", data.api_key);
        toast.success("Account created! Welcome to ToxiGuard.");
        navigate("/dashboard");
      } else {
        toast.error(data.detail || "Signup failed");
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

          <h2>Create account</h2>

          <form onSubmit={handleSignup} className="auth-form">
        
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />

            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <p className="auth-alt">
            Already have an account?{" "}
            <Link to="/login" className="auth-link">
              Sign in
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
          <img src="/toxi2.jpg" alt="ToxiGuard AI" />
        </div>
      </div>
    </div>
  );
}