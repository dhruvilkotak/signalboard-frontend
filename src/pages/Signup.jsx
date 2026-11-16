// src/pages/Signup.jsx
// Registration — Google only (verified email) + reCAPTCHA + Terms modal.
// Email/password sign-up was removed so nobody can register with a fake address.
// Existing email/password accounts can still sign in on the Login page.

import { useState, useEffect, useRef } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, provider, db } from "../lib/firebase";
import TermsModal, { TERMS_VERSION } from "../components/TermsModal";

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export default function Signup({ onBackToLogin }) {
  const method = "google";                              // only sign-up method
  const [step,         setStep]         = useState("form"); // form | pending
  const [loading,      setLoading]      = useState(false);
  const [errorMsg,     setErrorMsg]     = useState(null);
  const [showTerms,    setShowTerms]    = useState(false);
  const [agreedTerms,  setAgreedTerms]  = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const widgetId   = useRef(null);

  const [form, setForm] = useState({
    name:    "",
    reason:  "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Load reCAPTCHA script ─────────────────────────────────────────────────
  useEffect(() => {
    if (!method) return;
    const scriptId = "recaptcha-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id  = scriptId;
      script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    window.onRecaptchaLoad = () => {
      if (captchaRef.current && widgetId.current === null) {
        widgetId.current = window.grecaptcha.render(captchaRef.current, {
          sitekey:  RECAPTCHA_SITE_KEY,
          callback: (token) => setCaptchaToken(token),
          "expired-callback": () => setCaptchaToken(null),
        });
      }
    };

    if (window.grecaptcha && captchaRef.current && widgetId.current === null) {
      widgetId.current = window.grecaptcha.render(captchaRef.current, {
        sitekey:  RECAPTCHA_SITE_KEY,
        callback: (token) => setCaptchaToken(token),
        "expired-callback": () => setCaptchaToken(null),
      });
    }
  }, [method]);

  const validate = () => {
    if (!form.name.trim())   return "Please enter your full name.";
    if (!form.reason.trim()) return "Please tell us why you want access.";
    if (!agreedTerms)        return "Please read and agree to the Terms of Use & Privacy Policy.";
    if (!captchaToken)       return "Please complete the reCAPTCHA verification.";
    return null;
  };

  const saveUser = async (firebaseUser, providerName) => {
    await setDoc(doc(db, "users", firebaseUser.uid), {
      name:                 form.name.trim(),
      email:                firebaseUser.email.toLowerCase(),
      reason:               form.reason.trim(),
      status:               "pending",
      created_at:           serverTimestamp(),
      approved_at:          null,
      approved_by:          null,
      agreed_terms:         true,
      agreed_terms_version: "v1.0",
      agreed_terms_at:      serverTimestamp(),
      provider:             providerName,
      agreed_terms_version: TERMS_VERSION,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setErrorMsg(err); return; }
    setLoading(true);
    setErrorMsg(null);

    try {
      const cred = await signInWithPopup(auth, provider);
      // Already registered with this Google account? Don't overwrite their profile.
      const existing = await getDoc(doc(db, "users", cred.user.uid));
      if (existing.exists()) {
        await signOut(auth);
        const st = existing.data()?.status;
        setErrorMsg(st === "pending"
          ? "You've already requested access with this Google account. We'll email you once it's approved."
          : "You already have an account with this Google account. Please sign in instead.");
        return;
      }
      await saveUser(cred.user, "google");
      await signOut(auth);
      setStep("pending");
    } catch (e) {
      setErrorMsg(friendlyError(e.code));
      // Reset captcha on error
      if (window.grecaptcha && widgetId.current !== null) {
        window.grecaptcha.reset(widgetId.current);
        setCaptchaToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Pending screen ─────────────────────────────────────────────────────────
  if (step === "pending") {
    return (
      <div style={s.bg}>
        <div style={s.card}>
          <div style={s.logo}><span style={s.logoText}>SignalBoard</span></div>
          <div style={{ fontSize:56, textAlign:"center", marginBottom:"0.75rem" }}>⏳</div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#e6edf3", textAlign:"center", margin:"0 0 1rem" }}>
            Request Submitted!
          </h2>
          <p style={{ fontSize:13, color:"#8b949e", lineHeight:1.6, textAlign:"center", marginBottom:"0.75rem" }}>
            Thanks <strong style={{ color:"#e6edf3" }}>{form.name.split(" ")[0] || "there"}</strong>!
            Your account request is under review.
          </p>
          <p style={{ fontSize:13, color:"#8b949e", lineHeight:1.6, textAlign:"center", marginBottom:"1.5rem" }}>
            You'll receive an email once admin approves your access.
            This usually takes less than 24 hours.
          </p>
          <button style={s.btnSecondary} onClick={onBackToLogin}>Back to Sign In</button>
        </div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <div style={s.bg}>
      {showTerms && (
        <TermsModal
          onAccept={() => { setAgreedTerms(true); setShowTerms(false); }}
          onClose={() => setShowTerms(false)}
        />
      )}

      <div style={{ ...s.card, maxWidth:480 }}>
        <div style={s.logo}>
          <span style={s.logoText}>SignalBoard</span>
          <span style={s.logoSub}>
            Request Access with Google
          </span>
        </div>

        <p style={{ fontSize:12, color:"#8b949e", textAlign:"center", margin:"0 0 1rem", lineHeight:1.6 }}>
          Fill in the form, then sign in with your Google account to send your request.
          We use your Google email, so no password is needed.
        </p>

        {errorMsg && <div style={s.error}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} style={s.form}>

          {/* Name */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Full Name *</label>
            <input style={s.input} type="text" placeholder="Your full name"
              value={form.name} onChange={e => set("name", e.target.value)} required />
          </div>

          {/* Reason */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Why do you want access? *</label>
            <textarea style={{ ...s.input, height:80, resize:"vertical" }}
              placeholder="Tell us a bit about yourself and why you're interested..."
              value={form.reason} onChange={e => set("reason", e.target.value)} required />
          </div>

          {/* Terms agreement */}
          <div style={s.termsRow}>
            <div style={s.termsCheck}>
              {agreedTerms ? (
                <span style={{ color:"#3fb950", fontSize:18 }}>✓</span>
              ) : (
                <span style={{ color:"#8b949e", fontSize:18 }}>○</span>
              )}
            </div>
            <div style={{ flex:1, fontSize:13, color:"#8b949e", lineHeight:1.5 }}>
              I have read and agree to the{" "}
              <button type="button" style={s.termsLink} onClick={() => setShowTerms(true)}>
                Terms of Use & Privacy Policy
              </button>
              {agreedTerms && <span style={{ color:"#3fb950", marginLeft:6, fontSize:12 }}>✓ Agreed</span>}
              {!agreedTerms && (
                <button type="button" style={{ ...s.termsLink, marginLeft:8, fontSize:11, color:"#f0a000" }}
                  onClick={() => setShowTerms(true)}>
                  (click to read)
                </button>
              )}
            </div>
          </div>

          {/* reCAPTCHA */}
          <div style={{ display:"flex", justifyContent:"center", margin:"0.5rem 0" }}>
            <div ref={captchaRef} />
          </div>

          <button style={s.btnPrimary} type="submit" disabled={loading}>
            {loading ? "Opening Google…" : "Continue with Google"}
          </button>

        </form>

        <p style={{ textAlign:"center", fontSize:12, color:"#8b949e", marginTop:"1rem" }}>
          Already have an account?{" "}
          <button style={s.linkBtn} onClick={onBackToLogin}>Sign In</button>
        </p>
      </div>
    </div>
  );
}

function friendlyError(code) {
  const map = {
    "auth/popup-closed-by-user":   "Google sign-up was cancelled.",
    "auth/cancelled-popup-request": "Google sign-up was cancelled.",
    "auth/popup-blocked":          "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

const s = {
  bg:          { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0d1117", padding:"2rem 1rem" },
  card:        { background:"#161b22", border:"1px solid #30363d", borderRadius:12, padding:"2rem", width:"100%" },
  logo:        { textAlign:"center", marginBottom:"1.5rem" },
  logoText:    { display:"block", fontSize:24, fontWeight:700, color:"#e6edf3", letterSpacing:"-0.5px" },
  logoSub:     { display:"block", fontSize:12, color:"#8b949e", marginTop:4 },
  error:       { background:"#3d1515", border:"1px solid #f85149", color:"#f85149", borderRadius:6, padding:"10px 14px", fontSize:13, marginBottom:"1rem" },
  form:        { display:"flex", flexDirection:"column", gap:"1rem" },
  fieldGroup:  { display:"flex", flexDirection:"column", gap:4 },
  label:       { fontSize:12, color:"#8b949e", fontWeight:500 },
  input:       { padding:"10px 12px", background:"#0d1117", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:13, outline:"none", boxSizing:"border-box", width:"100%" },
  termsRow:    { display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", background:"#0d1117", border:"1px solid #30363d", borderRadius:6 },
  termsCheck:  { flexShrink:0, marginTop:1 },
  termsLink:   { background:"none", border:"none", color:"#58a6ff", cursor:"pointer", fontSize:13, padding:0, textDecoration:"underline" },
  divider:     { display:"flex", alignItems:"center", gap:8, margin:"1rem 0" },
  dividerLine: { flex:1, height:1, background:"#30363d" },
  dividerText: { fontSize:12, color:"#8b949e" },
  methodCard:  { display:"flex", alignItems:"center", gap:12, width:"100%", padding:"14px 16px", background:"#0d1117", border:"1px solid #30363d", borderRadius:8, cursor:"pointer", textAlign:"left" },
  btnPrimary:  { padding:"11px", background:"#238636", border:"1px solid #2ea043", borderRadius:6, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" },
  btnSecondary:{ width:"100%", padding:"10px", background:"transparent", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:13, cursor:"pointer" },
  linkBtn:     { background:"none", border:"none", color:"#58a6ff", cursor:"pointer", fontSize:12, padding:0 },
};