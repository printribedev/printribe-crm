"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const R = "#EE3C30";
const BORDER = "#E8E7E3";
const BG = "#F7F6F2";
const MID = "#888";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("info@theprintribe.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Incorrect email or password.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 360, background: "#fff", borderRadius: 16, padding: 40, border: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: R, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#fff" }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>Printribe</div>
            <div style={{ fontSize: 10, color: MID, letterSpacing: "0.08em", textTransform: "uppercase" }}>Operations CRM</div>
          </div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Welcome back</div>
        <div style={{ fontSize: 13, color: MID, marginBottom: 28 }}>Sign in to your workspace</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: MID, marginBottom: 6 }}>EMAIL</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: "none" }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: MID, marginBottom: 6 }}>PASSWORD</div>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Enter password"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${error ? R : BORDER}`, borderRadius: 8, fontSize: 13, outline: "none" }}
          />
          {error && <div style={{ fontSize: 11, color: R, marginTop: 5 }}>{error}</div>}
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: "100%", padding: 12, background: R, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
