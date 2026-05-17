// src/pages/Watchlist.jsx
import { useState } from "react";
import { api } from "../lib/api";

const TICKERS = [
  { symbol: "SPY",  name: "S&P 500 ETF",        type: "ETF" },
  { symbol: "VOO",  name: "Vanguard S&P 500",    type: "ETF" },
  { symbol: "JEPI", name: "JPMorgan Income ETF", type: "ETF" },
  { symbol: "JEPQ", name: "JPMorgan Nasdaq ETF", type: "ETF" },
  { symbol: "SCHD", name: "Schwab Dividend ETF", type: "ETF" },
  { symbol: "SGOV", name: "T-Bills ETF",         type: "ETF" },
  { symbol: "MSFT", name: "Microsoft",           type: "STOCK" },
  { symbol: "AAPL", name: "Apple",               type: "STOCK" },
  { symbol: "NVDA", name: "Nvidia",              type: "STOCK" },
  { symbol: "GOOGL", name: "Alphabet",           type: "STOCK" },
  { symbol: "AMZN", name: "Amazon",              type: "STOCK" },
  { symbol: "META", name: "Meta Platforms",      type: "STOCK" },
  { symbol: "HOOD", name: "Robinhood",           type: "STOCK" },
];

export default function Watchlist({ prices }) {
  const [filter, setFilter] = useState("ALL");
  const filtered = TICKERS.filter(t => filter === "ALL" || t.type === filter);

  const totalUp = TICKERS.filter(t => (prices[t.symbol]?.change_pct ?? 0) > 0).length;
  const totalDown = TICKERS.filter(t => (prices[t.symbol]?.change_pct ?? 0) < 0).length;

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <div className="card" style={{ flex:1, minWidth:120, padding:"10px 14px" }}>
          <div className="hint mono">ADVANCING</div>
          <div style={{ fontSize:22, fontWeight:700, color:"var(--green)", fontFamily:"var(--mono)" }}>{totalUp}</div>
        </div>
        <div className="card" style={{ flex:1, minWidth:120, padding:"10px 14px" }}>
          <div className="hint mono">DECLINING</div>
          <div style={{ fontSize:22, fontWeight:700, color:"var(--red)", fontFamily:"var(--mono)" }}>{totalDown}</div>
        </div>
        <div className="card" style={{ flex:1, minWidth:120, padding:"10px 14px" }}>
          <div className="hint mono">TRACKED</div>
          <div style={{ fontSize:22, fontWeight:700, fontFamily:"var(--mono)" }}>{TICKERS.length}</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {["ALL","STOCK","ETF"].map(f => (
          <button key={f} className={`btn ${filter===f?"btn-primary":""}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {/* Grid */}
      <div className="card-grid">
        {filtered.map(ticker => {
          const p = prices[ticker.symbol];
          const change = p?.change_pct ?? 0;
          const up = change >= 0;
          return (
            <div key={ticker.symbol} className="card fade-in" style={{ position:"relative", overflow:"hidden" }}>
              <div style={{
                position:"absolute", top:0, left:0, right:0, height:2,
                background: up ? "linear-gradient(90deg,transparent,var(--green),transparent)"
                              : "linear-gradient(90deg,transparent,var(--red),transparent)"
              }} />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span className="mono" style={{ fontSize:16, fontWeight:700 }}>{ticker.symbol}</span>
                    <span style={{
                      fontSize:9, padding:"2px 5px", borderRadius:4,
                      background: ticker.type==="ETF" ? "#1f6feb20" : "#3fb95020",
                      color: ticker.type==="ETF" ? "var(--blue)" : "var(--green)",
                      fontFamily:"var(--mono)",
                    }}>{ticker.type}</span>
                  </div>
                  <div className="hint" style={{ marginTop:2 }}>{ticker.name}</div>
                </div>
              </div>

              {p ? (
                <>
                  <div className="mono" style={{ fontSize:26, fontWeight:700, letterSpacing:-1 }}>
                    ${p.price.toFixed(2)}
                  </div>
                  <div className="mono" style={{ fontSize:12, color: up ? "var(--green)" : "var(--red)", marginTop:2 }}>
                    {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                    <span className="muted" style={{ marginLeft:8, fontSize:11 }}>prev ${p.prev_close?.toFixed(2)}</span>
                  </div>
                  <div style={{ marginTop:8, display:"flex", gap:10 }}>
                    <div className="hint">H: <span className="mono" style={{ color:"var(--text1)" }}>${p.high?.toFixed(2)}</span></div>
                    <div className="hint">L: <span className="mono" style={{ color:"var(--text1)" }}>${p.low?.toFixed(2)}</span></div>
                    <div className="hint">Vol: <span className="mono" style={{ color:"var(--text1)" }}>{p.volume ? (p.volume/1e6).toFixed(1)+"M" : "—"}</span></div>
                  </div>
                  {/* Mini bar */}
                  <div style={{ marginTop:10, height:3, background:"var(--bg3)", borderRadius:2, overflow:"hidden" }}>
                    <div style={{
                      height:"100%", borderRadius:2,
                      width: `${Math.min(Math.abs(change)*15, 100)}%`,
                      background: up ? "var(--green)" : "var(--red)",
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </>
              ) : (
                <div className="hint mono" style={{ padding:"20px 0" }}>Loading...</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
