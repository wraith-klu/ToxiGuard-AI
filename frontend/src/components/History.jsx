export default function History({ items = [], onSelect }) {
  if (!items.length) return null;

  return (
    <div className="glass history-panel">
      <h3>📜 Analysis History</h3>

      <div className="history-list">
        {items.slice(-15).reverse().map((item, idx) => (
          <div
            key={idx}
            className="history-item"
            onClick={() => onSelect(item.text)}
          >
            <div className="history-index">
              {idx + 1}.
            </div>

            <div className="history-text">
              {item.text.slice(0, 80)}
              {item.text.length > 80 && "..."}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
