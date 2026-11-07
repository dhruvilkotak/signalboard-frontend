// Feature flags for the signed-in user, from GET /api/config.
//
//   const billingOn = useFlag('billing');
//   <Flag name="billing"><PricingLink /></Flag>
//
// Every flag is false until loaded, so new UI stays hidden by default.
// Refreshes every 5 minutes and when the tab regains focus.

import { useEffect } from 'react';
import { create } from 'zustand';
import { getConfig } from '../lib/api';

const REFRESH_MS = 5 * 60 * 1000;

export const useFeatureFlagStore = create((set, get) => ({
  flags: {},
  loaded: false,
  inflight: null,

  fetchFlags: async () => {
    if (get().inflight) return get().inflight;
    const p = getConfig()
      .then((res) => set({ flags: res?.flags || {}, loaded: true }))
      .catch(() => set({ loaded: true })) // keep last flags; default is off
      .finally(() => set({ inflight: null }));
    set({ inflight: p });
    return p;
  },

  reset: () => set({ flags: {}, loaded: false }), // call on sign-out
}));

// Mount once near the app root (inside the signed-in tree).
export function useFeatureFlagsLoader() {
  const fetchFlags = useFeatureFlagStore((s) => s.fetchFlags);
  useEffect(() => {
    fetchFlags();
    const id = setInterval(fetchFlags, REFRESH_MS);
    const onFocus = () => fetchFlags();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchFlags]);
}

export function useFlag(name) {
  return useFeatureFlagStore((s) => s.flags[name] === true);
}

export function Flag({ name, children, fallback = null }) {
  return useFlag(name) ? children : fallback;
}
