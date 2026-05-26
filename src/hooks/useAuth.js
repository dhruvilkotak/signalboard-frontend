// src/hooks/useAuth.js
// Auth — pending status check + isAdmin + 30-min idle auto sign-out

import { useState, useEffect, useRef } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, provider, db } from "../lib/firebase";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARN_BEFORE_MS  =  5 * 60 * 1000;
const ADMIN_UIDS      = ["2fKDBFccZVOwlyaU6QIs4rQTNKb2"];

export function useAuth() {
  const [user,        setUser]        = useState(undefined);
  const [token,       setToken]       = useState(null);
  const [isAdmin,     setIsAdmin]     = useState(false);
  const [isPending,   setIsPending]   = useState(false);
  const [error,       setError]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);

  const idleTimer = useRef(null);
  const warnTimer = useRef(null);

  const resetIdleTimer = () => {
    clearTimeout(idleTimer.current);
    clearTimeout(warnTimer.current);
    setIdleWarning(false);
    warnTimer.current = setTimeout(() => setIdleWarning(true), IDLE_TIMEOUT_MS - WARN_BEFORE_MS);
    idleTimer.current = setTimeout(() => signOut(auth), IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Admins always bypass
        if (ADMIN_UIDS.includes(firebaseUser.uid)) {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          setUser(firebaseUser);
          setIsAdmin(true);
          setIsPending(false);
          setError(null);
          const iv = setInterval(async () => {
            setToken(await firebaseUser.getIdToken(true));
          }, 50 * 60 * 1000);
          return () => clearInterval(iv);
        }

        // Check user status in Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          if (!userDoc.exists()) {
            // No profile — not registered via our signup form
            await signOut(auth);
            setError("No account found. Please request access first.");
            setUser(null);
            setToken(null);
            return;
          }

          const data = userDoc.data();

          if (data.status === "pending") {
            // Account exists but not approved yet
            setUser(firebaseUser);
            setIsPending(true);
            setError(null);
            return;
          }

          if (data.status !== "approved") {
            await signOut(auth);
            setError("Your account has been suspended. Contact admin.");
            setUser(null);
            setToken(null);
            return;
          }

          // Approved — full access
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          setUser(firebaseUser);
          setIsPending(false);
          setError(null);

          try {
            const adminDoc = await getDoc(doc(db, "admins", firebaseUser.uid));
            setIsAdmin(adminDoc.exists());
          } catch {
            setIsAdmin(false);
          }

          const iv = setInterval(async () => {
            setToken(await firebaseUser.getIdToken(true));
          }, 50 * 60 * 1000);
          return () => clearInterval(iv);

        } catch (e) {
          console.error("Auth check error:", e);
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
        setIsAdmin(false);
        setIsPending(false);
        setIdleWarning(false);
        clearTimeout(idleTimer.current);
        clearTimeout(warnTimer.current);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user || isPending) return;
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      clearTimeout(idleTimer.current);
      clearTimeout(warnTimer.current);
    };
  }, [user, isPending]);

  const loginEmail = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => signOut(auth);

  return {
    user, token, isAdmin, isPending,
    idleWarning, error, loading,
    loginEmail, loginGoogle, logout,
  };
}

function friendlyError(code) {
  const map = {
    "auth/user-not-found":       "No account found with that email.",
    "auth/wrong-password":       "Incorrect password.",
    "auth/invalid-credential":   "Incorrect email or password.",
    "auth/invalid-email":        "Please enter a valid email address.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/too-many-requests":    "Too many attempts. Please try again later.",
  };
  return map[code] || "Something went wrong. Please try again.";
}