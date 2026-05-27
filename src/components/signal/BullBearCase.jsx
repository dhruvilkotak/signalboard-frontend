const MONO = "'IBM Plex Mono', monospace";

export default function BullBearCase({ bullCase, bearCase, compact = false }) {
  if (!bullCase && !bearCase) return null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: compact ? 8 : 10,
      marginBottom: compact ? 12 : 14,
    }}>
      {bullCase && (
        <div style={{
          background: "#0d2a1a",
          border: "1px solid #1a633633",
          borderRadius: compact ? 7 : 8,
          padding: compact ? "8px 10px" : "10px 12px",
        }}>
          <div style={{ fontFamily: MONO, fontSize: compact ? 7 : 8, color: "#3fb950", letterSpacing: 1, marginBottom: compact ? 4 : 5 }}>
            🐂 BULL CASE
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e", lineHeight: 1.55 }}>
            {bullCase}
          </div>
        </div>
      )}

      {bearCase && (
        <div style={{
          background: "#2a0808",
          border: "1px solid #7a1a1a33",
          borderRadius: compact ? 7 : 8,
          padding: compact ? "8px 10px" : "10px 12px",
        }}>
          <div style={{ fontFamily: MONO, fontSize: compact ? 7 : 8, color: "#f85149", letterSpacing: 1, marginBottom: compact ? 4 : 5 }}>
            🐻 BEAR CASE
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e", lineHeight: 1.55 }}>
            {bearCase}
          </div>
        </div>
      )}
    </div>
  );
}
