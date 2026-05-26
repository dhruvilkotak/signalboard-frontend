// src/pages/PendingScreen.jsx
// Shown when user has signed up but not yet approved by admin

import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function PendingScreen({ user }) {
  return (
    <div style={s.bg}>
      <div style={s.card}>
        <div style={s.icon}>⏳</div>
        <h1 style={s.title}>Awaiting Approval</h1>
        <p style={s.text}>
          Thanks for signing up, <strong>{user?.displayName || user?.email}</strong>!
          Your account request is under review.
        </p>
        <p style={s.text}>
          You'll receive an email once admin approves your access.
          This usually takes less than 24 hours.
        </p>
        <div style={s.info}>
          <span>📧</span>
          <span>{user?.email}</span>
        </div>
        <button style={s.btn} onClick={() => signOut(auth)}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

const s = {
  bg:    { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0d1117", padding:"1rem" },
  card:  { background:"#161b22", border:"1px solid #30363d", borderRadius:12, padding:"2.5rem 2rem", width:"100%", maxWidth:420, textAlign:"center" },
  icon:  { fontSize:56, marginBottom:"1rem" },
  title: { fontSize:22, fontWeight:700, color:"#e6edf3", margin:"0 0 1rem" },
  text:  { fontSize:14, color:"#8b949e", lineHeight:1.6, margin:"0 0 0.75rem" },
  info:  { display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"#21262d", borderRadius:6, padding:"10px 16px", fontSize:13, color:"#e6edf3", margin:"1.25rem 0" },
  btn:   { padding:"10px 24px", background:"transparent", border:"1px solid #30363d", borderRadius:6, color:"#8b949e", fontSize:13, cursor:"pointer" },
};