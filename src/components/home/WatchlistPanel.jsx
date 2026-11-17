// Watchlist as a side panel (desktop) or a plain section (phone).
import QuoteRow from "../ui/QuoteRow";
import SectionHeader from "../ui/SectionHeader";

export function WatchlistRows({ watchlist, quotes, signals }) {
  return watchlist.map(s => <QuoteRow key={s} symbol={s} quote={quotes[s]} signal={signals[s]} />);
}

export function WatchlistSection(props) {
  return (
    <>
      <SectionHeader title="Watchlist" note={`${props.watchlist.length} symbols`} />
      <WatchlistRows {...props} />
    </>
  );
}

export default function WatchlistPanel(props) {
  return (
    <div className="sb-panel">
      <div className="ph">
        <span>Watchlist</span>
        <span className="sb-muted" style={{ fontWeight: 400, fontSize: 13 }}>{props.watchlist.length}</span>
      </div>
      {props.watchlist.length === 0 && <div className="sb-empty" style={{ padding: 18 }}>Search for a stock to add it.</div>}
      <WatchlistRows {...props} />
    </div>
  );
}
