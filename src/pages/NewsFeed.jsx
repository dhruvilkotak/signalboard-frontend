// src/pages/NewsFeed.jsx
import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function NewsFeed({ prices }) {
  const [news, setNews] = useState({});
  const [selected, setSelected] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.news.all()
      .then(setNews)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const symbols = ["ALL", ...Object.keys(news).filter(k => news[k].length > 0)];
  const articles = selected === "ALL"
    ? Object.values(news).flat().sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 30)
    : news[selected] || [];

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {symbols.map(s => (
          <button key={s} className={`btn ${selected===s?"btn-primary":""}`}
            onClick={() => setSelected(s)}>{s}</button>
        ))}
      </div>

      {loading && <div className="hint mono">Fetching news...</div>}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {articles.map((article, i) => (
          <div key={article.id || i} className="card fade-in">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
              <div style={{ flex:1 }}>
                <a href={article.url} target="_blank" rel="noopener noreferrer"
                  style={{ color:"var(--text1)", textDecoration:"none", fontSize:14, fontWeight:500, lineHeight:1.4 }}>
                  {article.headline}
                </a>
                {article.summary && (
                  <div className="muted" style={{ fontSize:12, marginTop:6, lineHeight:1.5 }}>
                    {article.summary.slice(0, 200)}{article.summary.length > 200 ? "..." : ""}
                  </div>
                )}
                <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                  <span className="hint">{article.source}</span>
                  <span className="hint">·</span>
                  <span className="hint">{new Date(article.created_at).toLocaleTimeString()}</span>
                  <span className="hint">·</span>
                  {(article.symbols || []).map(s => (
                    <span key={s} className="hint mono" style={{ color:"var(--blue)" }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        {!loading && articles.length === 0 && (
          <div className="hint mono">No news found. News refreshes every 30 minutes.</div>
        )}
      </div>
    </div>
  );
}
