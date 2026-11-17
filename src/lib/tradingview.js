// src/lib/tradingview.js — TradingView embed URLs (shared by LiveDashboard + StockPage)

// TradingView symbol map
export const TV_MAP = {
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
export const getTVSymbol = (sym) => TV_MAP[sym] || `NASDAQ:${sym}`;

export const tvChart     = (sym, iv="D", st="1") => `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(getTVSymbol(sym))}&interval=${iv}&symboledit=1&saveimage=1&toolbarbg=0d1117&studies=RSI%40tv-basicstudies%1FMACD%40tv-basicstudies%1FVolume%40tv-basicstudies&theme=dark&style=${st}&timezone=America%2FNew_York&withdateranges=1&showpopupbutton=1&hideideas=1&locale=en`;
export const tvTechnical = (sym) => `https://www.tradingview.com/embed-widget/technical-analysis/?symbol=${encodeURIComponent(getTVSymbol(sym))}&interval=1D&colorTheme=dark&isTransparent=true&locale=en&showIntervalTabs=true`;
export const tvNews      = (sym) => `https://www.tradingview.com/embed-widget/timeline/?feedMode=symbol&symbol=${encodeURIComponent(getTVSymbol(sym))}&colorTheme=dark&isTransparent=true&locale=en`;
export const tvSymInfo   = (sym) => `https://www.tradingview.com/embed-widget/symbol-info/?symbol=${encodeURIComponent(getTVSymbol(sym))}&colorTheme=dark&isTransparent=true&locale=en`;
export const tvFinancials= (sym) => `https://www.tradingview.com/embed-widget/financials/?symbol=${encodeURIComponent(getTVSymbol(sym))}&colorTheme=dark&isTransparent=true&displayMode=regular&locale=en`;
