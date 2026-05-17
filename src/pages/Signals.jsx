// src/pages/Signals.jsx
import { useState, useEffect } from "react";
import { api } from "../lib/api";

const TICKERS = ["SPY","VOO","JEPI","JEPQ","SCHD","SGOV","MSFT","AAPL","NVDA","GOOGL","AMZN","META","HOOD"];
const SIG_COLOR = { BUY:"var(--signal-buy)", HOLD:"var(--signal-hold)", SELL:"var(--signal-sell)" };
const CONF_COLOR = { HIGH:"var(--green)", MEDIUM:"var(--amber)", LOW:"var(--red)" };

export default function Signals({ prices }) {
  const [signals, setSignals] = useState({});
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await api.signals.all();
      setSignals(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchOne = async (symbol) => {
    setAnalyzing(symbol);
    try {
      const data = await api.signals.one(symbol, true);
      setSignals(prev => ({ ...prev, [symbol]: data }));
    } catch (e) { console.error(e); }
    setAnalyzing(null);
  };

  const buys  = Object.entries(signals).filter(([,s]) => s.signal === "BUY").length;
  const holds = Object.entries(signals).filter(([,s]) => s.signal === "HOLD").length;
  const sells = Object.entries(signals).filter(([,s]) => s.signal === "SELL").length;

  return (
    <div>
      {/* Summary */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        {[["BUY",buys,"var(--signal-buy)"],["HOLD",holds,"var(--signal-hold)"],["SELL",sells,"var(--signal-sell)"]].map(([l,c,col]) => (
          <div key={l} style={{
            padding:"4px 12px", borderRadius:20, fontSize:11, fontFamily:"var(--mono)", fontWeight:700,
            background:`${col}12`, border:`1px solid ${col}35`, color:col,
          }}>{c} {l}</div>
        ))}
        <div style={{ flex:1 }} />
        <button className="btn" onClick={fetchAll} disabled={loading}>
          {loading ? "⟳ Analyzing..." : "⚡ Analyze All"}
        </button>
      </div>

      {/* Market mood bar */}
      {Object.keys(signals).length > 0 && (
        <div className="card" style={{ padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <span className="hint mono">MARKET MOOD</span>
          <div style={{ flex:1, height:4, background:"var(--bg3)", borderRadius:2, overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:2,
              background: buys > sells ? "var(--signal-buy)" : sells > buys ? "var(--signal-sell)" : "var(--signal-hold)",
              width:`${Math.max(8,(Math.max(buys,sells)/(buys+holds+sells||1))*100)}%`,
              transition:"width 0.6s",
            }} />
          </div>
          <span className="mono" style={{ fontSize:12, fontWeight:700,
            color: buys > sells ? "var(--signal-buy)" : sells > buys ? "var(--signal-sell)" : "var(--signal-hold)"
          }}>{buys > sells ? "BULLISH" : sells > buys ? "BEARISH" : "NEUTRAL"}</span>
        </div>
      )}

      {/* Signal cards */}
      <div className="card-grid">
        {TICKERS.map(symbol => {
          const sig = signals[symbol];
          const p = prices[symbol];
          const color = SIG_COLOR[sig?.signal] || "var(--text3)";
          const isBusy = analyzing === symbol;
          return (
            <div key={symbol} className="card fade-in" style={{
              border:`1px solid ${sig ? color+"50" : "var(--border)"}`,
              boxShadow: sig ? `0 0 16px ${color}10` : "none",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{
                position:"absolute", top:0, left:0, right:0, height:2,
                background: sig ? `linear-gradient(90deg,transparent,${color}80,transparent)` : "none"
              }} />

              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <div>
                  <span className="mono" style={{ fontSize:16, fontWeight:700 }}>{symbol}</span>
                  {p && <div className="hint mono" style={{ marginTop:2 }}>${p.price?.toFixed(2)}</div>}
                </div>
                <div style={{
                  padding:"3px 10px", borderRadius:6, fontSize:10, fontWeight:700,
                  fontFamily:"var(--mono)", letterSpacing:1,
                  background:`${color}15`, border:`1px solid ${color}55`, color,
                }}>{sig?.signal ?? "—"}</div>
              </div>

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
                  </div>
                </>
              )}

              <button
                className="btn"
                onClick={() => fetchOne(symbol)}
                disabled={isBusy}
                style={{
                  width:"100%", fontSize:11,
                  borderColor:`${color}40`, color: isBusy ? "var(--text3)" : color,
                }}
              >{isBusy ? "⟳ Analyzing..." : "⚡ Get Signal"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
