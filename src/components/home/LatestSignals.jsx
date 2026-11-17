// Strip of the newest BUY/SELL signals, or an unlock prompt for users without AI Signals.
import InfoCard from "../ui/InfoCard";
import SignalTag from "../ui/SignalTag";
import SectionHeader from "../ui/SectionHeader";
import LockedRow from "../ui/LockedRow";
import { pct, tone } from "../../lib/format";
import { go, openStock } from "../../lib/router";

const MAX = 8;

export default function LatestSignals({ enabled, signals, onUnlock }) {
  if (!enabled) {
    return <LockedRow text="AI signals for your watchlist" onUnlock={onUnlock} style={{ marginTop: 28 }} />;
  }
  const fresh = signals.filter(s => ["BUY", "SELL"].includes((s.signal || "").toUpperCase())).slice(0, MAX);
  if (fresh.length === 0) return null;
  return (
    <>
      <SectionHeader title="Latest AI signals" action="See all" onAction={() => go("signals")} />
      <div className="sb-cards" style={{ marginTop: 10 }}>
        {fresh.map(s => (
          <InfoCard key={s.symbol} style={{ minWidth: 150 }} onClick={() => openStock(s.symbol)}
            label={<span style={{ display: "flex", gap: 6, alignItems: "center" }}><SignalTag signal={s} />{(s.confidence || "").toUpperCase()}</span>}>
            <span>{s.symbol}</span>
            {s.expected_return_pct != null && (
              <span className={`sb-num ${tone(s.expected_return_pct)}`} style={{ fontSize: 14 }}>{pct(s.expected_return_pct)}</span>
            )}
          </InfoCard>
        ))}
      </div>
    </>
  );
}
