// Watchlist-style row for a symbol: ticker, AI signal tag, live price and day change.
import ListRow from "./ListRow";
import SignalTag from "./SignalTag";
import { money, pct } from "../../lib/format";
import { openStock } from "../../lib/router";

export default function QuoteRow({ symbol, quote, signal, subtitle }) {
  return (
    <ListRow
      title={symbol}
      tag={<SignalTag signal={signal} />}
      subtitle={subtitle}
      value={quote?.price != null ? money(quote.price) : null}
      change={quote?.change_pct}
      changeText={quote?.change_pct != null ? pct(quote.change_pct) : null}
      onClick={() => openStock(symbol)}
    />
  );
}
