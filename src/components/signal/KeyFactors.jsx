const MONO = "'IBM Plex Mono', monospace";

export default function KeyFactors({ factors, compact = false }) {
  if (!factors?.length) return null;

  return (
    <div style={{ marginBottom: compact ? 12 : 14 }}>
      <div style={{ fontFamily: MONO, fontSize: compact ? 7 : 8, color: "#6e7681", letterSpacing: 1, marginBottom: compact ? 5 : 8 }}>
        KEY FACTORS
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? 5 : 6 }}>
        {factors.map((f, i) => (
          <span key={`${f}-${i}`} style={{
            fontFamily: MONO,
            fontSize: compact ? 8 : 9,
            background: "#161b22",
            border: "1px solid #21262d",
            borderRadius: compact ? 4 : 5,
            padding: compact ? "2px 7px" : "4px 10px",
            color: "#8b949e",
          }}>
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
