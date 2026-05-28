// src/App.jsx — v3 (portfolio bar uses new getPortfolioSummary)
// Same as before but uses getPortfolioSummary instead of getPortfolioWallet

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useAuth } from "./hooks/useAuth";
import { setTokenGetter, getWatchlist, addToWatchlist, removeFromWatchlist, getPortfolioSummary } from "./lib/api";
import { usePrices } from "./hooks/usePrices";

import Login         from "./pages/Login";
import LiveDashboard from "./pages/LiveDashboard";
import PendingScreen from "./pages/PendingScreen";
import Signals       from "./pages/Signals";
import Trader        from "./pages/Trader";
import Chat          from "./pages/Chat";

export const AuthContext = createContext(null);
export const useAuthContext = () => useContext(AuthContext);

const DEFAULT_TICKERS = ["SPY","VOO","JEPI","JEPQ","SCHD","SGOV","MSFT","AAPL","NVDA","GOOGL","AMZN","META","HOOD"];

export default function App() {
  const auth = useAuth();
  const [tab,            setTab]            = useState("prices");
  const [watchlist,      setWatchlist]      = useState(DEFAULT_TICKERS);
  const [AdminPage,      setAdminPage]      = useState(null);
  const [portfolioValue, setPortfolioValue] = useState(null);
  const { prices, connected } = usePrices();

  // Wire token into api.js — use auth.token (already fetched by useAuth)
  // so it's available synchronously. No race condition with API calls.
  useEffect(() => {
    if (auth.token) {
      // Token is already available — set it synchronously
      setTokenGetter(() => Promise.resolve(auth.token));
    } else {
      // Fallback: call getIdToken() for token refresh cases
      setTokenGetter(() => auth.user?.getIdToken() ?? Promise.resolve(null));
    }
  }, [auth.token, auth.user]);

  // Step 2: fetch data — 100ms delay ensures token getter is propagated
  // before the first authenticated API call fires
  const fetchPortfolioSummary = useCallback(
    () => getPortfolioSummary().then(s => setPortfolioValue(s)).catch(() => {}),
    []
  );

  useEffect(() => {
    if (!auth.user || auth.isPending) return;

    getWatchlist()
      .then(data => setWatchlist(data.symbols || DEFAULT_TICKERS))
      .catch(() => setWatchlist(DEFAULT_TICKERS));
    fetchPortfolioSummary();

    const iv = setInterval(fetchPortfolioSummary, 60000);
    return () => clearInterval(iv);
  }, [auth.user, auth.isPending, fetchPortfolioSummary]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab === "trader") fetchPortfolioSummary(); // instant header refresh on trader tab
  };

  useEffect(() => {
    if (auth.isAdmin && !AdminPage) {
      import("./pages/Admin").then(m => setAdminPage(() => m.default));
    }
  }, [auth.isAdmin]);

  const handleAdd    = async (sym) => {
    try { const d = await addToWatchlist(sym); setWatchlist(d.symbols); } catch {}
  };
  const handleRemove = async (sym) => {
    try { const d = await removeFromWatchlist(sym); setWatchlist(d.symbols); } catch {}
  };

  if (auth.user === undefined) return (
    <div style={splash}><span style={splashText}>SignalBoard</span><span style={splashSub}>Loading…</span></div>
  );
  if (!auth.user) return <Login onLogin={auth.loginEmail} onGoogle={auth.loginGoogle} error={auth.error} loading={auth.loading} />;
  if (auth.isPending) return <PendingScreen user={auth.user} />;

  const TABS = [
    { id: "prices",  label: "Live Prices" },
    { id: "signals", label: "AI Signals"  },
    { id: "trader",  label: "Auto-Trader" },
    { id: "chat",    label: "AI Chat"     },
    ...(auth.isAdmin ? [{ id: "admin", label: "⚙ Admin" }] : []),
  ];

  const tv     = portfolioValue?.total_value    ?? 0;
  const avail  = portfolioValue?.available_cash ?? 0;

  return (
    <AuthContext.Provider value={auth}>
      <div style={appWrap}>
        <header style={header}>
          <span style={logoText}>SignalBoard</span>
          <div style={headerRight}>
            {/* Portfolio mini bar */}
            {portfolioValue && (
              <button onClick={() => handleTabChange("trader")} style={portfolioBar} title="Click to open Auto-Trader">
                <span style={{ fontSize: 12 }}>💼</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e6edf3", fontFamily: "'Space Mono',monospace" }}>
                  ${tv.toFixed(2)}
                </span>
                <span style={{ fontSize: 10, color: "#6e7681", fontFamily: "'Space Mono',monospace" }}>
                  Cash: ${avail.toFixed(0)}
                </span>
                <span style={{ fontSize: 9, color: "#6e7681", fontFamily: "'Space Mono',monospace" }}>PAPER</span>
              </button>
            )}
            <span style={wsStatus}>{connected ? "🟢 Live" : "🔴 Offline"}</span>
            {auth.idleWarning && (
              <span style={{ fontSize:11, color:"#f0a000", background:"#f0a00015", border:"1px solid #f0a00040", borderRadius:4, padding:"2px 8px" }}>
                ⏱ Signing out in 5 min
              </span>
            )}
            {auth.isAdmin && <span style={adminBadge}>Admin</span>}
            <span style={userEmail}>{auth.user.email || auth.user.displayName}</span>
            <button style={logoutBtn} onClick={auth.logout}>Sign out</button>
          </div>
        </header>

        <nav style={tabBar}>
          {TABS.map(t => (
            <button key={t.id} style={{ ...tabBtn, ...(tab === t.id ? tabBtnActive : {}) }} onClick={() => handleTabChange(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        <main style={main}>
          {tab === "prices"  && <LiveDashboard watchlist={watchlist} onAdd={handleAdd} onRemove={handleRemove} prices={prices} />}
          {tab === "signals" && <Signals watchlist={watchlist} />}
          {tab === "trader"  && <Trader onPortfolioUpdate={setPortfolioValue} />}
          {tab === "chat"    && <Chat watchlist={watchlist} />}
          {tab === "admin"   && auth.isAdmin && AdminPage && <AdminPage />}
          {tab === "admin"   && !auth.isAdmin && <div style={denied}>Access denied.</div>}
        </main>
      </div>
    </AuthContext.Provider>
  );
}

const splash       = { minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#0d1117" };
const splashText   = { fontSize:28, fontWeight:700, color:"#e6edf3", letterSpacing:"-0.5px" };
const splashSub    = { fontSize:14, color:"#8b949e", marginTop:8 };
const appWrap      = { minHeight:"100vh", display:"flex", flexDirection:"column", background:"var(--color-bg,#0d1117)", color:"var(--color-text,#e6edf3)" };
const header       = { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 1.5rem", height:52, borderBottom:"1px solid var(--color-border,#30363d)", background:"var(--color-surface,#161b22)", flexShrink:0 };
const logoText     = { fontSize:18, fontWeight:700, color:"var(--color-text,#e6edf3)", letterSpacing:"-0.5px" };
const headerRight  = { display:"flex", alignItems:"center", gap:10 };
const wsStatus     = { fontSize:12 };
const adminBadge   = { fontSize:11, background:"#388bfd22", border:"1px solid #388bfd55", color:"#58a6ff", borderRadius:4, padding:"2px 7px", fontWeight:600 };
const userEmail    = { fontSize:12, color:"#8b949e", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" };
const logoutBtn    = { padding:"4px 10px", background:"transparent", border:"1px solid #30363d", borderRadius:6, color:"#8b949e", fontSize:12, cursor:"pointer" };
const tabBar       = { display:"flex", borderBottom:"1px solid var(--color-border,#30363d)", background:"var(--color-surface,#161b22)", padding:"0 1rem", flexShrink:0 };
const tabBtn       = { padding:"10px 16px", border:"none", borderBottom:"2px solid transparent", background:"transparent", color:"#8b949e", fontSize:13, fontWeight:500, cursor:"pointer", transition:"all 0.15s" };
const tabBtnActive = { color:"#e6edf3", borderBottomColor:"#2ea043" };
const main         = { flex:1, overflow:"auto", padding:"1.5rem" };
const denied       = { color:"#f85149", padding:"2rem", fontSize:14 };
const portfolioBar = { display:"flex", alignItems:"center", gap:6, background:"#0d1117", border:"1px solid #30363d", borderRadius:7, padding:"4px 12px", cursor:"pointer", transition:"border-color 0.15s" };