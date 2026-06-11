import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  clean: "#38bdf8",
  abusive: "#f43f5e",
};

export default function Charts({ totalWords = 0, abusiveCount = 0, confidence = 0 }) {
  if (!totalWords) return null;

  const cleanCount = Math.max(totalWords - abusiveCount, 0);

  const pieData = [
    { name: "Clean", value: cleanCount },
    { name: "Abusive", value: abusiveCount },
  ];

  return (
    <div className="glass charts-grid animate-fade-in">
      {/* Toxicity Bar */}
      <div>
        <h3 style={{
          fontFamily: "var(--font-heading)",
          fontSize: "0.9rem",
          fontWeight: 700,
          marginBottom: 8,
        }}>
          Toxicity Level
        </h3>

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
        <h3 style={{
          fontFamily: "var(--font-heading)",
          fontSize: "0.9rem",
          fontWeight: 700,
          marginBottom: 8,
        }}>
          Clean vs Abusive
        </h3>

        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={50}
              dataKey="value"
              strokeWidth={0}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.name === "Clean" ? COLORS.clean : COLORS.abusive}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#f1f5f9",
                fontSize: "0.85rem",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
