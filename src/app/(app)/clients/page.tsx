"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import CustomSelect from "@/components/CustomSelect";

import { PRIMARY, SUCCESS, ERROR, GOLD, PURPLE, ORANGE, INK, MID, BORDER, SURFACE, WHITE, R_SM, R_MD } from "@/lib/tokens";
const R = ERROR, BLUE = PRIMARY, GREEN = SUCCESS, BG = SURFACE, BLACK = INK;
const CARD_RADIUS = R_MD, BTN_RADIUS = R_SM;

const SEG_COLORS: Record<string, string> = {
  Reseller: R, Sports: BLUE, Education: GREEN, Corporate: GOLD, NGO_Govt: PURPLE, B2C: ORANGE,
};
const SEG_LABELS: Record<string, string> = {
  Reseller: "Reseller", Sports: "Sports", Education: "Education",
  Corporate: "Corporate", NGO_Govt: "NGO/Govt", B2C: "B2C",
};
const SEGMENTS = ["Reseller", "Sports", "Education", "Corporate", "NGO_Govt", "B2C"];

type Client = {
  id: number; name: string; gstin: string | null; type: string | null;
  city: string | null; address: string | null; contact: string | null; phone: string | null; email: string | null;
  segment: string; lastOrder: string | null;
  orderCount: number; totalValue: number;
  totalValueOverride: number | null; ordersOverride: number | null;
};

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const BLANK: Omit<Client, "id" | "orderCount" | "totalValue"> = {
  name: "", gstin: "", type: "", city: "", address: "", contact: "", phone: "", email: "",
  segment: "Corporate", lastOrder: "", totalValueOverride: null, ordersOverride: null,
};

function Badge({ text, color = R }: { text: string; color?: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: BTN_RADIUS, background: color + "18", color }}>
      {text}
    </span>
  );
}

function Modal({ client, onSave, onClose, onDelete, deleteError }: {
  client: Partial<Client> & { id?: number };
  onSave: (v: Partial<Client>) => void;
  onClose: () => void;
  onDelete?: () => void;
  deleteError?: string;
}) {
  const [form, setForm] = useState({ ...BLANK, ...client });
  const set = (k: string, v: string | number | null) => setForm(p => ({ ...p, [k]: v }));
  const isNew = !client.id;

  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? "Add New Client" : `Edit — ${client.name}`}</div>
          <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: BTN_RADIUS, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { key: "name", label: "Client Name", full: true },
            { key: "segment", label: "Segment", type: "select" },
            { key: "type", label: "Type" },
            { key: "city", label: "City" },
            { key: "address", label: "Full Address", full: true, textarea: true },
            { key: "contact", label: "Contact Person" },
            { key: "phone", label: "Phone" },
            { key: "email", label: "Email", full: true },
            { key: "gstin", label: "GSTIN" },
            { key: "lastOrder", label: "Last Order (e.g. Jun 2026)" },
          ].map((f: { key: string; label: string; type?: string; full?: boolean; textarea?: boolean }) => (
            <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : "auto" }}>
              <div style={{ fontSize: 10, color: MID, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</div>
              {f.type === "select" ? (
                <CustomSelect
                  value={String(form[f.key as keyof typeof form] ?? "")}
                  onChange={v => set(f.key, v)}
                  options={SEGMENTS.map(s => ({ value: s, label: SEG_LABELS[s] }))}
                  style={{ width: "100%" }}
                />
              ) : f.textarea ? (
                <textarea value={String(form[f.key as keyof typeof form] ?? "")} onChange={e => set(f.key, e.target.value)}
                  rows={2} placeholder="e.g. #61, 1st Floor, 5th Main Road, Chamrajpet, Bengaluru, Karnataka, 560018"
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              ) : (
                <input value={String(form[f.key as keyof typeof form] ?? "")} onChange={e => set(f.key, e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, fontSize: 13, outline: "none" }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: "12px 14px", background: BG, borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: MID }}>STATS OVERRIDE (leave blank to auto-compute from orders)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4 }}>Total Value Override (₹)</div>
              <input type="number" value={form.totalValueOverride ?? ""} onChange={e => set("totalValueOverride", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Auto"
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, fontSize: 13, outline: "none" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4 }}>Order Count Override</div>
              <input type="number" value={form.ordersOverride ?? ""} onChange={e => set("ordersOverride", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Auto"
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, fontSize: 13, outline: "none" }} />
            </div>
          </div>
        </div>

        {deleteError && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: R + "12", border: `1px solid ${R}30`, borderRadius: 8, fontSize: 12, color: R }}>
            {deleteError}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "space-between" }}>
          <div>
            {onDelete && (
              <button onClick={onDelete} style={{ fontSize: 12, padding: "9px 16px", borderRadius: BTN_RADIUS, border: `1px solid ${R}`, background: WHITE, color: R, cursor: "pointer", fontWeight: 600 }}>
                Delete client
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ fontSize: 12, padding: "9px 16px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button onClick={() => { onSave(form); onClose(); }} style={{ fontSize: 12, padding: "9px 20px", borderRadius: BTN_RADIUS, background: BLUE, color: WHITE, border: "none", cursor: "pointer", fontWeight: 700 }}>
              {isNew ? "Add client" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Partial<Client> | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function load() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: Partial<Client>) {
    if (form.id) {
      await fetch(`/api/clients/${form.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    await load();
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error);
    } else {
      setModal(null);
      await load();
    }
  }

  const filtered = clients.filter(c =>
    [c.name, c.segment, c.city, c.type].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );
  const sorted = [...filtered].sort((a, b) => b.totalValue - a.totalValue);

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ padding: "26px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK, letterSpacing: "-0.01em" }}>Clients</div>
          <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>{clients.length} clients · Click a card to expand details</div>
        </div>
        <button onClick={() => { setDeleteError(""); setModal({}); }} style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: BTN_RADIUS, background: BLUE, color: WHITE, border: "none", cursor: "pointer" }}>
          + Add client
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients by name, segment, city…"
        style={{ width: "100%", padding: "10px 14px", borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, fontSize: 13, outline: "none", marginBottom: 16 }} />

      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: CARD_RADIUS, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: BLACK, color: WHITE }}>
              {["Client", "Segment", "Total Value", "Orders", "Last Order", ""].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: WHITE }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const segColor = SEG_COLORS[c.segment] || MID;
              const initials = c.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <tr
                  key={c.id}
                  style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? WHITE : BG, cursor: "pointer" }}
                  onClick={() => { setDeleteError(""); setModal(c); }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = BLUE + "08"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? WHITE : BG; }}
                >
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: segColor + "22", border: `1.5px solid ${segColor}40`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: segColor }}>{initials}</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: INK }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: MID, marginTop: 1 }}>{c.city || c.type || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <Badge text={SEG_LABELS[c.segment] || c.segment} color={segColor} />
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 700 }}>{fmt(c.totalValue)}</td>
                  <td style={{ padding: "10px 14px", color: MID }}>{c.orderCount}</td>
                  <td style={{ padding: "10px 14px", color: MID, fontSize: 11 }}>{c.lastOrder ? c.lastOrder.slice(0, 10) : "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteError(""); setModal(c); }}
                      style={{ padding: "4px 10px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", fontSize: 11, color: MID }}
                    >Edit</button>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={6} style={{ padding: "32px 14px", textAlign: "center", color: MID, fontSize: 13 }}>{search ? "No clients match your search." : "No clients yet."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <Modal
          client={modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={modal.id ? () => handleDelete(modal.id!) : undefined}
          deleteError={deleteError}
        />
      )}
    </div>
  );
}



