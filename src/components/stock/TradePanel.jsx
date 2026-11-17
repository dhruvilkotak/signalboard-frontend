// Your position + buy/sell for one symbol (existing PortfolioTab in the new frame).
import { forwardRef } from "react";
import PortfolioTab from "../PortfolioTab";

const TradePanel = forwardRef(function TradePanel({ symbol, price }, ref) {
  return (
    <div ref={ref} className="sb-embed">
      <PortfolioTab key={symbol} symbol={symbol} currentPrice={price} />
    </div>
  );
});

export default TradePanel;
