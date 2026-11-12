// src/components/CouponChip.jsx
// Header chip (flag `coupons`):
//   plan "coupon"      -> "🎟 Access until Dec 11"
//   plan free / trial  -> "🎟 Redeem code" button (opens RedeemCouponModal)
//   everyone else      -> nothing

import { useAccess } from "../hooks/useAccess";
import { useFlag } from "../hooks/useFeatureFlags";
import { REDEEM_COUPON_EVENT } from "./RedeemCouponModal";

export default function CouponChip() {
  const { access } = useAccess();
  const couponsOn = useFlag("coupons");
  if (!access || !couponsOn) return null;

  if (access.plan === "coupon" && access.coupon_until) {
    const until = new Date(access.coupon_until);
    return (
      <span style={chip("#3fb950")} title={`Full access from a coupon until ${until.toLocaleString()}`}>
        🎟 Access until {until.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </span>
    );
  }

  if (access.plan === "free" || access.plan === "trial") {
    return (
      <button style={{ ...chip("#8b949e"), cursor: "pointer" }}
        onClick={() => window.dispatchEvent(new Event(REDEEM_COUPON_EVENT))}>
        🎟 Redeem code
      </button>
    );
  }

  return null;
}

const chip = (color) => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  fontSize: 11, fontFamily: "'Space Mono',monospace", color,
  background: `${color}15`, border: `1px solid ${color}55`,
  borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap",
});
