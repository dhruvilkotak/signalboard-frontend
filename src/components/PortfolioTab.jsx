// src/components/PortfolioTab.jsx
// Inner tab for Live Prices — position card + manual trade with amount/shares input

import { useState, useEffect } from "react";
import { getPortfolioPositions, getPortfolioWallet, portfolioManualTrade } from "../lib/api";

const MONO = "'IBM Plex Mono', monospace";
const S = {
  root:  { height: "100%", overflowY: "auto", padding: 20, background: "#0d1117", color: "#e6edf3" },
  card:  { background: "#161b22", border: "1px solid #21262d", borderRadius: 10, padding: 16, marginBottom: 12 },
  label: { fontFamily: MONO, fontSize: 9, color: "#6e7681", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  val:   { fontFamily: MONO, fontSize: 14, fontWeight: 700, color: "#e6edf3" },
  row:   { display: "flex", gap: 20, flexWrap: "wrap", marginTop: 10 },
  col:   { display: "flex", flexDirection: "column", gap: 2 },
  input: { background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, padding: "8px 10px",
           color: "#e6edf3", fontFamily: MONO, fontSize: 12, outline: "none", width: "100%" },
};

const pnlColor = (n) => (n ?? 0) >= 0 ? "#3fb950" : "#f85149";
const sign     = (n) => (n ?? 0) >= 0 ? "+" : "";
const fmt      = (n, d = 2) => (n ?? 0).toFixed(d);

// ── Stop-loss bar ─────────────────────────────────────────────────────────────
function SlBar({ buyPrice, stopPrice, currentPrice }) {
  if (!buyPrice || !stopPrice || !currentPrice) return null;
  const range = buyPrice - stopPrice;
  const pct   = range > 0 ? Math.max(0, Math.min(100, ((currentPrice - stopPrice) / range) * 100)) : 100;
  const color = pct < 20 ? "#f85149" : pct < 50 ? "#e3b341" : "#3fb950";
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 8, color: "#6e7681", marginBottom: 3 }}>
        <span>Stop ${fmt(stopPrice)}</span><span>Buy ${fmt(buyPrice)}</span>
      </div>
      <div style={{ height: 4, background: "#21262d", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ── Confirm modal with amount input ───────────────────────────────────────────
function ConfirmModal({ action, symbol, price, wallet, onConfirm, onCancel, loading }) {
  const isBuy      = action === "BUY";
  const [mode,     setMode]     = useState("usd");   // "usd" | "shares" | "strategy"
  const [inputVal, setInputVal] = useState("");

  // Derived
  const numVal      = parseFloat(inputVal) || 0;
  const sharesCalc  = mode === "usd"    ? (price > 0 ? numVal / price : 0)
                    : mode === "shares" ? numVal
                    : null;
  const costCalc    = mode === "usd"    ? numVal
                    : mode === "shares" ? numVal * price
                    : null;
  const available   = wallet?.balance ?? 0;
  const overBudget  = isBuy && costCalc != null && costCalc > available;
  const validInput  = !isBuy || mode === "strategy" || (numVal > 0 && !overBudget);

  const quickAmounts = [50, 100, 250, 500];

  const handleConfirm = () => {
    if (mode === "usd")      onConfirm({ amountUsd: numVal });
    else if (mode === "shares") onConfirm({ shares: numVal });
    else onConfirm({});  // strategy sizing
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(1,4,9,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 14, padding: 24, maxWidth: 400, width: "92%" }}>

        {/* Header */}
        <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
          {isBuy ? "▲ BUY" : "▼ SELL"} {symbol}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: "#6e7681", marginBottom: 16 }}>
          Current price: <strong style={{ color: "#e6edf3" }}>${fmt(price)}</strong>
          {isBuy && <span style={{ marginLeft: 12 }}>Cash available: <strong style={{ color: "#3fb950" }}>${fmt(available)}</strong></span>}
        </div>

        {isBuy && (
          <>
            {/* Mode selector */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "#0d1117", borderRadius: 7, padding: 3 }}>
              {[["usd", "$ Amount"], ["shares", "# Shares"], ["strategy", "Auto Size"]].map(([m, label]) => (
                <button key={m} onClick={() => { setMode(m); setInputVal(""); }}
                  style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: "none", fontFamily: MONO, fontSize: 11, cursor: "pointer",
                    background: mode === m ? "#21262d" : "transparent",
                    color: mode === m ? "#e6edf3" : "#6e7681", fontWeight: mode === m ? 700 : 400 }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Input */}
            {mode !== "strategy" && (
              <>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontFamily: MONO, fontSize: 12, color: "#6e7681" }}>
                    {mode === "usd" ? "$" : "×"}
                  </span>
                  <input
                    style={{ ...S.input, paddingLeft: 24 }}
                    type="number"
                    min={mode === "usd" ? 1 : 0.000001}
                    step={mode === "usd" ? 1 : 0.001}
                    placeholder={mode === "usd" ? "150.00" : "0.25"}
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Quick picks — USD mode only */}
                {mode === "usd" && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    {quickAmounts.map(a => (
                      <button key={a} onClick={() => setInputVal(String(a))}
                        style={{ flex: 1, padding: "4px 0", borderRadius: 5, border: "1px solid #30363d",
                          background: inputVal === String(a) ? "#21262d" : "transparent",
                          color: "#8b949e", fontFamily: MONO, fontSize: 10, cursor: "pointer" }}>
                        ${a}
                      </button>
                    ))}
                  </div>
                )}

                {/* Live preview */}
                {numVal > 0 && (
                  <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontFamily: MONO, fontSize: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#6e7681" }}>Shares</span>
                      <span style={{ color: "#e6edf3" }}>{sharesCalc?.toFixed(6)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ color: "#6e7681" }}>Total cost</span>
                      <span style={{ color: overBudget ? "#f85149" : "#e6edf3" }}>${fmt(costCalc)}</span>
                    </div>
                    {overBudget && (
                      <div style={{ color: "#f85149", fontSize: 10, marginTop: 4 }}>
                        Exceeds available cash by ${fmt(costCalc - available)}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {mode === "strategy" && (
              <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontFamily: MONO, fontSize: 11, color: "#6e7681", lineHeight: 1.6 }}>
                Position size will be calculated by your strategy settings (position % × available cash).
              </div>
            )}
          </>
        )}

        {/* SELL — just confirm */}
        {!isBuy && (
          <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontFamily: MONO, fontSize: 11, color: "#6e7681", lineHeight: 1.6 }}>
            Closes your full position. Proceeds return to virtual cash balance.
          </div>
        )}

        {/* Paper disclaimer */}
        <div style={{ fontSize: 10, color: "#3a4258", fontFamily: MONO, marginBottom: 14 }}>
          📊 Virtual money only — no real funds involved (simulated)
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ flex: 1, padding: "9px 0", borderRadius: 7, background: "#21262d", border: "1px solid #30363d", color: "#8b949e", fontFamily: MONO, fontSize: 12, cursor: "pointer" }}
            onClick={onCancel}>Cancel</button>
          <button
            style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700,
              cursor: (!validInput || loading) ? "not-allowed" : "pointer",
              opacity: (!validInput || loading) ? 0.4 : 1,
              border: "1px solid", background: isBuy ? "#0fffa315" : "#ff416215",
              borderColor: isBuy ? "#0fffa350" : "#ff416250",
              color: isBuy ? "#0fffa3" : "#ff4162" }}
            disabled={!validInput || loading}
            onClick={handleConfirm}>
            {loading ? "Executing…" : `Confirm ${action}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PortfolioTab({ symbol, currentPrice }) {
  const [position, setPosition] = useState(null);
  const [wallet,   setWallet]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [confirm,  setConfirm]  = useState(null);   // "BUY" | "SELL" | null
  const [trading,  setTrading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [posData, walletData] = await Promise.all([
        getPortfolioPositions(), getPortfolioWallet(),
      ]);
      setPosition((posData.positions ?? []).find(p => p.symbol === symbol.toUpperCase()) ?? null);
      setWallet(walletData);
    } catch { setError("Could not load portfolio"); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, [symbol]);

  const handleTrade = async (amountOpts = {}) => {
    if (!confirm) return;
    setTrading(true);
    try {
      const res = await portfolioManualTrade(symbol, confirm, amountOpts);
      if (res.status === "executed") {
        setResult({ type: "ok",  msg: `${confirm} executed — ${confirm === "BUY" ? "position opened" : "position closed"}` });
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

  const hasPosition  = !!position;
  const hasAgreement = wallet?.agreement_accepted ?? false;
  const isActive     = wallet?.is_active ?? false;
  const livePrice    = currentPrice ?? position?.current_price ?? 0;
  const livePnl      = hasPosition && livePrice ? (livePrice - position.buy_price) * position.shares : position?.unrealized_pnl ?? 0;
  const livePnlPct   = hasPosition && position?.buy_price ? ((livePrice - position.buy_price) / position.buy_price) * 100 : position?.unrealized_pnl_pct ?? 0;

  if (loading) return (
    <div style={S.root}>
      <div style={{ fontFamily: MONO, fontSize: 11, color: "#6e7681", textAlign: "center", marginTop: 40 }}>Loading portfolio…</div>
    </div>
  );

  if (error) return (
    <div style={S.root}>
      <div style={{ fontFamily: MONO, fontSize: 11, color: "#f85149", textAlign: "center", marginTop: 40 }}>
        {error}<br />
        <button style={{ marginTop: 12, fontFamily: MONO, fontSize: 11, color: "#58a6ff", background: "none", border: "none", cursor: "pointer" }} onClick={load}>↻ Retry</button>
      </div>
    </div>
  );

  return (
    <div style={S.root}>

      {confirm && (
        <ConfirmModal
          action={confirm} symbol={symbol} price={livePrice} wallet={wallet}
          onConfirm={handleTrade} onCancel={() => setConfirm(null)} loading={trading}
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
        <div>
          <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{symbol}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "#6e7681", marginTop: 2 }}>
            {hasPosition ? "OPEN POSITION" : "NO POSITION"} ·{" "}
            <span style={{ color: isActive ? "#3fb950" : "#6e7681" }}>{isActive ? "Auto-trader active" : "Auto-trader paused"}</span>
          </div>
        </div>
        <button style={{ fontFamily: MONO, fontSize: 10, color: "#6e7681", background: "#161b22", border: "1px solid #21262d", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }} onClick={load}>↻</button>
      </div>

      {!hasAgreement && (
        <div style={{ ...S.card, borderColor: "#e3b34140", background: "#e3b34108" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#e3b341" }}>
            ⚠ Accept the paper trading agreement in the Auto-Trader tab to enable manual trades.
          </div>
        </div>
      )}

      {/* Position card */}
      {hasPosition ? (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={S.label}>OPEN POSITION</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: pnlColor(livePnl) }}>
                {sign(livePnl)}${Math.abs(livePnl).toFixed(2)}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: pnlColor(livePnlPct) }}>
                {sign(livePnlPct)}{fmt(livePnlPct)}% unrealized
              </div>
            </div>
          </div>
          <div style={S.row}>
            {[["Shares", fmt(position.shares, 4)], ["Bought @", `$${fmt(position.buy_price)}`],
              ["Now", `$${fmt(livePrice)}`], ["Value", `$${fmt(position.shares * livePrice)}`],
              ["Strategy", position.strategy_at_buy ?? "—"], ["Signal", position.signal_confidence ?? "—"],
            ].map(([l, v]) => (
              <div key={l} style={S.col}>
                <span style={S.label}>{l}</span>
                <span style={S.val}>{v}</span>
              </div>
            ))}
          </div>
          <SlBar buyPrice={position.buy_price} stopPrice={position.stop_loss_price} currentPrice={livePrice} />
        </div>
      ) : (
        <div style={{ ...S.card, textAlign: "center", padding: "20px 16px" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#6e7681", lineHeight: 1.6 }}>
            No open position for <strong style={{ color: "#e6edf3" }}>{symbol}</strong>.<br />
            {isActive ? "Auto-trader will open a position on next qualifying signal." : "Use manual BUY below or start the auto-trader."}
          </div>
        </div>
      )}

      {/* Wallet snapshot */}
      {wallet && (
        <div style={S.card}>
          <div style={S.label}>VIRTUAL WALLET</div>
          <div style={S.row}>
            {[["Cash", `$${fmt(wallet.balance)}`], ["Invested", `$${fmt(wallet.invested)}`],
              ["Total", `$${fmt(wallet.total_value)}`], ["Strategy", wallet.strategy ?? "—"]
            ].map(([l, v]) => (
              <div key={l} style={S.col}>
                <span style={S.label}>{l}</span>
                <span style={{ ...S.val, fontSize: 12 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade buttons */}
      {hasAgreement && (
        <div style={S.card}>
          <div style={S.label}>MANUAL TRADE — {symbol}</div>
          <div style={{ fontSize: 11, color: "#6e7681", fontFamily: MONO, marginBottom: 14, lineHeight: 1.5 }}>
            Choose $ amount, share count, or let your strategy decide.<br />
            Fractional shares supported. Virtual money only.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{ padding: "9px 24px", borderRadius: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700,
                cursor: hasPosition ? "not-allowed" : "pointer",
                opacity: hasPosition ? 0.35 : 1,
                background: "#0fffa315", borderColor: "#0fffa350", border: "1px solid #0fffa350", color: "#0fffa3" }}
              disabled={hasPosition}
              onClick={() => setConfirm("BUY")}>
              ▲ BUY
            </button>
            <button
              style={{ padding: "9px 24px", borderRadius: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700,
                cursor: !hasPosition ? "not-allowed" : "pointer",
                opacity: !hasPosition ? 0.35 : 1,
                background: "#ff416215", border: "1px solid #ff416250", color: "#ff4162" }}
              disabled={!hasPosition}
              onClick={() => setConfirm("SELL")}>
              ▼ SELL
            </button>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "#6e7681", marginTop: 8 }}>
            {hasPosition ? "Position open — SELL to close." : "No position — BUY to open."}
          </div>
        </div>
      )}

      <div style={{ fontFamily: MONO, fontSize: 9, color: "#3a4258", textAlign: "center", marginTop: 8 }}>
        📊 Paper Portfolio · Virtual money only · No real funds involved
      </div>
    </div>
  );
}