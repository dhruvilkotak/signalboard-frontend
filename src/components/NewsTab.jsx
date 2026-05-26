// src/components/NewsTab.jsx
// Fetches news directly from Yahoo Finance — real-time, no backend needed
// Falls back to backend if Yahoo CORS blocks the request

import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";

async function fetchYahooNews(symbol) {
  // Try Yahoo Finance directly first (faster, real-time)
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=10&quotesCount=0&listsCount=0`,
      { headers: { "Accept": "application/json" } }
    );
    if (!res.ok) throw new Error("Yahoo direct failed");
    const data = await res.json();
    const items = data.news || [];
    if (items.length > 0) {
      return items.map(item => ({
        id:         item.uuid || "",
        headline:   item.title || "",
        summary:    item.summary || "",
        url:        item.link || "#",
        source:     item.publisher || "Yahoo Finance",
        created_at: new Date(item.providerPublishTime * 1000).toISOString(),
      }));
    }
  } catch {
    // CORS blocked — fall through to backend
  }

  // Fallback to backend proxy
  const res = await fetch(`${API}/api/news/${symbol}/`);
  if (!res.ok) throw new Error("News fetch failed");
  return await res.json();
}

export default function NewsTab({ symbol }) {
  const [articles, setArticles] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    setArticles([]);

    fetchYahooNews(symbol)
      .then(data => {
        setArticles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        setError("Failed to load news.");
        setLoading(false);
      });
  }, [symbol]);

  if (loading) return (
    <div style={s.center}>
      <div style={{ fontSize:32, marginBottom:8 }}>📰</div>
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
      <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
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
                {a.summary.length > 140
                  ? a.summary.slice(0, 140) + "…"
                  : a.summary}
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
    const diff = Math.floor((Date.now() - date) / 60000); // minutes
    if (diff < 60)   return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  } catch {
    return "";
  }
}

const s = {
  wrap:     { height:"100%", overflowY:"auto", background:"#0d1117" },
  header:   { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 10px", borderBottom:"1px solid #21262d", position:"sticky", top:0, background:"#0d1117" },
  title:    { fontSize:15, fontWeight:700, color:"#e6edf3" },
  count:    { fontSize:12, color:"#8b949e", background:"#21262d", padding:"2px 8px", borderRadius:10 },
  list:     { padding:"8px 12px", display:"flex", flexDirection:"column", gap:8 },
  card:     { display:"block", textDecoration:"none", background:"#161b22", border:"1px solid #30363d", borderRadius:8, padding:"12px 14px", transition:"border-color 0.15s" },
  cardTop:  { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 },
  source:   { fontSize:11, color:"#58a6ff", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.03em" },
  time:     { fontSize:11, color:"#6e7681" },
  headline: { fontSize:13, fontWeight:600, color:"#e6edf3", lineHeight:1.5, margin:"0 0 6px" },
  summary:  { fontSize:12, color:"#8b949e", lineHeight:1.5, margin:"0 0 8px" },
  readMore: { fontSize:11, color:"#58a6ff" },
  center:   { height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, padding:"2rem" },
  muted:    { fontSize:13, color:"#8b949e", textAlign:"center" },
};