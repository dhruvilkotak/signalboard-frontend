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
export const getPrices   = ()         => get("/api/prices");
export const getQuote    = (symbol)   => get(`/api/quote/${symbol}`);
export const getBatch    = (symbols)  => get(`/api/quote/batch/${symbols.join(",")}`);

// ── Signals ───────────────────────────────────────────────────────────────────
export const getSignals  = ()         => get("/api/signals");
export const analyzeAll  = ()         => post("/api/signals/run-all");
export const analyzeOne  = (symbol)   => get(`/api/signals/${symbol}`);

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
