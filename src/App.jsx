// src/App.jsx
import { useState } from "react";
import LiveDashboard from "./pages/LiveDashboard";
import NewsFeed from "./pages/NewsFeed";
import Signals from "./pages/Signals";
import Trader from "./pages/Trader";
import Chat from "./pages/Chat";
import "./styles/globals.css";

const TABS = [
  { id: "live",    label: "Live Prices", icon: "📈" },
  { id: "news",    label: "News",        icon: "📰" },
  { id: "signals", label: "AI Signals",  icon: "⚡" },
  { id: "trader",  label: "Auto-Trader", icon: "🤖" },
  { id: "chat",    label: "AI Chat",     icon: "💬" },
];

export default function App() {
  const [tab, setTab] = useState("live");

  return (
    <div style={{ minHeight: "100vh", background: "#080b14", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Nav tabs - only show when not on Live tab (Live has its own header) */}
      {tab !== "live" && (
        <header style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "0 16px", height: 52,
          background: "#0a0d16", borderBottom: "1px solid #1a1f2e",
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14, fontWeight: 700, color: "#e8eaf0",
            marginRight: 16, letterSpacing: -0.5,
          }}>
            SIGNAL <span style={{ color: "#00d4a8" }}>//</span> BOARD
          </span>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 8,
              background: tab === t.id ? "#1a1f2e" : "transparent",
              color: tab === t.id ? "#e8eaf0" : "#5a6278",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, fontWeight: 500,
              border: tab === t.id ? "1px solid #2a3040" : "1px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </header>
      )}

      {/* Live dashboard has its own nav integration */}
      {tab === "live" && (
        <div style={{ position: "relative" }}>
          {/* Tab switcher overlay inside live dashboard header */}
          <div style={{
            position: "absolute", top: 0, left: "50%",
            transform: "translateX(-50%)",
            display: "flex", gap: 4, zIndex: 10,
            padding: "10px 0",
          }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px", borderRadius: 7,
                background: tab === t.id ? "#00d4a8" : "#1a1f2e",
                color: tab === t.id ? "#080b14" : "#5a6278",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, fontWeight: 700,
                border: "none", cursor: "pointer",
                transition: "all 0.15s",
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Page content */}
      <div style={{ flex: 1 }}>
        {tab === "live"    && <LiveDashboard />}
        {tab === "news"    && <NewsFeed prices={{}} />}
        {tab === "signals" && <Signals prices={{}} />}
        {tab === "trader"  && <Trader prices={{}} />}
        {tab === "chat"    && <Chat prices={{}} />}
      </div>
    </div>
  );
}
