// src/pages/Signup.jsx
// Registration — choose Google OR email/password, not both

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, provider, db } from "../lib/firebase";

export default function Signup({ onBackToLogin }) {
  const [method,   setMethod]   = useState(null); // null | "email" | "google"
  const [step,     setStep]     = useState("form"); // form | pending
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [form, setForm] = useState({
    name:       "",
    email:      "",
    password:   "",
    confirm:    "",
    reason:     "",
    notRobot:   false,
    agreeTerms: false,
    agreePaper: false,
    agreeData:  false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validateCommon = () => {
    if (!form.name.trim())   return "Please enter your full name.";
    if (!form.reason.trim()) return "Please tell us why you want access.";
    if (!form.notRobot)      return "Please confirm you are not a robot.";
    if (!form.agreeTerms)    return "Please agree to the Terms of Use.";
    if (!form.agreePaper)    return "Please acknowledge this is paper trading only.";
    if (!form.agreeData)     return "Please agree to the data use policy.";
    return null;
  };

  const saveUser = async (firebaseUser, providerName) => {
    await setDoc(doc(db, "users", firebaseUser.uid), {
      name:            form.name.trim(),
      email:           firebaseUser.email.toLowerCase(),
      reason:          form.reason.trim(),
      status:          "pending",
      created_at:      serverTimestamp(),
      approved_at:     null,
      approved_by:     null,
      agreed_terms:    true,
      agreed_data_use: form.agreeData,
      agreed_paper:    true,
      provider:        providerName,
    });
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const err = validateCommon();
    if (err) { setErrorMsg(err); return; }
    if (!form.email.trim())        { setErrorMsg("Please enter your email."); return; }
    if (form.password.length < 6)  { setErrorMsg("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setErrorMsg("Passwords don't match."); return; }

    setLoading(true);
    setErrorMsg(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await saveUser(cred.user, "email");
      await signOut(auth);
      setStep("pending");
    } catch (e) {
      setErrorMsg(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async () => {
    const err = validateCommon();
    if (err) { setErrorMsg(err); return; }

    setLoading(true);
    setErrorMsg(null);
    try {
      const cred = await signInWithPopup(auth, provider);
      await saveUser(cred.user, "google");
      await signOut(auth);
      setStep("pending");
    } catch (e) {
      setErrorMsg(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  // ── Pending confirmation screen ───────────────────────────────────────────
  if (step === "pending") {
    return (
      <div style={s.bg}>
        <div style={s.card}>
          <div style={s.logo}><span style={s.logoText}>SignalBoard</span></div>
          <div style={{ fontSize:56, textAlign:"center", marginBottom:"0.75rem" }}>⏳</div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#e6edf3", textAlign:"center", margin:"0 0 1rem" }}>
            Request Submitted!
          </h2>
          <p style={{ fontSize:13, color:"#8b949e", lineHeight:1.6, textAlign:"center", marginBottom:"1.5rem" }}>
            Thanks <strong style={{ color:"#e6edf3" }}>{form.name.split(" ")[0]}</strong>!
            Your account is pending approval. You'll be notified once admin reviews your request.
            This usually takes less than 24 hours.
          </p>
          <button style={s.btnSecondary} onClick={onBackToLogin}>Back to Sign In</button>
        </div>
      </div>
    );
  }

  // ── Method selector ───────────────────────────────────────────────────────
  if (!method) {
    return (
      <div style={s.bg}>
        <div style={s.card}>
          <div style={s.logo}>
            <span style={s.logoText}>SignalBoard</span>
            <span style={s.logoSub}>Request Access</span>
          </div>
          <p style={{ fontSize:13, color:"#8b949e", textAlign:"center", marginBottom:"1.5rem", lineHeight:1.6 }}>
            Choose how you'd like to sign up. You'll be asked a few questions before your request is reviewed.
          </p>

          {/* Google option */}
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

          {/* Email option */}
          <button style={s.methodCard} onClick={() => setMethod("email")}>
            <span style={{ fontSize:22 }}>✉️</span>
            <div style={{ flex:1, textAlign:"left" }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#e6edf3" }}>Sign up with Email</div>
              <div style={{ fontSize:12, color:"#8b949e", marginTop:2 }}>Create account with email and password</div>
            </div>
            <span style={{ color:"#8b949e" }}>→</span>
          </button>

          <p style={{ ...s.footer, marginTop:"1.5rem" }}>
            Already have an account?{" "}
            <button style={s.linkBtn} onClick={onBackToLogin}>Sign In</button>
          </p>
        </div>
      </div>
    );
  }

  // ── Common fields shown for both methods ──────────────────────────────────
  return (
    <div style={s.bg}>
      <div style={{ ...s.card, maxWidth: 480 }}>
        <div style={s.logo}>
          <span style={s.logoText}>SignalBoard</span>
          <span style={s.logoSub}>
            {method === "google" ? "Request Access with Google" : "Request Access with Email"}
          </span>
        </div>

        {errorMsg && <div style={s.error}>{errorMsg}</div>}

        <form onSubmit={method === "email" ? handleEmailSubmit : e => { e.preventDefault(); handleGoogleSubmit(); }} style={s.form}>

          {/* Name — always */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Full Name *</label>
            <input style={s.input} type="text" placeholder="Your full name"
              value={form.name} onChange={e => set("name", e.target.value)} required />
          </div>

          {/* Email + Password — only for email method */}
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

          {/* Reason — always */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Why do you want access? *</label>
            <textarea style={{ ...s.input, height:80, resize:"vertical" }}
              placeholder="Tell us a bit about yourself..."
              value={form.reason} onChange={e => set("reason", e.target.value)} required />
          </div>

          {/* Checkboxes — always */}
          <div style={s.checkboxGroup}>
            {[
              { key:"notRobot",   label: "I am not a robot" },
              { key:"agreeTerms", label: <>I agree to the <a href="#" style={s.link}>Terms of Use</a></> },
              { key:"agreePaper", label: <>I understand SignalBoard uses <strong>paper trading only</strong> — no real money involved</> },
              { key:"agreeData",  label: "I consent to my anonymous trading activity being used to improve signal accuracy. My personal data is stored securely via Google Firebase and never sold." },
            ].map(({ key, label }) => (
              <label key={key} style={s.checkboxRow}>
                <input type="checkbox" checked={form[key]}
                  onChange={e => set(key, e.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <button style={s.btnPrimary} type="submit" disabled={loading}>
            {loading ? "Submitting…" :
              method === "google" ? "Request Access with Google" : "Request Access with Email"}
          </button>

        </form>

        <p style={{ ...s.footer, marginTop:"1.25rem" }}>
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
  bg:           { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0d1117", padding:"2rem 1rem" },
  card:         { background:"#161b22", border:"1px solid #30363d", borderRadius:12, padding:"2rem", width:"100%" },
  logo:         { textAlign:"center", marginBottom:"1.5rem" },
  logoText:     { display:"block", fontSize:24, fontWeight:700, color:"#e6edf3", letterSpacing:"-0.5px" },
  logoSub:      { display:"block", fontSize:12, color:"#8b949e", marginTop:4 },
  error:        { background:"#3d1515", border:"1px solid #f85149", color:"#f85149", borderRadius:6, padding:"10px 14px", fontSize:13, marginBottom:"1rem" },
  form:         { display:"flex", flexDirection:"column", gap:"1rem" },
  fieldGroup:   { display:"flex", flexDirection:"column", gap:4 },
  label:        { fontSize:12, color:"#8b949e", fontWeight:500 },
  input:        { padding:"10px 12px", background:"#0d1117", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:13, outline:"none", boxSizing:"border-box", width:"100%" },
  checkboxGroup:{ display:"flex", flexDirection:"column", gap:10, padding:"4px 0" },
  checkboxRow:  { display:"flex", alignItems:"flex-start", gap:8, fontSize:12, color:"#8b949e", cursor:"pointer", lineHeight:1.5 },
  link:         { color:"#58a6ff", textDecoration:"none" },
  linkBtn:      { background:"none", border:"none", color:"#58a6ff", cursor:"pointer", fontSize:12, padding:0 },
  btnPrimary:   { padding:"11px", background:"#238636", border:"1px solid #2ea043", borderRadius:6, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" },
  btnSecondary: { width:"100%", padding:"10px", background:"transparent", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:13, cursor:"pointer" },
  divider:      { display:"flex", alignItems:"center", gap:8, margin:"1rem 0" },
  dividerLine:  { flex:1, height:1, background:"#30363d" },
  dividerText:  { fontSize:12, color:"#8b949e" },
  methodCard:   { display:"flex", alignItems:"center", gap:12, width:"100%", padding:"14px 16px", background:"#0d1117", border:"1px solid #30363d", borderRadius:8, cursor:"pointer", textAlign:"left", transition:"border-color 0.15s" },
  footer:       { textAlign:"center", fontSize:12, color:"#8b949e", marginBottom:0 },
};