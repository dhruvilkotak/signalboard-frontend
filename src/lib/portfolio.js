// src/lib/portfolio.js — pure calculations for the Home page (no React, easy to test).

export function allTimeReturn(summary = {}) {
  const total = summary.total_value ?? 0;
  const deposited = summary.total_deposited ?? total;
  const amount = total - deposited;
  return { amount, pct: deposited ? (amount / deposited) * 100 : 0 };
}

// Today's $ change of manual positions, from live quotes.
export function dayChange(positions = [], quotes = {}) {
  return positions.reduce((sum, p) => {
    const q = quotes[p.symbol];
    return q?.change_amt != null ? sum + q.change_amt * (p.shares ?? 0) : sum;
  }, 0);
}

export function positionValue(position, quote) {
  const price = quote?.price ?? position.current_price ?? 0;
  const gainPct = position.avg_buy_price
    ? ((price - position.avg_buy_price) / position.avg_buy_price) * 100
    : position.unrealized_pnl_pct ?? 0;
  return { value: price * (position.shares ?? 0), gainPct };
}

export function topMover(symbols = [], quotes = {}) {
  return symbols
    .filter(s => quotes[s]?.change_pct != null)
    .sort((a, b) => Math.abs(quotes[b].change_pct) - Math.abs(quotes[a].change_pct))[0] ?? null;
}

export function signalsLeft(access) {
  const q = access?.ondemand;
  if (!q || q.limit == null) return null;
  return { left: q.left ?? Math.max(q.limit - (q.used ?? 0), 0), limit: q.limit, weekly: q.period === "week" };
}

export function trialDaysLeft(access) {
  if (!access?.trial_ends_at) return null;
  return Math.max(0, Math.ceil((new Date(access.trial_ends_at) - Date.now()) / 86400000));
}

export function allocation(summary = {}) {
  return [
    { label: "Cash",        value: summary.available_cash ?? 0, color: "#5c6570" },
    { label: "Your stocks", value: summary.manual_value ?? 0,   color: "#58a6ff" },
    { label: "Auto-Trader", value: summary.strategy_value ?? 0, color: "var(--sb-brand)" },
  ];
}
