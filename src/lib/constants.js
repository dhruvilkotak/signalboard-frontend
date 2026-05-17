// src/lib/constants.js — single source of truth for frontend config

export const TICKERS = [
  { symbol: "SPY",  name: "S&P 500 ETF",        type: "ETF" },
  { symbol: "VOO",  name: "Vanguard S&P 500",    type: "ETF" },
  { symbol: "JEPI", name: "JPMorgan Income ETF", type: "ETF" },
  { symbol: "JEPQ", name: "JPMorgan Nasdaq ETF", type: "ETF" },
  { symbol: "SCHD", name: "Schwab Dividend ETF", type: "ETF" },
  { symbol: "SGOV", name: "T-Bills ETF",         type: "ETF" },
  { symbol: "MSFT", name: "Microsoft",           type: "STOCK" },
  { symbol: "AAPL", name: "Apple",               type: "STOCK" },
  { symbol: "NVDA", name: "Nvidia",              type: "STOCK" },
  { symbol: "GOOGL", name: "Alphabet",           type: "STOCK" },
  { symbol: "AMZN", name: "Amazon",              type: "STOCK" },
  { symbol: "META", name: "Meta Platforms",      type: "STOCK" },
  { symbol: "HOOD", name: "Robinhood",           type: "STOCK" },
]

export const TICKER_SYMBOLS = TICKERS.map(t => t.symbol)

export const SIGNAL_COLORS = {
  BUY:  { color: "var(--signal-buy)",  bg: "#0fffa315", border: "#0fffa350" },
  HOLD: { color: "var(--signal-hold)", bg: "#ffd60015", border: "#ffd60050" },
  SELL: { color: "var(--signal-sell)", bg: "#ff416215", border: "#ff416250" },
}

export const PAPER_BUDGET = 100
export const PAPER_TARGET = 200
