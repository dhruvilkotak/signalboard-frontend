// src/routes/AppRoutes.jsx — which page renders for each hash route.
import { lazy, Suspense } from "react";
import Home from "../pages/Home";
import StockPage from "../pages/StockPage";
import Account from "../pages/Account";
import Signals from "../pages/Signals";
import Trader from "../pages/Trader";
import Chat from "../pages/Chat";
import UserGuide from "../pages/UserGuide";
import LiveDashboard from "../pages/LiveDashboard";
import { openPaywall } from "../hooks/useGuardedNav";

const Admin = lazy(() => import("../pages/Admin"));

// Older pages render inside the new shell with standard page padding.
const Legacy = ({ wide, children }) => <div className={`sb-page sb-legacy${wide ? " wide" : ""}`}>{children}</div>;

export default function AppRoutes({ route, auth, watchlist, prices, connected, tokenReady }) {
  const { list, add, remove } = watchlist;
  switch (route.name) {
    case "stock":
      return <StockPage symbol={route.param} watchlist={list} onAdd={add} onRemove={remove} isAdmin={auth.isAdmin} onUnlock={openPaywall} />;
    case "signals":  return <Legacy><Signals watchlist={list} /></Legacy>;
    case "auto":     return <Legacy><Trader view="strategies" tokenReady={tokenReady} prices={prices} /></Legacy>;
    case "manual":   return <Legacy><Trader view="manual" tokenReady={tokenReady} prices={prices} /></Legacy>;
    case "chat":     return <Legacy><Chat watchlist={list} /></Legacy>;
    case "guide":    return <Legacy><UserGuide /></Legacy>;
    case "account":  return <Account auth={auth} connected={connected} />;
    case "terminal":
      return <Legacy wide><LiveDashboard watchlist={list} onAdd={add} onRemove={remove} prices={prices} tokenReady={tokenReady} /></Legacy>;
    case "admin":
      return (
        <Legacy wide>
          {auth.isAdmin
            ? <Suspense fallback={<div className="sb-muted">Loading…</div>}><Admin /></Suspense>
            : <div className="sb-down" style={{ padding: "2rem" }}>Access denied.</div>}
        </Legacy>
      );
    default:
      return <Home watchlist={list} onUnlock={openPaywall} />;
  }
}
