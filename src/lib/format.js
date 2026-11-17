// src/lib/format.js — number formatting shared by the v2 pages.

export const money = (n, digits = 2) =>
  `$${(+(n ?? 0)).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const signedMoney = (n) => `${(n ?? 0) >= 0 ? "+" : "−"}${money(Math.abs(n ?? 0))}`;

export const pct = (n) => `${(n ?? 0) >= 0 ? "+" : "−"}${Math.abs(+(n ?? 0)).toFixed(2)}%`;

// CSS class for a gain / loss number
export const tone = (n) => ((n ?? 0) >= 0 ? "sb-up" : "sb-down");

export const compactCap = (n) =>
  !n ? "—" : n >= 1e12 ? `$${(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : `$${(n / 1e6).toFixed(0)}M`;

export const compactVolume = (n) =>
  !n ? "—" : n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : `${(n / 1e6).toFixed(1)}M`;

export const shares = (n) => (+(n ?? 0)).toFixed(4).replace(/\.?0+$/, "");
