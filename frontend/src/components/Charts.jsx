import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// -----------------------------------------------------
// Colors
// -----------------------------------------------------

const COLORS = {
  clean: "#38bdf8",
  abusive: "#ef4444",
};

// -----------------------------------------------------
// Main Component
// -----------------------------------------------------

export default function Charts({ totalWords = 0, abusiveCount = 0, confidence = 0 }) {
  if (!totalWords) return null;

  const cleanCount = Math.max(totalWords - abusiveCount, 0);

  const pieData = [
    { name: "Clean", value: cleanCount },
    { name: "Abusive", value: abusiveCount },
  ];

  return (
    <div className="glass charts-grid">
      {/* Toxicity Bar */}
      <div>
        <h3>📊 Toxicity Level</h3>

        <div className="toxicity-bar">
          <div
            className="toxicity-fill"
            style={{ width: `${Math.min(confidence * 100, 100)}%` }}
          />
        </div>

        <div className="toxicity-label">
          {(confidence * 100).toFixed(1)}%
        </div>
      </div>

      {/* Pie Chart */}
      <div>
        <h3>🥧 Clean vs Abusive</h3>

        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={90}
              dataKey="value"
              label
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.name === "Clean" ? COLORS.clean : COLORS.abusive}
                />
              ))}
            </Pie>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
