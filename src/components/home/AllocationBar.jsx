// Stacked bar: how the portfolio splits between cash, your stocks and the Auto-Trader.
import { money } from "../../lib/format";
import { allocation } from "../../lib/portfolio";

export default function AllocationBar({ summary }) {
  const parts = allocation(summary);
  const total = parts.reduce((sum, p) => sum + p.value, 0) || 1;
  return (
    <div className="sb-alloc">
      <div className="bar">
        {parts.filter(p => p.value > 0).map(p => (
          <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <div className="legend">
        {parts.map(p => (
          <span key={p.label}><i style={{ background: p.color }} />{p.label}<b className="sb-num">{money(p.value, 0)}</b></span>
        ))}
      </div>
    </div>
  );
}
