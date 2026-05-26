// src/components/NewsTab.jsx
// Shows Yahoo Finance news for any symbol — stocks AND ETFs
// Used in LiveDashboard News tab

import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";

export default function NewsTab({ symbol }) {
  const [articles, setArticles] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);

    fetch(`${API}/api/news/${symbol}`)
      .then(r => r.json())
      .then(data => {
        setArticles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load news.");
        setLoading(false);
      });
  }, [symbol]);

  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner}>⏳</div>
      <p style={s.muted}>Loading news for {symbol}…</p>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <p style={s.muted}>{error}</p>
    </div>
  );

  if (articles.length === 0) return (
    <div style={s.center}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📰</div>
      <p style={s.muted}>No recent news for {symbol}.</p>
    </div>
  );

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.title}>{symbol} Top Stories</span>
        <span style={s.count}>{articles.length} articles</span>
      </div>

      <div style={s.list}>
        {articles.map((a, i) => (
          <a
            key={a.id || i}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            style={s.card}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#388bfd"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#30363d"}
          >
            <div style={s.cardTop}>
              <span style={s.source}>{a.source}</span>
              <span style={s.time}>{formatTime(a.created_at)}</span>
            </div>
            <p style={s.headline}>{a.headline}</p>
            {a.summary && (
              <p style={s.summary}>
                {a.summary.length > 120 ? a.summary.slice(0, 120) + "…" : a.summary}
              </p>
            )}
            <span style={s.readMore}>Read more →</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function formatTime(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const now  = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutes ago

    if (diff < 60)  return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

const s = {
  wrap:     { height:"100%", overflowY:"auto", background:"#0d1117" },
  header:   { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 10px", borderBottom:"1px solid #21262d" },
  title:    { fontSize:15, fontWeight:700, color:"#e6edf3" },
  count:    { fontSize:12, color:"#8b949e", background:"#21262d", padding:"2px 8px", borderRadius:10 },
  list:     { padding:"8px 12px", display:"flex", flexDirection:"column", gap:8 },
  card:     { display:"block", textDecoration:"none", background:"#161b22", border:"1px solid #30363d", borderRadius:8, padding:"12px 14px", transition:"border-color 0.15s", cursor:"pointer" },
  cardTop:  { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 },
  source:   { fontSize:11, color:"#58a6ff", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.03em" },
  time:     { fontSize:11, color:"#6e7681" },
  headline: { fontSize:13, fontWeight:600, color:"#e6edf3", lineHeight:1.5, margin:"0 0 6px" },
  summary:  { fontSize:12, color:"#8b949e", lineHeight:1.5, margin:"0 0 8px" },
  readMore: { fontSize:11, color:"#58a6ff" },
  center:   { height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 },
  spinner:  { fontSize:32 },
  muted:    { fontSize:13, color:"#8b949e" },
};