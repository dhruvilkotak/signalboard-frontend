import { useState, useEffect, useRef, useCallback } from "react";

// ── Ticker config ─────────────────────────────────────────────────────────────
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

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_URL = (import.meta.env.VITE_WS_URL || "ws://localhost:8000")
  .replace("https://", "wss://").replace("http://", "ws://");

// ── Live price hook ───────────────────────────────────────────────────────────
function useMarketData() {
  const [prices, setPrices]     = useState({});
  const [status, setStatus]     = useState("connecting");
  const [lastUpdate, setLU]     = useState(null);
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

// ── Flash hook ────────────────────────────────────────────────────────────────
function useFlash(val) {
  const [flash, setFlash] = useState(null);
  const prev = useRef(val);
  useEffect(() => {
    if (prev.current !== undefined && val !== undefined && val !== prev.current) {
      setFlash(val > prev.current ? "up" : "dn");
      const t = setTimeout(() => setFlash(null), 700);
      return () => clearTimeout(t);
    }
    prev.current = val;
  }, [val]);
  return flash;
}

// ── TradingView widget loader ─────────────────────────────────────────────────
function TVWidget({ id, config, height = 400 }) {
  const ref = useRef(null);
  const prev = useRef(null);

  useEffect(() => {
    const key = JSON.stringify(config);
    if (prev.current === key) return;
    prev.current = key;

    if (!ref.current) return;
    ref.current.innerHTML = "";

    const container = document.createElement("div");
    container.id = id;
    ref.current.appendChild(container);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    // Pick the right TV script based on widget type
    const widgetScripts = {
      "advanced-chart":       "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js",
      "symbol-info":          "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js",
      "technical-analysis":   "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js",
      "timeline":             "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js",
      "ticker-tape":          "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js",
      "market-overview":      "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js",
    };

    script.src = widgetScripts[config.widget] || widgetScripts["advanced-chart"];
    script.innerHTML = JSON.stringify({ ...config, container_id: id });

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    wrapper.appendChild(inner);
    wrapper.appendChild(script);
    ref.current.innerHTML = "";
    ref.current.appendChild(wrapper);
  }, [id, config]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}

// ── Ticker row ────────────────────────────────────────────────────────────────
function TickerRow({ ticker, price, selected, onClick }) {
  const flash = useFlash(price?.price);
  const chg   = price?.change_pct ?? 0;
  const up    = chg >= 0;

  return (
    <div onClick={onClick} style={{
      display: "grid", gridTemplateColumns: "1fr auto",
      alignItems: "center", padding: "10px 14px",
      cursor: "pointer", borderBottom: "1px solid #161b22",
      background: selected
        ? "linear-gradient(90deg,#1f3a5a20,#1f6feb10)"
        : flash === "up" ? "#0d2a1a"
        : flash === "dn" ? "#2a0d0d"
        : "transparent",
      borderLeft: selected ? "2px solid #1f6feb" : "2px solid transparent",
      transition: "background 0.4s",
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
        <div style={{ fontSize: 10, color: "#6e7681", marginTop: 1 }}>{ticker.name}</div>
      </div>

      <div style={{ textAlign: "right" }}>
        {price ? (
          <>
            <div style={{
              fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700,
              color: flash === "up" ? "#3fb950" : flash === "dn" ? "#f85149" : "#e6edf3",
              transition: "color 0.4s",
            }}>${price.price?.toFixed(2)}</div>
            <div style={{
              fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
              color: up ? "#3fb950" : "#f85149",
            }}>{up ? "▲" : "▼"}{Math.abs(chg).toFixed(2)}%</div>
          </>
        ) : (
          <div style={{ width: 60, height: 28, background: "#161b22", borderRadius: 4, animation: "shimmer 1.5s infinite" }} />
        )}
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function LiveDashboard() {
  const { prices, status, lastUpdate } = useMarketData();
  const [selected, setSelected] = useState("MSFT");
  const [activeTab, setActiveTab] = useState("chart");   // chart | technical | news
  const [chartType, setChartType] = useState("1");        // 1=candles, 3=line
  const [interval, setInterval_]  = useState("D");        // 1, 5, 15, 60, D, W
  const [filter, setFilter]       = useState("ALL");

  const ticker = TICKERS.find(t => t.symbol === selected);
  const price  = prices[selected];
  const chg    = price?.change_pct ?? 0;
  const up     = chg >= 0;
  const advancingCount = TICKERS.filter(t => (prices[t.symbol]?.change_pct ?? 0) > 0).length;
  const decliningCount = TICKERS.filter(t => (prices[t.symbol]?.change_pct ?? 0) < 0).length;
  const filtered = TICKERS.filter(t => filter === "ALL" || t.type === filter);

  // Chart config — rebuilds when symbol/interval/chartType changes
  const chartConfig = {
    widget: "advanced-chart",
    autosize: true,
    symbol: ticker?.tv || "NASDAQ:MSFT",
    interval,
    timezone: "America/New_York",
    theme: "dark",
    style: chartType,
    locale: "en",
    backgroundColor: "rgba(13, 17, 23, 1)",
    gridColor: "rgba(30, 37, 46, 1)",
    hide_top_toolbar: false,
    hide_legend: false,
    allow_symbol_change: false,
    save_image: true,
    studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies", "Volume@tv-basicstudies"],
    show_popup_button: true,
    withdateranges: true,
    hide_side_toolbar: false,
  };

  const technicalConfig = {
    widget: "technical-analysis",
    interval: "1D",
    width: "100%",
    isTransparent: true,
    height: "100%",
    symbol: ticker?.tv || "NASDAQ:MSFT",
    showIntervalTabs: true,
    displayMode: "single",
    locale: "en",
    colorTheme: "dark",
  };

  const newsConfig = {
    widget: "timeline",
    feedMode: "symbol",
    symbol: ticker?.tv || "NASDAQ:MSFT",
    isTransparent: true,
    displayMode: "regular",
    width: "100%",
    height: "100%",
    colorTheme: "dark",
    locale: "en",
  };

  const symbolInfoConfig = {
    widget: "symbol-info",
    symbol: ticker?.tv || "NASDAQ:MSFT",
    width: "100%",
    locale: "en",
    colorTheme: "dark",
    isTransparent: true,
  };

  const tickerTapeSymbols = TICKERS.map(t => ({
    proName: t.tv,
    title: t.symbol,
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { 0%,100%{opacity:.3} 50%{opacity:.7} }
        @keyframes pulse   { 0%,100%{opacity:1}  50%{opacity:.3} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #21262d; border-radius: 2px; }
        button { cursor: pointer; border: none; background: none; font-family: inherit; }
        .tv-wrap .tradingview-widget-container { height: 100% !important; }
        .tv-wrap .tradingview-widget-container__widget { height: 100% !important; }
      `}</style>

      {/* ── Ticker tape ──────────────────────────────────────────────────── */}
      <div style={{ height: 46, background: "#010409", borderBottom: "1px solid #21262d", overflow: "hidden" }}>
        <div className="tv-wrap" style={{ height: 46 }}>
          <div className="tradingview-widget-container" style={{ height: 46 }}>
            <div className="tradingview-widget-container__widget" />
            <script
              type="text/javascript"
              src="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js"
              async
              dangerouslySetInnerHTML={{ __html: JSON.stringify({
                symbols: tickerTapeSymbols,
                showSymbolLogo: false,
                isTransparent: true,
                displayMode: "compact",
                colorTheme: "dark",
                locale: "en",
              })}}
            />
          </div>
        </div>
      </div>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", height: 46,
        background: "#0d1117", borderBottom: "1px solid #21262d",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 700, color: "#e6edf3" }}>
            SIGNAL <span style={{ color: "#58a6ff" }}>//</span> LIVE
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: status === "live" ? "#3fb950" : status === "reconnecting" ? "#e3b341" : "#f85149",
              boxShadow: status === "live" ? "0 0 6px #3fb950" : "none",
              animation: status === "live" ? "pulse 3s infinite" : "none",
            }} />
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#6e7681", letterSpacing: 1 }}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {[
            { label: "ADV", val: advancingCount, color: "#3fb950" },
            { label: "DEC", val: decliningCount, color: "#f85149" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace" }}>{label}</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700, color }}>{val}</span>
            </div>
          ))}
          {lastUpdate && (
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#3a4050" }}>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 138px)" }}>

        {/* Left: ticker list */}
        <div style={{ width: 220, borderRight: "1px solid #21262d", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {/* Filter */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #21262d", display: "flex", gap: 4 }}>
            {["ALL", "STOCK", "ETF"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: "4px 0", borderRadius: 5,
                background: filter === f ? "#1f6feb" : "#161b22",
                color: filter === f ? "#fff" : "#6e7681",
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 700,
                transition: "all 0.15s",
              }}>{f}</button>
            ))}
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.map(t => (
              <TickerRow key={t.symbol} ticker={t} price={prices[t.symbol]}
                selected={selected === t.symbol} onClick={() => setSelected(t.symbol)} />
            ))}
          </div>
        </div>

        {/* Center + Right: main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Symbol header */}
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid #21262d",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#0d1117", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 700, color: "#e6edf3" }}>
                    {ticker?.symbol}
                  </span>
                  <span style={{ fontSize: 12, color: "#8b949e" }}>{ticker?.name}</span>
                  <span style={{
                    fontSize: 9, padding: "2px 6px", borderRadius: 4,
                    background: ticker?.type === "ETF" ? "#1f6feb20" : "#3fb95020",
                    color: ticker?.type === "ETF" ? "#58a6ff" : "#3fb950",
                    fontFamily: "'IBM Plex Mono',monospace",
                  }}>{ticker?.sector}</span>
                </div>
              </div>
              {price && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 26, fontWeight: 700, color: "#e6edf3" }}>
                    ${price.price?.toFixed(2)}
                  </span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 600,
                    color: up ? "#3fb950" : "#f85149",
                  }}>
                    {up ? "+" : ""}{(price.price - price.prev_close)?.toFixed(2)} ({up ? "+" : ""}{chg?.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>

            {/* Chart controls */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* Interval */}
              <div style={{ display: "flex", gap: 3, background: "#161b22", borderRadius: 7, padding: 3 }}>
                {[["1","1m"],["5","5m"],["15","15m"],["60","1H"],["D","1D"],["W","1W"]].map(([val, label]) => (
                  <button key={val} onClick={() => setInterval_(val)} style={{
                    padding: "3px 8px", borderRadius: 5,
                    background: interval === val ? "#21262d" : "transparent",
                    color: interval === val ? "#e6edf3" : "#6e7681",
                    fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 600,
                  }}>{label}</button>
                ))}
              </div>

              {/* Chart type */}
              <div style={{ display: "flex", gap: 3, background: "#161b22", borderRadius: 7, padding: 3 }}>
                {[["1","🕯️"],["3","📈"]].map(([val, icon]) => (
                  <button key={val} onClick={() => setChartType(val)} style={{
                    padding: "3px 8px", borderRadius: 5, fontSize: 12,
                    background: chartType === val ? "#21262d" : "transparent",
                  }}>{icon}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", borderBottom: "1px solid #21262d", background: "#0d1117", flexShrink: 0 }}>
            {[
              { id: "chart",     label: "📊 Chart" },
              { id: "technical", label: "⚡ Technical" },
              { id: "news",      label: "📰 News" },
              { id: "info",      label: "ℹ️ Info" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "8px 18px", fontSize: 12, fontFamily: "'IBM Plex Sans',sans-serif",
                color: activeTab === tab.id ? "#58a6ff" : "#6e7681",
                borderBottom: activeTab === tab.id ? "2px solid #58a6ff" : "2px solid transparent",
                fontWeight: activeTab === tab.id ? 600 : 400,
                transition: "all 0.15s",
              }}>{tab.label}</button>
            ))}

            {/* Quick stats from Alpaca */}
            {price && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 16, padding: "0 16px", alignItems: "center" }}>
                {[
                  ["Open", `$${price.open?.toFixed(2)}`],
                  ["High", `$${price.high?.toFixed(2)}`],
                  ["Low",  `$${price.low?.toFixed(2)}`],
                  ["Vol",  price.volume ? `${(price.volume/1e6).toFixed(1)}M` : "—"],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace" }}>{label}</span>
                    <span style={{ fontSize: 11, color: "#e6edf3", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Widget area */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }} className="tv-wrap">

            {/* Chart tab */}
            {activeTab === "chart" && (
              <div style={{ width: "100%", height: "100%" }}>
                <div className="tradingview-widget-container" style={{ height: "100%", width: "100%" }}>
                  <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }} />
                  <script
                    type="text/javascript"
                    src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
                    async
                    dangerouslySetInnerHTML={{ __html: JSON.stringify({
                      autosize: true,
                      symbol: ticker?.tv || "NASDAQ:MSFT",
                      interval,
                      timezone: "America/New_York",
                      theme: "dark",
                      style: chartType,
                      locale: "en",
                      backgroundColor: "rgba(13,17,23,1)",
                      gridColor: "rgba(22,27,34,1)",
                      hide_top_toolbar: false,
                      hide_legend: false,
                      allow_symbol_change: false,
                      save_image: true,
                      studies: [
                        "RSI@tv-basicstudies",
                        "MACD@tv-basicstudies",
                        "Volume@tv-basicstudies",
                      ],
                      show_popup_button: true,
                      withdateranges: true,
                    })}}
                  />
                </div>
              </div>
            )}

            {/* Technical Analysis tab */}
            {activeTab === "technical" && (
              <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
                {/* TV Technical Analysis gauge */}
                <div style={{ flex: 1, height: "100%" }}>
                  <div className="tradingview-widget-container" style={{ height: "100%" }}>
                    <div className="tradingview-widget-container__widget" style={{ height: "100%" }} />
                    <script
                      type="text/javascript"
                      src="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
                      async
                      dangerouslySetInnerHTML={{ __html: JSON.stringify({
                        interval: "1D",
                        width: "100%",
                        isTransparent: true,
                        height: "100%",
                        symbol: ticker?.tv || "NASDAQ:MSFT",
                        showIntervalTabs: true,
                        displayMode: "single",
                        locale: "en",
                        colorTheme: "dark",
                      })}}
                    />
                  </div>
                </div>
                {/* Our own signal if available */}
                <div style={{ width: 260, borderLeft: "1px solid #21262d", padding: 16, overflowY: "auto" }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#6e7681", marginBottom: 12, letterSpacing: 1 }}>
                    OUR AI SIGNAL
                  </div>
                  <div style={{ fontSize: 12, color: "#8b949e", lineHeight: 1.6 }}>
                    Go to the ⚡ AI Signals tab to generate a signal for {ticker?.symbol}.
                  </div>
                </div>
              </div>
            )}

            {/* News tab */}
            {activeTab === "news" && (
              <div className="tradingview-widget-container" style={{ height: "100%", width: "100%" }}>
                <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }} />
                <script
                  type="text/javascript"
                  src="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js"
                  async
                  dangerouslySetInnerHTML={{ __html: JSON.stringify({
                    feedMode: "symbol",
                    symbol: ticker?.tv || "NASDAQ:MSFT",
                    isTransparent: true,
                    displayMode: "regular",
                    width: "100%",
                    height: "100%",
                    colorTheme: "dark",
                    locale: "en",
                  })}}
                />
              </div>
            )}

            {/* Info tab — Symbol info widget */}
            {activeTab === "info" && (
              <div style={{ height: "100%", overflow: "auto" }}>
                <div className="tradingview-widget-container" style={{ width: "100%" }}>
                  <div className="tradingview-widget-container__widget" />
                  <script
                    type="text/javascript"
                    src="https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js"
                    async
                    dangerouslySetInnerHTML={{ __html: JSON.stringify({
                      symbol: ticker?.tv || "NASDAQ:MSFT",
                      width: "100%",
                      locale: "en",
                      colorTheme: "dark",
                      isTransparent: true,
                    })}}
                  />
                </div>

                {/* Company financials from TV */}
                <div style={{ marginTop: 16, padding: "0 16px" }}>
                  <div className="tradingview-widget-container">
                    <div className="tradingview-widget-container__widget" />
                    <script
                      type="text/javascript"
                      src="https://s3.tradingview.com/external-embedding/embed-widget-financials.js"
                      async
                      dangerouslySetInnerHTML={{ __html: JSON.stringify({
                        isTransparent: true,
                        largeChartUrl: "",
                        displayMode: "regular",
                        width: "100%",
                        height: 450,
                        colorTheme: "dark",
                        symbol: ticker?.tv || "NASDAQ:MSFT",
                        locale: "en",
                      })}}
                    />
                  </div>
                </div>

                {/* Our live stats */}
                {price && (
                  <div style={{ padding: 16 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#6e7681", marginBottom: 12, letterSpacing: 1 }}>
                      LIVE DATA (ALPACA)
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
                          background: "#161b22", borderRadius: 8, padding: "10px 12px",
                          border: "1px solid #21262d",
                        }}>
                          <div style={{ fontSize: 9, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace", marginBottom: 4, letterSpacing: 1 }}>{label}</div>
                          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 700, color: "#e6edf3" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
