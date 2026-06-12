// src/components/SearchBar.jsx
// Robinhood-style typeahead search — name, price, change per result
// Usage: <SearchBar watchlist={watchlist} onAdd={onAdd} />

import { useState, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";

export default function SearchBar({ watchlist = [], onAdd, limit = 25 }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef      = useRef(null);
  const mouseDownInDropdown = useRef(false); // guard: don't close on dropdown click

  const search = async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/search/?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setResults(list);
      setOpen(list.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(() => search(val), 220);
  };

  // Only close on blur if the user didn't click inside the dropdown
  const handleBlur = () => {
    setTimeout(() => {
      if (!mouseDownInDropdown.current) setOpen(false);
      mouseDownInDropdown.current = false;
    }, 150);
  };

  const atLimit = watchlist.length >= limit;

  const handleAdd = (symbol) => {
    if (atLimit) return;
    onAdd(symbol);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div style={wrap}>
      {/* Input */}
      <div style={inputBox}>
        <span style={icon}>🔍</span>
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={handleBlur}
          placeholder={atLimit ? `Watchlist full (${limit}/${limit})` : "Search stocks, ETFs, crypto…"}
          disabled={atLimit}
          style={{ ...input, opacity: atLimit ? 0.5 : 1, cursor: atLimit ? "not-allowed" : "text" }}
        />
        {loading && <span style={spinner}>…</span>}
      </div>

      {/* Watchlist count */}
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: atLimit ? "#e3b341" : "#6e7681", padding: "2px 4px", textAlign: "right" }}>
        {watchlist.length}/{limit} symbols{atLimit ? " — remove one to add more" : ""}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          style={dropdown}
          onMouseDown={() => { mouseDownInDropdown.current = true; }}
        >
          {results.map(r => {
            const already  = watchlist.includes(r.symbol);
            const disabled = already || atLimit;
            const up       = (r.change_pct ?? 0) >= 0;
            return (
              <div
                key={r.symbol}
                onClick={() => !disabled && handleAdd(r.symbol)}
                style={{ ...row, cursor: disabled ? "default" : "pointer", opacity: atLimit && !already ? 0.5 : 1 }}
                onMouseEnter={e => { if (!already) e.currentTarget.style.background = "#21262d"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Left — symbol + name */}
                <div style={left}>
                  <div style={symbolRow}>
                    <span style={symbolText}>{r.symbol}</span>
                    <span style={typeBadge}>
                      {r.type === "ETF"            ? "ETF"
                       : r.type === "CRYPTOCURRENCY" ? "CRYPTO"
                       : "STOCK"}
                    </span>
                    {r.exchange && (
                      <span style={exchangeText}>{r.exchange}</span>
                    )}
                  </div>
                  <div style={nameText}>{r.name}</div>
                </div>

                {/* Right — price + change */}
                {r.price != null && (
                  <div style={priceBlock}>
                    <div style={priceText}>${r.price.toFixed(2)}</div>
                    <div style={{ ...changeText, color: up ? "#3fb950" : "#f85149" }}>
                      {up ? "▲" : "▼"} {Math.abs(r.change_pct ?? 0).toFixed(2)}%
                    </div>
                  </div>
                )}

                {/* Add / checkmark */}
                <div style={{
                  ...addBtn,
                  background: already ? "transparent" : "#238636",
                  border:     already ? "1px solid #30363d" : "none",
                  color:      already ? "#6e7681" : "#fff",
                  fontSize:   already ? 13 : 18,
                }}>
                  {already ? "✓" : "+"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const wrap       = { position: "relative", width: 360 };
const inputBox   = { display: "flex", alignItems: "center", background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: "7px 12px", gap: 8 };
const icon       = { color: "#8b949e", fontSize: 14 };
const input      = { flex: 1, background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 13, minWidth: 0 };
const spinner    = { color: "#8b949e", fontSize: 11 };
const dropdown   = { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#161b22", border: "1px solid #30363d", borderRadius: 8, zIndex: 100, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" };
const row        = { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #21262d", transition: "background 0.1s" };
const left       = { flex: 1, minWidth: 0 };
const symbolRow  = { display: "flex", alignItems: "center", gap: 6 };
const symbolText = { fontWeight: 700, fontSize: 13, color: "#e6edf3" };
const typeBadge  = { fontSize: 10, color: "#8b949e", background: "#21262d", padding: "1px 5px", borderRadius: 3 };
const exchangeText = { fontSize: 10, color: "#6e7681" };
const nameText   = { fontSize: 11, color: "#8b949e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 };
const priceBlock = { textAlign: "right", flexShrink: 0 };
const priceText  = { fontSize: 13, fontWeight: 600, color: "#e6edf3" };
const changeText = { fontSize: 11, marginTop: 1 };
const addBtn     = { width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 };