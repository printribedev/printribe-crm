"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BLUE = "#4F46E5", GREEN = "#16A34A", R = "#DC2626", GOLD = "#D97706";
const BLACK = "#0F172A", MID = "#64748B", BORDER = "#E2E8F0", BG = "#F8FAFC", WHITE = "#FFFFFF";

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
};

type Tab = "details" | "design" | "sizes";

export default function PublicEnquiryPage() {
  const { token } = useParams<{ token: string }>();
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("details");

  // Contact form
  const [contact, setContact] = useState({ clientName: "", clientEmail: "", clientPhone: "" });
  const [contactSaved, setContactSaved] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);

  // Design
  const [uploading, setUploading] = useState(false);
  const [approving, setApproving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sizes
  const [sizeRows, setSizeRows] = useState<Record<string, string>[]>([]);
  const [sizesSaving, setSizesSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/enquiries/token/${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setNotFound(true); return; }
        setEnquiry(data);
        setContact({ clientName: data.clientName ?? "", clientEmail: data.clientEmail ?? "", clientPhone: data.clientPhone ?? "" });
        setContactSaved(!!(data.clientName || data.clientEmail || data.clientPhone));
        setSizeRows(Array.isArray(data.sizeRows) ? data.sizeRows : []);
      });
  }, [token]);

  async function saveContact() {
    setContactSaving(true);
    const res = await fetch(`/api/enquiries/token/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    });
    if (res.ok) { const d = await res.json(); setEnquiry(d); setContactSaved(true); }
    setContactSaving(false);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    const supabase = createClient();
    const path = `enquiry/${token}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("enquiry-files").upload(path, file);
    if (error) { alert("Upload failed: " + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("enquiry-files").getPublicUrl(path);
    const res = await fetch(`/api/enquiries/token/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Reference", path, url: publicUrl }),
    });
    if (res.ok) { const d = await res.json(); setEnquiry(prev => prev ? { ...prev, files: [...prev.files, d] } : prev); }
    setUploading(false);
  }

  async function approveDesign() {
    if (!enquiry?.teamApproved) { alert("The team hasn't approved the design yet. Please wait."); return; }
    if (enquiry.clientApproved) return;
    if (!confirm("Confirm that you approve the design?")) return;
    setApproving(true);
    const res = await fetch(`/api/enquiries/token/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientApproved: true }),
    });
    if (res.ok) { const d = await res.json(); setEnquiry(d); }
    setApproving(false);
  }

  async function saveSizes() {
    setSizesSaving(true);
    const res = await fetch(`/api/enquiries/token/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sizeRows }),
    });
    if (res.ok) { const d = await res.json(); setEnquiry(d); }
    setSizesSaving(false);
  }

  function addSizeRow() {
    if (!enquiry) return;
    const blank: Record<string, string> = {};
    (enquiry.sizeColumns ?? []).forEach(col => { blank[col] = ""; });
    setSizeRows(prev => [...prev, blank]);
  }

  function updateSizeCell(rowIdx: number, col: string, val: string) {
    setSizeRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [col]: val } : r));
  }

  function removeSizeRow(rowIdx: number) {
    setSizeRows(prev => prev.filter((_, i) => i !== rowIdx));
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG }}>
        <div style={{ textAlign: "center", color: MID }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: BLACK }}>Enquiry not found</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>This link may have expired or been removed.</div>
        </div>
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG }}>
        <div style={{ color: MID, fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  const cols = enquiry.sizeColumns ?? [];

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: "16px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: MID, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Printribe — Enquiry</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK }}>{enquiry.title}</div>
          {enquiry.product && <div style={{ fontSize: 13, color: MID, marginTop: 2 }}>{enquiry.product}</div>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: WHITE, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 2, padding: "0 24px" }}>
          {(["details", "design", "sizes"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "12px 16px", fontSize: 13, fontWeight: tab === t ? 600 : 400, color: tab === t ? BLUE : MID, background: "none", border: "none", borderBottom: tab === t ? `2px solid ${BLUE}` : "2px solid transparent", cursor: "pointer", textTransform: "capitalize", marginBottom: -1 }}>
              {t === "details" ? "Your Details" : t === "design" ? "Design" : "Sizes"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 24px" }}>

        {/* DETAILS TAB */}
        {tab === "details" && (
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
              {contactSaved ? "Your contact details" : "Please introduce yourself"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { key: "clientName", label: "Your Name", placeholder: "e.g. Rahul Sharma" },
                { key: "clientPhone", label: "Phone Number", placeholder: "e.g. 9876543210" },
                { key: "clientEmail", label: "Email Address", placeholder: "e.g. rahul@example.com", full: true },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: (f as { full?: boolean }).full ? "1 / -1" : "auto" }}>
                  <div style={{ fontSize: 11, color: MID, marginBottom: 5, fontWeight: 600 }}>{f.label}</div>
                  <input value={contact[f.key as keyof typeof contact]} onChange={e => setContact(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            {enquiry.notes && (
              <div style={{ marginTop: 18, padding: 14, background: BG, borderRadius: 8, fontSize: 13, color: BLACK }}>
                <div style={{ fontSize: 11, color: MID, fontWeight: 600, marginBottom: 4 }}>Notes from our team</div>
                {enquiry.notes}
              </div>
            )}
            <button onClick={saveContact} disabled={contactSaving || !contact.clientName}
              style={{ marginTop: 20, padding: "10px 24px", background: BLUE, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: contactSaving || !contact.clientName ? "not-allowed" : "pointer", opacity: contactSaving || !contact.clientName ? 0.7 : 1 }}>
              {contactSaving ? "Saving…" : contactSaved ? "Update details" : "Save details"}
            </button>
          </div>
        )}

        {/* DESIGN TAB */}
        {tab === "design" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Approval status */}
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Approval Status</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160, padding: "14px 18px", borderRadius: 10, background: enquiry.teamApproved ? GREEN + "10" : BG, border: `1px solid ${enquiry.teamApproved ? GREEN + "40" : BORDER}` }}>
                  <div style={{ fontSize: 11, color: MID, fontWeight: 600, marginBottom: 4 }}>TEAM REVIEW</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: enquiry.teamApproved ? GREEN : GOLD }}>
                    {enquiry.teamApproved ? "✓ Approved" : "⏳ In review"}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 160, padding: "14px 18px", borderRadius: 10, background: enquiry.clientApproved ? GREEN + "10" : BG, border: `1px solid ${enquiry.clientApproved ? GREEN + "40" : BORDER}` }}>
                  <div style={{ fontSize: 11, color: MID, fontWeight: 600, marginBottom: 4 }}>YOUR APPROVAL</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: enquiry.clientApproved ? GREEN : MID }}>
                    {enquiry.clientApproved ? "✓ Approved" : "Pending"}
                  </div>
                </div>
              </div>
              {enquiry.teamApproved && !enquiry.clientApproved && (
                <button onClick={approveDesign} disabled={approving}
                  style={{ marginTop: 16, padding: "10px 24px", background: GREEN, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: approving ? "not-allowed" : "pointer" }}>
                  {approving ? "Submitting…" : "✓ Approve design"}
                </button>
              )}
              {enquiry.clientApproved && (
                <div style={{ marginTop: 12, fontSize: 13, color: GREEN, fontWeight: 600 }}>You have approved this design. Our team will proceed.</div>
              )}
            </div>

            {/* Files */}
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Design Files</div>
              {enquiry.files.length === 0 && (
                <div style={{ color: MID, fontSize: 13, marginBottom: 14 }}>No files yet. Upload your reference images below.</div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
                {enquiry.files.map(f => (
                  <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                    style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", textDecoration: "none", background: BG, display: "block" }}>
                    <div style={{ fontSize: 10, color: MID, fontWeight: 600, marginBottom: 3 }}>{f.label.toUpperCase()} · {f.uploadedBy}</div>
                    <div style={{ fontSize: 12, color: BLACK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.url.split("/").pop()?.split("?")[0] ?? "File"}
                    </div>
                  </a>
                ))}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.ai,.psd,.svg,.zip"
                style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                style={{ padding: "9px 20px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", color: MID }}>
                {uploading ? "Uploading…" : "+ Upload reference file"}
              </button>
            </div>
          </div>
        )}

        {/* SIZES TAB */}
        {tab === "sizes" && (
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Size Chart</div>
            <div style={{ fontSize: 13, color: MID, marginBottom: 20 }}>Fill in your size requirements below.</div>

            {cols.length === 0 ? (
              <div style={{ color: MID, fontSize: 13 }}>The size chart hasn't been set up yet. Please check back shortly.</div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: BLACK }}>
                        {cols.map(col => (
                          <th key={col} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, color: WHITE, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{col}</th>
                        ))}
                        <th style={{ padding: "10px 12px", width: 32 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizeRows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? WHITE : BG }}>
                          {cols.map(col => (
                            <td key={col} style={{ padding: "6px 8px" }}>
                              <input value={row[col] ?? ""} onChange={e => updateSizeCell(i, col, e.target.value)}
                                style={{ width: "100%", padding: "6px 8px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box", minWidth: 60 }} />
                            </td>
                          ))}
                          <td style={{ padding: "6px 8px" }}>
                            <button onClick={() => removeSizeRow(i)} style={{ background: "none", border: "none", cursor: "pointer", color: R, fontSize: 16, lineHeight: 1 }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button onClick={addSizeRow}
                    style={{ padding: "8px 16px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: MID }}>
                    + Add row
                  </button>
                  <button onClick={saveSizes} disabled={sizesSaving}
                    style={{ padding: "8px 20px", background: BLUE, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: sizesSaving ? "not-allowed" : "pointer" }}>
                    {sizesSaving ? "Saving…" : "Save sizes"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
