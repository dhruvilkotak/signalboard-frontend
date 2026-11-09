// src/components/admin/LegalAdminPanel.jsx
// Admin tab: see the published Terms version and publish a new one.
// Styled to match src/pages/Admin.jsx.

import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { useFlag } from "../../hooks/useFeatureFlags";
import { TERMS_VERSION, TERMS_EFFECTIVE } from "../TermsModal";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";

export default function LegalAdminPanel() {
  const gateOn = useFlag("terms_gate");
  const [current, setCurrent] = useState(null);
  const [summary, setSummary] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await fetch(`${API}/api/legal`);
      setCurrent(await res.json());
    } catch (e) {
      setMsg({ type: "error", text: `❌ Failed to load: ${e.message}` });
    }
  }

  const published = current?.terms_version;
  const bundleIsNewer = published && published !== TERMS_VERSION;

  async function publish() {
    if (!summary.trim()) {
      setMsg({ type: "error", text: "Write a short summary of what changed — users see it." });
      return;
    }
    const gateNote = gateOn
      ? "Every user will have to accept before continuing."
      : "terms_gate is off for you, so users won't be prompted until it's on.";
    if (!confirm(`Publish Terms ${TERMS_VERSION}?\n\n${gateNote}`)) return;

    setSaving(true);
    setMsg(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API}/api/admin/legal/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ terms_version: TERMS_VERSION, summary_of_changes: summary.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail?.message || data?.detail?.code || `HTTP ${res.status}`);
      setSummary("");
      await load();
      setMsg({ type: "success", text: `✅ Published ${TERMS_VERSION}.` });
    } catch (e) {
      setMsg({ type: "error", text: `❌ ${e.message}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p style={helpText}>
        To change the Terms: edit the text in <code style={code}>src/components/TermsModal.jsx</code>, bump{" "}
        <code style={code}>TERMS_VERSION</code>, deploy, then publish it here. Users who accepted an older
        version must accept again while <code style={code}>terms_gate</code> is on.
      </p>

      {msg && (
        <div style={{
          ...banner,
          background: msg.type === "success" ? "#0d2e1a" : "#3d1515",
          border: `1px solid ${msg.type === "success" ? "#3fb950" : "#f85149"}`,
          color: msg.type === "success" ? "#3fb950" : "#f85149",
        }}>
          <span>{msg.text}</span>
          <button style={{ background:"none", border:"none", color:"inherit", cursor:"pointer", fontSize:16, padding:0 }}
            onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:16 }}>
        <Stat label="Published (users must accept)" value={published || "…"} color="#58a6ff" />
        <Stat label="This build's Terms text" value={`${TERMS_VERSION} · ${TERMS_EFFECTIVE}`} color={bundleIsNewer ? "#f0a000" : "#3fb950"} />
        <Stat label="terms_gate (you)" value={gateOn ? "on" : "off"} color={gateOn ? "#3fb950" : "#8b949e"} />
      </div>

      {current?.summary_of_changes && (
        <div style={{ ...box, marginBottom: 16 }}>
          <div style={label}>Current summary of changes</div>
          <div style={{ whiteSpace:"pre-wrap" }}>{current.summary_of_changes}</div>
        </div>
      )}

      {bundleIsNewer ? (
        <div style={box}>
          <h2 style={sectionTitle}>Publish {TERMS_VERSION}</h2>
          <textarea
            style={{ ...input, width:"100%", boxSizing:"border-box", height:90, resize:"vertical" }}
            placeholder="What changed? e.g. Added subscription, cancellation and refund terms."
            value={summary}
            onChange={e => setSummary(e.target.value)}
          />
          <button style={{ ...btnPrimary, marginTop:8, opacity: saving ? 0.5 : 1 }} disabled={saving} onClick={publish}>
            {saving ? "Publishing…" : `Publish ${TERMS_VERSION}`}
          </button>
        </div>
      ) : (
        <div style={{ ...box, color:"#8b949e" }}>
          This build's Terms ({TERMS_VERSION}) are already published. Bump <code style={code}>TERMS_VERSION</code> in
          TermsModal.jsx and deploy to publish a new version.
        </div>
      )}
    </div>
  );
}

function Stat({ label: l, value, color }) {
  return (
    <div style={{ ...box, flex: "1 1 180px" }}>
      <div style={label}>{l}</div>
      <div style={{ fontSize:16, fontWeight:700, color, fontFamily:"monospace" }}>{value}</div>
    </div>
  );
}

// ── Styles (same values as Admin.jsx) ─────────────────────────────────────────
const helpText     = { color:"#8b949e", fontSize:13, marginBottom:"1rem", lineHeight:1.6 };
const sectionTitle = { fontSize:15, fontWeight:600, color:"#e6edf3", margin:"0 0 0.75rem" };
const banner       = { padding:"10px 14px", borderRadius:6, fontSize:13, marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 };
const box          = { background:"#0d1117", border:"1px solid #30363d", borderRadius:8, padding:"12px 14px", fontSize:13, color:"#e6edf3", lineHeight:1.6 };
const label        = { fontSize:10, color:"#6e7681", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:4 };
const code         = { background:"#21262d", padding:"2px 6px", borderRadius:4, fontSize:12, color:"#79c0ff", fontFamily:"monospace" };
const input        = { padding:"9px 12px", background:"#0d1117", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:13, outline:"none" };
const btnPrimary   = { padding:"9px 16px", background:"#238636", border:"1px solid #2ea043", borderRadius:6, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" };
