// src/hooks/useApiToken.js — wires the signed-in user's Firebase token into lib/api.js.
// Returns true once a token is available, so pages can wait before their first API call.
import { useEffect, useState } from "react";
import { setTokenGetter } from "../lib/api";

export function useApiToken(auth) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (auth.token) {
      setTokenGetter(() => Promise.resolve(auth.token));
      setReady(true);
    } else {
      setTokenGetter(() => auth.user?.getIdToken() ?? Promise.resolve(null));
      setReady(false);
    }
  }, [auth.token, auth.user]);
  return ready;
}
