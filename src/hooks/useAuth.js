// src/hooks/useAuth.js
// Auth hook — isAdmin check + 30-min idle auto sign-out

import { useState, useEffect, useRef } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, provider, db } from "../lib/firebase";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
const WARN_BEFORE_MS  =  5 * 60 * 1000; // warn 5 min before

export function useAuth() {
  const [user,        setUser]        = useState(undefined);
  const [token,       setToken]       = useState(null);
  const [isAdmin,     setIsAdmin]     = useState(false);
  const [error,       setError]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);

  const idleTimer = useRef(null);
  const warnTimer = useRef(null);

  const resetIdleTimer = () => {
    clearTimeout(idleTimer.current);
    clearTimeout(warnTimer.current);
    setIdleWarning(false);

    warnTimer.current = setTimeout(() => {
      setIdleWarning(true);
    }, IDLE_TIMEOUT_MS - WARN_BEFORE_MS);

    idleTimer.current = setTimeout(() => {
      signOut(auth);
    }, IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        setUser(firebaseUser);

        try {
          const adminDoc = await getDoc(doc(db, "admins", firebaseUser.uid));
          setIsAdmin(adminDoc.exists());
        } catch {
          setIsAdmin(false);
        }

        const interval = setInterval(async () => {
          const refreshed = await firebaseUser.getIdToken(true);
          setToken(refreshed);
        }, 50 * 60 * 1000);

        return () => clearInterval(interval);
      } else {
        setUser(null);
        setToken(null);
        setIsAdmin(false);
        setIdleWarning(false);
        clearTimeout(idleTimer.current);
        clearTimeout(warnTimer.current);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      clearTimeout(idleTimer.current);
      clearTimeout(warnTimer.current);
    };
  }, [user]);

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

  return { user, token, isAdmin, idleWarning, error, loading, loginEmail, loginGoogle, logout };
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
