// src/lib/router.js — tiny hash router: #/home, #/stock/MSFT, #/signals …
// Hash routes keep the browser/iOS back gesture working without a router library.
import { useEffect, useState } from "react";

// "#/stock/MSFT" → { name: "stock", param: "MSFT" }; empty → home
export function parseHash(hash) {
  const h = (hash || "").replace(/^#\/?/, "");
  const [name, param] = h.split("/");
  return { name: name || "home", param: param ? decodeURIComponent(param) : null };
}

export function useRoute() {
  const parse = () => parseHash(window.location.hash);
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export const go = (path) => { window.location.hash = "/" + path; };
export const openStock = (symbol) => go(`stock/${encodeURIComponent(symbol)}`);
export const goBack = () => (window.history.length > 1 ? window.history.back() : go("home"));
