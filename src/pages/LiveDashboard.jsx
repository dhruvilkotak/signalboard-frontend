import { useState, useEffect, useRef, useCallback } from "react";

// ── All available tickers ─────────────────────────────────────────────────────
const ALL_TICKERS = [
  { symbol: "SPY",   tv: "AMEX:SPY",       name: "S&P 500 ETF",       type: "ETF",   sector: "Index" },
  { symbol: "VOO",   tv: "AMEX:VOO",       name: "Vanguard S&P 500",  type: "ETF",   sector: "Index" },
  { symbol: "QQQ",   tv: "NASDAQ:QQQ",     name: "Nasdaq 100 ETF",    type: "ETF",   sector: "Index" },
  { symbol: "IWM",   tv: "AMEX:IWM",       name: "Russell 2000",      type: "ETF",   sector: "Index" },
  { symbol: "JEPI",  tv: "AMEX:JEPI",      name: "JPMorgan Income",   type: "ETF",   sector: "Income" },
  { symbol: "JEPQ",  tv: "NASDAQ:JEPQ",    name: "JPMorgan Nasdaq",   type: "ETF",   sector: "Income" },
  { symbol: "SCHD",  tv: "AMEX:SCHD",      name: "Schwab Dividend",   type: "ETF",   sector: "Dividend" },
  { symbol: "SGOV",  tv: "AMEX:SGOV",      name: "T-Bills ETF",       type: "ETF",   sector: "Cash" },
  { symbol: "MSFT",  tv: "NASDAQ:MSFT",    name: "Microsoft",         type: "STOCK", sector: "Tech" },
  { symbol: "AAPL",  tv: "NASDAQ:AAPL",    name: "Apple",             type: "STOCK", sector: "Tech" },
  { symbol: "NVDA",  tv: "NASDAQ:NVDA",    name: "Nvidia",            type: "STOCK", sector: "AI" },
  { symbol: "GOOGL", tv: "NASDAQ:GOOGL",   name: "Alphabet",          type: "STOCK", sector: "Tech" },
  { symbol: "AMZN",  tv: "NASDAQ:AMZN",    name: "Amazon",            type: "STOCK", sector: "Tech" },
  { symbol: "META",  tv: "NASDAQ:META",    name: "Meta Platforms",    type: "STOCK", sector: "Tech" },
  { symbol: "TSLA",  tv: "NASDAQ:TSLA",    name: "Tesla",             type: "STOCK", sector: "EV" },
  { symbol: "HOOD",  tv: "NASDAQ:HOOD",    name: "Robinhood",         type: "STOCK", sector: "Fintech" },
  { symbol: "AMD",   tv: "NASDAQ:AMD",     name: "AMD",               type: "STOCK", sector: "AI" },
  { symbol: "INTC",  tv: "NASDAQ:INTC",    name: "Intel",             type: "STOCK", sector: "Tech" },
  { symbol: "PLTR",  tv: "NYSE:PLTR",      name: "Palantir",          type: "STOCK", sector: "AI" },
  { symbol: "COIN",  tv: "NASDAQ:COIN",    name: "Coinbase",          type: "STOCK", sector: "Crypto" },
  { symbol: "SOFI",  tv: "NASDAQ:SOFI",    name: "SoFi Technologies", type: "STOCK", sector: "Fintech" },
  { symbol: "NFLX",  tv: "NASDAQ:NFLX",   name: "Netflix",           type: "STOCK", sector: "Media" },
  { symbol: "DIS",   tv: "NYSE:DIS",       name: "Disney",            type: "STOCK", sector: "Media" },
  { symbol: "JPM",   tv: "NYSE:JPM",       name: "JPMorgan Chase",    type: "STOCK", sector: "Finance" },
  { symbol: "BAC",   tv: "NYSE:BAC",       name: "Bank of America",   type: "STOCK", sector: "Finance" },
  { symbol: "BRK.B", tv: "NYSE:BRK.B",    name: "Berkshire Hathaway",type: "STOCK", sector: "Finance" },
  { symbol: "V",     tv: "NYSE:V",         name: "Visa",              type: "STOCK", sector: "Finance" },
  { symbol: "UNH",   tv: "NYSE:UNH",       name: "UnitedHealth",      type: "STOCK", sector: "Health" },
  { symbol: "JNJ",   tv: "NYSE:JNJ",       name: "Johnson & Johnson",  type: "STOCK", sector: "Health" },
  { symbol: "XOM",   tv: "NYSE:XOM",       name: "ExxonMobil",        type: "STOCK", sector: "Energy" },
];

// ── Price fetcher via your GCP backend (proxies Yahoo Finance, no CORS) ───────
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchBatchPrices(symbols) {
  try {
    const joined = symbols.join(",");
    const res = await fetch(`${API}/api/quote/batch/${joined}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();  // { AAPL: {...}, MSFT: {...}, ... }
  } catch (e) {
    console.error("Batch price fetch failed:", e.message);
    return {};
  }
}

async function fetchYahooPrice(symbol) {
  try {
    const res = await fetch(`${API}/api/quote/${symbol}`);
    if (!res.ok) return null;
    const data = await res.json();
    // Add computed ext_change
    if (data.ext_price && data.price) {
      data.ext_change = round(((data.ext_price - data.price) / data.price) * 100);
    }
    return data;
  } catch (e) {
    console.error(`Price fetch failed for ${symbol}:`, e.message);
    return null;
  }
}

function round(n, d = 2) {
  return n ? Math.round(n * Math.pow(10, d)) / Math.pow(10, d) : 0;
}

// ── TradingView iframe URLs ───────────────────────────────────────────────────
const tvChart = (sym, interval = "D", style = "1") =>
  `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(sym)}&interval=${interval}&symboledit=1&saveimage=1&toolbarbg=0d1117&studies=RSI%40tv-basicstudies%1FMACD%40tv-basicstudies%1FVolume%40tv-basicstudies&theme=dark&style=${style}&timezone=America%2FNew_York&withdateranges=1&showpopupbutton=1&hideideas=1&locale=en`;

const tvTechnical = (sym) =>
  `https://www.tradingview.com/embed-widget/technical-analysis/?symbol=${encodeURIComponent(sym)}&interval=1D&colorTheme=dark&isTransparent=true&locale=en&showIntervalTabs=true`;

const tvNews = (sym) =>
  `https://www.tradingview.com/embed-widget/timeline/?feedMode=symbol&symbol=${encodeURIComponent(sym)}&colorTheme=dark&isTransparent=true&locale=en`;

const tvSymbolInfo = (sym) =>
  `https://www.tradingview.com/embed-widget/symbol-info/?symbol=${encodeURIComponent(sym)}&colorTheme=dark&isTransparent=true&locale=en`;

const tvFinancials = (sym) =>
  `https://www.tradingview.com/embed-widget/financials/?symbol=${encodeURIComponent(sym)}&colorTheme=dark&isTransparent=true&displayMode=regular&locale=en`;

// ── Yahoo Finance price hook (via backend proxy) ──────────────────────────────
function useYahooPrices(watchlist) {
  const [prices, setPrices]   = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLU]   = useState(null);
  const [status, setStatus]   = useState("loading");

  const fetchAll = useCallback(async () => {
    try {
      // Use batch endpoint — one request for all tickers
      const data = await fetchBatchPrices(watchlist);
      if (Object.keys(data).length > 0) {
        // Add ext_change for each
        Object.values(data).forEach(p => {
          if (p.ext_price && p.price) {
            p.ext_change = round(((p.ext_price - p.price) / p.price) * 100);
          }
        });
        setPrices(prev => ({ ...prev, ...data }));
        setLastUpdate(new Date());
        setStatus("live");
        setLoading(false);
      }
    } catch (e) {
      setStatus("error");
      setLoading(false);
    }
  }, [watchlist.join(",")]);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 60000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  return { prices, loading, lastUpdate, status, refresh: fetchAll };
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

// ── Market state badge ────────────────────────────────────────────────────────
function MarketBadge({ state }) {
  const cfg = {
    PRE:     { label: "Pre-Market",  color: "#e3b341", bg: "#e3b34120" },
    REGULAR: { label: "Market Open", color: "#3fb950", bg: "#3fb95020" },
    POST:    { label: "After Hours", color: "#58a6ff", bg: "#58a6ff20" },
    CLOSED:  { label: "Closed",      color: "#6e7681", bg: "#6e768120" },
  }[state] || { label: state, color: "#6e7681", bg: "#6e768120" };

  return (
    <span style={{
      fontSize: 9, padding: "2px 7px", borderRadius: 4,
      background: cfg.bg, color: cfg.color,
      fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, letterSpacing: 0.5,
    }}>{cfg.label}</span>
  );
}

// ── Ticker row ────────────────────────────────────────────────────────────────
function TickerRow({ ticker, price, selected, onClick, onRemove }) {
  const flash   = useFlash(price?.price);
  const chg     = price?.change_pct ?? 0;
  const up      = chg >= 0;
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: "#e6edf3" }}>
              {ticker.symbol}
            </span>
            <span style={{
              fontSize: 8, padding: "1px 4px", borderRadius: 3,
              background: ticker.type === "ETF" ? "#1f6feb20" : "#3fb95020",
              color: ticker.type === "ETF" ? "#58a6ff" : "#3fb950",
            }}>{ticker.type}</span>
          </div>
          <div style={{ fontSize: 9, color: "#6e7681", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>
            {ticker.name}
          </div>
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
            <button onClick={(e) => { e.stopPropagation(); onRemove(ticker.symbol); }} style={{
              width: 18, height: 18, borderRadius: "50%",
              background: "#f85149", border: "none",
              color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>×</button>
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
    (t.symbol.includes(search.toUpperCase()) ||
     t.name.toLowerCase().includes(search.toLowerCase()) ||
     t.sector.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000099",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "#161b22", border: "1px solid #30363d",
        borderRadius: 14, padding: 24, width: 440,
        maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 14,
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 700, color: "#e6edf3" }}>
            Add to Watchlist
          </span>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#21262d", color: "#8b949e", fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        <input
          autoFocus value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search symbol, name, or sector..."
          style={{
            background: "#0d1117", border: "1px solid #30363d",
            borderRadius: 8, padding: "8px 12px", color: "#e6edf3",
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 12,
            outline: "none", width: "100%",
          }}
        />

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Sector groups */}
          {[...new Set(available.map(t => t.sector))].map(sector => (
            <div key={sector}>
              <div style={{ fontSize: 9, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace", letterSpacing: 1, marginBottom: 4, marginTop: 8 }}>
                {sector.toUpperCase()}
              </div>
              {available.filter(t => t.sector === sector).map(t => (
                <div key={t.symbol} onClick={() => onAdd(t.symbol)} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "7px 10px", borderRadius: 7, cursor: "pointer",
                  background: "#0d1117", border: "1px solid #21262d",
                  marginBottom: 3, transition: "border-color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#58a6ff"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#21262d"}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: "#e6edf3" }}>{t.symbol}</span>
                      <span style={{
                        fontSize: 8, padding: "1px 4px", borderRadius: 3,
                        background: t.type === "ETF" ? "#1f6feb20" : "#3fb95020",
                        color: t.type === "ETF" ? "#58a6ff" : "#3fb950",
                      }}>{t.type}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#6e7681" }}>{t.name}</div>
                  </div>
                  <span style={{ fontSize: 18, color: "#58a6ff" }}>+</span>
                </div>
              ))}
            </div>
          ))}
          {available.length === 0 && search && (
            <div style={{ color: "#6e7681", fontSize: 12, padding: 8, fontFamily: "'IBM Plex Mono',monospace" }}>
              No matches. Try adding a custom symbol below.
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #21262d", paddingTop: 12 }}>
          <div style={{ fontSize: 9, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace", letterSpacing: 1, marginBottom: 6 }}>
            CUSTOM SYMBOL
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={custom} onChange={e => setCustom(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && custom && onAdd(custom)}
              placeholder="e.g. TSLA, BTC-USD, EURUSD=X"
              style={{
                flex: 1, background: "#0d1117", border: "1px solid #30363d",
                borderRadius: 8, padding: "7px 10px", color: "#e6edf3",
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, outline: "none",
              }} />
            <button onClick={() => custom && onAdd(custom)} style={{
              padding: "7px 16px", borderRadius: 8, background: "#1f6feb",
              border: "none", color: "#fff", fontFamily: "'IBM Plex Mono',monospace",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>Add</button>
          </div>
          <div style={{ fontSize: 9, color: "#3a4258", marginTop: 6, fontFamily: "'IBM Plex Mono',monospace" }}>
            Yahoo Finance symbols: BTC-USD, ETH-USD, GC=F (Gold), CL=F (Oil), EURUSD=X
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function LiveDashboard({ watchlist, setWatchlist, onNavigate, tabs, activeTab }) {
  const { prices, loading, lastUpdate, status, refresh } = useYahooPrices(watchlist);
  const [selected, setSelected]     = useState(watchlist[6] || watchlist[0] || "MSFT");
  const [activeTab2, setActiveTab2] = useState("chart");
  const [interval, setIntervalV]    = useState("D");
  const [chartStyle, setChartStyle] = useState("1");
  const [filter, setFilter]         = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

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

  // Format market cap
  const fmtCap = (n) => {
    if (!n) return "—";
    if (n >= 1e12) return `$${(n/1e12).toFixed(2)}T`;
    if (n >= 1e9)  return `$${(n/1e9).toFixed(1)}B`;
    if (n >= 1e6)  return `$${(n/1e6).toFixed(1)}M`;
    return `$${n}`;
  };

  const addStock = (symbol) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist(prev => [...prev, symbol]);
      setSelected(symbol);
    }
    setShowAddModal(false);
  };

  const removeStock = (symbol) => {
    const next = watchlist.filter(s => s !== symbol);
    setWatchlist(next);
    if (selected === symbol) setSelected(next[0] || "MSFT");
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

      {/* ── Top nav ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", height: 44, flexShrink: 0,
        background: "#010409", borderBottom: "1px solid #21262d",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 700, color: "#e6edf3" }}>
            SIGNAL <span style={{ color: "#58a6ff" }}>//</span> BOARD
          </span>
          {/* Data source badge */}
          <span style={{
            fontSize: 9, padding: "2px 7px", borderRadius: 4,
            background: "#3fb95015", color: "#3fb950",
            fontFamily: "'IBM Plex Mono',monospace", letterSpacing: 0.5,
          }}>YF + TradingView</span>
          {/* Live dot */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: status === "live" ? "#3fb950" : "#e3b341",
              boxShadow: status === "live" ? "0 0 6px #3fb950" : "none",
              animation: status === "live" ? "blink 3s infinite" : "none",
            }} />
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#6e7681" }}>
              {loading ? "LOADING..." : status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ display: "flex", gap: 3 }}>
          {tabs?.map(t => (
            <button key={t.id} onClick={() => onNavigate(t.id)} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 7,
              background: t.id === activeTab ? "#1f6feb" : "#161b22",
              color: t.id === activeTab ? "#fff" : "#8b949e",
              fontFamily: "'IBM Plex Mono',monospace", fontSize: 11,
              fontWeight: t.id === activeTab ? 700 : 400,
              border: t.id === activeTab ? "1px solid #1f6feb" : "1px solid #21262d",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Right stats */}
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {[["ADV", adv, "#3fb950"], ["DEC", dec, "#f85149"]].map(([l, v, c]) => (
            <div key={l} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 9, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace" }}>{l}</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700, color: c }}>{v}</span>
            </div>
          ))}
          <button onClick={refresh} style={{
            fontSize: 10, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace",
            background: "#161b22", border: "1px solid #21262d",
            padding: "3px 8px", borderRadius: 5, cursor: "pointer",
          }}>↻</button>
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
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #21262d", display: "flex", gap: 3, alignItems: "center" }}>
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
              color: "#58a6ff", fontSize: 18, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }} title="Add stock">+</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.map(t => (
              <TickerRow key={t.symbol} ticker={t} price={prices[t.symbol]}
                selected={selected === t.symbol}
                onClick={() => { setSelected(t.symbol); setActiveTab2("chart"); }}
                onRemove={removeStock}
              />
            ))}
          </div>

          <div style={{
            padding: "5px 10px", borderTop: "1px solid #21262d",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#3a4258" }}>
              {watchlist.length} tracked · Yahoo Finance
            </span>
            <button onClick={() => setShowAddModal(true)} style={{
              fontSize: 9, color: "#58a6ff", fontFamily: "'IBM Plex Mono',monospace",
            }}>+ add</button>
          </div>
        </div>

        {/* Right: detail */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Symbol header */}
          <div style={{
            padding: "8px 16px", borderBottom: "1px solid #21262d",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0, background: "#0d1117", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 700, color: "#e6edf3" }}>
                {ticker?.symbol}
              </span>
              <span style={{ fontSize: 11, color: "#8b949e" }}>{ticker?.name}</span>
              <span style={{
                fontSize: 9, padding: "2px 6px", borderRadius: 4,
                background: "#1f6feb15", color: "#58a6ff",
                fontFamily: "'IBM Plex Mono',monospace",
              }}>{ticker?.sector}</span>

              {price?.market_state && <MarketBadge state={price.market_state} />}

              {price && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 26, fontWeight: 700, color: "#e6edf3" }}>
                    ${price.price?.toFixed(2)}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: up ? "#3fb950" : "#f85149" }}>
                    {up ? "+" : ""}{price.change_amt?.toFixed(2)} ({up ? "+" : ""}{chg?.toFixed(2)}%)
                  </span>
                </div>
              )}

              {/* Extended hours */}
              {price?.ext_price && price.market_state !== "REGULAR" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "#6e7681" }}>Ext:</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, color: "#58a6ff" }}>
                    ${price.ext_price?.toFixed(2)}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: price.ext_change >= 0 ? "#3fb950" : "#f85149" }}>
                    {price.ext_change >= 0 ? "+" : ""}{price.ext_change?.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>

            {/* Chart controls */}
            {activeTab2 === "chart" && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 2, background: "#161b22", borderRadius: 7, padding: 3 }}>
                  {[["1","1m"],["5","5m"],["15","15m"],["60","1H"],["D","1D"],["W","1W"],["M","1M"]].map(([val, label]) => (
                    <button key={val} onClick={() => setIntervalV(val)} style={{
                      padding: "3px 7px", borderRadius: 5,
                      background: interval === val ? "#21262d" : "transparent",
                      color: interval === val ? "#e6edf3" : "#6e7681",
                      fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 600,
                    }}>{label}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 2, background: "#161b22", borderRadius: 7, padding: 3 }}>
                  {[["1","🕯️"],["3","📈"],["8","📊"]].map(([val, icon]) => (
                    <button key={val} onClick={() => setChartStyle(val)} style={{
                      padding: "3px 7px", borderRadius: 5, fontSize: 12,
                      background: chartStyle === val ? "#21262d" : "transparent",
                    }}>{icon}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inner tabs + quick stats */}
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
                padding: "8px 14px", fontSize: 12,
                fontFamily: "'IBM Plex Sans',sans-serif",
                color: activeTab2 === tab.id ? "#58a6ff" : "#6e7681",
                borderBottom: activeTab2 === tab.id ? "2px solid #58a6ff" : "2px solid transparent",
                fontWeight: activeTab2 === tab.id ? 600 : 400,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}

            {price && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 12, padding: "0 14px", alignItems: "center", flexWrap: "nowrap" }}>
                {[
                  ["O",    `$${price.open?.toFixed(2)}`],
                  ["H",    `$${price.high?.toFixed(2)}`],
                  ["L",    `$${price.low?.toFixed(2)}`],
                  ["Vol",  price.volume ? `${(price.volume/1e6).toFixed(1)}M` : "—"],
                  ["Prev", `$${price.prev_close?.toFixed(2)}`],
                  ["Cap",  fmtCap(price.mkt_cap)],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", gap: 3, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace" }}>{l}</span>
                    <span style={{ fontSize: 10, color: "#e6edf3", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Widget area */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ display: activeTab2 === "chart" ? "block" : "none", height: "100%" }}>
              <iframe key={`chart-${ticker?.tv}-${interval}-${chartStyle}`}
                src={tvChart(ticker?.tv || "NASDAQ:MSFT", interval, chartStyle)}
                width="100%" height="100%" />
            </div>
            <div style={{ display: activeTab2 === "technical" ? "block" : "none", height: "100%" }}>
              <iframe key={`tech-${ticker?.tv}`}
                src={tvTechnical(ticker?.tv || "NASDAQ:MSFT")}
                width="100%" height="100%" />
            </div>
            <div style={{ display: activeTab2 === "news" ? "block" : "none", height: "100%" }}>
              <iframe key={`news-${ticker?.tv}`}
                src={tvNews(ticker?.tv || "NASDAQ:MSFT")}
                width="100%" height="100%" />
            </div>
            <div style={{ display: activeTab2 === "info" ? "flex" : "none", flexDirection: "column", height: "100%", overflowY: "auto" }}>
              <iframe key={`sinfo-${ticker?.tv}`} src={tvSymbolInfo(ticker?.tv || "NASDAQ:MSFT")} width="100%" height="160" style={{ flexShrink: 0 }} />
              <iframe key={`fin-${ticker?.tv}`} src={tvFinancials(ticker?.tv || "NASDAQ:MSFT")} width="100%" height="480" style={{ flexShrink: 0 }} />
              {price && (
                <div style={{ padding: 16 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#6e7681", marginBottom: 10, letterSpacing: 1 }}>
                    LIVE DATA — YAHOO FINANCE
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                    {[
                      ["Price",     `$${price.price?.toFixed(2)}`],
                      ["Change",    `${chg>=0?"+":""}${chg?.toFixed(2)}%`],
                      ["Open",      `$${price.open?.toFixed(2)}`],
                      ["Prev Close",`$${price.prev_close?.toFixed(2)}`],
                      ["High",      `$${price.high?.toFixed(2)}`],
                      ["Low",       `$${price.low?.toFixed(2)}`],
                      ["Volume",    price.volume ? `${(price.volume/1e6).toFixed(2)}M` : "—"],
                      ["Market Cap",fmtCap(price.mkt_cap)],
                    ].map(([l, v]) => (
                      <div key={l} style={{ background: "#161b22", borderRadius: 8, padding: "8px 10px", border: "1px solid #21262d" }}>
                        <div style={{ fontSize: 8, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace", marginBottom: 3, letterSpacing: 1 }}>{l.toUpperCase()}</div>
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

      {showAddModal && (
        <AddStockModal watchlist={watchlist} onAdd={addStock} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
