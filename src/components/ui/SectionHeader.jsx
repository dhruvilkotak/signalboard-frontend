// Section title with an optional action link on the right ("See all", "History" …).
export default function SectionHeader({ title, action, onAction, note }) {
  return (
    <h2 className="sb-h2">
      {title}
      {(action || note) && (
        <span className="sub">{action ? <button onClick={onAction}>{action}</button> : note}</span>
      )}
    </h2>
  );
}
