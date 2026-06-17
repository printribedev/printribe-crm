"use client";

import { useEffect, useState } from "react";

const R = "#EE3C30", BLUE = "#2266A1", GOLD = "#D4B800", PURPLE = "#7B4FBF", ORANGE = "#E67E22";
const MID = "#888", BORDER = "#E8E7E3", BG = "#F7F6F2", WHITE = "#FFFFFF", BLACK = "#111111";

const CAT_COLORS: Record<string, string> = {
  Apparel: R, Sportswear: BLUE, Accessories: PURPLE, Service: GOLD, Promotional: ORANGE,
};
const CATEGORIES = ["Apparel", "Sportswear", "Accessories", "Service", "Promotional"];
const GST_RATES = ["5%", "12%", "18%"];

type Product = {
  id: number; name: string; hsn: string; gstRate: string;
  category: string; moq: number; basePrice: number;
  gsm: string | null; decoration: string | null; active: boolean;
};

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const BLANK: Omit<Product, "id"> = {
  name: "", hsn: "6109", gstRate: "5%", category: "Apparel",
  moq: 20, basePrice: 0, gsm: "", decoration: "", active: true,
};

function Badge({ text, color = R }: { text: string; color?: string }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: color + "18", color }}>{text}</span>;
}

function Modal({ product, onSave, onClose, onDelete }: {
  product: Partial<Product> & { id?: number };
  onSave: (v: Partial<Product>) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState({ ...BLANK, ...product });
  const set = (k: string, v: string | number | boolean) => setForm(p => ({ ...p, [k]: v }));
  const isNew = !product.id;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: 14, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? "Add New Product" : `Edit — ${product.name}`}</div>
          <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { key: "name", label: "Product Name", full: true },
            { key: "category", label: "Category", type: "select", options: CATEGORIES },
            { key: "gstRate", label: "GST Rate", type: "select", options: GST_RATES },
            { key: "hsn", label: "HSN Code" },
            { key: "moq", label: "MOQ (pcs)", type: "number" },
            { key: "basePrice", label: "Base Price (₹)", type: "number" },
            { key: "gsm", label: "GSM / Material", full: true },
            { key: "decoration", label: "Decoration Methods", full: true },
            { key: "active", label: "Status", type: "select", options: ["true", "false"] },
          ].map((f: { key: string; label: string; type?: string; options?: string[]; full?: boolean }) => (
            <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : "auto" }}>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>{f.label}</div>
              {f.type === "select" ? (
                <select value={String(form[f.key as keyof typeof form])} onChange={e => set(f.key, f.key === "active" ? e.target.value === "true" : e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", background: WHITE }}>
                  {f.options!.map(o => <option key={o} value={o}>{f.key === "active" ? (o === "true" ? "Active" : "Inactive") : o}</option>)}
                </select>
              ) : (
                <input type={f.type === "number" ? "number" : "text"} value={String(form[f.key as keyof typeof form] ?? "")}
                  onChange={e => set(f.key, f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none" }} />
              )}
            </div>
          ))}
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
    setProducts(data.map((p: Product) => ({ ...p, basePrice: Number(p.basePrice) })));
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ marginTop: 5 }}><Badge text={p.category} color={CAT_COLORS[p.category] || MID} /></div>
              </div>
              <button onClick={() => setModal(p)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", color: MID, flexShrink: 0 }}>Edit</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, marginTop: 12 }}>
              {[["HSN", p.hsn], ["GST", p.gstRate], ["MOQ", p.moq + " pcs"], ["Base ₹", fmt(p.basePrice)], ["Material", p.gsm || "—"]].map(([l, v]) => (
                <div key={l}><span style={{ color: MID, fontSize: 10 }}>{l}</span><div style={{ fontWeight: 600 }}>{v}</div></div>
              ))}
            </div>
            {p.decoration && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}`, fontSize: 11, color: MID }}>
                <span style={{ fontWeight: 600, color: BLACK }}>Decoration: </span>{p.decoration}
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
