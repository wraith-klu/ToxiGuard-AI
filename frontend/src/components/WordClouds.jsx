export default function WordClouds({ wordFrequency = {} }) {
  const entries = Object.entries(wordFrequency);

  if (!entries.length) return null;

  const max = Math.max(...entries.map(([_, v]) => v));

  return (
    <div className="glass">
      <h3>☁️ Word Cloud</h3>

      <div className="wordcloud">
        {entries.map(([word, count]) => {
          const size = 16 + (count / max) * 42;

          return (
            <span
              key={word}
              className="wordcloud-word"
              style={{ fontSize: `${size}px` }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
