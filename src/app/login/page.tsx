"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  PRIMARY, PRIMARY_HOVER, SURFACE, SURFACE2, BORDER, BORDER_STRONG,
  INK, MID, MUTED, WHITE, ERROR, SHADOW_XL, R_SM, R_MD, R_LG,
} from "@/lib/tokens";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("theprintribe@gmail.com");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Incorrect email or password. Please try again.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  const inputStyle = (hasError = false): React.CSSProperties => ({
    width: "100%", padding: "11px 14px",
    border: `1.5px solid ${hasError ? ERROR : BORDER}`,
    borderRadius: R_SM, fontSize: 14, outline: "none", background: WHITE,
    color: INK, fontFamily: "inherit",
    transition: "border-color 150ms ease",
  });

  return (
    <div style={{
      minHeight: "100vh", background: SURFACE,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      {/* Background accent */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, ${PRIMARY} 0%, #818CF8 100%)`,
      }} />

      <div style={{
        width: "100%", maxWidth: 400, background: WHITE,
        borderRadius: R_LG, padding: "40px 40px 36px",
        boxShadow: SHADOW_XL, border: `1px solid ${BORDER}`,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
          <div style={{
            width: 38, height: 38, borderRadius: R_MD,
            background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: INK, letterSpacing: "-0.02em", lineHeight: 1.2 }}>Printribe</div>
            <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>Operations CRM</div>
          </div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, color: INK, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Welcome back
        </div>
        <div style={{ fontSize: 14, color: MID, marginBottom: 28, lineHeight: 1.5 }}>
          Sign in to your workspace
        </div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: INK, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle()}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: INK, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Enter your password"
              style={{ ...inputStyle(!!error), paddingRight: 44 }}
            />
            <button
              onClick={() => setShowPw(!showPw)}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: MID, padding: 2,
              }}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showPw
                  ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" /></>
                  : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                }
              </svg>
            </button>
          </div>
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={ERROR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div style={{ fontSize: 12, color: ERROR }}>{error}</div>
            </div>
          )}
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "12px 16px",
            background: loading ? PRIMARY + "99" : PRIMARY,
            color: WHITE, border: "none", borderRadius: R_SM,
            fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "-0.01em", transition: "background 150ms ease",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {loading ? (
            <>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Signing in…
            </>
          ) : "Sign in"}
        </button>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
