// src/App.jsx
// Root component — auth gate, tab navigation, admin tab for admins

import { useState, useEffect, createContext, useContext } from "react";
import { useAuth } from "./hooks/useAuth";
import { setTokenGetter, getWatchlist, addToWatchlist, removeFromWatchlist } from "./lib/api";
import { usePrices } from "./hooks/usePrices";

import Login         from "./pages/Login";
import LiveDashboard from "./pages/LiveDashboard";
import Signals       from "./pages/Signals";
import Trader        from "./pages/Trader";
import Chat          from "./pages/Chat";
// Admin page — only rendered for admin users
const Admin = () => import("./pages/Admin").then(m => m.default);

export const AuthContext = createContext(null);
export const useAuthContext = () => useContext(AuthContext);

const DEFAULT_TICKERS = ["SPY","VOO","JEPI","JEPQ","SCHD","SGOV","MSFT","AAPL","NVDA","GOOGL","AMZN","META","HOOD"];

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState("prices");
  const [watchlist, setWatchlist] = useState(DEFAULT_TICKERS);
  const [AdminPage, setAdminPage] = useState(null);
  const { prices, connected } = usePrices();

  // Wire token into api.js
  useEffect(() => {
    setTokenGetter(() => auth.user?.getIdToken() ?? Promise.resolve(null));
  }, [auth.user]);

  // Load watchlist from Firestore after login
  useEffect(() => {
    if (!auth.user) return;
    getWatchlist()
      .then(data => setWatchlist(data.symbols || DEFAULT_TICKERS))
      .catch(() => setWatchlist(DEFAULT_TICKERS));
  }, [auth.user]);

  // Lazy-load Admin page only for admins
  useEffect(() => {
    if (auth.isAdmin && !AdminPage) {
      import("./pages/Admin").then(m => setAdminPage(() => m.default));
    }
  }, [auth.isAdmin]);

  const handleAdd = async (symbol) => {
    try {
      const data = await addToWatchlist(symbol);
      setWatchlist(data.symbols);
    } catch (e) { console.error(e); }
  };

  const handleRemove = async (symbol) => {
    try {
      const data = await removeFromWatchlist(symbol);
      setWatchlist(data.symbols);
    } catch (e) { console.error(e); }
  };

  // ── Loading splash ────────────────────────────────────────────────────────
  if (auth.user === undefined) {
    return (
      <div style={splash}>
        <span style={splashText}>SignalBoard</span>
        <span style={splashSub}>Loading…</span>
      </div>
    );
  }

  // ── Not logged in → Login page ────────────────────────────────────────────
  if (!auth.user) {
    return (
      <Login
        onLogin={auth.loginEmail}
        onGoogle={auth.loginGoogle}
        error={auth.error}
        loading={auth.loading}
      />
    );
  }

  // ── Build tab list (admin gets extra tab) ─────────────────────────────────
  const TABS = [
    { id: "prices",  label: "Live Prices" },
    { id: "signals", label: "AI Signals"  },
    { id: "trader",  label: "Auto-Trader" },
    { id: "chat",    label: "AI Chat"     },
    ...(auth.isAdmin ? [{ id: "admin", label: "⚙ Admin" }] : []),
  ];

  // ── Logged in → Main app ──────────────────────────────────────────────────
  return (
    <AuthContext.Provider value={auth}>
      <div style={appWrap}>

        {/* Header */}
        <header style={header}>
          <span style={logoText}>SignalBoard</span>
          <div style={headerRight}>
            <span style={wsStatus}>{connected ? "🟢 Live" : "🔴 Offline"}</span>
            {auth.idleWarning && <span style={{fontSize:11,color:"#f0a000",background:"#f0a00015",border:"1px solid #f0a00040",borderRadius:4,padding:"2px 8px"}}>⏱ Signing out in 5 min</span>}
            {auth.isAdmin && <span style={adminBadge}>Admin</span>}
            <span style={userEmail}>{auth.user.email || auth.user.displayName}</span>
            <button style={logoutBtn} onClick={auth.logout}>Sign out</button>
          </div>
        </header>

        {/* Tab bar */}
        <nav style={tabBar}>
          {TABS.map(t => (
            <button
              key={t.id}
              style={{ ...tabBtn, ...(tab === t.id ? tabBtnActive : {}) }}
              onClick={() => setTab(t.id)}
            >{t.label}</button>
          ))}
        </nav>

        {/* Page content */}
        <main style={main}>
          {tab === "prices"  && <LiveDashboard watchlist={watchlist} onAdd={handleAdd} onRemove={handleRemove} prices={prices} />}
          {tab === "signals" && <Signals watchlist={watchlist} />}
          {tab === "trader"  && <Trader watchlist={watchlist} />}
          {tab === "chat"    && <Chat watchlist={watchlist} />}
          {tab === "admin"   && auth.isAdmin && AdminPage && <AdminPage />}
          {tab === "admin"   && !auth.isAdmin && <div style={denied}>Access denied.</div>}
        </main>

      </div>
    </AuthContext.Provider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const splash     = { minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#0d1117" };
const splashText = { fontSize:28, fontWeight:700, color:"#e6edf3", letterSpacing:"-0.5px" };
const splashSub  = { fontSize:14, color:"#8b949e", marginTop:8 };
const appWrap    = { minHeight:"100vh", display:"flex", flexDirection:"column", background:"var(--color-bg,#0d1117)", color:"var(--color-text,#e6edf3)" };
const header     = { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 1.5rem", height:52, borderBottom:"1px solid var(--color-border,#30363d)", background:"var(--color-surface,#161b22)", flexShrink:0 };
const logoText   = { fontSize:18, fontWeight:700, color:"var(--color-text,#e6edf3)", letterSpacing:"-0.5px" };
const headerRight= { display:"flex", alignItems:"center", gap:12 };
const wsStatus   = { fontSize:12 };
const adminBadge = { fontSize:11, background:"#388bfd22", border:"1px solid #388bfd55", color:"#58a6ff", borderRadius:4, padding:"2px 7px", fontWeight:600 };
const userEmail  = { fontSize:12, color:"#8b949e", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" };
const logoutBtn  = { padding:"4px 10px", background:"transparent", border:"1px solid #30363d", borderRadius:6, color:"#8b949e", fontSize:12, cursor:"pointer" };
const tabBar     = { display:"flex", borderBottom:"1px solid var(--color-border,#30363d)", background:"var(--color-surface,#161b22)", padding:"0 1rem", flexShrink:0 };
const tabBtn     = { padding:"10px 16px", border:"none", borderBottom:"2px solid transparent", background:"transparent", color:"#8b949e", fontSize:13, fontWeight:500, cursor:"pointer", transition:"all 0.15s" };
const tabBtnActive = { color:"#e6edf3", borderBottomColor:"#2ea043" };
const main       = { flex:1, overflow:"auto", padding:"1.5rem" };
const denied     = { color:"#f85149", padding:"2rem", fontSize:14 };