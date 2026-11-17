// Auto-Trader strategies: allocated amount, value and P&L.
import ListRow from "../ui/ListRow";
import SectionHeader from "../ui/SectionHeader";
import { money, signedMoney } from "../../lib/format";
import { go } from "../../lib/router";

export default function StrategiesList({ strategies, loaded }) {
  const entries = Object.entries(strategies ?? {});
  const open = () => go("auto");
  return (
    <>
      <SectionHeader title="Auto-Trader" action="Manage" onAction={open} />
      {entries.map(([key, { config, allocation: a }]) => (
        <ListRow key={key}
          title={config?.label || key}
          subtitle={a ? `${money(a.allocated, 0)} allocated${a.is_paused ? " · paused" : ""}` : "Not started"}
          value={a ? money(a.total_value) : null}
          change={a?.pnl} changeText={a ? signedMoney(a.pnl) : null}
          right={a ? undefined : <span className="sb-link" style={{ marginTop: 0 }}>Start</span>}
          onClick={open} />
      ))}
      {loaded && entries.length === 0 && <div className="sb-empty">No strategies available.</div>}
    </>
  );
}
