// src/pages/Watchlist.jsx  (now called from LiveDashboard.jsx or directly)
// Per-user watchlist — loads from Firestore via backend API, saves per user

import { useState, useEffect } from "react";
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "../lib/api";
import TickerCard from "../components/TickerCard";

export default function Watchlist({ prices }) {
  const [symbols,  setSymbols]  = useState([]);
  const [search,   setSearch]   = useState("");
  const [adding,   setAdding]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Load watchlist from backend (Firestore per user) on mount
  useEffect(() => {
    loadWatchlist();
  }, []);

  async function loadWatchlist() {
    try {
      setLoading(true);
      const data = await getWatchlist();
      setSymbols(data.symbols || []);
    } catch (e) {
      setError("Failed to load watchlist. Are you signed in?");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    const sym = search.trim().toUpperCase();
    if (!sym || symbols.includes(sym)) return;
    setAdding(true);
    try {
      const data = await addToWatchlist(sym);
      setSymbols(data.symbols);
      setSearch("");
    } catch (e) {
      setError(`Could not add ${sym}`);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(symbol) {
    try {
      const data = await removeFromWatchlist(symbol);
      setSymbols(data.symbols);
    } catch (e) {
      setError(`Could not remove ${symbol}`);
    }
  }

  if (loading) return <div style={msg}>Loading your watchlist…</div>;

  return (
    <div>
      {/* Add symbol bar */}
      <form onSubmit={handleAdd} style={addBar}>
        <input
          style={searchInput}
          value={search}
          onChange={e => setSearch(e.target.value.toUpperCase())}
          placeholder="Add ticker — AAPL, BTC-USD, GC=F…"
          disabled={adding}
        />
        <button style={addBtn} type="submit" disabled={adding || !search.trim()}>
          {adding ? "Adding…" : "+ Add"}
        </button>
      </form>

      {error && <div style={errorBox}>{error}</div>}

      {/* Ticker grid */}
      {symbols.length === 0 ? (
        <div style={msg}>Your watchlist is empty — add a ticker above.</div>
      ) : (
        <div style={grid}>
          {symbols.map(sym => (
            <div key={sym} style={cardWrap}>
              <TickerCard
                symbol={sym}
                price={prices?.[sym]}
              />
              <button
                style={removeBtn}
                onClick={() => handleRemove(sym)}
                title={`Remove ${sym}`}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const addBar     = { display:"flex", gap:8, marginBottom:"1.25rem" };
const searchInput= { flex:1, padding:"9px 12px", background:"#161b22", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:14, outline:"none" };
const addBtn     = { padding:"9px 16px", background:"#238636", border:"1px solid #2ea043", borderRadius:6, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" };
const errorBox   = { background:"#3d1515", border:"1px solid #f85149", color:"#f85149", borderRadius:6, padding:"8px 12px", fontSize:13, marginBottom:"1rem" };
const grid       = { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:12 };
const cardWrap   = { position:"relative" };
const removeBtn  = { position:"absolute", top:6, right:6, background:"rgba(248,81,73,0.15)", border:"1px solid rgba(248,81,73,0.4)", borderRadius:4, color:"#f85149", fontSize:11, cursor:"pointer", padding:"2px 6px", lineHeight:1.4 };
const msg        = { color:"#8b949e", fontSize:14, padding:"2rem 0" };