// src/lib/api.js — all backend calls in one place
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Prices
  prices: {
    all: () => get("/api/prices/"),
    one: (symbol) => get(`/api/prices/${symbol}`),
  },
  // News
  news: {
    all: () => get("/api/news/"),
    forSymbol: (symbol) => get(`/api/news/${symbol}`),
  },
  // Signals
  signals: {
    all: () => get("/api/signals/"),
    one: (symbol, force = false) => get(`/api/signals/${symbol}?force=${force}`),
  },
  // Trader
  trader: {
    account: () => get("/api/trader/account"),
    positions: () => get("/api/trader/positions"),
    performance: () => get("/api/trader/performance"),
    trades: () => get("/api/trader/trades"),
    execute: (symbol) => post(`/api/trader/execute/${symbol}`),
    runAll: () => post("/api/trader/run-all"),
  },
  // Alerts
  alerts: {
    list: () => get("/api/alerts/"),
    create: (config) => post("/api/alerts/", config),
  },
  // Chat
  chat: {
    ask: (question, symbol = null) => post("/api/chat/", { question, symbol }),
  },
};

// WebSocket price stream
export function connectPriceStream(onMessage) {
  const WS = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
  const ws = new WebSocket(`${WS}/ws/prices`);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  ws.onerror = (e) => console.error("WS error", e);
  return ws;
}
