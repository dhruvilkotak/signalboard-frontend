// Open / high / low / previous close / volume / market cap grid.
import SectionHeader from "../ui/SectionHeader";
import { money, compactCap, compactVolume } from "../../lib/format";

const price = (n) => (n != null ? money(n) : "—");

export default function StockStats({ quote }) {
  const stats = [
    ["Open", price(quote?.open)],
    ["High", price(quote?.high)],
    ["Low", price(quote?.low)],
    ["Prev close", price(quote?.prev_close)],
    ["Volume", compactVolume(quote?.volume)],
    ["Market cap", compactCap(quote?.mkt_cap)],
  ];
  return (
    <>
      <SectionHeader title="Stats" />
      <div className="sb-stats sb-num">
        {stats.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}
      </div>
    </>
  );
}
