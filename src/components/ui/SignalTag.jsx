// BUY / HOLD / SELL chip for an AI signal.
export default function SignalTag({ signal }) {
  const type = (signal?.signal || "").toUpperCase();
  return type ? <span className={`sb-tag ${type}`}>{type}</span> : null;
}
