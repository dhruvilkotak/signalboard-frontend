// src/pages/Account.jsx — v2 account page: plan, links to the other sections, sign out.
import { go } from "../lib/router";
import TrialChip from "../components/TrialChip";
import CouponChip from "../components/CouponChip";
import SubscriptionChip from "../components/SubscriptionChip";
import QuotaChip from "../components/QuotaChip";
import { REDEEM_COUPON_EVENT } from "../components/RedeemCouponModal";
import { useAccess } from "../hooks/useAccess";

const PLAN = { admin: "Admin", pro: "Pro", paid: "Pro", coupon: "Coupon", trial: "Free trial", free: "Free", legacy: "Legacy" };

export default function Account({ auth, connected }) {
  const { access } = useAccess();
  const item = (label, onClick, right = "›") => (
    <button onClick={onClick}><span>{label}</span><span className="sb-muted">{right}</span></button>
  );
  return (
    <div className="sb-page" style={{ maxWidth: 720 }}>
      <div className="sb-kicker">Signed in as</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, wordBreak: "break-all" }}>
        {auth.user.displayName || auth.user.email}
      </div>
      <div className="sb-muted" style={{ fontSize: 14, marginTop: 2 }}>{auth.user.email}</div>
      <div className="sb-chips">
        {access?.plan && <span className="sb-tag BUY" style={{ fontSize: 12, padding: "4px 8px" }}>{PLAN[access.plan] || access.plan}</span>}
        <TrialChip /><CouponChip /><SubscriptionChip /><QuotaChip />
        <span className="sb-muted" style={{ fontSize: 12 }}>{connected ? "🟢 Live prices" : "🔴 Prices offline"}</span>
      </div>
      {auth.idleWarning && <div style={{ marginTop: 12, color: "var(--sb-amber)", fontSize: 13 }}>⏱ Signing out in 5 min (inactive)</div>}

      <h2 className="sb-h2">Account</h2>
      <div className="sb-list">
        {item("Trade history & manual trades", () => go("manual"))}
        {item("Redeem a coupon code", () => window.dispatchEvent(new Event(REDEEM_COUPON_EVENT)))}
        {item("Trading terminal (advanced charts)", () => go("terminal"))}
        {item("User guide", () => go("guide"))}
        {auth.isAdmin && item("Admin", () => go("admin"))}
      </div>

      <button className="sb-btn ghost" style={{ marginTop: 28, width: "100%" }} onClick={auth.logout}>Sign out</button>
      <div className="sb-muted" style={{ fontSize: 11, textAlign: "center", marginTop: 18 }}>
        Virtual trading only · No real funds · Not financial advice
      </div>
    </div>
  );
}
