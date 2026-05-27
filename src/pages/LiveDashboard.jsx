import { useState, useEffect, useRef, useCallback } from "react";
import NewsTab from "../components/NewsTab";
import SearchBar from "../components/SearchBar";
import SignalTab from "../components/SignalTab";    // ← new

const API    = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";
const WS_URL = (import.meta.env.VITE_WS_URL || "wss://signalboard.duckdns.org")
  .replace("https://", "wss://").replace("http://", "ws://");

// TradingView symbol map
const TV_MAP = {
  SPY:"AMEX:SPY", VOO:"AMEX:VOO", QQQ:"NASDAQ:QQQ", IWM:"AMEX:IWM",
  DIA:"AMEX:DIA", VTI:"AMEX:VTI", ARKK:"NASDAQ:ARKK",
  JEPI:"AMEX:JEPI", JEPQ:"NASDAQ:JEPQ", SCHD:"AMEX:SCHD", SGOV:"AMEX:SGOV",
  MSFT:"NASDAQ:MSFT", AAPL:"NASDAQ:AAPL", NVDA:"NASDAQ:NVDA",
  GOOGL:"NASDAQ:GOOGL", AMZN:"NASDAQ:AMZN", META:"NASDAQ:META",
  TSLA:"NASDAQ:TSLA", HOOD:"NASDAQ:HOOD", AMD:"NASDAQ:AMD",
  INTC:"NASDAQ:INTC", PLTR:"NYSE:PLTR", COIN:"NASDAQ:COIN",
  SOFI:"NASDAQ:SOFI", NFLX:"NASDAQ:NFLX", DIS:"NYSE:DIS",
  JPM:"NYSE:JPM", BAC:"NYSE:BAC", GS:"NYSE:GS", V:"NYSE:V",
  MA:"NYSE:MA", UNH:"NYSE:UNH", JNJ:"NYSE:JNJ", PFE:"NYSE:PFE",
  XOM:"NYSE:XOM", CVX:"NYSE:CVX", WMT:"NYSE:WMT", COST:"NASDAQ:COST",
  SBUX:"NASDAQ:SBUX", NKE:"NYSE:NKE",
  "BTC-USD":"BINANCE:BTCUSDT", "ETH-USD":"BINANCE:ETHUSDT",
  "GC=F":"COMEX:GC1!", "CL=F":"NYMEX:CL1!", "BRK.B":"NYSE:BRK.B",
};
const getTVSymbol = (sym) => TV_MAP[sym] || `NASDAQ:${sym}`;

const tvChart     = (sym, iv="D", st="1") => `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(getTVSymbol(sym))}&interval=${iv}&symboledit=1&saveimage=1&toolbarbg=0d1117&studies=RSI%40tv-basicstudies%1FMACD%40tv-basicstudies%1FVolume%40tv-basicstudies&theme=dark&style=${st}&timezone=America%2FNew_York&withdateranges=1&showpopupbutton=1&hideideas=1&locale=en`;
const tvTechnical = (sym) => `https://www.tradingview.com/embed-widget/technical-analysis/?symbol=${encodeURIComponent(getTVSymbol(sym))}&interval=1D&colorTheme=dark&isTransparent=true&locale=en&showIntervalTabs=true`;
const tvNews      = (sym) => `https://www.tradingview.com/embed-widget/timeline/?feedMode=symbol&symbol=${encodeURIComponent(getTVSymbol(sym))}&colorTheme=dark&isTransparent=true&locale=en`;
const tvSymInfo   = (sym) => `https://www.tradingview.com/embed-widget/symbol-info/?symbol=${encodeURIComponent(getTVSymbol(sym))}&colorTheme=dark&isTransparent=true&locale=en`;
const tvFinancials= (sym) => `https://www.tradingview.com/embed-widget/financials/?symbol=${encodeURIComponent(getTVSymbol(sym))}&colorTheme=dark&isTransparent=true&displayMode=regular&locale=en`;

// ── Price hook ────────────────────────────────────────────────────────────────
function usePrices(watchlist) {
  const [prices, setPrices] = useState({});
  const [status, setStatus] = useState("loading");
  const [lastUpdate, setLU] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!watchlist.length) return;
    try {
      const res = await fetch(`${API}/api/quote/batch/${watchlist.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        Object.values(data).forEach(p => {
          if (p.ext_price && p.price)
            p.ext_change = ((p.ext_price - p.price) / p.price * 100).toFixed(2);
        });
        setPrices(prev => ({ ...prev, ...data }));
        setStatus("live");
        setLU(new Date());
      }
    } catch { setStatus("error"); }
  }, [watchlist.join(",")]);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 60000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  return { prices, status, lastUpdate, refresh: fetchAll };
}

// ── Flash hook ────────────────────────────────────────────────────────────────
function useFlash(val) {
  const [flash, setFlash] = useState(null);
  const prev = useRef(val);
  useEffect(() => {
    if (prev.current !== undefined && val !== undefined && val !== prev.current) {
      setFlash(val > prev.current ? "up" : "dn");
      const t = setTimeout(() => setFlash(null), 800);
      return () => clearTimeout(t);
    }
    prev.current = val;
  }, [val]);
  return flash;
}

// ── Ticker row ────────────────────────────────────────────────────────────────
function TickerRow({ symbol, price, selected, onClick, onRemove }) {
  const flash = useFlash(price?.price);
  const chg   = price?.change_pct ?? 0;
  const up    = chg >= 0;
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "9px 12px", cursor: "pointer",
        borderBottom: "1px solid #161b22",
        borderLeft: selected ? "2px solid #58a6ff" : "2px solid transparent",
        background: selected ? "#161b22"
          : flash === "up" ? "#0d2a1a"
          : flash === "dn" ? "#2a0d0d"
          : hov ? "#0d1117" : "transparent",
        transition: "background 0.4s",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: "#e6edf3" }}>
            {symbol}
          </div>
          {price && (
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#6e7681", marginTop: 1 }}>
              Vol: {price.volume ? `${(price.volume/1e6).toFixed(1)}M` : "—"}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ textAlign: "right" }}>
            {price ? (
              <>
                <div style={{
                  fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700,
                  color: flash === "up" ? "#3fb950" : flash === "dn" ? "#f85149" : "#e6edf3",
                  transition: "color 0.4s",
                }}>${price.price?.toFixed(2)}</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: up ? "#3fb950" : "#f85149" }}>
                  {up ? "▲" : "▼"}{Math.abs(chg).toFixed(2)}%
                </div>
              </>
            ) : (
              <div style={{ width: 52, height: 28, background: "#1a1f2e", borderRadius: 4, animation: "shimmer 1.5s infinite" }} />
            )}
          </div>
          {hov && (
            <button onClick={e => { e.stopPropagation(); onRemove(symbol); }} style={{
              width: 18, height: 18, borderRadius: "50%", background: "#f85149",
              border: "none", color: "#fff", fontSize: 11, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LiveDashboard({ watchlist, onAdd, onRemove, onNavigate, tabs, activeTab }) {
  const { prices, status, lastUpdate, refresh } = usePrices(watchlist);
  const [selected,   setSelected]   = useState(watchlist[6] || watchlist[0] || "MSFT");
  const [innerTab,   setInnerTab]   = useState("chart");
  const [interval,   setIntervalV]  = useState("D");
  const [chartStyle, setChartStyle] = useState("1");
  const [filter,     setFilter]     = useState("ALL");

  useEffect(() => {
    if (!watchlist.includes(selected) && watchlist.length > 0)
      setSelected(watchlist[0]);
  }, [watchlist]);

  // Reset to chart when switching symbols (don't keep signal tab stale)
  const handleSelectSymbol = (sym) => {
    setSelected(sym);
    // Keep inner tab unless it's signal — signal is per-symbol so keep it
    // so users can quickly compare signals across tickers
  };

  const price = prices[selected];
  const chg   = price?.change_pct ?? 0;
  const up    = chg >= 0;
  const adv   = watchlist.filter(s => (prices[s]?.change_pct ?? 0) > 0).length;
  const dec   = watchlist.filter(s => (prices[s]?.change_pct ?? 0) < 0).length;

  const fmtCap = (n) => {
    if (!n) return "—";
    if (n >= 1e12) return `$${(n/1e12).toFixed(2)}T`;
    if (n >= 1e9)  return `$${(n/1e9).toFixed(1)}B`;
    return `$${(n/1e6).toFixed(0)}M`;
  };

  // ── Inner tabs definition — Signal tab added ───────────────────────────────
  const INNER_TABS = [
    { id: "chart",     icon: "📊", label: "Chart"      },
    { id: "technical", icon: "⚡", label: "Technical"  },
    { id: "signal",    icon: "🤖", label: "AI Signal"  },  // ← new
    { id: "news",      icon: "📰", label: "News"       },
    { id: "info",      icon: "ℹ️",  label: "Financials" },
  ];

  return (
    <div style={{ height: "100vh", background: "#0d1117", color: "#e6edf3", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:.3} 50%{opacity:.8} }
        @keyframes blink   { 0%,100%{opacity:1}  50%{opacity:.2} }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#21262d; border-radius:2px; }
        button { cursor:pointer; border:none; background:none; font-family:inherit; color:inherit; }
        iframe { display:block; border:none; }
      `}</style>

      {/* ── Top nav ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 12px", height: 44, flexShrink: 0,
        background: "#010409", borderBottom: "1px solid #21262d", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700, color: "#e6edf3" }}>
            SIGNAL BOARD
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: status === "live" ? "#3fb950" : "#e3b341",
              animation: status === "live" ? "blink 3s infinite" : "none",
            }} />
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: "#6e7681" }}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>

        <SearchBar watchlist={watchlist} onAdd={onAdd} />

        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          {tabs?.map(t => (
            <button key={t.id} onClick={() => onNavigate(t.id)} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 6,
              background: t.id === activeTab ? "#1f6feb" : "#161b22",
              color: t.id === activeTab ? "#fff" : "#8b949e",
              fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
              fontWeight: t.id === activeTab ? 700 : 400,
              border: t.id === activeTab ? "1px solid #1f6feb" : "1px solid #21262d",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
          {[["ADV", adv, "#3fb950"], ["DEC", dec, "#f85149"]].map(([l, v, c]) => (
            <div key={l} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 8, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace" }}>{l}</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: c }}>{v}</span>
            </div>
          ))}
          <button onClick={refresh} style={{
            fontSize: 10, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace",
            background: "#161b22", border: "1px solid #21262d",
            padding: "2px 7px", borderRadius: 5,
          }}>↻</button>
          {lastUpdate && (
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: "#3a4258" }}>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left: watchlist */}
        <div style={{ width: 188, borderRight: "1px solid #21262d", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #21262d", display: "flex", gap: 3 }}>
            {["ALL","STOCK","ETF"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: "3px 0", borderRadius: 5,
                background: filter === f ? "#1f6feb" : "#161b22",
                color: filter === f ? "#fff" : "#6e7681",
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700,
              }}>{f}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {watchlist.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "#6e7681", fontSize: 11, fontFamily: "'IBM Plex Mono',monospace" }}>
                Search and add stocks above
              </div>
            ) : watchlist.map(sym => (
              <TickerRow key={sym} symbol={sym} price={prices[sym]}
                selected={selected === sym}
                onClick={() => handleSelectSymbol(sym)}
                onRemove={onRemove}
              />
            ))}
          </div>
          <div style={{
            padding: "5px 10px", borderTop: "1px solid #21262d",
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: "#3a4258",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>{watchlist.length} tracked</span>
            <span style={{ color: "#58a6ff" }}>Yahoo Finance</span>
          </div>
        </div>

        {/* Right: chart area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Symbol header */}
          <div style={{
            padding: "7px 14px", borderBottom: "1px solid #21262d",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0, background: "#0d1117",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 700, color: "#e6edf3" }}>
                {selected}
              </span>
              {price && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 24, fontWeight: 700, color: "#e6edf3" }}>
                    ${price.price?.toFixed(2)}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: up ? "#3fb950" : "#f85149" }}>
                    {up ? "+" : ""}{price.change_amt?.toFixed(2)} ({up ? "+" : ""}{chg?.toFixed(2)}%)
                  </span>
                  {price.market_state && price.market_state !== "REGULAR" && (
                    <span style={{
                      fontSize: 9, padding: "2px 6px", borderRadius: 4,
                      background: price.market_state === "PRE" ? "#e3b34120" : price.market_state === "POST" ? "#58a6ff20" : "#6e768120",
                      color: price.market_state === "PRE" ? "#e3b341" : price.market_state === "POST" ? "#58a6ff" : "#6e7681",
                      fontFamily: "'IBM Plex Mono',monospace",
                    }}>
                      {price.market_state === "PRE" ? "Pre-Market" : price.market_state === "POST" ? "After Hours" : "Closed"}
                    </span>
                  )}
                </div>
              )}
            </div>

            {innerTab === "chart" && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 2, background: "#161b22", borderRadius: 7, padding: 3 }}>
                  {[["1","1m"],["5","5m"],["15","15m"],["60","1H"],["D","1D"],["W","1W"],["M","1M"]].map(([val, label]) => (
                    <button key={val} onClick={() => setIntervalV(val)} style={{
                      padding: "2px 7px", borderRadius: 4,
                      background: interval === val ? "#21262d" : "transparent",
                      color: interval === val ? "#e6edf3" : "#6e7681",
                      fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 600,
                    }}>{label}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 2, background: "#161b22", borderRadius: 7, padding: 3 }}>
                  {[["1","🕯️"],["3","📈"],["8","📊"]].map(([val, icon]) => (
                    <button key={val} onClick={() => setChartStyle(val)} style={{
                      padding: "2px 7px", borderRadius: 4, fontSize: 11,
                      background: chartStyle === val ? "#21262d" : "transparent",
                    }}>{icon}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inner tabs */}
          <div style={{
            display: "flex", borderBottom: "1px solid #21262d",
            background: "#0d1117", flexShrink: 0, alignItems: "center",
          }}>
            {INNER_TABS.map(tab => (
              <button key={tab.id} onClick={() => setInnerTab(tab.id)} style={{
                padding: "7px 14px", fontSize: 12,
                fontFamily: "'IBM Plex Sans',sans-serif",
                color: innerTab === tab.id ? "#58a6ff" : "#6e7681",
                borderBottom: innerTab === tab.id ? "2px solid #58a6ff" : "2px solid transparent",
                fontWeight: innerTab === tab.id ? 600 : 400,
                display: "flex", alignItems: "center", gap: 4,
                // Highlight the Signal tab with a subtle glow
                ...(tab.id === "signal" && innerTab !== "signal" ? {
                  color: "#e3b341",
                  borderBottom: "2px solid transparent",
                } : {}),
                ...(tab.id === "signal" && innerTab === "signal" ? {
                  color: "#e3b341",
                  borderBottom: "2px solid #e3b341",
                } : {}),
              }}>
                {tab.icon} {tab.label}
              </button>
            ))}
            {price && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 12, padding: "0 14px", alignItems: "center" }}>
                {[
                  ["O", `$${price.open?.toFixed(2)}`],
                  ["H", `$${price.high?.toFixed(2)}`],
                  ["L", `$${price.low?.toFixed(2)}`],
                  ["Vol", price.volume ? `${(price.volume/1e6).toFixed(1)}M` : "—"],
                  ["Cap", fmtCap(price.mkt_cap)],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", gap: 3, alignItems: "center" }}>
                    <span style={{ fontSize: 8, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace" }}>{l}</span>
                    <span style={{ fontSize: 10, color: "#e6edf3", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Widget area */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ display: innerTab === "chart"     ? "block" : "none", height: "100%" }}>
              <iframe key={`chart-${selected}-${interval}-${chartStyle}`} src={tvChart(selected, interval, chartStyle)} width="100%" height="100%" />
            </div>
            <div style={{ display: innerTab === "technical" ? "block" : "none", height: "100%" }}>
              <iframe key={`tech-${selected}`} src={tvTechnical(selected)} width="100%" height="100%" />
            </div>
            {/* ── Signal tab — always mounted so state persists per symbol ── */}
            <div style={{ display: innerTab === "signal" ? "block" : "none", height: "100%" }}>
              <SignalTab
                key={selected}
                symbol={selected}
                currentPrice={price?.price}
              />
            </div>
            <div style={{ display: innerTab === "news"      ? "block" : "none", height: "100%" }}>
              <NewsTab symbol={selected} />
            </div>
            <div style={{ display: innerTab === "info" ? "flex" : "none", flexDirection: "column", height: "100%", overflowY: "auto" }}>
              <iframe key={`sinfo-${selected}`} src={tvSymInfo(selected)} width="100%" height="160" style={{ flexShrink: 0 }} />
              <iframe key={`fin-${selected}`}   src={tvFinancials(selected)} width="100%" height="480" style={{ flexShrink: 0 }} />
              {price && (
                <div style={{ padding: 16 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: "#6e7681", marginBottom: 10, letterSpacing: 1 }}>LIVE — YAHOO FINANCE</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                    {[
                      ["Price",      `$${price.price?.toFixed(2)}`],
                      ["Change",     `${chg>=0?"+":""}${chg?.toFixed(2)}%`],
                      ["Open",       `$${price.open?.toFixed(2)}`],
                      ["Prev Close", `$${price.prev_close?.toFixed(2)}`],
                      ["High",       `$${price.high?.toFixed(2)}`],
                      ["Low",        `$${price.low?.toFixed(2)}`],
                      ["Volume",     price.volume ? `${(price.volume/1e6).toFixed(2)}M` : "—"],
                      ["Market Cap", fmtCap(price.mkt_cap)],
                    ].map(([l, v]) => (
                      <div key={l} style={{ background: "#161b22", borderRadius: 8, padding: "8px 10px", border: "1px solid #21262d" }}>
                        <div style={{ fontSize: 7, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace", marginBottom: 3, letterSpacing: 1 }}>{l.toUpperCase()}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: "#e6edf3" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}