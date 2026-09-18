"use client";

import { useEffect, useRef, useState } from "react";
import { usePermissions } from "@/context/PermissionsContext";
import LoadingScreen from "@/components/LoadingScreen";
import { PRIMARY, SUCCESS, ERROR, GOLD, PURPLE, INK, MID, BORDER, SURFACE, WHITE, R_SM, R_MD } from "@/lib/tokens";

const BLUE = PRIMARY, GREEN = SUCCESS, R = ERROR, BG = SURFACE, BLACK = INK;
const CARD_RADIUS = R_MD, BTN_RADIUS = R_SM;

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  design_review: "Design Review",
  approved: "Approved",
  converted: "Converted",
  closed: "Closed",
};
const STATUS_COLORS: Record<string, string> = {
  open: BLUE,
  design_review: GOLD,
  approved: GREEN,
  converted: PURPLE,
  closed: MID,
};

type EnquiryFile = { id: number; label: string; url: string; uploadedBy: string };
type Enquiry = {
  id: number;
  token: string;
  title: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  product: string | null;
  notes: string | null;
  status: string;
  clientApproved: boolean;
  teamApproved: boolean;
  sizeColumns: string[];
  sizeRows: Record<string, string>[];
  files: EnquiryFile[];
  createdAt: string;
};

const STATUSES = ["open", "design_review", "approved", "converted", "closed"];

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: BTN_RADIUS, background: color + "18", color }}>
      {text}
    </span>
  );
}

function SizeColumnsEditor({ columns, onChange }: { columns: string[]; onChange: (cols: string[]) => void }) {
  const [newCol, setNewCol] = useState("");
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {columns.map((col, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: BLUE + "12", color: BLUE, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
            {col}
            <button onClick={() => onChange(columns.filter((_, j) => j !== i))}
              style={{ background: "none", border: "none", cursor: "pointer", color: BLUE, fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          </span>
        ))}
        {columns.length === 0 && <span style={{ fontSize: 12, color: MID }}>No columns yet</span>}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={newCol} onChange={e => setNewCol(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && newCol.trim()) { onChange([...columns, newCol.trim()]); setNewCol(""); } }}
          placeholder="e.g. Size, Chest, Qty…"
          style={{ flex: 1, padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, outline: "none" }} />
        <button onClick={() => { if (newCol.trim()) { onChange([...columns, newCol.trim()]); setNewCol(""); } }}
          style={{ padding: "6px 12px", background: BLUE, color: WHITE, border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Add</button>
      </div>
    </div>
  );
}

function Modal({ enquiry, onSave, onClose }: {
  enquiry: Partial<Enquiry> & { id?: number };
  onSave: (v: Partial<Enquiry>) => void;
  onClose: () => void;
}) {
  const isNew = !enquiry.id;
  const [form, setForm] = useState<Partial<Enquiry> & { title: string; status: string; teamApproved: boolean }>({
    title: enquiry.title ?? "",
    clientName: enquiry.clientName ?? "",
    clientEmail: enquiry.clientEmail ?? "",
    clientPhone: enquiry.clientPhone ?? "",
    product: enquiry.product ?? "",
    notes: enquiry.notes ?? "",
    status: enquiry.status ?? "open",
    teamApproved: enquiry.teamApproved ?? false,
    sizeColumns: enquiry.sizeColumns ?? [],
  });
  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? "New Enquiry" : "Edit Enquiry"}</div>
          <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: BTN_RADIUS, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { key: "title", label: "Title / Label", full: true },
            { key: "product", label: "Product / Item", full: true },
            { key: "clientName", label: "Client Name" },
            { key: "clientPhone", label: "Phone" },
            { key: "clientEmail", label: "Email", full: true },
          ].map(f => (
            <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : "auto" }}>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>{f.label}</div>
              <input value={String(form[f.key as keyof typeof form])} onChange={e => set(f.key, e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>Notes</div>
            <textarea value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} rows={3}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>
          {!isNew && (
            <div>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>Status</div>
              <select value={form.status} onChange={e => set("status", e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, fontSize: 13, outline: "none" }}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          )}
          {!isNew && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 18 }}>
              <input type="checkbox" id="teamApproved" checked={form.teamApproved} onChange={e => set("teamApproved", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }} />
              <label htmlFor="teamApproved" style={{ fontSize: 13, cursor: "pointer" }}>Team approved design</label>
            </div>
          )}
          {!isNew && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, color: MID, marginBottom: 6, fontWeight: 600 }}>Size Chart Columns</div>
              <SizeColumnsEditor
                columns={form.sizeColumns ?? []}
                onChange={cols => setForm(p => ({ ...p, sizeColumns: cols }))}
              />
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ fontSize: 12, padding: "9px 16px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
          <button onClick={() => onSave(form)} style={{ fontSize: 12, padding: "9px 20px", borderRadius: BTN_RADIUS, background: BLUE, color: WHITE, border: "none", cursor: "pointer", fontWeight: 700 }}>
            {isNew ? "Create enquiry" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EnquiriesPage() {
  const { canDo } = usePermissions();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Enquiry> | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleRefresh() {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => load(), 3000);
  }

  async function load() {
    const res = await fetch("/api/enquiries");
    const data = await res.json();
    setEnquiries(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: Partial<Enquiry>) {
    const snapshot = form.id ? enquiries.find(e => e.id === form.id) : null;
    setModal(null);
    if (form.id && snapshot) {
      setEnquiries(prev => prev.map(e => e.id === form.id ? { ...snapshot, ...form } : e));
    }
    await new Promise(r => setTimeout(r, 0));
    setSaving(true);
    try {
      if (form.id) {
        const res = await fetch(`/api/enquiries/${form.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (res.ok) {
          const updated = await res.json();
          setEnquiries(prev => prev.map(e => e.id === form.id ? updated : e));
        } else if (snapshot) {
          setEnquiries(prev => prev.map(e => e.id === form.id ? snapshot : e));
        }
      } else {
        const res = await fetch("/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (res.ok) {
          const created = await res.json();
          setEnquiries(prev => [created, ...prev]);
        }
      }
      scheduleRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this enquiry? This cannot be undone.")) return;
    setEnquiries(prev => prev.filter(e => e.id !== id));
    await fetch(`/api/enquiries/${id}`, { method: "DELETE" });
    scheduleRefresh();
  }

  function copyLink(enquiry: Enquiry) {
    const url = `${window.location.origin}/enquiry/${enquiry.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(enquiry.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="page-pad" style={{ padding: "26px 28px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK, letterSpacing: "-0.01em" }}>Enquiries</div>
          <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>{enquiries.length} total</div>
        </div>
        {canDo("enquiries", "create") && (
          <button onClick={() => setModal({})} style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: BTN_RADIUS, background: BLUE, color: WHITE, border: "none", cursor: "pointer" }}>
            + New enquiry
          </button>
        )}
      </div>

      <div className="table-scroll">
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: CARD_RADIUS, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: BLACK, color: WHITE }}>
                {["Title", "Client", "Product", "Status", "Design", "Files", "Created", ""].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enquiries.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? WHITE : BG }}>
                  <td style={{ padding: "12px 14px", fontWeight: 600, maxWidth: 200 }}>{e.title}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div>{e.clientName || <span style={{ color: MID }}>—</span>}</div>
                    {e.clientPhone && <div style={{ fontSize: 11, color: MID }}>{e.clientPhone}</div>}
                  </td>
                  <td style={{ padding: "12px 14px", color: MID }}>{e.product || "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <Badge text={STATUS_LABELS[e.status] ?? e.status} color={STATUS_COLORS[e.status] ?? MID} />
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 11 }}>
                      {e.clientApproved
                        ? <span style={{ color: GREEN, fontWeight: 600 }}>Client ✓</span>
                        : <span style={{ color: MID }}>Client pending</span>}
                    </div>
                    <div style={{ fontSize: 11 }}>
                      {e.teamApproved
                        ? <span style={{ color: GREEN, fontWeight: 600 }}>Team ✓</span>
                        : <span style={{ color: MID }}>Team pending</span>}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", color: MID }}>{e.files.length}</td>
                  <td style={{ padding: "12px 14px", color: MID, whiteSpace: "nowrap" }}>
                    {new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => copyLink(e)}
                        style={{ padding: "5px 10px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: copiedId === e.id ? GREEN + "18" : WHITE, cursor: "pointer", fontSize: 11, color: copiedId === e.id ? GREEN : MID, fontWeight: 600 }}>
                        {copiedId === e.id ? "Copied!" : "Copy link"}
                      </button>
                      {canDo("enquiries", "edit") && (
                        <button onClick={() => setModal(e)}
                          style={{ padding: "5px 10px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", fontSize: 11, color: MID }}>
                          Edit
                        </button>
                      )}
                      {canDo("enquiries", "delete") && (
                        <button onClick={() => handleDelete(e.id)}
                          style={{ padding: "5px 10px", borderRadius: BTN_RADIUS, border: `1px solid ${R}20`, background: WHITE, cursor: "pointer", fontSize: 11, color: R }}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {enquiries.length === 0 && (
                <tr><td colSpan={8} style={{ padding: "36px 14px", textAlign: "center", color: MID, fontSize: 13 }}>No enquiries yet. Click "+ New enquiry" to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && <Modal enquiry={modal} onSave={handleSave} onClose={() => setModal(null)} />}

      {saving && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: BLACK, color: WHITE, padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, zIndex: 2000, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: WHITE, borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
          Syncing…
        </div>
      )}
    </div>
  );
}
