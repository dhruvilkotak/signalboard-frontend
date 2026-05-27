const MONO = "'IBM Plex Mono', monospace";

const INSIDER_COLOR = {
  Purchase: { color: "#3fb950", bg: "#0d2a1a", border: "#1a6336", icon: "▲" },
  Sale:     { color: "#f85149", bg: "#2a0808", border: "#7a1a1a", icon: "▼" },
  Award:    { color: "#58a6ff", bg: "#0d1a2a", border: "#1a3a6e", icon: "◆" },
};

function fmtNum(n) {
  if (!n) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function fmtPrice(n) {
  return n == null ? "—" : `$${Number(n).toFixed(2)}`;
}

function fmtDate(v) {
  if (!v) return null;

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;

  const hasTime = typeof v === "string" && v.includes("T");

  if (!hasTime) {
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function InsiderActivity({ trades, summary }) {
  if (!trades) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681", letterSpacing: 1, marginBottom: 6 }}>
        SEC INSIDER ACTIVITY (FORM 4 — LAST 90 DAYS)
      </div>

      {trades.length === 0 ? (
        <div style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681" }}>
          No insider filings in last 90 days
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {trades.map((t, i) => {
            const tc = INSIDER_COLOR[t.type] || {
              color: "#8b949e",
              bg: "#161b22",
              border: "#21262d",
              icon: "•",
            };

            return (
              <div key={`${t.name || "insider"}-${t.date || i}-${i}`} style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "center",
                background: tc.bg,
                border: `1px solid ${tc.border}`,
                borderRadius: 8,
                padding: "10px 14px",
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: tc.color }}>
                      {tc.icon} {t.type || "Activity"}
                    </span>

                    {t.form && (
                      <span style={{ fontFamily: MONO, fontSize: 8, color: "#8b949e" }}>
                        Form {t.form}
                      </span>
                    )}

                    {t.date && (
                      <span style={{
                        fontFamily: MONO,
                        fontSize: 8,
                        color: "#8b949e",
                        background: "#161b22",
                        border: "1px solid #21262d",
                        borderRadius: 4,
                        padding: "1px 5px",
                      }}>
                        {fmtDate(t.date)}
                      </span>
                    )}

                    {t.is_10b5 && (
                      <span style={{
                        fontFamily: MONO,
                        fontSize: 8,
                        color: "#58a6ff",
                        background: "#0d1a2a",
                        border: "1px solid #1a3a6e",
                        borderRadius: 4,
                        padding: "1px 5px",
                      }}>
                        10b5-1
                      </span>
                    )}
                  </div>

                  <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#e6edf3" }}>
                    {t.name || "Unknown insider"}
                  </div>

                  {t.role && t.role !== "Insider" && (
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e" }}>
                      {t.role}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, minWidth: 140 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: "#8b949e" }}>
                    {t.shares ? `${Number(t.shares).toLocaleString()} sh` : "—"}
                  </div>

                  <div style={{ fontFamily: MONO, fontSize: 10, color: "#8b949e" }}>
                    {fmtPrice(t.price)}
                  </div>

                  <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: tc.color }}>
                    {fmtNum(t.total_value)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {summary && (
        <div style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e", marginTop: 8, lineHeight: 1.5 }}>
          {summary}
        </div>
      )}
    </div>
  );
}
