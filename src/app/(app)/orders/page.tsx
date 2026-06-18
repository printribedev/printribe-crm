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

type ProductLine = { productId: number | null; name: string; hsn: string; qty: number; unitPrice: number; gstPct: number };
type CatalogProduct = { id: number; name: string; hsn: string; gstRate: string; basePrice: number };
type Client = { id: number; name: string; segment: string };
type OrderNote = { id: number; author: string; ts: string; text: string };
type OrderTimeline = { id: number; stage: string; done: boolean; date: string | null };
type Order = {
  id: string; clientId: number | null; clientName: string; product: string; segment: string;
  date: string; dueDate: string | null; qty: number; saleValue: number; gst: number;
  fabric: number; printing: number; transport: number; misc: number;
  jobWork: number; packaging: number; design: number; ribCost: number;
  fabricWeightPerPc: number | null; fabricPricePerKg: number | null;
  ribWeightPerPc: number | null; ribPricePerKg: number | null;
  stage: string; priority: string;
  notes: OrderNote[]; timeline: OrderTimeline[];
};

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const pct = (n: number) => (n * 100).toFixed(1) + "%";

function parseLines(product: string, fallbackQty = 0, fallbackSale = 0, fallbackGst = 0): ProductLine[] {
  try {
    const p = JSON.parse(product);
    if (Array.isArray(p)) return p;
  } catch { /* legacy string */ }
  const gstPct = fallbackSale > 0 ? Math.round(fallbackGst / fallbackSale * 100) : 5;
  return [{ productId: null, name: product || "", hsn: "6109", qty: fallbackQty, unitPrice: fallbackQty > 0 ? fallbackSale / fallbackQty : 0, gstPct }];
}

function suggestNextId(orders: Order[]): string {
  const now = new Date();
  const fy = now.getMonth() >= 3
    ? `${String(now.getFullYear()).slice(2)}-${String(now.getFullYear() + 1).slice(2)}`
    : `${String(now.getFullYear() - 1).slice(2)}-${String(now.getFullYear()).slice(2)}`;
  if (orders.length === 0) return `PT/PI/001/${fy}`;
  const sorted = [...orders].sort((a, b) => {
    const dd = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dd !== 0) return dd;
    return (parseInt(b.id.split("/")[2] ?? "0")) - (parseInt(a.id.split("/")[2] ?? "0"));
  });
  const serial = parseInt(sorted[0].id.split("/")[2] ?? "0") + 1;
  return `PT/PI/${String(serial).padStart(3, "0")}/${fy}`;
}

function calcMargin(o: Order) {
  const totalCost = o.fabric + o.printing + o.transport + o.misc + o.jobWork + o.packaging + o.design + (o.ribCost || 0);
  const grossProfit = o.saleValue - totalCost;
  return { totalCost, grossProfit, marginPct: o.saleValue > 0 ? grossProfit / o.saleValue : 0 };
}
function marginColor(m: number) { return m > 0.35 ? GREEN : m > 0.2 ? "#8a7300" : R; }

function getProductDisplay(product: string): string {
  try {
    const p = JSON.parse(product);
    if (Array.isArray(p)) return p.length === 1 ? (p[0].name || "—") : p.map((l: ProductLine) => l.name).filter(Boolean).join(", ");
  } catch { /* legacy */ }
  return product || "—";
}

function Badge({ text, color = R }: { text: string; color?: string }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: color + "18", color }}>{text}</span>;
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      fontSize: 10, padding: "3px 9px", borderRadius: 5, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
      border: `1px solid ${active ? BLUE : BORDER}`, background: active ? BLUE + "18" : WHITE, color: active ? BLUE : MID,
    }}>{children}</button>
  );
}

function CostModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { totalCost, grossProfit, marginPct } = calcMargin(order);
  const mc = marginColor(marginPct);
  const costs = [
    { label: "Fabric / Blank Garment", value: order.fabric, color: BLUE },
    { label: "Rib Cost", value: order.ribCost || 0, color: "#2299cc" },
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
          {([["Sale Value", fmt(order.saleValue), "excl. GST"], ["Total Cost", fmt(totalCost), "all-in"], ["Gross Profit", fmt(grossProfit), pct(marginPct) + " margin"]] as [string, string, string][]).map(([l, v, s]) => (
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

const BLANK_LINE: ProductLine = { productId: null, name: "", hsn: "", qty: 0, unitPrice: 0, gstPct: 5 };
const INP_STYLE = { width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", background: WHITE, boxSizing: "border-box" as const };
const LBL_STYLE = { fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" };

function EditModal({ order, clients, catalogProducts, allOrders, onSave, onClose, onDelete }: {
  order: Partial<Order> & { id?: string };
  clients: Client[];
  catalogProducts: CatalogProduct[];
  allOrders: Order[];
  onSave: (v: Record<string, unknown>) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const isNew = !order.id;

  const [form, setForm] = useState({
    id: isNew ? suggestNextId(allOrders) : (order.id ?? ""),
    clientId: order.clientId ?? null as number | null,
    clientName: order.clientName ?? "",
    segment: order.segment ?? "Corporate",
    stage: order.stage ?? "enquiry",
    date: order.date ? order.date.slice(0, 10) : today,
    dueDate: order.dueDate ? order.dueDate.slice(0, 10) : "",
    priority: order.priority ?? "Normal",
  });
  const setF = (k: string, v: string | number | null) => setForm(p => ({ ...p, [k]: v }));

  const [clientInput, setClientInput] = useState(order.clientName ?? "");
  const [lines, setLines] = useState<ProductLine[]>(() =>
    parseLines(order.product ?? "", order.qty, order.saleValue, order.gst)
  );

  function setLine(i: number, k: keyof ProductLine, v: string | number | null) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  }
  function pickProduct(i: number, productId: number) {
    const cp = catalogProducts.find(p => p.id === productId);
    if (!cp) return;
    setLines(ls => ls.map((l, idx) => idx === i
      ? { ...l, productId: cp.id, name: cp.name, hsn: cp.hsn, gstPct: parseFloat(cp.gstRate) || 5, unitPrice: Number(cp.basePrice) || l.unitPrice }
      : l));
  }

  const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0);
  const totalSale = lines.reduce((s, l) => s + (l.qty || 0) * (l.unitPrice || 0), 0);
  const totalGst = lines.reduce((s, l) => s + (l.qty || 0) * (l.unitPrice || 0) * (l.gstPct || 0) / 100, 0);

  // Cost inputs (stores what user types — either per-pc or total depending on perPc state)
  const [costInputs, setCostInputs] = useState<Record<string, number>>({
    printing: order.printing ?? 0,
    jobWork: order.jobWork ?? 0,
    packaging: order.packaging ?? 0,
    transport: order.transport ?? 0,
    design: order.design ?? 0,
    misc: order.misc ?? 0,
  });
  const [perPc, setPerPc] = useState<Record<string, boolean>>({});
  const totalForKey = (k: string) => perPc[k] ? (costInputs[k] ?? 0) * totalQty : (costInputs[k] ?? 0);

  // Fabric
  const [fabricMode, setFabricMode] = useState<"manual" | "weight">(order.fabricWeightPerPc ? "weight" : "manual");
  const [fabricWt, setFabricWt] = useState({ weightPerPc: Number(order.fabricWeightPerPc ?? 0), pricePerKg: Number(order.fabricPricePerKg ?? 0) });
  const [fabricManual, setFabricManual] = useState(Number(order.fabric ?? 0));
  const fabricPerPc = !!perPc["fabric"];
  const fabricTotal = fabricMode === "weight"
    ? totalQty * fabricWt.weightPerPc / 1000 * fabricWt.pricePerKg
    : fabricPerPc ? fabricManual * totalQty : fabricManual;

  // Rib
  const [ribMode, setRibMode] = useState<"manual" | "weight">(order.ribWeightPerPc ? "weight" : "manual");
  const [ribWt, setRibWt] = useState({ weightPerPc: Number(order.ribWeightPerPc ?? 0), pricePerKg: Number(order.ribPricePerKg ?? 0) });
  const [ribManual, setRibManual] = useState(Number(order.ribCost ?? 0));
  const ribPerPc = !!perPc["rib"];
  const ribTotal = ribMode === "weight"
    ? totalQty * ribWt.weightPerPc / 1000 * ribWt.pricePerKg
    : ribPerPc ? ribManual * totalQty : ribManual;

  function handleClientInput(val: string) {
    setClientInput(val);
    const found = clients.find(c => c.name.toLowerCase() === val.toLowerCase());
    if (found) { setF("clientId", found.id); setF("clientName", found.name); setF("segment", found.segment); }
    else { setF("clientId", null); setF("clientName", val); }
  }

  function handleSave() {
    onSave({
      ...form,
      product: JSON.stringify(lines),
      qty: totalQty,
      saleValue: totalSale,
      gst: totalGst,
      fabric: fabricTotal,
      ribCost: ribTotal,
      fabricWeightPerPc: fabricMode === "weight" ? fabricWt.weightPerPc : null,
      fabricPricePerKg: fabricMode === "weight" ? fabricWt.pricePerKg : null,
      ribWeightPerPc: ribMode === "weight" ? ribWt.weightPerPc : null,
      ribPricePerKg: ribMode === "weight" ? ribWt.pricePerKg : null,
      printing: totalForKey("printing"),
      jobWork: totalForKey("jobWork"),
      packaging: totalForKey("packaging"),
      transport: totalForKey("transport"),
      design: totalForKey("design"),
      misc: totalForKey("misc"),
    });
    onClose();
  }

  const renderCostRow = (field: string, title: string) => (
    <div key={field}>
      <div style={LBL_STYLE}>{title}</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="number" value={costInputs[field] ?? 0}
          onChange={e => setCostInputs(p => ({ ...p, [field]: parseFloat(e.target.value) || 0 }))}
          style={INP_STYLE} />
        <ToggleBtn active={!!perPc[field]} onClick={() => setPerPc(p => ({ ...p, [field]: !p[field] }))}>
          {perPc[field] ? "₹/pc" : "Total"}
        </ToggleBtn>
      </div>
      {perPc[field] && totalQty > 0 && (
        <div style={{ fontSize: 10, color: MID, marginTop: 3 }}>Total: {fmt(totalForKey(field))}</div>
      )}
    </div>
  );

  const sectionHdr = (text: string) => (
    <div style={{ fontSize: 12, fontWeight: 700, color: BLACK, borderTop: `1px solid ${BORDER}`, paddingTop: 14, marginTop: 14, marginBottom: 10 }}>{text}</div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: 14, width: "100%", maxWidth: 700, maxHeight: "93vh", overflowY: "auto", padding: 28 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? "New Order" : `Edit — ${order.id}`}</div>
          <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
        </div>

        {/* Order Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <div style={LBL_STYLE}>Invoice ID</div>
            <input value={form.id} onChange={e => setF("id", e.target.value)} disabled={!isNew}
              style={{ ...INP_STYLE, background: !isNew ? BG : WHITE }} />
            {isNew && <div style={{ fontSize: 10, color: MID, marginTop: 3 }}>Auto-suggested from last order</div>}
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <div style={LBL_STYLE}>Client</div>
            <input list="clients-dl" value={clientInput} onChange={e => handleClientInput(e.target.value)}
              placeholder="Type or select client…" style={INP_STYLE} />
            <datalist id="clients-dl">
              {clients.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
            {!form.clientId && clientInput && (
              <div style={{ fontSize: 10, color: ORANGE, marginTop: 3 }}>New client — not linked to any existing record</div>
            )}
          </div>
          <div>
            <div style={LBL_STYLE}>Segment</div>
            <select value={form.segment} onChange={e => setF("segment", e.target.value)} style={{ ...INP_STYLE }}>
              {SEGMENTS.map(s => <option key={s} value={s}>{SEG_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <div style={LBL_STYLE}>Stage</div>
            <select value={form.stage} onChange={e => setF("stage", e.target.value)} style={{ ...INP_STYLE }}>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <div style={LBL_STYLE}>Date</div>
            <input type="date" value={form.date} onChange={e => setF("date", e.target.value)} style={INP_STYLE} />
          </div>
          <div>
            <div style={LBL_STYLE}>Due Date</div>
            <input type="date" value={form.dueDate} onChange={e => setF("dueDate", e.target.value)} style={INP_STYLE} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <div style={LBL_STYLE}>Priority</div>
            <select value={form.priority} onChange={e => setF("priority", e.target.value)} style={{ ...INP_STYLE }}>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        {/* Product Lines */}
        {sectionHdr("Products")}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 70px 70px 100px 55px 80px 24px", gap: 6, fontSize: 10, color: MID, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span>Product</span><span>HSN</span><span>Qty</span><span>Unit Price ₹</span><span>GST %</span><span style={{ textAlign: "right" }}>Total</span><span />
          </div>
          {lines.map((line, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 70px 70px 100px 55px 80px 24px", gap: 6, alignItems: "center" }}>
              <select value={line.productId ?? ""} onChange={e => {
                if (!e.target.value) { setLine(i, "productId", null); setLine(i, "name", ""); setLine(i, "hsn", ""); }
                else pickProduct(i, Number(e.target.value));
              }} style={{ ...INP_STYLE, padding: "7px 8px", fontSize: 12 }}>
                <option value="">— Select —</option>
                {catalogProducts.filter(p => p.active !== false).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input value={line.hsn} onChange={e => setLine(i, "hsn", e.target.value)}
                placeholder="HSN" style={{ ...INP_STYLE, padding: "7px 8px", fontSize: 12 }} />
              <input type="number" value={line.qty || ""} placeholder="0"
                onChange={e => setLine(i, "qty", parseInt(e.target.value) || 0)}
                style={{ ...INP_STYLE, padding: "7px 8px", fontSize: 12 }} />
              <input type="number" value={line.unitPrice || ""} placeholder="0"
                onChange={e => setLine(i, "unitPrice", parseFloat(e.target.value) || 0)}
                style={{ ...INP_STYLE, padding: "7px 8px", fontSize: 12 }} />
              <input type="number" value={line.gstPct || ""} placeholder="5"
                onChange={e => setLine(i, "gstPct", parseFloat(e.target.value) || 0)}
                style={{ ...INP_STYLE, padding: "7px 8px", fontSize: 12 }} />
              <div style={{ fontSize: 12, fontWeight: 600, textAlign: "right", paddingRight: 2 }}>
                {fmt((line.qty || 0) * (line.unitPrice || 0))}
              </div>
              <button type="button" onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))}
                disabled={lines.length === 1}
                style={{ border: "none", background: "none", color: lines.length === 1 ? BORDER : MID, cursor: lines.length === 1 ? "default" : "pointer", fontSize: 14, padding: 0 }}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setLines(ls => [...ls, { ...BLANK_LINE }])}
          style={{ fontSize: 12, padding: "6px 14px", borderRadius: 7, border: `1px solid ${BLUE}`, background: WHITE, color: BLUE, cursor: "pointer", fontWeight: 600 }}>
          + Add product
        </button>

        {/* Revenue summary */}
        <div style={{ background: BG, borderRadius: 8, padding: "10px 14px", marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12 }}>
          <div><span style={{ color: MID }}>Total Qty: </span><strong>{totalQty.toLocaleString()} pcs</strong></div>
          <div><span style={{ color: MID }}>Sale Value: </span><strong>{fmt(totalSale)}</strong></div>
          <div><span style={{ color: MID }}>GST: </span><strong>{fmt(totalGst)}</strong></div>
        </div>

        {/* Cost Lines */}
        {sectionHdr("Cost Lines")}

        {/* Fabric */}
        <div style={{ marginBottom: 10, padding: "12px 14px", background: BG, borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: BLUE }}>Fabric / Blank Garment</div>
            <div style={{ display: "flex", gap: 6 }}>
              <ToggleBtn active={fabricMode === "manual"} onClick={() => setFabricMode("manual")}>Manual</ToggleBtn>
              <ToggleBtn active={fabricMode === "weight"} onClick={() => setFabricMode("weight")}>By Weight</ToggleBtn>
            </div>
          </div>
          {fabricMode === "weight" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <div style={LBL_STYLE}>Weight per pc (g)</div>
                <input type="number" value={fabricWt.weightPerPc || ""} placeholder="0"
                  onChange={e => setFabricWt(w => ({ ...w, weightPerPc: parseFloat(e.target.value) || 0 }))} style={INP_STYLE} />
              </div>
              <div>
                <div style={LBL_STYLE}>Price per kg (₹)</div>
                <input type="number" value={fabricWt.pricePerKg || ""} placeholder="0"
                  onChange={e => setFabricWt(w => ({ ...w, pricePerKg: parseFloat(e.target.value) || 0 }))} style={INP_STYLE} />
              </div>
              <div>
                <div style={LBL_STYLE}>Computed Total</div>
                <div style={{ ...INP_STYLE, background: WHITE, display: "flex", alignItems: "center", fontWeight: 700, color: BLACK }}>{fmt(fabricTotal)}</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={LBL_STYLE}>Amount</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="number" value={fabricManual || ""} placeholder="0"
                  onChange={e => setFabricManual(parseFloat(e.target.value) || 0)} style={INP_STYLE} />
                <ToggleBtn active={fabricPerPc} onClick={() => setPerPc(p => ({ ...p, fabric: !p.fabric }))}>
                  {fabricPerPc ? "₹/pc" : "Total"}
                </ToggleBtn>
              </div>
              {fabricPerPc && totalQty > 0 && <div style={{ fontSize: 10, color: MID, marginTop: 3 }}>Total: {fmt(fabricTotal)}</div>}
            </div>
          )}
        </div>

        {/* Rib */}
        <div style={{ marginBottom: 12, padding: "12px 14px", background: BG, borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: BLUE }}>Rib Cost</div>
            <div style={{ display: "flex", gap: 6 }}>
              <ToggleBtn active={ribMode === "manual"} onClick={() => setRibMode("manual")}>Manual</ToggleBtn>
              <ToggleBtn active={ribMode === "weight"} onClick={() => setRibMode("weight")}>By Weight</ToggleBtn>
            </div>
          </div>
          {ribMode === "weight" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <div style={LBL_STYLE}>Rib weight per pc (g)</div>
                <input type="number" value={ribWt.weightPerPc || ""} placeholder="0"
                  onChange={e => setRibWt(w => ({ ...w, weightPerPc: parseFloat(e.target.value) || 0 }))} style={INP_STYLE} />
              </div>
              <div>
                <div style={LBL_STYLE}>Price per kg (₹)</div>
                <input type="number" value={ribWt.pricePerKg || ""} placeholder="0"
                  onChange={e => setRibWt(w => ({ ...w, pricePerKg: parseFloat(e.target.value) || 0 }))} style={INP_STYLE} />
              </div>
              <div>
                <div style={LBL_STYLE}>Computed Total</div>
                <div style={{ ...INP_STYLE, background: WHITE, display: "flex", alignItems: "center", fontWeight: 700, color: BLACK }}>{fmt(ribTotal)}</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={LBL_STYLE}>Amount</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="number" value={ribManual || ""} placeholder="0"
                  onChange={e => setRibManual(parseFloat(e.target.value) || 0)} style={INP_STYLE} />
                <ToggleBtn active={ribPerPc} onClick={() => setPerPc(p => ({ ...p, rib: !p.rib }))}>
                  {ribPerPc ? "₹/pc" : "Total"}
                </ToggleBtn>
              </div>
              {ribPerPc && totalQty > 0 && <div style={{ fontSize: 10, color: MID, marginTop: 3 }}>Total: {fmt(ribTotal)}</div>}
            </div>
          )}
        </div>

        {/* Other cost lines */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {renderCostRow("printing", "Printing & Decoration")}
          {renderCostRow("jobWork", "Job Work (Outsourced)")}
          {renderCostRow("packaging", "Packaging")}
          {renderCostRow("transport", "Transport / Courier")}
          {renderCostRow("design", "Design / Artwork")}
          {renderCostRow("misc", "Miscellaneous")}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "space-between" }}>
          <div>
            {onDelete && (
              <button type="button" onClick={onDelete} style={{ fontSize: 12, padding: "9px 16px", borderRadius: 7, border: `1px solid ${R}`, background: WHITE, color: R, cursor: "pointer", fontWeight: 600 }}>Delete order</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} style={{ fontSize: 12, padding: "9px 16px", borderRadius: 7, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button type="button" onClick={handleSave} style={{ fontSize: 12, padding: "9px 20px", borderRadius: 7, background: R, color: WHITE, border: "none", cursor: "pointer", fontWeight: 700 }}>
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
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [costModal, setCostModal] = useState<Order | null>(null);
  const [editModal, setEditModal] = useState<Partial<Order> | null>(null);

  async function load() {
    const [oRes, cRes, pRes] = await Promise.all([fetch("/api/orders"), fetch("/api/clients"), fetch("/api/products")]);
    setOrders(await oRes.json());
    setClients(await cRes.json());
    setCatalogProducts(await pRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: Record<string, unknown>) {
    if (editModal?.id) {
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
                  <td style={{ padding: "11px 14px", color: MID, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getProductDisplay(o.product)}</td>
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
                      <button onClick={() => window.open(`/invoice/view?id=${encodeURIComponent(o.id)}`, "_blank")} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: `1px solid ${R}`, background: WHITE, cursor: "pointer", color: R, fontWeight: 600 }}>Invoice</button>
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
        <EditModal
          order={editModal}
          clients={clients}
          catalogProducts={catalogProducts}
          allOrders={orders}
          onSave={handleSave}
          onClose={() => setEditModal(null)}
          onDelete={editModal.id ? () => handleDelete(editModal.id!) : undefined}
        />
      )}
    </div>
  );
}
