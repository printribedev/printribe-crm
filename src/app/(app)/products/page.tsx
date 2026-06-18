"use client";

import { useEffect, useState } from "react";

const R = "#EE3C30", BLUE = "#2266A1", GOLD = "#D4B800", PURPLE = "#7B4FBF", ORANGE = "#E67E22";
const MID = "#888", BORDER = "#E8E7E3", BG = "#F7F6F2", WHITE = "#FFFFFF", BLACK = "#111111";

const CAT_COLORS: Record<string, string> = {
  Apparel: R, Sportswear: BLUE, Accessories: PURPLE, Service: GOLD, Promotional: ORANGE,
};
const CATEGORIES = ["Apparel", "Sportswear", "Accessories", "Service", "Promotional"];
const GST_RATES = ["5%", "12%", "18%"];

type VariantDef = { name: string; values: string[] };

type Product = {
  id: number; name: string; hsn: string; gstRate: string;
  category: string; moq: number; basePrice: number;
  gsm: string | null; decoration: string | null;
  description: string | null; variants: VariantDef[] | null;
  active: boolean;
};

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

function parseVariants(raw: unknown): VariantDef[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

const BLANK: Omit<Product, "id"> = {
  name: "", hsn: "6109", gstRate: "5%", category: "Apparel",
  moq: 20, basePrice: 0, gsm: "", decoration: "", description: "", variants: [], active: true,
};

const INP = { width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", background: WHITE, boxSizing: "border-box" as const };
const LBL = { fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 as const };

function Badge({ text, color = R }: { text: string; color?: string }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: color + "18", color }}>{text}</span>;
}

function VariantBuilder({ variants, onChange }: { variants: VariantDef[]; onChange: (v: VariantDef[]) => void }) {
  function addVariant() {
    onChange([...variants, { name: "", values: [""] }]);
  }
  function removeVariant(i: number) {
    onChange(variants.filter((_, idx) => idx !== i));
  }
  function setName(i: number, name: string) {
    onChange(variants.map((v, idx) => idx === i ? { ...v, name } : v));
  }
  function addValue(i: number) {
    onChange(variants.map((v, idx) => idx === i ? { ...v, values: [...v.values, ""] } : v));
  }
  function setValue(i: number, j: number, val: string) {
    onChange(variants.map((v, idx) => idx === i ? { ...v, values: v.values.map((vv, jj) => jj === j ? val : vv) } : v));
  }
  function removeValue(i: number, j: number) {
    onChange(variants.map((v, idx) => idx === i ? { ...v, values: v.values.filter((_, jj) => jj !== j) } : v));
  }

  return (
    <div>
      {variants.map((v, i) => (
        <div key={i} style={{ background: BG, borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={LBL}>Variant Name (e.g. Neck Type, Fabric)</div>
              <input value={v.name} onChange={e => setName(i, e.target.value)}
                placeholder="e.g. Neck Type" style={INP} />
            </div>
            <button type="button" onClick={() => removeVariant(i)}
              style={{ marginTop: 18, border: "none", background: "none", color: MID, cursor: "pointer", fontSize: 18, padding: "0 4px", flexShrink: 0 }}>✕</button>
          </div>
          <div style={LBL}>Values</div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 6 }}>
            {v.values.map((val, j) => (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 4, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "3px 6px 3px 8px" }}>
                <input value={val} onChange={e => setValue(i, j, e.target.value)}
                  placeholder="e.g. V Neck"
                  style={{ border: "none", outline: "none", fontSize: 12, background: "transparent", width: Math.max(70, val.length * 8) }} />
                {v.values.length > 1 && (
                  <button type="button" onClick={() => removeValue(i, j)}
                    style={{ border: "none", background: "none", color: MID, cursor: "pointer", fontSize: 13, padding: "0 2px", lineHeight: 1 }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => addValue(i)}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px dashed ${BLUE}`, background: WHITE, color: BLUE, cursor: "pointer", fontWeight: 600 }}>+ Value</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addVariant}
        style={{ fontSize: 12, padding: "7px 14px", borderRadius: 7, border: `1px dashed ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600, width: "100%" }}>
        + Add variant dimension
      </button>
    </div>
  );
}

function Modal({ product, onSave, onClose, onDelete }: {
  product: Partial<Product> & { id?: number };
  onSave: (v: Partial<Product>) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<Omit<Product, "id"> & { id?: number }>({
    ...BLANK,
    ...product,
    variants: parseVariants(product.variants),
  });
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));
  const isNew = !product.id;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: 14, width: "100%", maxWidth: 580, maxHeight: "93vh", overflowY: "auto", padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? "Add New Product" : `Edit — ${product.name}`}</div>
          <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
        </div>

        {/* Core fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <div style={LBL}>Product Name</div>
            <input value={form.name} onChange={e => set("name", e.target.value)} style={INP} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <div style={LBL}>Description</div>
            <textarea value={form.description ?? ""} onChange={e => set("description", e.target.value)}
              placeholder="Brief description of this product…"
              rows={2}
              style={{ ...INP, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div>
            <div style={LBL}>Category</div>
            <select value={form.category} onChange={e => set("category", e.target.value)} style={INP}>
              {CATEGORIES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div style={LBL}>GST Rate</div>
            <select value={form.gstRate} onChange={e => set("gstRate", e.target.value)} style={INP}>
              {GST_RATES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div style={LBL}>HSN Code</div>
            <input value={form.hsn} onChange={e => set("hsn", e.target.value)} style={INP} />
          </div>
          <div>
            <div style={LBL}>MOQ (pcs)</div>
            <input type="number" value={form.moq} onChange={e => set("moq", parseInt(e.target.value) || 0)} style={INP} />
          </div>
          <div>
            <div style={LBL}>Base Price (₹)</div>
            <input type="number" value={form.basePrice} onChange={e => set("basePrice", parseFloat(e.target.value) || 0)} style={INP} />
          </div>
          <div>
            <div style={LBL}>Status</div>
            <select value={String(form.active)} onChange={e => set("active", e.target.value === "true")} style={INP}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <div style={LBL}>GSM / Material</div>
            <input value={form.gsm ?? ""} onChange={e => set("gsm", e.target.value)} style={INP} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <div style={LBL}>Decoration Methods</div>
            <input value={form.decoration ?? ""} onChange={e => set("decoration", e.target.value)} style={INP} />
          </div>
        </div>

        {/* Variants */}
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Product Variants</div>
          <div style={{ fontSize: 11, color: MID, marginBottom: 12 }}>Define variant dimensions (e.g. Neck Type, Fabric). These let you track which variant sells more in analytics.</div>
          <VariantBuilder variants={form.variants ?? []} onChange={v => set("variants", v)} />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "space-between" }}>
          <div>
            {onDelete && (
              <button onClick={onDelete} style={{ fontSize: 12, padding: "9px 16px", borderRadius: 7, border: `1px solid ${R}`, background: WHITE, color: R, cursor: "pointer", fontWeight: 600 }}>Delete product</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ fontSize: 12, padding: "9px 16px", borderRadius: 7, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button onClick={() => { onSave(form); onClose(); }} style={{ fontSize: 12, padding: "9px 20px", borderRadius: 7, background: R, color: WHITE, border: "none", cursor: "pointer", fontWeight: 700 }}>
              {isNew ? "Add product" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Product> | null>(null);

  async function load() {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data.map((p: Product) => ({
      ...p,
      basePrice: Number(p.basePrice),
      variants: parseVariants(p.variants),
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: Partial<Product>) {
    if (form.id) {
      await fetch(`/api/products/${form.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setModal(null);
    await load();
  }

  if (loading) return <div style={{ padding: "26px 28px", color: MID, fontSize: 13 }}>Loading products…</div>;

  return (
    <div style={{ padding: "26px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK }}>Products</div>
          <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>{products.length} products in catalog</div>
        </div>
        <button onClick={() => setModal({})} style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 7, background: R, color: WHITE, border: "none", cursor: "pointer" }}>
          + Add product
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {products.map(p => (
          <div key={p.id} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 18, opacity: p.active ? 1 : 0.55, borderTop: `3px solid ${CAT_COLORS[p.category] || MID}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ marginTop: 5 }}><Badge text={p.category} color={CAT_COLORS[p.category] || MID} /></div>
              </div>
              <button onClick={() => setModal(p)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", color: MID, flexShrink: 0 }}>Edit</button>
            </div>
            {p.description && (
              <div style={{ fontSize: 11, color: MID, marginBottom: 10, lineHeight: 1.5 }}>{p.description}</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, marginTop: 8 }}>
              {[["HSN", p.hsn], ["GST", p.gstRate], ["MOQ", p.moq + " pcs"], ["Base ₹", fmt(p.basePrice)], ["Material", p.gsm || "—"]].map(([l, v]) => (
                <div key={l}><span style={{ color: MID, fontSize: 10 }}>{l}</span><div style={{ fontWeight: 600 }}>{v}</div></div>
              ))}
            </div>
            {p.decoration && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}`, fontSize: 11, color: MID }}>
                <span style={{ fontWeight: 600, color: BLACK }}>Decoration: </span>{p.decoration}
              </div>
            )}
            {p.variants && p.variants.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                {p.variants.map((v, i) => (
                  <div key={i} style={{ fontSize: 11, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: BLACK }}>{v.name}: </span>
                    <span style={{ color: MID }}>{v.values.filter(Boolean).join(", ")}</span>
                  </div>
                ))}
              </div>
            )}
            {!p.active && <div style={{ marginTop: 8 }}><Badge text="Inactive" color={MID} /></div>}
          </div>
        ))}
        {products.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 32, textAlign: "center", color: MID, fontSize: 13 }}>No products yet.</div>
        )}
      </div>

      {modal !== null && (
        <Modal product={modal} onSave={handleSave} onClose={() => setModal(null)}
          onDelete={modal.id ? () => handleDelete(modal.id!) : undefined} />
      )}
    </div>
  );
}
