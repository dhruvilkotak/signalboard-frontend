import { useState, useEffect, createContext, useContext } from "react";
import { useAuth } from "./hooks/useAuth";
import { setTokenGetter, getWatchlist, addToWatchlist, removeFromWatchlist } from "./lib/api";
import { usePrices } from "./hooks/usePrices";

import Login        from "./pages/Login";
import LiveDashboard from "./pages/LiveDashboard";
import Signals      from "./pages/Signals";
import Trader       from "./pages/Trader";
import Chat         from "./pages/Chat";

export const AuthContext = createContext(null);
export const useAuthContext = () => useContext(AuthContext);

const TABS = [
  { id: "prices",  label: "Live Prices" },
  { id: "signals", label: "AI Signals"  },
  { id: "trader",  label: "Auto-Trader" },
  { id: "chat",    label: "AI Chat"     },
];

const DEFAULT_TICKERS = ["SPY","VOO","JEPI","JEPQ","SCHD","SGOV","MSFT","AAPL","NVDA","GOOGL","AMZN","META","HOOD"];

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState("prices");
  const [watchlist, setWatchlist] = useState(DEFAULT_TICKERS);
  const { prices, connected } = usePrices();

  useEffect(() => {
    setTokenGetter(() => auth.user?.getIdToken() ?? Promise.resolve(null));
  }, [auth.user]);

  // Load per-user watchlist from Firestore once logged in
  useEffect(() => {
    if (!auth.user) return;
    getWatchlist()
      .then(data => setWatchlist(data.symbols || DEFAULT_TICKERS))
      .catch(() => setWatchlist(DEFAULT_TICKERS));
  }, [auth.user]);

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

  if (auth.user === undefined) {
    return (
      <div style={splash}>
        <span style={splashText}>SignalBoard</span>
        <span style={splashSub}>Loading…</span>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <Login
        onLogin={auth.loginEmail}
        onRegister={auth.registerEmail}
        onGoogle={auth.loginGoogle}
        error={auth.error}
        loading={auth.loading}
      />
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      <div style={appWrap}>
        <header style={header}>
          <span style={logoText}>SignalBoard</span>
          <div style={headerRight}>
            <span style={wsStatus}>{connected ? "🟢 Live" : "🔴 Offline"}</span>
            <span style={userEmail}>{auth.user.email || auth.user.displayName}</span>
            <button style={logoutBtn} onClick={auth.logout}>Sign out</button>
          </div>
        </header>

        <nav style={tabBar}>
          {TABS.map(t => (
            <button
              key={t.id}
              style={{ ...tabBtn, ...(tab === t.id ? tabBtnActive : {}) }}
              onClick={() => setTab(t.id)}
            >{t.label}</button>
          ))}
        </nav>

        <main style={main}>
          {tab === "prices"  && <LiveDashboard watchlist={watchlist} onAdd={handleAdd} onRemove={handleRemove} prices={prices} />}
          {tab === "signals" && <Signals watchlist={watchlist} />}
          {tab === "trader"  && <Trader watchlist={watchlist} />}
          {tab === "chat"    && <Chat watchlist={watchlist} />}
        </main>
      </div>
    </AuthContext.Provider>
  );
}

const splash     = { minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#0d1117" };
const splashText = { fontSize:28, fontWeight:700, color:"#e6edf3", letterSpacing:"-0.5px" };
const splashSub  = { fontSize:14, color:"#8b949e", marginTop:8 };
const appWrap    = { minHeight:"100vh", display:"flex", flexDirection:"column", background:"var(--color-bg,#0d1117)", color:"var(--color-text,#e6edf3)" };
const header     = { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 1.5rem", height:52, borderBottom:"1px solid var(--color-border,#30363d)", background:"var(--color-surface,#161b22)" };
const logoText   = { fontSize:18, fontWeight:700, color:"var(--color-text,#e6edf3)", letterSpacing:"-0.5px" };
const headerRight= { display:"flex", alignItems:"center", gap:12 };
const wsStatus   = { fontSize:12 };
const userEmail  = { fontSize:12, color:"#8b949e", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" };
const logoutBtn  = { padding:"4px 10px", background:"transparent", border:"1px solid #30363d", borderRadius:6, color:"#8b949e", fontSize:12, cursor:"pointer" };
const tabBar     = { display:"flex", borderBottom:"1px solid var(--color-border,#30363d)", background:"var(--color-surface,#161b22)", padding:"0 1rem" };
const tabBtn     = { padding:"10px 16px", border:"none", borderBottom:"2px solid transparent", background:"transparent", color:"#8b949e", fontSize:13, fontWeight:500, cursor:"pointer", transition:"all 0.15s" };
const tabBtnActive = { color:"#e6edf3", borderBottomColor:"#2ea043" };
const main       = { flex:1, overflow:"auto", padding:"1.5rem" };
