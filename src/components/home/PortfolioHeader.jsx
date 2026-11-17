// Portfolio value with all-time and today's change.
import { money, signedMoney, pct, tone } from "../../lib/format";
import { allTimeReturn } from "../../lib/portfolio";

export default function PortfolioHeader({ summary, todayChange, showToday, error }) {
  const ret = summary ? allTimeReturn(summary) : null;
  return (
    <>
      <div className="sb-kicker">Paper portfolio · virtual money</div>
      <div className="sb-big sb-num">{summary ? money(summary.total_value) : "—"}</div>
      {ret && (
        <div className="sb-chg sb-num">
          <span className={tone(ret.amount)}>{ret.amount >= 0 ? "▲" : "▼"} {signedMoney(ret.amount)} ({pct(ret.pct)})</span>
          <span className="l">All time</span>
          {showToday && <>
            <span className={tone(todayChange)} style={{ marginLeft: 10 }}>{signedMoney(todayChange)}</span>
            <span className="l">Today</span>
          </>}
        </div>
      )}
      {error && <div className="sb-muted" style={{ marginTop: 8, fontSize: 13 }}>{error}</div>}
    </>
  );
}
