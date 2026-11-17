// TradingView chart with range buttons and a link to the full terminal.
import { useState } from "react";
import { tvChart } from "../../lib/tradingview";
import { go } from "../../lib/router";

// Range label → TradingView interval
const RANGES = [["1D", "5"], ["1W", "60"], ["1M", "D"], ["1Y", "W"], ["5Y", "M"]];
const AREA_STYLE = "3";

export default function StockChart({ symbol }) {
  const [interval, setChartInterval] = useState("D");
  return (
    <>
      <div className="sb-chart">
        <iframe key={`${symbol}-${interval}`} title={`${symbol} chart`} src={tvChart(symbol, interval, AREA_STYLE)} />
      </div>
      <div className="sb-ranges">
        {RANGES.map(([label, iv]) => (
          <button key={label} className={interval === iv ? "on" : ""} onClick={() => setChartInterval(iv)}>{label}</button>
        ))}
        <button style={{ marginLeft: "auto", color: "var(--sb-muted)" }} onClick={() => go("terminal")}>Full terminal ›</button>
      </div>
    </>
  );
}
