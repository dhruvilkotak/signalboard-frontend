// src/pages/StockPage.jsx — v2 stock page: composes the stock sections in components/stock.
// Phone: trade panel inline + pinned Buy/Sell bar. Desktop: trade panel in the right column.
import { useRef } from "react";
import StockHeader from "../components/stock/StockHeader";
import StockChart from "../components/stock/StockChart";
import SignalSection from "../components/stock/SignalSection";
import StockStats from "../components/stock/StockStats";
import TradePanel from "../components/stock/TradePanel";
import NewsSection from "../components/stock/NewsSection";
import SectionHeader from "../components/ui/SectionHeader";
import WatchButton from "../components/ui/WatchButton";
import { useQuotes } from "../hooks/useQuotes";
import { useSignalMap } from "../hooks/useSignalMap";
import { useAccess } from "../hooks/useAccess";
import { useMediaQuery } from "../hooks/useIsMobile";
import { goBack } from "../lib/router";

export default function StockPage({ symbol, watchlist, onAdd, onRemove, isAdmin, onUnlock }) {
  const sym = (symbol || "").toUpperCase();
  const isDesktop = useMediaQuery("(min-width: 900px)");
  const { hasFeature } = useAccess();
  const canSignals = hasFeature("ai_signals");
  const { quotes } = useQuotes([sym]);
  const { bySymbol } = useSignalMap(canSignals);
  const tradeRef = useRef(null);

  const quote = quotes[sym];
  const watching = watchlist.includes(sym);
  const toggleWatch = () => (watching ? onRemove(sym) : onAdd(sym));
  const trade = <TradePanel ref={tradeRef} symbol={sym} price={quote?.price} />;

  return (
    <div className="sb-page">
      {!isDesktop && (
        <div className="sb-back" style={{ paddingTop: 8 }}>
          <button className="sb-circle" onClick={goBack} aria-label="Back">‹</button>
          <WatchButton watching={watching} onToggle={toggleWatch} />
        </div>
      )}
      <div className="sb-grid">
        <main style={{ minWidth: 0 }}>
          <StockHeader symbol={sym} quote={quote}
            action={isDesktop && <WatchButton watching={watching} onToggle={toggleWatch} style={{ marginTop: 10 }} />} />
          <StockChart symbol={sym} />
          <SignalSection symbol={sym} signal={bySymbol[sym]} enabled={canSignals} price={quote?.price}
            isAdmin={isAdmin} onUnlock={() => onUnlock("ai_signals")} />
          {!isDesktop && <><SectionHeader title="Your position" />{trade}</>}
          <StockStats quote={quote} />
          <NewsSection symbol={sym} />
        </main>
        {isDesktop && <aside className="sb-side">{trade}</aside>}
      </div>
      {!isDesktop && (
        <div className="sb-tradebar">
          <button className="sb-btn" onClick={() => tradeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Buy / Sell
          </button>
        </div>
      )}
    </div>
  );
}
