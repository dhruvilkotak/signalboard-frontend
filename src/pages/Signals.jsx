// src/pages/Signals.jsx  —  Task #19 redesign
// Props: { watchlist }  — same as original (App.jsx passes watchlist only)
//
// Changes vs original:
//   ✓ Feed from GET /api/signals/feed  (paginated, Firestore-backed, infinite scroll)
//   ✓ Filter bar: signal type × confidence
//   ✓ On-demand Analyze for all users → POST /api/signals/analyze (cache-first, no double LLM calls)
//   ✓ "Analyze All" button for admins only → POST /api/signals/run-all
//   ✗ "Analyze All" hidden from regular users
//   ✓ All CSS uses existing globals.css vars + classes

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthContext } from "../App";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";

const SIG_COLOR = {
  BUY:  { color: "var(--signal-buy)",  bg: "#0fffa315", border: "#0fffa350" },
  HOLD: { color: "var(--signal-hold)", bg: "#ffd60015", border: "#ffd60050" },
  SELL: { color: "var(--signal-sell)", bg: "#ff416215", border: "#ff416250" },
};
const CONF_COLOR = { HIGH: "var(--green)", MEDIUM: "var(--amber)", LOW: "var(--red)" };

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return null;
  try {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60)    return `${Math.floor(s)}s ago`;
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return null; }
}

function fmt(n, d = 2) {
  return n == null ? "—" : Number(n).toFixed(d);
}

// ── Signal card ───────────────────────────────────────────────────────────────
function SignalCard({ sig }) {
  const type   = (sig.signal || "HOLD").toUpperCase();
  const conf   = (sig.confidence || "LOW").toUpperCase();
  const colors = SIG_COLOR[type] || SIG_COLOR.HOLD;
  const ret    = sig.expected_return_pct;

  const triggerBadge =
    sig.trigger === "price_spike" ? "⚡ spike" :
    sig.trigger === "on_demand"   ? "🔍 manual" : null;

  return (
    <div className="card fade-in" style={{
      border: `1px solid ${colors.border}`,
      boxShadow: `0 0 16px ${colors.color}10`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Top accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,transparent,${colors.color}80,transparent)`,
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>
            {sig.symbol}
          </span>
          {sig.price_at_signal != null && (
            <div style={{ marginTop: 3 }}>
              <span className="mono" style={{ fontSize: 12, color: "var(--text1)" }}>
                ${fmt(sig.price_at_signal)}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{
            padding: "2px 9px", borderRadius: 5, fontSize: 10, fontWeight: 700,
            fontFamily: "var(--mono)", letterSpacing: 1,
            background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color,
          }}>
            {type}
          </div>
          <span className="hint" style={{ color: CONF_COLOR[conf] }}>{conf}</span>
        </div>
      </div>

      {/* Summary */}
      {sig.summary && (
        <div style={{
          fontSize: 11, color: "var(--text2)", lineHeight: 1.6, marginBottom: 8,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {sig.summary}
        </div>
      )}

      {/* Meta row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {sig.target_price != null && (
          <span className="hint">
            Target: <span className="mono" style={{ color: "var(--text1)" }}>${fmt(sig.target_price)}</span>
            {ret != null && (
              <span style={{ marginLeft: 4, color: ret >= 0 ? "var(--green)" : "var(--red)" }}>
                ({ret >= 0 ? "+" : ""}{fmt(ret)}%)
              </span>
            )}
          </span>
        )}
        {sig.session_label && (
          <span className="hint mono">{sig.session_label}</span>
        )}
        {triggerBadge && (
          <span className="hint" style={{
            background: "var(--bg3)", border: "1px solid var(--border)",
            borderRadius: 4, padding: "1px 5px",
          }}>
            {triggerBadge}
          </span>
        )}
        <span className="hint" style={{ marginLeft: "auto" }}>{timeAgo(sig.generated_at)}</span>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[70, 100, 55].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 18 : 12, width: `${w}%`,
          background: "var(--bg3)", borderRadius: 4,
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

// ── Filter pill ───────────────────────────────────────────────────────────────
function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} className="btn" style={{
      padding: "3px 10px", fontSize: 11,
      background: active ? "#1f6feb33" : "var(--bg2)",
      borderColor: active ? "var(--blue)" : "var(--border)",
      color: active ? "var(--blue)" : "var(--text2)",
    }}>
      {label}
    </button>
  );
}

// ── Analyze panel (all users) ─────────────────────────────────────────────────
function AnalyzePanel({ onResult }) {
  const [sym, setSym]   = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);

  async function run() {
    const s = sym.trim().toUpperCase();
    if (!s || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${API}/api/signals/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: s }),
      });
      if (!res.ok) throw new Error(await res.text());
      onResult(await res.json());
      setSym("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <span className="hint mono" style={{ letterSpacing: 1 }}>ON-DEMAND ANALYZE</span>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="input"
          value={sym}
          onChange={e => setSym(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && run()}
          placeholder="Any symbol — e.g. TSLA"
          style={{ fontFamily: "var(--mono)", fontSize: 13 }}
        />
        <button
          className="btn btn-primary"
          onClick={run}
          disabled={busy || !sym.trim()}
          style={{ whiteSpace: "nowrap", minWidth: 110 }}
        >
          {busy ? "⟳ Analyzing…" : "⚡ Analyze"}
        </button>
      </div>
      {err && <span style={{ fontSize: 11, color: "var(--red)" }}>{err}</span>}
    </div>
  );
}

// ── Admin: Analyze All panel ──────────────────────────────────────────────────
function AnalyzeAllPanel({ onDone }) {
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [err, setErr]         = useState(null);

  async function run() {
    if (loading) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API}/api/signals/run-all`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setLastRun(new Date());
      onDone(data.signals || {});
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{
      marginBottom: 12, padding: "10px 16px",
      border: "1px solid #388bfd40", background: "#388bfd08",
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    }}>
      <span className="hint" style={{ color: "var(--blue)" }}>⚙ Admin</span>
      <span className="hint mono" style={{ flex: 1 }}>
        Force-regenerate signals for all admin tickers
      </span>
      {lastRun && (
        <span className="hint mono">Last run: {lastRun.toLocaleTimeString()}</span>
      )}
      {err && <span style={{ fontSize: 11, color: "var(--red)" }}>{err}</span>}
      <button
        className="btn btn-primary"
        onClick={run}
        disabled={loading}
        style={{ minWidth: 140 }}
      >
        {loading ? "⟳ Analyzing…" : "⚡ Analyze All"}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const SIG_TYPES = ["ALL", "BUY", "HOLD", "SELL"];
const CONFS     = ["ALL", "HIGH", "MEDIUM", "LOW"];

export default function Signals({ watchlist = [] }) {
  const auth = useAuthContext();                   // get isAdmin from context
  const isAdmin = auth?.isAdmin ?? false;

  const [feed, setFeed]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [cursor, setCursor]     = useState(null);
  const [hasMore, setHasMore]   = useState(true);
  const [err, setErr]           = useState(null);

  const [sigType, setSigType]   = useState(null);
  const [conf, setConf]         = useState(null);
  const [wlOnly, setWlOnly]     = useState(false);

  const bottomRef = useRef(null);

  function buildQS(cur) {
    const p = new URLSearchParams({ limit: 20 });
    if (cur)     p.set("after", cur);
    if (sigType) p.set("signal_type", sigType);
    if (conf)    p.set("confidence", conf);
    if (wlOnly)  p.set("watchlist_only", "true");
    return p.toString();
  }

  const loadFeed = useCallback(async (reset = false) => {
    const cur = reset ? null : cursor;
    if (!reset && (!hasMore || loadMore)) return;
    reset ? setLoading(true) : setLoadMore(true);
    setErr(null);
    try {
      const res = await fetch(`${API}/api/signals/feed?${buildQS(cur)}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const incoming = data.signals || [];
      setFeed(prev => reset ? incoming : [...prev, ...incoming]);
      setCursor(data.next_cursor || null);
      setHasMore(!!data.next_cursor);
    } catch (e) {
      setErr(e.message);
    } finally {
      reset ? setLoading(false) : setLoadMore(false);
    }
  }, [cursor, hasMore, loadMore, sigType, conf, wlOnly]);

  useEffect(() => { loadFeed(true); }, [sigType, conf, wlOnly]);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && hasMore && !loadMore) loadFeed();
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore, loadFeed]);

  // Prepend single result, deduplicated by symbol
  function handleAnalyzeResult(sig) {
    setFeed(prev => [sig, ...prev.filter(s => s.symbol !== sig.symbol)]);
  }

  // Admin: Analyze All replaces entire feed with fresh signals
  function handleAnalyzeAll(signalsMap) {
    const items = Object.entries(signalsMap).map(([sym, sig]) => ({ ...sig, symbol: sym }));
    items.sort((a, b) => (b.generated_at || "").localeCompare(a.generated_at || ""));
    setFeed(items);
    setCursor(null);
    setHasMore(false);
  }

  const buys  = feed.filter(s => s.signal === "BUY").length;
  const holds = feed.filter(s => s.signal === "HOLD").length;
  const sells = feed.filter(s => s.signal === "SELL").length;
  const total = buys + holds + sells;

  return (
    <div>
      {/* Summary badges + mood bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {[["BUY", buys, "var(--signal-buy)"], ["HOLD", holds, "var(--signal-hold)"], ["SELL", sells, "var(--signal-sell)"]].map(([l, c, col]) => (
          <div key={l} style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 11,
            fontFamily: "var(--mono)", fontWeight: 700,
            background: `${col}12`, border: `1px solid ${col}35`, color: col,
          }}>
            {c} {l}
          </div>
        ))}
        {total > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
            <div style={{ width: 80, height: 4, background: "var(--bg3)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2, transition: "width 0.6s",
                background: buys > sells ? "var(--signal-buy)" : sells > buys ? "var(--signal-sell)" : "var(--signal-hold)",
                width: `${Math.max(8, (Math.max(buys, sells) / total) * 100)}%`,
              }} />
            </div>
            <span className="mono" style={{
              fontSize: 10, fontWeight: 700,
              color: buys > sells ? "var(--signal-buy)" : sells > buys ? "var(--signal-sell)" : "var(--signal-hold)",
            }}>
              {buys > sells ? "BULLISH" : sells > buys ? "BEARISH" : "NEUTRAL"}
            </span>
          </div>
        )}
      </div>

      {/* Admin-only: Analyze All */}
      {isAdmin && <AnalyzeAllPanel onDone={handleAnalyzeAll} />}

      {/* All users: single symbol analyze */}
      <AnalyzePanel onResult={handleAnalyzeResult} />

      {/* Filter bar */}
      <div className="card" style={{ padding: "10px 14px", marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span className="hint mono" style={{ letterSpacing: 1, marginRight: 2 }}>SIGNAL</span>
        {SIG_TYPES.map(t => (
          <Pill key={t} label={t} active={sigType === (t === "ALL" ? null : t)} onClick={() => setSigType(t === "ALL" ? null : t)} />
        ))}
        <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />
        <span className="hint mono" style={{ letterSpacing: 1, marginRight: 2 }}>CONF</span>
        {CONFS.map(c => (
          <Pill key={c} label={c} active={conf === (c === "ALL" ? null : c)} onClick={() => setConf(c === "ALL" ? null : c)} />
        ))}
        <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />
        <Pill label="👁 Watchlist" active={wlOnly} onClick={() => setWlOnly(v => !v)} />
      </div>

      {/* Error */}
      {err && (
        <div className="card" style={{
          marginBottom: 12, padding: "10px 14px",
          border: "1px solid #f8514940", background: "#f8514910",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 12, color: "var(--red)" }}>{err}</span>
          <button className="btn" onClick={() => loadFeed(true)} style={{ fontSize: 11 }}>Retry</button>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="card-grid">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : feed.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div style={{ color: "var(--text2)", marginBottom: 4 }}>No signals match your filters</div>
          <div style={{ color: "var(--text3)", fontSize: 12 }}>
            Signals are generated automatically at scheduled times throughout the trading day
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {feed.map((sig, i) => (
            <SignalCard key={`${sig.symbol}-${sig.generated_at ?? i}`} sig={sig} />
          ))}
        </div>
      )}

      <div ref={bottomRef} style={{ height: 1 }} />

      {loadMore && (
        <div style={{ textAlign: "center", padding: "16px 0", fontSize: 12, color: "var(--text3)", fontFamily: "var(--mono)" }}>
          Loading more…
        </div>
      )}

      {!hasMore && feed.length > 0 && (
        <div style={{
          textAlign: "center", padding: "20px 0",
          fontSize: 11, color: "var(--border)", fontFamily: "var(--mono)",
          borderTop: "1px solid var(--border)", marginTop: 12,
        }}>
          — end of feed —
        </div>
      )}
    </div>
  );
}