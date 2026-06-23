"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/context/PermissionsContext";
import { PRIMARY, BORDER, SURFACE, WHITE, INK, MID, SUCCESS, ERROR, R_MD, R_SM } from "@/lib/tokens";

export default function ProfilePage() {
  const { email, role } = usePermissions();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) { setStatus("error"); setMessage("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setStatus("error"); setMessage("Passwords do not match."); return; }

    setStatus("loading");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("success");
      setMessage("Password changed successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  const INP: React.CSSProperties = { width: "100%", padding: "9px 12px", border: `1px solid ${BORDER}`, borderRadius: R_SM, fontSize: 13, outline: "none", background: WHITE, boxSizing: "border-box" };

  return (
    <div style={{ padding: "32px 28px", maxWidth: 480 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 4 }}>Profile</div>
      <div style={{ fontSize: 12, color: MID, marginBottom: 28 }}>Manage your account settings</div>

      {/* Account info */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: R_MD, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 14 }}>Account</div>
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          <span style={{ color: MID }}>Email: </span><strong>{email || "—"}</strong>
        </div>
        <div style={{ fontSize: 13 }}>
          <span style={{ color: MID }}>Role: </span>
          <span style={{ fontWeight: 600, color: role === "admin" ? PRIMARY : INK, textTransform: "capitalize" }}>{role}</span>
        </div>
      </div>

      {/* Change password */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: R_MD, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 14 }}>Change Password</div>
        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, color: MID, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" style={INP} required />
          </div>
          <div>
            <label style={{ fontSize: 10, color: MID, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" style={INP} required />
          </div>

          {status !== "idle" && (
            <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: R_SM, background: status === "success" ? "#f0fdf4" : "#fef2f2", color: status === "success" ? SUCCESS : ERROR, border: `1px solid ${status === "success" ? "#bbf7d0" : "#fecaca"}` }}>
              {message}
            </div>
          )}

          <button type="submit" disabled={status === "loading"}
            style={{ padding: "9px 20px", background: PRIMARY, color: WHITE, border: "none", borderRadius: R_SM, fontSize: 13, fontWeight: 700, cursor: status === "loading" ? "default" : "pointer", opacity: status === "loading" ? 0.7 : 1 }}>
            {status === "loading" ? "Saving…" : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
