import React from "react";

/**
 * KPI Card — Simple label + value display.
 * Used in Dashboard for top-level metrics.
 */
export default function KPI({ label, value }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}
