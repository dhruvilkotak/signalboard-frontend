// src/components/PaywallModal.jsx
// App-wide paywall. Opens whenever any api.js call gets 402 PAYWALL
// (api.js dispatches PAYWALL_EVENT with the backend's detail).
// Mount once in App.jsx inside <TermsGate>, next to the main layout.
//
// Buttons appear only when their flag is on for the user:
//   billing -> "Subscribe" (goes to /pricing once B5 lands)
//   coupons -> "Redeem coupon" (opens the coupon modal once B6 lands)
// With neither on, users are told to contact the admin.

import { useEffect, useState } from "react";
import { startCheckout, PRICE_LABEL, describePlan } from "../lib/billing";
import { getBillingStatus } from "../lib/api";

// Shown instead of the Subscribe button while the `billing` flag is off.
// Change the wording here when there is a firm date.
export const PAID_PLANS_NOTE = "Paid plans are coming soon. For now, ask the admin for a free coupon to keep full access.";
import { PAYWALL_EVENT } from "../lib/api";
import { useFlag } from "../hooks/useFeatureFlags";
import { useAccessStore } from "../hooks/useAccess";

const ADMIN_EMAIL = "kotakdhruvil@gmail.com";

const FEATURE_TEXT = {
  ondemand:   { icon: "⚡", title: "You've used your 5 free AI signals",
                body: "Free accounts get 5 on-demand AI signals in total. Signals you already opened stay viewable until they expire." },
  ai_signals: { icon: "📊", title: "Your free trial has ended",
                body: "The AI Signals page was part of your 7-day trial." },
  ai_chat:    { icon: "💬", title: "Your free trial has ended",
                body: "AI Chat was part of your 7-day trial." },
  autotrader: { icon: "🤖", title: "Your free trial has ended",
                body: "The Auto-Trader was part of your 7-day trial." },
};

export default function PaywallModal() {
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const billingOn = useFlag("billing");
  const couponsOn = useFlag("coupons");
  const [billing, setBilling] = useState(null);       // {plans, tax_added} from /api/billing/status
  const [plan, setPlan] = useState("monthly");

  // Load plan prices the first time the paywall opens with billing on.
  useEffect(() => {
    if (!detail || !billingOn || billing) return;
    getBillingStatus()
      .then(b => {
        setBilling(b);
        if (b?.plans?.length && !b.plans.some(p => p.id === "monthly")) setPlan(b.plans[0].id);
      })
      .catch(() => setBilling({ plans: [], tax_added: false }));
  }, [detail, billingOn, billing]);

  useEffect(() => {
    const onPaywall = (e) => {
      setDetail(e.detail || { feature: "ondemand" });
      useAccessStore.getState().refresh();          // keep counters in sync
    };
    window.addEventListener(PAYWALL_EVENT, onPaywall);
    return () => window.removeEventListener(PAYWALL_EVENT, onPaywall);
  }, []);

  if (!detail) return null;

  const text = FEATURE_TEXT[detail.feature] || FEATURE_TEXT.ondemand;
  const close = () => setDetail(null);
  const resetsAt = detail.ondemand?.resets_at ? new Date(detail.ondemand.resets_at) : null;
  const resetText = resetsAt
    ? `Your 5 signals reset on ${resetsAt.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}.`
    : "Your signals reset every Monday.";

  // Subscribers / Pro / coupon users hitting the weekly cap: no upsell, just when it resets.
  if (detail.code === "WEEKLY_LIMIT") {
    return (
      <div style={s.overlay} onClick={close}>
        <div style={s.modal} onClick={e => e.stopPropagation()}>
          <button style={s.close} onClick={close}>✕</button>
          <div style={{ fontSize: 44, textAlign: "center", marginBottom: 8 }}>⚡</div>
          <h2 style={s.title}>You've used this week's 5 AI signals</h2>
          <p style={s.p}>{resetText} Signals you already opened stay viewable until they expire.</p>
          <button style={s.btnPrimary} onClick={close}>OK</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.overlay} onClick={close}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <button style={s.close} onClick={close}>✕</button>
        <div style={{ fontSize: 44, textAlign: "center", marginBottom: 8 }}>{text.icon}</div>
        <h2 style={s.title}>{text.title}</h2>
        <p style={s.p}>{text.body}</p>

        <div style={s.perks}>
          <div style={s.perksTitle}>Upgrade to unlock</div>
          {["AI Signals page", "AI Chat", "Auto-Trader strategies", "5 on-demand AI signals every week"].map(p => (
            <div key={p} style={s.perk}><span style={{ color: "#3fb950" }}>✓</span> {p}</div>
          ))}
        </div>

        <div style={s.actions}>
          {billingOn && (() => {
            const plans = billing?.plans || [];
            const chosen = plans.find(p => p.id === plan) || plans[0];
            const info = chosen ? describePlan(chosen, plans) : null;
            const tax = billing?.tax_added ? " + tax" : "";
            const label = busy ? "Opening checkout…"
              : info ? `Continue · ${info.price}${tax}` : `Subscribe · ${PRICE_LABEL}`;
            return (
              <>
                {plans.length > 1 && (
                  <div style={s.plans}>
                    {plans.map(p => {
                      const d = describePlan(p, plans);
                      const on = p.id === (chosen?.id);
                      return (
                        <button key={p.id} onClick={() => setPlan(p.id)}
                          style={{ ...s.plan, ...(on ? s.planOn : null) }}>
                          <span style={s.planTop}>
                            <span style={{ ...s.radio, ...(on ? s.radioOn : null) }} />
                            <b style={{ color: "#e6edf3" }}>{d.title}</b>
                            {d.badge && <span style={s.badge}>{d.badge}</span>}
                            <span style={{ marginLeft: "auto", color: "#e6edf3", fontWeight: 600 }}>{d.price}</span>
                          </span>
                          <span style={s.planNote}>{d.note}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <button style={{ ...s.btnPrimary, opacity: busy ? 0.6 : 1 }} disabled={busy}
                  onClick={async () => {
                    setBusy(true); setError(null);
                    const err = await startCheckout(chosen?.id || "monthly");   // redirects to Stripe on success
                    if (err) { setError(err); setBusy(false); }
                  }}>
                  {label}
                </button>
                <div style={s.fine}>
                  Secure checkout by Stripe · cards, Apple Pay, Google Pay
                  {billing?.tax_added ? " · sales tax added at checkout where applicable" : ""}.
                  {" "}{chosen?.id === "pass"
                    ? "One-time payment for full access; it doesn't renew."
                    : "Cancel anytime from your account; access continues to the end of the paid period, no partial refunds."}
                </div>
                {error && <div style={s.err}>{error}</div>}
              </>
            );
          })()}
          {!billingOn && (
            <div style={{ ...s.fine, color: "#e3b341", marginBottom: 4 }}>⏳ {PAID_PLANS_NOTE}</div>
          )}
          {couponsOn && (
            <button style={s.btnSecondary}
              onClick={() => { close(); window.dispatchEvent(new Event("signalboard:redeem-coupon")); }}>
              Redeem coupon
            </button>
          )}
          {!billingOn && !couponsOn && (
            <a style={{ ...s.btnPrimary, textDecoration: "none", textAlign: "center" }}
              href={`mailto:${ADMIN_EMAIL}?subject=SignalBoard%20access`}>
              Contact admin for access
            </a>
          )}
          <button style={s.btnGhost} onClick={close}>Not now</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay:      { position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:900, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" },
  modal:        { position:"relative", background:"#161b22", border:"1px solid #30363d", borderRadius:12, width:"100%", maxWidth:420, padding:"1.75rem 1.5rem 1.25rem" },
  close:        { position:"absolute", top:12, right:14, background:"none", border:"none", color:"#8b949e", fontSize:18, cursor:"pointer" },
  title:        { fontSize:18, fontWeight:700, color:"#e6edf3", textAlign:"center", margin:"0 0 0.5rem" },
  p:            { fontSize:13, color:"#8b949e", lineHeight:1.6, textAlign:"center", margin:"0 0 1rem" },
  perks:        { background:"#0d1117", border:"1px solid #30363d", borderRadius:8, padding:"10px 14px", marginBottom:"1rem" },
  perksTitle:   { fontSize:10, color:"#6e7681", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:6 },
  perk:         { fontSize:13, color:"#e6edf3", lineHeight:1.9 },
  actions:      { display:"flex", flexDirection:"column", gap:8 },
  btnPrimary:   { padding:"10px", background:"#238636", border:"1px solid #2ea043", borderRadius:6, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" },
  btnSecondary: { padding:"9px", background:"#161b22", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:13, cursor:"pointer" },
  fine:         { fontSize:11, color:"#6e7681", textAlign:"center", lineHeight:1.5, marginTop:-2 },
  err:          { fontSize:12, color:"#f85149", textAlign:"center" },
  plans:        { display:"flex", flexDirection:"column", gap:6, marginBottom:4 },
  plan:         { display:"flex", flexDirection:"column", gap:2, textAlign:"left", padding:"9px 12px", background:"#0d1117", border:"1px solid #30363d", borderRadius:8, cursor:"pointer", fontSize:13, color:"#8b949e" },
  planOn:       { border:"1px solid #2ea043", background:"#0d2a1a" },
  planTop:      { display:"flex", alignItems:"center", gap:8 },
  planNote:     { fontSize:11, color:"#6e7681", paddingLeft:20 },
  radio:        { width:12, height:12, borderRadius:"50%", border:"2px solid #6e7681", flexShrink:0 },
  radioOn:      { border:"4px solid #3fb950" },
  badge:        { fontSize:10, fontWeight:700, color:"#3fb950", background:"#3fb95020", border:"1px solid #3fb95055", borderRadius:4, padding:"1px 6px" },
  btnGhost:     { padding:"6px", background:"none", border:"none", color:"#8b949e", fontSize:12, cursor:"pointer" },
};
