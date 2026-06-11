import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts";

export default function ToxicityChart({ data }) {
  if (!data.length) return null;

  return (
    <div className="glass animate-fade-in">
      <h4 style={{
        fontFamily: "var(--font-heading)",
        fontSize: "0.9rem",
        fontWeight: 700,
        marginBottom: 16,
        color: "var(--text-primary)"
      }}>
        Toxicity Trend
      </h4>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="toxGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "#f1f5f9",
              fontSize: "0.85rem",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#toxGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#6366f1" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
