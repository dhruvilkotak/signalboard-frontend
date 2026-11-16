// src/pages/Home.jsx — v2 home: portfolio value, cash, today's AI signals, positions,
// Auto-Trader strategies and watchlist. Tapping any symbol opens its stock page.
import { useEffect, useState } from "react";
import { getPortfolioOverview } from "../lib/api";
import { go, openStock } from "../lib/router";
import { useQuotes } from "../hooks/useQuotes";
import { useSignalMap } from "../hooks/useSignalMap";
import { useAccess } from "../hooks/useAccess";

export const money = (n, d = 2) =>
  `$${(+(n ?? 0)).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
export const pct = (n) => `${(n ?? 0) >= 0 ? "+" : "−"}${Math.abs(+(n ?? 0)).toFixed(2)}%`;
const signed = (n) => `${(n ?? 0) >= 0 ? "+" : "−"}${money(Math.abs(n ?? 0))}`;
const tone = (n) => ((n ?? 0) >= 0 ? "sb-up" : "sb-down");

export function SignalTag({ sig }) {
  const t = (sig?.signal || "").toUpperCase();
  return t ? <span className={`sb-tag ${t}`}>{t}</span> : null;
}

export function QuoteRow({ symbol, quote, sig, sub, onClick }) {
  const chg = quote?.change_pct;
  return (
    <button className="sb-row" onClick={onClick}>
      <div style={{ minWidth: 0 }}>
        <div className="sym">{symbol}<SignalTag sig={sig} /></div>
        {sub && <div className="nm">{sub}</div>}
      </div>
      <div className="rt">
        <div className="px sb-num">{quote?.price != null ? money(quote.price) : "—"}</div>
        {chg != null && <div className={`pc sb-num ${tone(chg)}`}>{pct(chg)}</div>}
      </div>
    </button>
  );
}

export function WatchlistPanel({ watchlist, quotes, signals }) {
  return (
    <div className="sb-panel">
      <div className="ph"><span>Watchlist</span><span className="sb-muted" style={{ fontWeight: 400, fontSize: 13 }}>{watchlist.length}</span></div>
      {watchlist.length === 0 && <div className="sb-empty" style={{ padding: 18 }}>Search for a stock to add it.</div>}
      {watchlist.map(s => (
        <QuoteRow key={s} symbol={s} quote={quotes[s]} sig={signals[s]} onClick={() => openStock(s)} />
      ))}
    </div>
  );
}

export default function Home({ watchlist, onUnlock }) {
  const { access, hasFeature } = useAccess();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => getPortfolioOverview()
      .then(ov => { if (alive) { setOverview(ov); setError(null); } })
      .catch(() => alive && setError("Couldn't load your portfolio. Retrying…"));
    load();
    const iv = setInterval(load, 60000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const positions = overview?.manual?.positions ?? [];
  const { quotes } = useQuotes([...new Set([...watchlist, ...positions.map(p => p.symbol)])]);
  const canSignals = hasFeature("ai_signals");
  const { list: sigList, bySymbol: signals } = useSignalMap(canSignals);

  const s = overview?.summary ?? {};
  const total = s.total_value ?? 0, cash = s.available_cash ?? 0;
  const manualV = s.manual_value ?? 0, stratV = s.strategy_value ?? 0;
  const ret = total - (s.total_deposited ?? total);
  const retPct = s.total_deposited ? (ret / s.total_deposited) * 100 : 0;

  // Day change of manual positions from live quotes
  const dayChg = positions.reduce((acc, p) => {
    const q = quotes[p.symbol];
    return q?.change_amt != null ? acc + q.change_amt * (p.shares ?? 0) : acc;
  }, 0);

  const movers = watchlist.filter(x => quotes[x]?.change_pct != null)
    .sort((a, b) => Math.abs(quotes[b].change_pct) - Math.abs(quotes[a].change_pct));
  const top = movers[0];
  const q = access?.ondemand;
  const left = q && q.limit != null ? (q.left ?? Math.max(q.limit - (q.used ?? 0), 0)) : null;
  const trialDays = access?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(access.trial_ends_at) - Date.now()) / 86400000)) : null;
  const fresh = sigList.filter(x => ["BUY", "SELL"].includes((x.signal || "").toUpperCase())).slice(0, 8);
  const strategies = Object.entries(overview?.strategies ?? {});
  const allocParts = [
    { label: "Cash", v: cash, c: "#5c6570" },
    { label: "Your stocks", v: manualV, c: "#58a6ff" },
    { label: "Auto-Trader", v: stratV, c: "var(--sb-brand)" },
  ];
  const allocTotal = allocParts.reduce((a, p) => a + p.v, 0) || 1;

  return (
    <div className="sb-page">
      <div className="sb-grid">
        <main style={{ minWidth: 0 }}>
          <div className="sb-kicker">Paper portfolio · virtual money</div>
          <div className="sb-big sb-num">{overview ? money(total) : "—"}</div>
          {overview && (
            <div className="sb-chg sb-num">
              <span className={tone(ret)}>{ret >= 0 ? "▲" : "▼"} {signed(ret)} ({pct(retPct)})</span>
              <span className="l">All time</span>
              {positions.length > 0 && <>
                <span className={tone(dayChg)} style={{ marginLeft: 10 }}>{signed(dayChg)}</span>
                <span className="l">Today</span>
              </>}
            </div>
          )}
          {error && <div className="sb-muted" style={{ marginTop: 8, fontSize: 13 }}>{error}</div>}

          {overview && (
            <div className="sb-alloc">
              <div className="bar">
                {allocParts.filter(p => p.v > 0).map(p => (
                  <div key={p.label} style={{ width: `${(p.v / allocTotal) * 100}%`, background: p.c }} />
                ))}
              </div>
              <div className="legend">
                {allocParts.map(p => (
                  <span key={p.label}><i style={{ background: p.c }} />{p.label}<b className="sb-num">{money(p.v, 0)}</b></span>
                ))}
              </div>
            </div>
          )}

          <button className="sb-rowlink" onClick={() => go("manual")}>
            <span>Cash available</span>
            <span className="sb-num">{money(cash)} <span className="sb-muted">›</span></span>
          </button>

          <div className="sb-cards">
            {left != null && (
              <div className="sb-card"><div className="t">AI signals left</div>
                <div className="r"><span className="sb-num">{left} of {q.limit}</span>
                  <span className="sb-muted" style={{ fontWeight: 400, fontSize: 13 }}>{q.period === "week" ? "this week" : "total"}</span></div></div>
            )}
            {top && (
              <button className="sb-card" onClick={() => openStock(top)}><div className="t">Top mover</div>
                <div className="r"><span>{top}</span><span className={`sb-num ${tone(quotes[top].change_pct)}`}>{pct(quotes[top].change_pct)}</span></div></button>
            )}
            {trialDays != null && (
              <div className="sb-card"><div className="t">Free trial</div>
                <div className="r"><span>{trialDays} day{trialDays === 1 ? "" : "s"} left</span></div></div>
            )}
          </div>

          {/* Today's AI signals */}
          {canSignals ? fresh.length > 0 && <>
            <h2 className="sb-h2">Latest AI signals <span className="sub"><button onClick={() => go("signals")}>See all</button></span></h2>
            <div className="sb-cards" style={{ marginTop: 10 }}>
              {fresh.map(x => (
                <button key={x.symbol} className="sb-card" style={{ minWidth: 150 }} onClick={() => openStock(x.symbol)}>
                  <div className="t" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <SignalTag sig={x} /><span>{(x.confidence || "").toUpperCase()}</span></div>
                  <div className="r"><span>{x.symbol}</span>
                    {x.expected_return_pct != null && <span className={`sb-num ${tone(x.expected_return_pct)}`} style={{ fontSize: 14 }}>{pct(x.expected_return_pct)}</span>}</div>
                </button>
              ))}
            </div>
          </> : (
            <button className="sb-rowlink" style={{ marginTop: 28 }} onClick={() => onUnlock("ai_signals")}>
              <span>🔒 AI signals for your watchlist</span><span className="sb-link" style={{ marginTop: 0 }}>Unlock</span>
            </button>
          )}

          <h2 className="sb-h2">Your stocks <span className="sub"><button onClick={() => go("manual")}>History</button></span></h2>
          {overview && positions.length === 0 && (
            <div className="sb-empty">No positions yet — open any stock and tap <b>Buy</b>.</div>
          )}
          {positions.map(p => {
            const qq = quotes[p.symbol]; const px = qq?.price ?? p.current_price;
            const pnlPct = p.avg_buy_price ? ((px - p.avg_buy_price) / p.avg_buy_price) * 100 : p.unrealized_pnl_pct;
            return (
              <button key={p.symbol} className="sb-row" onClick={() => openStock(p.symbol)}>
                <div style={{ minWidth: 0 }}>
                  <div className="sym">{p.symbol}<SignalTag sig={signals[p.symbol]} /></div>
                  <div className="nm sb-num">{(+p.shares).toFixed(4).replace(/\.?0+$/, "")} shares · avg {money(p.avg_buy_price)}</div>
                </div>
                <div className="rt">
                  <div className="px sb-num">{money((px ?? 0) * (p.shares ?? 0))}</div>
                  <div className={`pc sb-num ${tone(pnlPct)}`}>{pct(pnlPct)}</div>
                </div>
              </button>
            );
          })}

          <h2 className="sb-h2">Auto-Trader <span className="sub"><button onClick={() => go("auto")}>Manage</button></span></h2>
          {strategies.map(([sk, d]) => {
            const a = d.allocation;
            return (
              <button key={sk} className="sb-row" onClick={() => go("auto")}>
                <div style={{ minWidth: 0 }}>
                  <div className="sym">{d.config?.label || sk}</div>
                  <div className="nm">{a ? `${money(a.allocated, 0)} allocated${a.is_paused ? " · paused" : ""}` : "Not started"}</div>
                </div>
                <div className="rt">
                  {a ? <>
                    <div className="px sb-num">{money(a.total_value)}</div>
                    <div className={`pc sb-num ${tone(a.pnl)}`}>{signed(a.pnl)}</div>
                  </> : <span className="sb-link" style={{ marginTop: 0 }}>Start</span>}
                </div>
              </button>
            );
          })}
          {overview && strategies.length === 0 && <div className="sb-empty">No strategies available.</div>}

          <div className="sb-phone">
            <h2 className="sb-h2">Watchlist <span className="sub">{watchlist.length} symbols</span></h2>
            {watchlist.map(x => (
              <QuoteRow key={x} symbol={x} quote={quotes[x]} sig={signals[x]} onClick={() => openStock(x)} />
            ))}
          </div>
        </main>
        <aside className="sb-side desk">
          <WatchlistPanel watchlist={watchlist} quotes={quotes} signals={signals} />
        </aside>
      </div>
    </div>
  );
}
