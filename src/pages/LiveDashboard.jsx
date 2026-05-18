import { useState, useEffect, useRef, useCallback } from "react";

// All available tickers to choose from
const ALL_TICKERS = [
  { symbol: "SPY",   tv: "AMEX:SPY",       name: "S&P 500 ETF",        type: "ETF",   sector: "Index" },
  { symbol: "VOO",   tv: "AMEX:VOO",       name: "Vanguard S&P 500",   type: "ETF",   sector: "Index" },
  { symbol: "QQQ",   tv: "NASDAQ:QQQ",     name: "Nasdaq 100 ETF",     type: "ETF",   sector: "Index" },
  { symbol: "IWM",   tv: "AMEX:IWM",       name: "Russell 2000 ETF",   type: "ETF",   sector: "Index" },
  { symbol: "JEPI",  tv: "AMEX:JEPI",      name: "JPMorgan Income",    type: "ETF",   sector: "Income" },
  { symbol: "JEPQ",  tv: "NASDAQ:JEPQ",    name: "JPMorgan Nasdaq",    type: "ETF",   sector: "Income" },
  { symbol: "SCHD",  tv: "AMEX:SCHD",      name: "Schwab Dividend",    type: "ETF",   sector: "Dividend" },
  { symbol: "SGOV",  tv: "AMEX:SGOV",      name: "T-Bills ETF",        type: "ETF",   sector: "Cash" },
  { symbol: "MSFT",  tv: "NASDAQ:MSFT",    name: "Microsoft",          type: "STOCK", sector: "Tech" },
  { symbol: "AAPL",  tv: "NASDAQ:AAPL",    name: "Apple",              type: "STOCK", sector: "Tech" },
  { symbol: "NVDA",  tv: "NASDAQ:NVDA",    name: "Nvidia",             type: "STOCK", sector: "AI" },
  { symbol: "GOOGL", tv: "NASDAQ:GOOGL",   name: "Alphabet",           type: "STOCK", sector: "Tech" },
  { symbol: "AMZN",  tv: "NASDAQ:AMZN",    name: "Amazon",             type: "STOCK", sector: "Tech" },
  { symbol: "META",  tv: "NASDAQ:META",    name: "Meta Platforms",     type: "STOCK", sector: "Tech" },
  { symbol: "TSLA",  tv: "NASDAQ:TSLA",    name: "Tesla",              type: "STOCK", sector: "EV" },
  { symbol: "HOOD",  tv: "NASDAQ:HOOD",    name: "Robinhood",          type: "STOCK", sector: "Fintech" },
  { symbol: "AMD",   tv: "NASDAQ:AMD",     name: "AMD",                type: "STOCK", sector: "AI" },
  { symbol: "INTC",  tv: "NASDAQ:INTC",    name: "Intel",              type: "STOCK", sector: "Tech" },
  { symbol: "PLTR",  tv: "NYSE:PLTR",      name: "Palantir",           type: "STOCK", sector: "AI" },
  { symbol: "COIN",  tv: "NASDAQ:COIN",    name: "Coinbase",           type: "STOCK", sector: "Crypto" },
  { symbol: "SOFI",  tv: "NASDAQ:SOFI",    name: "SoFi Technologies",  type: "STOCK", sector: "Fintech" },
];

const API    = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_URL = (import.meta.env.VITE_WS_URL || "ws://localhost:8000")
  .replace("https://", "wss://").replace("http://", "ws://");

// ── TradingView iframe URLs ───────────────────────────────────────────────────
const tvChart = (sym, interval = "D", style = "1") =>
  `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(sym)}&interval=${interval}&symboledit=1&saveimage=1&toolbarbg=0d1117&studies=RSI%40tv-basicstudies%1FMACD%40tv-basicstudies%1FVolume%40tv-basicstudies&theme=dark&style=${style}&timezone=America%2FNew_York&withdateranges=1&showpopupbutton=1&hideideas=1&locale=en`;

const tvTechnical = (sym) =>
  `https://www.tradingview.com/embed-widget/technical-analysis/?symbol=${encodeURIComponent(sym)}&interval=1D&colorTheme=dark&isTransparent=true&locale=en`;

const tvNews = (sym) =>
  `https://www.tradingview.com/embed-widget/timeline/?feedMode=symbol&symbol=${encodeURIComponent(sym)}&colorTheme=dark&isTransparent=true&locale=en`;

const tvSymbolInfo = (sym) =>
  `https://www.tradingview.com/embed-widget/symbol-info/?symbol=${encodeURIComponent(sym)}&colorTheme=dark&isTransparent=true&locale=en`;

const tvFinancials = (sym) =>
  `https://www.tradingview.com/embed-widget/financials/?symbol=${encodeURIComponent(sym)}&colorTheme=dark&isTransparent=true&displayMode=regular&locale=en`;

// ── Live price hook ───────────────────────────────────────────────────────────
function useMarketData() {
  const [prices, setPrices] = useState({});
  const [status, setStatus] = useState("connecting");
  const [lastUpdate, setLU] = useState(null);
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
      const t = setTimeout(() => setFlash(null), 800);
      return () => clearTimeout(t);
    }
    prev.current = val;
  }, [val]);
  return flash;
}

// ── Ticker row ────────────────────────────────────────────────────────────────
function TickerRow({ ticker, price, selected, onClick, onRemove }) {
  const flash = useFlash(price?.price);
  const chg   = price?.change_pct ?? 0;
  const up    = chg >= 0;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "9px 12px", cursor: "pointer",
        borderBottom: "1px solid #161b22",
        borderLeft: selected ? "2px solid #58a6ff" : "2px solid transparent",
        background: selected ? "#161b22"
          : flash === "up" ? "#0d2a1a"
          : flash === "dn" ? "#2a0d0d"
          : hovered ? "#0d1117"
          : "transparent",
        transition: "background 0.4s",
        position: "relative",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: "#e6edf3" }}>
              {ticker.symbol}
            </span>
            <span style={{
              fontSize: 8, padding: "1px 4px", borderRadius: 3,
              background: ticker.type === "ETF" ? "#1f6feb20" : "#3fb95020",
              color: ticker.type === "ETF" ? "#58a6ff" : "#3fb950",
              fontFamily: "'IBM Plex Mono',monospace",
            }}>{ticker.type}</span>
          </div>
          <div style={{ fontSize: 9, color: "#6e7681", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 }}>
            {ticker.name}
          </div>
        </div>

        <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 6 }}>
          <div>
            {price ? (
              <>
                <div style={{
                  fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700,
                  color: flash === "up" ? "#3fb950" : flash === "dn" ? "#f85149" : "#e6edf3",
                  transition: "color 0.4s",
                }}>${price.price?.toFixed(2)}</div>
                <div style={{
                  fontFamily: "'IBM Plex Mono',monospace", fontSize: 9,
                  color: up ? "#3fb950" : "#f85149",
                }}>{up ? "▲" : "▼"}{Math.abs(chg).toFixed(2)}%</div>
              </>
            ) : (
              <div style={{ width: 52, height: 26, background: "#1a1f2e", borderRadius: 4, animation: "shimmer 1.5s infinite" }} />
            )}
          </div>

          {/* Remove button */}
          {hovered && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(ticker.symbol); }}
              style={{
                width: 18, height: 18, borderRadius: "50%",
                background: "#f85149", border: "none",
                color: "#fff", fontSize: 10, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
              title="Remove from watchlist"
            >×</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Stock Modal ───────────────────────────────────────────────────────────
function AddStockModal({ watchlist, onAdd, onClose }) {
  const [search, setSearch] = useState("");
  const [custom, setCustom] = useState("");

  const available = ALL_TICKERS.filter(t =>
    !watchlist.includes(t.symbol) &&
    (t.symbol.includes(search.toUpperCase()) || t.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "#161b22", border: "1px solid #30363d",
        borderRadius: 14, padding: 24, width: 420, maxHeight: "80vh",
        display: "flex", flexDirection: "column", gap: 16,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 700, color: "#e6edf3" }}>
            Add to Watchlist
          </span>
          <button onClick={onClose} style={{
            background: "#21262d", border: "none", borderRadius: "50%",
            width: 28, height: 28, color: "#8b949e", fontSize: 16, cursor: "pointer",
          }}>×</button>
        </div>

        {/* Search */}
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search symbol or name..."
          style={{
            background: "#0d1117", border: "1px solid #30363d",
            borderRadius: 8, padding: "8px 12px", color: "#e6edf3",
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, outline: "none",
            width: "100%",
          }}
        />

        {/* Available list */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {available.length === 0 && search && (
            <div style={{ color: "#6e7681", fontSize: 12, padding: 8, fontFamily: "'IBM Plex Mono',monospace" }}>
              No matches. Add custom symbol below.
            </div>
          )}
          {available.map(t => (
            <div key={t.symbol} onClick={() => { onAdd(t.symbol); }}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                background: "#0d1117", border: "1px solid #21262d",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#58a6ff"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#21262d"}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: "#e6edf3" }}>{t.symbol}</span>
                  <span style={{
                    fontSize: 8, padding: "1px 4px", borderRadius: 3,
                    background: t.type === "ETF" ? "#1f6feb20" : "#3fb95020",
                    color: t.type === "ETF" ? "#58a6ff" : "#3fb950",
                  }}>{t.type}</span>
                </div>
                <div style={{ fontSize: 10, color: "#6e7681" }}>{t.name} · {t.sector}</div>
              </div>
              <span style={{ fontSize: 18, color: "#58a6ff" }}>+</span>
            </div>
          ))}
        </div>

        {/* Custom symbol input */}
        <div style={{ borderTop: "1px solid #21262d", paddingTop: 12 }}>
          <div style={{ fontSize: 10, color: "#6e7681", marginBottom: 8, fontFamily: "'IBM Plex Mono',monospace" }}>
            ADD CUSTOM SYMBOL
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={custom}
              onChange={e => setCustom(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && custom && onAdd(custom)}
              placeholder="e.g. TSLA, COIN..."
              style={{
                flex: 1, background: "#0d1117", border: "1px solid #30363d",
                borderRadius: 8, padding: "7px 10px", color: "#e6edf3",
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, outline: "none",
              }}
            />
            <button onClick={() => custom && onAdd(custom)} style={{
              padding: "7px 16px", borderRadius: 8, background: "#1f6feb",
              border: "none", color: "#fff", fontFamily: "'IBM Plex Mono',monospace",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function LiveDashboard({ watchlist, setWatchlist, onNavigate, tabs, activeTab }) {
  const { prices, status, lastUpdate } = useMarketData();
  const [selected, setSelected]   = useState(watchlist[0] || "NVDA");
  const [activeTab2, setActiveTab2] = useState("chart");
  const [interval, setIntervalV]  = useState("D");
  const [chartStyle, setChartStyle] = useState("1");
  const [filter, setFilter]       = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  // Build ticker objects for watchlist
  const watchlistTickers = watchlist.map(sym => {
    const found = ALL_TICKERS.find(t => t.symbol === sym);
    return found || { symbol: sym, tv: `NASDAQ:${sym}`, name: sym, type: "STOCK", sector: "Custom" };
  });

  const filtered = watchlistTickers.filter(t => filter === "ALL" || t.type === filter);
  const ticker   = watchlistTickers.find(t => t.symbol === selected) || watchlistTickers[0];
  const price    = prices[selected];
  const chg      = price?.change_pct ?? 0;
  const up       = chg >= 0;
  const adv      = watchlistTickers.filter(t => (prices[t.symbol]?.change_pct ?? 0) > 0).length;
  const dec      = watchlistTickers.filter(t => (prices[t.symbol]?.change_pct ?? 0) < 0).length;

  const addStock = (symbol) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist(prev => [...prev, symbol]);
      setSelected(symbol);
    }
    setShowAddModal(false);
  };

  const removeStock = (symbol) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
    if (selected === symbol) setSelected(watchlist.filter(s => s !== symbol)[0] || "MSFT");
  };

  return (
    <div style={{ height: "100vh", background: "#0d1117", color: "#e6edf3", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { 0%,100%{opacity:.3} 50%{opacity:.8} }
        @keyframes blink   { 0%,100%{opacity:1}  50%{opacity:.2} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#21262d; border-radius:2px; }
        button { cursor:pointer; border:none; background:none; font-family:inherit; color:inherit; }
        iframe { display:block; border:none; }
      `}</style>

      {/* ── Top nav bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", height: 44, flexShrink: 0,
        background: "#010409", borderBottom: "1px solid #21262d",
      }}>
        {/* Logo + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 700, color: "#e6edf3" }}>
            SIGNAL <span style={{ color: "#58a6ff" }}>//</span> BOARD
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

        {/* Centre nav tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {tabs?.map(t => (
            <button key={t.id} onClick={() => onNavigate(t.id)} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 7,
              background: t.id === activeTab ? "#1f6feb" : "#161b22",
              color: t.id === activeTab ? "#fff" : "#8b949e",
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: 11, fontWeight: t.id === activeTab ? 700 : 400,
              border: t.id === activeTab ? "1px solid #1f6feb" : "1px solid #21262d",
              transition: "all 0.15s",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Right: market stats */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {[["ADV", adv, "#3fb950"], ["DEC", dec, "#f85149"]].map(([l, v, c]) => (
            <div key={l} style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ fontSize: 9, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace" }}>{l}</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700, color: c }}>{v}</span>
            </div>
          ))}
          {lastUpdate && (
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#3a4258" }}>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left: watchlist */}
        <div style={{ width: 196, borderRight: "1px solid #21262d", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {/* Filter + Add button */}
          <div style={{ padding: "7px 10px", borderBottom: "1px solid #21262d", display: "flex", gap: 3, alignItems: "center" }}>
            {["ALL","STOCK","ETF"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: "3px 0", borderRadius: 5,
                background: filter === f ? "#1f6feb" : "#161b22",
                color: filter === f ? "#fff" : "#6e7681",
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700,
              }}>{f}</button>
            ))}
            <button onClick={() => setShowAddModal(true)} style={{
              width: 26, height: 26, borderRadius: 6,
              background: "#1f6feb20", border: "1px solid #1f6feb50",
              color: "#58a6ff", fontSize: 16, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }} title="Add stock">+</button>
          </div>

          {/* Ticker rows */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.map(t => (
              <TickerRow
                key={t.symbol} ticker={t} price={prices[t.symbol]}
                selected={selected === t.symbol}
                onClick={() => { setSelected(t.symbol); setActiveTab2("chart"); }}
                onRemove={removeStock}
              />
            ))}
          </div>

          {/* Watchlist count */}
          <div style={{
            padding: "6px 12px", borderTop: "1px solid #21262d",
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#3a4258",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>{watchlist.length} tracked</span>
            <button onClick={() => setShowAddModal(true)} style={{
              fontSize: 9, color: "#58a6ff", background: "none", border: "none", cursor: "pointer",
              fontFamily: "'IBM Plex Mono',monospace",
            }}>+ add</button>
          </div>
        </div>

        {/* Right: chart area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Symbol header */}
          <div style={{
            padding: "8px 16px", borderBottom: "1px solid #21262d",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0, background: "#0d1117",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 700, color: "#e6edf3" }}>
                {ticker?.symbol}
              </span>
              <span style={{ fontSize: 11, color: "#8b949e" }}>{ticker?.name}</span>
              <span style={{
                fontSize: 9, padding: "2px 6px", borderRadius: 4,
                background: "#1f6feb15", color: "#58a6ff",
                fontFamily: "'IBM Plex Mono',monospace",
              }}>{ticker?.sector}</span>

              {price && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginLeft: 8 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 26, fontWeight: 700, color: "#e6edf3" }}>
                    ${price.price?.toFixed(2)}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: up ? "#3fb950" : "#f85149" }}>
                    {up ? "+" : ""}{(price.price - price.prev_close)?.toFixed(2)} ({up ? "+" : ""}{chg?.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>

            {/* Chart controls */}
            {activeTab2 === "chart" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 2, background: "#161b22", borderRadius: 7, padding: 3 }}>
                  {[["1","1m"],["5","5m"],["15","15m"],["60","1H"],["D","1D"],["W","1W"],["M","1M"]].map(([val, label]) => (
                    <button key={val} onClick={() => setIntervalV(val)} style={{
                      padding: "3px 8px", borderRadius: 5,
                      background: interval === val ? "#21262d" : "transparent",
                      color: interval === val ? "#e6edf3" : "#6e7681",
                      fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 600,
                    }}>{label}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 2, background: "#161b22", borderRadius: 7, padding: 3 }}>
                  {[["1","🕯️"],["3","📈"],["8","📊"]].map(([val, icon]) => (
                    <button key={val} onClick={() => setChartStyle(val)} style={{
                      padding: "3px 8px", borderRadius: 5, fontSize: 12,
                      background: chartStyle === val ? "#21262d" : "transparent",
                    }}>{icon}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inner tab bar */}
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
              <button key={tab.id} onClick={() => setActiveTab2(tab.id)} style={{
                padding: "8px 16px", fontSize: 12,
                fontFamily: "'IBM Plex Sans',sans-serif",
                color: activeTab2 === tab.id ? "#58a6ff" : "#6e7681",
                borderBottom: activeTab2 === tab.id ? "2px solid #58a6ff" : "2px solid transparent",
                fontWeight: activeTab2 === tab.id ? 600 : 400,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}

            {/* Quick stats */}
            {price && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 14, padding: "0 16px", alignItems: "center" }}>
                {[["O",`$${price.open?.toFixed(2)}`],["H",`$${price.high?.toFixed(2)}`],["L",`$${price.low?.toFixed(2)}`],["Vol",price.volume?(price.volume/1e6).toFixed(1)+"M":"—"],["Prev",`$${price.prev_close?.toFixed(2)}`]].map(([l,v]) => (
                  <div key={l} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace" }}>{l}</span>
                    <span style={{ fontSize: 11, color: "#e6edf3", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Widget area */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {/* Chart */}
            <div style={{ display: activeTab2 === "chart" ? "block" : "none", height: "100%" }}>
              <iframe key={`chart-${ticker?.tv}-${interval}-${chartStyle}`}
                src={tvChart(ticker?.tv || "NASDAQ:NVDA", interval, chartStyle)}
                width="100%" height="100%" />
            </div>

            {/* Technical */}
            <div style={{ display: activeTab2 === "technical" ? "block" : "none", height: "100%" }}>
              <iframe key={`tech-${ticker?.tv}`}
                src={tvTechnical(ticker?.tv || "NASDAQ:NVDA")}
                width="100%" height="100%" />
            </div>

            {/* News */}
            <div style={{ display: activeTab2 === "news" ? "block" : "none", height: "100%" }}>
              <iframe key={`news-${ticker?.tv}`}
                src={tvNews(ticker?.tv || "NASDAQ:NVDA")}
                width="100%" height="100%" />
            </div>

            {/* Financials */}
            <div style={{ display: activeTab2 === "info" ? "flex" : "none", flexDirection: "column", height: "100%", overflowY: "auto" }}>
              <iframe key={`sinfo-${ticker?.tv}`} src={tvSymbolInfo(ticker?.tv || "NASDAQ:NVDA")} width="100%" height="160" style={{ flexShrink: 0 }} />
              <iframe key={`fin-${ticker?.tv}`} src={tvFinancials(ticker?.tv || "NASDAQ:NVDA")} width="100%" height="500" style={{ flexShrink: 0 }} />
              {price && (
                <div style={{ padding: 16 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#6e7681", marginBottom: 10, letterSpacing: 1 }}>
                    LIVE — ALPACA
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                    {[["Price",`$${price.price?.toFixed(2)}`],["Change",`${chg>=0?"+":""}${chg?.toFixed(2)}%`],["Open",`$${price.open?.toFixed(2)}`],["Prev",`$${price.prev_close?.toFixed(2)}`],["High",`$${price.high?.toFixed(2)}`],["Low",`$${price.low?.toFixed(2)}`],["Volume",price.volume?`${(price.volume/1e6).toFixed(2)}M`:"—"]].map(([l,v]) => (
                      <div key={l} style={{ background: "#161b22", borderRadius: 8, padding: "8px 10px", border: "1px solid #21262d" }}>
                        <div style={{ fontSize: 8, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace", marginBottom: 3, letterSpacing: 1 }}>{l.toUpperCase()}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700, color: "#e6edf3" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <AddStockModal
          watchlist={watchlist}
          onAdd={addStock}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
