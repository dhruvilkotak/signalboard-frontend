// src/components/admin/RolesPanel.jsx
// Admin tab: give approved users the Pro role (all features, no admin powers).
// Lists users from Firestore like PendingUsers does; saves through the backend,
// which sets the Firebase custom claim. Styled to match src/pages/Admin.jsx.

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { useFlag } from "../../hooks/useFeatureFlags";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";
const ROLE_COLOR = { admin: "#58a6ff", pro: "#d2a8ff", user: "#8b949e" };

export default function RolesPanel() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(null);
  const [filter,  setFilter]  = useState("");
  const [msg,     setMsg]     = useState(null);
  const proFlagOn = useFlag("pro_role");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const snap = await getDocs(query(collection(db, "users"), where("status", "==", "approved")));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
      setUsers(list);
    } catch (e) {
      setMsg({ type: "error", text: `❌ Failed to load users: ${e.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function setRole(u, role) {
    if (!confirm(`Set ${u.name || u.email} to ${role.toUpperCase()}?`)) return;
    setSaving(u.id);
    setMsg(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API}/api/admin/users/${u.id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const d = data.detail;
        throw new Error(typeof d === "string" ? d : d?.message || d?.code || `HTTP ${res.status}`);
      }
      setUsers(users.map(x => (x.id === u.id ? { ...x, role } : x)));
      setMsg({ type: "success", text: `✅ ${u.email} is now ${role}.` });
    } catch (e) {
      setMsg({ type: "error", text: `❌ Failed: ${e.message}` });
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div style={empty}>Loading…</div>;

  const shown = users.filter(u =>
    !filter || (u.email || "").toLowerCase().includes(filter.toLowerCase()) ||
    (u.name || "").toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <p style={helpText}>
        <strong style={{ color: "#d2a8ff" }}>Pro</strong> users get every feature (on-demand signals, AI Signals,
        AI chat, Auto-Trader) with no paywall, but none of the admin powers.
      </p>

      {!proFlagOn && (
        <div style={{ ...banner, background: "#2d2010", border: "1px solid #f0a000", color: "#f0a000" }}>
          The <code style={code}>pro_role</code> flag is off for you, so Pro doesn't change anything yet.
          You can still assign it; it takes effect when the flag is on.
        </div>
      )}

      {msg && (
        <div style={{
          ...banner,
          background: msg.type === "success" ? "#0d2e1a" : "#3d1515",
          border: `1px solid ${msg.type === "success" ? "#3fb950" : "#f85149"}`,
          color: msg.type === "success" ? "#3fb950" : "#f85149",
          justifyContent: "space-between",
        }}>
          <span>{msg.text}</span>
          <button style={{ background:"none", border:"none", color:"inherit", cursor:"pointer", fontSize:16, padding:0 }}
            onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      <input
        style={{ ...input, width: "100%", boxSizing: "border-box", marginBottom: 12 }}
        placeholder="Filter by name or email"
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />

      <h2 style={sectionTitle}>
        Approved users ({users.length}) · Pro: {users.filter(u => u.role === "pro").length}
      </h2>

      <table style={table}>
        <thead>
          <tr>{["Name", "Email", "Role", "Action"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {shown.map(u => {
            const role = u.role || "user";
            const isAdmin = role === "admin";
            return (
              <tr key={u.id} style={tr}>
                <td style={td}>{u.name || "—"}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>
                  <span style={{ color: ROLE_COLOR[role] || "#8b949e", fontWeight: 600, fontSize: 12, textTransform: "uppercase" }}>
                    {role}
                  </span>
                </td>
                <td style={td}>
                  {isAdmin ? (
                    <span style={{ fontSize: 12, color: "#6e7681" }}>—</span>
                  ) : role === "pro" ? (
                    <button style={btnDanger} disabled={saving === u.id} onClick={() => setRole(u, "user")}>
                      {saving === u.id ? "Saving…" : "Remove Pro"}
                    </button>
                  ) : (
                    <button style={btnPro} disabled={saving === u.id} onClick={() => setRole(u, "pro")}>
                      {saving === u.id ? "Saving…" : "Make Pro"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Styles (same values as Admin.jsx) ─────────────────────────────────────────
const helpText     = { color:"#8b949e", fontSize:13, marginBottom:"1rem", lineHeight:1.6 };
const sectionTitle = { fontSize:15, fontWeight:600, color:"#e6edf3", margin:"0 0 1rem" };
const empty        = { color:"#8b949e", fontSize:13, padding:"1rem 0" };
const banner       = { padding:"10px 14px", borderRadius:6, fontSize:13, marginBottom:16, display:"flex", alignItems:"center", gap:12 };
const table        = { width:"100%", borderCollapse:"collapse", marginTop:8, fontSize:13 };
const th           = { textAlign:"left", padding:"8px 12px", color:"#8b949e", fontSize:11, fontWeight:600, borderBottom:"1px solid #30363d", textTransform:"uppercase" };
const tr           = { borderBottom:"1px solid #21262d" };
const td           = { padding:"10px 12px", color:"#e6edf3", verticalAlign:"middle" };
const code         = { background:"#21262d", padding:"2px 6px", borderRadius:4, fontSize:12, color:"#79c0ff", fontFamily:"monospace" };
const input        = { padding:"9px 12px", background:"#0d1117", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:13, outline:"none" };
const btnPro       = { padding:"4px 12px", background:"#8957e522", border:"1px solid #8957e5", borderRadius:4, color:"#d2a8ff", fontSize:12, cursor:"pointer", fontWeight:600 };
const btnDanger    = { padding:"4px 10px", background:"transparent", border:"1px solid #f8514960", borderRadius:4, color:"#f85149", fontSize:12, cursor:"pointer" };
