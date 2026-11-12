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
import { startCheckout, PRICE_LABEL } from "../lib/billing";
import { PAYWALL_EVENT } from "../lib/api";
import { useFlag } from "../hooks/useFeatureFlags";
import { useAccessStore } from "../hooks/useAccess";

const ADMIN_EMAIL = "kotakdhruvil@gmail.com";

const FEATURE_TEXT = {
  ondemand:   { icon: "⚡", title: "You've used your 5 free AI signals",
                body: "Free accounts get 5 on-demand AI signals. Signals you already opened stay free to view until they expire." },
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

  return (
    <div style={s.overlay} onClick={close}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <button style={s.close} onClick={close}>✕</button>
        <div style={{ fontSize: 44, textAlign: "center", marginBottom: 8 }}>{text.icon}</div>
        <h2 style={s.title}>{text.title}</h2>
        <p style={s.p}>{text.body}</p>

        <div style={s.perks}>
          <div style={s.perksTitle}>Upgrade to unlock</div>
          {["Unlimited on-demand AI signals", "AI Signals page", "AI Chat", "Auto-Trader"].map(p => (
            <div key={p} style={s.perk}><span style={{ color: "#3fb950" }}>✓</span> {p}</div>
          ))}
        </div>

        <div style={s.actions}>
          {billingOn && (
            <>
              <button style={{ ...s.btnPrimary, opacity: busy ? 0.6 : 1 }} disabled={busy}
                onClick={async () => {
                  setBusy(true); setError(null);
                  const err = await startCheckout();          // redirects to Stripe on success
                  if (err) { setError(err); setBusy(false); }
                }}>
                {busy ? "Opening checkout…" : `Subscribe · ${PRICE_LABEL}`}
              </button>
              <div style={s.fine}>
                Secure checkout by Stripe · cards, Apple Pay, Google Pay · cancel anytime from your account;
                access continues to the end of the paid month, no partial refunds.
              </div>
              {error && <div style={s.err}>{error}</div>}
            </>
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
  btnGhost:     { padding:"6px", background:"none", border:"none", color:"#8b949e", fontSize:12, cursor:"pointer" },
};
