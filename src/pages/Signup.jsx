// src/pages/Signup.jsx
// Registration — Google OR email/password + reCAPTCHA + Terms modal

import { useState, useEffect, useRef } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, provider, db } from "../lib/firebase";
import TermsModal from "../components/TermsModal";

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export default function Signup({ onBackToLogin }) {
  const [method,       setMethod]       = useState(null); // null | "email" | "google"
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
    email:   "",
    password:"",
    confirm: "",
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
    if (method === "email") {
      if (!form.email.trim())       return "Please enter your email.";
      if (form.password.length < 6) return "Password must be at least 6 characters.";
      if (form.password !== form.confirm) return "Passwords don't match.";
    }
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
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setErrorMsg(err); return; }
    setLoading(true);
    setErrorMsg(null);

    try {
      if (method === "email") {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await saveUser(cred.user, "email");
        await signOut(auth);
      } else {
        const cred = await signInWithPopup(auth, provider);
        await saveUser(cred.user, "google");
        await signOut(auth);
      }
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

  // ── Method selector ────────────────────────────────────────────────────────
  if (!method) {
    return (
      <div style={s.bg}>
        <div style={s.card}>
          <div style={s.logo}>
            <span style={s.logoText}>SignalBoard</span>
            <span style={s.logoSub}>Request Access</span>
          </div>
          <p style={{ fontSize:13, color:"#8b949e", textAlign:"center", marginBottom:"1.5rem", lineHeight:1.6 }}>
            Choose how you'd like to create your account.
          </p>

          <button style={s.methodCard} onClick={() => setMethod("google")}>
            <svg width="22" height="22" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <div style={{ flex:1, textAlign:"left" }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#e6edf3" }}>Continue with Google</div>
              <div style={{ fontSize:12, color:"#8b949e", marginTop:2 }}>Quick setup using your Google account</div>
            </div>
            <span style={{ color:"#8b949e" }}>→</span>
          </button>

          <div style={s.divider}>
            <span style={s.dividerLine} />
            <span style={s.dividerText}>or</span>
            <span style={s.dividerLine} />
          </div>

          <button style={s.methodCard} onClick={() => setMethod("email")}>
            <span style={{ fontSize:22 }}>✉️</span>
            <div style={{ flex:1, textAlign:"left" }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#e6edf3" }}>Sign up with Email</div>
              <div style={{ fontSize:12, color:"#8b949e", marginTop:2 }}>Create account with email and password</div>
            </div>
            <span style={{ color:"#8b949e" }}>→</span>
          </button>

          <p style={{ textAlign:"center", fontSize:12, color:"#8b949e", marginTop:"1.5rem" }}>
            Already have an account?{" "}
            <button style={s.linkBtn} onClick={onBackToLogin}>Sign In</button>
          </p>
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
            {method === "google" ? "Request Access with Google" : "Request Access with Email"}
          </span>
        </div>

        {errorMsg && <div style={s.error}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} style={s.form}>

          {/* Name */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Full Name *</label>
            <input style={s.input} type="text" placeholder="Your full name"
              value={form.name} onChange={e => set("name", e.target.value)} required />
          </div>

          {/* Email + Password (email method only) */}
          {method === "email" && <>
            <div style={s.fieldGroup}>
              <label style={s.label}>Email *</label>
              <input style={s.input} type="email" placeholder="your@email.com"
                value={form.email} onChange={e => set("email", e.target.value)} required />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Password *</label>
              <input style={s.input} type="password" placeholder="Min 6 characters"
                value={form.password} onChange={e => set("password", e.target.value)}
                autoComplete="new-password" required />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Confirm Password *</label>
              <input style={s.input} type="password" placeholder="Repeat password"
                value={form.confirm} onChange={e => set("confirm", e.target.value)}
                autoComplete="new-password" required />
            </div>
          </>}

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
            {loading ? "Submitting…" :
              method === "google" ? "Request Access with Google" : "Request Access with Email"}
          </button>

        </form>

        <p style={{ textAlign:"center", fontSize:12, color:"#8b949e", marginTop:"1rem" }}>
          <button style={s.linkBtn} onClick={() => { setMethod(null); setErrorMsg(null); }}>
            ← Back
          </button>
          {" · "}
          <button style={s.linkBtn} onClick={onBackToLogin}>Sign In</button>
        </p>
      </div>
    </div>
  );
}

function friendlyError(code) {
  const map = {
    "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
    "auth/weak-password":        "Password must be at least 6 characters.",
    "auth/invalid-email":        "Please enter a valid email address.",
    "auth/popup-closed-by-user": "Google sign-up was cancelled.",
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