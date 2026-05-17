// src/App.jsx — main app with 5 tabs
import { useState, useEffect } from "react";
import { connectPriceStream, api } from "./lib/api";
import Watchlist from "./pages/Watchlist";
import NewsFeed from "./pages/NewsFeed";
import Signals from "./pages/Signals";
import Trader from "./pages/Trader";
import Chat from "./pages/Chat";
import "./styles/globals.css";

const TABS = [
  { id: "watchlist", label: "Watchlist",   icon: "📊" },
  { id: "news",      label: "News",        icon: "📰" },
  { id: "signals",   label: "AI Signals",  icon: "⚡" },
  { id: "trader",    label: "Auto-Trader", icon: "🤖" },
  { id: "chat",      label: "AI Chat",     icon: "💬" },
];

export default function App() {
  const [tab, setTab] = useState("watchlist");
  const [prices, setPrices] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Load prices immediately via REST
    api.prices.all().then(setPrices).catch(console.error);

    // Then upgrade to WebSocket for live updates
    const ws = connectPriceStream((msg) => {
      if (msg.type === "prices") {
        setPrices(msg.data);
        setConnected(true);
      }
    });
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    // Fallback polling if WS disconnects
    const poll = setInterval(() => {
      if (!connected) api.prices.all().then(setPrices).catch(console.error);
    }, 30000);

    return () => {
      ws.close();
      clearInterval(poll);
    };
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo">SIGNAL // BOARD</span>
          <span className={`dot ${connected ? "live" : "poll"}`} />
          <span className="status-label">{connected ? "LIVE" : "POLLING"}</span>
        </div>
        <div className="header-right">
          <span className="cost-badge">~$0.30/mo</span>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Page content */}
      <main className="main">
        {tab === "watchlist" && <Watchlist prices={prices} />}
        {tab === "news"      && <NewsFeed prices={prices} />}
        {tab === "signals"   && <Signals  prices={prices} />}
        {tab === "trader"    && <Trader   prices={prices} />}
        {tab === "chat"      && <Chat     prices={prices} />}
      </main>
    </div>
  );
}
