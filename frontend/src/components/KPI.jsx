export default function KPI({ label, value }) {
  return (
    <div className="kpi-card">
      <div>{label}</div>
      <h2>{value}</h2>
    </div>
  );
}
