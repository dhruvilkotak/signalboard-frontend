// src/components/QuotaChip.jsx
// On-demand limit chip (flag `paywall` on; every plan except admin):
//   free / trial          -> "⚡ 3 of 5 free signals left"            (5 in total)
//   pro / paid / coupon   -> "⚡ 3 of 5 signals left this week · resets Mon (4 days)"
//
//   <QuotaChip />                      reads /api/me/access via useAccess
//   <QuotaChip quota={signal.quota} /> prefer the fresher numbers returned
//                                      with an on-demand signal response

import { useAccess } from "../hooks/useAccess";

const DAY_MS = 24 * 60 * 60 * 1000;

function resetLabel(iso) {
  if (!iso) return "";
  const at = new Date(iso);
  const days = Math.ceil((at - Date.now()) / DAY_MS);
  if (days <= 1) return "resets tomorrow";
  return `resets ${at.toLocaleDateString(undefined, { weekday: "short" })} (${days} days)`;
}

export default function QuotaChip({ quota }) {
  const { access } = useAccess();
  const q = quota && quota.limit != null ? quota : access?.ondemand;
  if (!q || q.limit == null) return null;

  const left = q.left ?? Math.max(q.limit - q.used, 0);
  const color = left === 0 ? "#f85149" : left <= 2 ? "#f0a000" : "#8b949e";
  const resets = q.resets_at ? new Date(q.resets_at) : null;
  const weekly = q.period === "week";

  return (
    <span
      title={(weekly ? `${q.limit} new on-demand AI signals per week.` : `Free accounts get ${q.limit} on-demand AI signals in total.`)
        + " Re-opening a signal you already have is free until it expires."
        + (resets ? ` Resets ${resets.toLocaleString()}.` : "")}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 11, fontFamily: "'Space Mono',monospace", color,
        background: `${color}15`, border: `1px solid ${color}55`,
        borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap",
      }}
    >
      {weekly
        ? <>⚡ {left} of {q.limit} signals left this week{resets ? ` · ${resetLabel(q.resets_at)}` : ""}</>
        : <>⚡ {left} of {q.limit} free signals left</>}
    </span>
  );
}
