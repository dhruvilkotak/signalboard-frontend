// One tappable list row: title (+ tag) and subtitle on the left, value + change on the right.
import { tone } from "../../lib/format";

export default function ListRow({ title, tag, subtitle, value, change, changeText, right, onClick }) {
  return (
    <button className="sb-row" onClick={onClick}>
      <div style={{ minWidth: 0 }}>
        <div className="sym">{title}{tag}</div>
        {subtitle && <div className="nm">{subtitle}</div>}
      </div>
      <div className="rt">
        {right ?? <>
          <div className="px sb-num">{value ?? "—"}</div>
          {changeText && <div className={`pc sb-num ${tone(change)}`}>{changeText}</div>}
        </>}
      </div>
    </button>
  );
}
