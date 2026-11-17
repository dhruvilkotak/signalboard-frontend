// src/components/shell/Nav.jsx — desktop top bar + phone bottom tab bar
import SearchBar from "../SearchBar";
import { IconHome, IconSignals, IconAuto, IconChat, IconAccount, IconLock } from "./Icons";
import { openStock } from "../../lib/router";

export const NAV = [
  { id: "home",    label: "Home",        short: "Home",    Icon: IconHome },
  { id: "signals", label: "AI Signals",  short: "Signals", Icon: IconSignals, feature: "ai_signals" },
  { id: "auto",    label: "Auto-Trader", short: "Auto",    Icon: IconAuto,    feature: "autotrader" },
  { id: "chat",    label: "AI Chat",     short: "Chat",    Icon: IconChat,    feature: "ai_chat" },
  { id: "account", label: "Account",     short: "Account", Icon: IconAccount },
];

// Which nav item is highlighted for a route (stock pages belong to Home).
export const navFor = (name) =>
  ({ stock: "home", manual: "home", terminal: "home", guide: "account", admin: "account" }[name] || name);

export function Logo({ onClick }) {
  return <div className="sb-logo" onClick={onClick}>SignalBoard</div>;
}

export function TopBar({ active, onNav, isLocked, watchlist }) {
  return (
    <header className="sb-top">
      <Logo onClick={() => onNav("home")} />
      <div className="sb-search">
        <SearchBar watchlist={watchlist} onSelect={openStock} fullWidth placeholder="Search stocks & ETFs" />
      </div>
      <nav>
        {NAV.map(n => (
          <button key={n.id} className={active === n.id ? "on" : ""} onClick={() => onNav(n.id)}>
            {n.feature && isLocked(n.feature) && <span style={{ marginRight: 5, opacity: 0.7 }}><IconLock /></span>}
            {n.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

export function BottomNav({ active, onNav, isLocked }) {
  return (
    <nav className="sb-bnav">
      {NAV.map(({ id, short, Icon, feature }) => (
        <button key={id} className={active === id ? "on" : ""} onClick={() => onNav(id)} aria-label={short}>
          <Icon />
          <span>{feature && isLocked(feature) ? "🔒 " : ""}{short}</span>
        </button>
      ))}
    </nav>
  );
}
