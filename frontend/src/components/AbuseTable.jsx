import Papa from "papaparse";

// -----------------------------------------------------
// CSV Download Helper
// -----------------------------------------------------
function downloadCSV(rows) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "toxiguard_report.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// -----------------------------------------------------
// Main Component
// -----------------------------------------------------
export default function AbuseTable({ abusiveWords = [], suggestions = {} }) {
  if (!abusiveWords.length) {
    return null;
  }

  const rows = abusiveWords.map((word) => ({
    "Abusive Word": word,
    "Suggested Replacement": suggestions[word] || "—",
  }));

  return (
    <div className="glass">
      <div className="table-header">
        <h3>📊 Abusive Words & Suggestions</h3>

        <button
          className="primary-btn"
          onClick={() => downloadCSV(rows)}
        >
          ⬇️ Download CSV
        </button>
      </div>

      <table className="abuse-table">
        <thead>
          <tr>
            <th>Abusive Word</th>
            <th>Suggested Replacement</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td>{row["Abusive Word"]}</td>
              <td>{row["Suggested Replacement"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
