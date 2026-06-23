"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/context/PermissionsContext";
import { PRIMARY, BORDER, SURFACE, WHITE, INK, MID, SUCCESS, ERROR, R_MD, R_SM, MUTED } from "@/lib/tokens";

const SECTION_KEYS = ["dashboard", "orders", "production", "products", "clients", "vendors", "assets", "quotes"] as const;
type SectionKey = typeof SECTION_KEYS[number];
type Sections = Record<string, boolean>;

const CRUD_SECTIONS = ["orders", "clients", "products", "vendors", "assets", "quotes"] as const;
type CrudSection = typeof CRUD_SECTIONS[number];
const CRUD_ACTIONS = ["create", "edit", "delete"] as const;

type UserPerm = {
  id: number;
  userId: string;
  email: string;
  role: string;
  sections: Sections;
  showFinancials: boolean;
  showHarvey: boolean;
};

const INP: React.CSSProperties = { width: "100%", padding: "9px 12px", border: `1px solid ${BORDER}`, borderRadius: R_SM, fontSize: 13, outline: "none", background: WHITE, boxSizing: "border-box" };

export default function AdminPage() {
  const { role, loading, refresh } = usePermissions();
  const router = useRouter();

  const [users, setUsers] = useState<UserPerm[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetStatus, setResetStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && role !== "admin") router.replace("/");
  }, [role, loading, router]);

  useEffect(() => {
    if (role === "admin") loadUsers();
  }, [role]);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, password: newPassword }),
    });
    const json = await res.json();
    if (!res.ok) { setCreateError(json.error ?? "Failed to create user"); }
    else { setNewEmail(""); setNewPassword(""); await loadUsers(); }
    setCreating(false);
  }

  async function toggleSection(userId: string, key: string, value: boolean) {
    const user = users.find(u => u.userId === userId);
    if (!user) return;
    const sections = { ...user.sections, [key]: value };
    setUsers(prev => prev.map(u => u.userId === userId ? { ...u, sections } : u));
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections }),
    });
    refresh();
  }

  async function toggleFinancials(userId: string, value: boolean) {
    setUsers(prev => prev.map(u => u.userId === userId ? { ...u, showFinancials: value } : u));
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showFinancials: value }),
    });
    refresh();
  }

  async function toggleHarvey(userId: string, value: boolean) {
    setUsers(prev => prev.map(u => u.userId === userId ? { ...u, showHarvey: value } : u));
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showHarvey: value }),
    });
    refresh();
  }

  async function resetUserPassword(userId: string) {
    if (!resetPassword || resetPassword.length < 6) {
      setResetStatus(s => ({ ...s, [userId]: "Min. 6 characters required" }));
      return;
    }
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    const json = await res.json();
    if (res.ok) {
      setResetStatus(s => ({ ...s, [userId]: "Password reset successfully" }));
      setResetUserId(null);
      setResetPassword("");
    } else {
      setResetStatus(s => ({ ...s, [userId]: json.error ?? "Failed" }));
    }
  }

  if (loading || role !== "admin") return null;

  return (
    <div style={{ padding: "32px 28px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 4 }}>Admin Panel</div>
      <div style={{ fontSize: 12, color: MID, marginBottom: 28 }}>Manage users, sections, and financial visibility</div>

      {/* Add User */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: R_MD, padding: 20, marginBottom: 24, maxWidth: 480 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 14 }}>Add New User</div>
        <form onSubmit={createUser} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, color: MID, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</label>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@example.com" style={INP} required />
          </div>
          <div>
            <label style={{ fontSize: 10, color: MID, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" style={INP} required />
          </div>
          {createError && (
            <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: R_SM, background: "#fef2f2", color: ERROR, border: "1px solid #fecaca" }}>{createError}</div>
          )}
          <button type="submit" disabled={creating}
            style={{ padding: "9px 20px", background: PRIMARY, color: WHITE, border: "none", borderRadius: R_SM, fontSize: 13, fontWeight: 700, cursor: creating ? "default" : "pointer", opacity: creating ? 0.7 : 1, alignSelf: "flex-start" }}>
            {creating ? "Creating…" : "Create User"}
          </button>
        </form>
      </div>

      {/* Users table */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: R_MD, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 700, color: INK }}>
          Users ({users.length})
        </div>

        {users.length === 0 ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: MID, fontSize: 13 }}>No users yet</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            {users.map((u, idx) => (
              <div key={u.userId} style={{ padding: "16px 20px", borderBottom: idx < users.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{u.email}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2, textTransform: "capitalize" }}>{u.role}</div>
                  </div>
                  <button
                    onClick={() => { setResetUserId(resetUserId === u.userId ? null : u.userId); setResetPassword(""); setResetStatus({}); }}
                    style={{ fontSize: 11, padding: "5px 12px", borderRadius: R_SM, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>
                    Reset Password
                  </button>
                </div>

                {/* Reset password inline */}
                {resetUserId === u.userId && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                    <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                      placeholder="New password (min. 6 chars)" style={{ ...INP, width: "auto", flex: 1 }} />
                    <button onClick={() => resetUserPassword(u.userId)}
                      style={{ padding: "8px 14px", background: PRIMARY, color: WHITE, border: "none", borderRadius: R_SM, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                      Save
                    </button>
                    {resetStatus[u.userId] && (
                      <span style={{ fontSize: 11, color: resetStatus[u.userId].includes("success") ? SUCCESS : ERROR }}>{resetStatus[u.userId]}</span>
                    )}
                  </div>
                )}

                {u.role === "admin" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: SUCCESS + "0d", border: `1px solid ${SUCCESS}30`, borderRadius: 8 }}>
                    <span style={{ fontSize: 14 }}>🔒</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: SUCCESS }}>Full Access — Admin</div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>All sections, permissions and financials are always enabled. Only changeable via code.</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Sections */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Sections & Permissions</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {SECTION_KEYS.map(key => {
                          const enabled = u.sections?.[key] !== false;
                          const hasCrud = (CRUD_SECTIONS as readonly string[]).includes(key);
                          return (
                            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <button onClick={() => toggleSection(u.userId, key, !enabled)}
                                style={{
                                  fontSize: 11, padding: "4px 10px", borderRadius: 20, cursor: "pointer", fontWeight: 600,
                                  border: `1px solid ${enabled ? PRIMARY : BORDER}`,
                                  background: enabled ? PRIMARY + "15" : SURFACE,
                                  color: enabled ? PRIMARY : MID,
                                  textTransform: "capitalize", minWidth: 90,
                                }}>
                                {enabled ? "✓ " : ""}{key.charAt(0).toUpperCase() + key.slice(1)}
                              </button>
                              {hasCrud && enabled && CRUD_ACTIONS.map(action => {
                                const crudKey = `${key}.${action}`;
                                const crudEnabled = u.sections?.[crudKey] !== false;
                                return (
                                  <button key={action} onClick={() => toggleSection(u.userId, crudKey, !crudEnabled)}
                                    style={{
                                      fontSize: 10, padding: "3px 8px", borderRadius: 20, cursor: "pointer", fontWeight: 600,
                                      border: `1px solid ${crudEnabled ? SUCCESS : BORDER}`,
                                      background: crudEnabled ? SUCCESS + "15" : SURFACE,
                                      color: crudEnabled ? SUCCESS : MID,
                                      textTransform: "capitalize",
                                    }}>
                                    {crudEnabled ? "✓ " : ""}{action}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Financials + Harvey toggles */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Show Financials</div>
                        <button onClick={() => toggleFinancials(u.userId, !u.showFinancials)}
                          style={{
                            fontSize: 11, padding: "4px 12px", borderRadius: 20, cursor: "pointer", fontWeight: 600,
                            border: `1px solid ${u.showFinancials ? SUCCESS : BORDER}`,
                            background: u.showFinancials ? SUCCESS + "15" : SURFACE,
                            color: u.showFinancials ? SUCCESS : MID,
                          }}>
                          {u.showFinancials ? "✓ Visible" : "Hidden"}
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Harvey AI</div>
                        <button onClick={() => toggleHarvey(u.userId, !u.showHarvey)}
                          style={{
                            fontSize: 11, padding: "4px 12px", borderRadius: 20, cursor: "pointer", fontWeight: 600,
                            border: `1px solid ${u.showHarvey ? "#7c3aed" : BORDER}`,
                            background: u.showHarvey ? "#7c3aed18" : SURFACE,
                            color: u.showHarvey ? "#7c3aed" : MID,
                          }}>
                          {u.showHarvey ? "✓ On" : "Off"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
