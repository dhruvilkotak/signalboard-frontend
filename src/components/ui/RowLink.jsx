// Full-width row with a label and a value/action on the right ("Cash available  $6,120 ›").
export default function RowLink({ label, children, onClick, style }) {
  return (
    <button className="sb-rowlink" onClick={onClick} style={style}>
      <span>{label}</span>
      <span>{children}</span>
    </button>
  );
}
