import { useState, useEffect, useRef, useCallback } from "react";

const TICKERS = [
  { symbol: "SPY",   tv: "AMEX:SPY",     name: "S&P 500 ETF",      type: "ETF",   sector: "Index" },
  { symbol: "VOO",   tv: "AMEX:VOO",     name: "Vanguard S&P 500",  type: "ETF",   sector: "Index" },
  { symbol: "JEPI",  tv: "AMEX:JEPI",    name: "JPMorgan Income",   type: "ETF",   sector: "Income" },
  { symbol: "JEPQ",  tv: "NASDAQ:JEPQ",  name: "JPMorgan Nasdaq",   type: "ETF",   sector: "Income" },
  { symbol: "SCHD",  tv: "AMEX:SCHD",    name: "Schwab Dividend",   type: "ETF",   sector: "Dividend" },
  { symbol: "SGOV",  tv: "AMEX:SGOV",    name: "T-Bills ETF",       type: "ETF",   sector: "Cash" },
  { symbol: "MSFT",  tv: "NASDAQ:MSFT",  name: "Microsoft",         type: "STOCK", sector: "Tech" },
  { symbol: "AAPL",  tv: "NASDAQ:AAPL",  name: "Apple",             type: "STOCK", sector: "Tech" },
  { symbol: "NVDA",  tv: "NASDAQ:NVDA",  name: "Nvidia",            type: "STOCK", sector: "AI" },
  { symbol: "GOOGL", tv: "NASDAQ:GOOGL", name: "Alphabet",          type: "STOCK", sector: "Tech" },
  { symbol: "AMZN",  tv: "NASDAQ:AMZN",  name: "Amazon",            type: "STOCK", sector: "Tech" },
  { symbol: "META",  tv: "NASDAQ:META",  name: "Meta Platforms",    type: "STOCK", sector: "Tech" },
  { symbol: "HOOD",  tv: "NASDAQ:HOOD",  name: "Robinhood",         type: "STOCK", sector: "Fintech" },
];

const API    = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_URL = (import.meta.env.VITE_WS_URL || "ws://localhost:8000")
  .replace("https://", "wss://").replace("http://", "ws://");

// ── TradingView iframe URLs ───────────────────────────────────────────────────
function chartUrl(tvSymbol, interval = "D", style = "1") {
  const enc = encodeURIComponent(tvSymbol);
  return [
    `https://www.tradingview.com/widgetembed/`,
    `?symbol=${enc}`,
    `&interval=${interval}`,
    `&symboledit=1`,
    `&saveimage=1`,
    `&toolbarbg=0d1117`,
    `&studies=RSI%40tv-basicstudies%1FMACD%40tv-basicstudies%1FVolume%40tv-basicstudies`,
    `&theme=dark`,
    `&style=${style}`,
    `&timezone=America%2FNew_York`,
    `&withdateranges=1`,
    `&showpopupbutton=1`,
    `&hideideas=1`,
    `&locale=en`,
  ].join("");
}

function technicalUrl(tvSymbol) {
  return `https://www.tradingview.com/embed-widget/technical-analysis/?symbol=${encodeURIComponent(tvSymbol)}&interval=1D&colorTheme=dark&isTransparent=true&locale=en`;
}

function newsUrl(tvSymbol) {
  return `https://www.tradingview.com/embed-widget/timeline/?feedMode=symbol&symbol=${encodeURIComponent(tvSymbol)}&colorTheme=dark&isTransparent=true&locale=en`;
}

function symbolInfoUrl(tvSymbol) {
  return `https://www.tradingview.com/embed-widget/symbol-info/?symbol=${encodeURIComponent(tvSymbol)}&colorTheme=dark&isTransparent=true&locale=en`;
}

function financialsUrl(tvSymbol) {
  return `https://www.tradingview.com/embed-widget/financials/?symbol=${encodeURIComponent(tvSymbol)}&colorTheme=dark&isTransparent=true&displayMode=regular&locale=en`;
}

// ── Live price hook ───────────────────────────────────────────────────────────
function useMarketData() {
  const [prices, setPrices]   = useState({});
  const [status, setStatus]   = useState("connecting");
  const [lastUpdate, setLU]   = useState(null);
  const wsRef  = useRef(null);
  const retryT = useRef(null);

  const merge = useCallback((data) => {
    setPrices(p => ({ ...p, ...data }));
    setLU(new Date());
  }, []);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/prices/`);
      if (r.ok) { merge(await r.json()); setStatus("live"); }
    } catch {}
  }, [merge]);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(`${WS_URL}/ws/prices`);
      wsRef.current = ws;
      ws.onopen    = () => { setStatus("live"); clearTimeout(retryT.current); };
      ws.onmessage = (e) => { try { const m = JSON.parse(e.data); if (m.data) merge(m.data); } catch {} };
      ws.onclose   = () => { setStatus("reconnecting"); retryT.current = setTimeout(connect, 4000); };
      ws.onerror   = () => { setStatus("polling"); ws.close(); };
    } catch { setStatus("polling"); }
  }, [merge]);

  useEffect(() => {
    poll();
    connect();
    const iv = setInterval(poll, 15000);
    return () => { clearInterval(iv); clearTimeout(retryT.current); wsRef.current?.close(); };
  }, [connect, poll]);

  return { prices, status, lastUpdate };
}

// ── Flash on price tick ───────────────────────────────────────────────────────
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
function TickerRow({ ticker, price, selected, onClick }) {
  const flash = useFlash(price?.price);
  const chg   = price?.change_pct ?? 0;
  const up    = chg >= 0;

  return (
    <div onClick={onClick} style={{
      padding: "10px 14px", cursor: "pointer",
      borderBottom: "1px solid #161b22",
      borderLeft: selected ? "2px solid #58a6ff" : "2px solid transparent",
      background: selected ? "#161b22"
        : flash === "up" ? "#0d2a1a"
        : flash === "dn" ? "#2a0d0d"
        : "transparent",
      transition: "background 0.5s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700, color: "#e6edf3" }}>
              {ticker.symbol}
            </span>
            <span style={{
              fontSize: 9, padding: "1px 5px", borderRadius: 3,
              background: ticker.type === "ETF" ? "#1f6feb20" : "#3fb95020",
              color: ticker.type === "ETF" ? "#58a6ff" : "#3fb950",
              fontFamily: "'IBM Plex Mono',monospace",
            }}>{ticker.type}</span>
          </div>
          <div style={{ fontSize: 10, color: "#6e7681" }}>{ticker.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          {price ? (
            <>
              <div style={{
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700,
                color: flash === "up" ? "#3fb950" : flash === "dn" ? "#f85149" : "#e6edf3",
                transition: "color 0.5s",
              }}>${price.price?.toFixed(2)}</div>
              <div style={{
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
                color: up ? "#3fb950" : "#f85149",
              }}>{up ? "▲" : "▼"}{Math.abs(chg).toFixed(2)}%</div>
            </>
          ) : (
            <div style={{ width: 56, height: 28, background: "#1a1f2e", borderRadius: 4,
              animation: "shimmer 1.5s infinite" }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LiveDashboard() {
  const { prices, status, lastUpdate } = useMarketData();
  const [selected, setSelected] = useState("NVDA");
  const [activeTab, setActiveTab] = useState("chart");
  const [interval, setIntervalV] = useState("D");
  const [chartStyle, setChartStyle] = useState("1");  // 1=candles, 3=line
  const [filter, setFilter]     = useState("ALL");

  const ticker = TICKERS.find(t => t.symbol === selected);
  const price  = prices[selected];
  const chg    = price?.change_pct ?? 0;
  const up     = chg >= 0;
  const adv    = TICKERS.filter(t => (prices[t.symbol]?.change_pct ?? 0) > 0).length;
  const dec    = TICKERS.filter(t => (prices[t.symbol]?.change_pct ?? 0) < 0).length;
  const filtered = TICKERS.filter(t => filter === "ALL" || t.type === filter);

  // Stable iframe src — only changes when symbol/interval/style changes
  const iframeSrc = chartUrl(ticker?.tv || "NASDAQ:NVDA", interval, chartStyle);

  return (
    <div style={{ height: "100vh", background: "#0d1117", color: "#e6edf3", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { 0%,100%{opacity:.3} 50%{opacity:.8} }
        @keyframes blink   { 0%,100%{opacity:1}  50%{opacity:.2} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#21262d; border-radius:2px; }
        button { cursor:pointer; border:none; background:none; font-family:inherit; color:inherit; }
        iframe { display:block; border:none; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", height: 44, flexShrink: 0,
        background: "#010409", borderBottom: "1px solid #21262d",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 700, color: "#e6edf3" }}>
            SIGNAL <span style={{ color: "#58a6ff" }}>//</span> LIVE
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: status === "live" ? "#3fb950" : "#e3b341",
              boxShadow: status === "live" ? "0 0 8px #3fb950" : "none",
              animation: status === "live" ? "blink 3s infinite" : "none",
            }} />
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#6e7681", letterSpacing: 1 }}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 14 }}>
            {[["ADV", adv, "#3fb950"], ["DEC", dec, "#f85149"]].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace" }}>{l}</span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700, color: c }}>{v}</span>
              </div>
            ))}
          </div>
          {lastUpdate && (
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#3a4258" }}>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left: ticker list */}
        <div style={{ width: 200, borderRight: "1px solid #21262d", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #21262d", display: "flex", gap: 4 }}>
            {["ALL","STOCK","ETF"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: "4px 0", borderRadius: 5,
                background: filter === f ? "#1f6feb" : "#161b22",
                color: filter === f ? "#fff" : "#6e7681",
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 700,
              }}>{f}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.map(t => (
              <TickerRow key={t.symbol} ticker={t} price={prices[t.symbol]}
                selected={selected === t.symbol} onClick={() => { setSelected(t.symbol); setActiveTab("chart"); }} />
            ))}
          </div>
        </div>

        {/* Right: detail */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Symbol header */}
          <div style={{
            padding: "8px 16px", borderBottom: "1px solid #21262d",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0, background: "#0d1117",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 700, color: "#e6edf3" }}>
                    {ticker?.symbol}
                  </span>
                  <span style={{ fontSize: 12, color: "#8b949e" }}>{ticker?.name}</span>
                  <span style={{
                    fontSize: 9, padding: "2px 6px", borderRadius: 4,
                    background: "#1f6feb20", color: "#58a6ff",
                    fontFamily: "'IBM Plex Mono',monospace",
                  }}>{ticker?.sector}</span>
                </div>
              </div>
              {price && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 28, fontWeight: 700, color: "#e6edf3" }}>
                    ${price.price?.toFixed(2)}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: up ? "#3fb950" : "#f85149" }}>
                    {up ? "+" : ""}{(price.price - price.prev_close)?.toFixed(2)} ({up ? "+" : ""}{chg?.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>

            {/* Chart controls — only show on chart tab */}
            {activeTab === "chart" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* Interval buttons */}
                <div style={{ display: "flex", gap: 2, background: "#161b22", borderRadius: 7, padding: 3 }}>
                  {[["1","1m"],["5","5m"],["15","15m"],["60","1H"],["D","1D"],["W","1W"],["M","1M"]].map(([val, label]) => (
                    <button key={val} onClick={() => setIntervalV(val)} style={{
                      padding: "3px 8px", borderRadius: 5,
                      background: interval === val ? "#21262d" : "transparent",
                      color: interval === val ? "#e6edf3" : "#6e7681",
                      fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 600,
                      transition: "all 0.15s",
                    }}>{label}</button>
                  ))}
                </div>
                {/* Chart style */}
                <div style={{ display: "flex", gap: 2, background: "#161b22", borderRadius: 7, padding: 3 }}>
                  {[["1","🕯️ Candle"],["3","📈 Line"],["8","📊 HLC"]].map(([val, label]) => (
                    <button key={val} onClick={() => setChartStyle(val)} style={{
                      padding: "3px 10px", borderRadius: 5, fontSize: 11,
                      background: chartStyle === val ? "#21262d" : "transparent",
                      color: chartStyle === val ? "#e6edf3" : "#6e7681",
                      transition: "all 0.15s",
                    }}>{label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tab bar */}
          <div style={{
            display: "flex", borderBottom: "1px solid #21262d",
            background: "#0d1117", flexShrink: 0, alignItems: "center",
          }}>
            {[
              { id: "chart",     icon: "📊", label: "Chart" },
              { id: "technical", icon: "⚡", label: "Technical" },
              { id: "news",      icon: "📰", label: "News" },
              { id: "info",      icon: "ℹ️",  label: "Financials" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "9px 16px", fontSize: 12,
                fontFamily: "'IBM Plex Sans',sans-serif",
                color: activeTab === tab.id ? "#58a6ff" : "#6e7681",
                borderBottom: activeTab === tab.id ? "2px solid #58a6ff" : "2px solid transparent",
                fontWeight: activeTab === tab.id ? 600 : 400,
                display: "flex", alignItems: "center", gap: 5,
                transition: "all 0.15s",
              }}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}

            {/* Quick stats strip */}
            {price && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 16, padding: "0 16px", alignItems: "center" }}>
                {[
                  ["O", `$${price.open?.toFixed(2)}`],
                  ["H", `$${price.high?.toFixed(2)}`],
                  ["L", `$${price.low?.toFixed(2)}`],
                  ["Vol", price.volume ? `${(price.volume/1e6).toFixed(1)}M` : "—"],
                  ["Prev", `$${price.prev_close?.toFixed(2)}`],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace" }}>{label}</span>
                    <span style={{ fontSize: 11, color: "#e6edf3", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Widget area — iframes */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>

            {/* CHART — TradingView advanced chart via iframe */}
            <div style={{ display: activeTab === "chart" ? "block" : "none", height: "100%", width: "100%" }}>
              <iframe
                key={`chart-${ticker?.tv}-${interval}-${chartStyle}`}
                src={iframeSrc}
                width="100%"
                height="100%"
                allowFullScreen
                style={{ border: "none" }}
              />
            </div>

            {/* TECHNICAL — TV Technical Analysis */}
            <div style={{ display: activeTab === "technical" ? "flex" : "none", height: "100%", gap: 0 }}>
              <iframe
                key={`tech-${ticker?.tv}`}
                src={technicalUrl(ticker?.tv || "NASDAQ:NVDA")}
                width="100%"
                height="100%"
                style={{ border: "none", flex: 1 }}
              />
            </div>

            {/* NEWS — TV Timeline/News feed */}
            <div style={{ display: activeTab === "news" ? "block" : "none", height: "100%", width: "100%" }}>
              <iframe
                key={`news-${ticker?.tv}`}
                src={newsUrl(ticker?.tv || "NASDAQ:NVDA")}
                width="100%"
                height="100%"
                style={{ border: "none" }}
              />
            </div>

            {/* FINANCIALS — Symbol info + financials */}
            <div style={{ display: activeTab === "info" ? "flex" : "none", flexDirection: "column", height: "100%", overflowY: "auto" }}>
              {/* Symbol info bar */}
              <iframe
                key={`info-${ticker?.tv}`}
                src={symbolInfoUrl(ticker?.tv || "NASDAQ:NVDA")}
                width="100%"
                height="160"
                style={{ border: "none", flexShrink: 0 }}
              />
              {/* Financials */}
              <iframe
                key={`fin-${ticker?.tv}`}
                src={financialsUrl(ticker?.tv || "NASDAQ:NVDA")}
                width="100%"
                height="500"
                style={{ border: "none", flexShrink: 0 }}
              />
              {/* Live Alpaca stats */}
              {price && (
                <div style={{ padding: 16 }}>
                  <div style={{
                    fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
                    color: "#6e7681", marginBottom: 12, letterSpacing: 1,
                  }}>LIVE DATA — ALPACA</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                    {[
                      ["Price",      `$${price.price?.toFixed(2)}`],
                      ["Change",     `${chg >= 0 ? "+" : ""}${chg?.toFixed(2)}%`],
                      ["Open",       `$${price.open?.toFixed(2)}`],
                      ["Prev Close", `$${price.prev_close?.toFixed(2)}`],
                      ["High",       `$${price.high?.toFixed(2)}`],
                      ["Low",        `$${price.low?.toFixed(2)}`],
                      ["Volume",     price.volume ? `${(price.volume/1e6).toFixed(2)}M` : "—"],
                    ].map(([label, val]) => (
                      <div key={label} style={{
                        background: "#161b22", borderRadius: 8,
                        padding: "10px 12px", border: "1px solid #21262d",
                      }}>
                        <div style={{ fontSize: 9, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace", marginBottom: 4, letterSpacing: 1 }}>
                          {label.toUpperCase()}
                        </div>
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 700, color: "#e6edf3" }}>
                          {val}
                        </div>
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
