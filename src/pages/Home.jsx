// src/pages/Home.jsx — v2 home: composes the Home sections. Data comes from hooks;
// each section is its own small component in components/home.
import PortfolioHeader from "../components/home/PortfolioHeader";
import AllocationBar from "../components/home/AllocationBar";
import SummaryCards from "../components/home/SummaryCards";
import LatestSignals from "../components/home/LatestSignals";
import PositionsList from "../components/home/PositionsList";
import StrategiesList from "../components/home/StrategiesList";
import WatchlistPanel, { WatchlistSection } from "../components/home/WatchlistPanel";
import RowLink from "../components/ui/RowLink";
import { usePortfolio } from "../hooks/usePortfolio";
import { useQuotes } from "../hooks/useQuotes";
import { useSignalMap } from "../hooks/useSignalMap";
import { useAccess } from "../hooks/useAccess";
import { money } from "../lib/format";
import { dayChange } from "../lib/portfolio";
import { go } from "../lib/router";

export default function Home({ watchlist, onUnlock }) {
  const { access, hasFeature } = useAccess();
  const { overview, error } = usePortfolio();
  const positions = overview?.manual?.positions ?? [];
  const { quotes } = useQuotes([...new Set([...watchlist, ...positions.map(p => p.symbol)])]);
  const canSignals = hasFeature("ai_signals");
  const { list: signalList, bySymbol: signals } = useSignalMap(canSignals);
  const summary = overview?.summary;
  const loaded = !!overview;

  return (
    <div className="sb-page">
      <div className="sb-grid">
        <main style={{ minWidth: 0 }}>
          <PortfolioHeader summary={summary} todayChange={dayChange(positions, quotes)}
            showToday={positions.length > 0} error={error} />
          {summary && <AllocationBar summary={summary} />}
          <RowLink label="Cash available" onClick={() => go("manual")}>
            <span className="sb-num">{money(summary?.available_cash)}</span> <span className="sb-muted">›</span>
          </RowLink>
          <SummaryCards access={access} watchlist={watchlist} quotes={quotes} />
          <LatestSignals enabled={canSignals} signals={signalList} onUnlock={() => onUnlock("ai_signals")} />
          <PositionsList positions={positions} quotes={quotes} signals={signals} loaded={loaded} />
          <StrategiesList strategies={overview?.strategies} loaded={loaded} />
          <div className="sb-phone">
            <WatchlistSection watchlist={watchlist} quotes={quotes} signals={signals} />
          </div>
        </main>
        <aside className="sb-side desk">
          <WatchlistPanel watchlist={watchlist} quotes={quotes} signals={signals} />
        </aside>
      </div>
    </div>
  );
}
