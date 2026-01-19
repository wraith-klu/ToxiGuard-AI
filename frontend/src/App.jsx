import { useEffect, useState } from "react";
import { predictText } from "./api";

import Header from "./components/Header";
import TextInput from "./components/TextInput";
import LiveResult from "./components/LiveResult";
import KPI from "./components/KPI";
import Charts from "./components/Charts";
import AbuseTable from "./components/AbuseTable";
import History from "./components/History";
import WordClouds from "./components/WordClouds";

import "./styles.css";

export default function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [realtime, setRealtime] = useState(true);
  const [history, setHistory] = useState([]);

  // -------------------------------------------
  // Debounced Live Detection
  // -------------------------------------------
  useEffect(() => {
    if (!realtime || !text.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await predictText(text);
        setResult(res);
      } catch (err) {
        console.error("API error:", err);
      } finally {
        setLoading(false);
      }
    }, 400); // debounce

    return () => clearTimeout(timer);
  }, [text, realtime]);

  // -------------------------------------------
  // Manual Analyze Button
  // -------------------------------------------
  const handleAnalyze = async () => {
    if (!text.trim()) return;

    try {
      setLoading(true);
      const res = await predictText(text);
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
      setLoading(false);
    }
  };

  // -------------------------------------------
  // Derived Metrics
  // -------------------------------------------
  const abusiveCount = result?.abusive_words?.length || 0;
  const totalWords = text.trim()
    ? text.trim().split(/\s+/).length
    : 0;

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

      {/* Main Result */}
      <LiveResult
        loading={loading}
        result={result}
        inputText={text}
      />

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

      {/* Word Clouds */}
      {result && (
        <WordClouds
          wordFrequency={result.word_frequency}
        />
      )}

      {/* History Panel */}
      <History
        items={history}
        onSelect={(value) => setText(value)}
      />
    </div>
  );
}
