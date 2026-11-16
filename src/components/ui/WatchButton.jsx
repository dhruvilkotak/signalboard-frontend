// "+ Watchlist" / "✓ Watching" toggle.
export default function WatchButton({ watching, onToggle, style }) {
  return (
    <button className="sb-btn ghost" style={{ padding: "8px 16px", fontSize: 14, ...style }} onClick={onToggle}>
      {watching ? "✓ Watching" : "+ Watchlist"}
    </button>
  );
}
