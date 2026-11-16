// Small summary card (label on top, value row below). Clickable when onClick is given.
export default function InfoCard({ label, children, onClick, style }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className="sb-card" onClick={onClick} style={style}>
      <div className="t">{label}</div>
      <div className="r">{children}</div>
    </Tag>
  );
}
