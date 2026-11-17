// Horizontal strip: AI signals left, top mover, free-trial days.
import InfoCard from "../ui/InfoCard";
import { pct, tone } from "../../lib/format";
import { signalsLeft, topMover, trialDaysLeft } from "../../lib/portfolio";
import { openStock } from "../../lib/router";

export default function SummaryCards({ access, watchlist, quotes }) {
  const quota = signalsLeft(access);
  const mover = topMover(watchlist, quotes);
  const days = trialDaysLeft(access);
  return (
    <div className="sb-cards">
      {quota && (
        <InfoCard label="AI signals left">
          <span className="sb-num">{quota.left} of {quota.limit}</span>
          <span className="sb-muted" style={{ fontWeight: 400, fontSize: 13 }}>{quota.weekly ? "this week" : "total"}</span>
        </InfoCard>
      )}
      {mover && (
        <InfoCard label="Top mover" onClick={() => openStock(mover)}>
          <span>{mover}</span>
          <span className={`sb-num ${tone(quotes[mover].change_pct)}`}>{pct(quotes[mover].change_pct)}</span>
        </InfoCard>
      )}
      {days != null && (
        <InfoCard label="Free trial"><span>{days} day{days === 1 ? "" : "s"} left</span></InfoCard>
      )}
    </div>
  );
}
