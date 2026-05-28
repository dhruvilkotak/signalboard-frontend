// src/components/PortfolioTab.jsx — v4
// Manual trades from available cash. No strategy needed. Simple and clean.

import { useState, useEffect } from "react";
import { getPortfolioOverview, manualBuy, manualSell } from "../lib/api";

const MONO = "'IBM Plex Mono', monospace";
const S = {
  root:  { height: "100%", overflowY: "auto", padding: 20, background: "#0d1117", color: "#e6edf3" },
  card:  { background: "#161b22", border: "1px solid #21262d", borderRadius: 10, padding: 16, marginBottom: 12 },
  label: { fontFamily: MONO, fontSize: 9, color: "#6e7681", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  val:   { fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "#e6edf3" },
  row:   { display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 },
  col:   { display: "flex", flexDirection: "column", gap: 2 },
  input: { background: "#0d1117", border: "1px solid #30363d", borderRadius: 6,
           padding: "7px 10px", color: "#e6edf3", fontFamily: MONO, fontSize: 12, outline: "none", width: "100%" },
};
const pnlColor = (n) => (n ?? 0) >= 0 ? "#3fb950" : "#f85149";
const sign     = (n) => (n ?? 0) >= 0 ? "+" : "";
const fmt      = (n, d = 2) => (+(n ?? 0)).toFixed(d);

// ── Stop-loss bar (display only for manual — no auto stop-loss) ───────────────
function SlBar({ avgBuy, currentPrice }) {
  if (!avgBuy || !currentPrice) return null;
  const pct   = Math.min(100, Math.max(0, (currentPrice / avgBuy) * 100));
  const color = pct >= 100 ? "#3fb950" : pct >= 90 ? "#e3b341" : "#f85149";
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 8, color: "#6e7681", marginBottom: 3 }}>
        <span>Avg Buy ${fmt(avgBuy)}</span>
        <span>Now ${fmt(currentPrice)}</span>
      </div>
      <div style={{ height: 4, background: "#21262d", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ── Buy modal ─────────────────────────────────────────────────────────────────
function BuyModal({ symbol, price, availableCash, onConfirm, onCancel, loading }) {
  const [mode,     setMode]     = useState("usd");
  const [inputVal, setInputVal] = useState("");
  const numVal    = parseFloat(inputVal) || 0;
  const sharesCalc = mode === "usd" && price > 0 ? numVal / price : mode === "shares" ? numVal : null;
  const costCalc   = mode === "usd" ? numVal : mode === "shares" ? numVal * price : null;
  const overBudget = costCalc != null && costCalc > availableCash;
  const valid      = numVal > 0 && !overBudget;

  const handleConfirm = () => {
    if (!valid) return;
    if (mode === "usd")    onConfirm({ amountUsd: numVal });
    else                   onConfirm({ shares: numVal });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(1,4,9,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 14, padding: 24, maxWidth: 400, width: "92%" }}>
        <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
          ▲ BUY {symbol}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: "#6e7681", marginBottom: 16 }}>
          Price: <strong style={{ color: "#e6edf3" }}>${fmt(price)}</strong>
          <span style={{ marginLeft: 12 }}>Available: <strong style={{ color: "#3fb950" }}>${fmt(availableCash)}</strong></span>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12, background: "#0d1117", borderRadius: 7, padding: 3 }}>
          {[["usd", "$ Amount"], ["shares", "# Shares"]].map(([m, l]) => (
            <button key={m} onClick={() => { setMode(m); setInputVal(""); }}
              style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: "none", fontFamily: MONO,
                fontSize: 11, cursor: "pointer",
                background: mode === m ? "#21262d" : "transparent",
                color: mode === m ? "#e6edf3" : "#6e7681",
                fontWeight: mode === m ? 700 : 400 }}>
              {l}
            </button>
          ))}
        </div>

        {/* Quick picks */}
        {mode === "usd" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[50, 100, 250, 500].filter(v => v <= availableCash).map(v => (
              <button key={v} onClick={() => setInputVal(String(v))}
                style={{ flex: 1, padding: "4px 0", borderRadius: 5, border: "1px solid #30363d",
                  background: inputVal === String(v) ? "#21262d" : "transparent",
                  color: "#8b949e", fontFamily: MONO, fontSize: 10, cursor: "pointer" }}>
                ${v}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ position: "relative", marginBottom: 8 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            fontFamily: MONO, fontSize: 12, color: "#6e7681" }}>
            {mode === "usd" ? "$" : "×"}
          </span>
          <input style={{ ...S.input, paddingLeft: 24 }}
            type="number" min={0.000001}
            placeholder={mode === "usd" ? "150.00" : "0.25"}
            value={inputVal} onChange={e => setInputVal(e.target.value)} autoFocus />
        </div>

        {/* Preview */}
        {numVal > 0 && (
          <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 8,
            padding: "8px 12px", marginBottom: 12, fontFamily: MONO, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6e7681" }}>Shares</span>
              <span>{sharesCalc?.toFixed(6)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ color: "#6e7681" }}>Total cost</span>
              <span style={{ color: overBudget ? "#f85149" : "#e6edf3" }}>${fmt(costCalc)}</span>
            </div>
            {overBudget && (
              <div style={{ color: "#f85149", fontSize: 10, marginTop: 4 }}>
                Exceeds available cash by ${fmt(costCalc - availableCash)}
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: 10, color: "#3a4258", fontFamily: MONO, marginBottom: 14 }}>
          📊 Virtual money only — uses your available cash · Auto-trader ignores this position
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ flex: 1, padding: "9px 0", borderRadius: 7, background: "#21262d",
            border: "1px solid #30363d", color: "#8b949e", fontFamily: MONO, fontSize: 12, cursor: "pointer" }}
            onClick={onCancel}>Cancel</button>
          <button style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontFamily: MONO,
            fontSize: 12, fontWeight: 700, border: "1px solid #0fffa350",
            background: "#0fffa315", color: "#0fffa3",
            opacity: (!valid || loading) ? 0.4 : 1,
            cursor: (!valid || loading) ? "not-allowed" : "pointer" }}
            disabled={!valid || loading} onClick={handleConfirm}>
            {loading ? "Executing…" : "Confirm BUY"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sell modal ────────────────────────────────────────────────────────────────
function SellModal({ symbol, price, position, onConfirm, onCancel, loading }) {
  const [mode,     setMode]     = useState("all");
  const [inputVal, setInputVal] = useState("");
  const heldShares = position?.shares ?? 0;
  const numVal     = parseFloat(inputVal) || 0;
  const sharesToSell = mode === "all" ? heldShares : numVal;
  const proceeds     = (sharesToSell * price);
  const pnl          = sharesToSell * (price - (position?.avg_buy_price ?? price));
  const valid        = mode === "all" || (numVal > 0 && numVal <= heldShares);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(1,4,9,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 14, padding: 24, maxWidth: 400, width: "92%" }}>
        <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, marginBottom: 4, color: "#ff4162" }}>
          ▼ SELL {symbol}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: "#6e7681", marginBottom: 16 }}>
          Price: <strong style={{ color: "#e6edf3" }}>${fmt(price)}</strong>
          <span style={{ marginLeft: 12 }}>Holding: <strong style={{ color: "#e6edf3" }}>{fmt(heldShares, 4)} shares</strong></span>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 12, background: "#0d1117", borderRadius: 7, padding: 3 }}>
          {[["all", "Sell All"], ["partial", "Partial"]].map(([m, l]) => (
            <button key={m} onClick={() => { setMode(m); setInputVal(""); }}
              style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: "none", fontFamily: MONO,
                fontSize: 11, cursor: "pointer",
                background: mode === m ? "#21262d" : "transparent",
                color: mode === m ? "#e6edf3" : "#6e7681", fontWeight: mode === m ? 700 : 400 }}>
              {l}
            </button>
          ))}
        </div>

        {mode === "partial" && (
          <div style={{ marginBottom: 10 }}>
            <input style={S.input} type="number" min={0.000001} max={heldShares}
              placeholder={`Max ${fmt(heldShares, 4)} shares`}
              value={inputVal} onChange={e => setInputVal(e.target.value)} autoFocus />
            {numVal > heldShares && (
              <div style={{ color: "#f85149", fontSize: 11, marginTop: 4 }}>
                Cannot sell more than {fmt(heldShares, 4)} shares
              </div>
            )}
          </div>
        )}

        <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 8,
          padding: "8px 12px", marginBottom: 14, fontFamily: MONO, fontSize: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#6e7681" }}>Shares to sell</span>
            <span>{fmt(sharesToSell, 4)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ color: "#6e7681" }}>Proceeds</span>
            <span style={{ color: "#e6edf3" }}>${fmt(proceeds)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ color: "#6e7681" }}>Est. P&L</span>
            <span style={{ color: pnlColor(pnl) }}>{sign(pnl)}${fmt(Math.abs(pnl))}</span>
          </div>
        </div>

        <div style={{ fontSize: 10, color: "#3a4258", fontFamily: MONO, marginBottom: 14 }}>
          📊 Proceeds return to your available cash
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ flex: 1, padding: "9px 0", borderRadius: 7, background: "#21262d",
            border: "1px solid #30363d", color: "#8b949e", fontFamily: MONO, fontSize: 12, cursor: "pointer" }}
            onClick={onCancel}>Cancel</button>
          <button style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontFamily: MONO,
            fontSize: 12, fontWeight: 700, border: "1px solid #ff416250",
            background: "#ff416215", color: "#ff4162",
            opacity: (!valid || loading) ? 0.4 : 1,
            cursor: (!valid || loading) ? "not-allowed" : "pointer" }}
            disabled={!valid || loading}
            onClick={() => valid && onConfirm(mode === "partial" ? numVal : null)}>
            {loading ? "Executing…" : mode === "all" ? "Confirm Sell All" : "Confirm Partial Sell"}
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
  const [modal,    setModal]    = useState(null);   // "buy" | "sell"
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

  const summary       = overview?.summary ?? {};
  const hasAgreement  = summary.agreement_accepted ?? false;
  const availableCash = summary.available_cash ?? 0;

  // Find manual position for this symbol
  const manualPositions = overview?.manual?.positions ?? [];
  const myPosition      = manualPositions.find(p => p.symbol === symbol.toUpperCase()) ?? null;

  const livePrice = currentPrice ?? myPosition?.current_price ?? 0;
  const livePnl   = myPosition && livePrice
    ? (livePrice - myPosition.avg_buy_price) * myPosition.shares
    : myPosition?.unrealized_pnl ?? 0;
  const livePnlPct = myPosition?.avg_buy_price
    ? ((livePrice - myPosition.avg_buy_price) / myPosition.avg_buy_price) * 100
    : 0;

  const handleBuy = async (opts) => {
    setTrading(true);
    try {
      const res = await manualBuy(symbol, opts);
      if (res.status === "executed") {
        setResult({ type: "ok",  msg: `BUY executed — position opened` });
        await load();
      } else {
        setResult({ type: "err", msg: res.reason ?? "Buy failed" });
      }
    } catch (e) {
      setResult({ type: "err", msg: e.message ?? "Buy failed" });
    } finally {
      setTrading(false); setModal(null);
      setTimeout(() => setResult(null), 4000);
    }
  };

  const handleSell = async (shares) => {
    setTrading(true);
    try {
      const res = await manualSell(symbol, shares);
      if (res.status === "executed") {
        setResult({ type: "ok",  msg: `SELL executed — ${shares ? "partial sell" : "position closed"}` });
        await load();
      } else {
        setResult({ type: "err", msg: res.reason ?? "Sell failed" });
      }
    } catch (e) {
      setResult({ type: "err", msg: e.message ?? "Sell failed" });
    } finally {
      setTrading(false); setModal(null);
      setTimeout(() => setResult(null), 4000);
    }
  };

  if (loading) return (
    <div style={S.root}>
      <div style={{ fontFamily: MONO, fontSize: 11, color: "#6e7681", textAlign: "center", marginTop: 40 }}>
        Loading…
      </div>
    </div>
  );
  if (error) return (
    <div style={S.root}>
      <div style={{ fontFamily: MONO, fontSize: 11, color: "#f85149", textAlign: "center", marginTop: 40 }}>
        {error}
        <button style={{ color: "#58a6ff", background: "none", border: "none", cursor: "pointer", fontFamily: MONO, marginLeft: 8 }}
          onClick={load}>↻</button>
      </div>
    </div>
  );

  return (
    <div style={S.root}>

      {modal === "buy" && (
        <BuyModal symbol={symbol} price={livePrice} availableCash={availableCash}
          onConfirm={handleBuy} onCancel={() => setModal(null)} loading={trading} />
      )}
      {modal === "sell" && (
        <SellModal symbol={symbol} price={livePrice} position={myPosition}
          onConfirm={handleSell} onCancel={() => setModal(null)} loading={trading} />
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
        <button style={{ fontFamily: MONO, fontSize: 10, color: "#6e7681", background: "#161b22",
          border: "1px solid #21262d", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}
          onClick={load}>↻</button>
      </div>

      {!hasAgreement && (
        <div style={{ ...S.card, borderColor: "#e3b34140", background: "#e3b34108" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#e3b341" }}>
            ⚠ Accept the paper trading agreement in the Auto-Trader tab to enable trades.
          </div>
        </div>
      )}

      {/* Available cash */}
      <div style={S.card}>
        <div style={S.label}>VIRTUAL WALLET</div>
        <div style={S.row}>
          {[["Portfolio Value", `$${fmt(summary.total_value)}`],
            ["Available Cash", `$${fmt(availableCash)}`]].map(([l, v]) => (
            <div key={l} style={S.col}>
              <span style={S.label}>{l}</span>
              <span style={S.val}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Manual position for this symbol */}
      {myPosition ? (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={S.label}>YOUR POSITION — {symbol}</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: pnlColor(livePnl) }}>
                {sign(livePnl)}${Math.abs(livePnl).toFixed(2)}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: pnlColor(livePnlPct) }}>
                {sign(livePnlPct)}{fmt(livePnlPct)}% unrealized
              </div>
            </div>
          </div>
          <div style={S.row}>
            {[["Shares", fmt(myPosition.shares, 4)],
              ["Avg Buy", `$${fmt(myPosition.avg_buy_price)}`],
              ["Now", `$${fmt(livePrice)}`],
              ["Value", `$${fmt(myPosition.shares * livePrice)}`]].map(([l, v]) => (
              <div key={l} style={S.col}>
                <span style={S.label}>{l}</span>
                <span style={{ ...S.val, fontSize: 12 }}>{v}</span>
              </div>
            ))}
          </div>
          <SlBar avgBuy={myPosition.avg_buy_price} currentPrice={livePrice} />
          <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 9, color: "#3a4258" }}>
            ℹ Auto-trader does not manage manual positions — no automatic stop-loss
          </div>
        </div>
      ) : (
        <div style={{ ...S.card, textAlign: "center", padding: "20px 16px" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#6e7681", lineHeight: 1.6 }}>
            No manual position for <strong style={{ color: "#e6edf3" }}>{symbol}</strong>.<br />
            Use BUY below to open one from your available cash.
          </div>
        </div>
      )}

      {/* Trade buttons */}
      {hasAgreement && (
        <div style={S.card}>
          <div style={S.label}>MANUAL TRADE — {symbol}</div>
          <div style={{ fontSize: 11, color: "#6e7681", fontFamily: MONO, marginBottom: 14, lineHeight: 1.5 }}>
            Trades directly from your available cash. Fractional shares supported.<br />
            The auto-trader will not touch these positions.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{ padding: "9px 24px", borderRadius: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700,
                cursor: availableCash < 1 ? "not-allowed" : "pointer",
                opacity: availableCash < 1 ? 0.35 : 1,
                background: "#0fffa315", border: "1px solid #0fffa350", color: "#0fffa3" }}
              disabled={availableCash < 1}
              onClick={() => setModal("buy")}>▲ BUY</button>
            <button
              style={{ padding: "9px 24px", borderRadius: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700,
                cursor: !myPosition ? "not-allowed" : "pointer",
                opacity: !myPosition ? 0.35 : 1,
                background: "#ff416215", border: "1px solid #ff416250", color: "#ff4162" }}
              disabled={!myPosition}
              onClick={() => setModal("sell")}>▼ SELL</button>
          </div>
          {availableCash < 1 && !myPosition && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: "#e3b341", marginTop: 8 }}>
              No available cash. Sell a position or reduce a strategy allocation.
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