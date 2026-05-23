// src/pages/Signals.jsx
import { useState, useEffect, useCallback } from "react";
import { getSignals, analyzeOne } from "../lib/api";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";

const SIG_COLOR = {
  BUY:  { color: "var(--signal-buy)",  bg: "#0fffa315", border: "#0fffa350" },
  HOLD: { color: "var(--signal-hold)", bg: "#ffd60015", border: "#ffd60050" },
  SELL: { color: "var(--signal-sell)", bg: "#ff416215", border: "#ff416250" },
};
const CONF_COLOR = { HIGH: "var(--green)", MEDIUM: "var(--amber)", LOW: "var(--red)" };

export default function Signals({ watchlist = [] }) {
  const [signals,  setSignals]  = useState({});
  const [prices,   setPrices]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [analyzing,setAnalyzing]= useState(null);
  const [lastRun,  setLastRun]  = useState(null);

  // Use watchlist or fallback to defaults
  const tickers = watchlist.length > 0 ? watchlist : [
    "SPY","VOO","JEPI","JEPQ","SCHD","SGOV","MSFT","AAPL","NVDA","GOOGL","AMZN","META","HOOD"
  ];

  // Fetch prices from our backend quote endpoint
  const fetchPrices = useCallback(async () => {
    try {
      const joined = tickers.join(",");
      const res = await fetch(`${API}/api/quote/batch/${joined}`);
      if (res.ok) setPrices(await res.json());
    } catch (e) {
      // Fallback to prices endpoint
      try {
        const res = await fetch(`${API}/api/prices/`);
        if (res.ok) setPrices(await res.json());
      } catch {}
    }
  }, [tickers.join(",")]);

  useEffect(() => {
    fetchPrices();
    const iv = setInterval(fetchPrices, 60000);
    return () => clearInterval(iv);
  }, [fetchPrices]);

  const fetchAll = async () => {
    if (loading) return;  // prevent double-click
    setLoading(true);
    try {
      // Force regenerate all signals
      const res = await fetch(`${API}/api/signals/run-all`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.signals) setSignals(data.signals);
        else setSignals(data);
      }
      setLastRun(new Date());
    } catch (e) {
      console.error(e);
      // Fallback to GET cached signals
      try {
        const data = await getSignals();
        setSignals(data);
      } catch {}
    }
    setLoading(false);
  };

  const fetchOne = async (symbol) => {
    setAnalyzing(symbol);
    try {
      const data = await analyzeOne(symbol);
      setSignals(prev => ({ ...prev, [symbol]: data }));
    } catch (e) { console.error(e); }
    setAnalyzing(null);
  };

  const buys  = Object.values(signals).filter(s => s?.signal === "BUY").length;
  const holds = Object.values(signals).filter(s => s?.signal === "HOLD").length;
  const sells = Object.values(signals).filter(s => s?.signal === "SELL").length;
  const total = buys + holds + sells;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        {[["BUY",buys,"var(--signal-buy)"],["HOLD",holds,"var(--signal-hold)"],["SELL",sells,"var(--signal-sell)"]].map(([l,c,col]) => (
          <div key={l} style={{
            padding:"4px 12px", borderRadius:20, fontSize:11,
            fontFamily:"var(--mono)", fontWeight:700,
            background:`${col}12`, border:`1px solid ${col}35`, color:col,
          }}>{c} {l}</div>
        ))}
        <div style={{ flex:1 }} />
        {lastRun && (
          <span style={{ fontSize:10, color:"var(--text3)", fontFamily:"var(--mono)" }}>
            Last run: {lastRun.toLocaleTimeString()}
          </span>
        )}
        <button className="btn btn-primary" onClick={fetchAll} disabled={loading} style={{ minWidth: 140 }}>
          {loading ? `⟳ Analyzing... (${Object.keys(signals).length}/${tickers.length})` : "⚡ Analyze All"}
        </button>
      </div>

      {/* Market mood */}
      {total > 0 && (
        <div className="card" style={{ padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)" }}>MARKET MOOD</span>
          <div style={{ flex:1, height:4, background:"var(--bg3)", borderRadius:2, overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:2, transition:"width 0.6s",
              background: buys > sells ? "var(--signal-buy)" : sells > buys ? "var(--signal-sell)" : "var(--signal-hold)",
              width:`${Math.max(8,(Math.max(buys,sells)/total)*100)}%`,
            }} />
          </div>
          <span style={{
            fontFamily:"var(--mono)", fontSize:12, fontWeight:700,
            color: buys > sells ? "var(--signal-buy)" : sells > buys ? "var(--signal-sell)" : "var(--signal-hold)",
          }}>{buys > sells ? "BULLISH" : sells > buys ? "BEARISH" : "NEUTRAL"}</span>
        </div>
      )}

      {/* No signals yet message */}
      {total === 0 && !loading && (
        <div className="card" style={{ padding:24, textAlign:"center", marginBottom:16 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>⚡</div>
          <div style={{ color:"var(--text2)", marginBottom:4 }}>No signals generated yet</div>
          <div style={{ color:"var(--text3)", fontSize:12, marginBottom:16 }}>
            Click "Analyze All" to generate AI signals for all {tickers.length} tickers
          </div>
          <button className="btn btn-primary" onClick={fetchAll}>⚡ Analyze All</button>
        </div>
      )}

      {/* Signal cards */}
      <div className="card-grid">
        {tickers.map(symbol => {
          const sig  = signals[symbol];
          const p    = prices[symbol];
          const colors = SIG_COLOR[sig?.signal] || {};
          const isBusy = analyzing === symbol;
          const chg  = p?.change_pct ?? 0;
          const up   = chg >= 0;

          return (
            <div key={symbol} className="card fade-in" style={{
              border: sig ? `1px solid ${colors.border}` : "1px solid var(--border)",
              boxShadow: sig ? `0 0 16px ${colors.color}10` : "none",
              position:"relative", overflow:"hidden",
            }}>
              {/* Top accent */}
              <div style={{
                position:"absolute", top:0, left:0, right:0, height:2,
                background: sig ? `linear-gradient(90deg,transparent,${colors.color}80,transparent)` : "none",
              }} />

              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <div>
                  <span className="mono" style={{ fontSize:15, fontWeight:700 }}>{symbol}</span>
                  {p && (
                    <div style={{ display:"flex", gap:8, marginTop:2, alignItems:"center" }}>
                      <span className="mono" style={{ fontSize:13, color:"var(--text1)" }}>
                        ${p.price?.toFixed(2)}
                      </span>
                      <span className="mono" style={{ fontSize:11, color: up ? "var(--green)" : "var(--red)" }}>
                        {up?"▲":"▼"}{Math.abs(chg).toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
                {sig?.signal && (
                  <div style={{
                    padding:"3px 10px", borderRadius:6, fontSize:10, fontWeight:700,
                    fontFamily:"var(--mono)", letterSpacing:1,
                    background:colors.bg, border:`1px solid ${colors.border}`, color:colors.color,
                  }}>{sig.signal}</div>
                )}
              </div>

              {/* Signal details */}
              {sig && (
                <>
                  <div style={{ fontSize:11, color:"var(--text2)", lineHeight:1.6, marginBottom:8 }}>
                    {sig.summary}
                  </div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10 }}>
                    <div className="hint">
                      Confidence: <span style={{ color:CONF_COLOR[sig.confidence] }}>{sig.confidence}</span>
                    </div>
                    {sig.target_price && (
                      <div className="hint">
                        Target: <span className="mono" style={{ color:"var(--text1)" }}>${sig.target_price}</span>
                      </div>
                    )}
                    {sig.expected_return_pct !== undefined && (
                      <div className="hint">
                        Return: <span style={{ color: sig.expected_return_pct >= 0 ? "var(--green)" : "var(--red)" }}>
                          {sig.expected_return_pct > 0 ? "+" : ""}{sig.expected_return_pct}%
                        </span>
                      </div>
                    )}
                    {sig.session_label && (
                      <div className="hint" style={{ fontFamily:"var(--mono)" }}>
                        {sig.session_label}
                      </div>
                    )}
                  </div>
                </>
              )}

              <button
                className="btn"
                onClick={() => fetchOne(symbol)}
                disabled={isBusy}
                style={{
                  width:"100%", fontSize:11,
                  borderColor: sig ? colors.border : "var(--border)",
                  color: isBusy ? "var(--text3)" : (sig ? colors.color : "var(--text2)"),
                }}
              >{isBusy ? "⟳ Analyzing..." : "⚡ Get Signal"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}