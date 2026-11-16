// src/hooks/useWatchlist.js — the user's watchlist with optimistic add / remove.
import { useCallback, useEffect, useState } from "react";
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "../lib/api";

export const DEFAULT_TICKERS = ["SPY", "VOO", "JEPI", "JEPQ", "SCHD", "SGOV", "MSFT", "AAPL", "NVDA", "GOOGL", "AMZN", "META", "HOOD"];

export function useWatchlist(enabled) {
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    if (!enabled) return;
    getWatchlist()
      .then(d => setWatchlist(d.symbols?.length ? d.symbols : DEFAULT_TICKERS))
      // Keep what we have on error; only seed defaults if nothing loaded yet
      .catch(() => setWatchlist(prev => (prev.length ? prev : DEFAULT_TICKERS)));
  }, [enabled]);

  const add = useCallback(async (symbol) => {
    setWatchlist(prev => (prev.includes(symbol) ? prev : [...prev, symbol]));
    try { setWatchlist((await addToWatchlist(symbol)).symbols); }
    catch { setWatchlist(prev => prev.filter(s => s !== symbol)); }
  }, []);

  const remove = useCallback(async (symbol) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
    try { setWatchlist((await removeFromWatchlist(symbol)).symbols); }
    catch { setWatchlist(prev => (prev.includes(symbol) ? prev : [...prev, symbol])); }
  }, []);

  return { watchlist, add, remove };
}
