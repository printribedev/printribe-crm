"use client";

import { useEffect, useRef, useState } from "react";
import { usePermissions } from "@/context/PermissionsContext";
import LoadingScreen from "@/components/LoadingScreen";
import { PRIMARY, SUCCESS, ERROR, GOLD, PURPLE, INK, MID, BORDER, SURFACE, WHITE, R_SM, R_MD } from "@/lib/tokens";
import { useRouter } from "next/navigation";

const BLUE = PRIMARY, GREEN = SUCCESS, R = ERROR, BG = SURFACE, BLACK = INK;
const CARD_RADIUS = R_MD, BTN_RADIUS = R_SM;

const STATUS_LABELS: Record<string, string> = {
  open: "Open", design_review: "Design Review", approved: "Approved",
  converted: "Converted", closed: "Closed",
};
const STATUS_COLORS: Record<string, string> = {
  open: BLUE, design_review: GOLD, approved: GREEN, converted: PURPLE, closed: MID,
};
const STEP_ORDER = ["details", "requirements", "references", "design", "sizes", "confirm"];
const STEP_EMOJI: Record<string, string> = {
  details: "👋", requirements: "📋", references: "📎", design: "🎨", sizes: "📐", confirm: "✅",
};

type EnquiryFile = { id: number; label: string; url: string; fileName: string; uploadedBy: string };
type Enquiry = {
  id: number; token: string; ref: string; title: string;
  clientId: number | null; clientName: string | null; clientEmail: string | null;
  clientPhone: string | null; orgName: string | null;
  productId: number | null; product: string | null; notes: string | null;
  status: string; clientApproved: boolean; teamApproved: boolean;
  qty: number | null; deliveryDate: string | null; clientNotes: string | null;
  mockupUrl: string | null; mockupKey: string | null;
  changeRequest: string | null;
  sizeColumns: string[]; sizeRows: Record<string, string>[];
  nameNumberEnabled: boolean; nameNumberRows: Array<{ size: string; name: string; number: string }>;
  completedSteps: string[];
  files: EnquiryFile[];
  createdAt: string;
};
type ClientOption = { id: number; name: string; email: string | null; phone: string | null };
type ProductOption = { id: number; name: string };

const STATUSES = ["open", "design_review", "approved", "converted", "closed"];

function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: BTN_RADIUS, background: color + "18", color }}>{text}</span>;
}

function StepProgress({ completed }: { completed: string[] }) {
  return (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {STEP_ORDER.map(s => {
        const done = completed.includes(s);
        return (
          <span key={s} title={s.charAt(0).toUpperCase() + s.slice(1)}
            style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: done ? GREEN + "18" : BG, color: done ? GREEN : MID, border: `1px solid ${done ? GREEN + "40" : BORDER}`, fontWeight: done ? 700 : 400 }}>
            {STEP_EMOJI[s]}
          </span>
        );
      })}
      <span style={{ fontSize: 10, color: MID, marginLeft: 2, alignSelf: "center" }}>{completed.length}/{STEP_ORDER.length}</span>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function Modal({ enquiry, clients, products, onSave, onClose }: {
  enquiry: Partial<Enquiry> & { id?: number };
  clients: ClientOption[]; products: ProductOption[];
  onSave: (v: Partial<Enquiry>) => void; onClose: () => void;
}) {
  const isNew = !enquiry.id;
  const [form, setForm] = useState<Partial<Enquiry> & { title: string; status: string; teamApproved: boolean }>({
    title: enquiry.title ?? "", clientId: enquiry.clientId ?? null, clientName: enquiry.clientName ?? "",
    clientEmail: enquiry.clientEmail ?? "", clientPhone: enquiry.clientPhone ?? "",
    orgName: enquiry.orgName ?? "", productId: enquiry.productId ?? null, product: enquiry.product ?? "",
    notes: enquiry.notes ?? "", status: enquiry.status ?? "open",
    teamApproved: enquiry.teamApproved ?? false,
    sizeColumns: enquiry.sizeColumns ?? [],
    nameNumberEnabled: enquiry.nameNumberEnabled ?? false,
  });

  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, fontSize: 13, outline: "none", boxSizing: "border-box", background: WHITE };
  const selectStyle = { ...inputStyle, cursor: "pointer" };

  function pickClient(id: number | "") {
    if (id === "") { setForm(p => ({ ...p, clientId: null, clientName: "", clientEmail: "", clientPhone: "" })); return; }
    const c = clients.find(c => c.id === Number(id));
    if (c) setForm(p => ({ ...p, clientId: c.id, clientName: c.name, clientEmail: c.email ?? "", clientPhone: c.phone ?? "" }));
  }
  function pickProduct(id: number | "") {
    if (id === "") { setForm(p => ({ ...p, productId: null, product: "" })); return; }
    const pr = products.find(p => p.id === Number(id));
    if (pr) setForm(p => ({ ...p, productId: pr.id, product: pr.name }));
  }

  function SizeColumnsEditor({ columns, onChange }: { columns: string[]; onChange: (c: string[]) => void }) {
    const [newCol, setNewCol] = useState("");
    return (
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {columns.map((col, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: BLUE + "12", color: BLUE, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
              {col}
              <button onClick={() => onChange(columns.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: BLUE, fontSize: 14 }}>×</button>
            </span>
          ))}
          {columns.length === 0 && <span style={{ fontSize: 12, color: MID }}>No columns yet</span>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={newCol} onChange={e => setNewCol(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newCol.trim()) { onChange([...columns, newCol.trim()]); setNewCol(""); } }}
            placeholder="e.g. Size, Chest, Qty…" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={() => { if (newCol.trim()) { onChange([...columns, newCol.trim()]); setNewCol(""); } }}
            style={{ padding: "6px 12px", background: BLUE, color: WHITE, border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Add</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, width: "100%", maxWidth: 540, maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? "New Enquiry" : `Edit — ${enquiry.ref ?? ""}`}</div>
            <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: BTN_RADIUS, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>Title / Label *</div>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. AC Milan Jerseys – June 2025" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>Client</div>
              <select value={form.clientId ?? ""} onChange={e => pickClient(e.target.value === "" ? "" : Number(e.target.value))} style={selectStyle}>
                <option value="">— Select client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>Contact Name</div>
              <input value={form.clientName ?? ""} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} style={inputStyle} placeholder="Auto-filled from client" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>Phone</div>
              <input value={form.clientPhone ?? ""} onChange={e => setForm(p => ({ ...p, clientPhone: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>Email</div>
              <input value={form.clientEmail ?? ""} onChange={e => setForm(p => ({ ...p, clientEmail: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>Product</div>
              <select value={form.productId ?? ""} onChange={e => pickProduct(e.target.value === "" ? "" : Number(e.target.value))} style={selectStyle}>
                <option value="">— Select product —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>Internal Notes</div>
              <textarea value={form.notes ?? ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            {!isNew && <>
              <div>
                <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>Status</div>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={selectStyle}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 18 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={form.teamApproved} onChange={e => setForm(p => ({ ...p, teamApproved: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  Team approved design
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={form.nameNumberEnabled ?? false} onChange={e => setForm(p => ({ ...p, nameNumberEnabled: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  Name & number required
                </label>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <div style={{ fontSize: 11, color: MID, marginBottom: 6, fontWeight: 600 }}>Size Chart Columns</div>
                <SizeColumnsEditor columns={form.sizeColumns ?? []} onChange={cols => setForm(p => ({ ...p, sizeColumns: cols }))} />
              </div>
            </>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ fontSize: 12, padding: "9px 16px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button onClick={() => onSave(form)} disabled={!form.title.trim()} style={{ fontSize: 12, padding: "9px 20px", borderRadius: BTN_RADIUS, background: BLUE, color: WHITE, border: "none", cursor: form.title.trim() ? "pointer" : "not-allowed", fontWeight: 700, opacity: form.title.trim() ? 1 : 0.6 }}>
              {isNew ? "Create enquiry" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function Drawer({ enquiry, onClose, onEdit, onConvert, onMockupUploaded, onMockupDeleted }: {
  enquiry: Enquiry;
  onClose: () => void;
  onEdit: () => void;
  onConvert: () => void;
  onMockupUploaded: (updated: Enquiry) => void;
  onMockupDeleted: (updated: Enquiry) => void;
}) {
  const [uploadingMockup, setUploadingMockup] = useState(false);
  const [deletingMockup, setDeletingMockup] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const mockupRef = useRef<HTMLInputElement>(null);

  async function uploadMockup(file: File) {
    setUploadingMockup(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/enquiries/${enquiry.id}/mockup`, { method: "POST", body: fd });
    if (res.ok) onMockupUploaded(await res.json());
    else alert("Upload failed.");
    setUploadingMockup(false);
  }

  async function deleteMockup() {
    if (!confirm("Remove the mockup? The client will no longer be able to see it.")) return;
    setDeletingMockup(true);
    const res = await fetch(`/api/enquiries/${enquiry.id}/mockup`, { method: "DELETE" });
    if (res.ok) onMockupDeleted(await res.json());
    setDeletingMockup(false);
  }

  function copyLink() {
    const url = `${window.location.origin}/enquiry/${enquiry.token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const clientFiles = enquiry.files.filter(f => f.uploadedBy === "client");
  const cols = enquiry.sizeColumns as string[] ?? [];
  const rows = Array.isArray(enquiry.sizeRows) ? enquiry.sizeRows as Record<string, string>[] : [];
  const nnRows = Array.isArray(enquiry.nameNumberRows) ? enquiry.nameNumberRows as Array<{ size: string; name: string; number: string }> : [];

  const dl = (label: string, value: React.ReactNode) => (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: MID, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: BLACK }}>{value}</div>
    </div>
  );

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 900 }} onClick={onClose} />
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: "min(520px, 100vw)", background: WHITE, zIndex: 901, display: "flex", flexDirection: "column", boxShadow: "-4px 0 32px rgba(0,0,0,0.12)", borderLeft: `1px solid ${BORDER}` }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: "monospace", color: BLUE, fontWeight: 700 }}>{enquiry.ref}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: BLACK, marginTop: 2 }}>{enquiry.title}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
              <Badge text={STATUS_LABELS[enquiry.status] ?? enquiry.status} color={STATUS_COLORS[enquiry.status] ?? MID} />
              {enquiry.clientApproved && <Badge text="Client Approved" color={GREEN} />}
              {enquiry.changeRequest && <Badge text="Change Requested" color={GOLD} />}
            </div>
          </div>
          <button onClick={onClose} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID, flexShrink: 0 }}>✕</button>
        </div>

        {/* Actions */}
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
          <button onClick={copyLink} style={{ fontSize: 12, padding: "7px 14px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: copiedLink ? GREEN + "18" : WHITE, color: copiedLink ? GREEN : MID, cursor: "pointer", fontWeight: 600 }}>
            {copiedLink ? "✓ Copied!" : "🔗 Copy Client Link"}
          </button>
          <button onClick={onEdit} style={{ fontSize: 12, padding: "7px 14px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer" }}>✏️ Edit</button>
          {enquiry.clientApproved && enquiry.status !== "converted" && (
            <button onClick={onConvert} style={{ fontSize: 12, padding: "7px 14px", borderRadius: BTN_RADIUS, border: "none", background: GREEN, color: WHITE, cursor: "pointer", fontWeight: 700 }}>🚀 Convert to Order</button>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

          {/* Step progress */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: MID, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Client Progress</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STEP_ORDER.map(s => {
                const done = enquiry.completedSteps.includes(s);
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: done ? GREEN + "12" : BG, border: `1px solid ${done ? GREEN + "40" : BORDER}` }}>
                    <span style={{ fontSize: 12 }}>{STEP_EMOJI[s]}</span>
                    <span style={{ fontSize: 11, fontWeight: done ? 700 : 400, color: done ? GREEN : MID }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                    {done && <span style={{ fontSize: 10, color: GREEN }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Client info */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: MID, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Client</div>
            {dl("Name", enquiry.clientName || "—")}
            {dl("Phone", enquiry.clientPhone || "—")}
            {dl("Email", enquiry.clientEmail || "—")}
            {enquiry.orgName && dl("Organisation", enquiry.orgName)}
          </div>

          {/* Requirements */}
          {(enquiry.qty || enquiry.deliveryDate || enquiry.clientNotes) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: MID, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Requirements</div>
              {enquiry.qty && dl("Quantity", enquiry.qty)}
              {enquiry.deliveryDate && dl("Required By", new Date(enquiry.deliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }))}
              {enquiry.clientNotes && dl("Client Notes", enquiry.clientNotes)}
            </div>
          )}

          {/* Mockup */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: MID, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Design Mockup</div>
            {enquiry.mockupUrl ? (
              <div>
                <img src={enquiry.mockupUrl} alt="Mockup" style={{ width: "100%", borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 10, maxHeight: 280, objectFit: "contain", background: BG }} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {enquiry.changeRequest && (
                    <div style={{ width: "100%", padding: "10px 12px", background: GOLD + "12", borderRadius: 8, fontSize: 12, color: BLACK, borderLeft: `3px solid ${GOLD}`, marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, color: GOLD, marginBottom: 2 }}>Change requested</div>
                      {enquiry.changeRequest}
                    </div>
                  )}
                  <input ref={mockupRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) uploadMockup(e.target.files[0]); }} />
                  <button onClick={() => mockupRef.current?.click()} disabled={uploadingMockup} style={{ fontSize: 12, padding: "6px 12px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", color: MID }}>
                    {uploadingMockup ? "Uploading…" : "🔄 Replace mockup"}
                  </button>
                  <button onClick={deleteMockup} disabled={deletingMockup} style={{ fontSize: 12, padding: "6px 12px", borderRadius: BTN_RADIUS, border: `1px solid ${R}30`, background: WHITE, cursor: "pointer", color: R }}>
                    {deletingMockup ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ padding: "20px 16px", background: BG, borderRadius: 10, border: `2px dashed ${BORDER}`, textAlign: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🎨</div>
                  <div style={{ fontSize: 13, color: MID }}>No mockup uploaded yet</div>
                </div>
                <input ref={mockupRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) uploadMockup(e.target.files[0]); }} />
                <button onClick={() => mockupRef.current?.click()} disabled={uploadingMockup} style={{ fontSize: 12, padding: "8px 16px", borderRadius: BTN_RADIUS, border: "none", background: BLUE, color: WHITE, cursor: "pointer", fontWeight: 600 }}>
                  {uploadingMockup ? "Uploading…" : "⬆ Upload mockup & notify client"}
                </button>
              </div>
            )}
          </div>

          {/* Client files */}
          {clientFiles.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: MID, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Client Files ({clientFiles.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {clientFiles.map(f => (
                  <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: BG, borderRadius: 8, border: `1px solid ${BORDER}`, textDecoration: "none" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: BLUE + "18", color: BLUE }}>{f.label}</span>
                    <span style={{ fontSize: 12, color: BLACK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{f.fileName}</span>
                    <span style={{ fontSize: 11, color: MID }}>↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Size chart */}
          {rows.length > 0 && cols.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: MID, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Size Chart</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: BLACK }}>
                      {cols.map(c => <th key={c} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: WHITE, letterSpacing: "0.06em", textTransform: "uppercase" }}>{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? WHITE : BG }}>
                        {cols.map(c => <td key={c} style={{ padding: "7px 10px" }}>{row[c] ?? ""}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Name & number */}
          {nnRows.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: MID, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Name & Number ({nnRows.length} jerseys)</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: BLACK }}>
                      {["Size", "Name", "Number"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: WHITE, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {nnRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? WHITE : BG }}>
                        <td style={{ padding: "7px 10px" }}>{row.size}</td>
                        <td style={{ padding: "7px 10px" }}>{row.name}</td>
                        <td style={{ padding: "7px 10px" }}>{row.number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EnquiriesPage() {
  const { canDo } = usePermissions();
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Enquiry> | null>(null);
  const [drawer, setDrawer] = useState<Enquiry | null>(null);
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

  useEffect(() => {
    load();
    fetch("/api/clients").then(r => r.json()).then((d: ClientOption[]) => setClients(d));
    fetch("/api/products").then(r => r.json()).then((d: ProductOption[]) => setProducts(d.filter((p: ProductOption & { active?: boolean }) => p.active !== false)));
  }, []);

  async function handleSave(form: Partial<Enquiry>) {
    const snapshot = form.id ? enquiries.find(e => e.id === form.id) : null;
    setModal(null);
    if (form.id && snapshot) setEnquiries(prev => prev.map(e => e.id === form.id ? { ...snapshot, ...form } : e));
    setSaving(true);
    try {
      if (form.id) {
        const res = await fetch(`/api/enquiries/${form.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (res.ok) {
          const updated = await res.json();
          setEnquiries(prev => prev.map(e => e.id === form.id ? updated : e));
          if (drawer?.id === form.id) setDrawer(updated);
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
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this enquiry? This cannot be undone.")) return;
    setEnquiries(prev => prev.filter(e => e.id !== id));
    if (drawer?.id === id) setDrawer(null);
    await fetch(`/api/enquiries/${id}`, { method: "DELETE" });
    scheduleRefresh();
  }

  function copyLink(enquiry: Enquiry) {
    const url = `${window.location.origin}/enquiry/${enquiry.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(enquiry.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleConvert(enquiry: Enquiry) {
    const params = new URLSearchParams({
      from: "enquiry",
      enquiryId: String(enquiry.id),
      clientId: enquiry.clientId ? String(enquiry.clientId) : "",
      clientName: enquiry.clientName ?? "",
      product: enquiry.product ?? "",
      qty: enquiry.qty ? String(enquiry.qty) : "",
      title: enquiry.title,
    });
    router.push(`/orders?${params.toString()}`);
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="page-pad">
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
                {["Ref", "Title", "Client", "Product", "Status", "Progress", "Files", "Created", ""].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enquiries.map((e, i) => (
                <tr key={e.id} onClick={() => setDrawer(e)} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? WHITE : BG, cursor: "pointer" }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = BLUE + "08")}
                  onMouseLeave={ev => (ev.currentTarget.style.background = i % 2 === 0 ? WHITE : BG)}>
                  <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: BLUE, fontFamily: "monospace" }}>{e.ref}</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontWeight: 600, maxWidth: 180 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>
                    {e.changeRequest && <div style={{ fontSize: 10, color: GOLD, marginTop: 1 }}>⚠ Change requested</div>}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div>{e.clientName || <span style={{ color: MID }}>—</span>}</div>
                    {e.clientPhone && <div style={{ fontSize: 11, color: MID }}>{e.clientPhone}</div>}
                  </td>
                  <td style={{ padding: "12px 14px", color: MID }}>{e.product || "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <Badge text={STATUS_LABELS[e.status] ?? e.status} color={STATUS_COLORS[e.status] ?? MID} />
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <StepProgress completed={e.completedSteps} />
                  </td>
                  <td style={{ padding: "12px 14px", color: MID }}>{e.files.length}</td>
                  <td style={{ padding: "12px 14px", color: MID, whiteSpace: "nowrap" }}>
                    {new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </td>
                  <td style={{ padding: "12px 14px" }} onClick={ev => ev.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => copyLink(e)}
                        style={{ padding: "5px 10px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: copiedId === e.id ? GREEN + "18" : WHITE, cursor: "pointer", fontSize: 11, color: copiedId === e.id ? GREEN : MID, fontWeight: 600 }}>
                        {copiedId === e.id ? "Copied!" : "Copy link"}
                      </button>
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
                <tr><td colSpan={9} style={{ padding: "36px 14px", textAlign: "center", color: MID, fontSize: 13 }}>No enquiries yet. Click "+ New enquiry" to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && <Modal enquiry={modal} clients={clients} products={products} onSave={handleSave} onClose={() => setModal(null)} />}

      {drawer !== null && (
        <Drawer
          enquiry={drawer}
          onClose={() => setDrawer(null)}
          onEdit={() => { setModal(drawer); setDrawer(null); }}
          onConvert={() => handleConvert(drawer)}
          onMockupUploaded={updated => { setDrawer(updated); setEnquiries(prev => prev.map(e => e.id === updated.id ? updated : e)); }}
          onMockupDeleted={updated => { setDrawer(updated); setEnquiries(prev => prev.map(e => e.id === updated.id ? updated : e)); }}
        />
      )}

      {saving && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: BLACK, color: WHITE, padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, zIndex: 2000, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: WHITE, borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
          Syncing…
        </div>
      )}
    </div>
  );
}
