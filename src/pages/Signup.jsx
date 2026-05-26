// src/pages/Signup.jsx
// Registration form — creates pending account awaiting admin approval

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, provider, db } from "../lib/firebase";

export default function Signup({ onBackToLogin }) {
  const [step,     setStep]     = useState("form"); // form | pending | error
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [form, setForm] = useState({
    name:        "",
    email:       "",
    password:    "",
    confirm:     "",
    reason:      "",
    notRobot:    false,
    agreeTerms:  false,
    agreeData:   false,
    agreePaper:  false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.name.trim())        return "Please enter your full name.";
    if (!form.email.trim())       return "Please enter your email.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirm) return "Passwords don't match.";
    if (!form.reason.trim())      return "Please tell us why you want access.";
    if (!form.notRobot)           return "Please confirm you are not a robot.";
    if (!form.agreeTerms)         return "Please agree to the Terms of Use.";
    if (!form.agreePaper)         return "Please acknowledge this is paper trading only.";
    if (!form.agreeData)          return "Please agree to the data use policy.";
    return null;
  };

  const createPendingUser = async (firebaseUser) => {
    await setDoc(doc(db, "users", firebaseUser.uid), {
      name:        form.name.trim(),
      email:       firebaseUser.email.toLowerCase(),
      reason:      form.reason.trim(),
      status:      "pending",
      created_at:  serverTimestamp(),
      approved_at: null,
      approved_by: null,
      agreed_terms:     true,
      agreed_data_use:  form.agreeData,
      agreed_paper:     true,
      provider:    "email",
    });
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setErrorMsg(err); return; }
    setLoading(true);
    setErrorMsg(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await createPendingUser(cred.user);
      await signOut(auth); // sign out immediately — pending approval
      setStep("pending");
    } catch (e) {
      setErrorMsg(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!form.name.trim())   { setErrorMsg("Please enter your full name first."); return; }
    if (!form.reason.trim()) { setErrorMsg("Please tell us why you want access."); return; }
    if (!form.notRobot)      { setErrorMsg("Please confirm you are not a robot."); return; }
    if (!form.agreeTerms)    { setErrorMsg("Please agree to the Terms of Use."); return; }
    if (!form.agreePaper)    { setErrorMsg("Please acknowledge this is paper trading only."); return; }
    if (!form.agreeData)     { setErrorMsg("Please agree to the data use policy."); return; }

    setLoading(true);
    setErrorMsg(null);
    try {
      const cred = await signInWithPopup(auth, provider);
      // Override email with Google email
      await setDoc(doc(db, "users", cred.user.uid), {
        name:        form.name.trim(),
        email:       cred.user.email.toLowerCase(),
        reason:      form.reason.trim(),
        status:      "pending",
        created_at:  serverTimestamp(),
        approved_at: null,
        approved_by: null,
        agreed_terms:    true,
        agreed_data_use: form.agreeData,
        agreed_paper:    true,
        provider:    "google",
      });
      await signOut(auth); // sign out immediately — pending approval
      setStep("pending");
    } catch (e) {
      setErrorMsg(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  // ── Pending screen ─────────────────────────────────────────────────────────
  if (step === "pending") {
    return (
      <div style={s.bg}>
        <div style={s.card}>
          <div style={s.logo}>
            <span style={s.logoText}>SignalBoard</span>
          </div>
          <div style={s.pendingIcon}>⏳</div>
          <h2 style={s.pendingTitle}>Request Submitted!</h2>
          <p style={s.pendingText}>
            Thanks <strong>{form.name.split(" ")[0]}</strong>! Your account request has been received.
            You'll get an email at <strong>{form.email || "your email"}</strong> once admin approves your access.
            This usually takes less than 24 hours.
          </p>
          <button style={s.btnSecondary} onClick={onBackToLogin}>
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Signup form ────────────────────────────────────────────────────────────
  return (
    <div style={s.bg}>
      <div style={{ ...s.card, maxWidth: 480 }}>
        <div style={s.logo}>
          <span style={s.logoText}>SignalBoard</span>
          <span style={s.logoSub}>Request Access</span>
        </div>

        {errorMsg && <div style={s.error}>{errorMsg}</div>}

        <form onSubmit={handleEmailSignup} style={s.form}>

          {/* Name */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Full Name</label>
            <input
              style={s.input}
              type="text"
              placeholder="Your full name"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Email (for email/password signup)</label>
            <input
              style={s.input}
              type="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={e => set("email", e.target.value)}
            />
          </div>

          {/* Password */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={e => set("password", e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {/* Confirm */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Confirm Password</label>
            <input
              style={s.input}
              type="password"
              placeholder="Repeat password"
              value={form.confirm}
              onChange={e => set("confirm", e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {/* Reason */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Why do you want access?</label>
            <textarea
              style={{ ...s.input, height: 80, resize: "vertical" }}
              placeholder="Tell us a bit about yourself and why you're interested in SignalBoard..."
              value={form.reason}
              onChange={e => set("reason", e.target.value)}
              required
            />
          </div>

          {/* Checkboxes */}
          <div style={s.checkboxGroup}>
            <label style={s.checkboxRow}>
              <input type="checkbox" checked={form.notRobot} onChange={e => set("notRobot", e.target.checked)} />
              <span>I am not a robot</span>
            </label>
            <label style={s.checkboxRow}>
              <input type="checkbox" checked={form.agreeTerms} onChange={e => set("agreeTerms", e.target.checked)} />
              <span>I agree to the <a href="#" style={s.link}>Terms of Use</a></span>
            </label>
            <label style={s.checkboxRow}>
              <input type="checkbox" checked={form.agreePaper} onChange={e => set("agreePaper", e.target.checked)} />
              <span>I understand SignalBoard uses <strong>paper trading only</strong> — no real money involved</span>
            </label>
            <label style={s.checkboxRow}>
              <input type="checkbox" checked={form.agreeData} onChange={e => set("agreeData", e.target.checked)} />
              <span>I consent to my anonymous trading activity being used to improve signal accuracy. My personal data is stored securely via Google Firebase and never sold.</span>
            </label>
          </div>

          {/* Submit */}
          <button style={s.btnPrimary} type="submit" disabled={loading}>
            {loading ? "Submitting…" : "Request Access with Email"}
          </button>

        </form>

        {/* Divider */}
        <div style={s.divider}>
          <span style={s.dividerLine} />
          <span style={s.dividerText}>or</span>
          <span style={s.dividerLine} />
        </div>

        {/* Google */}
        <button style={s.btnGoogle} onClick={handleGoogleSignup} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Request Access with Google
        </button>

        <p style={s.footer}>
          Already have an account?{" "}
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
  divider:      { display:"flex", alignItems:"center", gap:8, margin:"1.25rem 0" },
  dividerLine:  { flex:1, height:1, background:"#30363d" },
  dividerText:  { fontSize:12, color:"#8b949e" },
  btnGoogle:    { display:"flex", alignItems:"center", justifyContent:"center", width:"100%", padding:"10px", background:"#0d1117", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:14, fontWeight:500, cursor:"pointer" },
  footer:       { textAlign:"center", fontSize:12, color:"#8b949e", marginTop:"1.25rem", marginBottom:0 },
  pendingIcon:  { fontSize:48, textAlign:"center", marginBottom:"0.5rem" },
  pendingTitle: { fontSize:20, fontWeight:700, color:"#e6edf3", textAlign:"center", margin:"0 0 1rem" },
  pendingText:  { fontSize:13, color:"#8b949e", lineHeight:1.6, textAlign:"center", marginBottom:"1.5rem" },
  btnSecondary: { width:"100%", padding:"10px", background:"transparent", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:13, cursor:"pointer" },
};