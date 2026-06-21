"use client";

import { useEffect, useRef, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import CustomSelect from "@/components/CustomSelect";
import { createClient } from "@/lib/supabase/client";

import { PRIMARY, SUCCESS, ERROR, GOLD, PURPLE, ORANGE, INK, MID, MUTED, BORDER, SURFACE, WHITE, R_SM, R_MD } from "@/lib/tokens";
const R = ERROR, BLUE = PRIMARY, GREEN = SUCCESS, BG = SURFACE, BLACK = INK;
const CARD_RADIUS = R_MD, BTN_RADIUS = R_SM;

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
  imagePath: string | null; active: boolean;
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
  moq: 20, basePrice: 0, gsm: "", decoration: "", description: "", variants: [], imagePath: null, active: true,
};

const INP = { width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: BTN_RADIUS, fontSize: 13, outline: "none", background: WHITE, boxSizing: "border-box" as const };
const LBL = { fontSize: 10, color: MID, marginBottom: 4, fontWeight: 600 as const, textTransform: "uppercase" as const, letterSpacing: "0.06em" };

function Badge({ text, color = R }: { text: string; color?: string }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: BTN_RADIUS, background: color + "18", color }}>{text}</span>;
}

function VariantBuilder({ variants, onChange }: { variants: VariantDef[]; onChange: (v: VariantDef[]) => void }) {
  function addVariant() { onChange([...variants, { name: "", values: [""] }]); }
  function removeVariant(i: number) { onChange(variants.filter((_, idx) => idx !== i)); }
  function setName(i: number, name: string) { onChange(variants.map((v, idx) => idx === i ? { ...v, name } : v)); }
  function addValue(i: number) { onChange(variants.map((v, idx) => idx === i ? { ...v, values: [...v.values, ""] } : v)); }
  function setValue(i: number, j: number, val: string) { onChange(variants.map((v, idx) => idx === i ? { ...v, values: v.values.map((vv, jj) => jj === j ? val : vv) } : v)); }
  function removeValue(i: number, j: number) { onChange(variants.map((v, idx) => idx === i ? { ...v, values: v.values.filter((_, jj) => jj !== j) } : v)); }

  return (
    <div>
      {variants.map((v, i) => (
        <div key={i} style={{ background: BG, borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={LBL}>Variant Name</div>
              <input value={v.name} onChange={e => setName(i, e.target.value)} placeholder="e.g. Neck Type" style={INP} />
            </div>
            <button type="button" onClick={() => removeVariant(i)}
              style={{ marginTop: 18, border: "none", background: "none", color: MID, cursor: "pointer", fontSize: 18, padding: "0 4px", flexShrink: 0 }}>✕</button>
          </div>
          <div style={LBL}>Values</div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 6 }}>
            {v.values.map((val, j) => (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 4, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "3px 6px 3px 8px" }}>
                <input value={val} onChange={e => setValue(i, j, e.target.value)} placeholder="e.g. V Neck"
                  style={{ border: "none", outline: "none", fontSize: 12, background: "transparent", width: Math.max(70, val.length * 8) }} />
                {v.values.length > 1 && (
                  <button type="button" onClick={() => removeValue(i, j)}
                    style={{ border: "none", background: "none", color: MID, cursor: "pointer", fontSize: 13, padding: "0 2px", lineHeight: 1 }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => addValue(i)}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: BTN_RADIUS, border: `1px dashed ${BLUE}`, background: WHITE, color: BLUE, cursor: "pointer", fontWeight: 600 }}>+ Value</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addVariant}
        style={{ fontSize: 12, padding: "7px 14px", borderRadius: BTN_RADIUS, border: `1px dashed ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600, width: "100%" }}>
        + Add variant dimension
      </button>
    </div>
  );
}

function ImageUploader({ currentPath, onUploaded }: { currentPath: string | null; onUploaded: (path: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentPath) { setPreview(null); return; }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/products/image-url?path=${encodeURIComponent(currentPath)}`);
      if (!cancelled && res.ok) {
        const { url } = await res.json();
        setPreview(url);
      }
    })();
    return () => { cancelled = true; };
  }, [currentPath]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("assets").upload(path, file);
      if (uploadError) throw new Error(uploadError.message);
      // Generate preview
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      onUploaded(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div style={LBL}>Product Image</div>
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${preview ? GREEN : BORDER}`, borderRadius: CARD_RADIUS,
          padding: preview ? 0 : "20px",
          textAlign: "center", cursor: "pointer", overflow: "hidden",
          background: preview ? "transparent" : BG, transition: "all 0.15s",
          minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={handleFile} />
        {preview ? (
          <img src={preview} alt="Product" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
        ) : (
          <div>
            <div style={{ fontSize: 20, marginBottom: 4 }}>🖼️</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: BLACK }}>{uploading ? "Uploading…" : "Click to upload image"}</div>
            <div style={{ fontSize: 11, color: MID, marginTop: 2 }}>JPG, PNG, WebP</div>
          </div>
        )}
      </div>
      {preview && (
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{ marginTop: 6, fontSize: 11, padding: "4px 10px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer" }}>
          Change image
        </button>
      )}
      {error && <div style={{ fontSize: 11, color: R, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function EditModal({ product, onSave, onClose, onDelete }: {
  product: Partial<Product> & { id?: number };
  onSave: (v: Partial<Product>) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<Omit<Product, "id"> & { id?: number }>({
    ...BLANK, ...product, variants: parseVariants(product.variants),
  });
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));
  const isNew = !product.id;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: WHITE, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, width: "100%", maxWidth: 600, maxHeight: "93vh", overflowY: "auto", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? "Add New Product" : `Edit — ${product.name}`}</div>
          <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: BTN_RADIUS, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <ImageUploader currentPath={form.imagePath} onUploaded={path => set("imagePath", path)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <div style={LBL}>Product Name</div>
            <input value={form.name} onChange={e => set("name", e.target.value)} style={INP} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <div style={LBL}>Description</div>
            <textarea value={form.description ?? ""} onChange={e => set("description", e.target.value)}
              placeholder="Brief description of this product…" rows={2}
              style={{ ...INP, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div>
            <div style={LBL}>Category</div>
            <CustomSelect value={form.category} onChange={v => set("category", v)}
              options={CATEGORIES.map(o => ({ value: o, label: o }))} style={{ width: "100%" }} />
          </div>
          <div>
            <div style={LBL}>GST Rate</div>
            <CustomSelect value={form.gstRate} onChange={v => set("gstRate", v)}
              options={GST_RATES.map(o => ({ value: o, label: o }))} style={{ width: "100%" }} />
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
            <CustomSelect value={String(form.active)} onChange={v => set("active", v === "true")}
              options={[{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }]} style={{ width: "100%" }} />
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

        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Product Variants</div>
          <div style={{ fontSize: 11, color: MID, marginBottom: 12 }}>Define variant dimensions tracked in analytics (not shown on invoice).</div>
          <VariantBuilder variants={form.variants ?? []} onChange={v => set("variants", v)} />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "space-between" }}>
          <div>
            {onDelete && (
              <button onClick={onDelete} style={{ fontSize: 12, padding: "9px 16px", borderRadius: BTN_RADIUS, border: `1px solid ${R}`, background: WHITE, color: R, cursor: "pointer", fontWeight: 600 }}>Delete product</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ fontSize: 12, padding: "9px 16px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button onClick={() => { onSave(form); onClose(); }} style={{ fontSize: 12, padding: "9px 20px", borderRadius: BTN_RADIUS, background: BLUE, color: WHITE, border: "none", cursor: "pointer", fontWeight: 700 }}>
              {isNew ? "Add product" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailPopup({ product, onEdit, onClose }: { product: Product; onEdit: () => void; onClose: () => void }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const catColor = CAT_COLORS[product.category] || MID;

  useEffect(() => {
    if (!product.imagePath) return;
    fetch(`/api/products/image-url?path=${encodeURIComponent(product.imagePath)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.url && setImgUrl(d.url));
  }, [product.imagePath]);

  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: WHITE, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, width: "100%", maxWidth: 560, maxHeight: "93vh", overflowY: "auto" }}>
        {/* Image header */}
        {imgUrl ? (
          <div style={{ width: "100%", height: 220, overflow: "hidden", borderRadius: `${CARD_RADIUS}px ${CARD_RADIUS}px 0 0`, position: "relative" }}>
            <img src={imgUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5))" }} />
          </div>
        ) : (
          <div style={{ height: 10, background: catColor, borderRadius: `${CARD_RADIUS}px ${CARD_RADIUS}px 0 0` }} />
        )}

        <div style={{ padding: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, marginBottom: 6 }}>{product.name}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge text={product.category} color={catColor} />
                {!product.active && <Badge text="Inactive" color={MID} />}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
              <button onClick={onEdit} style={{ fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: BTN_RADIUS, background: BLUE, color: WHITE, border: "none", cursor: "pointer" }}>Edit</button>
              <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: BTN_RADIUS, padding: "7px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕</button>
            </div>
          </div>

          {product.description && (
            <div style={{ fontSize: 13, color: MID, lineHeight: 1.6, marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${BORDER}` }}>
              {product.description}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
            {[
              ["Base Price", fmt(product.basePrice)],
              ["GST Rate", product.gstRate],
              ["MOQ", product.moq + " pcs"],
              ["HSN Code", product.hsn],
              ["Material", product.gsm || "—"],
              ["Decoration", product.decoration || "—"],
            ].map(([l, v]) => (
              <div key={l} style={{ background: BG, borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: MID, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>

          {product.variants && product.variants.length > 0 && (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Variants</div>
              {product.variants.map((v, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: BLACK, marginBottom: 6 }}>{v.name}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {v.values.filter(Boolean).map((val, j) => (
                      <span key={j} style={{ fontSize: 11, padding: "3px 10px", borderRadius: BTN_RADIUS, background: BLUE + "12", color: BLUE, fontWeight: 600 }}>{val}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductRow({ product, onClick }: { product: Product; onClick: () => void }) {
  const catColor = CAT_COLORS[product.category] || MID;
  const variantCount = product.variants?.length ?? 0;
  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "48px 1fr 80px 56px 80px 88px",
        alignItems: "center",
        gap: 0,
        padding: "0 20px 0 12px",
        borderBottom: `1px solid ${BORDER}`,
        cursor: "pointer",
        background: "transparent",
        transition: "background 100ms ease",
        minHeight: 60,
        opacity: product.active ? 1 : 0.5,
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(79,70,229,0.04)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
    >
      {/* Category icon circle */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `linear-gradient(135deg, ${catColor}28, ${catColor}14)`,
        border: `1.5px solid ${catColor}30`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: 3, background: catColor }} />
      </div>
      {/* Name + meta */}
      <div style={{ paddingLeft: 12, paddingRight: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK, letterSpacing: "-0.01em", lineHeight: 1.3 }}>{product.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "1.5px 7px", borderRadius: 5, background: catColor + "18", color: catColor }}>{product.category}</span>
          {product.decoration && <span style={{ fontSize: 10, color: MID }}>{product.decoration}</span>}
          {variantCount > 0 && <span style={{ fontSize: 10, color: MID }}>· {variantCount} variant{variantCount > 1 ? "s" : ""}</span>}
        </div>
      </div>
      {/* HSN */}
      <div style={{ textAlign: "right", paddingRight: 16 }}>
        <div style={{ fontSize: 10, color: MUTED, marginBottom: 1 }}>HSN</div>
        <div style={{ fontSize: 12, color: MID, fontWeight: 500 }}>{product.hsn || "—"}</div>
      </div>
      {/* GST */}
      <div style={{ textAlign: "right", paddingRight: 16 }}>
        <div style={{ fontSize: 10, color: MUTED, marginBottom: 1 }}>GST</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: MID }}>{product.gstRate}</div>
      </div>
      {/* MOQ */}
      <div style={{ textAlign: "right", paddingRight: 16 }}>
        <div style={{ fontSize: 10, color: MUTED, marginBottom: 1 }}>MOQ</div>
        <div style={{ fontSize: 12, color: MID, fontWeight: 500 }}>{product.moq} pcs</div>
      </div>
      {/* Price + status */}
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: INK, letterSpacing: "-0.02em" }}>{fmt(product.basePrice)}</div>
        <div style={{
          display: "inline-block", marginTop: 3,
          fontSize: 9, fontWeight: 700, padding: "1.5px 7px", borderRadius: 20,
          background: product.active ? GREEN + "18" : MID + "15",
          color: product.active ? GREEN : MID,
          letterSpacing: "0.04em", textTransform: "uppercase" as const,
        }}>
          {product.active ? "Active" : "Inactive"}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Product | null>(null);
  const [editModal, setEditModal] = useState<Partial<Product> | null>(null);

  async function load() {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data.map((p: Product) => ({
      ...p, basePrice: Number(p.basePrice), variants: parseVariants(p.variants),
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
    setDetail(null);
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setEditModal(null);
    setDetail(null);
    await load();
  }

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ padding: "26px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK }}>Products</div>
          <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>{products.length} products in catalog · click any card to view details</div>
        </div>
        <button onClick={() => setEditModal({})} style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: BTN_RADIUS, background: BLUE, color: WHITE, border: "none", cursor: "pointer" }}>
          + Add product
        </button>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid", gridTemplateColumns: "48px 1fr 80px 56px 80px 88px",
        alignItems: "center", gap: 0, padding: "0 20px 0 12px",
        background: "rgba(255,255,255,0.4)", borderRadius: `${CARD_RADIUS}px ${CARD_RADIUS}px 0 0`,
        borderBottom: `1px solid ${BORDER}`, minHeight: 36,
      }}>
        <div />
        <div style={{ fontSize: 10, fontWeight: 700, color: MID, letterSpacing: "0.07em", textTransform: "uppercase", paddingLeft: 12 }}>Product</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: MID, letterSpacing: "0.07em", textTransform: "uppercase", textAlign: "right", paddingRight: 16 }}>HSN</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: MID, letterSpacing: "0.07em", textTransform: "uppercase", textAlign: "right", paddingRight: 16 }}>GST</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: MID, letterSpacing: "0.07em", textTransform: "uppercase", textAlign: "right", paddingRight: 16 }}>MOQ</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: MID, letterSpacing: "0.07em", textTransform: "uppercase", textAlign: "right" }}>Price / Status</div>
      </div>

      <div style={{
        background: "rgba(255,255,255,0.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        border: `1px solid rgba(255,255,255,0.85)`, borderTop: "none",
        borderRadius: `0 0 ${CARD_RADIUS}px ${CARD_RADIUS}px`,
        boxShadow: "0 0 0 0.5px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}>
        {products.map(p => (
          <ProductRow key={p.id} product={p} onClick={() => setDetail(p)} />
        ))}
        {products.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: MID, fontSize: 13 }}>No products yet.</div>
        )}
      </div>

      {detail && !editModal && (
        <DetailPopup
          product={detail}
          onEdit={() => setEditModal(detail)}
          onClose={() => setDetail(null)}
        />
      )}

      {editModal !== null && (
        <EditModal
          product={editModal}
          onSave={handleSave}
          onClose={() => setEditModal(null)}
          onDelete={editModal.id ? () => handleDelete(editModal.id!) : undefined}
        />
      )}
    </div>
  );
}



