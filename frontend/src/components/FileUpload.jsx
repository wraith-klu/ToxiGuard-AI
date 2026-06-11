import { useState } from "react";
import { analyzeFile } from "../api";
import LiveResult from "./LiveResult";
import "./FileUpload.css";

export default function FileUpload() {
    const [file, setFile] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        if (!file) return;

        try {
            setLoading(true);
            const res = await analyzeFile(file);
            setData(res);
        } catch (err) {
            console.error("Upload error:", err);
            alert("Failed to process file");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="file-upload-container glass">
            <h3 className="file-upload-title">📁 Batch Toxicity Analysis</h3>

            {/* Controls */}
            <div className="file-upload-controls">
                <input
                    className="file-input"
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => setFile(e.target.files[0])}
                />

                <button
                    className="upload-btn"
                    onClick={handleUpload}
                    disabled={loading}
                >
                    {loading ? "Processing..." : "Upload & Analyze"}
                </button>
            </div>

            {/* KPI Summary */}
            {data && (
                <>
                    <div className="file-kpi-row">
                        <div className="file-kpi-card">
                            <h4>Total</h4>
                            <p>{data.total}</p>
                        </div>

                        <div className="file-kpi-card">
                            <h4>⚠️ Toxic</h4>
                            <p>{data.toxic_count}</p>
                        </div>

                        <div className="file-kpi-card">
                            <h4>✅ Clean</h4>
                            <p>{data.clean_count}</p>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="file-results">
                        {data.results.map((item, i) => (
                            <div
                                key={i}
                                className={`file-result-card ${item.toxic ? "file-result-toxic" : "file-result-clean"
                                    }`}
                            >
                                {/* If you want full UI */}
                                <LiveResult
                                    loading={false}
                                    result={item}
                                    inputText={item.text}
                                />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}