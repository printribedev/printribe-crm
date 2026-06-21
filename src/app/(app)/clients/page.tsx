"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";

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
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
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
                <select value={String(form[f.key as keyof typeof form] ?? "")} onChange={e => set(f.key, e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, fontSize: 13, outline: "none", background: WHITE }}>
                  {SEGMENTS.map(s => <option key={s} value={s}>{SEG_LABELS[s]}</option>)}
                </select>
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
  const [selected, setSelected] = useState<number | null>(null);
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {sorted.map(c => (
          <div key={c.id} style={{ background: WHITE, border: `1px solid ${selected === c.id ? BLUE : BORDER}`, borderRadius: CARD_RADIUS, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div onClick={() => setSelected(selected === c.id ? null : c.id)} style={{ cursor: "pointer", flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: MID, marginTop: 2 }}>{c.city || "—"}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Badge text={SEG_LABELS[c.segment] || c.segment} color={SEG_COLORS[c.segment] || MID} />
                <button onClick={() => { setDeleteError(""); setModal(c); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", color: MID }}>
                  Edit
                </button>
              </div>
            </div>

            <div onClick={() => setSelected(selected === c.id ? null : c.id)} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, cursor: "pointer" }}>
              {[["Total Value", fmt(c.totalValue)], ["Orders", String(c.orderCount)], ["Last Order", c.lastOrder || "—"]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: MID, marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>

            {selected === c.id && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}`, fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["Type", c.type], ["Phone", c.phone], ["Email", c.email], ["GSTIN", c.gstin]].map(([l, v]) => (
                  <div key={l}><span style={{ color: MID }}>{l}: </span><span style={{ fontWeight: 500 }}>{v || "—"}</span></div>
                ))}
              </div>
            )}
          </div>
        ))}
        {sorted.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: "32px", textAlign: "center", color: MID, fontSize: 13 }}>
            {search ? "No clients match your search." : "No clients yet. Click '+ Add client' to get started."}
          </div>
        )}
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

