// src/pages/Login.jsx
// Login + Register page — shown when user is not authenticated

import { useState } from "react";

export default function Login({ onLogin, onRegister, onGoogle, error, loading }) {
  const [mode,     setMode]     = useState("login"); // "login" | "register"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "register") {
      if (password !== confirm) return alert("Passwords don't match");
      onRegister(email, password);
    } else {
      onLogin(email, password);
    }
  };

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoText}>SignalBoard</span>
          <span style={styles.logoSub}>AI Stock Signals</span>
        </div>

        {/* Tab toggle */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === "login"    ? styles.tabActive : {}) }}
            onClick={() => setMode("login")}
          >Sign In</button>
          <button
            style={{ ...styles.tab, ...(mode === "register" ? styles.tabActive : {}) }}
            onClick={() => setMode("register")}
          >Create Account</button>
        </div>

        {/* Error */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />
          {mode === "register" && (
            <input
              style={styles.input}
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          )}
          <button style={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine} />
        </div>

        {/* Google */}
        <button style={styles.btnGoogle} onClick={onGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <p style={styles.footer}>
          Your watchlist and signals are saved to your account.
        </p>
      </div>
    </div>
  );
}

const styles = {
  bg: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--color-bg, #0d1117)",
    padding: "1rem",
  },
  card: {
    background: "var(--color-surface, #161b22)",
    border: "1px solid var(--color-border, #30363d)",
    borderRadius: 12,
    padding: "2rem",
    width: "100%",
    maxWidth: 400,
  },
  logo: {
    textAlign: "center",
    marginBottom: "1.5rem",
  },
  logoText: {
    display: "block",
    fontSize: 24,
    fontWeight: 700,
    color: "var(--color-text, #e6edf3)",
    letterSpacing: "-0.5px",
  },
  logoSub: {
    display: "block",
    fontSize: 12,
    color: "var(--color-text-muted, #8b949e)",
    marginTop: 2,
  },
  tabs: {
    display: "flex",
    background: "var(--color-bg, #0d1117)",
    borderRadius: 8,
    padding: 3,
    marginBottom: "1.25rem",
    gap: 3,
  },
  tab: {
    flex: 1,
    padding: "7px 0",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    background: "transparent",
    color: "var(--color-text-muted, #8b949e)",
    transition: "all 0.15s",
  },
  tabActive: {
    background: "var(--color-surface, #161b22)",
    color: "var(--color-text, #e6edf3)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
  },
  error: {
    background: "#3d1515",
    border: "1px solid #f85149",
    color: "#f85149",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    marginBottom: "1rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  input: {
    padding: "10px 12px",
    background: "var(--color-bg, #0d1117)",
    border: "1px solid var(--color-border, #30363d)",
    borderRadius: 6,
    color: "var(--color-text, #e6edf3)",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  btnPrimary: {
    padding: "10px",
    background: "#238636",
    border: "1px solid #2ea043",
    borderRadius: 6,
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    transition: "opacity 0.15s",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "1.25rem 0",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "var(--color-border, #30363d)",
  },
  dividerText: {
    fontSize: 12,
    color: "var(--color-text-muted, #8b949e)",
  },
  btnGoogle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "10px",
    background: "var(--color-bg, #0d1117)",
    border: "1px solid var(--color-border, #30363d)",
    borderRadius: 6,
    color: "var(--color-text, #e6edf3)",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "border-color 0.15s",
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "var(--color-text-muted, #8b949e)",
    marginTop: "1.25rem",
    marginBottom: 0,
  },
};