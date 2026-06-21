"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  GRAD_PRIMARY,
  PRIMARY, ERROR, WHITE, MID, INK, BORDER, R_SM, R_LG,
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

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 55%, #F0FDF4 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes floatA { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-16px)} }
        @keyframes floatB { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-16px,20px)} }
      `}</style>

      {/* Light ambient blobs */}
      <div style={{ position: "absolute", width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)", top: -120, left: -120, animation: "floatA 10s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(13,148,136,0.07) 0%, transparent 70%)", bottom: -80, right: -60, animation: "floatB 12s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)", top: "35%", right: "12%", animation: "floatA 14s ease-in-out infinite reverse", pointerEvents: "none" }} />

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 400, position: "relative", zIndex: 1,
        background: WHITE,
        borderRadius: R_LG + 4,
        padding: "40px 40px 36px",
        boxShadow: "0 4px 6px rgba(15,23,42,0.04), 0 20px 40px rgba(15,23,42,0.10), 0 0 0 1px rgba(15,23,42,0.06)",
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "center" }}>
          <Image
            src="/Printribe-Logo-TM-without-bg-1@2x.png"
            alt="Printribe"
            width={160}
            height={52}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        <div style={{ fontSize: 24, fontWeight: 700, color: INK, letterSpacing: "-0.03em", marginBottom: 6 }}>Welcome back</div>
        <div style={{ fontSize: 14, color: MID, marginBottom: 28, lineHeight: 1.5 }}>Sign in to your workspace</div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: INK, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email" autoComplete="email"
            value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${BORDER}`, borderRadius: R_SM, fontSize: 14, outline: "none", background: WHITE, color: INK, fontFamily: "inherit" }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: INK, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"} autoComplete="current-password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Enter your password"
              style={{ width: "100%", padding: "11px 44px 11px 14px", border: `1.5px solid ${error ? ERROR : BORDER}`, borderRadius: R_SM, fontSize: 14, outline: "none", background: WHITE, color: INK, fontFamily: "inherit" }}
            />
            <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: MID, padding: 2 }} aria-label={showPw ? "Hide password" : "Show password"}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showPw ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" /></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
              </svg>
            </button>
          </div>
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={ERROR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <div style={{ fontSize: 12, color: ERROR }}>{error}</div>
            </div>
          )}
        </div>

        {/* Sign in button */}
        <button
          onClick={handleLogin} disabled={loading}
          style={{
            width: "100%", padding: "13px 16px",
            background: loading ? "rgba(79,70,229,0.65)" : GRAD_PRIMARY,
            color: WHITE, border: "none", borderRadius: R_SM,
            fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "-0.01em",
            boxShadow: loading ? "none" : "0 4px 14px rgba(79,70,229,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "opacity 150ms ease",
          }}
        >
          {loading ? (
            <>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Signing in…
            </>
          ) : "Sign in →"}
        </button>
      </div>
    </div>
  );
}
