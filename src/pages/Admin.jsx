// src/pages/Admin.jsx
// Admin panel — visible only to users in Firestore admins collection

import { useAuthContext } from "../App";

export default function Admin() {
  const { user } = useAuthContext();

  return (
    <div style={wrap}>
      <div style={header}>
        <h1 style={title}>⚙ Admin Panel</h1>
        <span style={badge}>Admin: {user?.email}</span>
      </div>

      <div style={grid}>

        {/* Invite Management — coming soon */}
        <div style={card}>
          <div style={cardTitle}>📨 Invite Management</div>
          <div style={cardBody}>
            Send invite codes to new users. Coming in next release.
          </div>
          <div style={pill}>Coming soon</div>
        </div>

        {/* Signal Ticker Manager — coming soon */}
        <div style={card}>
          <div style={cardTitle}>📈 Signal Ticker Manager</div>
          <div style={cardBody}>
            Add or remove tickers from the default signal list without code deploys.
          </div>
          <div style={pill}>Coming soon</div>
        </div>

        {/* Metrics — coming soon */}
        <div style={card}>
          <div style={cardTitle}>📊 Metrics</div>
          <div style={cardBody}>
            Signals generated today, Claude calls, active users, fallback rate.
          </div>
          <div style={pill}>Coming soon</div>
        </div>

        {/* User List — coming soon */}
        <div style={card}>
          <div style={cardTitle}>👥 Users</div>
          <div style={cardBody}>
            View all signed-up users, their strategy, and last active time.
          </div>
          <div style={pill}>Coming soon</div>
        </div>

      </div>

      {/* Quick links */}
      <div style={links}>
        <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={link}>
          Firebase Console ↗
        </a>
        <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={link}>
          GCP Console ↗
        </a>
        <a href="https://platform.anthropic.com" target="_blank" rel="noreferrer" style={link}>
          Anthropic Usage ↗
        </a>
        <a href="https://github.com/dhruvilkotak/signalboard-backend/issues" target="_blank" rel="noreferrer" style={link}>
          GitHub Issues ↗
        </a>
      </div>
    </div>
  );
}

const wrap      = { maxWidth: 900, margin: "0 auto" };
const header    = { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.5rem" };
const title     = { fontSize:22, fontWeight:700, color:"#e6edf3", margin:0 };
const badge     = { fontSize:12, background:"#388bfd22", border:"1px solid #388bfd55", color:"#58a6ff", borderRadius:6, padding:"4px 10px" };
const grid      = { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:16, marginBottom:"2rem" };
const card      = { background:"#161b22", border:"1px solid #30363d", borderRadius:10, padding:"1.25rem", display:"flex", flexDirection:"column", gap:10 };
const cardTitle = { fontSize:14, fontWeight:600, color:"#e6edf3" };
const cardBody  = { fontSize:13, color:"#8b949e", lineHeight:1.5, flex:1 };
const pill      = { fontSize:11, background:"#21262d", color:"#8b949e", borderRadius:4, padding:"2px 8px", alignSelf:"flex-start" };
const links     = { display:"flex", gap:12, flexWrap:"wrap" };
const link      = { fontSize:13, color:"#58a6ff", textDecoration:"none", padding:"6px 12px", background:"#161b22", border:"1px solid #30363d", borderRadius:6 };