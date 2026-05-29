// src/pages/Trader.jsx — v4
// Two separate sections:
//   1. MY MANUAL TRADES — user's personal portfolio from available cash
//   2. MY STRATEGIES    — auto-trader managed funds

import { useState, useEffect, useCallback } from "react";
import {
  getPortfolioOverview, getManualTrades,
  getStrategyTrades, getPortfolioTransactions,
  portfolioAcceptAgreement, portfolioAllocate, portfolioReduce,
  portfolioPause, portfolioStop,
} from "../lib/api";
import { TradeHistoryTab, TransactionHistoryTab } from "../components/TradeHistory";

const fmt    = (n, d = 2) => (+(n ?? 0)).toFixed(d);
const sign   = (n) => (+(n ?? 0)) >= 0 ? "+" : "";
const pnlCls = (n) => (+(n ?? 0)) >= 0 ? "up" : "down";
const RISK_COLOR = { LOW: "var(--green)", MEDIUM: "var(--amber)", HIGH: "var(--red)" };

// ── Agreement modal ───────────────────────────────────────────────────────────
const AGREEMENT_ITEMS = [
  "All funds are VIRTUAL — no real monetary value whatsoever",
  "SignalBoard is NOT a licensed broker or investment adviser",
  "This is for educational and entertainment purposes ONLY",
  "SignalBoard is NOT liable for any real-world investment decisions",
  "I accept full responsibility for my own real investment decisions",
];

function AgreementModal({ onAccept, loading }) {
  const [checked, setChecked] = useState(Array(AGREEMENT_ITEMS.length).fill(false));
  const allChecked = checked.every(Boolean);
  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-header">
          <span style={{ fontSize: 28 }}>📊</span>
          <div>
            <div className="modal-title">Paper Trading Disclaimer</div>
            <div className="modal-sub">Read and confirm before continuing</div>
          </div>
        </div>
        <div className="disclaimer">
          SignalBoard Auto-Trader uses <strong>VIRTUAL (paper) money only</strong>.
          No real funds. No real trades on any exchange. All returns are entirely simulated.
        </div>
        {AGREEMENT_ITEMS.map((text, i) => (
          <label key={i} className="check-row"
            onClick={() => setChecked(c => c.map((v, j) => j === i ? !v : v))}>
            <div className={`check-box ${checked[i] ? "checked" : ""}`}>{checked[i] ? "✓" : ""}</div>
            <span>{text}</span>
          </label>
        ))}
        <button className="btn btn-primary"
          style={{ width: "100%", marginTop: 14, opacity: allChecked ? 1 : 0.4 }}
          disabled={!allChecked || loading} onClick={onAccept}>
          {loading ? "Saving…" : "I Agree — Enter Auto-Trader"}
        </button>
      </div>
    </div>
  );
}

// ── Confirm modal — every action gets one ─────────────────────────────────────
function ConfirmModal({ title, description, warning, details, confirmLabel,
  confirmClass = "btn-primary", onConfirm, onCancel, loading, children }) {
  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-title" style={{ marginBottom: 6 }}>{title}</div>
        <div className="hint" style={{ marginBottom: 14, lineHeight: 1.6 }}>{description}</div>
        {details && (
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
            {details.map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span className="hint">{l}</span>
                <span className="mono" style={{ fontSize: 12 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {children}
        {warning && (
          <div style={{ background: "#f8514912", border: "1px solid #f8514940",
            borderRadius: 8, padding: "8px 14px", marginBottom: 14,
            fontSize: 12, color: "var(--red)", lineHeight: 1.5 }}>
            ⚠ {warning}
          </div>
        )}
        <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", marginBottom: 14 }}>
          📊 Virtual money only — no real funds involved
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onCancel} disabled={loading}>Cancel</button>
          <button
            className="btn"
            style={{
              flex: 1, opacity: loading ? 0.6 : 1,
              ...(confirmClass === "btn-primary" ? { background: "linear-gradient(135deg,#1f6feb,#388bfd)", borderColor: "transparent", color: "#fff", fontWeight: 700 } : {}),
              ...(confirmClass === "btn-danger"  ? { background: "#f8514915", border: "1px solid #f8514950", color: "var(--red)", fontWeight: 700 } : {}),
            }}
            onClick={onConfirm} disabled={loading}>
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Allocate modal ────────────────────────────────────────────────────────────
function AllocateModal({ cfg, allocation, availableCash, onConfirm, onCancel, loading }) {
  const [amount, setAmount] = useState("");
  const numVal    = parseFloat(amount) || 0;
  const afterCash = availableCash - numVal;
  const valid     = numVal > 0 && numVal <= availableCash;
  return (
    <ConfirmModal
      title={allocation ? `Add More to ${cfg.label}` : `Start ${cfg.label}`}
      description={allocation
        ? `Add more virtual funds to your ${cfg.label} strategy. They will be available for auto-trading immediately.`
        : `Allocate virtual funds to start the ${cfg.label} strategy. The auto-trader will manage buys, sells, and stop-losses inside this fund on your behalf.`}
      details={[
        ["Strategy",         cfg.label],
        ["Risk Level",       cfg.risk_level],
        ["Position Size",    `${(cfg.position_pct * 100).toFixed(0)}% per trade`],
        ["Stop-Loss",        `${cfg.stop_loss_default}%`],
        ["Trades in",        cfg.universe?.join(", ")],
        ...(allocation ? [["Current Allocation", `$${fmt(allocation.allocated)}`]] : []),
        ["Available Cash",   `$${fmt(availableCash)}`],
        ["After Allocation", numVal > 0 ? `$${fmt(afterCash)}` : "—"],
      ]}
      confirmLabel={allocation ? "Add Funds" : "▶ Start Strategy"}
      onConfirm={() => valid && onConfirm(numVal)}
      onCancel={onCancel}
      loading={loading}
    >
      <div style={{ marginBottom: 14 }}>
        <div className="stat-label" style={{ marginBottom: 8 }}>AMOUNT TO ALLOCATE</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {[100, 500, 1000, 2500].map(v => (
            <button key={v} className="btn"
              style={{ flex: 1, fontSize: 11, opacity: v > availableCash ? 0.3 : 1 }}
              disabled={v > availableCash} onClick={() => setAmount(String(v))}>
              ${v}
            </button>
          ))}
        </div>
        <input className="input" type="number" min={1} max={availableCash}
          placeholder={`Max $${fmt(availableCash)}`}
          value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
        {numVal > availableCash && (
          <div style={{ color: "var(--red)", fontSize: 11, marginTop: 4 }}>
            Exceeds available cash by ${fmt(numVal - availableCash)}
          </div>
        )}
      </div>
    </ConfirmModal>
  );
}

// ── Reduce modal ──────────────────────────────────────────────────────────────
function ReduceModal({ cfg, allocation, onConfirm, onCancel, loading }) {
  const [amount, setAmount] = useState("");
  const numVal  = parseFloat(amount) || 0;
  const idle    = allocation?.cash_in_strategy ?? 0;
  const valid   = numVal > 0 && numVal <= idle;
  return (
    <ConfirmModal
      title={`Reduce ${cfg.label} Allocation`}
      description="Return idle (uninvested) cash from this strategy back to your available cash. Invested funds in open positions cannot be withdrawn until the position is sold."
      details={[
        ["Idle Cash Available", `$${fmt(idle)}`],
        ["Currently Invested",  `$${fmt(allocation?.invested ?? 0)}`],
        ["After Reduction",     numVal > 0 ? `$${fmt(idle - numVal)} remaining idle` : "—"],
      ]}
      confirmLabel="Return to Available Cash"
      onConfirm={() => valid && onConfirm(numVal)}
      onCancel={onCancel} loading={loading}
    >
      <div style={{ marginBottom: 14 }}>
        <div className="stat-label" style={{ marginBottom: 8 }}>AMOUNT TO RETURN</div>
        <input className="input" type="number" min={1} max={idle}
          placeholder={`Max $${fmt(idle)} idle`}
          value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
        {numVal > idle && (
          <div style={{ color: "var(--red)", fontSize: 11, marginTop: 4 }}>
            Only ${fmt(idle)} idle cash available
          </div>
        )}
      </div>
    </ConfirmModal>
  );
}

// ── Manual position card ──────────────────────────────────────────────────────
function ManualPositionCard({ pos, prices = {} }) {
  const livePrice = prices[pos.symbol] ?? pos.current_price ?? pos.avg_buy_price ?? 0;
  const shares    = pos.shares ?? 0;
  const abp       = pos.avg_buy_price ?? pos.buy_price ?? 0;
  const liveValue = livePrice * shares;
  const pnl       = abp > 0 ? liveValue - (abp * shares) : (pos.unrealized_pnl ?? 0);
  const pnlPct    = abp > 0 ? ((livePrice - abp) / abp) * 100 : (pos.unrealized_pnl_pct ?? 0);
  return (
    <div className="position-card fade-in">
      <div className="position-header">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="position-symbol">{pos.symbol}</span>
          <span className="badge badge-dim">MANUAL</span>
        </div>
        <div className="position-pnl">
          <div className={`main ${pnlCls(pnl)}`}>{sign(pnl)}${fmt(Math.abs(pnl))}</div>
          <div className={`sub ${pnlCls(pnlPct)}`}>{sign(pnlPct)}{fmt(pnlPct)}%</div>
        </div>
      </div>
      <div className="stat-grid">
        {[["Shares", fmt(pos.shares, 4)], ["Avg Buy", `$${fmt(pos.avg_buy_price)}`],
          ["Now", `$${fmt(livePrice)}`], ["Value", `$${fmt(liveValue)}`]
        ].map(([l, v]) => (
          <div key={l} className="stat-item">
            <span className="stat-label">{l}</span>
            <span className="stat-value">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Strategy position card ────────────────────────────────────────────────────
function StrategyPositionCard({ pos, prices = {} }) {
  // Use live WebSocket price if available, fall back to stored price
  const livePrice = prices[pos.symbol] ?? pos.current_price ?? pos.buy_price;
  const shares    = pos.shares ?? 0;
  const bp        = pos.buy_price ?? 0;
  const liveValue = livePrice * shares;
  const pnl       = bp > 0 ? liveValue - (bp * shares) : (pos.unrealized_pnl ?? 0);
  const pnlPct    = bp > 0 ? ((livePrice - bp) / bp) * 100 : (pos.unrealized_pnl_pct ?? 0);
  const slRange   = livePrice - (pos.stop_loss_price ?? 0);
  const slPct     = slRange > 0
    ? Math.max(0, Math.min(100, ((livePrice - (pos.stop_loss_price ?? 0)) / (bp - (pos.stop_loss_price ?? 0))) * 100))
    : 100;
  return (
    <div className="position-card fade-in">
      <div className="position-header">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="position-symbol">{pos.symbol}</span>
          <span className="badge badge-dim">{pos.signal_confidence || "AUTO"}</span>
        </div>
        <div className="position-pnl">
          <div className={`main ${pnlCls(pnl)}`}>{sign(pnl)}${fmt(Math.abs(pnl))}</div>
          <div className={`sub ${pnlCls(pnlPct)}`}>{sign(pnlPct)}{fmt(pnlPct)}%</div>
        </div>
      </div>
      <div className="stat-grid">
        {[["Shares", fmt(pos.shares, 4)], ["Bought", `$${fmt(pos.buy_price)}`],
          ["Now", `$${fmt(livePrice)}`], ["Value", `$${fmt(liveValue)}`],
          ["Stop-Loss", `$${fmt(pos.stop_loss_price)}`]].map(([l, v]) => (
          <div key={l} className="stat-item">
            <span className="stat-label">{l}</span>
            <span className="stat-value">{v}</span>
          </div>
        ))}
      </div>
      <div className="sl-bar-wrap">
        <div className="sl-bar-labels">
          <span>Stop ${fmt(pos.stop_loss_price)}</span>
          <span>Buy ${fmt(pos.buy_price)}</span>
        </div>
        <div className="sl-bar-track">
          <div className="sl-bar-fill" style={{
            width: `${slPct}%`,
            background: slPct < 20 ? "var(--red)" : slPct < 50 ? "var(--amber)" : "var(--green)",
          }} />
        </div>
      </div>
    </div>
  );
}

// ── Strategy card ─────────────────────────────────────────────────────────────
function StrategyCard({ sk, cfg, allocation, onAction, selected, onSelect }) {
  const isAllocated = !!allocation;
  const isPaused    = allocation?.is_paused ?? false;
  const pnl         = allocation?.pnl ?? 0;
  const pnlPct      = allocation?.pnl_pct ?? 0;

  return (
    <div
      className={`strategy-card ${selected === sk ? "selected" : ""}`}
      onClick={() => isAllocated && onSelect(sk)}
      style={{ borderColor: isAllocated ? (isPaused ? "var(--amber)" : "var(--blue)") : "var(--border)", cursor: isAllocated ? "pointer" : "default" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div className="name" style={{ color: isAllocated ? "var(--text1)" : "var(--text2)" }}>
          {cfg.label}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {isAllocated && (
            <span style={{ fontSize: 10, fontFamily: "var(--mono)", padding: "2px 8px", borderRadius: 4,
              background: isPaused ? "#e3b34120" : "#0fffa315",
              color: isPaused ? "var(--amber)" : "var(--signal-buy)",
              border: `1px solid ${isPaused ? "#e3b34140" : "#0fffa340"}` }}>
              {isPaused ? "⏸ PAUSED" : "● ACTIVE"}
            </span>
          )}
          <span className="badge" style={{
            background: `${RISK_COLOR[cfg.risk_level]}15`,
            color: RISK_COLOR[cfg.risk_level],
            border: `1px solid ${RISK_COLOR[cfg.risk_level]}40`
          }}>{cfg.risk_level}</span>
        </div>
      </div>

      <div className="desc">{cfg.description}</div>

      {isAllocated ? (
        <>
          <div className="stat-grid" style={{ marginBottom: 10 }}>
            {[
              ["Allocated",  `$${fmt(allocation.allocated)}`],
              ["Idle Cash",  `$${fmt(allocation.cash_in_strategy)}`],
              ["Invested",   `$${fmt(allocation.invested)}`],
              ["P&L",        `${sign(pnl)}$${fmt(Math.abs(pnl))} (${sign(pnlPct)}${fmt(pnlPct)}%)`],
            ].map(([l, v]) => (
              <div key={l} className="stat-item">
                <span className="stat-label">{l}</span>
                <span className={`stat-value ${l === "P&L" ? pnlCls(pnl) : ""}`}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="btn" style={{ fontSize: 11 }}
              onClick={e => { e.stopPropagation(); onAction("allocate", sk); }}>＋ Add</button>
            <button className="btn" style={{ fontSize: 11 }}
              onClick={e => { e.stopPropagation(); onAction("reduce", sk); }}>－ Reduce</button>
            <button className="btn" style={{ fontSize: 11 }}
              onClick={e => { e.stopPropagation(); onAction("pause", sk); }}>
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button className="btn" style={{ fontSize: 11, color: "var(--red)" }}
              onClick={e => { e.stopPropagation(); onAction("stop", sk); }}>■ Stop</button>
          </div>
          {isAllocated && (
            <div className="hint" style={{ marginTop: 8, fontSize: 10 }}>
              Click card to view positions & trades ↓
            </div>
          )}
        </>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: 10 }}>
            {[["Position", `${(cfg.position_pct*100).toFixed(0)}%`],
              ["Stop-Loss", `${cfg.stop_loss_default}%`],
              ["Min Signal", cfg.min_confidence],
              ["Reserve", `${(cfg.cash_reserve_pct*100).toFixed(0)}%`]].map(([l, v]) => (
              <div key={l} className="stat-item">
                <span className="stat-label">{l}</span>
                <span className="stat-value">{v}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 12 }}
            onClick={e => { e.stopPropagation(); onAction("allocate", sk); }}>
            ▶ Allocate Funds to Start
          </button>
        </>
      )}
      <div className="universe" style={{ marginTop: 8 }}>{cfg.universe?.join(" · ")}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Trader({ onPortfolioUpdate, prices = {} }) {
  const [overview,      setOverview]      = useState(null);
  const [manualTrades,  setManualTrades]  = useState([]);
  const [stratTrades,   setStratTrades]   = useState([]);
  const [transactions,  setTransactions]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [acting,        setActing]        = useState(false);
  const [error,         setError]         = useState(null);
  const [toast,         setToast]         = useState(null);
  const [modal,         setModal]         = useState(null);  // {type, sk}
  const [selectedSk,    setSelectedSk]    = useState(null);
  const [stratTab,      setStratTab]      = useState("positions");
  const [mainTab,       setMainTab]       = useState("strategies"); // strategies | manual

  const summary    = overview?.summary    ?? {};
  const strategies = overview?.strategies ?? {};
  const manual     = overview?.manual     ?? {};

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const ov = await getPortfolioOverview();
      setOverview(ov);
      onPortfolioUpdate?.(ov.summary);
    } catch {
      setError("Could not load portfolio — is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load detail data when strategy selected
  useEffect(() => {
    if (!selectedSk) return;
    getStrategyTrades(selectedSk).then(d => setStratTrades(d.trades ?? [])).catch(() => {});
    getPortfolioTransactions().then(d => setTransactions(d.transactions ?? [])).catch(() => {});
  }, [selectedSk]);

  // Load manual trades when manual tab active
  useEffect(() => {
    if (mainTab === "manual") {
      getManualTrades().then(d => setManualTrades(d.trades ?? [])).catch(() => {});
    }
  }, [mainTab]);

  const act = async (fn, successMsg) => {
    setActing(true);
    try { await fn(); await load(); showToast(successMsg); }
    catch (e) { showToast(e.message || "Action failed", "err"); }
    finally { setActing(false); setModal(null); }
  };

  const handleAgreement    = () => act(portfolioAcceptAgreement, "Agreement accepted — welcome!");
  const handleAllocate     = (amount) => act(
    () => portfolioAllocate(modal.sk, amount),
    `$${amount.toLocaleString()} allocated to ${strategies[modal.sk]?.config?.label}`);
  const handleReduce       = (amount) => act(
    () => portfolioReduce(modal.sk, amount),
    `$${amount.toLocaleString()} returned to available cash`);
  const handlePause        = () => {
    const paused = !(strategies[modal.sk]?.allocation?.is_paused ?? false);
    act(() => portfolioPause(modal.sk, paused),
      paused ? `${strategies[modal.sk]?.config?.label} paused`
             : `${strategies[modal.sk]?.config?.label} resumed`);
  };
  const handleStop         = () => act(
    () => portfolioStop(modal.sk),
    `${strategies[modal.sk]?.config?.label} stopped — funds returned to available cash`);

  if (loading) return <div className="hint mono" style={{ padding: 40, textAlign: "center" }}>Loading portfolio…</div>;
  if (error)   return (
    <div className="card empty-state">
      <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
      {error}
      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={load}>↻ Retry</button>
    </div>
  );

  const selectedData  = selectedSk ? strategies[selectedSk] : null;
  const selectedCfg   = selectedData?.config ?? {};
  const selectedAlloc = selectedData?.allocation ?? null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {!summary.agreement_accepted && <AgreementModal onAccept={handleAgreement} loading={acting} />}

      {/* Action modals */}
      {modal?.type === "allocate" && (
        <AllocateModal
          cfg={strategies[modal.sk]?.config ?? {}}
          allocation={strategies[modal.sk]?.allocation ?? null}
          availableCash={summary.available_cash ?? 0}
          onConfirm={handleAllocate} onCancel={() => setModal(null)} loading={acting}
        />
      )}
      {modal?.type === "reduce" && (
        <ReduceModal
          cfg={strategies[modal.sk]?.config ?? {}}
          allocation={strategies[modal.sk]?.allocation ?? null}
          onConfirm={handleReduce} onCancel={() => setModal(null)} loading={acting}
        />
      )}
      {modal?.type === "pause" && (
        <ConfirmModal
          title={strategies[modal.sk]?.allocation?.is_paused
            ? `Resume ${strategies[modal.sk]?.config?.label}`
            : `Pause ${strategies[modal.sk]?.config?.label}`}
          description={strategies[modal.sk]?.allocation?.is_paused
            ? "Resume auto-trading. The strategy will begin opening new positions on the next qualifying signal."
            : "Pause auto-trading. Your open positions stay open and P&L keeps updating. No new trades will be placed. Cash stays in this strategy. You can resume anytime."}
          details={[
            ["Open Positions", String((strategies[modal.sk]?.positions ?? []).length)],
            ["Invested",       `$${fmt(strategies[modal.sk]?.allocation?.invested ?? 0)}`],
            ["Idle Cash",      `$${fmt(strategies[modal.sk]?.allocation?.cash_in_strategy ?? 0)}`],
          ]}
          confirmLabel={strategies[modal.sk]?.allocation?.is_paused ? "▶ Resume" : "⏸ Pause"}
          onConfirm={handlePause} onCancel={() => setModal(null)} loading={acting}
        />
      )}
      {modal?.type === "stop" && (
        <ConfirmModal
          title={`Stop ${strategies[modal.sk]?.config?.label}`}
          description="This will immediately close ALL open positions at current market prices and return all funds (proceeds + idle cash) to your available cash. The strategy sub-account will be removed."
          warning="This action cannot be undone. All positions will be closed at current market price."
          details={[
            ["Open Positions",  String((strategies[modal.sk]?.positions ?? []).length)],
            ["Total to Return", `$${fmt(strategies[modal.sk]?.allocation?.total_value ?? 0)}`],
          ]}
          confirmLabel="■ Stop & Return All Funds"
          confirmClass="btn-danger"
          onConfirm={handleStop} onCancel={() => setModal(null)} loading={acting}
        />
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="paper-banner">
        📊 Paper Portfolio — Virtual Money Only · No real funds involved · All figures (simulated)
      </div>

      {/* Summary */}
      <div className="summary-grid" style={{ marginBottom: 20 }}>
        {[
          { label: "Your Portfolio Value", value: `$${fmt(summary.total_value)}`, cls: "up" },
          { label: "Available Cash",       value: `$${fmt(summary.available_cash)}`, cls: "" },
          { label: "Manual Positions",     value: `$${fmt(summary.manual_value ?? 0)}`, cls: "muted" },
          { label: "In Strategies",        value: `$${fmt(summary.strategy_value ?? 0)}`, cls: "muted" },
          { label: "Total Deposited",      value: `$${fmt(summary.total_deposited)}`, cls: "muted" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="summary-card">
            <div className="stat-label">{label}</div>
            <div className={`stat-value ${cls}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Main tabs */}
      <div className="sub-tabs" style={{ marginBottom: 20 }}>
        {[["strategies", "🤖 My Strategies"], ["manual", "📈 My Manual Trades"]].map(([id, label]) => (
          <button key={id} className={`sub-tab ${mainTab === id ? "active" : ""}`}
            style={{ fontSize: 13, padding: "10px 20px" }}
            onClick={() => { setMainTab(id); setSelectedSk(null); }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── STRATEGIES TAB ──────────────────────────────────────────────────── */}
      {mainTab === "strategies" && (
        <div>
          <div className="hint" style={{ marginBottom: 14 }}>
            Allocate virtual funds to a strategy and the auto-trader manages everything inside —
            buys, sells, and stop-losses. Think of each strategy as a fund you invest in.
          </div>

          <div className="strategy-grid">
            {Object.entries(strategies).map(([sk, data]) => (
              <StrategyCard
                key={sk} sk={sk}
                cfg={data.config}
                allocation={data.allocation}
                onAction={(type, key) => setModal({ type, sk: key })}
                selected={selectedSk}
                onSelect={setSelectedSk}
              />
            ))}
          </div>

          {/* Strategy detail panel */}
          {selectedSk && selectedAlloc && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedCfg.label}</div>
                  <div className="hint" style={{ marginTop: 2 }}>
                    ${fmt(selectedAlloc.allocated)} allocated ·{" "}
                    <span className={pnlCls(selectedAlloc.pnl ?? 0)}>
                      {sign(selectedAlloc.pnl ?? 0)}${fmt(Math.abs(selectedAlloc.pnl ?? 0))} P&L
                    </span>
                  </div>
                </div>
                <button className="hint"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}
                  onClick={() => setSelectedSk(null)}>✕</button>
              </div>

              <div className="sub-tabs" style={{ marginBottom: 14 }}>
                {["positions", "trades", "transactions"].map(t => (
                  <button key={t} className={`sub-tab ${stratTab === t ? "active" : ""}`}
                    onClick={() => setStratTab(t)}>{t}</button>
                ))}
              </div>

              {stratTab === "positions" && (
                (selectedData?.positions ?? []).length === 0
                  ? <div className="empty-state">No open positions in {selectedCfg.label}.</div>
                  : (selectedData?.positions ?? []).map(p => (
                    <StrategyPositionCard key={`${p.symbol}_${p.strategy_key}`} pos={p} prices={prices} />
                  ))
              )}
              {stratTab === "trades" && <TradeHistoryTab trades={stratTrades} />}
              {stratTab === "transactions" && (
                <TransactionHistoryTab
                  transactions={transactions.filter(t => t.strategy_key === selectedSk || !t.strategy_key)}
                  wallet={summary}
                />
              )}
            </div>
          )}

          {Object.values(strategies).every(s => !s.is_allocated) && !loading && (
            <div className="card empty-state" style={{ marginTop: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🚀</div>
              <div style={{ marginBottom: 8 }}>
                You have <strong>${fmt(summary.available_cash)}</strong> available.
              </div>
              <div className="hint">
                Click <strong>▶ Allocate Funds to Start</strong> on any strategy above to begin auto-trading.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MANUAL TRADES TAB ───────────────────────────────────────────────── */}
      {mainTab === "manual" && (
        <div>
          <div className="hint" style={{ marginBottom: 14 }}>
            Your personal trades — bought directly from available cash. The auto-trader never
            touches these. Buy any stock from Live Prices using the Portfolio tab.
          </div>

          {/* Manual positions */}
          {(manual.positions ?? []).length === 0 ? (
            <div className="card empty-state" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📈</div>
              <div style={{ marginBottom: 8 }}>No manual positions yet.</div>
              <div className="hint">
                Go to <strong>Live Prices → Portfolio tab</strong> on any stock to place a manual buy.
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <div className="stat-label" style={{ marginBottom: 12 }}>
                OPEN POSITIONS — {(manual.positions ?? []).length} stocks ·
                Total value: ${fmt(manual.total_value)} ·
                <span className={pnlCls(manual.total_pnl)}>
                  {" "}{sign(manual.total_pnl)}${fmt(Math.abs(manual.total_pnl ?? 0))} P&L
                </span>
              </div>
              {(manual.positions ?? []).map(p => <ManualPositionCard key={p.symbol} pos={p} prices={prices} />)}
            </div>
          )}

          {/* Manual trade history */}
          <div className="stat-label" style={{ marginBottom: 12 }}>TRADE HISTORY</div>
          <TradeHistoryTab trades={manualTrades} />
        </div>
      )}

    </div>
  );
}