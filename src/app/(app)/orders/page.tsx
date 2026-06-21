"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import DateFilterBar from "@/components/DateFilterBar";
import { DateFilter, applyDateFilter, loadFilter } from "@/lib/dateFilter";

import {
  PRIMARY, SUCCESS, ERROR, GOLD, PURPLE, ORANGE, TEAL,
  INK, MID, BORDER, SURFACE, SURFACE2, WHITE, SHADOW_SM,
  R_SM, R_MD,
} from "@/lib/tokens";
const R = ERROR, BLUE = PRIMARY, GREEN = SUCCESS;
const BG = SURFACE, BLACK = INK;
const CARD_RADIUS = R_MD, BTN_RADIUS = R_SM;

const SEG_COLORS: Record<string, string> = { Reseller: R, Sports: BLUE, Education: GREEN, Corporate: GOLD, NGO_Govt: PURPLE, B2C: ORANGE };
const SEG_LABELS: Record<string, string> = { Reseller: "Reseller", Sports: "Sports", Education: "Education", Corporate: "Corporate", NGO_Govt: "NGO/Govt", B2C: "B2C" };
const SEGMENTS = ["Reseller", "Sports", "Education", "Corporate", "NGO_Govt", "B2C"];
const STAGES = [
  { id: "design", label: "Design", color: PURPLE },
  { id: "sampling", label: "Sampling", color: BLUE },
  { id: "production", label: "In Production", color: ORANGE },
  { id: "qc", label: "QC / Finishing", color: GOLD },
  { id: "dispatch", label: "Dispatched", color: BLUE },
  { id: "delivered", label: "Delivered", color: GREEN },
  { id: "delivered_pending", label: "Delivered, Payment Pending", color: ORANGE },
];

type ProductLine = {
  productId: number | null; name: string; hsn: string; qty: number; unitPrice: number; gstPct: number;
  selectedVariants: Record<string, string>;
  // Fabric
  fabricMode: "manual" | "weight"; fabricWeightPerPc: number; fabricPricePerKg: number; fabricManual: number; fabricPerPc: boolean;
  // Rib
  ribMode: "manual" | "weight"; ribWeightPerPc: number; ribPricePerKg: number; ribManual: number; ribPerPc: boolean;
  // Other costs
  printing: number; printingPerPc: boolean;
  jobWork: number; jobWorkPerPc: boolean;
  packaging: number; packagingPerPc: boolean;
  transport: number; transportPerPc: boolean;
  design: number; designPerPc: boolean;
  misc: number; miscPerPc: boolean;
};

const BLANK_LINE: ProductLine = {
  productId: null, name: "", hsn: "", qty: 0, unitPrice: 0, gstPct: 5,
  selectedVariants: {},
  fabricMode: "manual", fabricWeightPerPc: 0, fabricPricePerKg: 0, fabricManual: 0, fabricPerPc: false,
  ribMode: "manual", ribWeightPerPc: 0, ribPricePerKg: 0, ribManual: 0, ribPerPc: false,
  printing: 0, printingPerPc: false, jobWork: 0, jobWorkPerPc: false,
  packaging: 0, packagingPerPc: false, transport: 0, transportPerPc: false,
  design: 0, designPerPc: false, misc: 0, miscPerPc: false,
};

type VariantDef = { name: string; values: string[] };
type CatalogProduct = { id: number; name: string; hsn: string; gstRate: string; basePrice: number; variants: VariantDef[] | null };
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
  deliveryDate: string | null; paymentDate: string | null;
  flagged: string | null;
  notes: OrderNote[]; timeline: OrderTimeline[];
};

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const pct = (n: number) => (n * 100).toFixed(1) + "%";

// Cost helpers per line
function lineFabric(l: ProductLine): number {
  if (l.fabricMode === "weight") return l.fabricWeightPerPc * l.fabricPricePerKg;
  return l.fabricPerPc ? l.fabricManual * l.qty : l.fabricManual;
}
function lineRib(l: ProductLine): number {
  if (l.ribMode === "weight") return l.ribWeightPerPc * l.ribPricePerKg;
  return l.ribPerPc ? l.ribManual * l.qty : l.ribManual;
}
function lineVal(val: number, perPc: boolean, qty: number): number {
  return perPc ? val * qty : val;
}
function lineTotalCost(l: ProductLine): number {
  return lineFabric(l) + lineRib(l)
    + lineVal(l.printing, l.printingPerPc, l.qty)
    + lineVal(l.jobWork, l.jobWorkPerPc, l.qty)
    + lineVal(l.packaging, l.packagingPerPc, l.qty)
    + lineVal(l.transport, l.transportPerPc, l.qty)
    + lineVal(l.design, l.designPerPc, l.qty)
    + lineVal(l.misc, l.miscPerPc, l.qty);
}

function parseLines(product: string, fallbackQty = 0, fallbackSale = 0, fallbackGst = 0): ProductLine[] {
  try {
    const p = JSON.parse(product);
    if (Array.isArray(p) && p.length > 0) {
      // Migrate old format (no cost fields) to new format
      return p.map((l: Partial<ProductLine>) => ({ ...BLANK_LINE, ...l }));
    }
  } catch { /* legacy string */ }
  const gstPct = fallbackSale > 0 ? Math.round(fallbackGst / fallbackSale * 100) : 5;
  return [{ ...BLANK_LINE, name: product || "", hsn: "6109", qty: fallbackQty, unitPrice: fallbackQty > 0 ? fallbackSale / fallbackQty : 0, gstPct }];
}

function suggestNextId(orders: Order[]): string {
  const now = new Date();
  const fy = now.getMonth() >= 3
    ? `${String(now.getFullYear()).slice(2)}-${String(now.getFullYear() + 1).slice(2)}`
    : `${String(now.getFullYear() - 1).slice(2)}-${String(now.getFullYear()).slice(2)}`;
  if (!orders?.length) return `PT/PI/001/${fy}`;
  const sorted = [...orders].sort((a, b) => {
    const dd = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dd !== 0) return dd;
    const aS = parseInt(a.id?.split("/")?.[2] ?? "0") || 0;
    const bS = parseInt(b.id?.split("/")?.[2] ?? "0") || 0;
    return bS - aS;
  });
  const serial = (parseInt(sorted[0]?.id?.split("/")?.[2] ?? "0") || 0) + 1;
  return `PT/PI/${String(serial).padStart(3, "0")}/${fy}`;
}

function calcMargin(o: Order) {
  const totalCost = o.fabric + o.printing + o.transport + o.misc + o.jobWork + o.packaging + o.design + (o.ribCost || 0);
  const grossProfit = o.saleValue - totalCost;
  return { totalCost, grossProfit, marginPct: o.saleValue > 0 ? grossProfit / o.saleValue : 0 };
}
function marginColor(m: number) { return m > 0.25 ? GREEN : m >= 0.15 ? MID : R; }

function getProductDisplay(product: string): string {
  try {
    const p = JSON.parse(product);
    if (Array.isArray(p)) return p.length === 1 ? (p[0].name || "—") : p.map((l: ProductLine) => l.name).filter(Boolean).join(", ");
  } catch { /* legacy */ }
  return product || "—";
}

const noWheel = (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur();

function Badge({ text, color = R }: { text: string; color?: string }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: BTN_RADIUS, background: color + "18", color }}>{text}</span>;
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      fontSize: 10, padding: "3px 9px", borderRadius: BTN_RADIUS, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: WHITE, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: R, marginBottom: 4 }}>Job Cost Card</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{order.clientName}</div>
            <div style={{ fontSize: 12, color: MID }}>{order.id} · {order.date.slice(0, 10)}</div>
          </div>
          <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: BTN_RADIUS, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
          {([["Sale Value", fmt(order.saleValue), "excl. GST"], ["Total Cost", fmt(totalCost), "all-in"], ["Gross Profit", fmt(grossProfit), pct(marginPct) + " margin"]] as [string, string, string][]).map(([l, v, s]) => (
            <div key={l} style={{ background: BG, borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, padding: "12px 14px" }}>
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
        <div style={{ background: BG, borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, padding: "12px 14px", fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><span style={{ color: MID }}>GST collected: </span><strong>{fmt(order.gst)}</strong></div>
          <div><span style={{ color: MID }}>Units: </span><strong>{order.qty.toLocaleString()} pcs</strong></div>
          <div><span style={{ color: MID }}>Per pc cost: </span><strong>{order.qty > 0 ? fmt(totalCost / order.qty) : "—"}</strong></div>
          <div><span style={{ color: MID }}>Per pc sale: </span><strong>{order.qty > 0 ? fmt(order.saleValue / order.qty) : "—"}</strong></div>
        </div>
      </div>
    </div>
  );
}

const INP = { width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, fontSize: 13, outline: "none", background: WHITE, boxSizing: "border-box" as const };
const LBL = { fontSize: 10, color: MID, marginBottom: 3, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em" };
const SINP = { ...INP, padding: "7px 8px", fontSize: 12 };

function ProductLineSection({ line, idx, catalogProducts, onChange, onRemove, canRemove }: {
  line: ProductLine; idx: number;
  catalogProducts: CatalogProduct[];
  onChange: (k: keyof ProductLine, v: unknown) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const fabricTotal = lineFabric(line);
  const ribTotal = lineRib(line);
  const lineTotal = (line.qty || 0) * (line.unitPrice || 0);
  const totalCostLine = lineTotalCost(line);

  const catalogProduct = catalogProducts.find(p => p.id === line.productId) ?? null;
  const variantDefs: VariantDef[] = catalogProduct?.variants ?? [];

  function pickProduct(productId: number) {
    const cp = catalogProducts.find(p => p.id === productId);
    if (!cp) return;
    onChange("productId", cp.id);
    onChange("name", cp.name);
    onChange("hsn", cp.hsn);
    onChange("gstPct", parseFloat(cp.gstRate) || 5);
    onChange("selectedVariants", {});
  }

  function setVariant(varName: string, val: string) {
    onChange("selectedVariants", { ...line.selectedVariants, [varName]: val });
  }

  const renderCostField = (field: keyof ProductLine, perPcField: keyof ProductLine, label: string) => {
    const val = line[field] as number;
    const isPerPc = line[perPcField] as boolean;
    const total = lineVal(val, isPerPc, line.qty);
    return (
      <div>
        <div style={LBL}>{label}</div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <input type="number" onWheel={noWheel} value={val || ""} placeholder="0"
            onChange={e => onChange(field, parseFloat(e.target.value) || 0)} style={SINP} />
          <ToggleBtn active={isPerPc} onClick={() => onChange(perPcField, !isPerPc)}>
            {isPerPc ? "₹/pc" : "Total"}
          </ToggleBtn>
        </div>
        {isPerPc && line.qty > 0 && <div style={{ fontSize: 10, color: MID, marginTop: 2 }}>{fmt(total)}</div>}
      </div>
    );
  };

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: CARD_RADIUS, marginBottom: 12, overflow: "hidden" }}>
      {/* Product row */}
      <div style={{ background: BG, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: BLUE, minWidth: 70 }}>Product {idx + 1}</div>
        <div style={{ flex: 2, minWidth: 160 }}>
          <select value={line.productId ?? ""} onChange={e => {
            if (!e.target.value) { onChange("productId", null); onChange("name", ""); onChange("hsn", ""); }
            else pickProduct(Number(e.target.value));
          }} style={SINP}>
            <option value="">— Select product —</option>
            {catalogProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ width: 70 }}>
          <div style={LBL}>HSN</div>
          <input value={line.hsn} onChange={e => onChange("hsn", e.target.value)} style={SINP} />
        </div>
        <div style={{ width: 65 }}>
          <div style={LBL}>Qty</div>
          <input type="number" onWheel={noWheel} value={line.qty || ""} placeholder="0" onChange={e => onChange("qty", parseInt(e.target.value) || 0)} style={SINP} />
        </div>
        <div style={{ width: 95 }}>
          <div style={LBL}>Unit Price ₹</div>
          <input type="number" onWheel={noWheel} value={line.unitPrice || ""} placeholder="0" onChange={e => onChange("unitPrice", parseFloat(e.target.value) || 0)} style={SINP} />
        </div>
        <div style={{ width: 55 }}>
          <div style={LBL}>GST %</div>
          <input type="number" onWheel={noWheel} value={line.gstPct || ""} placeholder="5" onChange={e => onChange("gstPct", parseFloat(e.target.value) || 0)} style={SINP} />
        </div>
        <div style={{ textAlign: "right", minWidth: 80, flex: 1 }}>
          <div style={LBL}>Line Total</div>
          <div style={{ fontSize: 13, fontWeight: 700, paddingTop: 4 }}>{fmt(lineTotal)}</div>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} style={{ border: "none", background: "none", color: MID, cursor: "pointer", fontSize: 16, padding: "0 4px", alignSelf: "flex-end", marginBottom: 2 }}>✕</button>
        )}
      </div>

      {/* Variant selection */}
      {variantDefs.length > 0 && (
        <div style={{ padding: "8px 14px 0", display: "flex", flexWrap: "wrap", gap: 10, background: WHITE, borderBottom: `1px solid ${BORDER}` }}>
          {variantDefs.map(vd => (
            <div key={vd.name} style={{ marginBottom: 8 }}>
              <div style={LBL}>{vd.name}</div>
              <select
                value={line.selectedVariants?.[vd.name] ?? ""}
                onChange={e => setVariant(vd.name, e.target.value)}
                style={{ ...SINP, minWidth: 120 }}
              >
                <option value="">— Select —</option>
                {vd.values.filter(Boolean).map(val => <option key={val} value={val}>{val}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Cost section */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: MID, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          Costs for Product {idx + 1}
          {totalCostLine > 0 && <span style={{ marginLeft: 8, color: BLUE }}>Total cost: {fmt(totalCostLine)}{line.qty > 0 ? ` · ${fmt(totalCostLine / line.qty)}/pc` : ""}</span>}
        </div>

        {/* Fabric */}
        <div style={{ background: BG, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: BLUE }}>Fabric / Blank Garment</div>
            <div style={{ display: "flex", gap: 5 }}>
              <ToggleBtn active={line.fabricMode === "manual"} onClick={() => onChange("fabricMode", "manual")}>Manual</ToggleBtn>
              <ToggleBtn active={line.fabricMode === "weight"} onClick={() => onChange("fabricMode", "weight")}>By Weight</ToggleBtn>
            </div>
          </div>
          {line.fabricMode === "weight" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <div style={LBL}>Total weight (kg)</div>
                <input type="number" onWheel={noWheel} value={line.fabricWeightPerPc || ""} placeholder="0.000"
                  onChange={e => onChange("fabricWeightPerPc", parseFloat(e.target.value) || 0)} style={SINP} />
              </div>
              <div>
                <div style={LBL}>Price per kg (₹)</div>
                <input type="number" onWheel={noWheel} value={line.fabricPricePerKg || ""} placeholder="0"
                  onChange={e => onChange("fabricPricePerKg", parseFloat(e.target.value) || 0)} style={SINP} />
              </div>
              <div>
                <div style={LBL}>Computed Total</div>
                <div style={{ ...SINP, background: WHITE, display: "flex", alignItems: "center", fontWeight: 700, color: BLACK, border: `1px solid ${BORDER}` }}>
                  {fmt(fabricTotal)}
                  {line.fabricWeightPerPc > 0 && line.fabricPricePerKg > 0 && (
                    <span style={{ fontSize: 10, color: MID, marginLeft: 6 }}>{line.fabricWeightPerPc} kg × ₹{line.fabricPricePerKg}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <div style={LBL}>Amount</div>
                <input type="number" onWheel={noWheel} value={line.fabricManual || ""} placeholder="0"
                  onChange={e => onChange("fabricManual", parseFloat(e.target.value) || 0)} style={SINP} />
              </div>
              <ToggleBtn active={line.fabricPerPc} onClick={() => onChange("fabricPerPc", !line.fabricPerPc)}>
                {line.fabricPerPc ? "₹/pc" : "Total"}
              </ToggleBtn>
              {line.fabricPerPc && line.qty > 0 && <span style={{ fontSize: 11, color: MID, paddingBottom: 8 }}>= {fmt(fabricTotal)}</span>}
            </div>
          )}
        </div>

        {/* Rib */}
        <div style={{ background: BG, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: BLUE }}>Rib Cost</div>
            <div style={{ display: "flex", gap: 5 }}>
              <ToggleBtn active={line.ribMode === "manual"} onClick={() => onChange("ribMode", "manual")}>Manual</ToggleBtn>
              <ToggleBtn active={line.ribMode === "weight"} onClick={() => onChange("ribMode", "weight")}>By Weight</ToggleBtn>
            </div>
          </div>
          {line.ribMode === "weight" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <div style={LBL}>Total rib weight (kg)</div>
                <input type="number" onWheel={noWheel} value={line.ribWeightPerPc || ""} placeholder="0.000"
                  onChange={e => onChange("ribWeightPerPc", parseFloat(e.target.value) || 0)} style={SINP} />
              </div>
              <div>
                <div style={LBL}>Price per kg (₹)</div>
                <input type="number" onWheel={noWheel} value={line.ribPricePerKg || ""} placeholder="0"
                  onChange={e => onChange("ribPricePerKg", parseFloat(e.target.value) || 0)} style={SINP} />
              </div>
              <div>
                <div style={LBL}>Computed Total</div>
                <div style={{ ...SINP, background: WHITE, display: "flex", alignItems: "center", fontWeight: 700, color: BLACK, border: `1px solid ${BORDER}` }}>
                  {fmt(ribTotal)}
                  {line.ribWeightPerPc > 0 && line.ribPricePerKg > 0 && (
                    <span style={{ fontSize: 10, color: MID, marginLeft: 6 }}>{line.ribWeightPerPc} kg × ₹{line.ribPricePerKg}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <div style={LBL}>Amount</div>
                <input type="number" onWheel={noWheel} value={line.ribManual || ""} placeholder="0"
                  onChange={e => onChange("ribManual", parseFloat(e.target.value) || 0)} style={SINP} />
              </div>
              <ToggleBtn active={line.ribPerPc} onClick={() => onChange("ribPerPc", !line.ribPerPc)}>
                {line.ribPerPc ? "₹/pc" : "Total"}
              </ToggleBtn>
              {line.ribPerPc && line.qty > 0 && <span style={{ fontSize: 11, color: MID, paddingBottom: 8 }}>= {fmt(ribTotal)}</span>}
            </div>
          )}
        </div>

        {/* Other costs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {renderCostField("printing", "printingPerPc", "Printing & Decoration")}
          {renderCostField("jobWork", "jobWorkPerPc", "Job Work")}
          {renderCostField("packaging", "packagingPerPc", "Packaging")}
          {renderCostField("transport", "transportPerPc", "Transport")}
          {renderCostField("design", "designPerPc", "Design / Artwork")}
          {renderCostField("misc", "miscPerPc", "Miscellaneous")}
        </div>
      </div>
    </div>
  );
}

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
    stage: order.stage ?? "design",
    date: order.date ? order.date.slice(0, 10) : today,
    dueDate: order.dueDate ? order.dueDate.slice(0, 10) : "",
    deliveryDate: order.deliveryDate ? order.deliveryDate.slice(0, 10) : "",
    paymentDate: order.paymentDate ? order.paymentDate.slice(0, 10) : "",
    priority: order.priority ?? "Normal",
  });
  const setF = (k: string, v: string | number | null) => setForm(p => ({ ...p, [k]: v }));

  const [idError, setIdError] = useState("");
  const [clientInput, setClientInput] = useState(order.clientName ?? "");
  const [lines, setLines] = useState<ProductLine[]>(() =>
    parseLines(order.product ?? "", order.qty, order.saleValue, order.gst)
  );

  function updateLine(i: number, k: keyof ProductLine, v: unknown) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  }

  const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0);
  const totalSale = lines.reduce((s, l) => s + (l.qty || 0) * (l.unitPrice || 0), 0);
  const totalGst = lines.reduce((s, l) => s + (l.qty || 0) * (l.unitPrice || 0) * (l.gstPct || 0) / 100, 0);

  function handleClientInput(val: string) {
    setClientInput(val);
    const found = clients.find(c => c.name.toLowerCase() === val.toLowerCase());
    if (found) { setF("clientId", found.id); setF("clientName", found.name); setF("segment", found.segment); }
    else { setF("clientId", null); setF("clientName", val); }
  }

  function handleSave() {
    if (isNew && allOrders.some(o => o.id === form.id.trim())) {
      setIdError(`Invoice ID "${form.id.trim()}" already exists.`);
      return;
    }
    onSave({
      ...form,
      product: JSON.stringify(lines),
      qty: totalQty,
      saleValue: totalSale,
      gst: totalGst,
      fabric: lines.reduce((s, l) => s + lineFabric(l), 0),
      ribCost: lines.reduce((s, l) => s + lineRib(l), 0),
      printing: lines.reduce((s, l) => s + lineVal(l.printing, l.printingPerPc, l.qty), 0),
      jobWork: lines.reduce((s, l) => s + lineVal(l.jobWork, l.jobWorkPerPc, l.qty), 0),
      packaging: lines.reduce((s, l) => s + lineVal(l.packaging, l.packagingPerPc, l.qty), 0),
      transport: lines.reduce((s, l) => s + lineVal(l.transport, l.transportPerPc, l.qty), 0),
      design: lines.reduce((s, l) => s + lineVal(l.design, l.designPerPc, l.qty), 0),
      misc: lines.reduce((s, l) => s + lineVal(l.misc, l.miscPerPc, l.qty), 0),
      fabricWeightPerPc: null, fabricPricePerKg: null, ribWeightPerPc: null, ribPricePerKg: null,
    });
    onClose();
  }

  const sectionHdr = (text: string) => (
    <div style={{ fontSize: 12, fontWeight: 700, color: BLACK, borderTop: `1px solid ${BORDER}`, paddingTop: 14, marginTop: 14, marginBottom: 10 }}>{text}</div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: WHITE, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, width: "100%", maxWidth: 740, maxHeight: "93vh", overflowY: "auto", padding: 28 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? "New Order" : `Edit — ${order.id}`}</div>
          <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: BTN_RADIUS, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
        </div>

        {/* Order Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <div style={LBL}>Invoice ID</div>
            <input value={form.id} onChange={e => { setF("id", e.target.value); setIdError(""); }} disabled={!isNew}
              style={{ ...INP, background: !isNew ? BG : WHITE, borderColor: idError ? R : undefined }} />
            {idError
              ? <div style={{ fontSize: 10, color: R, marginTop: 3, fontWeight: 600 }}>⚠ {idError}</div>
              : isNew && <div style={{ fontSize: 10, color: MID, marginTop: 3 }}>Auto-suggested from last order</div>
            }
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <div style={LBL}>Client</div>
            <input list="clients-dl" value={clientInput} onChange={e => handleClientInput(e.target.value)}
              placeholder="Type or select client…" style={INP} />
            <datalist id="clients-dl">
              {clients.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
            {!form.clientId && clientInput && (
              <div style={{ fontSize: 10, color: ORANGE, marginTop: 3 }}>New client — invoice will show "-" for address, GST, email, phone until linked to a client record</div>
            )}
          </div>
          <div>
            <div style={LBL}>Segment</div>
            <select value={form.segment} onChange={e => setF("segment", e.target.value)} style={{ ...INP }}>
              {SEGMENTS.map(s => <option key={s} value={s}>{SEG_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <div style={LBL}>Stage</div>
            <select value={form.stage} onChange={e => setF("stage", e.target.value)} style={{ ...INP }}>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <div style={LBL}>Date</div>
            <input type="date" value={form.date} onChange={e => setF("date", e.target.value)} style={INP} />
          </div>
          <div>
            <div style={LBL}>Due Date</div>
            <input type="date" value={form.dueDate} onChange={e => setF("dueDate", e.target.value)} style={INP} />
          </div>
          <div>
            <div style={LBL}>Delivery Date</div>
            <input type="date" value={form.deliveryDate} onChange={e => setF("deliveryDate", e.target.value)} style={INP} />
          </div>
          <div>
            <div style={LBL}>Payment Date</div>
            <input type="date" value={form.paymentDate} onChange={e => setF("paymentDate", e.target.value)} style={INP} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <div style={LBL}>Priority</div>
            <select value={form.priority} onChange={e => setF("priority", e.target.value)} style={{ ...INP }}>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        {/* Products + Costs */}
        {sectionHdr("Products & Costs")}
        {lines.map((line, i) => (
          <ProductLineSection
            key={i}
            line={line}
            idx={i}
            catalogProducts={catalogProducts}
            onChange={(k, v) => updateLine(i, k, v)}
            onRemove={() => setLines(ls => ls.filter((_, idx) => idx !== i))}
            canRemove={lines.length > 1}
          />
        ))}
        <button type="button" onClick={() => setLines(ls => [...ls, { ...BLANK_LINE }])}
          style={{ fontSize: 12, padding: "7px 16px", borderRadius: BTN_RADIUS, border: `1px solid ${BLUE}`, background: WHITE, color: BLUE, cursor: "pointer", fontWeight: 600 }}>
          + Add product
        </button>

        {/* Revenue summary */}
        <div style={{ background: BG, borderRadius: 8, padding: "10px 14px", marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12 }}>
          <div><span style={{ color: MID }}>Total Qty: </span><strong>{totalQty.toLocaleString()} pcs</strong></div>
          <div><span style={{ color: MID }}>Sale Value: </span><strong>{fmt(totalSale)}</strong></div>
          <div><span style={{ color: MID }}>GST: </span><strong>{fmt(totalGst)}</strong></div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "space-between" }}>
          <div>
            {onDelete && (
              <button type="button" onClick={onDelete} style={{ fontSize: 12, padding: "9px 16px", borderRadius: BTN_RADIUS, border: `1px solid ${R}`, background: WHITE, color: R, cursor: "pointer", fontWeight: 600 }}>Delete order</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} style={{ fontSize: 12, padding: "9px 16px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button type="button" onClick={handleSave} style={{ fontSize: 12, padding: "9px 20px", borderRadius: BTN_RADIUS, background: BLUE, color: WHITE, border: "none", cursor: "pointer", fontWeight: 700 }}>
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
  const [dateFilter, setDateFilter] = useState<DateFilter>(() => loadFilter());
  const [sort, setSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "date", dir: "desc" });
  function cycleFlag(o: Order) {
    const cur = o.flagged ?? null;
    const next: string | null = cur === null ? "red" : cur === "red" ? "green" : null;
    setOrders(prev => prev.map(x => x.id === o.id ? { ...x, flagged: next } : x));
    fetch(`/api/orders/${encodeURIComponent(o.id)}/flag`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagged: next }),
    });
  }
  const [costModal, setCostModal] = useState<Order | null>(null);
  const [editModal, setEditModal] = useState<Partial<Order> | null>(null);

  async function load() {
    try {
      const [oRes, cRes, pRes] = await Promise.all([fetch("/api/orders"), fetch("/api/clients"), fetch("/api/products")]);
      const [orders, clients, products] = await Promise.all([oRes.json(), cRes.json(), pRes.json()]);
      if (oRes.ok) setOrders(orders); else console.error("Orders API error:", orders);
      if (cRes.ok) setClients(clients);
      if (pRes.ok) setCatalogProducts(products);
    } catch (e) {
      console.error("Failed to load orders:", e);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: Record<string, unknown>) {
    if (editModal?.id) {
      await fetch(`/api/orders/${encodeURIComponent(editModal.id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete order ${id}? This cannot be undone.`)) return;
    await fetch(`/api/orders/${encodeURIComponent(id)}`, { method: "DELETE" });
    setEditModal(null);
    await load();
  }

  function toggleSort(col: string) {
    setSort(s => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });
  }

  const filtered = applyDateFilter(orders, dateFilter)
    .filter(o => [o.id, o.clientName, o.product].some(f => f?.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.col) {
        case "id": {
          // Sort by FY first (parts[3]), then serial (parts[2]) numerically
          const [, , as, afy] = a.id.split("/");
          const [, , bs, bfy] = b.id.split("/");
          const fyDiff = (afy ?? "").localeCompare(bfy ?? "");
          if (fyDiff !== 0) return dir * fyDiff;
          return dir * ((parseInt(as) || 0) - (parseInt(bs) || 0));
        }
        case "client":   return dir * a.clientName.localeCompare(b.clientName);
        case "product":  return dir * getProductDisplay(a.product).localeCompare(getProductDisplay(b.product));
        case "segment":  return dir * a.segment.localeCompare(b.segment);
        case "qty":      return dir * (a.qty - b.qty);
        case "value":    return dir * (a.saleValue - b.saleValue);
        case "margin":   return dir * (calcMargin(a).marginPct - calcMargin(b).marginPct);
        case "stage":    return dir * (STAGES.findIndex(s => s.id === a.stage) - STAGES.findIndex(s => s.id === b.stage));
        case "date":     return dir * (new Date(a.date).getTime() - new Date(b.date).getTime());
        default:         return 0;
      }
    });

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ padding: "26px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", color: BLACK }}>Orders</div>
          <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>{orders.length} orders · Click Cost to see job costing</div>
        </div>
        <button onClick={() => setEditModal({})} style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: BTN_RADIUS, background: BLUE, color: WHITE, border: "none", cursor: "pointer" }}>
          + New order
        </button>
      </div>

      <DateFilterBar filter={dateFilter} onChange={setDateFilter} />

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by invoice, client or product…"
        style={{ width: "100%", padding: "10px 14px", borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, fontSize: 13, outline: "none", marginBottom: 16 }} />

      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: CARD_RADIUS, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: BLACK, color: WHITE }}>
              <th style={{ padding: "10px 8px", width: 32 }} />
              {([
                ["Invoice", "id"], ["Client", "client"], ["Product", "product"],
                ["Segment", "segment"], ["Qty", "qty"], ["Sale Value", "value"],
                ["Margin", "margin"], ["Stage", "stage"], ["", ""],
              ] as [string, string][]).map(([label, col]) => {
                const active = sort.col === col;
                const icon = !col ? "" : active ? (sort.dir === "asc" ? " ▲" : " ▼") : " ⇅";
                return (
                  <th key={col || "_"}
                    onClick={col ? () => toggleSort(col) : undefined}
                    style={{
                      padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 600,
                      letterSpacing: "0.07em", textTransform: "uppercase",
                      cursor: col ? "pointer" : "default",
                      userSelect: "none", whiteSpace: "nowrap",
                      color: active ? "#fff" : "rgba(255,255,255,0.6)",
                    }}>
                    {label}<span style={{ opacity: active ? 1 : 0.4, fontSize: 9 }}>{icon}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => {
              const { marginPct } = calcMargin(o);
              const mc = marginColor(marginPct);
              const stage = STAGES.find(s => s.id === o.stage) || STAGES[0];
              const TD: React.CSSProperties = { padding: "8px 12px" };
              return (
                <tr key={o.id} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? WHITE : BG }}>
                  <td style={{ padding: "8px 4px 8px 10px", width: 32 }}>
                    <button
                      title={o.flagged === "red" ? "Needs validation" : o.flagged === "green" ? "Validated" : "Click to flag"}
                      onClick={() => cycleFlag(o)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1, opacity: o.flagged ? 1 : 0.18 }}
                    >
                      <span style={{ color: o.flagged === "red" ? R : o.flagged === "green" ? GREEN : MID }}>⚑</span>
                    </button>
                  </td>
                  <td style={{ ...TD, fontWeight: 600, color: R, fontSize: 11 }}>{o.id}</td>
                  <td style={{ ...TD, fontWeight: 500 }}>{o.clientName}</td>
                  <td style={{ ...TD, color: MID }}>{getProductDisplay(o.product)}</td>
                  <td style={TD}><Badge text={SEG_LABELS[o.segment] || o.segment} color={SEG_COLORS[o.segment] || MID} /></td>
                  <td style={{ ...TD, fontWeight: 600 }}>{o.qty.toLocaleString()}</td>
                  <td style={{ ...TD, fontWeight: 700 }}>{fmt(o.saleValue)}</td>
                  <td style={TD}>
                    <span style={{ fontWeight: 700, color: mc, background: mc + "18", padding: "2px 7px", borderRadius: 20, fontSize: 11 }}>{pct(marginPct)}</span>
                  </td>
                  <td style={TD}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: stage.color, background: stage.color + "15", padding: "2px 7px", borderRadius: 20 }}>{stage.label}</span>
                  </td>
                  <td style={{ ...TD, overflow: "visible" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button title="Job Cost" onClick={() => setCostModal(o)} style={{ fontSize: 13, width: 28, height: 26, borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", color: MID, display: "flex", alignItems: "center", justifyContent: "center" }}>₹</button>
                      <button title="Edit order" onClick={() => setEditModal(o)} style={{ fontSize: 13, width: 28, height: 26, borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", color: MID, display: "flex", alignItems: "center", justifyContent: "center" }}>✎</button>
                      <button title="View invoice" onClick={() => window.open(`/invoice/view?id=${encodeURIComponent(o.id)}`, "_blank")} style={{ fontSize: 12, width: 28, height: 26, borderRadius: BTN_RADIUS, border: `1px solid ${R}`, background: WHITE, cursor: "pointer", color: R, display: "flex", alignItems: "center", justifyContent: "center" }}>⧉</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={10} style={{ padding: "32px", textAlign: "center", color: MID, fontSize: 13 }}>
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
