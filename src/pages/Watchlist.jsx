// src/pages/Watchlist.jsx — LiveDashboard
import { useState, useEffect } from "react";
import { usePrices } from "../hooks/usePrices";

const TICKERS = [
  { symbol: "SPY",   name: "S&P 500 ETF",        type: "ETF" },
  { symbol: "VOO",   name: "Vanguard S&P 500",    type: "ETF" },
  { symbol: "JEPI",  name: "JPMorgan Income ETF", type: "ETF" },
  { symbol: "JEPQ",  name: "JPMorgan Nasdaq ETF", type: "ETF" },
  { symbol: "SCHD",  name: "Schwab Dividend ETF", type: "ETF" },
  { symbol: "SGOV",  name: "T-Bills ETF",         type: "ETF" },
  { symbol: "MSFT",  name: "Microsoft",           type: "STOCK" },
  { symbol: "AAPL",  name: "Apple",               type: "STOCK" },
  { symbol: "NVDA",  name: "Nvidia",              type: "STOCK" },
  { symbol: "GOOGL", name: "Alphabet",            type: "STOCK" },
  { symbol: "AMZN",  name: "Amazon",              type: "STOCK" },
  { symbol: "META",  name: "Meta Platforms",      type: "STOCK" },
  { symbol: "HOOD",  name: "Robinhood",           type: "STOCK" },
];

export default function LiveDashboard({ prices: propPrices }) {
  const { prices: hookPrices, connected, loading, error, refetch } = usePrices();
  // Prefer prop prices (from App-level WS) when populated, else fall back to hook
  const prices = propPrices && Object.keys(propPrices).length ? propPrices : hookPrices;

  const [filter, setFilter]         = useState("ALL");
  const [sort, setSort]             = useState("DEFAULT");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [flashMap, setFlashMap]     = useState({});

  useEffect(() => {
    if (!prices || !Object.keys(prices).length) return;
    setLastUpdate(new Date());
    const next = {};
    TICKERS.forEach(t => { if (prices[t.symbol]) next[t.symbol] = true; });
    setFlashMap(next);
    const id = setTimeout(() => setFlashMap({}), 800);
    return () => clearTimeout(id);
  }, [prices]);

  const filtered = TICKERS
    .filter(t => filter === "ALL" || t.type === filter)
    .sort((a, b) => {
      const ca = prices[a.symbol]?.change_pct ?? 0;
      const cb = prices[b.symbol]?.change_pct ?? 0;
      if (sort === "CHANGE_DESC") return cb - ca;
      if (sort === "CHANGE_ASC")  return ca - cb;
      if (sort === "PRICE_DESC")  return (prices[b.symbol]?.price ?? 0) - (prices[a.symbol]?.price ?? 0);
      return 0;
    });

  const advancing = TICKERS.filter(t => (prices[t.symbol]?.change_pct ?? 0) > 0);
  const declining = TICKERS.filter(t => (prices[t.symbol]?.change_pct ?? 0) < 0);
  const breadthPct = (advancing.length / TICKERS.length) * 100;

  const topMover = [...TICKERS].sort((a, b) =>
    Math.abs(prices[b.symbol]?.change_pct ?? 0) - Math.abs(prices[a.symbol]?.change_pct ?? 0)
  )[0];
  const topMoverData = topMover ? prices[topMover.symbol] : null;

  return (
    <div>
      {/* Live status row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{
            display:"inline-block", width:8, height:8, borderRadius:"50%",
            background: connected ? "var(--green)" : "var(--red)",
            boxShadow: connected ? "0 0 6px var(--green)" : "none",
            animation: connected ? "livePulse 2s infinite" : "none",
          }} />
          <span className="mono hint" style={{ fontSize:11 }}>
            {connected ? "LIVE STREAM" : "POLLING"}
            {lastUpdate && ` · ${lastUpdate.toLocaleTimeString()}`}
          </span>
        </div>
        <button className="btn" onClick={refetch} style={{ fontSize:11 }}>⟳ REFRESH</button>
      </div>

      {/* Summary cards */}
      <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <div className="card" style={{ flex:1, minWidth:120, padding:"10px 14px" }}>
          <div className="hint mono">ADVANCING</div>
          <div style={{ fontSize:22, fontWeight:700, color:"var(--green)", fontFamily:"var(--mono)" }}>{advancing.length}</div>
        </div>
        <div className="card" style={{ flex:1, minWidth:120, padding:"10px 14px" }}>
          <div className="hint mono">DECLINING</div>
          <div style={{ fontSize:22, fontWeight:700, color:"var(--red)", fontFamily:"var(--mono)" }}>{declining.length}</div>
        </div>
        <div className="card" style={{ flex:1, minWidth:120, padding:"10px 14px" }}>
          <div className="hint mono">TRACKED</div>
          <div style={{ fontSize:22, fontWeight:700, fontFamily:"var(--mono)" }}>{TICKERS.length}</div>
        </div>
        {topMoverData && (
          <div className="card" style={{ flex:2, minWidth:180, padding:"10px 14px" }}>
            <div className="hint mono">TOP MOVER</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
              <span className="mono" style={{ fontSize:16, fontWeight:700 }}>{topMover.symbol}</span>
              <span className="mono" style={{
                fontSize:14,
                color: (topMoverData.change_pct ?? 0) >= 0 ? "var(--green)" : "var(--red)",
              }}>
                {(topMoverData.change_pct ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(topMoverData.change_pct ?? 0).toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Market breadth bar */}
      <div style={{ marginBottom:16 }}>
        <div className="hint mono" style={{ marginBottom:4, fontSize:10 }}>
          MARKET BREADTH — {advancing.length} UP / {declining.length} DOWN
        </div>
        <div style={{ height:4, background:"var(--bg3)", borderRadius:2, overflow:"hidden" }}>
          <div style={{
            height:"100%", borderRadius:2,
            width:`${breadthPct}%`,
            background: breadthPct >= 50
              ? "linear-gradient(90deg, var(--green), #00ff9040)"
              : "linear-gradient(90deg, var(--red), #ff444040)",
            transition:"width 1s ease",
          }} />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:6 }}>
          {["ALL","STOCK","ETF"].map(f => (
            <button key={f} className={`btn ${filter===f?"btn-primary":""}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
          {[
            ["DEFAULT",     "DEFAULT"],
            ["CHANGE_DESC", "↑ CHANGE"],
            ["CHANGE_ASC",  "↓ CHANGE"],
            ["PRICE_DESC",  "$ PRICE"],
          ].map(([val, label]) => (
            <button key={val} className={`btn ${sort===val?"btn-primary":""}`}
              onClick={() => setSort(val)} style={{ fontSize:10 }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="card" style={{ padding:"10px 14px", marginBottom:12, borderColor:"var(--red)" }}>
          <span className="mono hint" style={{ color:"var(--red)", fontSize:11 }}>API ERROR: {error}</span>
        </div>
      )}

      {/* Price grid */}
      {loading && !Object.keys(prices).length ? (
        <div className="hint mono" style={{ textAlign:"center", padding:40 }}>Loading prices…</div>
      ) : (
        <div className="card-grid">
          {filtered.map(ticker => {
            const p      = prices[ticker.symbol];
            const change = p?.change_pct ?? 0;
            const up     = change >= 0;
            const flash  = flashMap[ticker.symbol];
            return (
              <div key={ticker.symbol} className="card fade-in" style={{
                position:"relative", overflow:"hidden",
                transition:"box-shadow 0.3s ease",
                boxShadow: flash ? `0 0 12px ${up?"var(--green)":"var(--red)"}40` : undefined,
              }}>
                {/* colour accent top bar */}
                <div style={{
                  position:"absolute", top:0, left:0, right:0, height:2,
                  background: up
                    ? "linear-gradient(90deg,transparent,var(--green),transparent)"
                    : "linear-gradient(90deg,transparent,var(--red),transparent)",
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
                  {connected && (
                    <span style={{
                      width:6, height:6, borderRadius:"50%", flexShrink:0,
                      background:"var(--green)", boxShadow:"0 0 4px var(--green)",
                    }} />
                  )}
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
                    <div style={{ marginTop:10, height:3, background:"var(--bg3)", borderRadius:2, overflow:"hidden" }}>
                      <div style={{
                        height:"100%", borderRadius:2,
                        width:`${Math.min(Math.abs(change)*15,100)}%`,
                        background: up ? "var(--green)" : "var(--red)",
                        transition:"width 0.5s ease",
                      }} />
                    </div>
                  </>
                ) : (
                  <div className="hint mono" style={{ padding:"20px 0" }}>Loading…</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
