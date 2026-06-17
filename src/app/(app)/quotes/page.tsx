"use client";

import { useEffect, useState } from "react";

const R = "#EE3C30", BLUE = "#2266A1", GOLD = "#D4B800", PURPLE = "#7B4FBF", ORANGE = "#E67E22";
const MID = "#888", BORDER = "#E8E7E3", BG = "#F7F6F2", WHITE = "#FFFFFF", BLACK = "#111111";
const GREEN = "#1A7A4A";

type Product = { id: number; name: string; gstRate: string; basePrice: number; category: string };

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const fmtDec = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function marginColor(m: number) { return m > 0.35 ? GREEN : m > 0.2 ? "#8a7300" : R; }

const COST_LINES = [
  { key: "fabric",    label: "Fabric / Blank Garment",  color: BLUE },
  { key: "printing",  label: "Printing & Decoration",   color: R },
  { key: "jobWork",   label: "Job Work (Outsourced)",   color: PURPLE },
  { key: "packaging", label: "Packaging",               color: GOLD },
  { key: "transport", label: "Transport / Courier",     color: GREEN },
  { key: "design",    label: "Design / Artwork",        color: ORANGE },
  { key: "misc",      label: "Miscellaneous",           color: MID },
];

type Costs = Record<string, number>;

const BLANK_COSTS: Costs = { fabric: 0, printing: 0, jobWork: 0, packaging: 0, transport: 0, design: 0, misc: 0 };

function numInput(label: string, value: number, onChange: (v: number) => void, prefix = "₹") {
  return (
    <div>
      <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", border: `1px solid ${BORDER}`, borderRadius: 7, overflow: "hidden" }}>
        {prefix && <span style={{ padding: "8px 10px", background: BG, fontSize: 12, color: MID, borderRight: `1px solid ${BORDER}` }}>{prefix}</span>}
        <input
          type="number" value={value || ""}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          placeholder="0"
          style={{ flex: 1, padding: "8px 10px", border: "none", fontSize: 13, outline: "none", background: WHITE }}
        />
      </div>
    </div>
  );
}

export default function QuotesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<number | "">("");
  const [qty, setQty] = useState(0);
  const [salePricePerUnit, setSalePricePerUnit] = useState(0);
  const [costs, setCosts] = useState<Costs>({ ...BLANK_COSTS });

  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then((data: Product[]) =>
      setProducts(data.filter(p => p.active !== false))
    );
  }, []);

  const product = products.find(p => p.id === productId);
  const gstRate = product ? parseFloat(product.gstRate) / 100 : 0.05;

  const saleValue = qty * salePricePerUnit;
  const gstAmount = saleValue * gstRate;
  const totalCost = COST_LINES.reduce((s, l) => s + (costs[l.key] || 0), 0);
  const grossProfit = saleValue - totalCost;
  const marginPct = saleValue > 0 ? grossProfit / saleValue : 0;
  const mc = marginColor(marginPct);

  const setCost = (key: string, v: number) => setCosts(p => ({ ...p, [key]: v }));

  function handleProductChange(id: number | "") {
    setProductId(id);
    if (id !== "") {
      const p = products.find(x => x.id === id);
      if (p && salePricePerUnit === 0) setSalePricePerUnit(p.basePrice);
    }
  }

  function reset() {
    setProductId("");
    setQty(0);
    setSalePricePerUnit(0);
    setCosts({ ...BLANK_COSTS });
  }

  const activeCosts = COST_LINES.filter(l => costs[l.key] > 0);

  return (
    <div style={{ padding: "26px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK }}>Quote Estimator</div>
          <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>Live margin calculator — nothing is saved</div>
        </div>
        <button onClick={reset} style={{ fontSize: 12, padding: "7px 14px", borderRadius: 7, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>
          Reset
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* Left — inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Product + Revenue */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14 }}>Order details</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>PRODUCT</div>
                <select
                  value={productId}
                  onChange={e => handleProductChange(e.target.value ? Number(e.target.value) : "")}
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", background: WHITE }}
                >
                  <option value="">— Select product —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {product && (
                  <div style={{ marginTop: 5, fontSize: 11, color: MID }}>
                    GST: <strong>{product.gstRate}</strong> · Base price: <strong>{fmt(product.basePrice)}/pc</strong>
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {numInput("QUANTITY (pcs)", qty, setQty, "pcs")}
                {numInput("SALE PRICE / pc", salePricePerUnit, setSalePricePerUnit)}
              </div>
            </div>
          </div>

          {/* Cost lines */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14 }}>Cost lines (total ₹, not per pc)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {COST_LINES.map(l => numInput(l.label.toUpperCase(), costs[l.key] || 0, v => setCost(l.key, v)))}
            </div>
          </div>
        </div>

        {/* Right — live result */}
        <div style={{ position: "sticky", top: 24 }}>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: R, marginBottom: 12 }}>
              Live estimate
            </div>

            {/* Margin ring */}
            <div style={{ textAlign: "center", marginBottom: 20, padding: "20px 0", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 42, fontWeight: 700, color: mc, letterSpacing: "-0.02em" }}>
                {saleValue > 0 ? (marginPct * 100).toFixed(1) + "%" : "—"}
              </div>
              <div style={{ fontSize: 12, color: MID, marginTop: 4 }}>Gross margin</div>
              {saleValue > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, padding: "4px 14px", borderRadius: 20, display: "inline-block", background: mc + "15", color: mc }}>
                  {marginPct > 0.35 ? "Healthy margin" : marginPct > 0.2 ? "Acceptable — watch costs" : "Below target — review pricing"}
                </div>
              )}
            </div>

            {/* Summary grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                ["Sale value", saleValue > 0 ? fmt(saleValue) : "—", "excl. GST"],
                ["GST collected", saleValue > 0 ? fmt(gstAmount) : "—", product?.gstRate ?? "5%"],
                ["Total cost", totalCost > 0 ? fmt(totalCost) : "—", "all-in"],
                ["Gross profit", saleValue > 0 ? fmt(grossProfit) : "—", grossProfit >= 0 ? "profit" : "loss"],
              ].map(([l, v, s]) => (
                <div key={l} style={{ background: BG, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: MID, fontWeight: 600, marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: l === "Gross profit" ? mc : BLACK }}>{v}</div>
                  <div style={{ fontSize: 10, color: MID }}>{s}</div>
                </div>
              ))}
            </div>

            {/* Per unit */}
            {qty > 0 && saleValue > 0 && (
              <div style={{ background: BG, borderRadius: 8, padding: "12px 14px", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                <div><span style={{ color: MID }}>Cost / pc: </span><strong>{fmtDec(totalCost / qty)}</strong></div>
                <div><span style={{ color: MID }}>Sale / pc: </span><strong>{fmtDec(saleValue / qty)}</strong></div>
                <div><span style={{ color: MID }}>Profit / pc: </span><strong style={{ color: mc }}>{fmtDec(grossProfit / qty)}</strong></div>
                <div><span style={{ color: MID }}>Total invoice: </span><strong>{fmt(saleValue + gstAmount)}</strong></div>
              </div>
            )}

            {/* Cost breakdown bars */}
            {activeCosts.length > 0 && totalCost > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Cost breakdown</div>
                {activeCosts.map(l => (
                  <div key={l.key} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
                      <span>{l.label}</span>
                      <span style={{ fontWeight: 600 }}>
                        {fmt(costs[l.key])}
                        <span style={{ color: MID, fontWeight: 400 }}> ({((costs[l.key] / totalCost) * 100).toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 5, background: BG, borderRadius: 3 }}>
                      <div style={{ width: `${(costs[l.key] / totalCost) * 100}%`, height: "100%", background: l.color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {saleValue === 0 && (
              <div style={{ textAlign: "center", color: MID, fontSize: 12, padding: "12px 0" }}>
                Enter qty and sale price to see your estimate
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
