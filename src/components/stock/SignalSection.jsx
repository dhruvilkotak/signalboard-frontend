// AI Signal section: unlock prompt, compact summary, or the full analysis (existing SignalTab,
// which also handles the on-demand quota confirm). Full analysis loads only when asked.
import { useState } from "react";
import SignalTab from "../SignalTab";
import SignalSummary from "./SignalSummary";
import SectionHeader from "../ui/SectionHeader";
import LockedRow from "../ui/LockedRow";

const when = (iso) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function SignalSection({ symbol, signal, enabled, price, isAdmin, onUnlock }) {
  const [full, setFull] = useState(false);
  return (
    <>
      <SectionHeader title="AI Signal" note={signal?.generated_at ? when(signal.generated_at) : null} />
      {!enabled ? (
        <LockedRow text={`See the AI's BUY / HOLD / SELL call for ${symbol}`} onUnlock={onUnlock} style={{ marginTop: 8 }} />
      ) : full ? (
        <div className="sb-embed">
          <SignalTab key={symbol} symbol={symbol} currentPrice={price} isAdmin={isAdmin} active onCancel={() => setFull(false)} />
        </div>
      ) : (
        <SignalSummary signal={signal} symbol={symbol} onOpen={() => setFull(true)} />
      )}
    </>
  );
}
