// src/components/RedeemCouponModal.jsx
// Redeem a coupon code. Opens on the "signalboard:redeem-coupon" event
// (PaywallModal and CouponChip dispatch it). Mount once in App.jsx.

import { useEffect, useRef, useState } from "react";
import { redeemCoupon, ACCESS_CHANGED_EVENT } from "../lib/api";

export const REDEEM_COUPON_EVENT = "signalboard:redeem-coupon";

const ERRORS = {
  COUPON_INVALID:          "That code isn't valid. Check for typos.",
  COUPON_EXPIRED:          "That code has expired.",
  COUPON_USED_UP:          "That code has already been fully used.",
  COUPON_ALREADY_REDEEMED: "You've already used this code.",
  COUPON_RATE_LIMITED:     "Too many attempts. Try again in an hour.",
  COUPONS_DISABLED:        "Coupons aren't available yet.",
};

export default function RedeemCouponModal() {
  const [open,    setOpen]    = useState(false);
  const [code,    setCode]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onOpen = () => { setOpen(true); setCode(""); setError(null); setSuccess(null); };
    window.addEventListener(REDEEM_COUPON_EVENT, onOpen);
    return () => window.removeEventListener(REDEEM_COUPON_EVENT, onOpen);
  }, []);

  useEffect(() => { if (open && !success) inputRef.current?.focus(); }, [open, success]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await redeemCoupon(code.trim());
      setSuccess(res);
      window.dispatchEvent(new Event(ACCESS_CHANGED_EVENT));
    } catch (err) {
      setError(ERRORS[err.code] || err.detail?.message || "Couldn't redeem that code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const close = () => setOpen(false);

  return (
    <div style={s.overlay} onClick={close}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <button style={s.close} onClick={close}>✕</button>
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 8 }}>🎟</div>

        {success ? (
          <>
            <h2 style={s.title}>Access unlocked</h2>
            <p style={s.p}>
              <strong style={{ color: "#3fb950" }}>{success.days} days</strong> of full access added.
              <br />Everything is unlocked until{" "}
              <strong style={{ color: "#e6edf3" }}>{new Date(success.coupon_until).toLocaleDateString()}</strong>.
            </p>
            <button style={s.btnPrimary} onClick={close}>Start exploring</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2 style={s.title}>Redeem a code</h2>
            <p style={s.p}>Enter the code you were given to unlock every feature.</p>
            <input
              ref={inputRef}
              style={s.input}
              placeholder="SBC-XXXX-XXXX"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              spellCheck={false}
            />
            {error && <div style={s.error}>{error}</div>}
            <button style={{ ...s.btnPrimary, opacity: busy || !code.trim() ? 0.5 : 1 }}
              type="submit" disabled={busy || !code.trim()}>
              {busy ? "Checking…" : "Redeem"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:950, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" },
  modal:      { position:"relative", background:"#161b22", border:"1px solid #30363d", borderRadius:12, width:"100%", maxWidth:380, padding:"1.75rem 1.5rem 1.25rem" },
  close:      { position:"absolute", top:12, right:14, background:"none", border:"none", color:"#8b949e", fontSize:18, cursor:"pointer" },
  title:      { fontSize:18, fontWeight:700, color:"#e6edf3", textAlign:"center", margin:"0 0 0.5rem" },
  p:          { fontSize:13, color:"#8b949e", lineHeight:1.6, textAlign:"center", margin:"0 0 1rem" },
  input:      { width:"100%", boxSizing:"border-box", padding:"11px 12px", background:"#0d1117", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:16, fontFamily:"'Space Mono',monospace", letterSpacing:1, textAlign:"center", outline:"none", marginBottom:10 },
  error:      { background:"#3d1515", border:"1px solid #f85149", color:"#f85149", borderRadius:6, padding:"8px 12px", fontSize:12, marginBottom:10 },
  btnPrimary: { width:"100%", padding:"10px", background:"#238636", border:"1px solid #2ea043", borderRadius:6, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" },
};
