// src/hooks/useAccess.js
// What the signed-in user can use, from GET /api/me/access.
//
//   const { access, hasFeature } = useAccess();
//   hasFeature("ai_chat")            -> bool
//   access.plan                      -> admin | pro | paid | coupon | trial | free | legacy
//   access.ondemand.left             -> number, or null when unlimited
//   access.trial_ends_at             -> ISO string or null
//
// Fails closed: until access has loaded, hasFeature() is false, so a slow or
// failed /api/me/access never unlocks a paid tab. Tab labels only show 🔒 once
// access is known (no flicker). Failed loads retry with backoff (2s → 30s).

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

const RETRY_MS = [2000, 5000, 10000, 30000];
let retryTimer = null;

export const useAccessStore = create((set, get) => ({
  access: null,
  loaded: false,
  error: null,          // last load error (cleared on success)
  failures: 0,
  inflight: null,

  refresh: async () => {
    if (get().inflight) return get().inflight;
    const p = fetchAccess()
      .then(access => {
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
        set({ access, loaded: true, error: null, failures: 0 });
      })
      .catch(err => {
        const failures = get().failures + 1;
        set({ loaded: true, error: err?.message || "failed", failures });
        // Keep the last good access (if any); retry soon either way.
        if (!retryTimer) {
          retryTimer = setTimeout(() => { retryTimer = null; get().refresh(); },
                                  RETRY_MS[Math.min(failures - 1, RETRY_MS.length - 1)]);
        }
      })
      .finally(() => set({ inflight: null }));
    set({ inflight: p });
    return p;
  },

  reset: () => {                                  // call on sign-out
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    set({ access: null, loaded: false, error: null, failures: 0 });
  },
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
  const error = useAccessStore(s => s.error);
  const refresh = useAccessStore(s => s.refresh);
  // Fail closed: unknown access = no feature.
  const hasFeature = (name) => access?.features?.[name] === true;
  // Only "known locked" — for 🔒 labels, so they don't flash while loading.
  const isLocked = (name) => !!access && access.features?.[name] !== true;
  return { access, loaded, error, refresh, hasFeature, isLocked };
}

// For event handlers: make sure access is loaded (one fetch if needed), then answer.
// Returns true / false, or null if access still couldn't be loaded.
export async function checkFeature(name) {
  const store = useAccessStore.getState();
  if (!store.access) await store.refresh();
  const access = useAccessStore.getState().access;
  if (!access) return null;
  return access.features?.[name] === true;
}
