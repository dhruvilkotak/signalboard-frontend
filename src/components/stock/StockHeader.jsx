// Ticker, name, price and today's change (+ market session when not regular hours).
import { money, pct } from "../../lib/format";

const SESSION = { PRE: "Pre-market", POST: "After hours" };

export default function StockHeader({ symbol, quote, action }) {
  const up = (quote?.change_pct ?? 0) >= 0;
  const session = quote?.market_state && quote.market_state !== "REGULAR"
    ? SESSION[quote.market_state] || "Market closed" : null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <div>
        <div className="sb-tick">{symbol}{quote?.name ? ` · ${quote.name}` : ""}</div>
        <div className="sb-big sb-num">{quote?.price != null ? money(quote.price) : "—"}</div>
        {quote?.change_pct != null && (
          <div className="sb-chg sb-num">
            <span className={up ? "sb-up" : "sb-down"}>
              {up ? "▲" : "▼"} {money(Math.abs(quote.change_amt ?? 0))} ({pct(quote.change_pct)})
            </span>
            <span className="l">Today</span>
            {session && <span className="l">· {session}</span>}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
