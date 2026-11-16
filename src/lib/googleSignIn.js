// src/lib/googleSignIn.js — one Google sign-in for web and the iPhone app.
//   Web:        Firebase popup (unchanged behaviour).
//   iPhone app: native Google sheet via @capacitor-firebase/authentication, then the
//               Google ID token signs in the Firebase JS SDK, so Firestore and API
//               tokens work exactly as on web.
import { GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from "./firebase";
import { isNativeApp } from "./platform";

const nativeAuth = () => import("@capacitor-firebase/authentication").then(m => m.FirebaseAuthentication);

export async function signInWithGoogle() {
  if (!isNativeApp) return signInWithPopup(auth, provider);

  const FirebaseAuthentication = await nativeAuth();
  let result;
  try {
    result = await FirebaseAuthentication.signInWithGoogle();
  } catch (e) {
    const err = new Error(e?.message || "Google sign-in failed.");
    err.code = /cancel/i.test(e?.message || "") ? "auth/popup-closed-by-user" : (e?.code || "auth/internal-error");
    throw err;
  }
  const idToken = result?.credential?.idToken;
  if (!idToken) {
    const err = new Error("Google sign-in was cancelled.");
    err.code = "auth/popup-closed-by-user";
    throw err;
  }
  return signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
}

// Signs out of Firebase and, in the app, of the native Google session too
// (so the account picker shows again next time).
export async function signOutEverywhere() {
  if (isNativeApp) {
    try { await (await nativeAuth()).signOut(); } catch { /* not signed in natively */ }
  }
  return signOut(auth);
}
