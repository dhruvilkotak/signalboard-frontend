// src/components/PortfolioTab.jsx
// Inner tab for Live Prices page — shows open position for the selected symbol
// and BUY / SELL buttons for manual trades.
// Mounted once per symbol (key={selected} from parent).

import { useState, useEffect } from "react";
import { getPortfolioPositions, getPortfolioWallet, portfolioManualTrade } from "../lib/api";

const MONO = "'IBM Plex Mono', monospace";
const S = {
  root:    { height: "100%", overflowY: "auto", padding: 20, background: "#0d1117", color: "#e6edf3" },
  card:    { background: "#161b22", border: "1px solid #21262d", borderRadius: 10, padding: 16, marginBottom: 12 },
  label:   { fontFamily: MONO, fontSize: 9, color: "#6e7681", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  val:     { fontFamily: MONO, fontSize: 14, fontWeight: 700, color: "#e6edf3" },
  row:     { display: "flex", gap: 20, flexWrap: "wrap", marginTop: 10 },
  col:     { display: "flex", flexDirection: "column", gap: 2 },
  divider: { height: 1, background: "#21262d", margin: "12px 0" },
};

const pnlColor = (n) => (n ?? 0) >= 0 ? "#3fb950" : "#f85149";
const sign     = (n) => (n ?? 0) >= 0 ? "+" : "";
const fmt      = (n, d = 2) => (n ?? 0).toFixed(d);

// ── Stop-loss proximity bar ───────────────────────────────────────────────────
function SlBar({ buyPrice, stopPrice, currentPrice }) {
  if (!buyPrice || !stopPrice || !currentPrice) return null;
  const range = buyPrice - stopPrice;
  const pct   = range > 0
    ? Math.max(0, Math.min(100, ((currentPrice - stopPrice) / range) * 100))
    : 100;
  const color = pct < 20 ? "#f85149" : pct < 50 ? "#e3b341" : "#3fb950";
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 8, color: "#6e7681", marginBottom: 3 }}>
        <span>Stop ${fmt(stopPrice)}</span>
        <span>Buy ${fmt(buyPrice)}</span>
      </div>
      <div style={{ height: 4, background: "#21262d", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.4s, background 0.4s" }} />
      </div>
    </div>
  );
}

// ── Trade button ──────────────────────────────────────────────────────────────
function TradeBtn({ action, onClick, disabled, loading }) {
  const isBuy   = action === "BUY";
  const base    = { fontFamily: MONO, fontSize: 12, fontWeight: 700, padding: "8px 20px", borderRadius: 7, cursor: "pointer", border: "1px solid", transition: "all 0.15s" };
  const colors  = isBuy
    ? { background: "#0fffa315", borderColor: "#0fffa350", color: "#0fffa3" }
    : { background: "#ff416215", borderColor: "#ff416250", color: "#ff4162" };
  const disabledStyle = disabled ? { opacity: 0.35, cursor: "not-allowed" } : {};

  return (
    <button style={{ ...base, ...colors, ...disabledStyle }} onClick={onClick} disabled={disabled}>
      {loading ? "…" : isBuy ? "▲ BUY" : "▼ SELL"}
    </button>
  );
}

// ── Confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ action, symbol, price, onConfirm, onCancel, loading }) {
  const isBuy = action === "BUY";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(1,4,9,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 14, padding: 28, maxWidth: 360, width: "90%" }}>
        <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          Confirm {isBuy ? "BUY" : "SELL"}
        </div>
        <div style={{ fontSize: 13, color: "#8b949e", marginBottom: 16, lineHeight: 1.6 }}>
          {isBuy
            ? <>Open a virtual <strong style={{ color: "#0fffa3" }}>BUY</strong> position on <strong>{symbol}</strong> at ~${price?.toFixed(2)}.<br />Position size is set by your strategy.</>
            : <>Close your <strong style={{ color: "#ff4162" }}>SELL</strong> position on <strong>{symbol}</strong> at ~${price?.toFixed(2)}.<br />Proceeds return to your virtual cash balance.</>
          }
        </div>
        <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 8, padding: "8px 14px", marginBottom: 18, fontFamily: MONO, fontSize: 11, color: "#6e7681" }}>
          📊 Virtual money only — no real funds involved (simulated)
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ flex: 1, padding: "8px 0", borderRadius: 7, background: "#21262d", border: "1px solid #30363d", color: "#8b949e", fontFamily: MONO, fontSize: 12, cursor: "pointer" }} onClick={onCancel}>
            Cancel
          </button>
          <button
            style={{ flex: 1, padding: "8px 0", borderRadius: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", border: "1px solid", opacity: loading ? 0.6 : 1,
              background: isBuy ? "#0fffa315" : "#ff416215",
              borderColor: isBuy ? "#0fffa350" : "#ff416250",
              color: isBuy ? "#0fffa3" : "#ff4162",
            }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Executing…" : `Confirm ${action}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PortfolioTab({ symbol, currentPrice }) {
  const [position,  setPosition]  = useState(null);   // open position for this symbol, or null
  const [wallet,    setWallet]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [confirm,   setConfirm]   = useState(null);   // "BUY" | "SELL" | null
  const [trading,   setTrading]   = useState(false);
  const [result,    setResult]    = useState(null);    // last trade result message
  const [error,     setError]     = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [posData, walletData] = await Promise.all([
        getPortfolioPositions(),
        getPortfolioWallet(),
      ]);
      const pos = (posData.positions ?? []).find(p => p.symbol === symbol.toUpperCase()) ?? null;
      setPosition(pos);
      setWallet(walletData);
    } catch (e) {
      setError("Could not load portfolio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [symbol]);

  const handleTrade = async () => {
    if (!confirm) return;
    setTrading(true);
    try {
      const res = await portfolioManualTrade(symbol, confirm);
      if (res.status === "executed") {
        setResult({ type: "ok", action: confirm, msg: `${confirm} executed — ${confirm === "BUY" ? "position opened" : "position closed"}` });
        await load();
      } else {
        setResult({ type: "err", action: confirm, msg: res.reason ?? "Trade skipped" });
      }
    } catch (e) {
      setResult({ type: "err", action: confirm, msg: e.message ?? "Trade failed" });
    } finally {
      setTrading(false);
      setConfirm(null);
      setTimeout(() => setResult(null), 4000);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const hasPosition    = !!position;
  const isActive       = wallet?.is_active ?? false;
  const hasAgreement   = wallet?.agreement_accepted ?? false;
  const canBuy         = !hasPosition && hasAgreement;
  const canSell        = hasPosition && hasAgreement;
  const livePrice      = currentPrice ?? position?.current_price ?? 0;

  // Live P&L using current price from parent (more up-to-date than stored value)
  const livePnl        = hasPosition && livePrice
    ? (livePrice - position.buy_price) * position.shares
    : position?.unrealized_pnl ?? 0;
  const livePnlPct     = hasPosition && position.buy_price
    ? ((livePrice - position.buy_price) / position.buy_price) * 100
    : position?.unrealized_pnl_pct ?? 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={S.root}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: "#6e7681", textAlign: "center", marginTop: 40 }}>
          Loading portfolio…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.root}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: "#f85149", textAlign: "center", marginTop: 40 }}>
          {error}
          <br /><button style={{ marginTop: 12, fontFamily: MONO, fontSize: 11, color: "#58a6ff", background: "none", border: "none", cursor: "pointer" }} onClick={load}>↻ Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.root}>

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          action={confirm}
          symbol={symbol}
          price={livePrice}
          onConfirm={handleTrade}
          onCancel={() => setConfirm(null)}
          loading={trading}
        />
      )}

      {/* Trade result toast */}
      {result && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: result.type === "ok" ? "#0fffa320" : "#f8514920",
          border: `1px solid ${result.type === "ok" ? "#0fffa360" : "#f8514960"}`,
          color: result.type === "ok" ? "#0fffa3" : "#f85149",
          padding: "8px 20px", borderRadius: 8, fontFamily: MONO, fontSize: 12,
          zIndex: 9999, whiteSpace: "nowrap",
        }}>
          {result.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{symbol}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "#6e7681", marginTop: 2 }}>
            {hasPosition ? "OPEN POSITION" : "NO POSITION"}
            {" · "}
            <span style={{ color: isActive ? "#3fb950" : "#6e7681" }}>
              {isActive ? "Auto-trader active" : "Auto-trader paused"}
            </span>
          </div>
        </div>
        <button style={{ fontFamily: MONO, fontSize: 10, color: "#6e7681", background: "#161b22", border: "1px solid #21262d", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }} onClick={load}>
          ↻
        </button>
      </div>

      {/* No agreement warning */}
      {!hasAgreement && (
        <div style={{ ...S.card, borderColor: "#e3b34140", background: "#e3b34108" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#e3b341" }}>
            ⚠ Accept the paper trading agreement in the Auto-Trader tab to enable manual trades.
          </div>
        </div>
      )}

      {/* Open position card */}
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
            {[
              ["Shares",     fmt(position.shares, 4)],
              ["Bought @",   `$${fmt(position.buy_price)}`],
              ["Now",        livePrice ? `$${fmt(livePrice)}` : "—"],
              ["Value",      `$${fmt(position.shares * livePrice)}`],
              ["Strategy",   position.strategy_at_buy ?? "—"],
              ["Signal",     position.signal_confidence ?? "—"],
            ].map(([l, v]) => (
              <div key={l} style={S.col}>
                <span style={S.label}>{l}</span>
                <span style={S.val}>{v}</span>
              </div>
            ))}
          </div>

          <SlBar
            buyPrice={position.buy_price}
            stopPrice={position.stop_loss_price}
            currentPrice={livePrice}
          />
        </div>
      ) : (
        <div style={{ ...S.card, textAlign: "center", padding: "24px 16px" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#6e7681", lineHeight: 1.6 }}>
            No open position for <strong style={{ color: "#e6edf3" }}>{symbol}</strong>.<br />
            {isActive
              ? "Auto-trader will open a position when a qualifying signal fires."
              : "Start the auto-trader or use manual BUY below."}
          </div>
        </div>
      )}

      {/* Wallet snapshot */}
      {wallet && (
        <div style={S.card}>
          <div style={S.label}>WALLET</div>
          <div style={S.row}>
            {[
              ["Cash",     `$${fmt(wallet.balance)}`],
              ["Invested", `$${fmt(wallet.invested)}`],
              ["Total",    `$${fmt(wallet.total_value)}`],
              ["Strategy", wallet.strategy ?? "—"],
            ].map(([l, v]) => (
              <div key={l} style={S.col}>
                <span style={S.label}>{l}</span>
                <span style={{ ...S.val, fontSize: 12 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BUY / SELL buttons */}
      {hasAgreement && (
        <div style={{ ...S.card }}>
          <div style={S.label} >MANUAL TRADE — {symbol}</div>
          <div style={{ fontSize: 11, color: "#6e7681", fontFamily: MONO, marginBottom: 14, lineHeight: 1.5 }}>
            Manual trades bypass the auto-trader and strategy universe.<br />
            All figures are virtual (simulated) — no real money involved.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <TradeBtn action="BUY"  onClick={() => setConfirm("BUY")}  disabled={!canBuy}  loading={trading && confirm === "BUY"} />
            <TradeBtn action="SELL" onClick={() => setConfirm("SELL")} disabled={!canSell} loading={trading && confirm === "SELL"} />
          </div>
          {!canBuy && !canSell && hasAgreement && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: "#6e7681", marginTop: 10 }}>
              {hasPosition ? "Close position via SELL." : "No position to sell. Use BUY to open one."}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ fontFamily: MONO, fontSize: 9, color: "#3a4258", textAlign: "center", marginTop: 8, lineHeight: 1.6 }}>
        📊 Paper Portfolio · Virtual money only · No real funds involved
      </div>
    </div>
  );
}