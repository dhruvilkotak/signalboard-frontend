// src/pages/Signals.jsx
// Read-only feed — BUY/SELL HIGH/MEDIUM signals only, <7 days fresh by default.
// Rich cards: same detail as Live Prices AI Signal tab.
// Admin: "🔍 Scan & Refresh" button triggers POST /api/signals/run-all.

import { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { useAuthContext } from "../App";

const API  = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";
const MONO = "'IBM Plex Mono', monospace";

const SIG_COLOR = {
  BUY:  { color: "#3fb950", bg: "#0d2a1a", border: "#1a6336" },
  HOLD: { color: "#e3b341", bg: "#1a1206", border: "#6b4f06" },
  SELL: { color: "#f85149", bg: "#2a0808", border: "#7a1a1a" },
};
const CONF_COLOR = { HIGH: "#3fb950", MEDIUM: "#e3b341", LOW: "#f85149" };
const RISK_COLOR = { LOW: "#3fb950", MEDIUM: "#e3b341", HIGH: "#f85149" };

// Insider transaction colors
const INSIDER_COLOR = {
  Purchase: { color: "#3fb950", bg: "#0d2a1a", border: "#1a6336", icon: "▲" },
  Sale:     { color: "#f85149", bg: "#2a0808", border: "#7a1a1a", icon: "▼" },
  Award:    { color: "#58a6ff", bg: "#0d1a2a", border: "#1a3a6e", icon: "◆" },
};

function fmt(n, d = 2)  { return n == null ? "—" : `$${Number(n).toFixed(d)}`; }
function fmtPct(n)       { return n == null ? "—" : `${n >= 0 ? "+" : ""}${Number(n).toFixed(2)}%`; }
function fmtNum(n)       { if (!n) return "—"; if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`; if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`; return `$${n}`; }

function timeAgo(iso) {
  if (!iso) return null;
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return `${Math.floor(s)}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Prediction sparkline ──────────────────────────────────────────────────────
function PredictionSparkline({ current, targets, signal }) {
  if (!current || !targets) return null;
  const data = [
    { t: "Now", v: current },
    targets.week1  ? { t: "1W",  v: targets.week1  } : null,
    targets.month1 ? { t: "1M",  v: targets.month1 } : null,
    targets.month3 ? { t: "3M",  v: targets.month3 } : null,
  ].filter(Boolean);
  if (data.length < 2) return null;

  const color = SIG_COLOR[signal]?.color || "#58a6ff";
  const min   = Math.min(...data.map(d => d.v)) * 0.97;
  const max   = Math.max(...data.map(d => d.v)) * 1.03;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: MONO, fontSize: 7, color: "#6e7681", letterSpacing: 1, marginBottom: 4 }}>PRICE PREDICTION</div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`grad-${signal}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" tick={{ fontFamily: MONO, fontSize: 7, fill: "#6e7681" }} axisLine={false} tickLine={false} />
          <YAxis domain={[min, max]} hide />
          <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 4, fontFamily: MONO, fontSize: 9 }}
            formatter={v => [`$${Number(v).toFixed(2)}`]} labelStyle={{ color: "#8b949e" }} />
          <ReferenceLine y={current} stroke="#30363d" strokeDasharray="2 2" />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
            fill={`url(#grad-${signal})`} dot={{ fill: color, r: 2, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Insider table ─────────────────────────────────────────────────────────────
function InsiderTable({ trades, summary }) {
  if (!trades) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: MONO, fontSize: 7, color: "#6e7681", letterSpacing: 1, marginBottom: 6 }}>
        SEC INSIDER ACTIVITY (FORM 4 — LAST 90 DAYS)
      </div>
      {trades.length === 0 ? (
        <div style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681" }}>No insider filings in last 90 days</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {trades.map((t, i) => {
            const tc = INSIDER_COLOR[t.type] || { color: "#8b949e", bg: "#161b22", border: "#21262d", icon: "•" };
            return (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto auto",
                gap: 8, alignItems: "center",
                background: tc.bg, border: `1px solid ${tc.border}`,
                borderRadius: 6, padding: "5px 10px",
              }}>
                {/* Type badge */}
                <span style={{
                  fontFamily: MONO, fontSize: 9, fontWeight: 700,
                  color: tc.color, minWidth: 60,
                }}>
                  {tc.icon} {t.type}
                </span>
                {/* Name + role */}
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: "#e6edf3" }}>{t.name}</div>
                  {t.role && t.role !== "Insider" && (
                    <div style={{ fontFamily: MONO, fontSize: 7, color: "#6e7681" }}>{t.role}</div>
                  )}
                </div>
                {/* Shares */}
                <span style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e", textAlign: "right" }}>
                  {t.shares ? `${t.shares.toLocaleString()} sh` : "—"}
                </span>
                {/* Avg price */}
                <span style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e", textAlign: "right" }}>
                  {t.price ? fmt(t.price) : "—"}
                </span>
                {/* Total value */}
                <span style={{ fontFamily: MONO, fontSize: 9, color: tc.color, fontWeight: 700, textAlign: "right" }}>
                  {t.total_value ? fmtNum(t.total_value) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {summary && (
        <div style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e", marginTop: 6, lineHeight: 1.5 }}>{summary}</div>
      )}
    </div>
  );
}

// ── Sentiment bar ─────────────────────────────────────────────────────────────
function SentimentBar({ sentiment }) {
  if (!sentiment?.sentiment_label) return null;
  const bull = sentiment.bullish_pct || 50;
  const bear = sentiment.bearish_pct || 50;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: MONO, fontSize: 7, color: "#6e7681", letterSpacing: 1 }}>RETAIL SENTIMENT (STOCKTWITS)</span>
        <span style={{ fontFamily: MONO, fontSize: 7, color: "#6e7681" }}>
          {sentiment.message_volume || 0} msgs · {(sentiment.watchlist_count || 0).toLocaleString()} watching
        </span>
      </div>
      <div style={{ height: 5, background: "#21262d", borderRadius: 3, overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${bull}%`, background: "#3fb950" }} />
        <div style={{ width: `${bear}%`, background: "#f85149" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: "#3fb950" }}>▲ {bull}% Bullish</span>
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700,
          color: sentiment.sentiment_label === "Bullish" ? "#3fb950" : sentiment.sentiment_label === "Bearish" ? "#f85149" : "#e3b341"
        }}>{sentiment.sentiment_label}</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: "#f85149" }}>{bear}% Bearish ▼</span>
      </div>
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
  const score  = sig.conviction_score;

  const triggerBadge =
    sig.trigger === "price_spike" ? "⚡ spike" :
    sig.trigger === "on_demand"   ? "🔍 manual" : null;

  return (
    <div className="card fade-in" style={{
      border: `1px solid ${colors.border}`,
      boxShadow: `0 0 16px ${colors.color}12`,
      position: "relative", overflow: "hidden",
      cursor: "pointer",
    }} onClick={() => setExpanded(e => !e)}>

      {/* Top accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,transparent,${colors.color}80,transparent)`,
      }} />

      {/* ── Collapsed header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          {/* Row 1: symbol + badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: "#e6edf3" }}>{sig.symbol}</span>
            <span style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: 1,
              background: colors.bg, border: `1px solid ${colors.border}`,
              borderRadius: 4, padding: "2px 8px", color: colors.color,
            }}>{type}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: CONF_COLOR[conf] }}>{conf}</span>
            {score != null && (
              <span style={{
                fontFamily: MONO, fontSize: 8,
                color: score >= 7 ? "#3fb950" : score >= 5 ? "#e3b341" : "#f85149",
                background: "#161b22", border: "1px solid #21262d",
                borderRadius: 4, padding: "1px 5px",
              }}>
                score {score}/10
              </span>
            )}
            {triggerBadge && (
              <span style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681", background: "#161b22", border: "1px solid #21262d", borderRadius: 4, padding: "1px 5px" }}>
                {triggerBadge}
              </span>
            )}
          </div>
          {/* Row 2: price + target + stop loss + timeframe */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            {sig.price_at_signal != null && (
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#e6edf3" }}>{fmt(sig.price_at_signal)}</span>
            )}
            {sig.target_price != null && (
              <span style={{ fontFamily: MONO, fontSize: 10, color: "#8b949e" }}>
                → {fmt(sig.target_price)}
                {ret != null && <span style={{ marginLeft: 4, color: ret >= 0 ? "#3fb950" : "#f85149" }}>{fmtPct(ret)}</span>}
              </span>
            )}
            {sig.stop_loss != null && (
              <span style={{ fontFamily: MONO, fontSize: 9, color: "#f85149" }}>SL {fmt(sig.stop_loss)}</span>
            )}
            {sig.timeframe && (
              <span style={{ fontFamily: MONO, fontSize: 8, color: "#58a6ff", background: "#58a6ff12", border: "1px solid #58a6ff33", borderRadius: 4, padding: "1px 6px" }}>
                {sig.timeframe}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681" }}>{timeAgo(sig.generated_at)}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Summary — 2 lines collapsed, full expanded */}
      {sig.summary && (
        <div style={{
          fontFamily: MONO, fontSize: 10, color: "#8b949e", lineHeight: 1.6,
          marginBottom: expanded ? 12 : 0,
          ...(!expanded ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}),
        }}>
          {sig.summary}
        </div>
      )}

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ borderTop: "1px solid #21262d", paddingTop: 12, marginTop: 4 }}>

          {/* Price targets row */}
          {sig.price_targets && Object.keys(sig.price_targets).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 12 }}>
              {[["1W", sig.price_targets.week1], ["2W", sig.price_targets.week2], ["1M", sig.price_targets.month1], ["3M", sig.price_targets.month3]].map(([label, val]) => val && (
                <div key={label} style={{ background: "#161b22", borderRadius: 6, padding: "6px 8px", border: "1px solid #21262d", textAlign: "center" }}>
                  <div style={{ fontFamily: MONO, fontSize: 7, color: "#6e7681", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#e6edf3" }}>{fmt(val)}</div>
                  {sig.price_at_signal && (
                    <div style={{ fontFamily: MONO, fontSize: 8, color: val >= sig.price_at_signal ? "#3fb950" : "#f85149" }}>
                      {fmtPct((val - sig.price_at_signal) / sig.price_at_signal * 100)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Sparkline */}
          <PredictionSparkline current={sig.price_at_signal} targets={sig.price_targets} signal={type} />

          {/* Key factors */}
          {sig.key_factors?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 7, color: "#6e7681", letterSpacing: 1, marginBottom: 5 }}>KEY FACTORS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {sig.key_factors.map((f, i) => (
                  <span key={i} style={{ fontFamily: MONO, fontSize: 8, background: "#161b22", border: "1px solid #21262d", borderRadius: 4, padding: "2px 7px", color: "#8b949e" }}>{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Bull / Bear */}
          {(sig.bull_case || sig.bear_case) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {sig.bull_case && (
                <div style={{ background: "#0d2a1a", border: "1px solid #1a633633", borderRadius: 7, padding: "8px 10px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 7, color: "#3fb950", letterSpacing: 1, marginBottom: 4 }}>🐂 BULL CASE</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e", lineHeight: 1.55 }}>{sig.bull_case}</div>
                </div>
              )}
              {sig.bear_case && (
                <div style={{ background: "#2a0808", border: "1px solid #7a1a1a33", borderRadius: 7, padding: "8px 10px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 7, color: "#f85149", letterSpacing: 1, marginBottom: 4 }}>🐻 BEAR CASE</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e", lineHeight: 1.55 }}>{sig.bear_case}</div>
                </div>
              )}
            </div>
          )}

          {/* Insider table */}
          <InsiderTable trades={sig.insider_trades} summary={sig.insider_summary} />

          {/* Sentiment */}
          <SentimentBar sentiment={sig.sentiment} />

          {/* Disclaimer */}
          <div style={{ fontFamily: MONO, fontSize: 7, color: "#3a4258", lineHeight: 1.6, borderTop: "1px solid #21262d", paddingTop: 8, marginTop: 4 }}>
            ⚠ AI-generated signal. Not financial advice. Do your own research.
          </div>
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
        <div key={i} style={{ height: i === 0 ? 18 : 11, width: `${w}%`, background: "var(--bg3)", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
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
    }}>{label}</button>
  );
}

// ── Admin scan panel ──────────────────────────────────────────────────────────
function AdminScanPanel({ onDone }) {
  const [loading, setLoading]   = useState(false);
  const [lastRun, setLastRun]   = useState(null);
  const [result,  setResult]    = useState(null);
  const [err,     setErr]       = useState(null);

  async function scan() {
    if (loading) return;
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const { getToken } = await import("../lib/api");
      const token = await getToken();
      const res = await fetch(`${API}/api/signals/run-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setLastRun(new Date());
      onDone(data.signals || {});
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Pull auth header via api.js getToken export

    try {
      // Import the authHeaders helper indirectly via a known export
      const apiModule = await import("../lib/api");
      // Call a dummy authenticated endpoint to get the token structure
      // Actually: replicate the authHeaders logic
      const token = await apiModule._getTokenDirect?.();
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }

  const feedCount = result ? Object.values(result.signals || {}).filter(s => s.feed_eligible).length : null;

  return (
    <div className="card" style={{
      marginBottom: 12, padding: "12px 16px",
      border: "1px solid #388bfd40", background: "#388bfd06",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: "#58a6ff", fontFamily: MONO, fontWeight: 700 }}>⚙ ADMIN</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--text1)", marginBottom: 2 }}>
            Scan & Refresh Signals
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--text3)" }}>
            Force-regenerates signals for all {" "}
            admin tickers using real RSI/MACD + SEC insider + StockTwits data.
            Only BUY/SELL with HIGH/MEDIUM confidence will appear in the feed.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {lastRun && (
            <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--text3)" }}>
              Last: {lastRun.toLocaleTimeString()}
              {feedCount != null && ` · ${feedCount} feed-eligible`}
            </span>
          )}
          {err && <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--red)" }}>{err}</span>}
          <button
            className="btn btn-primary"
            onClick={scan}
            disabled={loading}
            style={{ minWidth: 160, fontFamily: MONO, fontSize: 11 }}
          >
            {loading ? "⟳ Scanning…" : "🔍 Scan & Refresh"}
          </button>
        </div>
      </div>

      {/* Progress/result */}
      {loading && (
        <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 9, color: "var(--text3)" }}>
          Fetching price · technicals · SEC insider data · StockTwits sentiment · calling Claude…
        </div>
      )}
      {result && !loading && (
        <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            ["Total", result.count, "#8b949e"],
            ["BUY", Object.values(result.signals||{}).filter(s=>s.signal==="BUY").length, "#3fb950"],
            ["SELL", Object.values(result.signals||{}).filter(s=>s.signal==="SELL").length, "#f85149"],
            ["HOLD", Object.values(result.signals||{}).filter(s=>s.signal==="HOLD").length, "#e3b341"],
            ["In Feed", feedCount, "#58a6ff"],
          ].map(([label, val, color]) => (
            <div key={label} style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681" }}>{label}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color }}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const SIG_TYPES = ["ALL", "BUY", "SELL"];
const CONFS     = ["ALL", "HIGH", "MEDIUM"];

export default function Signals({ watchlist = [] }) {
  const auth    = useAuthContext();
  const isAdmin = auth?.isAdmin ?? false;

  const [feed,     setFeed]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [cursor,   setCursor]   = useState(null);
  const [hasMore,  setHasMore]  = useState(true);
  const [err,      setErr]      = useState(null);
  const [showAll,  setShowAll]  = useState(false);

  const [sigType, setSigType] = useState(null);
  const [conf,    setConf]    = useState(null);

  const bottomRef = useRef(null);

  function buildQS(cur) {
    const p = new URLSearchParams({ limit: 20 });
    if (cur)     p.set("after", cur);
    if (sigType) p.set("signal_type", sigType);
    if (conf)    p.set("confidence", conf);
    if (showAll) p.set("show_all", "true");
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
      setFeed(prev => reset ? (data.signals || []) : [...prev, ...(data.signals || [])]);
      setCursor(data.next_cursor || null);
      setHasMore(!!data.next_cursor);
    } catch (e) {
      setErr(e.message);
    } finally {
      reset ? setLoading(false) : setLoadMore(false);
    }
  }, [cursor, hasMore, loadMore, sigType, conf, showAll]);

  useEffect(() => { loadFeed(true); }, [sigType, conf, showAll]);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && hasMore && !loadMore) loadFeed();
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore, loadFeed]);

  // After admin scan, reload feed to show new signals
  function handleScanDone(_signals) {
    loadFeed(true);
  }

  const buys  = feed.filter(s => s.signal === "BUY").length;
  const sells = feed.filter(s => s.signal === "SELL").length;
  const total = buys + sells;

  return (
    <div>
      {/* Summary badges */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {[["BUY", buys, "var(--signal-buy)"], ["SELL", sells, "var(--signal-sell)"]].map(([l, c, col]) => (
          <div key={l} style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 11,
            fontFamily: "var(--mono)", fontWeight: 700,
            background: `${col}12`, border: `1px solid ${col}35`, color: col,
          }}>{c} {l}</div>
        ))}
        {total > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
            <div style={{ width: 80, height: 4, background: "var(--bg3)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2, transition: "width 0.6s",
                background: buys > sells ? "var(--signal-buy)" : buys < sells ? "var(--signal-sell)" : "var(--signal-hold)",
                width: `${Math.max(8, (Math.max(buys, sells) / total) * 100)}%`,
              }} />
            </div>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700,
              color: buys > sells ? "var(--signal-buy)" : buys < sells ? "var(--signal-sell)" : "var(--signal-hold)",
            }}>
              {buys > sells ? "BULLISH" : buys < sells ? "BEARISH" : "NEUTRAL"}
            </span>
          </div>
        )}
        <div style={{ marginLeft: "auto" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#6e7681", background: "#161b22", border: "1px solid #21262d", borderRadius: 6, padding: "3px 10px" }}>
            ⚡ Signals via Live Prices → AI Signal tab
          </span>
        </div>
      </div>

      {/* Admin scan panel */}
      {isAdmin && <AdminScanPanel onDone={handleScanDone} />}

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
        <Pill label={showAll ? "📅 Last 45 days" : "📅 Last 7 days"} active={showAll} onClick={() => setShowAll(v => !v)} />
        <button onClick={() => loadFeed(true)} className="btn" style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px" }}>↻</button>
      </div>

      {/* Error */}
      {err && (
        <div className="card" style={{ marginBottom: 12, padding: "10px 14px", border: "1px solid #f8514940", background: "#f8514910", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--red)" }}>{err}</span>
          <button className="btn" onClick={() => loadFeed(true)} style={{ fontSize: 11 }}>Retry</button>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="card-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : feed.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div style={{ color: "var(--text2)", marginBottom: 4, fontSize: 14 }}>
            No high-conviction signals yet
          </div>
          <div style={{ color: "var(--text3)", fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>
            Only BUY/SELL signals with HIGH or MEDIUM confidence appear here.
            <br />Signals are generated automatically during market hours.
          </div>
          {isAdmin && (
            <div style={{ color: "var(--blue)", fontSize: 12, fontFamily: "var(--mono)" }}>
              Use the "Scan & Refresh" button above to generate fresh signals now.
            </div>
          )}
          {!isAdmin && (
            <div style={{ color: "var(--text3)", fontSize: 12, fontFamily: "var(--mono)" }}>
              Generate a signal: Live Prices → select stock → AI Signal tab
            </div>
          )}
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
        <div style={{ textAlign: "center", padding: "20px 0", fontSize: 11, color: "var(--border)", fontFamily: "var(--mono)", borderTop: "1px solid var(--border)", marginTop: 12 }}>
          — end of feed —
        </div>
      )}
    </div>
  );
}