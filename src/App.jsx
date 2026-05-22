// src/App.jsx
import { useState, useEffect } from "react";
import LiveDashboard from "./pages/LiveDashboard";
import Signals from "./pages/Signals";
import Trader from "./pages/Trader";
import Chat from "./pages/Chat";
import "./styles/globals.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DEFAULT_WATCHLIST = [
  "SPY","VOO","JEPI","JEPQ","SCHD","SGOV",
  "MSFT","AAPL","NVDA","GOOGL","AMZN","META","HOOD"
];

const TABS = [
  { id: "live",    label: "Live Prices", icon: "📈" },
  { id: "signals", label: "AI Signals",  icon: "⚡" },
  { id: "trader",  label: "Auto-Trader", icon: "🤖" },
  { id: "chat",    label: "AI Chat",     icon: "💬" },
];

export default function App() {
  const [tab, setTab]           = useState("live");
  const [watchlist, setWatchlist] = useState(DEFAULT_WATCHLIST);
  const [wlLoaded, setWlLoaded]  = useState(false);

  // Load watchlist from backend on startup
  useEffect(() => {
    fetch(`${API}/api/watchlist/`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.symbols?.length > 0) {
          setWatchlist(data.symbols);
        }
      })
      .catch(() => {})
      .finally(() => setWlLoaded(true));
  }, []);

  // Persist add to backend
  const addStock = async (symbol) => {
    const sym = symbol.toUpperCase().trim();
    if (!sym || watchlist.includes(sym)) return;
    setWatchlist(prev => [...prev, sym]);
    try {
      await fetch(`${API}/api/watchlist/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym }),
      });
    } catch {}
  };

  // Persist remove to backend
  const removeStock = async (symbol) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
    try {
      await fetch(`${API}/api/watchlist/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
    } catch {}
  };

  if (!wlLoaded) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0d1117",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'IBM Plex Mono', monospace", color: "#58a6ff", fontSize: 14,
      }}>
        <div>
          <div style={{ fontSize: 24, marginBottom: 8, textAlign: "center" }}>SIGNAL // BOARD</div>
          <div style={{ color: "#6e7681", fontSize: 11 }}>Loading watchlist...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }
      `}</style>

      {/* Nav — shown on non-live tabs */}
      {tab !== "live" && (
        <header style={{
          display: "flex", alignItems: "center",
          padding: "0 20px", height: 48,
          background: "#010409", borderBottom: "1px solid #21262d", gap: 8,
        }}>
          <button onClick={() => setTab("live")} style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14, fontWeight: 700, color: "#e6edf3",
            marginRight: 12, background: "none", border: "none", cursor: "pointer",
          }}>
            SIGNAL <span style={{ color: "#58a6ff" }}>//</span> BOARD
          </button>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 8,
              background: tab === t.id ? "#1f6feb" : "transparent",
              color: tab === t.id ? "#fff" : "#8b949e",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
              fontWeight: tab === t.id ? 700 : 400,
              border: tab === t.id ? "1px solid #1f6feb" : "1px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </header>
      )}

      {/* Pages */}
      <div style={{ flex: 1 }}>
        {tab === "live" && (
          <LiveDashboard
            watchlist={watchlist}
            onAdd={addStock}
            onRemove={removeStock}
            onNavigate={setTab}
            tabs={TABS}
            activeTab={tab}
          />
        )}
        {tab !== "live" && (
          <main style={{ padding: "20px", maxWidth: 1400, width: "100%", margin: "0 auto" }}>
            {tab === "signals" && <Signals watchlist={watchlist} />}
            {tab === "trader"  && <Trader  watchlist={watchlist} />}
            {tab === "chat"    && <Chat    watchlist={watchlist} />}
          </main>
        )}
      </div>
    </div>
  );
}