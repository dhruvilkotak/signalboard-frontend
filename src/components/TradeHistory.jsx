// src/components/TradeHistory.jsx
// Reusable component used by Trader.jsx trades + transactions tabs.
// Features: pagination, CSV export, daily P&L summary, balance statement.

import { useState, useMemo } from "react";

const MONO = "'Space Mono', monospace";
const PAGE_SIZE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt     = (n, d = 2) => (n ?? 0).toFixed(d);
const sign    = (n) => (n ?? 0) >= 0 ? "+" : "";
const pnlCls  = (n) => (n ?? 0) >= 0 ? "up" : "down";
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};
const fmtDay  = (iso) => iso ? new Date(iso).toLocaleDateString() : "—";

// ── CSV export ────────────────────────────────────────────────────────────────
function toCSV(rows, columns) {
  const header = columns.map(c => c.label).join(",");
  const body   = rows.map(r =>
    columns.map(c => {
      const val = c.get(r) ?? "";
      return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
    }).join(",")
  ).join("\n");
  return `${header}\n${body}`;
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Trade columns definition ──────────────────────────────────────────────────
const TRADE_COLS = [
  { label: "Date",       get: r => fmtDate(r.timestamp) },
  { label: "Symbol",     get: r => r.symbol },
  { label: "Action",     get: r => r.action },
  { label: "Shares",     get: r => fmt(r.shares, 4) },
  { label: "Price",      get: r => fmt(r.price) },
  { label: "Total",      get: r => fmt(r.total) },
  { label: "P&L",        get: r => r.pnl != null ? fmt(r.pnl) : "" },
  { label: "P&L %",      get: r => r.pnl_pct != null ? fmt(r.pnl_pct) : "" },
  { label: "Trigger",    get: r => r.trigger ?? "" },
  { label: "Balance",    get: r => fmt(r.balance_after) },
  { label: "Reason",     get: r => r.reason ?? "" },
];

const TX_COLS = [
  { label: "Date",           get: r => fmtDay(r.timestamp) },
  { label: "Type",           get: r => r.type },
  { label: "Amount",         get: r => fmt(r.amount) },
  { label: "Balance Before", get: r => fmt(r.balance_before) },
  { label: "Balance After",  get: r => fmt(r.balance_after) },
  { label: "Notes",          get: r => r.notes ?? "" },
];

// ── Daily P&L summary (trades only) ──────────────────────────────────────────
function DailyPnlSummary({ trades }) {
  const daily = useMemo(() => {
    const map = {};
    trades.forEach(t => {
      if (t.action !== "SELL" || t.pnl == null) return;
      const day = fmtDay(t.timestamp);
      if (!map[day]) map[day] = { day, pnl: 0, trades: 0 };
      map[day].pnl    = round2(map[day].pnl + (t.pnl ?? 0));
      map[day].trades += 1;
    });
    return Object.values(map).sort((a, b) => new Date(b.day) - new Date(a.day)).slice(0, 10);
  }, [trades]);

  if (!daily.length) return null;

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="stat-label" style={{ marginBottom: 10 }}>DAILY REALIZED P&L</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {daily.map(({ day, pnl, trades: count }) => (
          <div key={day} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="hint mono" style={{ width: 90, flexShrink: 0 }}>{day}</span>
            <div style={{ flex: 1, height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3,
                width: `${Math.min(100, Math.abs(pnl) / 50 * 100)}%`,
                background: pnl >= 0 ? "var(--green)" : "var(--red)",
                transition: "width 0.4s",
              }} />
            </div>
            <span className={`mono ${pnlCls(pnl)}`} style={{ fontSize: 12, width: 80, textAlign: "right", flexShrink: 0 }}>
              {sign(pnl)}${fmt(Math.abs(pnl))}
            </span>
            <span className="hint" style={{ width: 50, textAlign: "right", flexShrink: 0 }}>
              {count} trade{count !== 1 ? "s" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Balance statement (transactions) ─────────────────────────────────────────
function BalanceStatement({ transactions, wallet }) {
  const totalDeposited  = wallet?.total_deposited  ?? 0;
  const totalWithdrawn  = wallet?.total_withdrawn  ?? 0;
  const realizedPnl     = wallet?.realized_pnl     ?? 0;
  const currentBalance  = wallet?.balance          ?? 0;
  const currentInvested = wallet?.invested         ?? 0;
  const totalValue      = wallet?.total_value      ?? 0;

  const rows = [
    { label: "Total Deposited",       value: `$${fmt(totalDeposited)}`,  color: "var(--green)" },
    { label: "Total Withdrawn",       value: `-$${fmt(totalWithdrawn)}`, color: "var(--red)" },
    { label: "Realized P&L",          value: `${sign(realizedPnl)}$${fmt(Math.abs(realizedPnl))}`, color: realizedPnl >= 0 ? "var(--green)" : "var(--red)" },
    { label: "─────────────────",     value: "",  color: "var(--border)", isDiv: true },
    { label: "Cash Available",        value: `$${fmt(currentBalance)}`,  color: "var(--text1)" },
    { label: "Currently Invested",    value: `$${fmt(currentInvested)}`, color: "var(--blue)" },
    { label: "Total Portfolio Value", value: `$${fmt(totalValue)}`,      color: "var(--text1)", bold: true },
  ];

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="stat-label" style={{ marginBottom: 12 }}>BALANCE STATEMENT</div>
      {rows.map(({ label, value, color, isDiv, bold }) => (
        isDiv
          ? <div key={label} style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
          : (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text2)" }}>{label}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: bold ? 700 : 400, color }}>{value}</span>
            </div>
          )
      ))}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────
function FilterBar({ filters, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
      {filters.map(f => (
        <button
          key={f}
          className={`btn ${value === f ? "btn-primary" : ""}`}
          style={{ fontSize: 11, padding: "4px 10px" }}
          onClick={() => onChange(f)}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14 }}>
      <button className="btn" disabled={page === 0} onClick={() => onChange(0)} style={{ fontSize: 11 }}>«</button>
      <button className="btn" disabled={page === 0} onClick={() => onChange(page - 1)} style={{ fontSize: 11 }}>‹</button>
      <span className="hint mono">{page + 1} / {totalPages}</span>
      <button className="btn" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)} style={{ fontSize: 11 }}>›</button>
      <button className="btn" disabled={page >= totalPages - 1} onClick={() => onChange(totalPages - 1)} style={{ fontSize: 11 }}>»</button>
    </div>
  );
}

// ── Trade history tab ─────────────────────────────────────────────────────────
export function TradeHistoryTab({ trades }) {
  const [page,   setPage]   = useState(0);
  const [filter, setFilter] = useState("ALL");

  const filtered = useMemo(() => {
    if (filter === "ALL")  return trades;
    if (filter === "BUY")  return trades.filter(t => t.action === "BUY");
    if (filter === "SELL") return trades.filter(t => t.action === "SELL");
    if (filter === "AUTO") return trades.filter(t => t.trigger === "auto");
    if (filter === "STOP") return trades.filter(t => ["stop_loss","trailing_stop","hard_stop","sell_signal"].includes(t.trigger));
    if (filter === "MANUAL") return trades.filter(t => t.trigger === "manual");
    return trades;
  }, [trades, filter]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Summary stats
  const sells      = trades.filter(t => t.action === "SELL" && t.pnl != null);
  const winners    = sells.filter(t => t.pnl >= 0);
  const totalPnl   = round2(sells.reduce((s, t) => s + (t.pnl ?? 0), 0));
  const winRate    = sells.length ? Math.round((winners.length / sells.length) * 100) : 0;
  const avgPnl     = sells.length ? round2(totalPnl / sells.length) : 0;

  const handleExport = () => {
    const csv = toCSV(filtered, TRADE_COLS);
    downloadCSV(csv, `signalboard_trades_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div>
      {/* Summary stats */}
      {sells.length > 0 && (
        <div className="summary-grid" style={{ marginBottom: 14 }}>
          {[
            { label: "Total Trades",  value: String(trades.length),            className: "muted" },
            { label: "Closed",        value: String(sells.length),             className: "muted" },
            { label: "Win Rate",      value: `${winRate}%`,                    className: winRate >= 50 ? "up" : "down" },
            { label: "Realized P&L",  value: `${sign(totalPnl)}$${fmt(Math.abs(totalPnl))}`, className: pnlCls(totalPnl) },
            { label: "Avg P&L/Trade", value: `${sign(avgPnl)}$${fmt(Math.abs(avgPnl))}`,     className: pnlCls(avgPnl) },
          ].map(({ label, value, className }) => (
            <div key={label} className="summary-card">
              <div className="stat-label">{label}</div>
              <div className={`stat-value ${className}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Daily P&L chart */}
      <DailyPnlSummary trades={trades} />

      {/* Filter + export */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <FilterBar
          filters={["ALL", "BUY", "SELL", "AUTO", "STOP", "MANUAL"]}
          value={filter}
          onChange={(f) => { setFilter(f); setPage(0); }}
        />
        <button className="btn" style={{ fontSize: 11 }} onClick={handleExport}>
          ↓ Export CSV
        </button>
      </div>

      {/* Count */}
      <div className="hint" style={{ marginBottom: 10 }}>
        {filtered.length} trade{filtered.length !== 1 ? "s" : ""}
        {filter !== "ALL" ? ` (filtered by ${filter})` : ""}
      </div>

      {/* Trade list */}
      {paginated.length === 0 ? (
        <div className="card empty-state">No trades match this filter.</div>
      ) : paginated.map((t, i) => (
        <TradeRow key={i} t={t} />
      ))}

      <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}

// ── Single trade row ──────────────────────────────────────────────────────────
function TradeRow({ t }) {
  const [open, setOpen] = useState(false);
  const isBuy = t.action === "BUY";

  return (
    <div className="trade-card fade-in" style={{ cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
      <div className="trade-header">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={`badge ${isBuy ? "badge-buy" : "badge-sell"}`}>{t.action}</span>
          <span className="mono" style={{ fontWeight: 700 }}>{t.symbol}</span>
          <span className="trigger-badge">{t.trigger}</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {t.pnl != null && t.pnl !== 0 && (
            <span className={`mono ${pnlCls(t.pnl)}`} style={{ fontSize: 13, fontWeight: 700 }}>
              {sign(t.pnl)}${fmt(Math.abs(t.pnl))}
            </span>
          )}
          <span className="hint mono">{fmtDate(t.timestamp)}</span>
          <span className="hint">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      <div className="trade-meta">
        <span>{fmt(t.shares, 4)} sh @ <strong>${fmt(t.price)}</strong></span>
        <span>Total: ${fmt(t.total)}</span>
        {t.pnl_pct != null && t.pnl !== 0 && (
          <span className={pnlCls(t.pnl_pct)}>{sign(t.pnl_pct)}{fmt(t.pnl_pct)}%</span>
        )}
        <span className="hint">Balance after: ${fmt(t.balance_after)}</span>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          {t.reason && (
            <div className="trade-reason" style={{ marginBottom: 6 }}>
              "{t.reason.slice(0, 200)}{t.reason.length > 200 ? "…" : ""}"
            </div>
          )}
          <div className="stat-grid">
            {[
              ["Signal",    t.signal_confidence ?? "—"],
              ["Trigger",   t.trigger ?? "—"],
              ["Timestamp", fmtDate(t.timestamp)],
            ].map(([l, v]) => (
              <div key={l} className="stat-item">
                <span className="stat-label">{l}</span>
                <span className="stat-value">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Transaction history tab ───────────────────────────────────────────────────
export function TransactionHistoryTab({ transactions, wallet }) {
  const [page,   setPage]   = useState(0);
  const [filter, setFilter] = useState("ALL");

  const filtered = useMemo(() => {
    if (filter === "ALL") return transactions;
    return transactions.filter(t => t.type === filter.toLowerCase());
  }, [transactions, filter]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleExport = () => {
    const csv = toCSV(filtered, TX_COLS);
    downloadCSV(csv, `signalboard_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div>
      {/* Balance statement */}
      <BalanceStatement transactions={transactions} wallet={wallet} />

      {/* Filter + export */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <FilterBar
          filters={["ALL", "DEPOSIT", "WITHDRAW", "RESET", "STRATEGY_CHANGE"]}
          value={filter}
          onChange={(f) => { setFilter(f); setPage(0); }}
        />
        <button className="btn" style={{ fontSize: 11 }} onClick={handleExport}>
          ↓ Export CSV
        </button>
      </div>

      <div className="hint" style={{ marginBottom: 10 }}>
        {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
      </div>

      {paginated.length === 0 ? (
        <div className="card empty-state">No transactions match this filter.</div>
      ) : paginated.map((t, i) => (
        <TxRow key={i} t={t} />
      ))}

      <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}

// ── Single transaction row ────────────────────────────────────────────────────
function TxRow({ t }) {
  const amtColor = t.type === "withdraw" ? "down" : t.amount > 0 ? "up" : "";
  return (
    <div className="trade-card fade-in">
      <div className="trade-header">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge badge-dim" style={{ textTransform: "uppercase" }}>{t.type}</span>
          {t.amount > 0 && (
            <span className={`mono ${amtColor}`} style={{ fontWeight: 700 }}>
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

// ── Utils ─────────────────────────────────────────────────────────────────────
function round2(n) { return Math.round(n * 100) / 100; }