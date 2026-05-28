// src/pages/Trader.jsx
// Auto-Trader v2 — design doc v4.2 §11

import { useState, useEffect, useCallback } from "react";
import {
  getPortfolio, getPortfolioPositions, getPortfolioPnl,
  getPortfolioTrades, getPortfolioTransactions, getStrategies,
  portfolioDeposit, portfolioWithdraw, portfolioReset,
  portfolioSetStrategy, portfolioToggle, portfolioAcceptAgreement,
} from "../lib/api";
import { TradeHistoryTab, TransactionHistoryTab } from "../components/TradeHistory";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt     = (n, d = 2) => (n ?? 0).toFixed(d);
const sign    = (n) => (n ?? 0) >= 0 ? "+" : "";
const pnlCls  = (n) => (n ?? 0) >= 0 ? "up" : "down";
const riskCls = { LOW: "badge-high", MEDIUM: "badge-med", HIGH: "badge-low" };
const actionCls = { BUY: "badge-buy", SELL: "badge-sell" };
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString() : "—";

// ── Reusable: stat grid row ───────────────────────────────────────────────────
function StatGrid({ items }) {
  // items: [{ label, value, className }]
  return (
    <div className="stat-grid">
      {items.map(({ label, value, className }) => (
        <div key={label} className="stat-item">
          <span className="stat-label">{label}</span>
          <span className={`stat-value ${className ?? ""}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Reusable: empty state ─────────────────────────────────────────────────────
function Empty({ msg }) {
  return <div className="card empty-state">{msg}</div>;
}

// ── Sparkline (pure SVG, no dep) ──────────────────────────────────────────────
function Sparkline({ data, positive = true }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.v);
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const W = 240, H = 52;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 6) - 3;
    return `${x},${y}`;
  }).join(" ");
  const color = positive ? "var(--signal-buy)" : "var(--red)";
  const fill  = `${pts} ${W},${H} 0,${H}`;
  return (
    <div className="sparkline-wrap">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={fill} fill="url(#sg)" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Agreement modal ───────────────────────────────────────────────────────────
const AGREEMENT_ITEMS = [
  "I understand all funds are VIRTUAL and have no real monetary value",
  "SignalBoard is NOT a licensed broker, investment adviser, or financial institution",
  "This is for educational and entertainment purposes ONLY",
  "SignalBoard is NOT liable for any real-world investment decisions I make",
  "I accept full responsibility for my own real investment decisions",
];

function AgreementModal({ onAccept, loading }) {
  const [checked, setChecked] = useState(Array(AGREEMENT_ITEMS.length).fill(false));
  const allChecked = checked.every(Boolean);
  const toggle = (i) => setChecked(c => c.map((v, j) => j === i ? !v : v));

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
          SignalBoard Auto-Trader uses <strong>SIMULATED (paper) money only</strong>.
          No real currency is involved. All "returns" and "losses" are fictional
          and for educational purposes only.
        </div>
        {AGREEMENT_ITEMS.map((text, i) => (
          <label key={i} className="check-row" onClick={() => toggle(i)}>
            <div className={`check-box ${checked[i] ? "checked" : ""}`}>{checked[i] ? "✓" : ""}</div>
            <span>{text}</span>
          </label>
        ))}
        <button
          className={`btn btn-primary ${allChecked ? "" : "disabled"}`}
          style={{ width: "100%", marginTop: 12 }}
          disabled={!allChecked || loading}
          onClick={onAccept}
        >
          {loading ? "Saving…" : "I Agree — Enter Auto-Trader"}
        </button>
      </div>
    </div>
  );
}

// ── Wallet modal (deposit / withdraw) ─────────────────────────────────────────
function WalletModal({ type, balance, onSubmit, onClose, loading }) {
  const [amount, setAmount] = useState("");
  const isWithdraw = type === "withdraw";
  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-title" style={{ marginBottom: 4 }}>
          {isWithdraw ? "Withdraw Virtual Cash" : "Deposit Virtual Cash"}
        </div>
        <div className="modal-sub" style={{ marginBottom: 16 }}>
          {isWithdraw
            ? `Available: $${fmt(balance)} (invested funds cannot be withdrawn)`
            : "Add virtual funds to your paper portfolio"}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[500, 1000, 5000].map(v => (
            <button key={v} className="btn" onClick={() => setAmount(String(v))}>${v}</button>
          ))}
        </div>
        <input
          className="input"
          type="number"
          placeholder="Enter amount"
          value={amount}
          min={1}
          max={isWithdraw ? balance : undefined}
          onChange={e => setAmount(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, opacity: amount > 0 ? 1 : 0.4 }}
            disabled={!amount || Number(amount) <= 0 || loading}
            onClick={() => onSubmit(Number(amount))}
          >
            {loading ? "Processing…" : isWithdraw ? "Withdraw" : "Deposit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Strategy card ─────────────────────────────────────────────────────────────
function StrategyCard({ sk, cfg, selected, onSelect }) {
  return (
    <div
      className={`strategy-card ${selected === sk ? "selected" : ""}`}
      onClick={() => onSelect(sk)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="name" style={{ color: selected === sk ? "var(--blue)" : "var(--text1)" }}>
          {cfg.label}
        </div>
        <span className={`badge ${riskCls[cfg.risk_level]}`}>{cfg.risk_level}</span>
      </div>
      <div className="desc">{cfg.description}</div>
      <StatGrid items={[
        { label: "Position",   value: `${(cfg.position_pct * 100).toFixed(0)}%` },
        { label: "Stop-Loss",  value: `${cfg.stop_loss_default}%` },
        { label: "Min Signal", value: cfg.min_confidence },
        { label: "Reserve",    value: `${(cfg.cash_reserve_pct * 100).toFixed(0)}%` },
      ]} />
      <div className="universe">{cfg.universe?.join(" · ")}</div>
    </div>
  );
}

// ── Position card ─────────────────────────────────────────────────────────────
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
          <span className={`badge ${actionCls[pos.signal_confidence] ?? "badge-dim"}`}>
            {pos.signal_confidence}
          </span>
        </div>
        <div className="position-pnl">
          <div className={`main ${pnlCls(pos.unrealized_pnl)}`}>
            {sign(pos.unrealized_pnl)}${fmt(Math.abs(pos.unrealized_pnl))}
          </div>
          <div className={`sub ${pnlCls(pos.unrealized_pnl_pct)}`}>
            {sign(pos.unrealized_pnl_pct)}{fmt(pos.unrealized_pnl_pct)}%
          </div>
        </div>
      </div>

      <StatGrid items={[
        { label: "Shares",    value: fmt(pos.shares, 4) },
        { label: "Bought",    value: `$${fmt(pos.buy_price)}` },
        { label: "Now",       value: `$${fmt(pos.current_price)}` },
        { label: "Value",     value: `$${fmt(pos.current_value)}` },
        { label: "Stop-Loss", value: `$${fmt(pos.stop_loss_price)}` },
      ]} />

      <div className="sl-bar-wrap">
        <div className="sl-bar-labels">
          <span>Stop ${fmt(pos.stop_loss_price)}</span>
          <span>Buy ${fmt(pos.buy_price)}</span>
        </div>
        <div className="sl-bar-track">
          <div
            className="sl-bar-fill"
            style={{
              width: `${slPct}%`,
              background: slPct < 20 ? "var(--red)" : slPct < 50 ? "var(--amber)" : "var(--green)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Trade card ────────────────────────────────────────────────────────────────
function TradeCard({ t }) {
  return (
    <div className="trade-card fade-in">
      <div className="trade-header">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={`badge ${actionCls[t.action] ?? "badge-dim"}`}>{t.action}</span>
          <span className="mono" style={{ fontWeight: 700 }}>{t.symbol}</span>
          <span className="trigger-badge">{t.trigger}</span>
        </div>
        <span className="hint mono">{fmtDate(t.timestamp)}</span>
      </div>
      <div className="trade-meta">
        <span>{fmt(t.shares, 4)} sh @ <strong>${fmt(t.price)}</strong></span>
        <span>Total: ${fmt(t.total)}</span>
        {t.pnl != null && t.pnl !== 0 && (
          <span className={pnlCls(t.pnl)}>
            P&L: {sign(t.pnl)}${fmt(Math.abs(t.pnl))} ({sign(t.pnl_pct)}{fmt(t.pnl_pct)}%)
          </span>
        )}
        <span className="hint">Balance after: ${fmt(t.balance_after)}</span>
      </div>
      {t.reason && (
        <div className="trade-reason">
          "{t.reason.slice(0, 120)}{t.reason.length > 120 ? "…" : ""}"
        </div>
      )}
    </div>
  );
}

// ── Transaction card ──────────────────────────────────────────────────────────
function TxCard({ t }) {
  const amtColor = t.type === "withdraw" ? "down" : t.amount > 0 ? "up" : "";
  return (
    <div className="trade-card fade-in">
      <div className="trade-header">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge badge-dim" style={{ textTransform: "uppercase" }}>{t.type}</span>
          {t.amount > 0 && (
            <span className={`mono ${amtColor}`}>
              {t.type === "withdraw" ? "-" : "+"}${fmt(t.amount)}
            </span>
          )}
        </div>
        <span className="hint mono">{t.timestamp ? new Date(t.timestamp).toLocaleDateString() : "—"}</span>
      </div>
      {t.notes && <div className="hint" style={{ marginTop: 4 }}>{t.notes}</div>}
      <div className="hint mono" style={{ marginTop: 4 }}>
        ${fmt(t.balance_before)} → ${fmt(t.balance_after)}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = ["overview", "positions", "trades", "transactions", "strategy"];

export default function Trader() {
  const [summary,      setSummary]      = useState(null);
  const [positions,    setPositions]    = useState([]);
  const [pnl,          setPnl]          = useState(null);
  const [trades,       setTrades]       = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [strategies,   setStrategies]   = useState({});
  const [tab,          setTab]          = useState("overview");
  const [walletModal,  setWalletModal]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [acting,       setActing]       = useState(false);
  const [error,        setError]        = useState(null);
  const [toast,        setToast]        = useState(null);

  const wallet      = summary?.wallet      ?? {};
  const strategy    = summary?.strategy    ?? {};
  const strategyKey = summary?.strategy_key ?? "balanced";

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [sum, strats] = await Promise.all([getPortfolio(), getStrategies()]);
      setSummary(sum);
      setStrategies(strats.strategies ?? {});
    } catch {
      setError("Could not load portfolio — is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTab = useCallback(async (t) => {
    try {
      if (t === "positions")    { const d = await getPortfolioPositions();    setPositions(d.positions ?? []); }
      if (t === "trades")       { const d = await getPortfolioTrades();       setTrades(d.trades ?? []); }
      if (t === "transactions") { const d = await getPortfolioTransactions(); setTransactions(d.transactions ?? []); }
      if (t === "overview")     { const [s, p] = await Promise.all([getPortfolio(), getPortfolioPnl()]); setSummary(s); setPnl(p); }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!loading) loadTab(tab); }, [tab, loading]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const act = async (fn, successMsg, errMsg) => {
    setActing(true);
    try { await fn(); await load(); showToast(successMsg); }
    catch (e) { showToast(e.message || errMsg, "err"); }
    finally { setActing(false); }
  };

  const handleAgreement    = () => act(portfolioAcceptAgreement, "Agreement accepted — welcome!", "Failed to save");
  const handleToggle       = () => act(() => portfolioToggle(!wallet.is_active), wallet.is_active ? "Auto-trader paused" : "Auto-trader activated!", "Toggle failed");
  const handleDeposit      = (n) => act(async () => { await portfolioDeposit(n); setWalletModal(null); }, `$${n.toLocaleString()} deposited!`, "Deposit failed");
  const handleWithdraw     = (n) => act(async () => { await portfolioWithdraw(n); setWalletModal(null); }, `$${n.toLocaleString()} withdrawn`, "Withdrawal failed");
  const handleStrategyChange = (sk) => { if (sk !== strategyKey) act(() => portfolioSetStrategy(sk), `Strategy changed to ${strategies[sk]?.label}`, "Strategy change failed"); };
  const handleReset = () => {
    if (!window.confirm("Reset portfolio? Closes all positions, returns to $10,000. History preserved.")) return;
    act(portfolioReset, "Portfolio reset to $10,000", "Reset failed");
  };

  // ── Loading / error ──────────────────────────────────────────────────────────
  if (loading) return <div className="hint mono" style={{ padding: 40, textAlign: "center" }}>Loading portfolio…</div>;
  if (error)   return (
    <div className="card empty-state">
      <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
      {error}
      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={load}>↻ Retry</button>
    </div>
  );

  // ── Derived display values ───────────────────────────────────────────────────
  const dailyPnlData = pnl?.daily_pnl
    ? Object.values(pnl.daily_pnl).map(v => ({ v }))
    : [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>

      {!wallet.agreement_accepted && <AgreementModal onAccept={handleAgreement} loading={acting} />}

      {walletModal && (
        <WalletModal
          type={walletModal}
          balance={wallet.balance ?? 0}
          onSubmit={walletModal === "deposit" ? handleDeposit : handleWithdraw}
          onClose={() => setWalletModal(null)}
          loading={acting}
        />
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="paper-banner">
        📊 Paper Portfolio — Virtual Money Only · No real funds involved · All figures (simulated)
      </div>

      {/* Wallet summary row */}
      <div className="summary-grid">
        {[
          { label: "Total Value", value: `$${fmt(wallet.total_value)}`,                                       className: pnlCls(wallet.total_pnl) },
          { label: "Cash",        value: `$${fmt(wallet.balance)}`,                                           className: "" },
          { label: "Invested",    value: `$${fmt(wallet.invested)}`,                                          className: "muted" },
          { label: "P&L",         value: `${sign(wallet.total_pnl)}$${fmt(Math.abs(wallet.total_pnl ?? 0))}`, className: pnlCls(wallet.total_pnl) },
          { label: "Return",      value: `${sign(wallet.total_pnl_pct)}${fmt(wallet.total_pnl_pct)}%`,        className: pnlCls(wallet.total_pnl_pct) },
          { label: "Deposited",   value: `$${fmt(wallet.total_deposited)}`,                                   className: "muted" },
          { label: "Trades",      value: String(pnl?.daily_pnl ? Object.values(pnl.daily_pnl).length : "—"), className: "muted" },
        ].map(({ label, value, className }) => (
          <div key={label} className="summary-card">
            <div className="stat-label">{label}</div>
            <div className={`stat-value ${className}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="controls">
        <button
          className={`btn ${wallet.is_active ? "btn-buy" : ""}`}
          onClick={handleToggle}
          disabled={acting || !wallet.agreement_accepted}
        >
          {wallet.is_active ? "⏸ Pause Auto-Trader" : "▶ Start Auto-Trader"}
        </button>
        <button className="btn" onClick={() => setWalletModal("deposit")}>＋ Deposit</button>
        <button className="btn" onClick={() => setWalletModal("withdraw")}>－ Withdraw</button>
        <div style={{ flex: 1 }} />
        <div className="strategy-badge">
          <span className="hint">STRATEGY</span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--blue)" }}>{strategy.label ?? strategyKey}</span>
        </div>
        <button className="btn" style={{ color: "var(--red)", fontSize: 11 }} onClick={handleReset}>↺ Reset</button>
      </div>

      {/* Sub-tabs */}
      <div className="sub-tabs">
        {TABS.map(t => (
          <button key={t} className={`sub-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div>
          {dailyPnlData.length > 1 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="stat-label">DAILY P&L HISTORY</div>
              <Sparkline data={dailyPnlData} positive={(pnl?.total_pnl ?? 0) >= 0} />
              <div style={{ marginTop: 12 }}>
                <StatGrid items={[
                  { label: "Realized",      value: `${sign(pnl.realized_pnl)}$${fmt(Math.abs(pnl.realized_pnl))}`,   className: pnlCls(pnl.realized_pnl) },
                  { label: "Unrealized",    value: `${sign(pnl.unrealized_pnl)}$${fmt(Math.abs(pnl.unrealized_pnl))}`, className: pnlCls(pnl.unrealized_pnl) },
                  { label: "Total Return",  value: `${sign(pnl.total_return_pct)}${fmt(pnl.total_return_pct)}%`,       className: pnlCls(pnl.total_return_pct) },
                  { label: "Open Positions",value: String(pnl.open_positions),                                         className: "muted" },
                ]} />
              </div>
            </div>
          )}

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="stat-label">CURRENT STRATEGY</div>
              <span className={`badge ${riskCls[strategy.risk_level]}`}>{strategy.risk_level} RISK</span>
            </div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{strategy.label}</div>
            <div className="hint" style={{ marginBottom: 10, lineHeight: 1.5 }}>{strategy.description}</div>
            <StatGrid items={[
              { label: "Position Size", value: `${((strategy.position_pct ?? 0) * 100).toFixed(0)}% of wallet` },
              { label: "Stop-Loss",     value: `${strategy.stop_loss_default ?? "—"}%` },
              { label: "Min Signal",    value: strategy.min_confidence ?? "—" },
              { label: "Cash Reserve",  value: `${((strategy.cash_reserve_pct ?? 0) * 100).toFixed(0)}%` },
            ]} />
            <div className="hint mono" style={{ marginTop: 10 }}>
              Universe: {(strategy.universe ?? []).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* ── Positions ────────────────────────────────────────────────────────── */}
      {tab === "positions" && (
        positions.length === 0
          ? <Empty msg={wallet.is_active ? "No open positions. Auto-trader will open positions on next signal." : "Start the auto-trader to begin trading."} />
          : positions.map(p => <PositionCard key={p.symbol} pos={p} />)
      )}

      {/* ── Trades ───────────────────────────────────────────────────────────── */}
      {tab === "trades" && <TradeHistoryTab trades={trades} />}

      {/* ── Transactions ─────────────────────────────────────────────────────── */}
      {tab === "transactions" && <TransactionHistoryTab transactions={transactions} wallet={wallet} />}

      {/* ── Strategy ─────────────────────────────────────────────────────────── */}
      {tab === "strategy" && (
        <div>
          <div className="hint" style={{ marginBottom: 14 }}>
            Select your investment strategy. Existing positions stay open under old rules until closed.
          </div>
          <div className="strategy-grid">
            {Object.entries(strategies).map(([sk, cfg]) => (
              <StrategyCard key={sk} sk={sk} cfg={cfg} selected={strategyKey} onSelect={handleStrategyChange} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}