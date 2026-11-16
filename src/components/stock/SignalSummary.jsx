// Compact AI signal card: call, confidence, summary, target / stop / expected return.
import SignalTag from "../ui/SignalTag";
import { money, pct, tone } from "../../lib/format";

function Figure({ label, children }) {
  return <div><div className="sb-muted" style={{ fontSize: 12 }}>{label}</div>{children}</div>;
}

export default function SignalSummary({ signal, symbol, onOpen }) {
  return (
    <div className="sb-panel" style={{ padding: "16px 18px", marginTop: 10 }}>
      {signal ? <>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SignalTag signal={signal} />
          <span className="sb-muted" style={{ fontSize: 12, fontWeight: 600 }}>
            {(signal.confidence || "").toUpperCase()} CONFIDENCE
            {signal.conviction_score != null && ` · CONVICTION ${signal.conviction_score}/10`}
          </span>
        </div>
        {signal.summary && <p style={{ color: "#c9d1d9", fontSize: 15, lineHeight: 1.55, marginTop: 10 }}>{signal.summary}</p>}
        <div className="sb-num" style={{ display: "flex", gap: 22, marginTop: 12, fontSize: 14, flexWrap: "wrap" }}>
          {signal.target_price != null && <Figure label="Target">{money(signal.target_price)}</Figure>}
          {signal.stop_loss != null && <Figure label="Stop loss">{money(signal.stop_loss)}</Figure>}
          {signal.expected_return_pct != null && (
            <Figure label="Expected"><span className={tone(signal.expected_return_pct)}>{pct(signal.expected_return_pct)}</span></Figure>
          )}
        </div>
        <button className="sb-link" onClick={onOpen}>Full analysis</button>
      </> : <>
        <div className="sb-muted" style={{ fontSize: 15 }}>No recent signal for {symbol}.</div>
        <button className="sb-link" onClick={onOpen}>Get AI signal</button>
      </>}
    </div>
  );
}
