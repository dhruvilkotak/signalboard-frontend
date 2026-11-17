// src/hooks/useSignalMap.js — latest AI signal per symbol (only when the user has AI Signals).
import { useEffect, useState } from "react";
import { getToken } from "../lib/api";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";

export function useSignalMap(enabled) {
  const [list, setList] = useState([]);
  useEffect(() => {
    if (!enabled) { setList([]); return; }
    let alive = true;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API}/api/signals/stream`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        const sorted = (data.signals || []).sort((a, b) =>
          (b.generated_at || "").localeCompare(a.generated_at || ""));
        if (alive) setList(sorted);
      } catch { /* signals are optional decoration */ }
    })();
    return () => { alive = false; };
  }, [enabled]);

  const bySymbol = {};
  list.forEach(s => { if (s.symbol && !bySymbol[s.symbol]) bySymbol[s.symbol] = s; });
  return { list, bySymbol };
}
