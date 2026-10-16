"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  blue: "#4F46E5", blueLight: "#EEF2FF", blueMid: "#818CF8",
  green: "#16A34A", greenLight: "#F0FDF4",
  red: "#DC2626", redLight: "#FEF2F2",
  gold: "#D97706", goldLight: "#FFFBEB",
  ink: "#0F172A", mid: "#64748B", light: "#94A3B8",
  border: "#E2E8F0", surface: "#F8FAFC", white: "#FFFFFF",
  purple: "#7C3AED", purpleLight: "#F5F3FF",
};

// ─── Types ───────────────────────────────────────────────────────────────────
type EnquiryFile = { id: number; label: string; url: string; fileName: string; uploadedBy: string };
type UpsellProduct = { id: number; name: string; description: string | null; images: unknown };
type Enquiry = {
  id: number; token: string; ref: string; title: string;
  clientName: string | null; clientEmail: string | null;
  clientPhone: string | null; orgName: string | null;
  product: string | null; notes: string | null;
  status: string;
  qty: number | null; deliveryDate: string | null; clientNotes: string | null;
  mockupUrl: string | null; mockupKey: string | null;
  clientApproved: boolean; teamApproved: boolean;
  changeRequest: string | null;
  sizeColumns: string[]; sizeRows: Record<string, string>[];
  nameNumberEnabled: boolean; nameNumberRows: Array<{ size: string; name: string; number: string }>;
  completedSteps: string[];
  files: EnquiryFile[];
  upsellProducts: UpsellProduct[];
};

type Step = "details" | "requirements" | "references" | "design" | "sizes" | "confirm";
const STEPS: Step[] = ["details", "requirements", "references", "design", "sizes", "confirm"];
const STEP_LABELS: Record<Step, string> = {
  details: "Your Details", requirements: "Requirements", references: "Upload Files",
  design: "Review Design", sizes: "Sizes & Names", confirm: "Confirm",
};
const STEP_DESC: Record<Step, string> = {
  details: "Tell us who you are", requirements: "Quantity & timeline",
  references: "Share your logo & artwork", design: "Review & approve mockup",
  sizes: "Size chart & name/number", confirm: "Review and confirm your order",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
  width: "100%", padding: "11px 14px", border: `1.5px solid ${C.border}`,
  borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
  background: C.white, color: C.ink, transition: "border-color 0.15s",
  ...extra,
});
const btn = (variant: "primary" | "secondary" | "danger" | "ghost", extra?: React.CSSProperties): React.CSSProperties => ({
  padding: "11px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
  cursor: "pointer", border: "none", transition: "opacity 0.15s, transform 0.1s",
  ...(variant === "primary" ? { background: C.blue, color: C.white } :
    variant === "secondary" ? { background: C.surface, color: C.mid, border: `1.5px solid ${C.border}` } :
    variant === "danger" ? { background: C.redLight, color: C.red, border: `1.5px solid ${C.red}20` } :
    { background: "none", color: C.mid, padding: "8px 14px" }),
  ...extra,
});

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: C.mid, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{children}</div>;
}
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, ...style }}>{children}</div>;
}
function StepTitle({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>{title}</div>
      <div style={{ fontSize: 14, color: C.mid, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ current, completed }: { current: Step; completed: string[] }) {
  const ci = STEPS.indexOf(current);
  return (
    <div style={{ display: "flex", gap: 0, padding: "0 0 24px 0" }}>
      {STEPS.map((s, i) => {
        const done = completed.includes(s);
        const active = s === current;
        const reachable = i <= ci || done;
        return (
          <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" }}>
            {i < STEPS.length - 1 && (
              <div style={{ position: "absolute", top: 13, left: "50%", width: "100%", height: 2, background: done ? C.blue : C.border, zIndex: 0 }} />
            )}
            <div style={{
              width: 28, height: 28, borderRadius: "50%", zIndex: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700,
              background: done ? C.blue : active ? C.blueLight : C.surface,
              color: done ? C.white : active ? C.blue : C.light,
              border: `2px solid ${done || active ? C.blue : C.border}`,
              transition: "all 0.2s",
            }}>
              {done ? "✓" : i + 1}
            </div>
            <div style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? C.blue : done ? C.mid : C.light, textAlign: "center", lineHeight: 1.2, display: "none" }} className="step-label">
              {STEP_LABELS[s]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1 — Details ─────────────────────────────────────────────────────────
function StepDetails({ enquiry, onSave }: { enquiry: Enquiry; onSave: (data: Partial<Enquiry>, step: Step) => Promise<void> }) {
  const [form, setForm] = useState({ clientName: enquiry.clientName ?? "", clientEmail: enquiry.clientEmail ?? "", clientPhone: enquiry.clientPhone ?? "", orgName: enquiry.orgName ?? "" });
  const [saving, setSaving] = useState(false);
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Card>
      <StepTitle icon="👋" title="Your Details" sub="Help us know who we're working with" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <Label>Full Name *</Label>
          <input value={form.clientName} onChange={f("clientName")} placeholder="e.g. Rahul Sharma" style={inp()} />
        </div>
        <div>
          <Label>Phone Number</Label>
          <input value={form.clientPhone} onChange={f("clientPhone")} placeholder="9876543210" style={inp()} inputMode="tel" />
        </div>
        <div>
          <Label>Email Address</Label>
          <input value={form.clientEmail} onChange={f("clientEmail")} placeholder="you@company.com" style={inp()} inputMode="email" />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <Label>Organisation / Team Name</Label>
          <input value={form.orgName} onChange={f("orgName")} placeholder="e.g. AC Milan Fan Club" style={inp()} />
        </div>
      </div>
      {enquiry.notes && (
        <div style={{ marginTop: 20, padding: "14px 16px", background: C.blueLight, borderRadius: 10, fontSize: 14, color: C.ink, borderLeft: `3px solid ${C.blue}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 4 }}>NOTE FROM PRINTRIBE</div>
          {enquiry.notes}
        </div>
      )}
      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button style={btn("primary")} disabled={saving || !form.clientName.trim()} onClick={async () => { setSaving(true); await onSave({ ...form, step: "details" } as unknown as Partial<Enquiry>, "details"); setSaving(false); }}>
          {saving ? "Saving…" : "Save & Continue →"}
        </button>
      </div>
    </Card>
  );
}

// ─── Step 2 — Requirements ────────────────────────────────────────────────────
function StepRequirements({ enquiry, onSave }: { enquiry: Enquiry; onSave: (data: Partial<Enquiry>, step: Step) => Promise<void> }) {
  const [form, setForm] = useState({
    qty: enquiry.qty?.toString() ?? "",
    deliveryDate: enquiry.deliveryDate ? enquiry.deliveryDate.slice(0, 10) : "",
    clientNotes: enquiry.clientNotes ?? "",
  });
  const [saving, setSaving] = useState(false);

  return (
    <Card>
      <StepTitle icon="📋" title="Requirements" sub="Tell us about your order" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <Label>Quantity *</Label>
          <input value={form.qty} onChange={e => setForm(p => ({ ...p, qty: e.target.value }))} placeholder="e.g. 50" inputMode="numeric" style={inp()} />
        </div>
        <div>
          <Label>Required By</Label>
          <input type="date" value={form.deliveryDate} onChange={e => setForm(p => ({ ...p, deliveryDate: e.target.value }))} style={inp()} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <Label>Additional Notes</Label>
          <textarea value={form.clientNotes} onChange={e => setForm(p => ({ ...p, clientNotes: e.target.value }))} rows={4}
            placeholder="Any special requirements, colour preferences, printing technique, etc."
            style={{ ...inp(), resize: "vertical" }} />
        </div>
      </div>
      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button style={btn("primary")} disabled={saving || !form.qty.trim()} onClick={async () => {
          setSaving(true);
          await onSave({ qty: Number(form.qty), deliveryDate: form.deliveryDate || null, clientNotes: form.clientNotes } as unknown as Partial<Enquiry>, "requirements");
          setSaving(false);
        }}>
          {saving ? "Saving…" : "Save & Continue →"}
        </button>
      </div>
    </Card>
  );
}

// ─── Step 3 — References ──────────────────────────────────────────────────────
function StepReferences({ enquiry, token, onFilesUpdated }: { enquiry: Enquiry; token: string; onFilesUpdated: (files: EnquiryFile[]) => void }) {
  const [files, setFiles] = useState<EnquiryFile[]>(enquiry.files.filter(f => f.uploadedBy === "client"));
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState("Logo");
  const fileRef = useRef<HTMLInputElement>(null);

  const labels = ["Logo", "Artwork", "Reference Image", "Other"];

  async function upload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("label", label);
    const res = await fetch(`/api/enquiries/token/${token}/files`, { method: "POST", body: fd });
    if (res.ok) {
      const newFile = await res.json();
      const updated = [...files, newFile];
      setFiles(updated);
      onFilesUpdated(updated);
    } else {
      alert("Upload failed. Please try again.");
    }
    setUploading(false);
  }

  async function remove(id: number) {
    if (!confirm("Remove this file?")) return;
    const res = await fetch(`/api/enquiries/token/${token}/files`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId: id }) });
    if (res.ok) {
      const updated = files.filter(f => f.id !== id);
      setFiles(updated);
      onFilesUpdated(updated);
    }
  }

  return (
    <Card>
      <StepTitle icon="📎" title="Upload Your Files" sub="Share your logo, artwork, and reference images" />

      {files.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10, marginBottom: 20 }}>
          {files.map(f => (
            <div key={f.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, background: C.surface, position: "relative" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, marginBottom: 4, textTransform: "uppercase" }}>{f.label}</div>
              <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.ink, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                📄 {f.fileName}
              </a>
              <button onClick={() => remove(f.id)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: C.light, fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: "28px 20px", textAlign: "center", background: C.surface }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>☁️</div>
        <div style={{ fontSize: 14, color: C.mid, marginBottom: 16 }}>Drag & drop or click to upload<br /><span style={{ fontSize: 12 }}>PNG, JPG, PDF, AI, PSD, SVG, ZIP — max 20MB</span></div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {labels.map(l => (
            <button key={l} onClick={() => setLabel(l)} style={{ ...btn(label === l ? "primary" : "secondary"), padding: "6px 14px", fontSize: 12 }}>{l}</button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf,.ai,.psd,.svg,.zip,.eps" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) upload(e.target.files[0]); }} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={btn("primary", { opacity: uploading ? 0.7 : 1 })}>
          {uploading ? "Uploading…" : `+ Upload as "${label}"`}
        </button>
      </div>

      <div style={{ marginTop: 20, padding: "12px 16px", background: C.goldLight, borderRadius: 10, fontSize: 13, color: C.gold, borderLeft: `3px solid ${C.gold}` }}>
        💡 Upload your logo in <strong>AI, EPS, or SVG</strong> format for best print quality. JPG/PNG also accepted.
      </div>

      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <a href="#step-design" style={{ ...btn("primary"), textDecoration: "none", display: "inline-block" }} onClick={async () => {
          await fetch(`/api/enquiries/token/${token}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "references" }) });
        }}>
          Done — Continue →
        </a>
      </div>
    </Card>
  );
}

// ─── Step 4 — Design Review ───────────────────────────────────────────────────
function StepDesign({ enquiry, token, onUpdate }: { enquiry: Enquiry; token: string; onUpdate: (e: Enquiry) => void }) {
  const [changeNote, setChangeNote] = useState(enquiry.changeRequest ?? "");
  const [approving, setApproving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [showChangeForm, setShowChangeForm] = useState(false);

  if (!enquiry.mockupUrl) {
    return (
      <Card>
        <StepTitle icon="🎨" title="Review Design" sub="Your mockup will appear here once our team uploads it" />
        <div style={{ padding: "48px 24px", textAlign: "center", background: C.surface, borderRadius: 12, border: `2px dashed ${C.border}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Design in progress</div>
          <div style={{ fontSize: 14, color: C.mid }}>Our team is working on your mockup. You'll receive an email when it's ready to review.</div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <StepTitle icon="🎨" title="Review Your Design" sub="Check the mockup carefully before approving" />

      <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 20 }}>
        <img src={enquiry.mockupUrl} alt="Design mockup" style={{ width: "100%", display: "block", maxHeight: 500, objectFit: "contain", background: C.surface }} />
      </div>

      {enquiry.clientApproved ? (
        <div style={{ padding: "16px 20px", background: C.greenLight, borderRadius: 12, display: "flex", alignItems: "center", gap: 12, border: `1px solid ${C.green}30` }}>
          <div style={{ fontSize: 24 }}>✅</div>
          <div>
            <div style={{ fontWeight: 700, color: C.green }}>Design Approved!</div>
            <div style={{ fontSize: 13, color: C.mid, marginTop: 2 }}>You've approved this design. Our team will proceed.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={btn("primary", { background: C.green, flex: 1, minWidth: 160 })} disabled={approving} onClick={async () => {
            if (!confirm("Confirm that you approve this design?")) return;
            setApproving(true);
            const res = await fetch(`/api/enquiries/token/${token}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientApproved: true, step: "design" }) });
            if (res.ok) onUpdate(await res.json());
            setApproving(false);
          }}>
            {approving ? "Submitting…" : "✓ Approve Design"}
          </button>
          <button style={btn("secondary", { flex: 1, minWidth: 160 })} onClick={() => setShowChangeForm(v => !v)}>
            ✏️ Request Changes
          </button>
        </div>
      )}

      {showChangeForm && !enquiry.clientApproved && (
        <div style={{ marginTop: 16 }}>
          <Label>Describe the changes needed</Label>
          <textarea value={changeNote} onChange={e => setChangeNote(e.target.value)} rows={3}
            placeholder="e.g. Change the number font to bold, move the logo slightly higher…"
            style={{ ...inp(), resize: "vertical", marginBottom: 10 }} />
          <button style={btn("primary", { background: C.gold })} disabled={requesting || !changeNote.trim()} onClick={async () => {
            setRequesting(true);
            const res = await fetch(`/api/enquiries/token/${token}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changeRequest: changeNote, step: "design" }) });
            if (res.ok) { onUpdate(await res.json()); setShowChangeForm(false); }
            setRequesting(false);
          }}>
            {requesting ? "Sending…" : "Send Change Request"}
          </button>
        </div>
      )}
    </Card>
  );
}

// ─── Step 5 — Sizes & Names ───────────────────────────────────────────────────
function StepSizes({ enquiry, token, onUpdate }: { enquiry: Enquiry; token: string; onUpdate: (e: Enquiry) => void }) {
  const cols = enquiry.sizeColumns as string[] ?? [];
  const [rows, setRows] = useState<Record<string, string>[]>(
    Array.isArray(enquiry.sizeRows) ? enquiry.sizeRows as Record<string, string>[] : []
  );
  const [nnRows, setNnRows] = useState<Array<{ size: string; name: string; number: string }>>(
    Array.isArray(enquiry.nameNumberRows) ? enquiry.nameNumberRows as Array<{ size: string; name: string; number: string }> : []
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addRow() { setRows(p => [...p, Object.fromEntries(cols.map(c => [c, ""]))]); }
  function updateCell(i: number, col: string, val: string) { setRows(p => p.map((r, j) => j === i ? { ...r, [col]: val } : r)); }
  function addNnRow() { setNnRows(p => [...p, { size: "", name: "", number: "" }]); }
  function updateNn(i: number, k: "size" | "name" | "number", v: string) { setNnRows(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r)); }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/enquiries/token/${token}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sizeRows: rows, nameNumberRows: nnRows, step: "sizes" }),
    });
    if (res.ok) onUpdate(await res.json());
    setSaving(false);
  }

  async function handleExcelUpload(file: File) {
    setUploading(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      if (enquiry.nameNumberEnabled) {
        const mapped = data.map(r => ({ size: String(r["Size"] ?? r["size"] ?? ""), name: String(r["Name"] ?? r["name"] ?? ""), number: String(r["Number"] ?? r["number"] ?? "") }));
        setNnRows(mapped);
      } else if (cols.length > 0) {
        setRows(data.map(r => Object.fromEntries(cols.map(c => [c, String(r[c] ?? "")]))));
      }
    } catch { alert("Could not read file. Please use the Excel template."); }
    setUploading(false);
  }

  if (cols.length === 0 && !enquiry.nameNumberEnabled) {
    return (
      <Card>
        <StepTitle icon="📐" title="Sizes & Names" sub="Size chart coming soon" />
        <div style={{ textAlign: "center", padding: "40px 20px", color: C.mid, fontSize: 14 }}>
          The size chart hasn't been configured yet. Please check back shortly.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <StepTitle icon="📐" title="Sizes & Names" sub="Fill in your size requirements" />

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleExcelUpload(e.target.files[0]); }} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={btn("secondary", { fontSize: 13 })}>
          {uploading ? "Reading…" : "📊 Upload Excel Sheet"}
        </button>
        <a href="/size-template.xlsx" download style={{ ...btn("ghost", { fontSize: 13 }), textDecoration: "none" }}>⬇ Download Template</a>
      </div>

      {cols.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 10 }}>Size Chart</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.ink }}>
                  {cols.map(c => <th key={c} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.white, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{c}</th>)}
                  <th style={{ padding: "10px 12px", width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.white : C.surface }}>
                    {cols.map(c => (
                      <td key={c} style={{ padding: "6px 8px" }}>
                        <input value={row[c] ?? ""} onChange={e => updateCell(i, c, e.target.value)} style={{ ...inp(), padding: "6px 8px", minWidth: 60 }} />
                      </td>
                    ))}
                    <td style={{ padding: "6px 8px" }}>
                      <button onClick={() => setRows(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: C.red, fontSize: 16 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={addRow} style={{ ...btn("secondary", { fontSize: 12, marginTop: 10 }) }}>+ Add row</button>
        </div>
      )}

      {enquiry.nameNumberEnabled && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 10 }}>Name & Number per Jersey</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.ink }}>
                  {["Size", "Name", "Number"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.white, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>)}
                  <th style={{ padding: "10px 12px", width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {nnRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.white : C.surface }}>
                    {(["size", "name", "number"] as const).map(k => (
                      <td key={k} style={{ padding: "6px 8px" }}>
                        <input value={row[k]} onChange={e => updateNn(i, k, e.target.value)} style={{ ...inp(), padding: "6px 8px", minWidth: k === "number" ? 70 : 120 }} placeholder={k === "number" ? "#10" : k === "name" ? "Messi" : "L"} />
                      </td>
                    ))}
                    <td style={{ padding: "6px 8px" }}>
                      <button onClick={() => setNnRows(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: C.red, fontSize: 16 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={addNnRow} style={{ ...btn("secondary", { fontSize: 12, marginTop: 10 }) }}>+ Add jersey</button>
        </div>
      )}

      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button style={btn("primary")} disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save & Continue →"}
        </button>
      </div>
    </Card>
  );
}

// ─── Step 6 — Confirm ─────────────────────────────────────────────────────────
function StepConfirm({ enquiry, token, onUpdate }: { enquiry: Enquiry; token: string; onUpdate: (e: Enquiry) => void }) {
  const [confirming, setConfirming] = useState(false);
  const done = enquiry.completedSteps.includes("confirm");

  const rows = Array.isArray(enquiry.sizeRows) ? enquiry.sizeRows as Record<string, string>[] : [];
  const cols = Array.isArray(enquiry.sizeColumns) ? enquiry.sizeColumns as string[] : [];
  const files = enquiry.files.filter(f => f.uploadedBy === "client");

  return (
    <Card>
      <StepTitle icon="✅" title="Confirm Your Order" sub="Review everything before submitting" />

      {done && (
        <div style={{ marginBottom: 24, padding: "16px 20px", background: C.greenLight, borderRadius: 12, border: `1px solid ${C.green}30`, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ fontSize: 24 }}>🎉</div>
          <div>
            <div style={{ fontWeight: 700, color: C.green, fontSize: 15 }}>Order Confirmed!</div>
            <div style={{ fontSize: 13, color: C.mid, marginTop: 2 }}>Thank you! Our team will be in touch shortly.</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Name", value: enquiry.clientName },
          { label: "Phone", value: enquiry.clientPhone },
          { label: "Email", value: enquiry.clientEmail },
          { label: "Organisation", value: enquiry.orgName },
          { label: "Product", value: enquiry.product },
          { label: "Quantity", value: enquiry.qty?.toString() },
          { label: "Required By", value: enquiry.deliveryDate ? new Date(enquiry.deliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null },
          { label: "Files uploaded", value: files.length ? `${files.length} file${files.length > 1 ? "s" : ""}` : null },
          { label: "Design approved", value: enquiry.clientApproved ? "Yes ✓" : "Pending" },
        ].filter(i => i.value).map(({ label, value }) => (
          <div key={label} style={{ padding: "12px 14px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.mid, fontWeight: 600, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{value}</div>
          </div>
        ))}
      </div>

      {enquiry.clientNotes && (
        <div style={{ marginBottom: 20, padding: "12px 14px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.mid, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Your Notes</div>
          <div style={{ fontSize: 14, color: C.ink }}>{enquiry.clientNotes}</div>
        </div>
      )}

      {!done && (
        <button style={btn("primary", { width: "100%", padding: "14px 24px", fontSize: 15 })} disabled={confirming} onClick={async () => {
          if (!confirm("Submit your order confirmation? This will notify our team.")) return;
          setConfirming(true);
          const res = await fetch(`/api/enquiries/token/${token}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "confirm" }) });
          if (res.ok) onUpdate(await res.json());
          setConfirming(false);
        }}>
          {confirming ? "Submitting…" : "🎉 Confirm & Submit Order"}
        </button>
      )}

      {/* Upsell */}
      {enquiry.upsellProducts?.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 4 }}>You might also like</div>
          <div style={{ fontSize: 13, color: C.mid, marginBottom: 16 }}>Other products from Printribe</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {enquiry.upsellProducts.map(p => {
              const imgs = Array.isArray(p.images) ? p.images as string[] : [];
              return (
                <div key={p.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: C.white }}>
                  {imgs[0] ? (
                    <img src={imgs[0]} alt={p.name} style={{ width: "100%", height: 110, objectFit: "cover", display: "block", background: C.surface }} />
                  ) : (
                    <div style={{ width: "100%", height: 110, background: C.blueLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👕</div>
                  )}
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 2 }}>{p.name}</div>
                    {p.description && <div style={{ fontSize: 11, color: C.mid, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.description}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PublicEnquiryPage() {
  const { token } = useParams<{ token: string }>();
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState<Step>("details");

  const load = useCallback(async () => {
    const res = await fetch(`/api/enquiries/token/${token}`);
    if (!res.ok) { setNotFound(true); return; }
    const data: Enquiry = await res.json();
    setEnquiry(data);
    // Resume at last completed step + 1
    const lastCompleted = [...STEPS].reverse().find(s => data.completedSteps.includes(s));
    if (lastCompleted) {
      const next = STEPS[Math.min(STEPS.indexOf(lastCompleted) + 1, STEPS.length - 1)];
      setStep(next);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function handleUpdate(updated: Enquiry) {
    setEnquiry(updated);
  }

  async function handleStepSave(data: Partial<Enquiry> & { step?: string }, nextStep: Step) {
    const res = await fetch(`/api/enquiries/token/${token}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setEnquiry(updated);
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goToStep(s: Step) {
    if (!enquiry) return;
    const si = STEPS.indexOf(s);
    const ci = STEPS.indexOf(step);
    const completed = enquiry.completedSteps;
    // Can freely go to completed steps or the current step; design is gated on mockup
    if (s === "design" && !enquiry.mockupUrl && !completed.includes("design")) return;
    if (si <= ci || completed.includes(s) || si === ci + 1) setStep(s);
  }

  if (notFound) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.surface, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ textAlign: "center", color: C.mid }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Enquiry not found</div>
        <div style={{ fontSize: 14 }}>This link may have expired or been removed.</div>
      </div>
    </div>
  );

  if (!enquiry) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.surface, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ color: C.mid, fontSize: 14 }}>Loading…</div>
    </div>
  );

  const nextStepMap: Record<Step, Step> = { details: "requirements", requirements: "references", references: "design", design: "sizes", sizes: "confirm", confirm: "confirm" };

  return (
    <div style={{ minHeight: "100vh", background: C.surface, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        input:focus, textarea:focus, select:focus { border-color: #4F46E5 !important; box-shadow: 0 0 0 3px #4F46E520; }
        @media(max-width:640px) { .grid-2 { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Header */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: "0.1em", textTransform: "uppercase" }}>Printribe</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginTop: 1 }}>{enquiry.title}</div>
              {enquiry.product && <div style={{ fontSize: 12, color: C.mid }}>{enquiry.product}</div>}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.mid, background: C.surface, padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.border}` }}>
              {enquiry.ref}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 60px" }}>
        <ProgressBar current={step} completed={enquiry.completedSteps} />

        {/* Step nav tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {STEPS.map((s, i) => {
            const done = enquiry.completedSteps.includes(s);
            const active = s === step;
            const locked = s === "design" && !enquiry.mockupUrl && !done;
            return (
              <button key={s} onClick={() => goToStep(s)} disabled={locked}
                style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500, whiteSpace: "nowrap", cursor: locked ? "not-allowed" : "pointer", transition: "all 0.15s",
                  background: active ? C.blue : done ? C.blueLight : C.white,
                  color: active ? C.white : done ? C.blue : C.mid,
                  border: `1px solid ${active ? C.blue : done ? C.blueMid + "60" : C.border}`,
                  opacity: locked ? 0.5 : 1,
                }}>
                {done && !active ? "✓ " : ""}{STEP_LABELS[s]}
              </button>
            );
          })}
        </div>

        {/* Step description */}
        <div style={{ fontSize: 12, color: C.mid, marginBottom: 16, paddingLeft: 2 }}>Step {STEPS.indexOf(step) + 1} of 6 — {STEP_DESC[step]}</div>

        {/* Step content */}
        {step === "details" && <StepDetails enquiry={enquiry} onSave={(data, _) => handleStepSave(data, "requirements")} />}
        {step === "requirements" && <StepRequirements enquiry={enquiry} onSave={(data, _) => handleStepSave(data, "references")} />}
        {step === "references" && <StepReferences enquiry={enquiry} token={token} onFilesUpdated={files => setEnquiry(prev => prev ? { ...prev, files: [...prev.files.filter(f => f.uploadedBy !== "client"), ...files] } : prev)} />}
        {step === "design" && <StepDesign enquiry={enquiry} token={token} onUpdate={handleUpdate} />}
        {step === "sizes" && <StepSizes enquiry={enquiry} token={token} onUpdate={e => { handleUpdate(e); setStep("confirm"); }} />}
        {step === "confirm" && <StepConfirm enquiry={enquiry} token={token} onUpdate={handleUpdate} />}

        {/* Bottom nav */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, gap: 12 }}>
          {STEPS.indexOf(step) > 0 && (
            <button onClick={() => setStep(STEPS[STEPS.indexOf(step) - 1])} style={btn("secondary", { fontSize: 13 })}>← Back</button>
          )}
          <div style={{ flex: 1 }} />
          {step !== "confirm" && step !== "references" && (
            <button onClick={() => {
              const next = nextStepMap[step];
              if (next === "design" && !enquiry.mockupUrl && !enquiry.completedSteps.includes("design")) {
                alert("The design tab will unlock once our team uploads the mockup.");
                setStep("references");
                return;
              }
              setStep(next);
            }} style={btn("ghost", { fontSize: 13, color: C.mid })}>
              Skip →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
