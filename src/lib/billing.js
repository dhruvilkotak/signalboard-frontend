// src/lib/billing.js
// Stripe helpers: both redirect the browser to a Stripe-hosted page.

import { startCheckoutSession, openPortalSession } from "./api";

export const PRICE_LABEL = "$20/month";      // fallback when plan prices can't be loaded

// plan: "monthly" | "annual" | "pass". Returns an error message string on failure
// (on success the browser goes to Stripe).
export async function startCheckout(plan = "monthly") {
  try {
    const { url } = await startCheckoutSession(plan);
    window.location.assign(url);
    return null;
  } catch (err) {
    if (err.code === "ALREADY_SUBSCRIBED") return openBillingPortal();
    return err.detail?.message || "Couldn't start checkout. Please try again.";
  }
}

export async function openBillingPortal() {
  try {
    const { url } = await openPortalSession();
    window.location.assign(url);
    return null;
  } catch (err) {
    return err.detail?.message || "Couldn't open billing. Please try again.";
  }
}

// ── plan display (from GET /api/billing/status → plans[]) ─────────────────
export function money(cents, currency = "usd") {
  if (cents == null) return "";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() })
    .format(cents / 100);
}

export function describePlan(p, plans = []) {
  const monthly = plans.find(x => x.id === "monthly");
  if (p.id === "annual") {
    const save = monthly?.amount ? Math.round((1 - p.amount / (12 * monthly.amount)) * 100) : null;
    return { title: "Annual", price: `${money(p.amount, p.currency)}/year`,
             badge: save > 0 ? `Save ${save}%` : null,
             note: `${money(Math.round(p.amount / 12), p.currency)}/month, billed yearly` };
  }
  if (p.id === "pass") {
    return { title: `${p.days || 30}-day pass`, price: `${money(p.amount, p.currency)} once`,
             badge: null, note: "One-time payment · doesn't renew" };
  }
  return { title: "Monthly", price: `${money(p.amount, p.currency)}/month`, badge: null,
           note: "Billed monthly" };
}
