// src/lib/api.js
// Single source of truth for all backend API calls.
// Automatically attaches Firebase ID token to every request.

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";

let _getToken = () => Promise.resolve(null);
export function setTokenGetter(fn) { _getToken = fn; }

let _firebaseAuth = null;
export function setFirebaseAuth(auth) { _firebaseAuth = auth; }

async function authHeaders() {
  let token = null;
  if (_firebaseAuth?.currentUser) {
    try {
      token = await _firebaseAuth.currentUser.getIdToken();
    } catch (e) {
      console.warn("[API] getIdToken failed:", e.message);
    }
  } else {
    token = await _getToken();
  }
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

const IS_DEV = import.meta.env.DEV;
function apiLog(method, path, status, ok) {
  if (!IS_DEV) return;
  const style = ok ? "color:#3fb950" : "color:#f85149";
  console.log(`%c[API] ${method} ${path} → ${status}`, style);
}

async function get(path) {
  const headers = await authHeaders();
  const hasToken = !!headers.Authorization;
  if (IS_DEV && !hasToken) console.warn(`[API] GET ${path} — no auth token`);
  const res = await fetch(`${API}${path}`, { headers });
  apiLog("GET", path, res.status, res.ok);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const headers = await authHeaders();
  const hasToken = !!headers.Authorization;
  if (IS_DEV && !hasToken) console.warn(`[API] POST ${path} — no auth token`);
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  apiLog("POST", path, res.status, res.ok);
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

async function del(path) {
  const headers = await authHeaders();
  const res = await fetch(`${API}${path}`, { method: "DELETE", headers });
  apiLog("DELETE", path, res.status, res.ok);
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
export const getToken = () => _getToken();
export const getOnDemandSignal = (symbol) => post("/api/ondemand/signal", { symbol });

// ── Watchlist ─────────────────────────────────────────────────────────────────
export const getWatchlist        = ()       => get("/api/watchlist/");
export const addToWatchlist      = (symbol) => post(`/api/watchlist/${symbol}`);
export const removeFromWatchlist = (symbol) => del(`/api/watchlist/${symbol}`);

// ── Trader (legacy) ───────────────────────────────────────────────────────────
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
    try { onMessage(JSON.parse(event.data)); } catch (e) { console.error("WS parse error", e); }
  };
  ws.onclose = () => { if (onClose) onClose(); };
  ws.onerror = (e) => console.error("WS error", e);
  return ws;
}

// ── Portfolio v4 ──────────────────────────────────────────────────────────────
export const getPortfolioOverview     = ()             => get("/api/portfolio/overview");
export const getPortfolioSummary      = ()             => get("/api/portfolio/summary");
export const getStrategies            = ()             => get("/api/portfolio/strategies");
export const getPortfolioTransactions = (limit = 50)   => get(`/api/portfolio/transactions?limit=${limit}`);

export const getManualPositions       = ()             => get("/api/portfolio/manual/positions");
export const getManualTrades          = (limit = 50)   => get(`/api/portfolio/manual/trades?limit=${limit}`);
export const manualBuy                = (symbol, { amountUsd, shares } = {}) =>
  post("/api/portfolio/manual/buy", {
    symbol,
    ...(amountUsd != null ? { amount_usd: amountUsd } : {}),
    ...(shares    != null ? { shares }                : {}),
  });
export const manualSell               = (symbol, shares = null) =>
  post("/api/portfolio/manual/sell", { symbol, ...(shares != null ? { shares } : {}) });

export const getStrategyPositions     = (sk)           => get(`/api/portfolio/strategy/${sk}/positions`);
export const getStrategyTrades        = (sk, limit=50) => get(`/api/portfolio/strategy/${sk}/trades?limit=${limit}`);
export const portfolioAcceptAgreement = ()             => post("/api/portfolio/agreement");
export const portfolioAllocate        = (strategy_key, amount, stop_loss_pct) =>
  post("/api/portfolio/allocate", { strategy_key, amount, ...(stop_loss_pct != null ? { stop_loss_pct } : {}) });
export const portfolioReduce          = (strategy_key, amount) =>
  post("/api/portfolio/reduce", { strategy_key, amount });
export const portfolioPause           = (strategy_key, paused) =>
  post("/api/portfolio/pause", { strategy_key, paused });
export const portfolioStop            = (strategy_key) =>
  post("/api/portfolio/stop", { strategy_key });

export const getAutoTraderStatus      = ()             => get("/api/portfolio/admin/status");
export const setKillSwitch            = (enabled)      => post("/api/portfolio/admin/kill-switch", { enabled });

// ── CHANGE 4: market status — polled every 60s by useMarketStatus hook ────────
export const getMarketStatus          = ()             => get("/api/market/status");