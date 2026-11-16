// src/hooks/useIsMobile.js — screen-size hooks for responsive layouts.
// Desktop layout is untouched; components only switch layout when these are true.
import { useEffect, useState } from "react";

export const MOBILE_QUERY  = "(max-width: 768px)";   // phones
export const COMPACT_QUERY = "(max-width: 1100px)";  // phones + tablets + narrow laptops

export function useMediaQuery(query) {
  const get = () => typeof window !== "undefined" && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export const useIsMobile  = () => useMediaQuery(MOBILE_QUERY);
export const useIsCompact = () => useMediaQuery(COMPACT_QUERY);
