// src/hooks/useAuth.js
// Auth hook — includes isAdmin check via Firestore admins collection

import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, provider, db } from "../lib/firebase";

export function useAuth() {
  const [user,    setUser]    = useState(undefined); // undefined = loading
  const [token,   setToken]   = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get token
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        setUser(firebaseUser);

        // Check if admin — look up admins/{uid} in Firestore
        try {
          const adminDoc = await getDoc(doc(db, "admins", firebaseUser.uid));
          setIsAdmin(adminDoc.exists());
        } catch (e) {
          setIsAdmin(false);
        }

        // Refresh token every 50 min
        const interval = setInterval(async () => {
          const refreshed = await firebaseUser.getIdToken(true);
          setToken(refreshed);
        }, 50 * 60 * 1000);
        return () => clearInterval(interval);

      } else {
        setUser(null);
        setToken(null);
        setIsAdmin(false);
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

  return { user, token, isAdmin, error, loading, loginEmail, loginGoogle, logout };
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