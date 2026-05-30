// src/pages/Login.jsx
// Sign in only — with feature slideshow above the form

import { useState, useEffect } from "react";
import Signup from "./Signup";

const MONO = "'IBM Plex Mono', monospace";

const SLIDES = [
  {
    icon: "🤖",
    tag:  "AI-POWERED",
    tagColor: "#58a6ff",
    title: "Real AI Signal Generation",
    desc: "Claude AI analyses RSI, MACD, insider trades, and news sentiment to generate HIGH confidence BUY and SELL signals for top stocks.",
    stat1: { label: "Signals/day", value: "39+" },
    stat2: { label: "Data sources", value: "4" },
    preview: [
      { sym: "NVDA", sig: "BUY",  conf: "HIGH", ret: "+8.2%", color: "#3fb950" },
      { sym: "AAPL", sig: "SELL", conf: "HIGH", ret: "-4.5%", color: "#f85149" },
      { sym: "MSFT", sig: "BUY",  conf: "HIGH", ret: "+4.4%", color: "#3fb950" },
    ],
  },
  {
    icon: "📊",
    tag:  "SIGNAL FEED",
    tagColor: "#3fb950",
    title: "One Signal Per Symbol",
    desc: "The signal feed shows one card per stock — no duplicates. Each card shows expected return, target price, stop-loss, bull/bear case, and insider activity.",
    stat1: { label: "Confidence", value: "HIGH only" },
    stat2: { label: "History", value: "20 days" },
    preview: [
      { sym: "HOOD", sig: "BUY",  conf: "HIGH", ret: "+11.75%", color: "#3fb950" },
      { sym: "AMZN", sig: "BUY",  conf: "HIGH", ret: "+4.20%",  color: "#3fb950" },
      { sym: "JEPQ", sig: "SELL", conf: "HIGH", ret: "-5.36%",  color: "#f85149" },
    ],
  },
  {
    icon: "⚡",
    tag:  "AUTO-TRADER",
    tagColor: "#e3b341",
    title: "5 Automated Strategies",
    desc: "Allocate virtual funds to a strategy and the auto-trader handles everything — buys on BUY signals, sells on SELL signals, stops losses automatically every 60 seconds.",
    stat1: { label: "Strategies", value: "5" },
    stat2: { label: "Stop-loss", value: "60s check" },
    preview: [
      { sym: "Aggressive", sig: "25%/pos", conf: "HIGH", ret: "8% SL",  color: "#f85149" },
      { sym: "Balanced",   sig: "15%/pos", conf: "MED",  ret: "5% SL",  color: "#e3b341" },
      { sym: "Conservative", sig: "20%/pos", conf: "HIGH", ret: "3% SL", color: "#3fb950" },
    ],
  },
  {
    icon: "💬",
    tag:  "AI CHAT",
    tagColor: "#a371f7",
    title: "Ask Anything About Any Stock",
    desc: "Chat with Claude AI about any stock. It searches the web for current analyst targets, earnings, recent news, and technical setup — then gives you a clear analyst-style answer.",
    stat1: { label: "Web search", value: "Live" },
    stat2: { label: "Per message", value: "Real-time" },
    preview: [
      { sym: "Q: What's MSFT's analyst target?",   sig: "",      conf: "", ret: "", color: "#8b949e" },
      { sym: "A: Consensus target $465 (+8.9%)",   sig: "",      conf: "", ret: "", color: "#a371f7" },
      { sym: "Q: Is HOOD overbought right now?",   sig: "",      conf: "", ret: "", color: "#8b949e" },
    ],
  },
  {
    icon: "🔒",
    tag:  "BETA · INVITE ONLY",
    tagColor: "#58a6ff",
    title: "Virtual Trading · No Real Money",
    desc: "SignalBoard is an invite-only beta platform. All trading is virtual — you start with $10,000 in paper money. No real funds, no real trades, no financial risk.",
    stat1: { label: "Starting cash", value: "$10,000" },
    stat2: { label: "Real money", value: "Never" },
    preview: [
      { sym: "Available cash",   sig: "$7,501", conf: "", ret: "", color: "#3fb950" },
      { sym: "Strategy value",   sig: "$600",   conf: "", ret: "", color: "#58a6ff" },
      { sym: "Total P&L",        sig: "+$7.53", conf: "", ret: "", color: "#3fb950" },
    ],
  },
];

function Slideshow() {
  const [current, setCurrent] = useState(0);
  const [fading,  setFading]  = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent(c => (c + 1) % SLIDES.length);
        setFading(false);
      }, 300);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  function goTo(i) {
    if (i === current) return;
    setFading(true);
    setTimeout(() => { setCurrent(i); setFading(false); }, 300);
  }

  const slide = SLIDES[current];

  return (
    <div style={{
      background: "#0d1117",
      border: `1px solid ${slide.tagColor}30`,
      borderRadius: 12,
      padding: "24px 24px 18px",
      marginBottom: 20,
      transition: "border-color 0.4s",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${slide.tagColor}80, transparent)`,
        transition: "background 0.4s",
      }} />

      {/* Content */}
      <div style={{
        opacity: fading ? 0 : 1,
        transform: fading ? "translateY(6px)" : "translateY(0)",
        transition: "opacity 0.3s, transform 0.3s",
      }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>{slide.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{
                fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: 1,
                color: slide.tagColor, background: `${slide.tagColor}15`,
                border: `1px solid ${slide.tagColor}30`,
                borderRadius: 4, padding: "1px 6px",
              }}>{slide.tag}</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: "#e6edf3" }}>
              {slide.title}
            </div>
          </div>
          {/* Stats */}
          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
            {[slide.stat1, slide.stat2].map(({ label, value }) => (
              <div key={label} style={{ textAlign: "right" }}>
                <div style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681" }}>{label}</div>
                <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: slide.tagColor }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{
          fontFamily: MONO, fontSize: 11, color: "#8b949e",
          lineHeight: 1.8, marginBottom: 14,
        }}>{slide.desc}</div>

        {/* Preview rows */}
        <div style={{
          background: "#161b22", borderRadius: 8,
          border: "1px solid #21262d", overflow: "hidden",
        }}>
          {slide.preview.map((row, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px",
              borderBottom: i < slide.preview.length - 1 ? "1px solid #21262d" : "none",
            }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: "#e6edf3", flex: 1 }}>
                {row.sym}
              </span>
              {row.sig && (
                <span style={{
                  fontFamily: MONO, fontSize: 9, fontWeight: 700,
                  color: row.color, background: `${row.color}15`,
                  border: `1px solid ${row.color}30`,
                  borderRadius: 4, padding: "1px 7px", marginLeft: 8,
                }}>{row.sig}</span>
              )}
              {row.conf && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681", marginLeft: 8 }}>
                  {row.conf}
                </span>
              )}
              {row.ret && (
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: row.color, marginLeft: 8 }}>
                  {row.ret}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dots navigation */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} style={{
            width: i === current ? 24 : 7,
            height: 6, borderRadius: 3,
            background: i === current ? slide.tagColor : "#30363d",
            border: "none", cursor: "pointer", padding: 0,
            transition: "all 0.3s",
          }} />
        ))}
      </div>
    </div>
  );
}

export default function Login({ onLogin, onGoogle, error, loading }) {
  const [showSignup, setShowSignup] = useState(false);
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");

  if (showSignup) {
    return <Signup onBackToLogin={() => setShowSignup(false)} />;
  }

  return (
    <div style={s.bg}>
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logo}>
          <span style={s.logoText}>
            SignalBoard
            <span style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 700,
              color: "#58a6ff", background: "#1f6feb20",
              border: "1px solid #388bfd40",
              borderRadius: 4, padding: "1px 6px",
              marginLeft: 8, verticalAlign: "middle",
              letterSpacing: 1,
            }}>BETA</span>
          </span>
          <span style={s.logoSub}>AI Stock Signals · Invite Only</span>
        </div>

        {/* Slideshow */}
        <Slideshow />

        {/* Error */}
        {error && <div style={s.error}>{error}</div>}

        {/* Sign in form */}
        <form onSubmit={e => { e.preventDefault(); onLogin(email, password); }} style={s.form}>
          <input
            style={s.input} type="email" placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)}
            required autoComplete="email"
          />
          <input
            style={s.input} type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            required autoComplete="current-password"
          />
          <button style={s.btnPrimary} type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={s.divider}>
          <span style={s.dividerLine} />
          <span style={s.dividerText}>or</span>
          <span style={s.dividerLine} />
        </div>

        <button style={s.btnGoogle} onClick={onGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <div style={s.footer}>
          <span style={{ color:"#8b949e" }}>Don't have an account? </span>
          <button style={s.linkBtn} onClick={() => setShowSignup(true)}>
            Request Access
          </button>
        </div>

        <div style={{
          textAlign: "center", marginTop: 16,
          fontFamily: MONO, fontSize: 9, color: "#484f58",
          lineHeight: 1.6,
        }}>
          Beta · Virtual trading only · No real funds · Not financial advice
        </div>

      </div>
    </div>
  );
}

const s = {
  bg:         { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0d1117", padding:"1rem" },
  card:       { background:"#161b22", border:"1px solid #30363d", borderRadius:12, padding:"2rem", width:"100%", maxWidth:540 },
  logo:       { textAlign:"center", marginBottom:"1.5rem" },
  logoText:   { display:"block", fontSize:28, fontWeight:700, color:"#e6edf3", letterSpacing:"-0.5px" },
  logoSub:    { display:"block", fontSize:11, color:"#6e7681", marginTop:4, fontFamily:"'IBM Plex Mono',monospace" },
  error:      { background:"#3d1515", border:"1px solid #f85149", color:"#f85149", borderRadius:6, padding:"10px 14px", fontSize:13, marginBottom:"1rem" },
  form:       { display:"flex", flexDirection:"column", gap:"0.75rem" },
  input:      { padding:"10px 12px", background:"#0d1117", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:14, outline:"none", width:"100%", boxSizing:"border-box" },
  btnPrimary: { padding:"10px", background:"#238636", border:"1px solid #2ea043", borderRadius:6, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", marginTop:4 },
  divider:    { display:"flex", alignItems:"center", gap:8, margin:"1.25rem 0" },
  dividerLine:{ flex:1, height:1, background:"#30363d" },
  dividerText:{ fontSize:12, color:"#8b949e" },
  btnGoogle:  { display:"flex", alignItems:"center", justifyContent:"center", width:"100%", padding:"10px", background:"#0d1117", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:14, fontWeight:500, cursor:"pointer" },
  footer:     { textAlign:"center", fontSize:12, marginTop:"1.25rem" },
  linkBtn:    { background:"none", border:"none", color:"#58a6ff", cursor:"pointer", fontSize:12, padding:0 },
};