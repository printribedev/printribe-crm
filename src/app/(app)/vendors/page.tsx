"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";

import { PRIMARY, SUCCESS, ERROR, GOLD, PURPLE, ORANGE, INK, MID, BORDER, SURFACE, WHITE, R_SM, R_MD } from "@/lib/tokens";
const R = ERROR, BLUE = PRIMARY, GREEN = SUCCESS, BG = SURFACE, BLACK = INK;
const CARD_RADIUS = R_MD, BTN_RADIUS = R_SM;

const CAT_COLORS: Record<string, string> = {
  Production: R, Raw_Material: BLUE, Printing: PURPLE, Operations: GOLD,
};
const CAT_LABELS: Record<string, string> = {
  Production: "Production", Raw_Material: "Raw Material", Printing: "Printing", Operations: "Operations",
};
const REL_COLOR: Record<string, string> = { High: GREEN, Medium: "#E67E22", Low: R };

type Vendor = {
  id: number; name: string; gstin: string | null; type: string; city: string | null;
  contact: string | null; phone: string | null; gstRate: string;
  totalPurchased: number; reliability: "High" | "Medium" | "Low";
  category: "Production" | "Raw_Material" | "Printing" | "Operations";
};

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const pct = (n: number) => (n * 100).toFixed(1) + "%";

const BLANK: Omit<Vendor, "id"> = {
  name: "", gstin: "", type: "", city: "", contact: "", phone: "",
  gstRate: "5%", totalPurchased: 0, reliability: "Medium", category: "Raw_Material",
};

function Badge({ text, color = R }: { text: string; color?: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: BTN_RADIUS, background: color + "18", color }}>
      {text}
    </span>
  );
}

function Modal({ vendor, onSave, onClose, onDelete }: {
  vendor: Partial<Vendor> & { id?: number };
  onSave: (v: Partial<Vendor>) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState({ ...BLANK, ...vendor });
  const set = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));
  const isNew = !vendor.id;

  const fields: { key: keyof typeof BLANK; label: string; type: string; options?: string[]; full?: boolean }[] = [
    { key: "name", label: "Vendor Name", type: "text", full: true },
    { key: "category", label: "Category", type: "select", options: ["Production", "Raw_Material", "Printing", "Operations"] },
    { key: "type", label: "Type", type: "text" },
    { key: "city", label: "City", type: "text" },
    { key: "contact", label: "Contact", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "gstin", label: "GSTIN", type: "text" },
    { key: "gstRate", label: "GST Rate", type: "text" },
    { key: "totalPurchased", label: "Total Purchased (₹)", type: "number" },
    { key: "reliability", label: "Reliability", type: "select", options: ["High", "Medium", "Low"] },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? "Add New Vendor" : `Edit — ${vendor.name}`}</div>
          <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: BTN_RADIUS, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {fields.map(f => (
            <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : "auto" }}>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>{f.label}</div>
              {f.type === "select" ? (
                <select value={String(form[f.key] ?? "")} onChange={e => set(f.key, e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, fontSize: 13, outline: "none", background: WHITE }}>
                  {f.options!.map(o => <option key={o} value={o}>{CAT_LABELS[o] ?? o}</option>)}
                </select>
              ) : (
                <input type={f.type === "number" ? "number" : "text"} value={String(form[f.key] ?? "")}
                  onChange={e => set(f.key, f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, fontSize: 13, outline: "none" }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "space-between" }}>
          <div>
            {onDelete && (
              <button onClick={onDelete} style={{ fontSize: 12, padding: "9px 16px", borderRadius: BTN_RADIUS, border: `1px solid ${R}`, background: WHITE, color: R, cursor: "pointer", fontWeight: 600 }}>
                Delete vendor
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ fontSize: 12, padding: "9px 16px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button onClick={() => { onSave(form); onClose(); }} style={{ fontSize: 12, padding: "9px 20px", borderRadius: BTN_RADIUS, background: BLUE, color: WHITE, border: "none", cursor: "pointer", fontWeight: 700 }}>
              {isNew ? "Add vendor" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Vendor> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/vendors");
    const data = await res.json();
    setVendors(data.map((v: Vendor) => ({ ...v, totalPurchased: Number(v.totalPurchased) })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: Partial<Vendor>) {
    setSaving(true);
    if (form.id) {
      await fetch(`/api/vendors/${form.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    await load();
    setSaving(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this vendor? This cannot be undone.")) return;
    await fetch(`/api/vendors/${id}`, { method: "DELETE" });
    setModal(null);
    await load();
  }

  const sorted = [...vendors].sort((a, b) => b.totalPurchased - a.totalPurchased);
  const maxP = sorted[0]?.totalPurchased || 1;
  const total = vendors.reduce((s, v) => s + v.totalPurchased, 0);

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ padding: "26px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK, letterSpacing: "-0.01em" }}>Vendors</div>
          <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>{vendors.length} suppliers · {fmt(total)} total purchased</div>
        </div>
        <button onClick={() => setModal({})} style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: BTN_RADIUS, background: BLUE, color: WHITE, border: "none", cursor: "pointer" }}>
          + Add vendor
        </button>
      </div>

      {/* Table */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: CARD_RADIUS, overflow: "hidden", marginBottom: 18 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: BLACK, color: WHITE }}>
              {["Vendor", "Category", "GST Rate", "GSTIN", "Total Purchased", "Reliability", ""].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((v, i) => (
              <tr key={v.id} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? WHITE : BG }}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ fontWeight: 600 }}>{v.name}</div>
                  <div style={{ fontSize: 11, color: MID }}>{v.city}</div>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <Badge text={CAT_LABELS[v.category]} color={CAT_COLORS[v.category]} />
                </td>
                <td style={{ padding: "12px 14px", fontWeight: 600 }}>{v.gstRate}</td>
                <td style={{ padding: "12px 14px", color: MID, fontSize: 11 }}>{v.gstin || "—"}</td>
                <td style={{ padding: "12px 14px", fontWeight: 700 }}>{fmt(v.totalPurchased)}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: REL_COLOR[v.reliability] }}>{v.reliability}</span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <button onClick={() => setModal(v)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", fontSize: 11, color: MID }}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {vendors.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "32px 14px", textAlign: "center", color: MID, fontSize: 13 }}>No vendors yet. Click "+ Add vendor" to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Purchase concentration chart */}
      {vendors.length > 0 && (
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: CARD_RADIUS, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Purchase concentration</div>
          {sorted.map(v => (
            <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 140, fontSize: 11, color: MID, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {v.name.split(" ").slice(0, 3).join(" ")}
              </div>
              <div style={{ flex: 1, height: 6, background: BG, borderRadius: 3 }}>
                <div style={{ width: pct(v.totalPurchased / maxP), height: "100%", background: CAT_COLORS[v.category] || MID, borderRadius: 3 }} />
              </div>
              <div style={{ width: 88, textAlign: "right", fontSize: 12, fontWeight: 600 }}>{fmt(v.totalPurchased)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <Modal
          vendor={modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={modal.id ? () => handleDelete(modal.id!) : undefined}
        />
      )}
      {saving && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: BLACK, color: WHITE, padding: "10px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
          Saving…
        </div>
      )}
    </div>
  );
}

