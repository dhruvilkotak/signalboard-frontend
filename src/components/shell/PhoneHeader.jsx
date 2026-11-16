// Phone header: logo + search (opens the stock page for the picked symbol).
import SearchBar from "../SearchBar";
import { Logo } from "./Nav";
import { go, openStock } from "../../lib/router";

export default function PhoneHeader({ watchlist }) {
  return (
    <header className="sb-phead">
      <Logo onClick={() => go("home")} />
      <div style={{ flex: 1, minWidth: 0, maxWidth: 260 }}>
        <SearchBar watchlist={watchlist} onSelect={openStock} fullWidth placeholder="Search" />
      </div>
    </header>
  );
}
