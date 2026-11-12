// src/lib/billing.js
// Stripe helpers: both redirect the browser to a Stripe-hosted page.

import { startCheckoutSession, openPortalSession } from "./api";

export const PRICE_LABEL = "$20/month";

// Returns an error message string on failure (the page is left otherwise).
export async function startCheckout() {
  try {
    const { url } = await startCheckoutSession();
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
