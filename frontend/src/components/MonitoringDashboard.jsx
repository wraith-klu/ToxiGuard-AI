import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

function apiFetch(path) {
  const apiKey = localStorage.getItem("api_key");
  return fetch(`${BASE_URL}${path}`, {
    headers: { ...(apiKey && { "x-api-key": apiKey }) },
  }).then((r) => r.json());
}

async function apiPost(path, body = {}) {
  const apiKey = localStorage.getItem("api_key");
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey && { "x-api-key": apiKey }),
    },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

function StatCard({ label, value, sub, color = "#818cf8", icon }) {
  return (
    <div className="mon-stat-card">
      <div className="mon-stat-icon" style={{ color }}>{icon}</div>
      <div className="mon-stat-value" style={{ color }}>{value}</div>
      <div className="mon-stat-label">{label}</div>
      {sub && <div className="mon-stat-sub">{sub}</div>}
    </div>
  );
}

export default function MonitoringDashboard() {
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [retraining, setRetraining] = useState(false);
  const [retrainMessage, setRetrainMessage] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [s, d, fb] = await Promise.all([
        apiFetch("/monitoring/stats"),
        apiFetch("/monitoring/drift?limit=60"),
        apiFetch("/feedback/stats"),
      ]);
      setStats(s);
      setSeries(d.series || []);
      setFeedbackStats(fb);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Monitoring fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainMessage(null);
    try {
      const res = await apiPost("/feedback/retrain");
      setRetrainMessage(res.message);
      await refresh();
    } catch (e) {
      setRetrainMessage("Retraining trigger failed. Check backend logs.");
    } finally {
      setRetraining(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="glass mon-loading">
        <div className="mon-spinner" />
        <p>Loading monitoring data…</p>
      </div>
    );
  }

  const toxicRatePct = stats ? Math.round((stats.toxic_rate || 0) * 100) : 0;

  return (
    <div className="mon-root animate-fade-in">
      {/* Header */}
      <div className="mon-header">
        <div>
          <h3 className="mon-title">📊 Model Monitoring & Drift Detection</h3>
          <p className="mon-subtitle">
            Rolling window: last {stats?.window_size || 0} predictions
            {lastRefresh && ` · Refreshed ${lastRefresh}`}
          </p>
        </div>
        <button className="primary-btn" onClick={refresh} disabled={loading}>
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {/* Drift Alert Banner */}
      {stats?.drift_detected && (
        <div className="mon-alert">
          <span>⚠️</span>
          <div>
            <strong>Drift Detected</strong>
            <p>{stats.alert}</p>
          </div>
        </div>
      )}

      {/* KPI Stats */}
      <div className="mon-kpi-grid glass">
        <StatCard
          icon="📈"
          label="Total Predictions"
          value={stats?.total_predictions?.toLocaleString() || "0"}
          color="#818cf8"
        />
        <StatCard
          icon="🎯"
          label="Mean Confidence"
          value={`${Math.round((stats?.mean_confidence || 0) * 100)}%`}
          sub={`±${Math.round((stats?.stddev_confidence || 0) * 100)}% stddev`}
          color="#38bdf8"
        />
        <StatCard
          icon="☣️"
          label="Toxic Rate"
          value={`${toxicRatePct}%`}
          sub="of recent predictions"
          color={toxicRatePct > 50 ? "#f87171" : "#34d399"}
        />
        <StatCard
          icon="🔬"
          label="Drift Score"
          value={stats?.drift_score?.toFixed(3) || "0.000"}
          sub={stats?.drift_detected ? "⚠️ Alert" : "✓ Stable"}
          color={stats?.drift_detected ? "#f87171" : "#34d399"}
        />
      </div>

      {/* Confidence Trend Chart */}
      {series.length > 0 && (
        <div className="glass mon-chart-card">
          <h4 className="mon-chart-title">Confidence Score Trend</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} interval="preserveStartEnd" />
              <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} />
              <Tooltip
                contentStyle={{
                  background: "rgba(15,23,42,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  color: "#f1f5f9",
                  fontSize: "0.82rem",
                }}
                formatter={(v) => [`${(v * 100).toFixed(1)}%`, "Confidence"]}
              />
              <Area
                type="monotone"
                dataKey="confidence"
                stroke="#818cf8"
                strokeWidth={2}
                fill="url(#confGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#818cf8" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom row: Severity + Feedback */}
      <div className="mon-bottom-grid">
        {/* Severity Breakdown */}
        {stats?.severity_breakdown && (
          <div className="glass mon-severity-card">
            <h4 className="mon-chart-title">Severity Breakdown</h4>
            <div className="mon-sev-bars">
              {[
                { key: "low", label: "Low", color: "#34d399" },
                { key: "medium", label: "Medium", color: "#f59e0b" },
                { key: "high", label: "High", color: "#f87171" },
              ].map(({ key, label, color }) => {
                const count = stats.severity_breakdown[key] || 0;
                const total = Object.values(stats.severity_breakdown).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={key} className="mon-sev-row">
                    <span className="mon-sev-label" style={{ color }}>{label}</span>
                    <div className="mon-sev-track">
                      <div
                        className="mon-sev-fill"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className="mon-sev-count">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Learning Stats */}
        {feedbackStats && (
          <div className="glass mon-feedback-card">
            <h4 className="mon-chart-title">🧪 Active Learning Queue</h4>
            <div className="mon-fb-grid">
              <div className="mon-fb-item">
                <span className="mon-fb-val" style={{ color: "#f87171" }}>
                  {feedbackStats.false_positives}
                </span>
                <span className="mon-fb-lbl">False Positives</span>
              </div>
              <div className="mon-fb-item">
                <span className="mon-fb-val" style={{ color: "#fbbf24" }}>
                  {feedbackStats.false_negatives}
                </span>
                <span className="mon-fb-lbl">False Negatives</span>
              </div>
              <div className="mon-fb-item">
                <span className="mon-fb-val" style={{ color: "#34d399" }}>
                  {feedbackStats.confirmed_correct}
                </span>
                <span className="mon-fb-lbl">Confirmed</span>
              </div>
              <div className="mon-fb-item">
                <span className="mon-fb-val" style={{ color: "#818cf8" }}>
                  {feedbackStats.unreviewed_count}
                </span>
                <span className="mon-fb-lbl">In Queue</span>
              </div>
            </div>
            {feedbackStats.retraining_recommended && (
              <div className="mon-retrain-alert">
                🚀 50+ corrections — <strong>retraining recommended</strong>
              </div>
            )}
            {feedbackStats.precision_approx !== null && (
              <p className="mon-precision">
                Approx. Precision from feedback:{" "}
                <strong style={{ color: "#818cf8" }}>
                  {Math.round(feedbackStats.precision_approx * 100)}%
                </strong>
              </p>
            )}
            <div style={{ marginTop: "16px" }}>
              <button
                className="mon-retrain-btn"
                onClick={handleRetrain}
                disabled={retraining || feedbackStats.unreviewed_count === 0}
              >
                {retraining ? "Training Model..." : "⚡ Retrain Model Now"}
              </button>
              {retrainMessage && (
                <p style={{
                  fontSize: "0.75rem",
                  color: retrainMessage.includes("Successfully") ? "#34d399" : "#fbbf24",
                  marginTop: "8px",
                  margin: "8px 0 0 0"
                }}>
                  {retrainMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .mon-root { display: flex; flex-direction: column; gap: 16px; }

        .mon-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 12px;
        }

        .mon-title {
          font-family: var(--font-heading);
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .mon-subtitle {
          font-size: 0.78rem;
          color: var(--text-tertiary);
          margin: 4px 0 0;
        }

        .mon-alert {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 18px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: var(--radius-md);
          font-size: 0.85rem;
        }
        .mon-alert strong { color: #f87171; }
        .mon-alert p { margin: 4px 0 0; color: var(--text-secondary); font-size: 0.8rem; }

        .mon-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1px;
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .mon-stat-card {
          padding: 20px 16px;
          text-align: center;
          background: var(--bg-card);
        }

        .mon-stat-icon { font-size: 1.4rem; margin-bottom: 8px; }

        .mon-stat-value {
          font-family: var(--font-heading);
          font-size: 1.6rem;
          font-weight: 900;
          line-height: 1;
          margin-bottom: 4px;
        }

        .mon-stat-label {
          font-size: 0.72rem;
          color: var(--text-tertiary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .mon-stat-sub {
          font-size: 0.68rem;
          color: var(--text-tertiary);
          margin-top: 3px;
        }

        .mon-chart-card { padding: 20px; }
        .mon-chart-title {
          font-family: var(--font-heading);
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 16px;
        }

        .mon-bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 700px) {
          .mon-bottom-grid { grid-template-columns: 1fr; }
        }

        .mon-severity-card, .mon-feedback-card { padding: 20px; }

        .mon-sev-bars { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
        .mon-sev-row { display: flex; align-items: center; gap: 10px; }
        .mon-sev-label { width: 55px; font-size: 0.8rem; font-weight: 600; }
        .mon-sev-track {
          flex: 1;
          height: 8px;
          background: rgba(255,255,255,0.05);
          border-radius: 999px;
          overflow: hidden;
        }
        .mon-sev-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.8s ease;
        }
        .mon-sev-count { font-size: 0.75rem; color: var(--text-tertiary); width: 80px; text-align: right; }

        .mon-fb-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 12px;
        }
        .mon-fb-item { text-align: center; }
        .mon-fb-val { display: block; font-family: var(--font-heading); font-size: 1.8rem; font-weight: 900; line-height: 1; }
        .mon-fb-lbl { font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; }

        .mon-retrain-alert {
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(56,189,248,0.1);
          border: 1px solid rgba(56,189,248,0.2);
          border-radius: 8px;
          font-size: 0.78rem;
          color: #38bdf8;
        }

        .mon-precision {
          font-size: 0.78rem;
          color: var(--text-tertiary);
          margin: 10px 0 0;
        }

        .mon-retrain-btn {
          width: 100%;
          padding: 8px 16px;
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.3);
          color: #818cf8;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font-body);
        }

        .mon-retrain-btn:hover:not(:disabled) {
          background: rgba(99,102,241,0.3);
          border-color: #818cf8;
          color: #fff;
        }

        .mon-retrain-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mon-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 48px;
          color: var(--text-tertiary);
        }

        .mon-spinner {
          width: 32px; height: 32px;
          border: 3px solid rgba(99,102,241,0.2);
          border-top-color: #818cf8;
          border-radius: 50%;
          animation: xaiSpin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
