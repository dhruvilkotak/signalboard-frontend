// src/components/admin/CouponsPanel.jsx
// Admin tab: create coupon codes (no card needed), see usage, deactivate.
// Styled to match src/pages/Admin.jsx.

import { useEffect, useState } from "react";
import { getCoupons, createCoupon, deactivateCoupon } from "../../lib/api";
import { useFlag } from "../../hooks/useFeatureFlags";

const STATUS_COLOR = { active: "#3fb950", used_up: "#f0a000", expired: "#8b949e", inactive: "#f85149" };
const EMPTY_FORM = { duration_days: 30, max_redemptions: 1, expires_in_days: 30, note: "", code: "" };

export default function CouponsPanel() {
  const couponsOn = useFlag("coupons");
  const [coupons, setCoupons] = useState(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setCoupons((await getCoupons()).coupons);
    } catch (e) {
      setMsg({ type: "error", text: `❌ Failed to load: ${e.detail?.message || e.message}` });
    }
  }

  async function create(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const num = v => (v === "" || v === null ? null : Number(v));
    try {
      const c = await createCoupon({
        duration_days:   Number(form.duration_days),
        max_redemptions: num(form.max_redemptions),
        expires_in_days: num(form.expires_in_days),
        note:            form.note,
        ...(form.code.trim() ? { code: form.code.trim() } : {}),
      });
      setForm(EMPTY_FORM);
      await load();
      copy(c.code, `✅ Created ${c.code} (copied to clipboard).`);
    } catch (e) {
      setMsg({ type: "error", text: `❌ ${e.detail?.message || e.message}` });
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(code) {
    if (!confirm(`Deactivate ${code}? People who already redeemed it keep their access.`)) return;
    try {
      await deactivateCoupon(code);
      await load();
      setMsg({ type: "success", text: `${code} deactivated.` });
    } catch (e) {
      setMsg({ type: "error", text: `❌ ${e.detail?.message || e.message}` });
    }
  }

  function copy(code, text = `📋 Copied ${code}`) {
    navigator.clipboard?.writeText(code).catch(() => {});
    setMsg({ type: "success", text });
  }

  return (
    <div>
      <p style={helpText}>
        A coupon gives <strong style={{ color: "#e6edf3" }}>every feature</strong> for its duration, no card needed.
        Redeeming stacks: a second code adds its days on top. Leave <em>Max uses</em> or <em>Code expires</em> empty for unlimited / never.
      </p>

      {!couponsOn && (
        <div style={{ ...banner, background: "#2d2010", border: "1px solid #f0a000", color: "#f0a000" }}>
          The <code style={code}>coupons</code> flag is off for you, so redeeming is disabled. You can still create codes now.
        </div>
      )}

      {msg && (
        <div style={{
          ...banner, justifyContent: "space-between",
          background: msg.type === "success" ? "#0d2e1a" : "#3d1515",
          border: `1px solid ${msg.type === "success" ? "#3fb950" : "#f85149"}`,
          color: msg.type === "success" ? "#3fb950" : "#f85149",
        }}>
          <span>{msg.text}</span>
          <button style={{ background:"none", border:"none", color:"inherit", cursor:"pointer", fontSize:16, padding:0 }}
            onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      <h2 style={sectionTitle}>New coupon</h2>
      <form onSubmit={create} style={formGrid}>
        <Field label="Access (days)">
          <input style={input} type="number" min="1" max="365" required
            value={form.duration_days} onChange={e => set("duration_days", e.target.value)} />
        </Field>
        <Field label="Max uses">
          <input style={input} type="number" min="1" max="1000" placeholder="unlimited"
            value={form.max_redemptions ?? ""} onChange={e => set("max_redemptions", e.target.value)} />
        </Field>
        <Field label="Code expires in (days)">
          <input style={input} type="number" min="1" max="365" placeholder="never"
            value={form.expires_in_days ?? ""} onChange={e => set("expires_in_days", e.target.value)} />
        </Field>
        <Field label="Custom code (optional)">
          <input style={{ ...input, fontFamily: "monospace" }} placeholder="auto: SBC-XXXX-XXXX"
            value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} />
        </Field>
        <Field label="Note (who it's for)" wide>
          <input style={input} placeholder="e.g. Mom, Rahul, family group"
            value={form.note} onChange={e => set("note", e.target.value)} />
        </Field>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button style={{ ...btnPrimary, opacity: saving ? 0.5 : 1 }} disabled={saving} type="submit">
            {saving ? "Creating…" : "+ Create code"}
          </button>
        </div>
      </form>

      <h2 style={{ ...sectionTitle, marginTop: "1.75rem" }}>All coupons ({coupons?.length ?? "…"})</h2>
      {!coupons ? <div style={empty}>Loading…</div> : coupons.length === 0 ? (
        <div style={empty}>No coupons yet.</div>
      ) : (
        <table style={table}>
          <thead>
            <tr>{["Code", "Access", "Used", "Expires", "Note", "Status", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {coupons.map(c => (
              <tr key={c.code} style={tr}>
                <td style={td}>
                  <code style={code}>{c.code}</code>{" "}
                  <button style={btnGhost} onClick={() => copy(c.code)} title="Copy">📋</button>
                </td>
                <td style={td}>{c.duration_days}d</td>
                <td style={td}>{c.redeemed_count} / {c.max_redemptions ?? "∞"}</td>
                <td style={td}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "never"}</td>
                <td style={{ ...td, color: "#8b949e" }}>{c.note || "—"}</td>
                <td style={td}>
                  <span style={{ color: STATUS_COLOR[c.status] || "#8b949e", fontWeight: 600, fontSize: 12 }}>
                    {c.status.replace("_", " ")}
                  </span>
                </td>
                <td style={td}>
                  {c.status === "active" && <button style={btnDanger} onClick={() => deactivate(c.code)}>Deactivate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Field({ label, children, wide }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: wide ? "span 2" : undefined }}>
      <span style={{ fontSize: 11, color: "#8b949e" }}>{label}</span>
      {children}
    </label>
  );
}

// ── Styles (same values as Admin.jsx) ─────────────────────────────────────────
const helpText     = { color:"#8b949e", fontSize:13, marginBottom:"1rem", lineHeight:1.6 };
const sectionTitle = { fontSize:15, fontWeight:600, color:"#e6edf3", margin:"0 0 0.75rem" };
const banner       = { padding:"10px 14px", borderRadius:6, fontSize:13, marginBottom:16, display:"flex", alignItems:"center", gap:12 };
const formGrid     = { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(170px, 1fr))", gap:12 };
const input        = { padding:"9px 12px", background:"#0d1117", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" };
const btnPrimary   = { padding:"9px 16px", background:"#238636", border:"1px solid #2ea043", borderRadius:6, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" };
const btnDanger    = { padding:"4px 10px", background:"transparent", border:"1px solid #f8514960", borderRadius:4, color:"#f85149", fontSize:11, cursor:"pointer" };
const btnGhost     = { background:"none", border:"none", cursor:"pointer", fontSize:12, padding:0 };
const empty        = { color:"#8b949e", fontSize:13, padding:"1rem 0" };
const table        = { width:"100%", borderCollapse:"collapse", marginTop:8, fontSize:13 };
const th           = { textAlign:"left", padding:"8px 12px", color:"#8b949e", fontSize:11, fontWeight:600, borderBottom:"1px solid #30363d", textTransform:"uppercase" };
const tr           = { borderBottom:"1px solid #21262d" };
const td           = { padding:"10px 12px", color:"#e6edf3", verticalAlign:"middle" };
const code         = { background:"#21262d", padding:"2px 6px", borderRadius:4, fontSize:12, color:"#79c0ff", fontFamily:"monospace" };
