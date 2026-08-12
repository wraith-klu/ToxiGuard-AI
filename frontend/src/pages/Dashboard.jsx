import { useEffect, useRef, useState } from "react";
import { predictText } from "../api";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

import Header from "../components/Header";
import TextInput from "../components/TextInput";
import LiveResult from "../components/LiveResult";
import KPI from "../components/KPI";
import Charts from "../components/Charts";
import AbuseTable from "../components/AbuseTable";
import History from "../components/History";
import ToxicityChart from "../components/ToxicityChart";
import FileUpload from "../components/FileUpload";
import ParticleBackground from "../components/ParticleBackground";
import CompareMode from "../components/CompareMode";
import MonitoringDashboard from "../components/MonitoringDashboard";
import StreamAnalyzer from "../components/StreamAnalyzer";

import "../styles.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();

  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [realtime, setRealtime] = useState(true);
  const [history, setHistory] = useState([]);
  const [toxicityHistory, setToxicityHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("analyze");

  // SaaS Metrics
  const [totalRequests, setTotalRequests] = useState(0);
  const [toxicCount, setToxicCount] = useState(0);
  const [cleanCount, setCleanCount] = useState(0);

  const requestIdRef = useRef(0);

  // Auth check — read key on every render (reactive to sign-out)
  const apiKey = localStorage.getItem("api_key");

  // Redirect if not authenticated — inside useEffect so hooks run unconditionally
  useEffect(() => {
    if (!apiKey) {
      navigate("/login");
    }
  }, [apiKey, navigate]);

  // Real-Time Detection — must be declared BEFORE any conditional return
  useEffect(() => {
    if (!apiKey) return; // skip processing if logged out
    if (!realtime || text.trim().length < 5) {
      setResult(null);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await predictText(text);
        if (currentRequestId !== requestIdRef.current) return;

        setResult(res);
        setTotalRequests((prev) => prev + 1);
        if (res.toxic) setToxicCount((prev) => prev + 1);
        else setCleanCount((prev) => prev + 1);

        setToxicityHistory((prev) => [
          ...prev.slice(-30),
          {
            time: new Date().toLocaleTimeString(),
            value: Math.round(res.confidence * 100),
          },
        ]);
      } catch (err) {
        console.error("API error:", err);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [text, realtime, apiKey]);

  // Guard: render nothing while redirect is in flight
  if (!apiKey) {
    return null;
  }

  // -------------------------------------------
  // Manual Analyze
  // -------------------------------------------
  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.info("Enter some text to analyze");
      return;
    }

    const currentRequestId = ++requestIdRef.current;

    try {
      setLoading(true);
      const res = await predictText(text);
      if (currentRequestId !== requestIdRef.current) return;

      setResult(res);
      setTotalRequests((prev) => prev + 1);
      if (res.toxic) {
        setToxicCount((prev) => prev + 1);
        toast.error("Toxic content detected");
      } else {
        setCleanCount((prev) => prev + 1);
        toast.success("Content is safe");
      }

      setHistory((prev) => [
        ...prev,
        {
          text,
          confidence: res.confidence,
          toxic: res.toxic,
        },
      ]);
    } catch (err) {
      console.error("API error:", err);
      toast.error("Analysis failed. Check your connection.");
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // -------------------------------------------
  // Metrics
  // -------------------------------------------
  const abusiveCount = result?.abusive_words?.length || 0;
  const totalWords = text
    ? text.trim().split(/\s+/).filter(Boolean).length
    : 0;

  // -------------------------------------------
  // Logout
  // -------------------------------------------
  const handleLogout = () => {
    localStorage.removeItem("api_key");
    localStorage.removeItem("token");
    toast.info("Signed out successfully");
    setTimeout(() => navigate("/login"), 500);
  };

  const tabs = [
    { id: "analyze",    label: "Analyze" },
    { id: "compare",    label: "Comparison" },
    { id: "batch",      label: "Batch Upload" },
    { id: "stream",     label: "⚡ Live Stream" },
    { id: "monitoring", label: "📊 Monitoring" },
    { id: "history",    label: "History" },
  ];

  return (
    <div className="dashboard-layout">
      <ParticleBackground />
      <Header onLogout={handleLogout} isDashboard />

      <div className="app-root" style={{ position: "relative", zIndex: 1 }}>
        {/* KPI Bar */}
        <div className="kpi-row animate-fade-in">
          <KPI label="Total Requests" value={totalRequests} />
          <KPI label="Toxic Detected" value={toxicCount} />
          <KPI label="Clean Content" value={cleanCount} />
        </div>

        {/* Tab Navigation */}
        <div className="dash-tabs animate-fade-in delay-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`dash-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Analyze Tab */}
        {activeTab === "analyze" && (
          <>
            {/* Controls */}
            <div className="glass control-bar animate-fade-in delay-2">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={realtime}
                  onChange={(e) => setRealtime(e.target.checked)}
                />
                <span>Real-Time Detection</span>
              </label>

              <div style={{ display: "flex", gap: "10px" }}>
                <button className="primary-btn" onClick={handleAnalyze}>
                  Analyze
                </button>
                <button className="danger-btn" onClick={handleLogout}>
                  Sign Out
                </button>
              </div>
            </div>

            {/* Input */}
            <TextInput value={text} onChange={setText} />

            {/* Result KPIs */}
            {result && (
              <div className="kpi-row animate-fade-in">
                <KPI label="Words" value={totalWords} />
                <KPI label="Abusive Words" value={abusiveCount} />
                <KPI
                  label="Toxicity Score"
                  value={`${Math.round(result.confidence * 100)}%`}
                />
              </div>
            )}

            <LiveResult loading={loading} result={result} inputText={text} />

            {/* Toxicity Trend */}
            {toxicityHistory.length > 0 && (
              <ToxicityChart data={toxicityHistory} />
            )}

            {/* Charts */}
            {result && (
              <Charts
                totalWords={totalWords}
                abusiveCount={abusiveCount}
                confidence={result.confidence}
              />
            )}

            {/* Table */}
            {result && (
              <AbuseTable
                abusiveWords={result.abusive_words}
                suggestions={result.suggestions}
              />
            )}
          </>
        )}

        {/* Compare Tab */}
        {activeTab === "compare" && <CompareMode />}

        {/* Batch Tab */}
        {activeTab === "batch" && <FileUpload />}

        {/* Stream Tab */}
        {activeTab === "stream" && <StreamAnalyzer />}

        {/* Monitoring Tab */}
        {activeTab === "monitoring" && <MonitoringDashboard />}

        {/* History Tab */}
        {activeTab === "history" && (
          <History
            items={history}
            onSelect={(value) => {
              setText(value);
              setActiveTab("analyze");
            }}
          />
        )}
      </div>

      <style>{`
        .dashboard-layout {
          min-height: 100vh;
          background: var(--bg-primary);
        }

        .dash-tabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-md);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .dash-tab {
          flex: 1;
          padding: 10px 20px;
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 0.85rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dash-tab:hover {
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.03);
        }

        .dash-tab.active {
          color: var(--text-primary);
          background: rgba(56, 189, 248, 0.1);
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.1);
        }
      `}</style>
    </div>
  );
}