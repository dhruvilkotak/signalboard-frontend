// src/components/TermsGate.jsx
// Wrap the signed-in app:  <TermsGate><App /></TermsGate>
//
// While flag `terms_gate` is on and the user hasn't accepted the current
// version, shows TermsModal in "update" mode over the app (no way to close it
// except Accept or Sign out). Re-checks on focus and whenever any API call
// dispatches the "signalboard:terms-required" event (see WIRING.md).

import { useCallback, useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useFlag } from "../hooks/useFeatureFlags";
import TermsModal, { TERMS_VERSION } from "./TermsModal";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";
export const TERMS_REQUIRED_EVENT = "signalboard:terms-required";

async function authedFetch(path, options = {}) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function TermsGate({ children }) {
  const gateOn = useFlag("terms_gate");
  const [consent, setConsent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const check = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const { ok, data } = await authedFetch("/api/me/consent");
      if (ok) setConsent(data);
    } catch {
      /* network blip: keep last state; backend still enforces */
    }
  }, []);

  useEffect(() => {
    if (!gateOn) return;
    check();
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    window.addEventListener(TERMS_REQUIRED_EVENT, check);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(TERMS_REQUIRED_EVENT, check);
    };
  }, [gateOn, check]);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await authedFetch("/api/consent/accept", {
        method: "POST",
        body: JSON.stringify({ terms_version: TERMS_VERSION, platform: "web" }),
      });
      if (ok) {
        setConsent(c => ({ ...c, accepted_version: TERMS_VERSION, needs_acceptance: false }));
      } else if (data?.detail?.code === "TERMS_VERSION_MISMATCH") {
        setError("These Terms were just updated. Refresh the page to read the latest version.");
      } else {
        setError("Couldn't save your acceptance. Please try again.");
      }
    } catch {
      setError("Couldn't save your acceptance. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const blocked = gateOn && consent?.gate_enabled && consent?.needs_acceptance;

  return (
    <>
      {children}
      {blocked && (
        <TermsModal
          mode="update"
          summary={consent.summary_of_changes}
          onAccept={accept}
          onDecline={() => signOut(auth)}
          busy={busy}
          error={error}
        />
      )}
    </>
  );
}
