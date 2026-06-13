// src/hooks/useMarketStatus.js  ← NEW FILE
// Polls GET /api/market/status every 60 seconds.
//
// status shape:
//   session:          "pre_market" | "market" | "post_market" | "closed"
//   label:            "Market open" | "Pre-market" | "Post-market" | "Closed"
//   trading_allowed:  boolean
//   realtime_prices:  boolean
//   price_note:       string | null
//   is_weekend:       boolean
//   countdown:        "1h 48m" | null
//   server_time_et:   "9:42 AM ET"

import { useState, useEffect, useCallback } from "react";
import { getMarketStatus } from "../lib/api";

const POLL_MS = 60_000;

export function useMarketStatus() {
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    try {
      const data = await getMarketStatus();
      setStatus(data);
      setError(null);
    } catch (e) {
      setError(e.message ?? "Failed to load market status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, POLL_MS);
    return () => clearInterval(interval);
  }, [fetch]);

  return { status, loading, error, refetch: fetch };
}