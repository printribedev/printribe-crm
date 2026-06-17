"use client";

import { useEffect, useState } from "react";

const R = "#EE3C30", BLUE = "#2266A1", GOLD = "#D4B800", PURPLE = "#7B4FBF", ORANGE = "#E67E22";
const MID = "#888", BORDER = "#E8E7E3", BG = "#F7F6F2", WHITE = "#FFFFFF", BLACK = "#111111";
const GREEN = "#1A7A4A";

const SEG_COLORS: Record<string, string> = { Reseller: R, Sports: BLUE, Education: GREEN, Corporate: GOLD, NGO_Govt: PURPLE, B2C: ORANGE };
const SEG_LABELS: Record<string, string> = { Reseller: "Reseller", Sports: "Sports", Education: "Education", Corporate: "Corporate", NGO_Govt: "NGO/Govt", B2C: "B2C" };
const SEGMENTS = ["Reseller", "Sports", "Education", "Corporate", "NGO_Govt", "B2C"];
const STAGES = [
  { id: "enquiry", label: "Enquiry", color: MID },
  { id: "design", label: "Design", color: PURPLE },
  { id: "sampling", label: "Sampling", color: BLUE },
  { id: "production", label: "In Production", color: ORANGE },
  { id: "qc", label: "QC / Finishing", color: GOLD },
  { id: "dispatch", label: "Dispatched", color: BLUE },
  { id: "delivered", label: "Delivered", color: GREEN },
];

type Client = { id: number; name: string; segment: string };
type OrderNote = { id: number; author: string; ts: string; text: string };
type OrderTimeline = { id: number; stage: string; done: boolean; date: string | null };
type Order = {
  id: string; clientId: number | null; clientName: string; product: string; segment: string;
  date: string; dueDate: string | null; qty: number; saleValue: number; gst: number;
  fabric: number; printing: number; transport: number; misc: number;
  jobWork: number; packaging: number; design: number;
  stage: string; priority: string;
  notes: OrderNote[]; timeline: OrderTimeline[];
};

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const pct = (n: number) => (n * 100).toFixed(1) + "%";
function calcMargin(o: Order) {
  const totalCost = o.fabric + o.printing + o.transport + o.misc + o.jobWork + o.packaging + o.design;
  const grossProfit = o.saleValue - totalCost;
  return { totalCost, grossProfit, marginPct: o.saleValue > 0 ? grossProfit / o.saleValue : 0 };
}
function marginColor(m: number) { return m > 0.35 ? GREEN : m > 0.2 ? "#8a7300" : R; }

function Badge({ text, color = R }: { text: string; color?: string }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: color + "18", color }}>{text}</span>;
}

function CostModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { totalCost, grossProfit, marginPct } = calcMargin(order);
  const mc = marginColor(marginPct);
  const costs = [
    { label: "Fabric / Blank Garment", value: order.fabric, color: BLUE },
    { label: "Printing & Decoration", value: order.printing, color: R },
    { label: "Job Work (Outsourced)", value: order.jobWork, color: PURPLE },
    { label: "Packaging", value: order.packaging, color: GOLD },
    { label: "Transport / Courier", value: order.transport, color: GREEN },
    { label: "Design / Artwork", value: order.design, color: ORANGE },
    { label: "Miscellaneous", value: order.misc, color: MID },
  ].filter(c => c.value > 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: 14, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: R, marginBottom: 4 }}>Job Cost Card</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{order.clientName}</div>
            <div style={{ fontSize: 12, color: MID }}>{order.id} · {order.date.slice(0, 10)}</div>
          </div>
          <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
          {[["Sale Value", fmt(order.saleValue), "excl. GST"], ["Total Cost", fmt(totalCost), "all-in"], ["Gross Profit", fmt(grossProfit), pct(marginPct) + " margin"]].map(([l, v, s]) => (
            <div key={l} style={{ background: BG, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: MID, fontWeight: 600, marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: l === "Gross Profit" ? mc : BLACK }}>{v}</div>
              <div style={{ fontSize: 10, color: MID }}>{s}</div>
            </div>
          ))}
        </div>
        {costs.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Cost breakdown</div>
            {costs.map(c => (
              <div key={c.label} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12 }}>{c.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(c.value)} <span style={{ color: MID, fontWeight: 400 }}>({pct(c.value / totalCost)})</span></span>
                </div>
                <div style={{ height: 5, background: BG, borderRadius: 3 }}><div style={{ width: pct(c.value / totalCost), height: "100%", background: c.color, borderRadius: 3 }} /></div>
              </div>
            ))}
          </div>
        )}
        <div style={{ background: BG, borderRadius: 8, padding: "12px 14px", fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><span style={{ color: MID }}>GST collected: </span><strong>{fmt(order.gst)}</strong></div>
          <div><span style={{ color: MID }}>Units: </span><strong>{order.qty.toLocaleString()} pcs</strong></div>
          <div><span style={{ color: MID }}>Per pc cost: </span><strong>{order.qty > 0 ? fmt(totalCost / order.qty) : "—"}</strong></div>
          <div><span style={{ color: MID }}>Per pc sale: </span><strong>{order.qty > 0 ? fmt(order.saleValue / order.qty) : "—"}</strong></div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ order, clients, onSave, onClose, onDelete }: {
  order: Partial<Order> & { id?: string };
  clients: Client[];
  onSave: (v: Partial<Order>) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState(() => {
    const base = {
      id: "", clientId: null as number | null, clientName: "", product: "", segment: "Corporate",
      date: today, dueDate: "", qty: 0, saleValue: 0, gst: 0,
      fabric: 0, printing: 0, jobWork: 0, packaging: 0, transport: 0, design: 0, misc: 0,
      stage: "enquiry", priority: "Normal",
    };
    return {
      ...base,
      ...order,
      date: order.date ? order.date.slice(0, 10) : today,
      dueDate: order.dueDate ? order.dueDate.slice(0, 10) : "",
    };
  });
  const set = (k: string, v: string | number | null) => setForm(p => ({ ...p, [k]: v }));
  const isNew = !order.id;

  function handleClientChange(clientId: string) {
    const client = clients.find(c => c.id === Number(clientId));
    if (client) {
      set("clientId", client.id);
      set("clientName", client.name);
      set("segment", client.segment);
    } else {
      set("clientId", null);
    }
  }

  const numField = (key: string, label: string) => (
    <div key={key}>
      <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <input type="number" value={String((form as Record<string, unknown>)[key] ?? 0)}
        onChange={e => set(key, parseFloat(e.target.value) || 0)}
        style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none" }} />
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: 14, width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto", padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? "New Order" : `Edit — ${order.id}`}</div>
          <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>INVOICE ID</div>
            <input value={form.id} onChange={e => set("id", e.target.value)} placeholder="e.g. PT/PI/020/26-27"
              disabled={!isNew}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", background: !isNew ? BG : WHITE }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>CLIENT</div>
            <select value={form.clientId ?? ""} onChange={e => handleClientChange(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", background: WHITE }}>
              <option value="">— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>PRODUCT / DESCRIPTION</div>
            <input value={form.product} onChange={e => set("product", e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>SEGMENT</div>
            <select value={form.segment} onChange={e => set("segment", e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", background: WHITE }}>
              {SEGMENTS.map(s => <option key={s} value={s}>{SEG_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>STAGE</div>
            <select value={form.stage} onChange={e => set("stage", e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", background: WHITE }}>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>DATE</div>
            <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>DUE DATE</div>
            <input type="date" value={form.dueDate ?? ""} onChange={e => set("dueDate", e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>PRIORITY</div>
            <select value={form.priority} onChange={e => set("priority", e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", background: WHITE }}>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, paddingTop: 4, borderTop: `1px solid ${BORDER}` }}>
          <span style={{ display: "block", marginTop: 12 }}>Revenue</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          {numField("qty", "Quantity (pcs)")}
          {numField("saleValue", "Sale Value (₹) excl. GST")}
          {numField("gst", "GST Amount (₹)")}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, paddingTop: 4, borderTop: `1px solid ${BORDER}` }}>
          <span style={{ display: "block", marginTop: 12 }}>Cost Lines (₹)</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {numField("fabric", "Fabric / Blank Garment")}
          {numField("printing", "Printing & Decoration")}
          {numField("jobWork", "Job Work (Outsourced)")}
          {numField("packaging", "Packaging")}
          {numField("transport", "Transport / Courier")}
          {numField("design", "Design / Artwork")}
          {numField("misc", "Miscellaneous")}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "space-between" }}>
          <div>
            {onDelete && (
              <button onClick={onDelete} style={{ fontSize: 12, padding: "9px 16px", borderRadius: 7, border: `1px solid ${R}`, background: WHITE, color: R, cursor: "pointer", fontWeight: 600 }}>Delete order</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ fontSize: 12, padding: "9px 16px", borderRadius: 7, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button onClick={() => { onSave(form); onClose(); }} style={{ fontSize: 12, padding: "9px 20px", borderRadius: 7, background: R, color: WHITE, border: "none", cursor: "pointer", fontWeight: 700 }}>
              {isNew ? "Create order" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [costModal, setCostModal] = useState<Order | null>(null);
  const [editModal, setEditModal] = useState<Partial<Order> | null>(null);

  async function load() {
    const [oRes, cRes] = await Promise.all([fetch("/api/orders"), fetch("/api/clients")]);
    setOrders(await oRes.json());
    setClients(await cRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: Partial<Order>) {
    if ((form as Order).id && editModal?.id) {
      await fetch(`/api/orders/${editModal.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete order ${id}? This cannot be undone.`)) return;
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    setEditModal(null);
    await load();
  }

  const filtered = orders.filter(o =>
    [o.id, o.clientName, o.product].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div style={{ padding: "26px 28px", color: MID, fontSize: 13 }}>Loading orders…</div>;

  return (
    <div style={{ padding: "26px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK }}>Orders</div>
          <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>{orders.length} orders · Click Cost to see job costing</div>
        </div>
        <button onClick={() => setEditModal({})} style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 7, background: R, color: WHITE, border: "none", cursor: "pointer" }}>
          + New order
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by invoice, client or product…"
        style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, outline: "none", marginBottom: 16 }} />

      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: BLACK, color: WHITE }}>
              {["Invoice", "Client", "Product", "Segment", "Qty", "Sale Value", "Margin", "Stage", ""].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => {
              const { marginPct } = calcMargin(o);
              const mc = marginColor(marginPct);
              const stage = STAGES.find(s => s.id === o.stage) || STAGES[0];
              return (
                <tr key={o.id} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? WHITE : BG }}>
                  <td style={{ padding: "11px 14px", fontWeight: 600, color: R, fontSize: 11 }}>{o.id}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 500 }}>{o.clientName}</td>
                  <td style={{ padding: "11px 14px", color: MID }}>{o.product}</td>
                  <td style={{ padding: "11px 14px" }}><Badge text={SEG_LABELS[o.segment] || o.segment} color={SEG_COLORS[o.segment] || MID} /></td>
                  <td style={{ padding: "11px 14px", fontWeight: 600 }}>{o.qty.toLocaleString()}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 700 }}>{fmt(o.saleValue)}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontWeight: 700, color: mc, background: mc + "18", padding: "2px 8px", borderRadius: 20, fontSize: 11 }}>{pct(marginPct)}</span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: stage.color, background: stage.color + "15", padding: "2px 8px", borderRadius: 20 }}>{stage.label}</span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setCostModal(o)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", color: MID }}>Cost</button>
                      <button onClick={() => setEditModal(o)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", color: MID }}>Edit</button>
                      <button onClick={() => window.open(`/invoice/${encodeURIComponent(o.id)}`, "_blank")} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: `1px solid ${R}`, background: WHITE, cursor: "pointer", color: R, fontWeight: 600 }}>Invoice</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: "32px", textAlign: "center", color: MID, fontSize: 13 }}>
                {search ? "No orders match your search." : "No orders yet. Click '+ New order' to create one."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {costModal && <CostModal order={costModal} onClose={() => setCostModal(null)} />}
      {editModal !== null && (
        <EditModal order={editModal} clients={clients} onSave={handleSave} onClose={() => setEditModal(null)}
          onDelete={editModal.id ? () => handleDelete(editModal.id!) : undefined} />
      )}
    </div>
  );
}
