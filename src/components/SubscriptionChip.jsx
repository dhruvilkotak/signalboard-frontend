// src/components/SubscriptionChip.jsx
// Header chip for Stripe subscribers (opens the Stripe Customer Portal):
//   plan "paid"                         -> "★ Subscribed"
//   status past_due / unpaid (not paid) -> "⚠ Payment failed · Update card"
//   everyone else                       -> nothing

import { useState } from "react";
import { useAccess } from "../hooks/useAccess";
import { openBillingPortal } from "../lib/billing";

export default function SubscriptionChip() {
  const { access } = useAccess();
  const [busy, setBusy] = useState(false);
  if (!access) return null;

  const failed = ["past_due", "unpaid", "incomplete"].includes(access.subscription_status);
  if (access.plan !== "paid" && !failed) return null;

  const open = async () => {
    setBusy(true);
    const err = await openBillingPortal();
    if (err) { alert(err); setBusy(false); }
  };

  const color = failed ? "#f85149" : "#d2a8ff";
  return (
    <button onClick={open} disabled={busy} style={{
      display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
      fontSize: 11, fontFamily: "'Space Mono',monospace", color,
      background: `${color}15`, border: `1px solid ${color}55`,
      borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap",
    }} title="Manage subscription, payment method and invoices">
      {busy ? "Opening…" : failed ? "⚠ Payment failed · Update card" : "★ Subscribed"}
    </button>
  );
}
