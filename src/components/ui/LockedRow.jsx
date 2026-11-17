// Prompt shown in place of a paid feature: "🔒 … Unlock".
import RowLink from "./RowLink";

export default function LockedRow({ text, onUnlock, style }) {
  return (
    <RowLink label={`🔒 ${text}`} onClick={onUnlock} style={style}>
      <span className="sb-link" style={{ marginTop: 0 }}>Unlock</span>
    </RowLink>
  );
}
