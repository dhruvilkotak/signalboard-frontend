// src/components/admin/AnnouncePanel.jsx
// Admin tab: email an update to approved users, using the approval-email look.
// Write plain text: blank line = new section, the first line of a section is
// its heading, "- " lines are bullets, links become clickable. Each email
// starts with "Hi <first name>," automatically.
// Flow: Preview → Send test to me → Send to selected (click twice to confirm).

import { useEffect, useState } from "react";
import { getAnnounceRecipients, previewAnnouncement, sendAnnouncement } from "../../lib/api";

const DEFAULT_SUBJECT = "SignalBoard update: your free 7-day trial has started";
const DEFAULT_BODY = `I've rolled out a few updates to SignalBoard. Here's what's new:

🎁 Free 7-day trial — started today
You have full access to AI Signals, AI Chat and the Auto-Trader until Monday, Nov 23 (around 12:20 PM PT). You'll see a "Trial: X days left" badge at the top of the app.

⚡ On-demand AI signals
In Live Prices → AI Signal tab, each new signal now asks you to confirm before it uses one of your signals. You get 5 in total. Opening the same stock again on the same day is free, and all signals refresh at 11:59 PM ET.

💼 Manual Trades is always free
Manual Trades now has its own tab next to Live Prices. Your manual positions are never affected by the trial.

🤖 Auto-Trader — please read
When Auto-Trader access ends, any Auto-Trader strategies are paused and converted to (paper) cash at the next trading session. This is simulated money only, and your Manual Trades positions are not touched.

🎟 Want to keep full access after the trial?
Just reply to this email and I'll send you a coupon code. Redeem it with the "🎟 Redeem code" button at the top of the app.

Paid plans will come later; for now everything above is free. If anything looks wrong or confusing, just reply and let me know.

Thanks,
Dhruvil`;

export default function AnnouncePanel() {
  const [subject, setSubject]     = useState(DEFAULT_SUBJECT);
  const [body, setBody]           = useState(DEFAULT_BODY);
  const [people, setPeople]       = useState(null);     // [{uid,name,email}]
  const [emailOk, setEmailOk]     = useState(true);
  const [selected, setSelected]   = useState(new Set());
  const [preview, setPreview]     = useState(null);     // html
  const [busy, setBusy]           = useState(null);     // "preview" | "test" | "send"
  const [armed, setArmed]         = useState(false);    // second click confirms the real send
  const [msg, setMsg]             = useState(null);
  const [result, setResult]       = useState(null);

  useEffect(() => {
    getAnnounceRecipients()
      .then(r => {
        setPeople(r.recipients);
        setEmailOk(r.email_configured);
        setSelected(new Set(r.recipients.map(u => u.uid)));
      })
      .catch(e => setMsg({ type: "error", text: `❌ Couldn't load users: ${e.detail?.message || e.message}` }));
  }, []);

  useEffect(() => { setArmed(false); }, [subject, body, selected]);

  const err = (e) => setMsg({ type: "error", text: `❌ ${e.detail?.message || e.message}` });
  const toggle = (uid) => setSelected(s => { const n = new Set(s); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });
  const all = people && selected.size === people.length;

  async function doPreview() {
    setBusy("preview"); setMsg(null);
    try { setPreview((await previewAnnouncement({ subject, body })).html); } catch (e) { err(e); }
    setBusy(null);
  }

  async function doTest() {
    setBusy("test"); setMsg(null);
    try {
      const r = await sendAnnouncement({ subject, body, test: true });
      setMsg(r.sent.length
        ? { type: "ok", text: `✅ Test sent to ${r.sent[0]} (subject starts with [TEST]). Check your inbox and spam folder.` }
        : { type: "error", text: "❌ Test email failed. Check the server logs (Gmail SMTP)." });
    } catch (e) { err(e); }
    setBusy(null);
  }

  async function doSend() {
    if (!armed) { setArmed(true); return; }
    setBusy("send"); setMsg(null); setArmed(false);
    try {
      const r = await sendAnnouncement({ subject, body, uids: [...selected], test: false });
      setResult(r);
      setMsg(r.failed.length
        ? { type: "error", text: `⚠️ Sent to ${r.sent.length}, failed for ${r.failed.length}.` }
        : { type: "ok", text: `✅ Sent to ${r.sent.length} user${r.sent.length === 1 ? "" : "s"}.` });
    } catch (e) { err(e); }
    setBusy(null);
  }

  return (
    <div>
      <p style={helpText}>
        Email an update to approved users. It uses the same design as the approval email and starts with
        "Hi &lt;first name&gt;," for each person. Write plain text: a blank line starts a new section, the first
        line of a section becomes its heading, lines starting with "- " become bullets, and links are clickable.
      </p>

      {!emailOk && (
        <div style={{ ...banner, background: "#2a0808", border: "1px solid #f85149", color: "#f85149" }}>
          Email isn't configured on the server (GMAIL_APP_PASSWORD), so sending will fail.
        </div>
      )}
      {msg && (
        <div style={{ ...banner,
          background: msg.type === "ok" ? "#0d2a1a" : "#2a0808",
          border: `1px solid ${msg.type === "ok" ? "#2ea043" : "#f85149"}`,
          color: msg.type === "ok" ? "#3fb950" : "#f85149" }}>
          <span style={{ flex: 1 }}>{msg.text}</span>
          <button style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16 }}
            onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      <h2 style={sectionTitle}>Message</h2>
      <label style={label}>Subject</label>
      <input style={input} value={subject} maxLength={150} onChange={e => setSubject(e.target.value)} />
      <label style={{ ...label, marginTop: 12 }}>Body</label>
      <textarea style={{ ...input, minHeight: 320, fontFamily: "inherit", lineHeight: 1.5, resize: "vertical" }}
        value={body} maxLength={10000} onChange={e => setBody(e.target.value)} />

      <h2 style={{ ...sectionTitle, marginTop: 24 }}>
        Recipients {people && <span style={{ color: "#8b949e", fontWeight: 400 }}>({selected.size} of {people.length} selected)</span>}
      </h2>
      {!people ? <div style={empty}>Loading…</div> : people.length === 0 ? <div style={empty}>No approved users.</div> : (
        <div style={recipBox}>
          <label style={recipRow}>
            <input type="checkbox" checked={all}
              onChange={() => setSelected(all ? new Set() : new Set(people.map(u => u.uid)))} />
            <span style={{ color: "#e6edf3", fontWeight: 600 }}>All approved users</span>
          </label>
          {people.map(u => (
            <label key={u.uid} style={recipRow}>
              <input type="checkbox" checked={selected.has(u.uid)} onChange={() => toggle(u.uid)} />
              <span style={{ color: "#e6edf3" }}>{u.name || "—"}</span>
              <span style={{ color: "#8b949e" }}>{u.email}</span>
            </label>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <button style={btnSecondary} disabled={!!busy} onClick={doPreview}>
          {busy === "preview" ? "Loading…" : "👁 Preview"}
        </button>
        <button style={btnSecondary} disabled={!!busy} onClick={doTest}>
          {busy === "test" ? "Sending…" : "🧪 Send test to me"}
        </button>
        <button style={{ ...(armed ? btnDanger : btnPrimary), opacity: busy || !selected.size ? 0.6 : 1 }}
          disabled={!!busy || !selected.size} onClick={doSend}>
          {busy === "send" ? "Sending…"
            : armed ? `Click again to send to ${selected.size} user${selected.size === 1 ? "" : "s"}`
            : `📣 Send to ${selected.size} selected`}
        </button>
        {armed && <button style={btnGhost} onClick={() => setArmed(false)}>Cancel</button>}
      </div>

      {result && (
        <div style={{ marginTop: 16, fontSize: 13, color: "#8b949e" }}>
          {result.sent.length > 0 && <div>✅ Sent: {result.sent.join(", ")}</div>}
          {result.failed.length > 0 && <div style={{ color: "#f85149" }}>❌ Failed: {result.failed.join(", ")}</div>}
        </div>
      )}

      {preview && (
        <>
          <h2 style={{ ...sectionTitle, marginTop: 24 }}>Preview <span style={{ color: "#8b949e", fontWeight: 400 }}>(shown with your first name)</span></h2>
          <iframe title="Email preview" srcDoc={preview} sandbox=""
            style={{ width: "100%", maxWidth: 640, height: 720, border: "1px solid #30363d", borderRadius: 8, background: "#0d1117" }} />
        </>
      )}
    </div>
  );
}

// ── Styles (same values as Admin.jsx) ─────────────────────────────────────────
const helpText     = { color:"#8b949e", fontSize:13, marginBottom:"1rem", lineHeight:1.6 };
const sectionTitle = { fontSize:15, fontWeight:600, color:"#e6edf3", margin:"0 0 0.75rem" };
const label        = { display:"block", fontSize:11, color:"#8b949e", marginBottom:4 };
const banner       = { padding:"10px 14px", borderRadius:6, fontSize:13, marginBottom:16, display:"flex", alignItems:"center", gap:12 };
const input        = { padding:"9px 12px", background:"#0d1117", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" };
const recipBox     = { border:"1px solid #30363d", borderRadius:8, padding:"6px 0", maxHeight:280, overflowY:"auto" };
const recipRow     = { display:"flex", alignItems:"center", gap:10, padding:"6px 12px", fontSize:13, cursor:"pointer" };
const btnPrimary   = { padding:"9px 16px", background:"#238636", border:"1px solid #2ea043", borderRadius:6, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" };
const btnSecondary = { padding:"9px 16px", background:"#161b22", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:13, cursor:"pointer" };
const btnDanger    = { padding:"9px 16px", background:"#da3633", border:"1px solid #f85149", borderRadius:6, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" };
const btnGhost     = { padding:"9px 8px", background:"none", border:"none", color:"#8b949e", fontSize:13, cursor:"pointer" };
const empty        = { color:"#8b949e", fontSize:13, padding:"1rem 0" };
