// src/hooks/useQuotes.js — REST quotes for a list of symbols, refreshed every 60s.
import { useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";

export function useQuotes(symbols) {
  const [quotes, setQuotes] = useState({});
  const key = (symbols || []).filter(Boolean).join(",");

  const load = useCallback(async () => {
    if (!key) return;
    try {
      const res = await fetch(`${API}/api/quote/batch/${key}`);
      if (res.ok) {
        const data = await res.json();
        setQuotes(prev => ({ ...prev, ...data }));
      }
    } catch { /* keep last quotes */ }
  }, [key]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [load]);

  return { quotes, refresh: load };
}
