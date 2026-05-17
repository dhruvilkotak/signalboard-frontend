// src/pages/Trader.jsx
import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Trader({ prices }) {
  const [perf, setPerf] = useState(null);
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [running, setRunning] = useState(false);

  const load = async () => {
    try {
      const [p, pos, t] = await Promise.all([
        api.trader.performance(),
        api.trader.positions(),
        api.trader.trades(),
      ]);
      setPerf(p); setPositions(pos); setTrades(t);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const runAll = async () => {
    setRunning(true);
    try {
      await api.trader.runAll();
      await load();
    } catch (e) { console.error(e); }
    setRunning(false);
  };

  const pnlColor = (v) => v >= 0 ? "var(--green)" : "var(--red)";

  return (
    <div>
      {/* Performance header */}
      <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        {perf && [
          ["Budget", `$${perf.budget?.toFixed(2)}`,"var(--text1)"],
          ["Value", `$${perf.current_value?.toFixed(2)}`, pnlColor(perf.pnl)],
          ["P&L", `${perf.pnl >= 0 ? "+" : ""}$${perf.pnl?.toFixed(2)}`, pnlColor(perf.pnl)],
          ["Return", `${perf.pnl_pct?.toFixed(2)}%`, pnlColor(perf.pnl_pct)],
          ["Trades", perf.total_trades, "var(--blue)"],
          ["Goal", `$${perf.target?.toFixed(0)}`, "var(--amber)"],
        ].map(([label, val, color]) => (
          <div key={label} className="card" style={{ flex:1, minWidth:100, padding:"10px 14px" }}>
            <div className="hint mono" style={{ marginBottom:4 }}>{label}</div>
            <div className="mono" style={{ fontSize:18, fontWeight:700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Progress to $200 goal */}
      {perf && (
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span className="hint mono">PROGRESS TO $200 GOAL</span>
            <span className="mono" style={{ fontSize:12, color:"var(--amber)" }}>
              {perf.progress_to_target_pct?.toFixed(1)}%
            </span>
          </div>
          <div style={{ height:8, background:"var(--bg3)", borderRadius:4, overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:4,
              background:"linear-gradient(90deg,#1f6feb,#0fffa3)",
              width:`${Math.min(perf.progress_to_target_pct,100)}%`,
              transition:"width 0.6s",
            }} />
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <button className="btn btn-primary" onClick={runAll} disabled={running}>
          {running ? "⟳ Running..." : "🤖 Run AI Auto-Trade"}
        </button>
        <button className="btn" onClick={load}>↻ Refresh</button>
      </div>

      {/* Positions */}
      <div style={{ marginBottom:20 }}>
        <div className="hint mono" style={{ marginBottom:10 }}>OPEN POSITIONS</div>
        {positions.length === 0
          ? <div className="hint">No open positions.</div>
          : positions.map(pos => (
            <div key={pos.symbol} className="card fade-in" style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span className="mono" style={{ fontWeight:700 }}>{pos.symbol}</span>
                <span className="mono" style={{ color: pnlColor(pos.unrealized_pnl) }}>
                  {pos.unrealized_pnl >= 0 ? "+" : ""}${pos.unrealized_pnl?.toFixed(2)} ({pos.unrealized_pnl_pct?.toFixed(2)}%)
                </span>
              </div>
              <div style={{ display:"flex", gap:12, marginTop:4 }}>
                <span className="hint">Qty: {pos.qty}</span>
                <span className="hint">Avg: ${pos.avg_entry?.toFixed(2)}</span>
                <span className="hint">Now: ${pos.current_price?.toFixed(2)}</span>
                <span className="hint">Val: ${pos.market_value?.toFixed(2)}</span>
              </div>
            </div>
          ))
        }
      </div>

      {/* Trade log */}
      <div>
        <div className="hint mono" style={{ marginBottom:10 }}>TRADE LOG</div>
        {trades.length === 0
          ? <div className="hint">No trades executed yet. Click "Run AI Auto-Trade" to start.</div>
          : trades.map((t, i) => (
            <div key={i} className="card fade-in" style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{
                    fontSize:10, padding:"2px 7px", borderRadius:4, fontFamily:"var(--mono)", fontWeight:700,
                    background: t.action==="BUY" ? "var(--signal-buy)20" : "var(--signal-sell)20",
                    color: t.action==="BUY" ? "var(--signal-buy)" : "var(--signal-sell)",
                    border: `1px solid ${t.action==="BUY" ? "var(--signal-buy)" : "var(--signal-sell)"}40`,
                  }}>{t.action}</span>
                  <span className="mono" style={{ fontWeight:700 }}>{t.symbol}</span>
                </div>
                <span className="hint mono">{new Date(t.timestamp).toLocaleTimeString()}</span>
              </div>
              <div style={{ display:"flex", gap:12, marginTop:4 }}>
                <span className="hint">Qty: {t.qty}</span>
                <span className="hint">@ ${t.price?.toFixed(2)}</span>
                {t.amount && <span className="hint">Total: ${t.amount?.toFixed(2)}</span>}
                {t.pnl !== undefined && (
                  <span style={{ color: pnlColor(t.pnl) }}>
                    P&L: {t.pnl >= 0 ? "+" : ""}${t.pnl?.toFixed(2)}
                  </span>
                )}
              </div>
              {t.signal_reason && (
                <div className="hint" style={{ marginTop:4, fontSize:11 }}>"{t.signal_reason}"</div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}
