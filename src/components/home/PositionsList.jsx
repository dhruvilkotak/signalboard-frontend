// "Your stocks": manual positions with live value and gain since purchase.
import ListRow from "../ui/ListRow";
import SignalTag from "../ui/SignalTag";
import SectionHeader from "../ui/SectionHeader";
import { money, pct, shares } from "../../lib/format";
import { positionValue } from "../../lib/portfolio";
import { go, openStock } from "../../lib/router";

export default function PositionsList({ positions, quotes, signals, loaded }) {
  return (
    <>
      <SectionHeader title="Your stocks" action="History" onAction={() => go("manual")} />
      {loaded && positions.length === 0 && (
        <div className="sb-empty">No positions yet — open any stock and tap <b>Buy</b>.</div>
      )}
      {positions.map(p => {
        const { value, gainPct } = positionValue(p, quotes[p.symbol]);
        return (
          <ListRow key={p.symbol}
            title={p.symbol} tag={<SignalTag signal={signals[p.symbol]} />}
            subtitle={<span className="sb-num">{shares(p.shares)} shares · avg {money(p.avg_buy_price)}</span>}
            value={money(value)} change={gainPct} changeText={pct(gainPct)}
            onClick={() => openStock(p.symbol)} />
        );
      })}
    </>
  );
}
