// src/lib/api.js
// Single source of truth for all backend API calls.
// Automatically attaches Firebase ID token to every request.

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";

// Token getter — set by App.jsx after auth state resolves
let _getToken = () => null;
export function setTokenGetter(fn) { _getToken = fn; }

async function authHeaders() {
  const token = await _getToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

async function get(path) {
  const res = await fetch(`${API}${path}`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: await authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

async function del(path) {
  const res = await fetch(`${API}${path}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
  return res.json();
}

// ── Prices ────────────────────────────────────────────────────────────────────
export const getPrices   = ()         => get("/api/prices/");
export const getQuote    = (symbol)   => get(`/api/quote/${symbol}`);
export const getBatch    = (symbols)  => get(`/api/quote/batch/${symbols.join(",")}`);

// ── Signals ───────────────────────────────────────────────────────────────────
export const getSignals  = ()         => get("/api/signals");
export const analyzeAll  = ()         => post("/api/signals/run-all");
export const analyzeOne  = (symbol)   => get(`/api/signals/${symbol}`);
export const deleteSignalSnapshot = (snapshotId) => del(`/api/signals/snapshot/${snapshotId}`);

// Expose token getter for direct use in components that need raw auth headers
export const getToken = () => _getToken();

// On-demand signal — Live Prices Signal tab only (24h cache, insider + sentiment)
export const getOnDemandSignal = (symbol) => post("/api/ondemand/signal", { symbol });

// ── Watchlist (protected — requires auth) ────────────────────────────────────
export const getWatchlist    = ()       => get("/api/watchlist/");
export const addToWatchlist  = (symbol) => post(`/api/watchlist/${symbol}`);
export const removeFromWatchlist = (symbol) => del(`/api/watchlist/${symbol}`);

// ── Trader ────────────────────────────────────────────────────────────────────
export const getTrader   = ()         => get("/api/trader");
export const getTrades   = ()         => get("/api/trader/trades");

// ── News ──────────────────────────────────────────────────────────────────────
export const getNews     = (symbol)   => get(`/api/news/${symbol}`);

// ── Alerts ────────────────────────────────────────────────────────────────────
export const getAlerts   = ()         => get("/api/alerts");

// ── Chat ──────────────────────────────────────────────────────────────────────
export const sendChat = (message, watchlist = []) =>
  post("/api/chat", { message, watchlist });

// ── WebSocket price stream ────────────────────────────────────────────────────
export function connectPriceStream(onMessage, onClose) {
  const WS = import.meta.env.VITE_WS_URL || "wss://signalboard.duckdns.org";
  const ws = new WebSocket(`${WS}/ws/prices`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error("WS parse error", e);
    }
  };

  ws.onclose = () => { if (onClose) onClose(); };
  ws.onerror = (e) => console.error("WS error", e);

  return ws;
}

// ── Portfolio / Auto-Trader ───────────────────────────────────────────────────
// Add these exports to src/lib/api.js

export const getPortfolio          = ()          => get("/api/portfolio/");
export const getPortfolioWallet    = ()          => get("/api/portfolio/wallet");
export const getPortfolioPositions = ()          => get("/api/portfolio/positions");
export const getPortfolioPnl       = ()          => get("/api/portfolio/pnl");
export const getPortfolioTrades    = (limit=50)  => get(`/api/portfolio/trades?limit=${limit}`);
export const getPortfolioTransactions = (limit=50) => get(`/api/portfolio/transactions?limit=${limit}`);
export const getStrategies         = ()          => get("/api/portfolio/strategies");

export const portfolioDeposit      = (amount)    => post("/api/portfolio/deposit",  { amount });
export const portfolioWithdraw     = (amount)    => post("/api/portfolio/withdraw", { amount });
export const portfolioReset        = ()          => post("/api/portfolio/reset");
export const portfolioSetStrategy  = (strategy, stop_loss_pct) =>
  post("/api/portfolio/strategy", { strategy, ...(stop_loss_pct != null ? { stop_loss_pct } : {}) });
export const portfolioToggle       = (is_active) => post("/api/portfolio/toggle",    { is_active });
export const portfolioAcceptAgreement = ()       => post("/api/portfolio/agreement");
export const portfolioManualTrade = (symbol, action, { amountUsd, shares } = {}) =>
  post("/api/portfolio/trade", {
    symbol,
    action,
    ...(amountUsd != null ? { amount_usd: amountUsd } : {}),
    ...(shares    != null ? { shares }                : {}),
  });

// Admin
export const getAutoTraderStatus   = ()          => get("/api/portfolio/admin/status");
export const setKillSwitch         = (enabled)   => post("/api/portfolio/admin/kill-switch", { enabled });