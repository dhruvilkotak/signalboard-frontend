// src/lib/platform.js — where the app is running.
// isNativeApp is true only inside the iPhone app (Capacitor); false in any browser.
import { Capacitor } from "@capacitor/core";

export const isNativeApp = Capacitor.isNativePlatform();
export const isIOSApp    = Capacitor.getPlatform() === "ios";

// Public website — used to send app users to pages the app doesn't host (e.g. Request Access).
export const WEB_URL = import.meta.env.VITE_WEB_URL || "https://signalboard-frontend.vercel.app";
