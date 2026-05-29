// src/components/SignalTab.jsx
// Auto-loads signal on mount (300ms debounce).
// Shared cache: signals_ondemand/{symbol} — one Claude call per ticker per 24h across ALL users.
// No buttons. Tab click = intent. Cache hit = instant. Cache miss = auto-generate.

import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { getOnDemandSignal } from "../lib/api";
import InsiderActivity from "./signal/InsiderActivity";
import SentimentBar from "./signal/SentimentBar";
import KeyFactors from "./signal/KeyFactors";
import BullBearCase from "./signal/BullBearCase";

const MONO = "'IBM Plex Mono', monospace";

const SIG_COLOR = {
  BUY:  { color: "#3fb950", bg: "#0d2a1a", border: "#1a6336" },
  HOLD: { color: "#e3b341", bg: "#1a1206", border: "#6b4f06" },
  SELL: { color: "#f85149", bg: "#2a0808", border: "#7a1a1a" },
};
const CONF_COLOR = { HIGH: "#3fb950", MEDIUM: "#e3b341", LOW: "#f85149" };
const RISK_COLOR = { LOW: "#3fb950", MEDIUM: "#e3b341", HIGH: "#f85149" };

function fmt(n, d = 2)  { return n == null ? "—" : `$${Number(n).toFixed(d)}`; }
function fmtPct(n)       { return n == null ? "—" : `${n >= 0 ? "+" : ""}${Number(n).toFixed(2)}%`; }

function cacheStatus(signal) {
  if (!signal?.generated_at || !signal?.expires_at) return null;
  try {
    const gen    = new Date(signal.generated_at);
    const exp    = new Date(signal.expires_at);
    const nowMs  = Date.now();
    const ageMs  = nowMs - gen.getTime();
    const leftMs = exp.getTime() - nowMs;

    const ageStr = ageMs < 60000
      ? "just now"
      : ageMs < 3600000
      ? `${Math.floor(ageMs / 60000)}m ago`
      : `${Math.floor(ageMs / 3600000)}h ${Math.floor((ageMs % 3600000) / 60000)}m ago`;

    const leftStr = leftMs <= 0
      ? "expired"
      : leftMs < 3600000
      ? `${Math.floor(leftMs / 60000)}m`
      : `${Math.floor(leftMs / 3600000)}h`;

    // Stale = older than 2 hours during market hours
    const isMarketHours = (() => {
      const et   = new Date(nowMs).toLocaleString("en-US", { timeZone: "America/New_York" });
      const h    = new Date(et).getHours();
      return h >= 9 && h < 16;
    })();
    const isStale = isMarketHours && ageMs > 7200000; // >2h during market hours

    const session = signal.session || "";
    const sessionLabel = {
      pre_market:  "Pre-Market",
      market:      "Market Hours",
      post_market: "Post-Market",
      closed:      "After Hours",
      on_demand:   "On Demand",
    }[session] || session;

    return { ageStr, leftStr, expired: leftMs <= 0, isStale, sessionLabel };
  } catch { return null; }
}

// ── Price prediction chart ────────────────────────────────────────────────────
function PredictionChart({ current, targets, signal }) {
  if (!current || !targets || Object.keys(targets).length === 0) return null;
  const sigColor = SIG_COLOR[signal]?.color || "#58a6ff";

  const data = [
    { label: "Now", price: current },
    targets.week1  ? { label: "1W",  price: targets.week1  } : null,
    targets.week2  ? { label: "2W",  price: targets.week2  } : null,
    targets.month1 ? { label: "1M",  price: targets.month1 } : null,
    targets.month3 ? { label: "3M",  price: targets.month3 } : null,
  ].filter(Boolean);

  if (data.length < 2) return null;

  const min = Math.min(...data.map(d => d.price)) * 0.97;
  const max = Math.max(...data.map(d => d.price)) * 1.03;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681", letterSpacing: 1, marginBottom: 8 }}>
        PRICE PREDICTION
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={sigColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={sigColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontFamily: MONO, fontSize: 8, fill: "#6e7681" }} axisLine={false} tickLine={false} />
          <YAxis domain={[min, max]} tick={{ fontFamily: MONO, fontSize: 8, fill: "#6e7681" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} width={45} />
          <Tooltip
            contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, fontFamily: MONO, fontSize: 10 }}
            formatter={v => [`$${Number(v).toFixed(2)}`, "Target"]}
            labelStyle={{ color: "#8b949e" }}
          />
          <ReferenceLine y={current} stroke="#30363d" strokeDasharray="3 3" />
          <Area type="monotone" dataKey="price" stroke={sigColor} strokeWidth={2} fill="url(#predGrad)"
            dot={{ fill: sigColor, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: sigColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function Skeleton({ symbol }) {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", background: "#e3b341",
          animation: "blink 1s ease-in-out infinite",
        }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: "#6e7681" }}>
          Generating AI signal for {symbol}…
        </span>
      </div>
      {[200, 130, 80, 80, 60].map((h, i) => (
        <div key={i} style={{
          height: h, background: "#161b22", borderRadius: 8,
          marginBottom: 12, animation: "shimmer 1.5s ease-in-out infinite",
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
      <div style={{ fontFamily: MONO, fontSize: 8, color: "#3a4258", marginTop: 8 }}>
        Fetching price · SEC insider data · StockTwits sentiment…
      </div>
    </div>
  );
}

// ── Main SignalTab ────────────────────────────────────────────────────────────
export default function SignalTab({ symbol, currentPrice }) {
  const [signal,  setSignal]  = useState(null);
  const [loading, setLoading] = useState(true);   // start true — auto-loads on mount
  const [error,   setError]   = useState(null);
  const debounceRef = useRef(null);

  // Auto-load on mount and when symbol changes — 300ms debounce
  useEffect(() => {
    setSignal(null);
    setError(null);
    setLoading(true);

    // Clear any pending debounce from rapid ticker switching
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await getOnDemandSignal(symbol);
        setSignal(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [symbol]);

  const colors = signal ? (SIG_COLOR[signal.signal] || SIG_COLOR.HOLD) : null;
  const cache  = signal ? cacheStatus(signal) : null;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return <Skeleton symbol={symbol} />;

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{
          background: "#2a0808", border: "1px solid #7a1a1a",
          borderRadius: 10, padding: "16px 20px",
          fontFamily: MONO, fontSize: 11, color: "#f85149",
        }}>
          Failed to load signal: {error}
        </div>
      </div>
    );
  }

  if (!signal) return null;

  // ── Signal result ──────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 20, background: "#0d1117" }}>

      {/* ── Cache status bar ── */}
      <div style={{
        marginBottom: 12, borderRadius: 6, overflow: "hidden",
        border: `1px solid ${cache?.isStale ? "#e3b34140" : cache?.expired ? "#f8514940" : "#21262d"}`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "5px 10px",
          background: cache?.isStale ? "#e3b34108" : cache?.expired ? "#f8514908" : "#161b22",
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: cache?.expired ? "#f85149" : cache?.isStale ? "#e3b341" : "#3fb950",
          }} />
          <span style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e" }}>
            Generated {cache?.ageStr}
            {cache?.sessionLabel ? ` · ${cache.sessionLabel}` : ""}
            {" · shared across all users"}
          </span>
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9,
            color: cache?.expired ? "#f85149" : cache?.isStale ? "#e3b341" : "#6e7681",
            flexShrink: 0,
          }}>
            {cache?.expired
              ? "expired — refreshing"
              : `valid for ${cache?.leftStr}`}
          </span>
        </div>
        {/* Staleness warning */}
        {cache?.isStale && !cache?.expired && (
          <div style={{
            padding: "4px 10px", background: "#e3b34110",
            fontFamily: MONO, fontSize: 9, color: "#e3b341",
            borderTop: "1px solid #e3b34120",
          }}>
            ⚠ Signal is {cache.ageStr} old — market may have moved. Click to refresh.
          </div>
        )}
      </div>

      {/* ── Signal header card ── */}
      <div style={{
        background: colors.bg, border: `1px solid ${colors.border}`,
        borderRadius: 12, padding: "16px 20px", marginBottom: 14,
        boxShadow: `0 0 24px ${colors.color}18`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>

          {/* Signal + confidence + summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, marginRight: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: colors.color, letterSpacing: 2 }}>
                {signal.signal}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{
                  fontFamily: MONO, fontSize: 9, fontWeight: 700,
                  color: CONF_COLOR[signal.confidence],
                  background: `${CONF_COLOR[signal.confidence]}18`,
                  border: `1px solid ${CONF_COLOR[signal.confidence]}44`,
                  borderRadius: 4, padding: "2px 7px",
                }}>
                  {signal.confidence} CONFIDENCE
                </span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: RISK_COLOR[signal.risk], paddingLeft: 2 }}>
                  {signal.risk} RISK
                </span>
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: "#8b949e", lineHeight: 1.6 }}>
              {signal.summary}
            </div>
          </div>

          {/* Price targets column */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 6,
            background: "#0d1117", borderRadius: 8, padding: "10px 14px",
            border: "1px solid #21262d", minWidth: 160, flexShrink: 0,
          }}>
            {[
              ["Current",   currentPrice || signal.price_at_signal, null],
              ["Target",    signal.target_price,  signal.expected_return_pct],
              ["Stop Loss", signal.stop_loss,      null],
            ].map(([label, val, pct]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681" }}>{label.toUpperCase()}</span>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#e6edf3" }}>{fmt(val)}</span>
                  {pct != null && (
                    <span style={{ fontFamily: MONO, fontSize: 9, color: pct >= 0 ? "#3fb950" : "#f85149" }}>
                      {fmtPct(pct)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #21262d", paddingTop: 6, marginTop: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681" }}>TIMEFRAME</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: "#58a6ff" }}>{signal.timeframe}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Price prediction chart ── */}
      <PredictionChart
        current={currentPrice || signal.price_at_signal}
        targets={signal.price_targets}
        signal={signal.signal}
      />

      {/* ── Key factors ── */}
      <KeyFactors factors={signal.key_factors} />

      {/* ── Bull / Bear case ── */}
      <BullBearCase bullCase={signal.bull_case} bearCase={signal.bear_case} />

      {/* ── Retail sentiment ── */}
      <SentimentBar sentiment={signal.sentiment} />

      {/* ── Insider activity ── */}
      <InsiderActivity trades={signal.insider_trades} summary={signal.insider_summary} />

      {/* ── Disclaimer ── */}
      <div style={{
        fontFamily: MONO, fontSize: 8, color: "#3a4258", lineHeight: 1.6,
        borderTop: "1px solid #21262d", paddingTop: 10, marginTop: 4,
      }}>
        ⚠ AI-generated signal for informational purposes only. Not financial advice.
        Signal is shared across all users. Refreshes each market session (pre-market/market/post-market).
      </div>
    </div>
  );
}