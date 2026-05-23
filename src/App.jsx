// src/App.jsx
// Root component — handles auth gate, tab navigation, shared state

import { useState, useEffect, createContext, useContext } from "react";
import { useAuth } from "./hooks/useAuth";
import { setTokenGetter } from "./lib/api";
import { usePrices } from "./hooks/usePrices";

import Login       from "./pages/Login";
import Watchlist   from "./pages/Watchlist";
import Signals     from "./pages/Signals";
import Trader      from "./pages/Trader";
import Chat        from "./pages/Chat";
import LiveDashboard from "./pages/LiveDashboard";

// ── Auth context — gives any child access to user/token/logout ────────────────
export const AuthContext = createContext(null);
export const useAuthContext = () => useContext(AuthContext);

const TABS = [
  { id: "prices",  label: "Live Prices" },
  { id: "signals", label: "AI Signals"  },
  { id: "trader",  label: "Auto-Trader" },
  { id: "chat",    label: "AI Chat"     },
];

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState("prices");
  const { prices, connected } = usePrices();

  // Give api.js a way to get the current token without prop drilling
  useEffect(() => {
    setTokenGetter(() => auth.user?.getIdToken() ?? Promise.resolve(null));
  }, [auth.user]);

  // ── Loading splash (auth state resolving) ────────────────────────────────
  if (auth.user === undefined) {
    return (
      <div style={splash}>
        <span style={splashText}>SignalBoard</span>
        <span style={splashSub}>Loading…</span>
      </div>
    );
  }

  // ── Not logged in — show Login page ──────────────────────────────────────
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

  // ── Logged in — show main app ─────────────────────────────────────────────
  return (
    <AuthContext.Provider value={auth}>
      <div style={appWrap}>

        {/* Header */}
        <header style={header}>
          <span style={logoText}>SignalBoard</span>
          <div style={headerRight}>
            <span style={wsStatus}>
              {connected ? "🟢 Live" : "🔴 Offline"}
            </span>
            <span style={userEmail}>
              {auth.user.email || auth.user.displayName}
            </span>
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
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Page content */}
        <main style={main}>
          {tab === "prices"  && <LiveDashboard prices={prices} connected={connected} />}
          {tab === "signals" && <Signals prices={prices} />}
          {tab === "trader"  && <Trader />}
          {tab === "chat"    && <Chat />}
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