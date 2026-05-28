// src/pages/Trader.jsx — v3 (multi-strategy)
// Design doc v4.2 §11 — per-strategy allocation, confirm modals for every action

import { useState, useEffect, useCallback } from "react";
import {
  getPortfolioOverview, getPortfolioPnl, getPortfolioTrades,
  getPortfolioTransactions, getStrategies,
  portfolioAcceptAgreement, portfolioAllocate, portfolioReduce,
  portfolioPause, portfolioStop, portfolioManualTrade,
} from "../lib/api";
import { TradeHistoryTab, TransactionHistoryTab } from "../components/TradeHistory";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt    = (n, d = 2) => (+(n ?? 0)).toFixed(d);
const sign   = (n) => (+(n ?? 0)) >= 0 ? "+" : "";
const pnlCls = (n) => (+(n ?? 0)) >= 0 ? "up" : "down";
const RISK_COLOR = { LOW: "var(--green)", MEDIUM: "var(--amber)", HIGH: "var(--red)" };
const RISK_BG    = { LOW: "#3fb95015", MEDIUM: "#e3b34115", HIGH: "#f8514915" };

// ── Agreement modal ───────────────────────────────────────────────────────────
const AGREEMENT_ITEMS = [
  "All funds are VIRTUAL — no real monetary value",
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
            <div className="modal-sub">Please read and confirm before continuing</div>
          </div>
        </div>
        <div className="disclaimer">
          SignalBoard Auto-Trader uses <strong>VIRTUAL (paper) money only</strong>.
          No real funds. No real trades on any exchange. All returns are simulated.
        </div>
        {AGREEMENT_ITEMS.map((text, i) => (
          <label key={i} className="check-row" onClick={() => setChecked(c => c.map((v, j) => j === i ? !v : v))}>
            <div className={`check-box ${checked[i] ? "checked" : ""}`}>{checked[i] ? "✓" : ""}</div>
            <span>{text}</span>
          </label>
        ))}
        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 14, opacity: allChecked ? 1 : 0.4 }}
          disabled={!allChecked || loading}
          onClick={onAccept}
        >
          {loading ? "Saving…" : "I Agree — Enter Auto-Trader"}
        </button>
      </div>
    </div>
  );
}

// ── Confirm modal — used for every action ─────────────────────────────────────
function ConfirmModal({ title, description, warning, details, confirmLabel, confirmClass = "btn-primary", onConfirm, onCancel, loading, children }) {
  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-title" style={{ marginBottom: 6 }}>{title}</div>
        <div className="hint" style={{ marginBottom: 14, lineHeight: 1.6 }}>{description}</div>

        {details && (
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
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
          <div style={{ background: "#f8514912", border: "1px solid #f8514940", borderRadius: 8, padding: "8px 14px", marginBottom: 14, fontSize: 12, color: "var(--red)", lineHeight: 1.5 }}>
            ⚠ {warning}
          </div>
        )}

        <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", marginBottom: 14 }}>
          📊 Virtual money only — no real funds involved
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onCancel} disabled={loading}>Cancel</button>
          <button
            className={`btn ${confirmClass}`}
            style={{ flex: 1, opacity: loading ? 0.6 : 1 }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Allocate modal ────────────────────────────────────────────────────────────
function AllocateModal({ cfg, allocation, availableCash, onConfirm, onCancel, loading }) {
  const isAdding   = !!allocation;
  const [amount, setAmount] = useState("");
  const numVal     = parseFloat(amount) || 0;
  const afterCash  = availableCash - numVal;
  const valid      = numVal > 0 && numVal <= availableCash;
  const quickPicks = [100, 500, 1000, 2500];

  return (
    <ConfirmModal
      title={isAdding ? `Add More to ${cfg.label}` : `Allocate to ${cfg.label}`}
      description={isAdding
        ? `Add more virtual funds to your ${cfg.label} strategy. They will be available for auto-trading immediately.`
        : `Allocate virtual funds to start the ${cfg.label} strategy. Auto-trader will begin trading on the next qualifying signal.`
      }
      details={[
        ["Strategy",      cfg.label],
        ["Risk Level",    cfg.risk_level],
        ["Position Size", `${(cfg.position_pct * 100).toFixed(0)}% per trade`],
        ["Stop-Loss",     `${cfg.stop_loss_default}%`],
        ["Universe",      cfg.universe?.join(", ")],
        ...(isAdding ? [["Current Allocation", `$${fmt(allocation.allocated)}`]] : []),
        ["Available Cash", `$${fmt(availableCash)}`],
        ["After Allocation", numVal > 0 ? `$${fmt(afterCash)}` : "—"],
      ]}
      confirmLabel={isAdding ? "Add Funds" : "Start Strategy"}
      onConfirm={() => valid && onConfirm(numVal)}
      onCancel={onCancel}
      loading={loading}
    >
      <div style={{ marginBottom: 14 }}>
        <div className="stat-label" style={{ marginBottom: 8 }}>AMOUNT TO ALLOCATE</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {quickPicks.map(v => (
            <button key={v} className="btn" style={{ flex: 1, fontSize: 11, opacity: v > availableCash ? 0.3 : 1 }}
              disabled={v > availableCash} onClick={() => setAmount(String(v))}>
              ${v}
            </button>
          ))}
        </div>
        <input
          className="input"
          type="number" min={1} max={availableCash}
          placeholder={`Max $${fmt(availableCash)}`}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          autoFocus
        />
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
  const numVal     = parseFloat(amount) || 0;
  const idleCash   = allocation?.cash_in_strategy ?? 0;
  const valid      = numVal > 0 && numVal <= idleCash;

  return (
    <ConfirmModal
      title={`Reduce ${cfg.label} Allocation`}
      description="Withdraw idle (uninvested) cash from this strategy back to your available cash. Invested funds in open positions cannot be withdrawn."
      details={[
        ["Idle Cash Available", `$${fmt(idleCash)}`],
        ["Currently Invested",  `$${fmt(allocation?.invested ?? 0)}`],
        ["After Reduction",     numVal > 0 ? `$${fmt(idleCash - numVal)} idle` : "—"],
      ]}
      confirmLabel="Withdraw Idle Cash"
      onConfirm={() => valid && onConfirm(numVal)}
      onCancel={onCancel}
      loading={loading}
    >
      <div style={{ marginBottom: 14 }}>
        <div className="stat-label" style={{ marginBottom: 8 }}>AMOUNT TO WITHDRAW</div>
        <input
          className="input"
          type="number" min={1} max={idleCash}
          placeholder={`Max $${fmt(idleCash)}`}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          autoFocus
        />
        {numVal > idleCash && (
          <div style={{ color: "var(--red)", fontSize: 11, marginTop: 4 }}>
            Only ${fmt(idleCash)} idle cash available
          </div>
        )}
      </div>
    </ConfirmModal>
  );
}

// ── Strategy card ─────────────────────────────────────────────────────────────
function StrategyCard({ sk, cfg, allocation, onAction, selected, onSelect }) {
  const isAllocated = !!allocation;
  const isPaused    = allocation?.is_paused ?? false;
  const isActive    = allocation?.is_active ?? false;
  const pnl         = allocation?.pnl ?? 0;
  const pnlPct      = allocation?.pnl_pct ?? 0;

  return (
    <div
      className={`strategy-card ${selected === sk ? "selected" : ""}`}
      onClick={() => isAllocated && onSelect(sk)}
      style={{ borderColor: isAllocated ? (isPaused ? "var(--amber)" : "var(--blue)") : "var(--border)" }}
    >
      {/* Header */}
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
          <span className="badge" style={{ background: RISK_BG[cfg.risk_level], color: RISK_COLOR[cfg.risk_level], border: `1px solid ${RISK_COLOR[cfg.risk_level]}40` }}>
            {cfg.risk_level}
          </span>
        </div>
      </div>

      <div className="desc">{cfg.description}</div>

      {/* Allocation stats */}
      {isAllocated ? (
        <>
          <div className="stat-grid" style={{ marginBottom: 10 }}>
            <div className="stat-item">
              <span className="stat-label">Allocated</span>
              <span className="stat-value">${fmt(allocation.allocated)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Idle Cash</span>
              <span className="stat-value">${fmt(allocation.cash_in_strategy)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Invested</span>
              <span className="stat-value">${fmt(allocation.invested)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">P&L</span>
              <span className={`stat-value ${pnlCls(pnl)}`}>{sign(pnl)}${fmt(Math.abs(pnl))} ({sign(pnlPct)}{fmt(pnlPct)}%)</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="btn" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); onAction("allocate", sk); }}>＋ Add</button>
            <button className="btn" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); onAction("reduce", sk); }}>－ Reduce</button>
            <button className="btn" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); onAction("pause", sk); }}>
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button className="btn" style={{ fontSize: 11, color: "var(--red)" }} onClick={e => { e.stopPropagation(); onAction("stop", sk); }}>■ Stop</button>
          </div>
        </>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: 10 }}>
            <div className="stat-item">
              <span className="stat-label">Position Size</span>
              <span className="stat-value">{(cfg.position_pct * 100).toFixed(0)}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Stop-Loss</span>
              <span className="stat-value">{cfg.stop_loss_default}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Min Signal</span>
              <span className="stat-value">{cfg.min_confidence}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Reserve</span>
              <span className="stat-value">{(cfg.cash_reserve_pct * 100).toFixed(0)}%</span>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: "100%", fontSize: 12 }}
            onClick={e => { e.stopPropagation(); onAction("allocate", sk); }}
          >
            ▶ Allocate Funds
          </button>
        </>
      )}

      <div className="universe" style={{ marginTop: 8 }}>{cfg.universe?.join(" · ")}</div>
    </div>
  );
}

// ── Position card (per strategy detail) ──────────────────────────────────────
function PositionCard({ pos }) {
  const slRange = pos.buy_price - pos.stop_loss_price;
  const slPct   = slRange > 0
    ? Math.max(0, Math.min(100, ((pos.current_price - pos.stop_loss_price) / slRange) * 100))
    : 100;
  return (
    <div className="position-card fade-in">
      <div className="position-header">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="position-symbol">{pos.symbol}</span>
          <span className="badge badge-dim">{pos.signal_confidence}</span>
        </div>
        <div className="position-pnl">
          <div className={`main ${pnlCls(pos.unrealized_pnl)}`}>{sign(pos.unrealized_pnl)}${fmt(Math.abs(pos.unrealized_pnl))}</div>
          <div className={`sub ${pnlCls(pos.unrealized_pnl_pct)}`}>{sign(pos.unrealized_pnl_pct)}{fmt(pos.unrealized_pnl_pct)}%</div>
        </div>
      </div>
      <div className="stat-grid">
        {[["Shares", fmt(pos.shares, 4)], ["Bought", `$${fmt(pos.buy_price)}`],
          ["Now", `$${fmt(pos.current_price)}`], ["Value", `$${fmt(pos.current_value)}`],
          ["Stop-Loss", `$${fmt(pos.stop_loss_price)}`]].map(([l, v]) => (
          <div key={l} className="stat-item">
            <span className="stat-label">{l}</span>
            <span className="stat-value">{v}</span>
          </div>
        ))}
      </div>
      <div className="sl-bar-wrap">
        <div className="sl-bar-labels"><span>Stop ${fmt(pos.stop_loss_price)}</span><span>Buy ${fmt(pos.buy_price)}</span></div>
        <div className="sl-bar-track">
          <div className="sl-bar-fill" style={{ width: `${slPct}%`, background: slPct < 20 ? "var(--red)" : slPct < 50 ? "var(--amber)" : "var(--green)" }} />
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const DETAIL_TABS = ["positions", "trades", "transactions"];

export default function Trader({ onPortfolioUpdate }) {
  const [overview,      setOverview]      = useState(null);
  const [trades,        setTrades]        = useState([]);
  const [transactions,  setTransactions]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [acting,        setActing]        = useState(false);
  const [error,         setError]         = useState(null);
  const [toast,         setToast]         = useState(null);
  const [selectedSk,    setSelectedSk]    = useState(null);   // strategy detail view
  const [detailTab,     setDetailTab]     = useState("positions");
  const [modal,         setModal]         = useState(null);   // { type, sk }

  const summary   = overview?.summary ?? {};
  const strategies = overview?.strategies ?? {};

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

  useEffect(() => {
    if (!selectedSk || loading) return;
    getPortfolioTrades(50, selectedSk).then(d => setTrades(d.trades ?? [])).catch(() => {});
    getPortfolioTransactions(50).then(d => setTransactions(d.transactions ?? [])).catch(() => {});
  }, [selectedSk, loading]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const act = async (fn, successMsg) => {
    setActing(true);
    try {
      await fn();
      await load();
      showToast(successMsg);
    } catch (e) {
      showToast(e.message || "Action failed", "err");
    } finally {
      setActing(false);
      setModal(null);
    }
  };

  const handleAgreement = () =>
    act(portfolioAcceptAgreement, "Agreement accepted — welcome to Auto-Trader!");

  const handleAction = (type, sk) => setModal({ type, sk });

  const handleAllocate = (amount) => {
    const sk = modal.sk;
    act(() => portfolioAllocate(sk, amount),
      `$${amount.toLocaleString()} allocated to ${strategies[sk]?.config?.label}`);
  };

  const handleReduce = (amount) => {
    const sk = modal.sk;
    act(() => portfolioReduce(sk, amount),
      `$${amount.toLocaleString()} returned to available cash`);
  };

  const handlePause = () => {
    const sk      = modal.sk;
    const paused  = !(strategies[sk]?.allocation?.is_paused ?? false);
    act(() => portfolioPause(sk, paused),
      paused ? `${strategies[sk]?.config?.label} paused` : `${strategies[sk]?.config?.label} resumed`);
  };

  const handleStop = () => {
    const sk = modal.sk;
    act(() => portfolioStop(sk),
      `${strategies[sk]?.config?.label} stopped — funds returned to available cash`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="hint mono" style={{ padding: 40, textAlign: "center" }}>Loading portfolio…</div>
  );

  if (error) return (
    <div className="card empty-state">
      <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
      {error}
      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={load}>↻ Retry</button>
    </div>
  );

  const needsAgreement  = !summary.agreement_accepted;
  const selectedData    = selectedSk ? strategies[selectedSk] : null;
  const selectedCfg     = selectedData?.config ?? {};
  const selectedAlloc   = selectedData?.allocation ?? null;
  const selectedPositions = selectedData?.positions ?? [];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* Agreement modal */}
      {needsAgreement && <AgreementModal onAccept={handleAgreement} loading={acting} />}

      {/* Action modals */}
      {modal?.type === "allocate" && (
        <AllocateModal
          cfg={strategies[modal.sk]?.config ?? {}}
          allocation={strategies[modal.sk]?.allocation ?? null}
          availableCash={summary.available_cash ?? 0}
          onConfirm={handleAllocate}
          onCancel={() => setModal(null)}
          loading={acting}
        />
      )}
      {modal?.type === "reduce" && (
        <ReduceModal
          cfg={strategies[modal.sk]?.config ?? {}}
          allocation={strategies[modal.sk]?.allocation ?? null}
          onConfirm={handleReduce}
          onCancel={() => setModal(null)}
          loading={acting}
        />
      )}
      {modal?.type === "pause" && (
        <ConfirmModal
          title={strategies[modal.sk]?.allocation?.is_paused ? `Resume ${strategies[modal.sk]?.config?.label}` : `Pause ${strategies[modal.sk]?.config?.label}`}
          description={strategies[modal.sk]?.allocation?.is_paused
            ? "Resume auto-trading for this strategy. It will begin opening new positions on the next qualifying signal."
            : "Pause auto-trading for this strategy. Your open positions will remain open and P&L will continue updating. No new trades will be placed until you resume. Cash stays in this strategy."}
          details={[
            ["Open Positions",  String((strategies[modal.sk]?.positions ?? []).length)],
            ["Invested",        `$${fmt(strategies[modal.sk]?.allocation?.invested ?? 0)}`],
            ["Idle Cash",       `$${fmt(strategies[modal.sk]?.allocation?.cash_in_strategy ?? 0)}`],
          ]}
          confirmLabel={strategies[modal.sk]?.allocation?.is_paused ? "▶ Resume" : "⏸ Pause"}
          onConfirm={handlePause}
          onCancel={() => setModal(null)}
          loading={acting}
        />
      )}
      {modal?.type === "stop" && (
        <ConfirmModal
          title={`Stop ${strategies[modal.sk]?.config?.label}`}
          description="This will close ALL open positions at current market prices and return all funds to your available cash. The strategy sub-account will be removed."
          warning="This action cannot be undone. All positions will be closed immediately."
          details={[
            ["Open Positions",  String((strategies[modal.sk]?.positions ?? []).length)],
            ["Total to Return", `$${fmt(strategies[modal.sk]?.allocation?.total_value ?? 0)}`],
          ]}
          confirmLabel="■ Stop & Return Funds"
          confirmClass="btn-danger"
          onConfirm={handleStop}
          onCancel={() => setModal(null)}
          loading={acting}
        />
      )}

      {/* Toast */}
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      {/* Paper trading banner */}
      <div className="paper-banner">
        📊 Paper Portfolio — Virtual Money Only · No real funds involved · All figures (simulated)
      </div>

      {/* Portfolio summary */}
      <div className="summary-grid" style={{ marginBottom: 16 }}>
        {[
          { label: "Your Portfolio Value", value: `$${fmt(summary.total_value)}`, className: "up" },
          { label: "Available Cash",       value: `$${fmt(summary.available_cash)}`, className: "" },
          { label: "Total Deposited",      value: `$${fmt(summary.total_deposited)}`, className: "muted" },
        ].map(({ label, value, className }) => (
          <div key={label} className="summary-card">
            <div className="stat-label">{label}</div>
            <div className={`stat-value ${className}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Strategy cards grid */}
      <div style={{ marginBottom: 24 }}>
        <div className="stat-label" style={{ marginBottom: 12 }}>
          YOUR STRATEGIES — click an active strategy to view positions and trades
        </div>
        <div className="strategy-grid">
          {Object.entries(strategies).map(([sk, data]) => (
            <StrategyCard
              key={sk}
              sk={sk}
              cfg={data.config}
              allocation={data.allocation}
              onAction={handleAction}
              selected={selectedSk}
              onSelect={setSelectedSk}
            />
          ))}
        </div>
      </div>

      {/* Strategy detail panel */}
      {selectedSk && selectedAlloc && (
        <div className="card" style={{ marginTop: 8 }}>
          {/* Detail header */}
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
            <button className="hint" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}
              onClick={() => setSelectedSk(null)}>✕</button>
          </div>

          {/* Detail sub-tabs */}
          <div className="sub-tabs" style={{ marginBottom: 14 }}>
            {DETAIL_TABS.map(t => (
              <button key={t} className={`sub-tab ${detailTab === t ? "active" : ""}`} onClick={() => setDetailTab(t)}>
                {t}
              </button>
            ))}
          </div>

          {detailTab === "positions" && (
            selectedPositions.length === 0
              ? <div className="empty-state">No open positions in {selectedCfg.label}.</div>
              : selectedPositions.map(p => <PositionCard key={`${p.symbol}_${p.strategy_key}`} pos={p} />)
          )}
          {detailTab === "trades" && (
            <TradeHistoryTab trades={trades.filter(t => t.strategy_key === selectedSk)} />
          )}
          {detailTab === "transactions" && (
            <TransactionHistoryTab
              transactions={transactions.filter(t => t.strategy_key === selectedSk || !t.strategy_key)}
              wallet={summary}
            />
          )}
        </div>
      )}

      {!selectedSk && !needsAgreement && Object.values(strategies).every(s => !s.is_allocated) && (
        <div className="card empty-state">
          <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
          <div style={{ marginBottom: 8 }}>You have <strong>${fmt(summary.available_cash)}</strong> ready to invest.</div>
          <div className="hint">Click <strong>▶ Allocate Funds</strong> on any strategy above to get started.</div>
        </div>
      )}
    </div>
  );
}