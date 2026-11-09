// src/hooks/useAccess.js
// What the signed-in user can use, from GET /api/me/access.
//
//   const { access, hasFeature } = useAccess();
//   hasFeature("ai_chat")            -> bool
//   access.plan                      -> admin | pro | paid | coupon | trial | free | legacy
//   access.ondemand.left             -> number, or null when unlimited
//   access.trial_ends_at             -> ISO string or null
//
// Until loaded, hasFeature() returns true, so nothing flickers into a paywall
// on page load; the backend is the real gate (402 PAYWALL).

import { useEffect } from "react";
import { create } from "zustand";
import { auth } from "../lib/firebase";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";
const REFRESH_MS = 5 * 60 * 1000;

async function fetchAccess() {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  const res = await fetch(`${API}/api/me/access`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const useAccessStore = create((set, get) => ({
  access: null,
  loaded: false,
  inflight: null,

  refresh: async () => {
    if (get().inflight) return get().inflight;
    const p = fetchAccess()
      .then(access => set({ access, loaded: true }))
      .catch(() => set({ loaded: true }))
      .finally(() => set({ inflight: null }));
    set({ inflight: p });
    return p;
  },

  reset: () => set({ access: null, loaded: false }),   // call on sign-out
}));

// Mount once inside the signed-in part of the app (next to useFeatureFlagsLoader).
export function useAccessLoader() {
  const refresh = useAccessStore(s => s.refresh);
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("signalboard:access-changed", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("signalboard:access-changed", onFocus);
    };
  }, [refresh]);
}

export function useAccess() {
  const access = useAccessStore(s => s.access);
  const loaded = useAccessStore(s => s.loaded);
  const refresh = useAccessStore(s => s.refresh);
  const hasFeature = (name) => (access ? access.features?.[name] === true : true);
  return { access, loaded, refresh, hasFeature };
}
