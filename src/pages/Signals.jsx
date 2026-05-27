// src/pages/Signals.jsx
// Read-only signal feed — no analyze input, no Analyze All.
// Signal generation moved to Live Prices → AI Signal tab.
// Richer cards: price prediction chart, timeframe, insider summary, sentiment.

import { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const API  = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";
const MONO = "'IBM Plex Mono', monospace";

const SIG_COLOR = {
  BUY:  { color: "#3fb950", bg: "#0d2a1a", border: "#1a6336" },
  HOLD: { color: "#e3b341", bg: "#1a1206", border: "#6b4f06" },
  SELL: { color: "#f85149", bg: "#2a0808", border: "#7a1a1a" },
};
const CONF_COLOR = { HIGH: "#3fb950", MEDIUM: "#e3b341", LOW: "#f85149" };

function fmt(n, d = 2)  { return n == null ? "—" : `$${Number(n).toFixed(d)}`; }
function fmtPct(n)       { return n == null ? "—" : `${n >= 0 ? "+" : ""}${Number(n).toFixed(2)}%`; }

function timeAgo(iso) {
  if (!iso) return null;
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return `${Math.floor(s)}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Mini prediction sparkline inside card ─────────────────────────────────────
function PredictionSparkline({ current, targets, signal }) {
  if (!current || !targets) return null;
  const data = [
    { t: "Now", v: current },
    targets.week1  && { t: "1W",  v: targets.week1  },
    targets.month1 && { t: "1M",  v: targets.month1 },
    targets.month3 && { t: "3M",  v: targets.month3 },
  ].filter(Boolean);
  if (data.length < 2) return null;

  const color = SIG_COLOR[signal]?.color || "#58a6ff";
  const min = Math.min(...data.map(d => d.v)) * 0.98;
  const max = Math.max(...data.map(d => d.v)) * 1.02;

  return (
    <div style={{ height: 52, marginBottom: 10 }}>
      <div style={{ fontFamily: MONO, fontSize: 7, color: "#6e7681", letterSpacing: 1, marginBottom: 3 }}>
        PRICE PREDICTION
      </div>
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="t" tick={{ fontFamily: MONO, fontSize: 7, fill: "#6e7681" }} axisLine={false} tickLine={false} />
          <YAxis domain={[min, max]} hide />
          <Tooltip
            contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 4, fontFamily: MONO, fontSize: 9 }}
            formatter={v => [`$${Number(v).toFixed(2)}`]}
            labelStyle={{ color: "#8b949e" }}
          />
          <ReferenceLine y={current} stroke="#30363d" strokeDasharray="2 2" />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={{ fill: color, r: 2, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Signal card ───────────────────────────────────────────────────────────────
function SignalCard({ sig }) {
  const [expanded, setExpanded] = useState(false);
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
      boxShadow: `0 0 14px ${colors.color}10`,
      position: "relative", overflow: "hidden",
      cursor: "pointer",
    }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Top accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,transparent,${colors.color}80,transparent)`,
      }} />

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: "#e6edf3" }}>
              {sig.symbol}
            </span>
            <span style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: 1,
              background: colors.bg, border: `1px solid ${colors.border}`,
              borderRadius: 4, padding: "2px 8px", color: colors.color,
            }}>{type}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: CONF_COLOR[conf] }}>{conf}</span>
            {triggerBadge && (
              <span style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681", background: "#161b22", border: "1px solid #21262d", borderRadius: 4, padding: "1px 5px" }}>
                {triggerBadge}
              </span>
            )}
          </div>
          {sig.price_at_signal != null && (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#e6edf3" }}>
                {fmt(sig.price_at_signal)}
              </span>
              {sig.target_price != null && (
                <span style={{ fontFamily: MONO, fontSize: 10, color: "#8b949e" }}>
                  → {fmt(sig.target_price)}
                  {ret != null && (
                    <span style={{ marginLeft: 5, color: ret >= 0 ? "#3fb950" : "#f85149" }}>
                      {fmtPct(ret)}
                    </span>
                  )}
                </span>
              )}
              {sig.stop_loss != null && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: "#f85149" }}>
                  SL {fmt(sig.stop_loss)}
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681" }}>{timeAgo(sig.generated_at)}</span>
          {sig.timeframe && (
            <span style={{ fontFamily: MONO, fontSize: 8, color: "#58a6ff", background: "#58a6ff12", border: "1px solid #58a6ff33", borderRadius: 4, padding: "1px 6px" }}>
              {sig.timeframe}
            </span>
          )}
          <span style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681" }}>
            {expanded ? "▲ less" : "▼ more"}
          </span>
        </div>
      </div>

      {/* Summary */}
      {sig.summary && (
        <div style={{
          fontFamily: MONO, fontSize: 10, color: "#8b949e", lineHeight: 1.6,
          marginBottom: expanded ? 12 : 0,
          ...(!expanded ? {
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          } : {}),
        }}>
          {sig.summary}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: "1px solid #21262d", paddingTop: 12, marginTop: 4 }}>

          {/* Sparkline */}
          <PredictionSparkline
            current={sig.price_at_signal}
            targets={sig.price_targets}
            signal={sig.signal}
          />

          {/* Key factors */}
          {sig.key_factors?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 7, color: "#6e7681", letterSpacing: 1, marginBottom: 5 }}>KEY FACTORS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {sig.key_factors.map((f, i) => (
                  <span key={i} style={{ fontFamily: MONO, fontSize: 8, background: "#161b22", border: "1px solid #21262d", borderRadius: 4, padding: "2px 7px", color: "#8b949e" }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Insider + sentiment summaries */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {sig.insider_summary && (
              <div style={{ background: "#161b22", borderRadius: 6, padding: "7px 10px", border: "1px solid #21262d" }}>
                <div style={{ fontFamily: MONO, fontSize: 7, color: "#6e7681", letterSpacing: 1, marginBottom: 3 }}>INSIDERS</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e", lineHeight: 1.5 }}>{sig.insider_summary}</div>
              </div>
            )}
            {sig.sentiment_summary && (
              <div style={{ background: "#161b22", borderRadius: 6, padding: "7px 10px", border: "1px solid #21262d" }}>
                <div style={{ fontFamily: MONO, fontSize: 7, color: "#6e7681", letterSpacing: 1, marginBottom: 3 }}>SENTIMENT</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e", lineHeight: 1.5 }}>{sig.sentiment_summary}</div>
              </div>
            )}
          </div>

          {/* Bull / Bear */}
          {(sig.bull_case || sig.bear_case) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {sig.bull_case && (
                <div style={{ background: "#0d2a1a", border: "1px solid #1a633633", borderRadius: 6, padding: "6px 9px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 7, color: "#3fb950", letterSpacing: 1, marginBottom: 3 }}>🐂 BULL</div>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: "#8b949e", lineHeight: 1.5 }}>{sig.bull_case}</div>
                </div>
              )}
              {sig.bear_case && (
                <div style={{ background: "#2a0808", border: "1px solid #7a1a1a33", borderRadius: 6, padding: "6px 9px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 7, color: "#f85149", letterSpacing: 1, marginBottom: 3 }}>🐻 BEAR</div>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: "#8b949e", lineHeight: 1.5 }}>{sig.bear_case}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[60, 90, 75, 50].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 18 : 11, width: `${w}%`,
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

// ── Main page ─────────────────────────────────────────────────────────────────
const SIG_TYPES = ["ALL", "BUY", "HOLD", "SELL"];
const CONFS     = ["ALL", "HIGH", "MEDIUM", "LOW"];

export default function Signals({ watchlist = [] }) {
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

  const buys  = feed.filter(s => s.signal === "BUY").length;
  const holds = feed.filter(s => s.signal === "HOLD").length;
  const sells = feed.filter(s => s.signal === "SELL").length;
  const total = buys + holds + sells;

  return (
    <div>
      {/* Summary badges + mood */}
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
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700,
              color: buys > sells ? "var(--signal-buy)" : sells > buys ? "var(--signal-sell)" : "var(--signal-hold)",
            }}>
              {buys > sells ? "BULLISH" : sells > buys ? "BEARISH" : "NEUTRAL"}
            </span>
          </div>
        )}

        {/* Info banner — signal generation moved to Live Prices */}
        <div style={{ marginLeft: "auto" }}>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 9, color: "#6e7681",
            background: "#161b22", border: "1px solid #21262d",
            borderRadius: 6, padding: "3px 10px",
          }}>
            ⚡ Generate signals in Live Prices → AI Signal tab
          </span>
        </div>
      </div>

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
        <button onClick={() => loadFeed(true)} className="btn" style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px" }}>
          ↻ Refresh
        </button>
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
          <div style={{ color: "var(--text2)", marginBottom: 4 }}>No signals yet</div>
          <div style={{ color: "var(--text3)", fontSize: 12, marginBottom: 12 }}>
            Signals are generated automatically at scheduled times throughout the trading day
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--blue)" }}>
            To generate a signal now: Live Prices → select a ticker → AI Signal tab
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