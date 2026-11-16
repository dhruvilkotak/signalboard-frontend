// App-wide notices under the header: plan check failures, idle sign-out, billing, liquidation.
import BillingReturnNotice from "../BillingReturnNotice";
import LiquidationNotice from "../LiquidationNotice";

const wrap = { maxWidth: 1120, margin: "0 auto", padding: "0 20px" };
const box = { marginTop: 12, padding: "8px 12px", borderRadius: 8, fontSize: 13, background: "#f0a00015", border: "1px solid #f0a00055", color: "#f0a000" };

export default function Notices({ accessNotice, idleWarning }) {
  return (
    <div style={wrap}>
      {accessNotice && <div style={box}>{accessNotice}</div>}
      {idleWarning && <div style={box}>⏱ Signing out in 5 min — tap anywhere to stay signed in.</div>}
      <BillingReturnNotice />
      <LiquidationNotice />
    </div>
  );
}
