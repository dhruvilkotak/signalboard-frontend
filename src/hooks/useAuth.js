// src/hooks/useAuth.js
// Provides current user + token across the whole app
// Used in App.jsx via context, and called directly in api.js

import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, provider } from "../lib/firebase";

export function useAuth() {
  const [user,    setUser]    = useState(undefined); // undefined = loading
  const [token,   setToken]   = useState(null);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  // Listen for auth state changes — runs once on mount
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        setUser(firebaseUser);
        // Refresh token every 50 minutes (expires at 60)
        const interval = setInterval(async () => {
          const refreshed = await firebaseUser.getIdToken(true);
          setToken(refreshed);
        }, 50 * 60 * 1000);
        return () => clearInterval(interval);
      } else {
        setUser(null);
        setToken(null);
      }
    });
    return unsub;
  }, []);

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

  const registerEmail = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
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

  return { user, token, error, loading, loginEmail, registerEmail, loginGoogle, logout };
}

function friendlyError(code) {
  const map = {
    "auth/user-not-found":       "No account found with that email.",
    "auth/wrong-password":       "Incorrect password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password":        "Password must be at least 6 characters.",
    "auth/invalid-email":        "Please enter a valid email address.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/too-many-requests":    "Too many attempts. Please try again later.",
  };
  return map[code] || "Something went wrong. Please try again.";
}