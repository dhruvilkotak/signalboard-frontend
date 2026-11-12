// src/components/LiquidationNotice.jsx
// Banner above every tab about Auto-Trader access ending (backend: access_expiry job).
//   pending  -> amber: strategies paused, holdings convert to cash next trading session;
//               Upgrade / Redeem code buttons
//   last     -> blue, dismissible once: "Auto-Trader holdings converted to $X cash"
// Reads access.liquidation from /api/me/access via useAccess.

import { useState } from "react";
import { useAccess } from "../hooks/useAccess";
import { useFlag } from "../hooks/useFeatureFlags";
import { PAYWALL_EVENT } from "../lib/api";
import { REDEEM_COUPON_EVENT } from "./RedeemCouponModal";

const DISMISS_KEY = "sb_liquidation_seen";

function seenAt() {
  try { return localStorage.getItem(DISMISS_KEY); } catch { return null; }
}
function markSeen(at) {
  try { localStorage.setItem(DISMISS_KEY, at); } catch { /* storage unavailable */ }
}

export default function LiquidationNotice() {
  const { access } = useAccess();
  const couponsOn = useFlag("coupons");
  const [dismissed, setDismissed] = useState(seenAt);
  const liq = access?.liquidation;
  if (!liq) return null;

  if (liq.pending) {
    return (
      <div style={{ ...box, background: "#2d2010", borderColor: "#f0a000" }}>
        <span style={{ fontSize: 18 }}>⏸</span>
        <div style={{ flex: 1, color: "#e6edf3" }}>
          <strong style={{ color: "#f0a000" }}>Your Auto-Trader access has ended.</strong>{" "}
          Your strategies are paused, and their holdings will be converted to cash at the start of the
          next trading session. Manual positions aren't affected.
        </div>
        <button style={btnPrimary}
          onClick={() => window.dispatchEvent(new CustomEvent(PAYWALL_EVENT, { detail: { feature: "autotrader" } }))}>
          Keep my strategies
        </button>
        {couponsOn && (
          <button style={btnGhost} onClick={() => window.dispatchEvent(new Event(REDEEM_COUPON_EVENT))}>
            Redeem code
          </button>
        )}
      </div>
    );
  }

  const last = liq.last;
  if (last?.at && dismissed !== last.at) {
    const returned = Number(last.returned || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });
    return (
      <div style={{ ...box, background: "#388bfd14", borderColor: "#388bfd55" }}>
        <span style={{ fontSize: 18 }}>💵</span>
        <div style={{ flex: 1, color: "#e6edf3" }}>
          Your Auto-Trader access ended, so we closed {last.positions_closed} strategy position
          {last.positions_closed === 1 ? "" : "s"} on {new Date(last.at).toLocaleDateString()} and returned{" "}
          <strong style={{ color: "#3fb950" }}>{returned}</strong> to your available cash (paper money).
        </div>
        <button style={btnGhost} onClick={() => { markSeen(last.at); setDismissed(last.at); }}>Dismiss</button>
      </div>
    );
  }

  return null;
}

const box        = { display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", padding:"10px 14px", border:"1px solid", borderRadius:8, fontSize:13, lineHeight:1.5, marginBottom:"1rem" };
const btnPrimary = { padding:"6px 12px", background:"#238636", border:"1px solid #2ea043", borderRadius:6, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" };
const btnGhost   = { padding:"6px 12px", background:"transparent", border:"1px solid #30363d", borderRadius:6, color:"#8b949e", fontSize:12, cursor:"pointer", whiteSpace:"nowrap" };
