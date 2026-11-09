// src/components/QuotaChip.jsx
// "3 of 5 free signals left" — shows only when the user has a lifetime limit
// (flag `paywall` on and plan free/trial). Renders nothing otherwise.
//
//   <QuotaChip />                      reads /api/me/access via useAccess
//   <QuotaChip quota={signal.quota} /> prefer the fresher numbers returned
//                                      with an on-demand signal response

import { useAccess } from "../hooks/useAccess";

export default function QuotaChip({ quota }) {
  const { access } = useAccess();
  const q = quota && quota.limit != null ? quota : access?.ondemand;
  if (!q || q.limit == null) return null;

  const left = q.left ?? Math.max(q.limit - q.used, 0);
  const color = left === 0 ? "#f85149" : left <= 2 ? "#f0a000" : "#8b949e";

  return (
    <span
      title="Free accounts get 5 on-demand AI signals. Re-opening a signal you already have is free until it expires."
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 11, fontFamily: "'Space Mono',monospace", color,
        background: `${color}15`, border: `1px solid ${color}55`,
        borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap",
      }}
    >
      ⚡ {left} of {q.limit} free signals left
    </span>
  );
}
