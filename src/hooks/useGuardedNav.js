// src/hooks/useGuardedNav.js — navigation that respects paid features.
// Locked routes open the paywall; if access changes while a locked page is open, go Home.
import { useEffect, useState } from "react";
import { PAYWALL_EVENT } from "../lib/api";
import { go } from "../lib/router";
import { checkFeature } from "./useAccess";

// Routes that need a feature (trial / coupon / paid / Pro). Everything else is free.
export const ROUTE_FEATURE = { signals: "ai_signals", chat: "ai_chat", auto: "autotrader" };

export const openPaywall = (feature) =>
  window.dispatchEvent(new CustomEvent(PAYWALL_EVENT, { detail: { feature } }));

export function useGuardedNav(route, access) {
  const [notice, setNotice] = useState(null);

  const navTo = async (name) => {
    const feature = ROUTE_FEATURE[name];
    if (feature) {
      const ok = await checkFeature(feature);   // loads access first if needed
      if (ok === null) {                        // couldn't reach the server: stay put
        setNotice("Couldn't check your plan just now. Retrying — try again in a few seconds.");
        return;
      }
      if (!ok) { openPaywall(feature); return; }
    }
    setNotice(null);
    go(name);
  };

  useEffect(() => {
    const feature = ROUTE_FEATURE[route.name];
    if (feature && access && access.features?.[feature] !== true) {
      go("home");
      openPaywall(feature);
    }
  }, [access, route.name]);

  useEffect(() => { if (access) setNotice(null); }, [access]);

  return { navTo, notice };
}
