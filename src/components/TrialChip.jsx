// src/components/TrialChip.jsx
// Header chip for the 7-day trial (flag `trial`):
//   during the trial   -> "🎁 Trial: 3 days left" (amber on the last 2 days)
//   after it ends      -> "Trial ended · Upgrade" (opens the paywall)
//   everyone else      -> nothing

import { useAccess } from "../hooks/useAccess";
import { useFlag } from "../hooks/useFeatureFlags";
import { PAYWALL_EVENT } from "../lib/api";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function TrialChip() {
  const { access } = useAccess();
  const trialOn = useFlag("trial");
  if (!access || !trialOn) return null;

  const endsAt = access.trial_ends_at ? new Date(access.trial_ends_at) : null;

  if (access.plan === "trial" && endsAt) {
    const msLeft = endsAt - Date.now();
    const days = Math.ceil(msLeft / DAY_MS);
    const text = msLeft < DAY_MS ? "Trial ends today" : `Trial: ${days} day${days === 1 ? "" : "s"} left`;
    const color = days <= 2 ? "#f0a000" : "#58a6ff";
    return (
      <span title={`Free trial of AI Signals, AI Chat and Auto-Trader until ${endsAt.toLocaleString()}`}
        style={chip(color)}>
        🎁 {text}
      </span>
    );
  }

  if (access.plan === "free" && endsAt && endsAt <= new Date()) {
    return (
      <button
        style={{ ...chip("#f85149"), cursor: "pointer" }}
        title="Your 7-day trial has ended"
        onClick={() => window.dispatchEvent(new CustomEvent(PAYWALL_EVENT, { detail: { feature: "ai_signals" } }))}
      >
        Trial ended · Upgrade
      </button>
    );
  }

  return null;
}

const chip = (color) => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  fontSize: 11, fontFamily: "'Space Mono',monospace", color,
  background: `${color}15`, border: `1px solid ${color}55`,
  borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap",
});
