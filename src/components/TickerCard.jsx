// src/components/TickerCard.jsx — reusable price card used across pages
import { SIGNAL_COLORS } from "../lib/constants"

export default function TickerCard({ ticker, price, signal, onAnalyze, analyzing, showSignalBtn = true }) {
  const sig = signal?.signal
  const colors = SIGNAL_COLORS[sig] || {}
  const isBusy = analyzing === ticker.symbol
  const change = price?.change_pct ?? 0
  const up = change >= 0

  return (
    <div className="card fade-in" style={{
      position: "relative", overflow: "hidden",
      border: sig ? `1px solid ${colors.border}` : "1px solid var(--border)",
      boxShadow: sig ? `0 0 16px ${colors.color}10` : "none",
      transition: "all 0.3s",
    }}>
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: sig
          ? `linear-gradient(90deg,transparent,${colors.color}80,transparent)`
          : up
            ? "linear-gradient(90deg,transparent,var(--green)60,transparent)"
            : "linear-gradient(90deg,transparent,var(--red)40,transparent)",
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{ticker.symbol}</span>
            <span style={{
              fontSize: 9, padding: "2px 5px", borderRadius: 4,
              background: ticker.type === "ETF" ? "#1f6feb20" : "#3fb95020",
              color: ticker.type === "ETF" ? "var(--blue)" : "var(--green)",
              fontFamily: "var(--mono)",
            }}>{ticker.type}</span>
          </div>
          <div className="hint" style={{ marginTop: 2 }}>{ticker.name}</div>
        </div>

        {sig && (
          <div style={{
            padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700,
            fontFamily: "var(--mono)", letterSpacing: 1,
            background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color,
          }}>{sig}</div>
        )}
      </div>

      {/* Price */}
      {price ? (
        <>
          <div className="mono" style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>
            ${price.price.toFixed(2)}
          </div>
          <div className="mono" style={{
            fontSize: 12, marginTop: 2,
            color: up ? "var(--green)" : "var(--red)",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
            <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
              prev ${price.prev_close?.toFixed(2)}
            </span>
          </div>

          {/* Volume + H/L */}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <span className="hint">H: <span className="mono" style={{ color: "var(--text1)" }}>${price.high?.toFixed(2)}</span></span>
            <span className="hint">L: <span className="mono" style={{ color: "var(--text1)" }}>${price.low?.toFixed(2)}</span></span>
            <span className="hint">Vol: <span className="mono" style={{ color: "var(--text1)" }}>{price.volume ? (price.volume / 1e6).toFixed(1) + "M" : "—"}</span></span>
          </div>

          {/* Mini change bar */}
          <div style={{ marginTop: 10, height: 3, background: "var(--bg3)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2,
              width: `${Math.min(Math.abs(change) * 15, 100)}%`,
              background: up ? "var(--green)" : "var(--red)",
              transition: "width 0.5s ease",
            }} />
          </div>
        </>
      ) : (
        <div className="hint mono" style={{ padding: "20px 0", animation: "pulse 1.4s infinite" }}>
          Loading...
        </div>
      )}

      {/* Signal summary */}
      {signal?.summary && (
        <div className="muted" style={{ fontSize: 11, lineHeight: 1.6, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--bg3)" }}>
          {signal.summary}
        </div>
      )}

      {/* Analyze button */}
      {showSignalBtn && onAnalyze && (
        <button
          className="btn"
          onClick={() => onAnalyze(ticker.symbol)}
          disabled={isBusy || !price}
          style={{
            width: "100%", marginTop: 12, fontSize: 11,
            borderColor: sig ? colors.border : "var(--border)",
            color: isBusy ? "var(--text3)" : (sig ? colors.color : "var(--text2)"),
          }}
        >
          {isBusy ? "⟳  Analyzing..." : "⚡  Get AI Signal"}
        </button>
      )}
    </div>
  )
}
