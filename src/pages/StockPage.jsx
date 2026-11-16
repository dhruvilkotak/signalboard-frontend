// src/pages/StockPage.jsx — v2 stock page: price + chart, AI signal, your position/trade,
// stats and news. Phone: Buy/Sell bar pinned to the bottom. Desktop: trade panel on the right.
import { useRef, useState } from "react";
import SignalTab from "../components/SignalTab";
import PortfolioTab from "../components/PortfolioTab";
import NewsTab from "../components/NewsTab";
import { tvChart } from "../lib/tradingview";
import { goBack, go } from "../lib/router";
import { useQuotes } from "../hooks/useQuotes";
import { useSignalMap } from "../hooks/useSignalMap";
import { useAccess } from "../hooks/useAccess";
import { useMediaQuery } from "../hooks/useIsMobile";
import { money, pct, SignalTag } from "./Home";

// TradingView interval per range button
const RANGES = [["1D", "5"], ["1W", "60"], ["1M", "D"], ["1Y", "W"], ["5Y", "M"]];

const fmtCap = (n) => !n ? "—" : n >= 1e12 ? `$${(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : `$${(n / 1e6).toFixed(0)}M`;
const fmtVol = (n) => !n ? "—" : n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : `${(n / 1e6).toFixed(1)}M`;

export default function StockPage({ symbol, watchlist, onAdd, onRemove, isAdmin, onUnlock }) {
  const sym = (symbol || "").toUpperCase();
  const isDesktop = useMediaQuery("(min-width: 900px)");
  const { hasFeature } = useAccess();
  const canSignals = hasFeature("ai_signals");
  const { quotes } = useQuotes([sym]);
  const { bySymbol } = useSignalMap(canSignals);
  const [range, setRange] = useState("D");
  const [showSignal, setShowSignal] = useState(false);
  const tradeRef = useRef(null);

  const q = quotes[sym];
  const sig = bySymbol[sym];
  const up = (q?.change_pct ?? 0) >= 0;
  const watching = watchlist.includes(sym);

  const trade = (
    <div ref={tradeRef}>
      <div className="sb-embed"><PortfolioTab key={sym} symbol={sym} currentPrice={q?.price} /></div>
    </div>
  );

  return (
    <div className="sb-page">
      <div className="sb-back sb-phone" style={{ paddingTop: 8 }}>
        <button className="sb-circle" onClick={goBack} aria-label="Back">‹</button>
        <button className="sb-btn ghost" style={{ padding: "8px 16px", fontSize: 14 }}
          onClick={() => watching ? onRemove(sym) : onAdd(sym)}>
          {watching ? "✓ Watching" : "+ Watchlist"}
        </button>
      </div>

      <div className="sb-grid">
        <main style={{ minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div className="sb-tick">{sym}{q?.name ? ` · ${q.name}` : ""}</div>
              <div className="sb-big sb-num">{q?.price != null ? money(q.price) : "—"}</div>
              {q?.change_pct != null && (
                <div className="sb-chg sb-num">
                  <span className={up ? "sb-up" : "sb-down"}>
                    {up ? "▲" : "▼"} {money(Math.abs(q.change_amt ?? 0))} ({pct(q.change_pct)})
                  </span>
                  <span className="l">Today</span>
                  {q.market_state && q.market_state !== "REGULAR" && (
                    <span className="l">· {q.market_state === "PRE" ? "Pre-market" : q.market_state === "POST" ? "After hours" : "Market closed"}</span>
                  )}
                </div>
              )}
            </div>
            {isDesktop && (
              <button className="sb-btn ghost" style={{ padding: "8px 16px", fontSize: 14, marginTop: 10 }}
                onClick={() => watching ? onRemove(sym) : onAdd(sym)}>
                {watching ? "✓ Watching" : "+ Watchlist"}
              </button>
            )}
          </div>

          <div className="sb-chart">
            <iframe key={`${sym}-${range}`} title={`${sym} chart`} src={tvChart(sym, range, "3")} />
          </div>
          <div className="sb-ranges">
            {RANGES.map(([label, iv]) => (
              <button key={label} className={range === iv ? "on" : ""} onClick={() => setRange(iv)}>{label}</button>
            ))}
            <button style={{ marginLeft: "auto", color: "var(--sb-muted)" }} onClick={() => go("terminal")}>Full terminal ›</button>
          </div>

          {/* AI signal */}
          <h2 className="sb-h2">AI Signal {sig?.generated_at && <span className="sub">{new Date(sig.generated_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}</h2>
          {!canSignals ? (
            <button className="sb-rowlink" style={{ marginTop: 8 }} onClick={() => onUnlock("ai_signals")}>
              <span>🔒 See the AI's BUY / HOLD / SELL call for {sym}</span><span className="sb-link" style={{ marginTop: 0 }}>Unlock</span>
            </button>
          ) : showSignal ? (
            <div className="sb-embed">
              <SignalTab key={sym} symbol={sym} currentPrice={q?.price} isAdmin={isAdmin} active onCancel={() => setShowSignal(false)} />
            </div>
          ) : (
            <div className="sb-panel" style={{ padding: "16px 18px", marginTop: 10 }}>
              {sig ? <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <SignalTag sig={sig} />
                  <span className="sb-muted" style={{ fontSize: 12, fontWeight: 600 }}>
                    {(sig.confidence || "").toUpperCase()} CONFIDENCE{sig.conviction_score != null ? ` · CONVICTION ${sig.conviction_score}/10` : ""}
                  </span>
                </div>
                {sig.summary && <p style={{ color: "#c9d1d9", fontSize: 15, lineHeight: 1.55, marginTop: 10 }}>{sig.summary}</p>}
                <div style={{ display: "flex", gap: 22, marginTop: 12, fontSize: 14, flexWrap: "wrap" }} className="sb-num">
                  {sig.target_price != null && <div><div className="sb-muted" style={{ fontSize: 12 }}>Target</div>{money(sig.target_price)}</div>}
                  {sig.stop_loss != null && <div><div className="sb-muted" style={{ fontSize: 12 }}>Stop loss</div>{money(sig.stop_loss)}</div>}
                  {sig.expected_return_pct != null && <div><div className="sb-muted" style={{ fontSize: 12 }}>Expected</div><span className={sig.expected_return_pct >= 0 ? "sb-up" : "sb-down"}>{pct(sig.expected_return_pct)}</span></div>}
                </div>
                <button className="sb-link" onClick={() => setShowSignal(true)}>Full analysis</button>
              </> : <>
                <div className="sb-muted" style={{ fontSize: 15 }}>No recent signal for {sym}.</div>
                <button className="sb-link" onClick={() => setShowSignal(true)}>Get AI signal</button>
              </>}
            </div>
          )}

          {/* Trade (phone: inline; desktop: right column) */}
          {!isDesktop && <>
            <h2 className="sb-h2">Your position</h2>
            {trade}
          </>}

          <h2 className="sb-h2">Stats</h2>
          <div className="sb-stats sb-num">
            <div><span>Open</span><b>{q?.open != null ? money(q.open) : "—"}</b></div>
            <div><span>High</span><b>{q?.high != null ? money(q.high) : "—"}</b></div>
            <div><span>Low</span><b>{q?.low != null ? money(q.low) : "—"}</b></div>
            <div><span>Prev close</span><b>{q?.prev_close != null ? money(q.prev_close) : "—"}</b></div>
            <div><span>Volume</span><b>{fmtVol(q?.volume)}</b></div>
            <div><span>Market cap</span><b>{fmtCap(q?.mkt_cap)}</b></div>
          </div>

          <h2 className="sb-h2">News</h2>
          <div className="sb-embed" style={{ maxHeight: 520, overflow: "auto" }}><NewsTab symbol={sym} /></div>
        </main>

        {isDesktop && <aside className="sb-side">{trade}</aside>}
      </div>

      {!isDesktop && (
        <div className="sb-tradebar">
          <button className="sb-btn" onClick={() => tradeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>Buy / Sell</button>
        </div>
      )}
    </div>
  );
}
