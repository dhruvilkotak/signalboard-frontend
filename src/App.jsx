// src/App.jsx
import { useState } from "react";
import LiveDashboard from "./pages/LiveDashboard";
import Signals from "./pages/Signals";
import Trader from "./pages/Trader";
import Chat from "./pages/Chat";
import "./styles/globals.css";

// News removed — it's already inside the Live Prices chart tab
const TABS = [
  { id: "live",    label: "Live Prices", icon: "📈" },
  { id: "signals", label: "AI Signals",  icon: "⚡" },
  { id: "trader",  label: "Auto-Trader", icon: "🤖" },
  { id: "chat",    label: "AI Chat",     icon: "💬" },
];

const NAV_STYLE = {
  btn: (active) => ({
    display: "flex", alignItems: "center", gap: 6,
    padding: "6px 14px", borderRadius: 8,
    background: active ? "#1f6feb" : "transparent",
    color: active ? "#fff" : "#8b949e",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12, fontWeight: active ? 700 : 400,
    border: active ? "1px solid #1f6feb" : "1px solid transparent",
    cursor: "pointer", transition: "all 0.15s",
    letterSpacing: 0.3,
  }),
};

export default function App() {
  const [tab, setTab] = useState("live");

  // Shared watchlist — passed to all tabs
  const [watchlist, setWatchlist] = useState([
    "SPY","VOO","JEPI","JEPQ","SCHD","SGOV",
    "MSFT","AAPL","NVDA","GOOGL","AMZN","META","HOOD",
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }
      `}</style>

      {/* Global nav — shown on all tabs except live (live has its own integrated nav) */}
      {tab !== "live" && (
        <header style={{
          display: "flex", alignItems: "center",
          padding: "0 20px", height: 48,
          background: "#010409",
          borderBottom: "1px solid #21262d",
          gap: 8,
        }}>
          {/* Logo */}
          <button onClick={() => setTab("live")} style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14, fontWeight: 700, color: "#e6edf3",
            marginRight: 12, letterSpacing: -0.5,
            background: "none", border: "none", cursor: "pointer",
          }}>
            SIGNAL BOARD
          </button>

          {/* Nav tabs */}
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={NAV_STYLE.btn(tab === t.id)}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </header>
      )}

      {/* Live dashboard — manages its own header with nav overlay */}
      {tab === "live" && (
        <LiveDashboard
          watchlist={watchlist}
          setWatchlist={setWatchlist}
          onNavigate={setTab}
          tabs={TABS}
          activeTab={tab}
        />
      )}

      {/* Other pages */}
      {tab !== "live" && (
        <main style={{ flex: 1, padding: "20px", maxWidth: 1400, width: "100%", margin: "0 auto" }}>
          {tab === "signals" && <Signals watchlist={watchlist} />}
          {tab === "trader"  && <Trader  watchlist={watchlist} />}
          {tab === "chat"    && <Chat    watchlist={watchlist} />}
        </main>
      )}
    </div>
  );
}
