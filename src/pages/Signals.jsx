// src/pages/Signals.jsx — v2
// One card per symbol (deduped). History modal shows feed-eligible snapshots
// for that symbol from signal_snapshots/{symbol}/history, newest first.

import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { useAuthContext } from "../App";
import InsiderActivity from "../components/signal/InsiderActivity";
import SentimentBar    from "../components/signal/SentimentBar";
import KeyFactors      from "../components/signal/KeyFactors";
import BullBearCase    from "../components/signal/BullBearCase";
import { deleteSignalSnapshot, getToken } from "../lib/api";

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

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function timeAgo(iso) {
  if (!iso) return null;
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return `${Math.floor(s)}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── History Modal ─────────────────────────────────────────────────────────────
function HistoryModal({ sig, onClose }) {
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const symbol = sig.symbol;
  const type   = (sig.signal || "HOLD").toUpperCase();
  const colors = SIG_COLOR[type] || SIG_COLOR.HOLD;

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true); setError(null);
      try {
        const token = await getToken();
        const res = await fetch(`${API}/api/signals/${symbol}/history`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        // Sort descending by generated_at (newest first)
        const sorted = (data.history || []).sort((a, b) =>
          (b.generated_at || "").localeCompare(a.generated_at || "")
        );
        setHistory(sorted);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [symbol]);

  // Close on overlay click or Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const sigBadge = (signal) => {
    const c = SIG_COLOR[(signal || "HOLD").toUpperCase()] || SIG_COLOR.HOLD;
    return (
      <span style={{
        fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 4, padding: "2px 8px", color: c.color, minWidth: 36,
        display: "inline-block", textAlign: "center",
      }}>
        {(signal || "?").toUpperCase()}
      </span>
    );
  };

  return (
    // Overlay
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(1,4,9,0.80)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2000, backdropFilter: "blur(4px)", padding: 16,
      }}
    >
      {/* Modal — stop click propagation */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#161b22", border: `1px solid ${colors.border}`,
          borderRadius: 14, width: "100%", maxWidth: 520,
          maxHeight: "85vh", display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #21262d",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: "#e6edf3" }}>
              {symbol}
            </span>
            {sigBadge(sig.signal)}
            <span style={{ fontFamily: MONO, fontSize: 9, color: CONF_COLOR[sig.confidence] }}>
              {sig.confidence}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "#6e7681",
              fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "2px 6px",
            }}
          >✕</button>
        </div>

        {/* Current signal summary — highlighted */}
        <div style={{
          padding: "12px 20px", background: `${colors.color}10`,
          borderBottom: "1px solid #21262d", flexShrink: 0,
        }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: colors.color, fontWeight: 700, marginBottom: 6 }}>
            CURRENT SIGNAL — {(sig.session || "").replace("_", " ").toUpperCase()}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                ["Price",       fmt(sig.price_at_signal)],
                ["Conviction",  `${sig.conviction_score ?? "—"}/10`],
                ["Return",      fmtPct(sig.expected_return_pct)],
                ["Stop-loss",   fmt(sig.stop_loss)],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681", marginBottom: 2 }}>{l}</div>
                  <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "#e6edf3" }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681" }}>
                {fmtDateTime(sig.generated_at)}
              </div>
            </div>
          </div>
        </div>

        {/* History section header */}
        <div style={{
          padding: "10px 20px 6px", borderBottom: "1px solid #21262d",
          flexShrink: 0,
        }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681", letterSpacing: 1 }}>
            SIGNAL HISTORY — LAST 20 DAYS (FEED-ELIGIBLE ONLY) · NEWEST FIRST
          </div>
        </div>

        {/* Scrollable history list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", fontFamily: MONO, fontSize: 11, color: "#6e7681" }}>
              Loading history…
            </div>
          ) : error ? (
            <div style={{ padding: 24, textAlign: "center", fontFamily: MONO, fontSize: 11, color: "#f85149" }}>
              {error}
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontFamily: MONO, fontSize: 11, color: "#6e7681" }}>
              No history yet — history builds as new signals are generated.
            </div>
          ) : (
            history.map((h, i) => {
              const isCurrent = h.snapshot_id === sig.snapshot_id ||
                h.generated_at === sig.generated_at;
              const hType   = (h.signal || "HOLD").toUpperCase();
              const hColors = SIG_COLOR[hType] || SIG_COLOR.HOLD;
              return (
                <div
                  key={h.snapshot_id || i}
                  style={{
                    padding: "10px 20px",
                    background: isCurrent ? `${colors.color}08` : "transparent",
                    borderBottom: "1px solid #21262d",
                    display: "flex", alignItems: "center", gap: 12,
                  }}
                >
                  {/* Signal badge */}
                  <span style={{
                    fontFamily: MONO, fontSize: 9, fontWeight: 700,
                    background: hColors.bg, border: `1px solid ${hColors.border}`,
                    borderRadius: 4, padding: "2px 7px", color: hColors.color,
                    minWidth: 32, textAlign: "center", flexShrink: 0,
                  }}>{hType}</span>

                  {/* Confidence */}
                  <span style={{
                    fontFamily: MONO, fontSize: 9,
                    color: CONF_COLOR[h.confidence] || "#6e7681",
                    minWidth: 44, flexShrink: 0,
                  }}>{h.confidence || "—"}</span>

                  {/* Conviction */}
                  <span style={{
                    fontFamily: MONO, fontSize: 9, color: "#8b949e",
                    minWidth: 32, flexShrink: 0,
                  }}>{h.conviction_score != null ? `${h.conviction_score}/10` : "—"}</span>

                  {/* Price */}
                  <span style={{
                    fontFamily: MONO, fontSize: 10, color: "#e6edf3",
                    minWidth: 56, flexShrink: 0,
                  }}>{fmt(h.price_at_signal)}</span>

                  {/* Expected return */}
                  <span style={{
                    fontFamily: MONO, fontSize: 9,
                    color: (h.expected_return_pct ?? 0) >= 0 ? "#3fb950" : "#f85149",
                    minWidth: 48, flexShrink: 0,
                  }}>{fmtPct(h.expected_return_pct)}</span>

                  {/* Session */}
                  <span style={{
                    fontFamily: MONO, fontSize: 9, color: "#6e7681",
                    minWidth: 68, flexShrink: 0,
                  }}>{(h.session || "").replace(/_/g, " ")}</span>

                  {/* Date + time — right aligned, DESC */}
                  <span style={{
                    fontFamily: MONO, fontSize: 9,
                    color: isCurrent ? colors.color : "#6e7681",
                    marginLeft: "auto", flexShrink: 0, textAlign: "right",
                  }}>
                    {fmtDateTime(h.generated_at)}
                    {isCurrent && (
                      <span style={{ marginLeft: 6, color: colors.color, fontWeight: 700 }}>← current</span>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 20px", borderTop: "1px solid #21262d",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681" }}>
            {history.length} signal{history.length !== 1 ? "s" : ""} · feed-eligible only
          </span>
          <button
            onClick={onClose}
            style={{
              fontFamily: MONO, fontSize: 11, padding: "5px 16px",
              background: "#21262d", border: "1px solid #30363d",
              borderRadius: 6, color: "#8b949e", cursor: "pointer",
            }}
          >Close</button>
        </div>
      </div>
    </div>
  );
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
      <div style={{ fontFamily: MONO, fontSize: 7, color: "#6e7681", letterSpacing: 1, marginBottom: 4 }}>
        PRICE PREDICTION
      </div>
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
          <Tooltip
            contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 4, fontFamily: MONO, fontSize: 9 }}
            formatter={v => [`$${Number(v).toFixed(2)}`]}
            labelStyle={{ color: "#8b949e" }}
          />
          <ReferenceLine y={current} stroke="#30363d" strokeDasharray="2 2" />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
            fill={`url(#grad-${signal})`} dot={{ fill: color, r: 2, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Signal card ───────────────────────────────────────────────────────────────
function SignalCard({ sig, isAdmin, onDelete }) {
  const [expanded,    setExpanded]    = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const type   = (sig.signal || "HOLD").toUpperCase();
  const conf   = (sig.confidence || "LOW").toUpperCase();
  const colors = SIG_COLOR[type] || SIG_COLOR.HOLD;
  const ret    = sig.expected_return_pct;
  const score  = sig.conviction_score;

  const changedBadge = sig.signal_changed
    ? `now ${sig.current_signal || "?"} ${sig.current_confidence || ""}`.trim()
    : null;

  async function handleDelete(e) {
    e.stopPropagation();
    if (!sig.snapshot_doc_id) {
      alert("Missing snapshot_doc_id.");
      return;
    }
    if (!window.confirm(`Delete signal snapshot for ${sig.symbol}?`)) return;
    try {
      setDeleting(true);
      await deleteSignalSnapshot(sig.snapshot_doc_id);
      if (onDelete) onDelete(sig);
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {showHistory && (
        <HistoryModal sig={sig} onClose={() => setShowHistory(false)} />
      )}

      <div className="card fade-in" style={{
        border: `1px solid ${colors.border}`,
        boxShadow: `0 0 16px ${colors.color}12`,
        position: "relative", overflow: "hidden", cursor: "pointer",
      }} onClick={() => setExpanded(e => !e)}>

        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg,transparent,${colors.color}80,transparent)`,
        }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
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
                }}>conviction {score}/10</span>
              )}
              {changedBadge && (
                <span style={{
                  fontFamily: MONO, fontSize: 8, color: "#e3b341",
                  background: "#e3b34112", border: "1px solid #e3b34130",
                  borderRadius: 4, padding: "1px 6px",
                }}>⚡ {changedBadge}</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681" }}>PRICE</div>
                <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "#e6edf3" }}>
                  {fmt(sig.price_at_signal)}
                </div>
              </div>
              {ret != null && (
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681" }}>EXPECTED RETURN</div>
                  <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: ret >= 0 ? "#3fb950" : "#f85149" }}>
                    {fmtPct(ret)}
                  </div>
                </div>
              )}
              {sig.target_price && (
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681" }}>TARGET</div>
                  <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "#e6edf3" }}>
                    {fmt(sig.target_price)}
                  </div>
                </div>
              )}
              {sig.stop_loss && (
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681" }}>STOP-LOSS</div>
                  <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "#f85149" }}>
                    {fmt(sig.stop_loss)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginLeft: 12 }}>
            {isAdmin && (
              <button
                style={{ fontFamily: MONO, fontSize: 9, color: "#f85149", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                onClick={handleDelete} disabled={deleting}
              >{deleting ? "…" : "✕"}</button>
            )}
            <div style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681", textAlign: "right" }}>
              {timeAgo(sig.generated_at)}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681", textAlign: "right" }}>
              {(sig.session || "").replace(/_/g, " ")}
            </div>
          </div>
        </div>

        {/* Summary */}
        {sig.summary && (
          <div style={{
            fontFamily: MONO, fontSize: 10, color: "#8b949e", lineHeight: 1.6,
            display: expanded ? "block" : "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            overflow: expanded ? "visible" : "hidden",
            marginBottom: 10,
          }}>{sig.summary}</div>
        )}

        {/* Expanded detail */}
        {expanded && (
          <div style={{ paddingTop: 8, borderTop: "1px solid #21262d" }}>
            <PredictionSparkline
              current={sig.price_at_signal}
              targets={sig.price_targets}
              signal={type}
            />
            <BullBearCase bull={sig.bull_case} bear={sig.bear_case} />
            <KeyFactors factors={sig.key_factors} />
            <InsiderActivity trades={sig.insider_trades} summary={sig.insider_summary} />
            <SentimentBar sentiment={sig.sentiment} summary={sig.sentiment_summary} />
          </div>
        )}

        {/* Footer — history button + timestamp */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 8, paddingTop: 8, borderTop: "1px solid #21262d",
        }}>
          <button
            onClick={e => { e.stopPropagation(); setShowHistory(true); }}
            style={{
              fontFamily: MONO, fontSize: 10, color: "#58a6ff",
              background: "#1f6feb15", border: "1px solid #1f6feb30",
              borderRadius: 5, padding: "3px 10px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            📋 History
          </button>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681" }}>
            {fmtDateTime(sig.generated_at)}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 16, opacity: 0.5 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 48, height: 16, background: "#21262d", borderRadius: 4 }} />
        <div style={{ width: 36, height: 16, background: "#21262d", borderRadius: 4 }} />
      </div>
      <div style={{ height: 12, background: "#21262d", borderRadius: 4, marginBottom: 6 }} />
      <div style={{ height: 12, background: "#21262d", borderRadius: 4, width: "60%" }} />
    </div>
  );
}

// ── Pill filter ───────────────────────────────────────────────────────────────
function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: MONO, fontSize: 10, padding: "4px 12px", borderRadius: 20,
        cursor: "pointer", transition: "all 0.15s",
        background: active ? "#1f6feb" : "transparent",
        border: active ? "1px solid #388bfd" : "1px solid #30363d",
        color: active ? "#fff" : "#8b949e",
      }}
    >{label}</button>
  );
}

// ── Admin scan panel ──────────────────────────────────────────────────────────
function AdminScanPanel({ onDone }) {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const [err,     setErr]     = useState(null);

  async function scan() {
    setLoading(true); setErr(null); setResult(null);
    try {
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

  return (
    <div className="card" style={{
      marginBottom: 12, padding: "12px 16px",
      border: "1px solid #388bfd40", background: "#388bfd06",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: "#58a6ff", fontFamily: MONO, fontWeight: 700 }}>⚙ ADMIN</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--text1)", marginBottom: 2 }}>Scan & Refresh Signals</div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--text3)" }}>
            Force-regenerates signals using real RSI/MACD + SEC insider + StockTwits.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {lastRun && (
            <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--text3)" }}>
              Last: {lastRun.toLocaleTimeString()}
            </span>
          )}
          {err && <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--red)" }}>{err}</span>}
          <button className="btn btn-primary" onClick={scan} disabled={loading}
            style={{ minWidth: 160, fontFamily: MONO, fontSize: 11 }}>
            {loading ? "⟳ Scanning…" : "🔍 Scan & Refresh"}
          </button>
        </div>
      </div>
      {result && !loading && (
        <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            ["Generated", result.generated ?? 0, "#8b949e"],
            ["Symbols",   (result.symbols || []).length, "#58a6ff"],
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

export default function Signals({ watchlist = [] }) {
  const auth    = useAuthContext();
  const isAdmin = auth?.isAdmin ?? false;

  const [feed,     setFeed]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [hasMore,  setHasMore]  = useState(false);
  const [err,      setErr]      = useState(null);
  const [showAll,  setShowAll]  = useState(false);
  const [sigType,  setSigType]  = useState(null);

  // Load feed — one doc per symbol from new schema
  const loadFeed = useCallback(async (reset = false) => {
    if (!reset && loadMore) return;
    reset ? setLoading(true) : setLoadMore(true);
    setErr(null);
    try {
      const token = await getToken();
      const p = new URLSearchParams();
      if (sigType)  p.set("signal_type", sigType);
      if (showAll)  p.set("show_all", "true");

      const res = await fetch(`${API}/api/signals/stream?${p.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();

      // Already deduped server-side (one doc per symbol)
      // Sort by generated_at DESC (newest first)
      const sorted = (data.signals || []).sort((a, b) =>
        (b.generated_at || "").localeCompare(a.generated_at || "")
      );

      setFeed(sorted);
      setHasMore(false);  // no pagination needed — one doc per symbol
    } catch (e) {
      setErr(e.message);
    } finally {
      reset ? setLoading(false) : setLoadMore(false);
    }
  }, [sigType, showAll]);

  useEffect(() => { loadFeed(true); }, [sigType, showAll]);

  function handleScanDone() { loadFeed(true); }

  const buys  = feed.filter(s => (s.current_signal || s.signal) === "BUY").length;
  const sells = feed.filter(s => (s.current_signal || s.signal) === "SELL").length;
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
            One card per symbol · history via 📋 button
          </span>
        </div>
      </div>

      {isAdmin && <AdminScanPanel onDone={handleScanDone} />}

      {/* Filter bar */}
      <div className="card" style={{ padding: "10px 14px", marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span className="hint mono" style={{ letterSpacing: 1, marginRight: 2 }}>SIGNAL</span>
        {SIG_TYPES.map(t => (
          <Pill key={t} label={t} active={sigType === (t === "ALL" ? null : t)}
            onClick={() => setSigType(t === "ALL" ? null : t)} />
        ))}
        <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />
        <Pill
          label={showAll ? "📅 Last 45 days" : "📅 Last 7 days"}
          active={showAll}
          onClick={() => setShowAll(v => !v)}
        />
        <button onClick={() => loadFeed(true)} className="btn"
          style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px" }}>↻</button>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : feed.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div style={{ color: "var(--text2)", marginBottom: 4, fontSize: 14 }}>
            No high-conviction signals yet
          </div>
          <div style={{ color: "var(--text3)", fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>
            Only BUY/SELL signals with HIGH confidence appear here.<br />
            Signals are generated automatically during market hours.
          </div>
          {isAdmin ? (
            <div style={{ color: "var(--blue)", fontSize: 12, fontFamily: "var(--mono)" }}>
              Use "Scan & Refresh" above to generate fresh signals now.
            </div>
          ) : (
            <div style={{ color: "var(--text3)", fontSize: 12, fontFamily: "var(--mono)" }}>
              Generate a signal: Live Prices → select stock → AI Signal tab
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {feed.map((sig, i) => (
            <SignalCard
              key={sig.symbol || i}
              sig={sig}
              isAdmin={isAdmin}
              onDelete={(deleted) => setFeed(prev =>
                prev.filter(s => s.symbol !== deleted.symbol)
              )}
            />
          ))}
        </div>
      )}

      {!loading && feed.length > 0 && (
        <div style={{ textAlign: "center", padding: "20px 0", fontSize: 11, color: "var(--border)", fontFamily: "var(--mono)", borderTop: "1px solid var(--border)", marginTop: 12 }}>
          — {feed.length} symbol{feed.length !== 1 ? "s" : ""} · one signal per ticker —
        </div>
      )}
    </div>
  );
}