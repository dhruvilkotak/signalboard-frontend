// src/components/SignalTab.jsx
// Renders inside LiveDashboard as the "⚡ Signal" inner tab.
// Calls POST /api/ondemand/signal — 24h cached, includes insider + sentiment.
// Uses Recharts for price prediction chart.

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { getOnDemandSignal } from "../lib/api";

const MONO = "'IBM Plex Mono', monospace";

const SIG_COLOR = {
  BUY:  { color: "#3fb950", bg: "#0d2a1a", border: "#1a6336" },
  HOLD: { color: "#e3b341", bg: "#1a1206", border: "#6b4f06" },
  SELL: { color: "#f85149", bg: "#2a0808", border: "#7a1a1a" },
};
const CONF_COLOR = { HIGH: "#3fb950", MEDIUM: "#e3b341", LOW: "#f85149" };
const RISK_COLOR = { LOW: "#3fb950", MEDIUM: "#e3b341", HIGH: "#f85149" };

function fmt(n, d = 2) { return n == null ? "—" : `$${Number(n).toFixed(d)}`; }
function fmtPct(n)     { return n == null ? "—" : `${n >= 0 ? "+" : ""}${Number(n).toFixed(2)}%`; }

function timeAgo(iso) {
  if (!iso) return null;
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return `${Math.floor(s)}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Price prediction chart ────────────────────────────────────────────────────
function PredictionChart({ current, targets, signal }) {
  if (!current || !targets || Object.keys(targets).length === 0) return null;

  const sigColor = SIG_COLOR[signal]?.color || "#58a6ff";

  const data = [
    { label: "Now",    price: current,           day: 0   },
    { label: "1W",     price: targets.week1,      day: 7   },
    { label: "2W",     price: targets.week2,      day: 14  },
    { label: "1M",     price: targets.month1,     day: 30  },
    { label: "3M",     price: targets.month3,     day: 90  },
  ].filter(d => d.price != null && d.price > 0);

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
          <XAxis
            dataKey="label"
            tick={{ fontFamily: MONO, fontSize: 8, fill: "#6e7681" }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            domain={[min, max]}
            tick={{ fontFamily: MONO, fontSize: 8, fill: "#6e7681" }}
            axisLine={false} tickLine={false}
            tickFormatter={v => `$${v.toFixed(0)}`}
            width={45}
          />
          <Tooltip
            contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, fontFamily: MONO, fontSize: 10 }}
            formatter={v => [`$${Number(v).toFixed(2)}`, "Target"]}
            labelStyle={{ color: "#8b949e" }}
          />
          <ReferenceLine y={current} stroke="#30363d" strokeDasharray="3 3" />
          <Area
            type="monotone" dataKey="price"
            stroke={sigColor} strokeWidth={2}
            fill="url(#predGrad)"
            dot={{ fill: sigColor, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: sigColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Sentiment bar ─────────────────────────────────────────────────────────────
function SentimentBar({ sentiment }) {
  if (!sentiment || !sentiment.sentiment_label) return null;
  const bull = sentiment.bullish_pct || 50;
  const bear = sentiment.bearish_pct || 50;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681", letterSpacing: 1 }}>
          RETAIL SENTIMENT (STOCKTWITS)
        </span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681" }}>
          {sentiment.message_volume || 0} msgs · {(sentiment.watchlist_count || 0).toLocaleString()} watching
        </span>
      </div>
      <div style={{ height: 6, background: "#21262d", borderRadius: 3, overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${bull}%`, background: "#3fb950", transition: "width 0.6s" }} />
        <div style={{ width: `${bear}%`, background: "#f85149" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: "#3fb950" }}>▲ {bull}% Bullish</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700,
          color: sentiment.sentiment_label === "Bullish" ? "#3fb950"
               : sentiment.sentiment_label === "Bearish" ? "#f85149" : "#e3b341"
        }}>
          {sentiment.sentiment_label}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: "#f85149" }}>{bear}% Bearish ▼</span>
      </div>
    </div>
  );
}

// ── Insider activity ──────────────────────────────────────────────────────────
function InsiderActivity({ trades, summary }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681", letterSpacing: 1, marginBottom: 6 }}>
        SEC INSIDER ACTIVITY (FORM 4 — LAST 90 DAYS)
      </div>
      {trades && trades.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {trades.map((t, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#161b22", borderRadius: 6, padding: "5px 10px",
              border: "1px solid #21262d",
            }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: "#e6edf3" }}>{t.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 8, color: "#8b949e" }}>Form {t.form} · {t.date}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681", padding: "5px 0" }}>
          No insider filings found in the last 90 days
        </div>
      )}
      {summary && (
        <div style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e", marginTop: 6, lineHeight: 1.5 }}>
          {summary}
        </div>
      )}
    </div>
  );
}

// ── Main SignalTab ────────────────────────────────────────────────────────────
export default function SignalTab({ symbol, currentPrice }) {
  const [signal,  setSignal]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getOnDemandSignal(symbol);
      setSignal(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const colors = signal ? (SIG_COLOR[signal.signal] || SIG_COLOR.HOLD) : null;

  return (
    <div style={{
      height: "100%", overflowY: "auto", padding: 20,
      background: "#0d1117",
    }}>

      {/* Generate button — always visible */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          onClick={generate}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 20px", borderRadius: 8,
            background: loading ? "#161b22" : "linear-gradient(135deg,#1f6feb,#388bfd)",
            border: "1px solid #1f6feb",
            color: "#fff", fontFamily: MONO, fontSize: 11, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loading ? "⟳ Generating signal…" : signal ? "↻ Refresh Signal" : "⚡ Generate Signal"}
        </button>
        {signal && (
          <span style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681" }}>
            {signal.source === "ondemand" ? "Fresh" : "Cached"} · {timeAgo(signal.generated_at)}
            {" · Valid for "}
            {signal.expires_at
              ? `${Math.max(0, Math.floor((new Date(signal.expires_at) - Date.now()) / 3600000))}h`
              : "24h"}
          </span>
        )}
        {error && <span style={{ fontFamily: MONO, fontSize: 9, color: "#f85149" }}>{error}</span>}
      </div>

      {/* No signal yet */}
      {!signal && !loading && (
        <div style={{
          background: "#161b22", border: "1px solid #21262d",
          borderRadius: 12, padding: "32px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚡</div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: "#8b949e", marginBottom: 4 }}>
            Get AI signal for {symbol}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681", lineHeight: 1.6 }}>
            Includes price prediction · SEC insider activity · StockTwits sentiment
            <br />Cached 24h — one Claude call per ticker per day
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[180, 120, 80, 80].map((h, i) => (
            <div key={i} style={{
              height: h, background: "#161b22", borderRadius: 8,
              animation: "shimmer 1.5s ease-in-out infinite",
            }} />
          ))}
        </div>
      )}

      {/* Signal result */}
      {signal && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

          {/* ── Signal header card ── */}
          <div style={{
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: 12, padding: "16px 20px",
            marginBottom: 14,
            boxShadow: `0 0 24px ${colors.color}18`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              {/* Signal + confidence */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    fontFamily: MONO, fontSize: 28, fontWeight: 700,
                    color: colors.color, letterSpacing: 2,
                  }}>
                    {signal.signal}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{
                      fontFamily: MONO, fontSize: 9, fontWeight: 700,
                      color: CONF_COLOR[signal.confidence],
                      background: `${CONF_COLOR[signal.confidence]}18`,
                      border: `1px solid ${CONF_COLOR[signal.confidence]}44`,
                      borderRadius: 4, padding: "2px 7px",
                    }}>
                      {signal.confidence} CONFIDENCE
                    </span>
                    <span style={{
                      fontFamily: MONO, fontSize: 9,
                      color: RISK_COLOR[signal.risk],
                      paddingLeft: 2,
                    }}>
                      {signal.risk} RISK
                    </span>
                  </div>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: "#8b949e", lineHeight: 1.6, maxWidth: 480 }}>
                  {signal.summary}
                </div>
              </div>

              {/* Price targets column */}
              <div style={{
                display: "flex", flexDirection: "column", gap: 6,
                background: "#0d1117", borderRadius: 8, padding: "10px 14px",
                border: "1px solid #21262d", minWidth: 160,
              }}>
                {[
                  ["Current",  currentPrice || signal.price_at_signal, null],
                  ["Target",   signal.target_price, signal.expected_return_pct],
                  ["Stop Loss",signal.stop_loss, null],
                ].map(([label, val, pct]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681" }}>{label.toUpperCase()}</span>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#e6edf3" }}>
                        {fmt(val)}
                      </span>
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
          {signal.key_factors?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681", letterSpacing: 1, marginBottom: 8 }}>
                KEY FACTORS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {signal.key_factors.map((f, i) => (
                  <span key={i} style={{
                    fontFamily: MONO, fontSize: 9,
                    background: "#161b22", border: "1px solid #21262d",
                    borderRadius: 5, padding: "4px 10px", color: "#8b949e",
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Bull / Bear case ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              ["🐂 BULL CASE", signal.bull_case, "#3fb950", "#0d2a1a"],
              ["🐻 BEAR CASE", signal.bear_case, "#f85149", "#2a0808"],
            ].map(([label, text, col, bg]) => (
              <div key={label} style={{
                background: bg, border: `1px solid ${col}33`,
                borderRadius: 8, padding: "10px 12px",
              }}>
                <div style={{ fontFamily: MONO, fontSize: 8, color: col, letterSpacing: 1, marginBottom: 5 }}>{label}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e", lineHeight: 1.55 }}>{text}</div>
              </div>
            ))}
          </div>

          {/* ── Retail sentiment ── */}
          <SentimentBar sentiment={signal.sentiment} />

          {/* ── Insider activity ── */}
          <InsiderActivity
            trades={signal.insider_trades}
            summary={signal.insider_summary}
          />

          {/* ── Disclaimer ── */}
          <div style={{
            fontFamily: MONO, fontSize: 8, color: "#3a4258", lineHeight: 1.6,
            borderTop: "1px solid #21262d", paddingTop: 10, marginTop: 4,
          }}>
            ⚠ This signal is AI-generated for informational purposes only. Not financial advice.
            Past performance does not guarantee future results. Always do your own research.
          </div>
        </div>
      )}
    </div>
  );
}