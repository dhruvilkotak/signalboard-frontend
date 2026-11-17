// src/App.jsx — v5: auth gates + app shell. Pages live in routes/AppRoutes.jsx,
// shell pieces in components/shell, data in hooks/.
import { useEffect, createContext, useContext } from "react";
import { useAuth } from "./hooks/useAuth";
import { auth as firebaseAuth } from "./lib/firebase";
import { setFirebaseAuth } from "./lib/api";
import { usePrices } from "./hooks/usePrices";
import { useMediaQuery } from "./hooks/useIsMobile";
import { useApiToken } from "./hooks/useApiToken";
import { useWatchlist } from "./hooks/useWatchlist";
import { useGuardedNav } from "./hooks/useGuardedNav";
import { useFeatureFlagsLoader, useFeatureFlagStore } from "./hooks/useFeatureFlags";
import { useAccessLoader, useAccessStore, useAccess } from "./hooks/useAccess";
import { useRoute } from "./lib/router";
import { TopBar, BottomNav, navFor } from "./components/shell/Nav";
import PhoneHeader from "./components/shell/PhoneHeader";
import Notices from "./components/shell/Notices";
import AppRoutes from "./routes/AppRoutes";
import Login from "./pages/Login";
import PendingScreen from "./pages/PendingScreen";
import TermsGate from "./components/TermsGate";
import PaywallModal from "./components/PaywallModal";
import RedeemCouponModal from "./components/RedeemCouponModal";
import "./styles/sb.css";

// Wire Firebase auth into api.js immediately — eliminates token race condition
setFirebaseAuth(firebaseAuth);

export const AuthContext = createContext(null);
export const useAuthContext = () => useContext(AuthContext);

// Loads feature flags + access for the signed-in user; clears them on sign-out.
function SignedInHooks() {
  useFeatureFlagsLoader();
  useAccessLoader();
  useEffect(() => () => {
    useFeatureFlagStore.getState().reset();
    useAccessStore.getState().reset();
  }, []);
  return null;
}

function Splash() {
  return (
    <div className="sb-app" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 28, fontWeight: 700 }}>SignalBoard</span>
      <span className="sb-muted" style={{ fontSize: 14, marginTop: 8 }}>Loading…</span>
    </div>
  );
}

function Shell({ auth }) {
  const route = useRoute();
  const { access, isLocked } = useAccess();
  const { navTo, notice } = useGuardedNav(route, access);
  const tokenReady = useApiToken(auth);
  const { watchlist, add, remove } = useWatchlist(!!auth.token);
  const { prices, connected } = usePrices();
  const isPhone = useMediaQuery("(max-width: 899px)");
  const active = navFor(route.name);

  return (
    <div className="sb-app">
      {isPhone
        ? route.name !== "stock" && <PhoneHeader watchlist={watchlist} />
        : <TopBar active={active} onNav={navTo} isLocked={isLocked} watchlist={watchlist} />}
      <Notices accessNotice={notice} idleWarning={auth.idleWarning} />
      <AppRoutes route={route} auth={auth} watchlist={{ list: watchlist, add, remove }}
        prices={prices} connected={connected} tokenReady={tokenReady} />
      {isPhone && <BottomNav active={active} onNav={navTo} isLocked={isLocked} />}
    </div>
  );
}

export default function App() {
  const auth = useAuth();
  if (auth.user === undefined) return <Splash />;
  if (!auth.user) return <Login onGoogle={auth.loginGoogle} error={auth.error} loading={auth.loading} />;
  if (auth.isPending) return <PendingScreen user={auth.user} />;

  return (
    <AuthContext.Provider value={auth}>
      <SignedInHooks />
      <TermsGate>
        <Shell auth={auth} />
        <PaywallModal />
        <RedeemCouponModal />
      </TermsGate>
    </AuthContext.Provider>
  );
}
