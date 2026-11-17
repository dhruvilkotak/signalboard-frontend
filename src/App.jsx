// src/App.jsx — v3 (portfolio bar uses getPortfolioOverview for accurate total_value)

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useAuth } from "./hooks/useAuth";
import { auth as firebaseAuth } from "./lib/firebase";
import { PAYWALL_EVENT, setTokenGetter, setFirebaseAuth, getWatchlist, addToWatchlist, removeFromWatchlist, getPortfolioOverview } from "./lib/api";
import { usePrices } from "./hooks/usePrices";
import { useIsMobile, useIsCompact } from "./hooks/useIsMobile";

import Login         from "./pages/Login";
import LiveDashboard from "./pages/LiveDashboard";
import PendingScreen from "./pages/PendingScreen";
import Signals       from "./pages/Signals";
import Trader        from "./pages/Trader";
import Chat          from "./pages/Chat";
import UserGuide     from "./pages/UserGuide";
import TermsGate     from "./components/TermsGate";
import PaywallModal  from "./components/PaywallModal";
import QuotaChip     from "./components/QuotaChip";
import TrialChip     from "./components/TrialChip";
import CouponChip    from "./components/CouponChip";
import RedeemCouponModal from "./components/RedeemCouponModal";
import LiquidationNotice from "./components/LiquidationNotice";
import SubscriptionChip from "./components/SubscriptionChip";
import BillingReturnNotice from "./components/BillingReturnNotice";
import { useFeatureFlagsLoader, useFeatureFlagStore } from "./hooks/useFeatureFlags";
import { useAccessLoader, useAccessStore, useAccess, checkFeature } from "./hooks/useAccess";

// Wire Firebase auth into api.js immediately — eliminates token race condition
setFirebaseAuth(firebaseAuth);

export const AuthContext = createContext(null);
export const useAuthContext = () => useContext(AuthContext);

// Loads feature flags + access for the signed-in user. Rendered only after
// login + approval, so the first fetch always has a user; clears on sign-out.
function SignedInHooks() {
  useFeatureFlagsLoader();
  useAccessLoader();
  useEffect(() => () => {
    useFeatureFlagStore.getState().reset();
    useAccessStore.getState().reset();
  }, []);
  return null;
}

// Tabs that need a feature (trial / coupon / paid / Pro). Locked tabs open the paywall instead.
// Manual Trades is its own tab and always free.
const TAB_FEATURE = { signals: "ai_signals", chat: "ai_chat", trader: "autotrader" };

const DEFAULT_TICKERS = ["SPY","VOO","JEPI","JEPQ","SCHD","SGOV","MSFT","AAPL","NVDA","GOOGL","AMZN","META","HOOD"];

export default function App() {
  const auth = useAuth();
  const { access, hasFeature, isLocked, error: accessError } = useAccess();
  const [accessNotice, setAccessNotice] = useState(null);
  const [tab,            setTab]            = useState("prices");
  const [watchlist,      setWatchlist]      = useState([]);
  const [watchlistReady, setWatchlistReady] = useState(false);
  const [AdminPage,      setAdminPage]      = useState(null);
  const [portfolioValue, setPortfolioValue] = useState(null);
  const [tokenReady,     setTokenReady]     = useState(false);
  const { prices, connected } = usePrices();
  const isMobile  = useIsMobile();   // phones: tighter tab bar + padding
  const isCompact = useIsCompact();  // phones + tablets: header collapses into a ☰ menu
  const [menuOpen, setMenuOpen] = useState(false);

  // Wire token into api.js — use auth.token (already fetched by useAuth)
  // so it's available synchronously. No race condition with API calls.
  useEffect(() => {
    if (auth.token) {
      console.log("[Auth] Token ready — wiring into api.js");
      setTokenGetter(() => Promise.resolve(auth.token));
      setTokenReady(true);
    } else {
      console.log("[Auth] No token — using getIdToken() fallback");
      setTokenGetter(() => auth.user?.getIdToken() ?? Promise.resolve(null));
      setTokenReady(false);
    }
  }, [auth.token, auth.user]);

  // Step 2: fetch data — 100ms delay ensures token getter is propagated
  // before the first authenticated API call fires
  const fetchPortfolioSummary = useCallback(
    () => getPortfolioOverview().then(ov => setPortfolioValue(ov.summary)).catch(() => {}),
    []
  );

  useEffect(() => {
    // Depend on auth.token (not auth.user) so this effect fires AFTER
    // the token-setter effect above — guaranteeing the Bearer token
    // is wired into api.js before any authenticated API call fires.
    if (!auth.token || auth.isPending) return;
    console.log("[Auth] Token confirmed — loading watchlist + portfolio");

    getWatchlist()
      .then(data => {
        setWatchlist(data.symbols?.length ? data.symbols : DEFAULT_TICKERS);
        setWatchlistReady(true);
      })
      .catch(() => {
        // Don't overwrite with defaults on error — only seed if nothing loaded yet
        setWatchlist(prev => prev.length ? prev : DEFAULT_TICKERS);
        setWatchlistReady(true);
      });
    fetchPortfolioSummary();

    const iv = setInterval(fetchPortfolioSummary, 60000);
    return () => clearInterval(iv);
  }, [auth.token, auth.isPending, fetchPortfolioSummary]);

  const handleTabChange = async (newTab) => {
    const feature = TAB_FEATURE[newTab];
    if (feature) {
      const ok = await checkFeature(feature);       // loads access first if needed
      if (ok === null) {                            // couldn't reach the server: stay put
        setAccessNotice("Couldn't check your plan just now. Retrying — try again in a few seconds.");
        return;
      }
      if (!ok) {
        window.dispatchEvent(new CustomEvent(PAYWALL_EVENT, { detail: { feature } }));
        return;
      }
    }
    setAccessNotice(null);
    setMenuOpen(false);
    setTab(newTab);
    if (newTab === "trader" || newTab === "manual") fetchPortfolioSummary(); // instant header refresh
  };

  // Access can change while the app is open (trial ends, coupon expires, etc.):
  // if the open tab is no longer allowed, go back to Live Prices and show why.
  useEffect(() => {
    const feature = TAB_FEATURE[tab];
    if (feature && access && access.features?.[feature] !== true) {
      setTab("prices");
      window.dispatchEvent(new CustomEvent(PAYWALL_EVENT, { detail: { feature } }));
    }
  }, [access, tab]);

  useEffect(() => { if (access) setAccessNotice(null); }, [access]);

  useEffect(() => {
    if (auth.isAdmin && !AdminPage) {
      import("./pages/Admin").then(m => setAdminPage(() => m.default));
    }
  }, [auth.isAdmin]);

  const handleAdd    = async (sym) => {
    try { const d = await addToWatchlist(sym); setWatchlist(d.symbols); } catch {}
  };
  const handleRemove = async (sym) => {
    // Optimistic update — remove immediately so the UI feels instant
    setWatchlist(prev => prev.filter(s => s !== sym));
    try {
      const d = await removeFromWatchlist(sym);
      setWatchlist(d.symbols); // sync with server's canonical list
    } catch {
      // Rollback — re-add the symbol if the API call failed
      setWatchlist(prev => prev.includes(sym) ? prev : [...prev, sym]);
    }
  };

  if (auth.user === undefined) return (
    <div style={splash}><span style={splashText}>SignalBoard</span><span style={splashSub}>Loading…</span></div>
  );
  if (!auth.user) return <Login onGoogle={auth.loginGoogle} error={auth.error} loading={auth.loading} />;
  if (auth.isPending) return <PendingScreen user={auth.user} />;

  const TABS = [
    { id: "prices",  label: "Live Prices" },
    { id: "manual",  label: "Manual Trades" },
    { id: "signals", label: isLocked("ai_signals") ? "🔒 AI Signals" : "AI Signals" },
    { id: "trader",  label: isLocked("autotrader") ? "🔒 Auto-Trader" : "Auto-Trader" },
    { id: "chat",    label: isLocked("ai_chat")    ? "🔒 AI Chat"    : "AI Chat"    },
    { id: "guide",   label: "📖 Guide"    },
    ...(auth.isAdmin ? [{ id: "admin", label: "⚙ Admin" }] : []),
  ];

  const tv     = portfolioValue?.total_value    ?? 0;
  const avail  = portfolioValue?.available_cash ?? 0;

  return (
    <AuthContext.Provider value={auth}>
      <SignedInHooks />
      <TermsGate>
      <div style={appWrap}>
        {isCompact ? (
          <header style={{ ...header, padding: "0 0.75rem", position: "relative", zIndex: 50 }}>
            <span style={{ ...logoText, fontSize: 16 }}>SignalBoard</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {portfolioValue && (
                <button onClick={() => handleTabChange(hasFeature("autotrader") ? "trader" : "manual")} style={{ ...portfolioBar, padding: "4px 8px" }} title="Open your portfolio">
                  <span style={{ fontSize: 12 }}>💼</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#e6edf3", fontFamily: "'Space Mono',monospace" }}>
                    ${tv.toFixed(2)}
                  </span>
                </button>
              )}
              <span style={wsStatus} title={connected ? "Live" : "Offline"}>{connected ? "🟢" : "🔴"}</span>
              <button onClick={() => setMenuOpen(o => !o)} style={menuBtn} aria-label="Menu" aria-expanded={menuOpen}>
                {menuOpen ? "✕" : "☰"}
              </button>
            </div>
            {menuOpen && (
              <div onClick={() => setMenuOpen(false)} style={menuBackdrop} />
            )}
            {menuOpen && (
              <div style={mobileMenu}>
                {portfolioValue && (
                  <div style={{ fontSize: 11, color: "#8b949e", fontFamily: "'Space Mono',monospace" }}>
                    💼 ${tv.toFixed(2)} · Cash: ${avail.toFixed(0)} · PAPER
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <TrialChip />
                  <CouponChip />
                  <SubscriptionChip />
                  <QuotaChip />
                  {auth.isAdmin && <span style={adminBadge}>Admin</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ ...userEmail, maxWidth: "60vw" }}>{auth.user.email || auth.user.displayName}</span>
                  <button style={{ ...logoutBtn, padding: "8px 14px" }} onClick={auth.logout}>Sign out</button>
                </div>
              </div>
            )}
          </header>
        ) : (
          <header style={header}>
            <span style={logoText}>SignalBoard</span>
            <div style={headerRight}>
              {/* Portfolio mini bar */}
              {portfolioValue && (
                <button onClick={() => handleTabChange(hasFeature("autotrader") ? "trader" : "manual")} style={portfolioBar} title="Open your portfolio">
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
              <TrialChip />
              <CouponChip />
              <SubscriptionChip />
              <QuotaChip />
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
        )}
        {isCompact && auth.idleWarning && (
          <div style={{ fontSize:11, color:"#f0a000", background:"#f0a00015", borderBottom:"1px solid #f0a00040", padding:"4px 12px", textAlign:"center" }}>
            ⏱ Signing out in 5 min
          </div>
        )}

        <nav style={isMobile ? { ...tabBar, padding: 0 } : tabBar} className={isMobile ? "h-scroll" : undefined}>
          {TABS.map(t => (
            <button key={t.id} style={{ ...tabBtn, ...(isMobile ? tabBtnMobile : {}), ...(tab === t.id ? tabBtnActive : {}) }} onClick={() => handleTabChange(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        <main style={isMobile ? { ...main, padding: "0.75rem" } : main}>
          {accessNotice && (
            <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 6, fontSize: 12,
                          background: "#f0a00015", border: "1px solid #f0a00055", color: "#f0a000" }}>
              {accessNotice}
            </div>
          )}
          <BillingReturnNotice />
          <LiquidationNotice />
          {tab === "prices"  && <LiveDashboard watchlist={watchlist} onAdd={handleAdd} onRemove={handleRemove} prices={prices} tokenReady={tokenReady} />}
          {tab === "signals" && <Signals watchlist={watchlist} />}
          {tab === "manual"  && <Trader view="manual" onPortfolioUpdate={setPortfolioValue} tokenReady={tokenReady} prices={prices} />}
          {tab === "trader"  && <Trader view="strategies" onPortfolioUpdate={setPortfolioValue} tokenReady={tokenReady} prices={prices} />}
          {tab === "chat"    && <Chat watchlist={watchlist} />}
          {tab === "guide"   && <UserGuide />}
          {tab === "admin"   && auth.isAdmin && AdminPage && <AdminPage />}
          {tab === "admin"   && !auth.isAdmin && <div style={denied}>Access denied.</div>}
        </main>
      </div>
      <PaywallModal />
      <RedeemCouponModal />
      </TermsGate>
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
const tabBtnMobile = { padding:"10px 12px", whiteSpace:"nowrap", flexShrink:0 };
const menuBtn      = { width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", background:"transparent", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:16, cursor:"pointer" };
const menuBackdrop = { position:"fixed", inset:0, top:52, background:"rgba(1,4,9,0.5)", zIndex:-1 };
const mobileMenu   = { position:"absolute", top:"100%", left:0, right:0, background:"var(--color-surface,#161b22)", borderBottom:"1px solid var(--color-border,#30363d)", padding:"12px 0.75rem", display:"flex", flexDirection:"column", gap:12, boxShadow:"0 8px 24px rgba(0,0,0,0.5)" };
const tabBtnActive = { color:"#e6edf3", borderBottomColor:"#2ea043" };
const main         = { flex:1, overflow:"auto", padding:"1.5rem" };
const denied       = { color:"#f85149", padding:"2rem", fontSize:14 };
const portfolioBar = { display:"flex", alignItems:"center", gap:6, background:"#0d1117", border:"1px solid #30363d", borderRadius:7, padding:"4px 12px", cursor:"pointer", transition:"border-color 0.15s" };