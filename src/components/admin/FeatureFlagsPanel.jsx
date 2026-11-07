// src/components/admin/FeatureFlagsPanel.jsx
// Admin tab: set each feature flag's mode (off / allowlist / on) and allowlist UIDs.
// Styled to match src/pages/Admin.jsx; calls the backend like InviteManager does.

import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { useFeatureFlagStore } from "../../hooks/useFeatureFlags";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";

const DESCRIPTIONS = {
pro_role:               "Pro role: all features, no admin powers",
terms_gate:             "Users must accept the latest Terms version",
paywall:                "5 lifetime on-demand signals, then paywall",
trial:                  "7-day trial of AI Signals, AI chat, Auto-Trader",
billing:                "Pricing page, Stripe checkout and portal",
coupons:                "Coupon code redemption",
autotrader_liquidation: "Convert Auto-Trader holdings to cash when access ends",
};

const MODE_COLOR = { off: "#8b949e", allowlist: "#f0a000", on: "#3fb950" };

const parseUids = (text) =>
[...new Set(text.split(/[\s,]+/).map(s => s.trim()).filter(Boolean))];

async function authedFetch(path, options = {}) {
const token = await auth.currentUser.getIdToken();
const res = await fetch(`${API}${path}`, {
...options,
headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, ...(options.headers || {}) },
});
const data = await res.json().catch(() => ({}));
if (!res.ok) {
const d = data.detail;
throw new Error(typeof d === "string" ? d : d?.code || `HTTP ${res.status}`);
}
return data;
}

export default function FeatureFlagsPanel() {
const [flags,   setFlags]   = useState(null);
const [modes,   setModes]   = useState(["off", "allowlist", "on"]);
const [drafts,  setDrafts]  = useState({});
const [saving,  setSaving]  = useState(null);
const [msg,     setMsg]     = useState(null);
const refreshMine = useFeatureFlagStore(s => s.fetchFlags);

useEffect(() => { load(); }, []);

async function load() {
try {
const data = await authedFetch("/api/admin/feature-flags");
setFlags(data.flags);
if (data.modes) setModes(data.modes);
setDrafts(Object.fromEntries(
Object.entries(data.flags).map(([k, v]) => [k, { mode: v.mode, uidsText: (v.uids || []).join("\n") }])
));
} catch (e) {
setMsg({ type: "error", text: `❌ Failed to load flags: ${e.message}` });
}
}

async function save(name) {
const d = drafts[name];
if (d.mode === "on" && !confirm(`Turn "${name}" ON for every user?`)) return;
setSaving(name);
setMsg(null);
try {
await authedFetch(`/api/admin/feature-flags/${name}`, {
method: "PUT",
body: JSON.stringify({ mode: d.mode, uids: parseUids(d.uidsText) }),
});
await load();
refreshMine();
setMsg({ type: "success", text: `✅ ${name} → ${d.mode}. Applies within 60s.` });
} catch (e) {
setMsg({ type: "error", text: `❌ Failed to save ${name}: ${e.message}` });
} finally {
setSaving(null);
}
}

function addMe(name) {
const me = auth.currentUser?.uid;
if (!me) return;
const d = drafts[name];
const uids = parseUids(d.uidsText);
if (!uids.includes(me)) uids.push(me);
setDrafts({ ...drafts, [name]: { ...d, uidsText: uids.join("\n") } });
}

if (!flags) return <div style={empty}>{msg?.text || "Loading…"}</div>;

return (
<div>
<p style={helpText}>
<strong style={{ color: "#e6edf3" }}>off</strong> = nobody ·{" "}
<strong style={{ color: "#e6edf3" }}>allowlist</strong> = only listed UIDs ·{" "}
<strong style={{ color: "#e6edf3" }}>on</strong> = everyone.
Stored in <code style={code}>config/feature_flags</code>. Changes apply within 60 seconds, no redeploy.
</p>

{msg && (
<div style={{
  padding:"10px 14px", borderRadius:6, fontSize:13, marginBottom:16,
  display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
  background: msg.type === "success" ? "#0d2e1a" : "#3d1515",
  border: `1px solid ${msg.type === "success" ? "#3fb950" : "#f85149"}`,
  color: msg.type === "success" ? "#3fb950" : "#f85149",
}}>
  <span>{msg.text}</span>
  <button style={{ background:"none", border:"none", color:"inherit", cursor:"pointer", fontSize:16, padding:0 }}
    onClick={() => setMsg(null)}>✕</button>
</div>
)}

<table style={table}>
<thead>
  <tr>
    {["Flag", "Mode", "Allowlist UIDs", ""].map(h => <th key={h} style={th}>{h}</th>)}
  </tr>
</thead>
<tbody>
  {Object.keys(flags).map(name => {
    const saved = flags[name];
    const d = drafts[name] || { mode: "off", uidsText: "" };
    const dirty = d.mode !== saved.mode || parseUids(d.uidsText).join() !== (saved.uids || []).join();
    return (
      <tr key={name} style={tr}>
        <td style={{ ...td, verticalAlign: "top", width: "34%" }}>
          <code style={code}>{name}</code>
          <div style={{ fontSize: 12, color: "#8b949e", marginTop: 6 }}>{DESCRIPTIONS[name]}</div>
          <div style={{ fontSize: 11, marginTop: 6, color: MODE_COLOR[saved.mode], fontWeight: 600 }}>
            ● live: {saved.mode}{saved.mode === "allowlist" ? ` (${(saved.uids || []).length})` : ""}
          </div>
        </td>
        <td style={{ ...td, verticalAlign: "top" }}>
          <select
            style={{ ...input, padding: "7px 10px", color: MODE_COLOR[d.mode] }}
            value={d.mode}
            onChange={e => setDrafts({ ...drafts, [name]: { ...d, mode: e.target.value } })}
          >
            {modes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </td>
        <td style={{ ...td, verticalAlign: "top", width: "40%" }}>
          <textarea
            rows={2}
            style={{ ...input, width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 12, resize: "vertical",
              opacity: d.mode === "allowlist" ? 1 : 0.4 }}
            placeholder="one UID per line"
            disabled={d.mode !== "allowlist"}
            value={d.uidsText}
            onChange={e => setDrafts({ ...drafts, [name]: { ...d, uidsText: e.target.value } })}
          />
          {d.mode === "allowlist" && (
            <button style={{ ...btnGhost, marginTop: 6 }} onClick={() => addMe(name)}>+ Add me</button>
          )}
        </td>
        <td style={{ ...td, verticalAlign: "top" }}>
          <button
            style={{ ...btnPrimary, opacity: !dirty || saving === name ? 0.5 : 1,
              cursor: !dirty || saving === name ? "not-allowed" : "pointer" }}
            disabled={!dirty || saving === name}
            onClick={() => save(name)}
          >{saving === name ? "Saving…" : "Save"}</button>
        </td>
      </tr>
    );
  })}
</tbody>
</table>

<div style={{ marginTop:16, padding:"10px 14px", background:"#0d1117",
border:"1px solid #30363d", borderRadius:8, fontSize:12, color:"#8b949e", lineHeight:1.6 }}>
<strong style={{ color:"#e6edf3" }}>Launch order:</strong>{" "}
terms_gate → pro_role → billing → coupons → trial → paywall → autotrader_liquidation.
Test each in <code style={code}>allowlist</code> with your own UID before turning it on.
</div>
</div>
);
}

// ── Styles (same values as Admin.jsx) ─────────────────────────────────────────
const helpText   = { color:"#8b949e", fontSize:13, marginBottom:"1rem", lineHeight:1.6 };
const empty      = { color:"#8b949e", fontSize:13, padding:"1rem 0" };
const table      = { width:"100%", borderCollapse:"collapse", marginTop:8, fontSize:13 };
const th         = { textAlign:"left", padding:"8px 12px", color:"#8b949e", fontSize:11, fontWeight:600, borderBottom:"1px solid #30363d", textTransform:"uppercase" };
const tr         = { borderBottom:"1px solid #21262d" };
const td         = { padding:"10px 12px", color:"#e6edf3", verticalAlign:"middle" };
const code       = { background:"#21262d", padding:"2px 6px", borderRadius:4, fontSize:12, color:"#79c0ff", fontFamily:"monospace" };
const input      = { padding:"9px 12px", background:"#0d1117", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:13, outline:"none" };
const btnPrimary = { padding:"7px 16px", background:"#238636", border:"1px solid #2ea043", borderRadius:6, color:"#fff", fontSize:13, fontWeight:600, whiteSpace:"nowrap" };
const btnGhost   = { padding:"4px 10px", background:"#161b22", border:"1px solid #30363d", borderRadius:4, color:"#8b949e", fontSize:11, cursor:"pointer" };