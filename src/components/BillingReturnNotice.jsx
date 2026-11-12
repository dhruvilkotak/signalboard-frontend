// src/components/BillingReturnNotice.jsx
// After Stripe Checkout redirects back (?billing=success | ?billing=cancel).
// The webhook activates the subscription a few seconds later, so on success
// this polls access until the plan is "paid" (up to ~40 s), then cleans the URL.

import { useEffect, useState } from "react";
import { useAccess, useAccessStore } from "../hooks/useAccess";

const param = () => new URLSearchParams(window.location.search).get("billing");

function cleanUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("billing");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

export default function BillingReturnNotice() {
  const [state, setState] = useState(param);           // "success" | "cancel" | "active" | "slow" | null
  const { access } = useAccess();

  useEffect(() => {
    if (state !== "success") return;
    if (access?.plan === "paid") { setState("active"); cleanUrl(); return; }
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      useAccessStore.getState().refresh();
      if (tries >= 20) { clearInterval(id); setState("slow"); cleanUrl(); }
    }, 2000);
    return () => clearInterval(id);
  }, [state, access?.plan]);

  useEffect(() => { if (state === "cancel") cleanUrl(); }, [state]);

  if (!state) return null;

  const view = {
    success: { color: "#58a6ff", icon: "⏳", text: "Payment received. Activating your subscription…" },
    active:  { color: "#3fb950", icon: "★",  text: "You're subscribed. Every feature is unlocked." },
    slow:    { color: "#f0a000", icon: "⏳", text: "Payment received, but activation is taking longer than usual. Refresh in a minute; if it's still not active, contact the admin." },
    cancel:  { color: "#8b949e", icon: "↩",  text: "Checkout cancelled. You haven't been charged." },
  }[state];
  if (!view) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: "1rem",
      border: `1px solid ${view.color}55`, background: `${view.color}14`, borderRadius: 8,
      fontSize: 13, color: "#e6edf3",
    }}>
      <span style={{ fontSize: 18, color: view.color }}>{view.icon}</span>
      <span style={{ flex: 1 }}>{view.text}</span>
      {state !== "success" && (
        <button onClick={() => setState(null)}
          style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: 16 }}>✕</button>
      )}
    </div>
  );
}
