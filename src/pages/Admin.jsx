// src/pages/Admin.jsx
// Full admin portal — Invite Management + Signal Ticker Manager
// Reads/writes directly to Firestore (no backend needed)

import { useState, useEffect } from "react";
import {
  collection, doc, getDoc, getDocs, setDoc,
  deleteDoc, updateDoc, serverTimestamp, query, orderBy
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuthContext } from "../App";
import { auth } from "../lib/firebase";
import { getAutoTraderStatus, setKillSwitch } from "../lib/api";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";

// ── Generate invite code ──────────────────────────────────────────────────────
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "SB-" + Array.from({length: 5}, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export default function Admin() {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState("pending");

  return (
    <div style={wrap}>
      <div style={header}>
        <h1 style={title}>⚙ Admin Panel</h1>
        <span style={badge}>{user?.email}</span>
      </div>

      {/* Sub-tabs */}
      <div style={tabBar}>
        {[
          { id: "pending", label: "👤 Pending Users" },
          { id: "invites", label: "📨 Invites" },
          { id: "tickers", label: "📈 Signal Tickers" },
          { id: "links",   label: "🔗 Quick Links" },
          { id: "autotrader", label: "🤖 Auto-Trader" },
        ].map(t => (
          <button
            key={t.id}
            style={{ ...tabBtn, ...(activeTab === t.id ? tabBtnActive : {}) }}
            onClick={() => setActiveTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      <div style={content}>
        {activeTab === "pending" && <PendingUsers />}
        {activeTab === "invites" && <InviteManager />}
        {activeTab === "tickers" && <TickerManager />}
        {activeTab === "links"   && <QuickLinks />}
        {activeTab === "autotrader" && <AutoTraderAdmin />}
      </div>
    </div>
  );
}

// ── Invite Manager ────────────────────────────────────────────────────────────
function InviteManager() {
  const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";
  const [email,   setEmail]   = useState("");
  const [notes,   setNotes]   = useState("");
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState(null);
  const { user } = useAuthContext();

  useEffect(() => { loadInvites(); }, []);

  async function loadInvites() {
    try {
      const snap = await getDocs(
        query(collection(db, "invites"), orderBy("created_at", "desc"))
      );
      setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Load invites failed:", e);
    }
  }

  async function sendInvite(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API}/api/admin/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ email: email.trim(), notes: notes.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to send invite");

      if (data.email_sent) {
        setMsg({ type: "success", text: `✅ Invite sent! Code: ${data.code} → ${email}` });
      } else {
        setMsg({
          type: "warning",
          text: `✅ Invite created (${data.code}) but email failed to send to ${email}.`,
        });
      }
      setEmail("");
      setNotes("");
      await loadInvites();
    } catch (e) {
      setMsg({ type: "error", text: `❌ Failed: ${e.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function revokeInvite(code) {
    if (!confirm(`Revoke invite ${code}?`)) return;
    try {
      await deleteDoc(doc(db, "invites", code));
      await loadInvites();
    } catch (e) {
      alert("Failed to revoke: " + e.message);
    }
  }

  function getStatus(invite) {
    if (invite.used) return { label: "Used", color: "#3fb950" };
    if (new Date(invite.expires_at) < new Date()) return { label: "Expired", color: "#f85149" };
    return { label: "Pending", color: "#f0a000" };
  }

  return (
    <div>
      <h2 style={sectionTitle}>Send Invite</h2>
      <form onSubmit={sendInvite} style={form}>
        <input
          style={input}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          style={input}
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <button style={btnPrimary} type="submit" disabled={loading}>
          {loading ? "Sending…" : "Generate & Send Invite"}
        </button>
      </form>

      {msg && (
        <div style={{
          padding:"10px 14px", borderRadius:6, fontSize:13, marginTop:12,
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
          background: msg.type === "success" ? "#0d2e1a" : msg.type === "warning" ? "#2d2010" : "#3d1515",
          border: `1px solid ${msg.type === "success" ? "#3fb950" : msg.type === "warning" ? "#f0a000" : "#f85149"}`,
          color: msg.type === "success" ? "#3fb950" : msg.type === "warning" ? "#f0a000" : "#f85149",
        }}>
          <span>{msg.text}</span>
          <button style={{ background:"none", border:"none", color:"inherit", cursor:"pointer", fontSize:16, padding:0 }}
            onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      <h2 style={{ ...sectionTitle, marginTop: "2rem" }}>
        All Invites ({invites.length})
      </h2>

      {invites.length === 0 ? (
        <div style={empty}>No invites yet.</div>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              {["Code", "Email", "Status", "Expires", "Notes", "Action"].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invites.map(inv => {
              const status = getStatus(inv);
              return (
                <tr key={inv.id} style={tr}>
                  <td style={td}><code style={code}>{inv.id}</code></td>
                  <td style={td}>{inv.email}</td>
                  <td style={td}>
                    <span style={{ color: status.color, fontWeight: 600, fontSize: 12 }}>
                      {status.label}
                    </span>
                  </td>
                  <td style={td}>{inv.expires_at ? inv.expires_at.slice(0, 10) : "—"}</td>
                  <td style={td}>{inv.notes || "—"}</td>
                  <td style={td}>
                    {!inv.used && (
                      <button
                        style={btnDanger}
                        onClick={() => revokeInvite(inv.id)}
                      >Revoke</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Signal Ticker Manager ─────────────────────────────────────────────────────
function TickerManager() {
  const [tickers, setTickers] = useState([]);
  const [newTicker, setNewTicker] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState(null);
  const { user } = useAuthContext();

  const DEFAULT = ["SPY","VOO","JEPI","JEPQ","SCHD","SGOV","MSFT","AAPL","NVDA","GOOGL","AMZN","META","HOOD"];

  useEffect(() => { loadTickers(); }, []);

  async function loadTickers() {
    try {
      const snap = await getDoc(doc(db, "config", "signal_tickers"));
      if (snap.exists()) {
        setTickers(snap.data().symbols || DEFAULT);
      } else {
        setTickers(DEFAULT);
      }
    } catch (e) {
      setTickers(DEFAULT);
    }
  }

  async function saveTickers(newList) {
    await setDoc(doc(db, "config", "signal_tickers"), {
      symbols:      newList,
      updated_at:   serverTimestamp(),
      updated_by:   user.uid,
    });
    setTickers(newList);
  }

  async function addTicker(e) {
    e.preventDefault();
    const sym = newTicker.trim().toUpperCase();
    if (!sym) return;
    if (tickers.includes(sym)) {
      setMsg({ type: "error", text: `${sym} is already in the list.` });
      return;
    }
    if (tickers.length >= 50) {
      setMsg({ type: "error", text: "Maximum 50 tickers allowed." });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      // Validate symbol exists
      const res = await fetch(`${API}/api/quote/${sym}`);
      if (!res.ok) throw new Error("Symbol not found");
      const data = await res.json();
      if (!data.price) throw new Error("No price data — invalid symbol");

      const newList = [...tickers, sym];
      await saveTickers(newList);
      setNewTicker("");
      setMsg({ type: "success", text: `${sym} added at $${data.price}` });
    } catch (err) {
      setMsg({ type: "error", text: `${sym}: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function removeTicker(sym) {
    if (!confirm(`Remove ${sym} from signal tickers?`)) return;
    const newList = tickers.filter(t => t !== sym);
    await saveTickers(newList);
    setMsg({ type: "success", text: `${sym} removed.` });
  }

  return (
    <div>
      <p style={helpText}>
        These tickers always get AI signals on every scheduled job.
        Backend refreshes this list every 60 min — no restart needed.
        Max 50 tickers.
      </p>

      <form onSubmit={addTicker} style={{ ...form, flexDirection: "row", gap: 8 }}>
        <input
          style={{ ...input, flex: 1 }}
          type="text"
          placeholder="Add ticker (e.g. TSLA)"
          value={newTicker}
          onChange={e => setNewTicker(e.target.value.toUpperCase())}
        />
        <button style={btnPrimary} type="submit" disabled={loading}>
          {loading ? "Checking…" : "+ Add"}
        </button>
      </form>

      {msg && (
        <div style={{
          padding:"10px 14px", borderRadius:6, fontSize:13, marginTop:12,
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
          background: msg.type === "success" ? "#0d2e1a" : msg.type === "warning" ? "#2d2010" : "#3d1515",
          border: `1px solid ${msg.type === "success" ? "#3fb950" : msg.type === "warning" ? "#f0a000" : "#f85149"}`,
          color: msg.type === "success" ? "#3fb950" : msg.type === "warning" ? "#f0a000" : "#f85149",
        }}>
          <span>{msg.text}</span>
          <button style={{ background:"none", border:"none", color:"inherit", cursor:"pointer", fontSize:16, padding:0 }}
            onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <h2 style={sectionTitle}>Current Tickers ({tickers.length}/50)</h2>
        <div style={tickerGrid}>
          {tickers.map(sym => (
            <div key={sym} style={tickerChip}>
              <span style={tickerLabel}>{sym}</span>
              <button
                style={chipRemove}
                onClick={() => removeTicker(sym)}
                title={`Remove ${sym}`}
              >×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Quick Links ───────────────────────────────────────────────────────────────
function QuickLinks() {
  const links = [
    { label: "Firebase Console",   url: "https://console.firebase.google.com/project/signalboard-bc35e", icon: "🔥" },
    { label: "Firestore Database",  url: "https://console.firebase.google.com/project/signalboard-bc35e/firestore", icon: "🗄" },
    { label: "Firebase Auth Users", url: "https://console.firebase.google.com/project/signalboard-bc35e/authentication/users", icon: "👥" },
    { label: "GCP Console",         url: "https://console.cloud.google.com/compute/instances?project=signalboard", icon: "☁️" },
    { label: "Anthropic Usage",     url: "https://platform.anthropic.com/settings/usage", icon: "🤖" },
    { label: "Vercel Dashboard",    url: "https://vercel.com/dhruvil-kotak-s-projects/signalboard-frontend", icon: "▲" },
    { label: "GitHub Backend",      url: "https://github.com/dhruvilkotak/signalboard-backend/issues", icon: "⚙️" },
    { label: "GitHub Frontend",     url: "https://github.com/dhruvilkotak/signalboard-frontend/issues", icon: "🖥" },
    { label: "UptimeRobot",         url: "https://uptimerobot.com", icon: "📡" },
    { label: "DuckDNS",             url: "https://duckdns.org", icon: "🌐" },
  ];

  return (
    <div>
      <p style={helpText}>Quick access to all admin resources.</p>
      <div style={linksGrid}>
        {links.map(l => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" style={linkCard}>
            <span style={{ fontSize: 24 }}>{l.icon}</span>
            <span style={{ fontSize: 13, color: "#e6edf3", fontWeight: 500 }}>{l.label}</span>
            <span style={{ fontSize: 11, color: "#8b949e" }}>↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── NEW COMPONENT — paste at bottom of Admin.jsx ─────────────────────────────
function AutoTraderAdmin() {
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);
  const [msg,     setMsg]     = useState(null);
 
  useEffect(() => { load(); }, []);
 
  async function load() {
    setLoading(true);
    try {
      const s = await getAutoTraderStatus();
      setStatus(s);
    } catch (e) {
      setMsg({ type: "error", text: `Failed to load status: ${e.message}` });
    } finally {
      setLoading(false);
    }
  }
 
  async function toggle(enabled) {
    if (!confirm(`${enabled ? "Enable" : "Disable"} autonomous trading for ALL users?`)) return;
    setActing(true);
    try {
      await setKillSwitch(enabled);
      await load();
      setMsg({ type: "success", text: `Auto-trader ${enabled ? "enabled" : "disabled"} globally.` });
    } catch (e) {
      setMsg({ type: "error", text: `Failed: ${e.message}` });
    } finally {
      setActing(false);
    }
  }
 
  if (loading) return <div style={empty}>Loading…</div>;
 
  const isEnabled = status?.enabled ?? true;
 
  return (
    <div>
      <p style={helpText}>
        Global kill switch for all autonomous trading. When disabled, no new positions
        are opened and no stop-losses are triggered for any user. Existing positions
        are held. Takes effect within 60 seconds (next scheduler cycle).
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
 
      {/* Status card */}
      <div style={{ background:"#0d1117", border:"1px solid #30363d", borderRadius:10, padding:"1.5rem", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:600, color:"#e6edf3", marginBottom:4 }}>
              Autonomous Trading
            </div>
            <div style={{ fontSize:12, color:"#8b949e" }}>
              {isEnabled
                ? "Active — signals are being auto-traded for all active users"
                : "Disabled — no autonomous trades will execute"}
            </div>
          </div>
          <div style={{
            padding:"6px 14px", borderRadius:20, fontWeight:700, fontSize:13,
            background: isEnabled ? "#0d2e1a" : "#3d1515",
            color: isEnabled ? "#3fb950" : "#f85149",
            border: `1px solid ${isEnabled ? "#3fb950" : "#f85149"}`,
          }}>
            {isEnabled ? "● ENABLED" : "○ DISABLED"}
          </div>
        </div>
 
        <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:10, color:"#6e7681", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Active Users</div>
            <div style={{ fontSize:24, fontWeight:700, color:"#58a6ff", fontFamily:"monospace" }}>
              {status?.active_users ?? "—"}
            </div>
          </div>
          <div>
            <div style={{ fontSize:10, color:"#6e7681", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Last Checked</div>
            <div style={{ fontSize:13, color:"#8b949e", fontFamily:"monospace" }}>
              {status?.timestamp ? new Date(status.timestamp).toLocaleTimeString() : "—"}
            </div>
          </div>
          <div>
            <div style={{ fontSize:10, color:"#6e7681", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Stop-Loss Monitor</div>
            <div style={{ fontSize:13, color:"#8b949e", fontFamily:"monospace" }}>Every 60s</div>
          </div>
        </div>
      </div>
 
      {/* Controls */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        <button
          style={{ padding:"9px 20px", borderRadius:6, fontSize:13, fontWeight:600,
            cursor: acting ? "not-allowed" : "pointer", opacity: acting ? 0.5 : 1,
            background:"#238636", border:"1px solid #2ea043", color:"#fff" }}
          onClick={() => toggle(true)}
          disabled={acting || isEnabled}
        >
          ▶ Enable Auto-Trading
        </button>
        <button
          style={{ padding:"9px 20px", borderRadius:6, fontSize:13, fontWeight:600,
            cursor: acting ? "not-allowed" : "pointer", opacity: acting ? 0.5 : 1,
            background:"transparent", border:"1px solid #f8514960", color:"#f85149" }}
          onClick={() => toggle(false)}
          disabled={acting || !isEnabled}
        >
          ⏸ Disable Auto-Trading
        </button>
        <button
          style={{ padding:"9px 14px", borderRadius:6, fontSize:13,
            background:"#161b22", border:"1px solid #30363d", color:"#8b949e", cursor:"pointer" }}
          onClick={load}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>
 
      <div style={{ marginTop:16, padding:"10px 14px", background:"#161b22",
        border:"1px solid #30363d", borderRadius:8, fontSize:12, color:"#8b949e", lineHeight:1.6 }}>
        <strong style={{ color:"#e6edf3" }}>Kill switch levels:</strong><br />
        This toggle sets <code style={{ background:"#21262d", padding:"1px 4px", borderRadius:3 }}>config/autotrader.enabled</code> in Firestore.
        Takes effect within 60s (next scheduler cycle). No redeploy required.<br />
        For immediate full stop: use the VM kill switch in GCP Console (Quick Links tab).
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const wrap        = { maxWidth: 960, margin: "0 auto" };
const header      = { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" };
const title       = { fontSize:20, fontWeight:700, color:"#e6edf3", margin:0 };
const badge       = { fontSize:12, background:"#388bfd22", border:"1px solid #388bfd55", color:"#58a6ff", borderRadius:6, padding:"4px 10px" };
const tabBar      = { display:"flex", gap:4, marginBottom:"1.5rem", borderBottom:"1px solid #30363d", paddingBottom:0 };
const tabBtn      = { padding:"8px 16px", border:"none", borderBottom:"2px solid transparent", background:"transparent", color:"#8b949e", fontSize:13, fontWeight:500, cursor:"pointer" };
const tabBtnActive= { color:"#e6edf3", borderBottomColor:"#2ea043" };
const content     = { background:"#161b22", border:"1px solid #30363d", borderRadius:10, padding:"1.5rem" };
const sectionTitle= { fontSize:15, fontWeight:600, color:"#e6edf3", margin:"0 0 1rem" };
const form        = { display:"flex", flexDirection:"column", gap:8 };
const input       = { padding:"9px 12px", background:"#0d1117", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3", fontSize:13, outline:"none" };
const btnPrimary  = { padding:"9px 16px", background:"#238636", border:"1px solid #2ea043", borderRadius:6, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" };
const btnDanger   = { padding:"4px 10px", background:"transparent", border:"1px solid #f8514960", borderRadius:4, color:"#f85149", fontSize:11, cursor:"pointer" };
const empty       = { color:"#8b949e", fontSize:13, padding:"1rem 0" };
const table       = { width:"100%", borderCollapse:"collapse", marginTop:8, fontSize:13 };
const th          = { textAlign:"left", padding:"8px 12px", color:"#8b949e", fontSize:11, fontWeight:600, borderBottom:"1px solid #30363d", textTransform:"uppercase" };
const tr          = { borderBottom:"1px solid #21262d" };
const td          = { padding:"10px 12px", color:"#e6edf3", verticalAlign:"middle" };
const code        = { background:"#21262d", padding:"2px 6px", borderRadius:4, fontSize:12, color:"#79c0ff", fontFamily:"monospace" };
const helpText    = { color:"#8b949e", fontSize:13, marginBottom:"1rem", lineHeight:1.6 };
const tickerGrid  = { display:"flex", flexWrap:"wrap", gap:8, marginTop:8 };
const tickerChip  = { display:"flex", alignItems:"center", gap:6, background:"#21262d", border:"1px solid #30363d", borderRadius:6, padding:"5px 10px" };
const tickerLabel = { fontSize:13, fontWeight:600, color:"#e6edf3" };
const chipRemove  = { background:"none", border:"none", color:"#f85149", cursor:"pointer", fontSize:16, lineHeight:1, padding:0 };
const linksGrid   = { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:12 };
const linkCard    = { display:"flex", flexDirection:"column", gap:8, padding:"1rem", background:"#0d1117", border:"1px solid #30363d", borderRadius:8, textDecoration:"none", transition:"border-color 0.15s" };

// ── ADDITION: Add "👤 Pending" tab to the Admin component ─────────────────
// Replace the sub-tabs array in Admin() with this:
// { id: "pending", label: "👤 Pending Users" },
// And add: {activeTab === "pending" && <PendingUsers />}

function PendingUsers() {
  const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg,     setMsg]     = useState(null);
  const { user: adminUser } = useAuthContext();

  useEffect(() => { loadPending(); }, []);

  async function loadPending() {
    try {
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const q = query(collection(db, "users"), where("status", "==", "pending"));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function approve(uid, email, name) {
    if (!confirm(`Approve ${name} (${email})?`)) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API}/api/admin/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ uid, email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to approve user");
      if (data.email_sent) {
        setMsg({ type: "success", text: `✅ ${name} approved! Email sent to ${email}.` });
      } else {
        setMsg({
          type: "warning",
          text: `✅ ${name} approved but email failed to send.`,
          action: { label: "Retry Email", uid, email, name },
        });
      }
      await loadPending();
    } catch (e) {
      setMsg({ type: "error", text: `❌ Approval failed: ${e.message}` });
    }
  }

  async function retryEmail(uid, email, name) {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API}/api/admin/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ uid, email, name }),
      });
      const data = await res.json();
      if (data.email_sent) {
        setMsg({ type: "success", text: `✅ Email sent to ${email}.` });
      } else {
        setMsg({ type: "error", text: `❌ Email still failing — check Gmail SMTP config on VM.` });
      }
    } catch (e) {
      setMsg({ type: "error", text: `❌ Retry failed: ${e.message}` });
    }
  }

  async function reject(uid, email, name) {
    if (!confirm(`Reject and delete ${name}? This cannot be undone.`)) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API}/api/admin/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ uid, email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setMsg({ type: "success", text: `${name} rejected.` });
      await loadPending();
    } catch (e) {
      setMsg({ type: "error", text: `Failed: ${e.message}` });
    }
  }

  if (loading) return <div style={empty}>Loading…</div>;

  return (
    <div>
      <p style={helpText}>
        Users who have signed up and are awaiting your approval.
        Once approved they can sign in and access the dashboard.
      </p>

      {msg && (
        <div style={{
          padding:"10px 14px", borderRadius:6, fontSize:13, marginBottom:16,
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
          background: msg.type === "success" ? "#0d2e1a" : msg.type === "warning" ? "#2d2010" : "#3d1515",
          border: `1px solid ${msg.type === "success" ? "#3fb950" : msg.type === "warning" ? "#f0a000" : "#f85149"}`,
          color: msg.type === "success" ? "#3fb950" : msg.type === "warning" ? "#f0a000" : "#f85149",
        }}>
          <span>{msg.text}</span>
          {msg.action && (
            <button
              style={{ padding:"4px 12px", background:"#238636", border:"1px solid #2ea043",
                borderRadius:4, color:"#fff", fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}
              onClick={() => retryEmail(msg.action.uid, msg.action.email, msg.action.name)}
            >
              {msg.action.label}
            </button>
          )}
          <button
            style={{ background:"none", border:"none", color:"inherit", cursor:"pointer", fontSize:16, padding:0, flexShrink:0 }}
            onClick={() => setMsg(null)}
          >✕</button>
        </div>
      )}

      {users.length === 0 ? (
        <div style={empty}>No pending users. 🎉</div>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              {["Name", "Email", "Provider", "Reason", "Signed Up", "Actions"].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={tr}>
                <td style={td}>{u.name || "—"}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>
                  <span style={{ fontSize:11, background:"#21262d", padding:"2px 6px", borderRadius:4, color:"#8b949e" }}>
                    {u.provider || "email"}
                  </span>
                </td>
                <td style={{ ...td, maxWidth:200, whiteSpace:"normal" }}>
                  <span style={{ fontSize:12, color:"#8b949e" }}>{u.reason || "—"}</span>
                </td>
                <td style={td}>
                  <span style={{ fontSize:12, color:"#8b949e" }}>
                    {u.created_at?.toDate?.()?.toLocaleDateString() || "—"}
                  </span>
                </td>
                <td style={td}>
                  <div style={{ display:"flex", gap:6 }}>
                    <button
                      style={{ padding:"5px 12px", background:"#238636", border:"1px solid #2ea043", borderRadius:4, color:"#fff", fontSize:12, cursor:"pointer", fontWeight:600 }}
                      onClick={() => approve(u.id, u.email, u.name)}
                    >✓ Approve</button>
                    <button
                      style={{ padding:"5px 10px", background:"transparent", border:"1px solid #f8514960", borderRadius:4, color:"#f85149", fontSize:12, cursor:"pointer" }}
                      onClick={() => reject(u.id, u.email, u.name)}
                    >✕ Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}