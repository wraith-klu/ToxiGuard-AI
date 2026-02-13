import { useEffect, useRef, useState } from "react";
import { predictText } from "./api";

import Header from "./components/Header";
import TextInput from "./components/TextInput";
import LiveResult from "./components/LiveResult";
import KPI from "./components/KPI";
import Charts from "./components/Charts";
import AbuseTable from "./components/AbuseTable";
import History from "./components/History";
import WordClouds from "./components/WordClouds";
import ToxicityChart from "./components/ToxicityChart";

import "./styles.css";

export default function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [realtime, setRealtime] = useState(true);
  const [history, setHistory] = useState([]);

  // 📈 Live toxicity graph data
  const [toxicityHistory, setToxicityHistory] = useState([]);

  // Used to prevent stale responses
  const requestIdRef = useRef(0);

  // -------------------------------------------
  // ⚡ Real-Time Detection (Debounced + Safe)
  // -------------------------------------------
  useEffect(() => {
    if (!realtime || text.trim().length < 5) {
      setResult(null);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(false);

    const timer = setTimeout(async () => {
      try {
        const res = await predictText(text);

        // Ignore stale responses
        if (currentRequestId !== requestIdRef.current) return;

        setResult(res);

        // Push into toxicity graph
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
    }, 1200); // debounce delay

    return () => clearTimeout(timer);
  }, [text, realtime]);

  // -------------------------------------------
  // 🔍 Manual Analyze Button
  // -------------------------------------------
  const handleAnalyze = async () => {
    if (!text.trim()) return;

    const currentRequestId = ++requestIdRef.current;

    try {
      setLoading(true);
      const res = await predictText(text);

      if (currentRequestId !== requestIdRef.current) return;

      setResult(res);

      // Save history
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
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // -------------------------------------------
  // Derived Metrics
  // -------------------------------------------
  const abusiveCount = result?.abusive_words?.length || 0;

  const totalWords = text
    ? text.trim().split(/\s+/).filter(Boolean).length
    : 0;

  // -------------------------------------------
  // Build Word Frequency
  // -------------------------------------------
  const buildWordFrequency = () => {
    if (!text.trim()) return {};

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);

    const freq = {};
    words.forEach((w) => {
      freq[w] = (freq[w] || 0) + 1;
    });

    return freq;
  };

  const combinedWordFrequency = buildWordFrequency();

  return (
    <div className="app-root">
      <Header />

      {/* Control Bar */}
      <div className="glass control-bar">
        <label className="toggle">
          <input
            type="checkbox"
            checked={realtime}
            onChange={(e) => setRealtime(e.target.checked)}
          />
          <span>⚡ Real-Time Detection</span>
        </label>

        <button className="primary-btn" onClick={handleAnalyze}>
          🔍 Analyze
        </button>
      </div>

      {/* Text Input */}
      <TextInput value={text} onChange={setText} />

      {/* KPI Cards */}
      {result && (
        <div className="kpi-row">
          <KPI label="📄 Words" value={totalWords} />
          <KPI label="⚠️ Abusive" value={abusiveCount} />
          <KPI
            label="🧪 Toxicity"
            value={`${Math.round(result.confidence * 100)}%`}
          />
        </div>
      )}

      {/* 🔴 Main Result */}
      <LiveResult loading={loading} result={result} inputText={text} />

      {/* 📈 Live Toxicity Trend */}
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

      {/* Abuse Table */}
      {result && (
        <AbuseTable
          abusiveWords={result.abusive_words}
          suggestions={result.suggestions}
        />
      )}

      {/* ☁️ Word Cloud */}
      {text && (
        <WordClouds
          wordFrequency={combinedWordFrequency}
          abusiveWords={result?.abusive_words || []}
        />
      )}

      {/* History Panel */}
      <History items={history} onSelect={(value) => setText(value)} />
    </div>
  );
}
