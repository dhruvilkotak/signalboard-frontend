// src/hooks/usePortfolio.js — portfolio overview (summary, manual positions, strategies), refreshed every 60s.
import { useEffect, useState } from "react";
import { getPortfolioOverview } from "../lib/api";

export function usePortfolio(intervalMs = 60000) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => getPortfolioOverview()
      .then(ov => { if (alive) { setOverview(ov); setError(null); } })
      .catch(() => alive && setError("Couldn't load your portfolio. Retrying…"));
    load();
    const iv = setInterval(load, intervalMs);
    return () => { alive = false; clearInterval(iv); };
  }, [intervalMs]);

  return { overview, error };
}
