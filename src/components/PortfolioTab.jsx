// src/components/PortfolioTab.jsx — v3
// Shows all positions for selected symbol across all strategies
// Manual BUY/SELL requires picking a strategy

import { useState, useEffect } from "react";
import { getPortfolioOverview, portfolioManualTrade } from "../lib/api";

const MONO = "'IBM Plex Mono', monospace";
const S = {
  root:  { height: "100%", overflowY: "auto", padding: 20, background: "#0d1117", color: "#e6edf3" },
  card:  { background: "#161b22", border: "1px solid #21262d", borderRadius: 10, padding: 16, marginBottom: 12 },
  label: { fontFamily: MONO, fontSize: 9, color: "#6e7681", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  val:   { fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "#e6edf3" },
  row:   { display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 },
  col:   { display: "flex", flexDirection: "column", gap: 2 },
  input: { background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, padding: "7px 10px", color: "#e6edf3", fontFamily: MONO, fontSize: 12, outline: "none", width: "100%" },
};

const pnlColor = (n) => (n ?? 0) >= 0 ? "#3fb950" : "#f85149";
const sign     = (n) => (n ?? 0) >= 0 ? "+" : "";
const fmt      = (n, d = 2) => (+(n ?? 0)).toFixed(d);

function SlBar({ buyPrice, stopPrice, currentPrice }) {
  if (!buyPrice || !stopPrice || !currentPrice) return null;
  const range = buyPrice - stopPrice;
  const pct   = range > 0 ? Math.max(0, Math.min(100, ((currentPrice - stopPrice) / range) * 100)) : 100;
  const color = pct < 20 ? "#f85149" : pct < 50 ? "#e3b341" : "#3fb950";
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 8, color: "#6e7681", marginBottom: 3 }}>
        <span>Stop ${fmt(stopPrice)}</span><span>Buy ${fmt(buyPrice)}</span>
      </div>
      <div style={{ height: 4, background: "#21262d", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ── Trade confirm modal ───────────────────────────────────────────────────────
function TradeModal({ action, symbol, price, strategies, onConfirm, onCancel, loading }) {
  const isBuy       = action === "BUY";
  const [sk,        setSk]      = useState("");
  const [mode,      setMode]    = useState("usd");
  const [inputVal,  setInputVal] = useState("");

  const numVal   = parseFloat(inputVal) || 0;
  const strat    = strategies.find(s => s.key === sk);
  const idleCash = strat?.cash_in_strategy ?? 0;

  const sharesCalc = mode === "usd" && price > 0 ? numVal / price : mode === "shares" ? numVal : null;
  const costCalc   = mode === "usd" ? numVal : mode === "shares" ? numVal * price : null;
  const overBudget = isBuy && costCalc != null && costCalc > idleCash;
  const valid      = sk && (!isBuy || mode === "strategy" || (numVal > 0 && !overBudget));

  const handleConfirm = () => {
    if (!valid) return;
    if (mode === "usd")      onConfirm(sk, { amountUsd: numVal });
    else if (mode === "shares") onConfirm(sk, { shares: numVal });
    else onConfirm(sk, {});
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(1,4,9,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 14, padding: 24, maxWidth: 420, width: "92%" }}>
        <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
          {isBuy ? "▲ BUY" : "▼ SELL"} {symbol}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: "#6e7681", marginBottom: 16 }}>
          Current price: <strong style={{ color: "#e6edf3" }}>${fmt(price)}</strong>
        </div>

        {/* Strategy picker */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...S.label, marginBottom: 8 }}>SELECT STRATEGY</div>
          {strategies.length === 0 ? (
            <div style={{ fontFamily: MONO, fontSize: 11, color: "#e3b341", padding: "8px 12px", background: "#e3b34112", borderRadius: 6, border: "1px solid #e3b34130" }}>
              ⚠ No strategies allocated. Go to Auto-Trader tab to allocate funds first.
            </div>
          ) : strategies.map(s => (
            <label key={s.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 4,
              background: sk === s.key ? "#1f6feb15" : "#0d1117", borderRadius: 6,
              border: `1px solid ${sk === s.key ? "#1f6feb60" : "#21262d"}`, cursor: "pointer" }}>
              <input type="radio" value={s.key} checked={sk === s.key} onChange={() => setSk(s.key)} style={{ accentColor: "#58a6ff" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: "#6e7681" }}>
                  Idle cash: ${fmt(s.cash_in_strategy)} · Invested: ${fmt(s.invested)}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Amount input (BUY only) */}
        {isBuy && sk && (
          <>
            <div style={{ display: "flex", gap: 4, marginBottom: 10, background: "#0d1117", borderRadius: 7, padding: 3 }}>
              {[["usd", "$ Amount"], ["shares", "# Shares"], ["strategy", "Auto Size"]].map(([m, l]) => (
                <button key={m} onClick={() => { setMode(m); setInputVal(""); }}
                  style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: "none", fontFamily: MONO, fontSize: 11, cursor: "pointer",
                    background: mode === m ? "#21262d" : "transparent", color: mode === m ? "#e6edf3" : "#6e7681", fontWeight: mode === m ? 700 : 400 }}>
                  {l}
                </button>
              ))}
            </div>
            {mode !== "strategy" && (
              <>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontFamily: MONO, fontSize: 12, color: "#6e7681" }}>
                    {mode === "usd" ? "$" : "×"}
                  </span>
                  <input style={{ ...S.input, paddingLeft: 24 }} type="number"
                    placeholder={mode === "usd" ? "150.00" : "0.25"}
                    value={inputVal} onChange={e => setInputVal(e.target.value)} autoFocus />
                </div>
                {/* Quick picks */}
                {mode === "usd" && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    {[50, 100, 250, 500].map(v => (
                      <button key={v} onClick={() => setInputVal(String(v))}
                        style={{ flex: 1, padding: "4px 0", borderRadius: 5, border: "1px solid #30363d",
                          background: inputVal === String(v) ? "#21262d" : "transparent",
                          color: "#8b949e", fontFamily: MONO, fontSize: 10, cursor: "pointer" }}>
                        ${v}
                      </button>
                    ))}
                  </div>
                )}
                {numVal > 0 && (
                  <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontFamily: MONO, fontSize: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#6e7681" }}>Shares</span>
                      <span>{sharesCalc?.toFixed(6)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ color: "#6e7681" }}>Cost</span>
                      <span style={{ color: overBudget ? "#f85149" : "#e6edf3" }}>${fmt(costCalc)}</span>
                    </div>
                    {overBudget && <div style={{ color: "#f85149", fontSize: 10, marginTop: 4 }}>Exceeds idle cash by ${fmt(costCalc - idleCash)}</div>}
                  </div>
                )}
              </>
            )}
          </>
        )}

        <div style={{ fontSize: 10, color: "#3a4258", fontFamily: MONO, marginBottom: 14 }}>
          📊 Virtual money only — no real funds involved
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ flex: 1, padding: "9px 0", borderRadius: 7, background: "#21262d", border: "1px solid #30363d", color: "#8b949e", fontFamily: MONO, fontSize: 12, cursor: "pointer" }}
            onClick={onCancel}>Cancel</button>
          <button style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700,
            opacity: (!valid || loading) ? 0.4 : 1, cursor: (!valid || loading) ? "not-allowed" : "pointer",
            border: "1px solid", background: isBuy ? "#0fffa315" : "#ff416215",
            borderColor: isBuy ? "#0fffa350" : "#ff416250", color: isBuy ? "#0fffa3" : "#ff4162" }}
            disabled={!valid || loading} onClick={handleConfirm}>
            {loading ? "Executing…" : `Confirm ${action}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PortfolioTab({ symbol, currentPrice }) {
  const [overview, setOverview] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [confirm,  setConfirm]  = useState(null);   // "BUY" | "SELL"
  const [trading,  setTrading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setOverview(await getPortfolioOverview()); }
    catch { setError("Could not load portfolio"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [symbol]);

  const summary    = overview?.summary ?? {};
  const strategies = overview?.strategies ?? {};
  const hasAgreement = summary.agreement_accepted ?? false;

  // All positions for this symbol across all strategies
  const myPositions = Object.values(strategies).flatMap(s =>
    (s.positions ?? []).filter(p => p.symbol === symbol.toUpperCase())
  );

  // Allocated strategies with idle cash (for BUY picker)
  const allocatedStrats = Object.entries(strategies)
    .filter(([, s]) => s.is_allocated)
    .map(([key, s]) => ({ key, label: s.config.label, ...s.allocation }));

  const handleTrade = async (sk, amountOpts = {}) => {
    setTrading(true);
    try {
      const res = await portfolioManualTrade(symbol, confirm, sk, amountOpts);
      if (res.status === "executed") {
        setResult({ type: "ok",  msg: `${confirm} executed in ${strategies[sk]?.config?.label}` });
        await load();
      } else {
        setResult({ type: "err", msg: res.reason ?? "Trade skipped" });
      }
    } catch (e) {
      setResult({ type: "err", msg: e.message ?? "Trade failed" });
    } finally {
      setTrading(false); setConfirm(null);
      setTimeout(() => setResult(null), 4000);
    }
  };

  if (loading) return (
    <div style={S.root}>
      <div style={{ fontFamily: MONO, fontSize: 11, color: "#6e7681", textAlign: "center", marginTop: 40 }}>Loading…</div>
    </div>
  );
  if (error) return (
    <div style={S.root}>
      <div style={{ fontFamily: MONO, fontSize: 11, color: "#f85149", textAlign: "center", marginTop: 40 }}>
        {error} <button style={{ color: "#58a6ff", background: "none", border: "none", cursor: "pointer", fontFamily: MONO }} onClick={load}>↻</button>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      {confirm && (
        <TradeModal
          action={confirm} symbol={symbol} price={currentPrice ?? 0}
          strategies={allocatedStrats}
          onConfirm={handleTrade}
          onCancel={() => setConfirm(null)}
          loading={trading}
        />
      )}
      {result && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: result.type === "ok" ? "#0fffa320" : "#f8514920",
          border: `1px solid ${result.type === "ok" ? "#0fffa360" : "#f8514960"}`,
          color: result.type === "ok" ? "#0fffa3" : "#f85149",
          padding: "8px 20px", borderRadius: 8, fontFamily: MONO, fontSize: 12, zIndex: 9999 }}>
          {result.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{symbol}</div>
        <button style={{ fontFamily: MONO, fontSize: 10, color: "#6e7681", background: "#161b22", border: "1px solid #21262d", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }} onClick={load}>↻</button>
      </div>

      {!hasAgreement && (
        <div style={{ ...S.card, borderColor: "#e3b34140", background: "#e3b34108", marginBottom: 12 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#e3b341" }}>
            ⚠ Accept the paper trading agreement in the Auto-Trader tab to enable manual trades.
          </div>
        </div>
      )}

      {/* Wallet snapshot */}
      <div style={S.card}>
        <div style={S.label}>VIRTUAL WALLET</div>
        <div style={S.row}>
          {[["Portfolio Value", `$${fmt(summary.total_value)}`], ["Available Cash", `$${fmt(summary.available_cash)}`]].map(([l, v]) => (
            <div key={l} style={S.col}><span style={S.label}>{l}</span><span style={S.val}>{v}</span></div>
          ))}
        </div>
      </div>

      {/* Positions for this symbol */}
      {myPositions.length > 0 ? (
        <div>
          <div style={{ ...S.label, marginBottom: 8 }}>OPEN POSITIONS — {symbol}</div>
          {myPositions.map(pos => {
            const lp     = currentPrice ?? pos.current_price ?? 0;
            const livePnl = lp ? (lp - pos.buy_price) * pos.shares : pos.unrealized_pnl ?? 0;
            const livePct = pos.buy_price ? ((lp - pos.buy_price) / pos.buy_price) * 100 : pos.unrealized_pnl_pct ?? 0;
            const slRange = pos.buy_price - pos.stop_loss_price;
            const slPct   = slRange > 0 ? Math.max(0, Math.min(100, ((lp - pos.stop_loss_price) / slRange) * 100)) : 100;
            return (
              <div key={pos.strategy_key} style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: "#8b949e", background: "#21262d", padding: "2px 8px", borderRadius: 4 }}>
                    {strategies[pos.strategy_key]?.config?.label ?? pos.strategy_key}
                  </span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: pnlColor(livePnl) }}>
                      {sign(livePnl)}${Math.abs(livePnl).toFixed(2)}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: pnlColor(livePct) }}>
                      {sign(livePct)}{fmt(livePct)}%
                    </div>
                  </div>
                </div>
                <div style={S.row}>
                  {[["Shares", fmt(pos.shares, 4)], ["Bought", `$${fmt(pos.buy_price)}`],
                    ["Now", `$${fmt(lp)}`], ["Value", `$${fmt(pos.shares * lp)}`],
                    ["Stop", `$${fmt(pos.stop_loss_price)}`]].map(([l, v]) => (
                    <div key={l} style={S.col}><span style={S.label}>{l}</span><span style={{ ...S.val, fontSize: 12 }}>{v}</span></div>
                  ))}
                </div>
                <SlBar buyPrice={pos.buy_price} stopPrice={pos.stop_loss_price} currentPrice={lp} />
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ ...S.card, textAlign: "center", padding: "20px 16px" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#6e7681", lineHeight: 1.6 }}>
            No open positions for <strong style={{ color: "#e6edf3" }}>{symbol}</strong>.<br />
            {allocatedStrats.length > 0 ? "Use manual BUY below." : "Allocate funds to a strategy in the Auto-Trader tab first."}
          </div>
        </div>
      )}

      {/* Trade buttons */}
      {hasAgreement && (
        <div style={S.card}>
          <div style={S.label}>MANUAL TRADE — {symbol}</div>
          <div style={{ fontSize: 11, color: "#6e7681", fontFamily: MONO, marginBottom: 14, lineHeight: 1.5 }}>
            Choose a strategy, $ amount or share count. Fractional shares supported.<br />
            Virtual money only — no real funds.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{ padding: "9px 24px", borderRadius: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700,
                cursor: allocatedStrats.length === 0 ? "not-allowed" : "pointer",
                opacity: allocatedStrats.length === 0 ? 0.35 : 1,
                background: "#0fffa315", border: "1px solid #0fffa350", color: "#0fffa3" }}
              disabled={allocatedStrats.length === 0}
              onClick={() => setConfirm("BUY")}>▲ BUY</button>
            <button
              style={{ padding: "9px 24px", borderRadius: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700,
                cursor: myPositions.length === 0 ? "not-allowed" : "pointer",
                opacity: myPositions.length === 0 ? 0.35 : 1,
                background: "#ff416215", border: "1px solid #ff416250", color: "#ff4162" }}
              disabled={myPositions.length === 0}
              onClick={() => setConfirm("SELL")}>▼ SELL</button>
          </div>
          {allocatedStrats.length === 0 && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: "#e3b341", marginTop: 8 }}>
              Allocate funds to a strategy in the Auto-Trader tab to enable manual trades.
            </div>
          )}
        </div>
      )}

      <div style={{ fontFamily: MONO, fontSize: 9, color: "#3a4258", textAlign: "center", marginTop: 8 }}>
        📊 Paper Portfolio · Virtual money only · No real funds involved
      </div>
    </div>
  );
}