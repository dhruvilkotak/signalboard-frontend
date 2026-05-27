const MONO = "'IBM Plex Mono', monospace";

export default function SentimentBar({ sentiment, compact = false }) {
  if (!sentiment?.sentiment_label) return null;

  const bull = sentiment.bullish_pct || 50;
  const bear = sentiment.bearish_pct || 50;

  return (
    <div style={{ marginBottom: compact ? 12 : 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: MONO, fontSize: compact ? 7 : 8, color: "#6e7681", letterSpacing: 1 }}>
          RETAIL SENTIMENT (STOCKTWITS)
        </span>
        <span style={{ fontFamily: MONO, fontSize: compact ? 7 : 8, color: "#6e7681" }}>
          {sentiment.message_volume || 0} msgs · {(sentiment.watchlist_count || 0).toLocaleString()} watching
        </span>
      </div>

      <div style={{ height: compact ? 5 : 6, background: "#21262d", borderRadius: 3, overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${bull}%`, background: "#3fb950", transition: "width 0.6s" }} />
        <div style={{ width: `${bear}%`, background: "#f85149" }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: compact ? 3 : 4 }}>
        <span style={{ fontFamily: MONO, fontSize: compact ? 8 : 9, color: "#3fb950" }}>▲ {bull}% Bullish</span>
        <span style={{
          fontFamily: MONO,
          fontSize: compact ? 9 : 10,
          fontWeight: 700,
          color: sentiment.sentiment_label === "Bullish" ? "#3fb950"
               : sentiment.sentiment_label === "Bearish" ? "#f85149"
               : "#e3b341",
        }}>
          {sentiment.sentiment_label}
        </span>
        <span style={{ fontFamily: MONO, fontSize: compact ? 8 : 9, color: "#f85149" }}>
          {bear}% Bearish ▼
        </span>
      </div>
    </div>
  );
}
