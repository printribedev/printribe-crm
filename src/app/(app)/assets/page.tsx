"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const R = "#EE3C30", BLUE = "#2266A1", GOLD = "#D4B800", PURPLE = "#7B4FBF", ORANGE = "#E67E22";
const MID = "#888", BORDER = "#E8E7E3", BG = "#F7F6F2", WHITE = "#FFFFFF", BLACK = "#111111";
const GREEN = "#1A7A4A";

const ASSET_TYPES = ["Size_Chart", "Catalog", "Brand_File", "Mockup", "Other"];
const ASSET_TYPE_LABELS: Record<string, string> = { Size_Chart: "Size Chart", Catalog: "Catalog", Brand_File: "Brand File", Mockup: "Mockup", Other: "Other" };
const CLIENT_TYPES = ["All", "Sports", "Corporate", "Education", "Internal"];
const FORMATS = ["PDF", "PNG", "JPG", "ZIP", "PSD", "SVG", "AI", "Other"];

const TYPE_COLORS: Record<string, string> = { Size_Chart: BLUE, Catalog: R, Brand_File: PURPLE, Mockup: ORANGE, Other: MID };
const FORMAT_COLORS: Record<string, string> = { PDF: R, PNG: BLUE, JPG: BLUE, ZIP: GOLD, PSD: PURPLE, SVG: GREEN, AI: ORANGE, Other: MID };

type Asset = {
  id: number; name: string; description: string | null;
  type: string; clientType: string; format: string;
  storagePath: string | null; updatedAt: string; createdAt: string;
};

const BLANK = { name: "", description: "", type: "Catalog", clientType: "All", format: "PDF" };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function FormatBadge({ format }: { format: string }) {
  const color = FORMAT_COLORS[format] || MID;
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: color + "18", color, letterSpacing: "0.05em" }}>{format}</span>;
}
function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] || MID;
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: color + "18", color }}>{ASSET_TYPE_LABELS[type] || type}</span>;
}

function UploadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ ...BLANK });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    // Auto-detect format from extension
    const ext = f.name.split(".").pop()?.toUpperCase() || "Other";
    const fmt = FORMATS.includes(ext) ? ext : "Other";
    set("format", fmt);
    if (!form.name) set("name", f.name.replace(/\.[^.]+$/, ""));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!file) { setError("Please select a file to upload."); return; }
    setUploading(true);
    setError("");

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("assets").upload(path, file);
      if (uploadError) throw new Error(uploadError.message);

      await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, storagePath: path }),
      });

      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: 14, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Add New Asset</div>
          <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
        </div>

        {/* File drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${file ? GREEN : BORDER}`, borderRadius: 10, padding: "24px 20px",
            textAlign: "center", cursor: "pointer", marginBottom: 18,
            background: file ? GREEN + "08" : BG,
            transition: "all 0.15s",
          }}
        >
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.zip,.psd,.svg,.ai" style={{ display: "none" }} onChange={handleFileChange} />
          {file ? (
            <div>
              <div style={{ fontSize: 22, marginBottom: 6 }}>📄</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: BLACK }}>{file.name}</div>
              <div style={{ fontSize: 11, color: MID, marginTop: 2 }}>{(file.size / 1024).toFixed(0)} KB · click to change</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 22, marginBottom: 6 }}>☁️</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: BLACK }}>Click to choose a file</div>
              <div style={{ fontSize: 11, color: MID, marginTop: 2 }}>PDF, PNG, JPG, ZIP, PSD, SVG, AI</div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>ASSET NAME</div>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. T-shirt Size Chart"
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none" }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>DESCRIPTION</div>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="What is this file for?"
              rows={2}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
          </div>
          {[
            { key: "type", label: "TYPE", options: ASSET_TYPES, labels: ASSET_TYPE_LABELS },
            { key: "clientType", label: "AUDIENCE", options: CLIENT_TYPES, labels: null },
            { key: "format", label: "FORMAT", options: FORMATS, labels: null },
          ].map(f => (
            <div key={f.key}>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>{f.label}</div>
              <select value={(form as Record<string, string>)[f.key]} onChange={e => set(f.key, e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", background: WHITE }}>
                {f.options.map(o => <option key={o} value={o}>{f.labels ? f.labels[o] || o : o}</option>)}
              </select>
            </div>
          ))}
        </div>

        {error && <div style={{ marginTop: 12, fontSize: 12, color: R, background: R + "10", padding: "8px 12px", borderRadius: 7 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ fontSize: 12, padding: "9px 16px", borderRadius: 7, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
          <button onClick={handleSave} disabled={uploading}
            style={{ fontSize: 12, padding: "9px 20px", borderRadius: 7, background: uploading ? MID : R, color: WHITE, border: "none", cursor: uploading ? "not-allowed" : "pointer", fontWeight: 700 }}>
            {uploading ? "Uploading…" : "Upload & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ asset, onClose, onSaved }: { asset: Asset; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: asset.name, description: asset.description || "", type: asset.type, clientType: asset.clientType, format: asset.format });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    await fetch(`/api/assets/${asset.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    onSaved(); onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: 14, width: "100%", maxWidth: 480, padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Edit Asset</div>
          <button onClick={onClose} style={{ background: BG, border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: MID }}>✕ Close</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>ASSET NAME</div>
            <input value={form.name} onChange={e => set("name", e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none" }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>DESCRIPTION</div>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
          </div>
          {[
            { key: "type", label: "TYPE", options: ASSET_TYPES, labels: ASSET_TYPE_LABELS },
            { key: "clientType", label: "AUDIENCE", options: CLIENT_TYPES, labels: null as Record<string, string> | null },
            { key: "format", label: "FORMAT", options: FORMATS, labels: null as Record<string, string> | null },
          ].map(f => (
            <div key={f.key}>
              <div style={{ fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600 }}>{f.label}</div>
              <select value={(form as Record<string, string>)[f.key]} onChange={e => set(f.key, e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", background: WHITE }}>
                {f.options.map(o => <option key={o} value={o}>{f.labels ? f.labels[o] || o : o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ fontSize: 12, padding: "9px 16px", borderRadius: 7, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
          <button onClick={handleSave} style={{ fontSize: 12, padding: "9px 20px", borderRadius: 7, background: R, color: WHITE, border: "none", cursor: "pointer", fontWeight: 700 }}>Save changes</button>
        </div>
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterAudience, setFilterAudience] = useState("All");
  const [downloading, setDownloading] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/assets");
    setAssets(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(asset: Asset) {
    if (!confirm(`Delete "${asset.name}"? This cannot be undone.`)) return;
    await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
    setEditAsset(null);
    await load();
  }

  async function handleDownload(asset: Asset) {
    if (!asset.storagePath) return;
    setDownloading(asset.id);
    try {
      const res = await fetch(`/api/assets/${asset.id}/download`);
      const { url } = await res.json();
      window.open(url, "_blank");
    } finally {
      setDownloading(null);
    }
  }

  const filtered = assets.filter(a => {
    const matchSearch = [a.name, a.description || ""].some(f => f.toLowerCase().includes(search.toLowerCase()));
    const matchType = filterType === "All" || a.type === filterType;
    const matchAudience = filterAudience === "All" || a.clientType === filterAudience;
    return matchSearch && matchType && matchAudience;
  });

  if (loading) return <div style={{ padding: "26px 28px", color: MID, fontSize: 13 }}>Loading assets…</div>;

  return (
    <div style={{ padding: "26px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK }}>Asset Library</div>
          <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>{assets.length} files · size charts, catalogs, brand files</div>
        </div>
        <button onClick={() => setShowUpload(true)} style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 7, background: R, color: WHITE, border: "none", cursor: "pointer" }}>
          + Add asset
        </button>
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets…"
          style={{ flex: 1, minWidth: 200, padding: "9px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, outline: "none" }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12, outline: "none", background: WHITE, color: filterType !== "All" ? BLACK : MID }}>
          <option value="All">All types</option>
          {ASSET_TYPES.map(t => <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>)}
        </select>
        <select value={filterAudience} onChange={e => setFilterAudience(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12, outline: "none", background: WHITE, color: filterAudience !== "All" ? BLACK : MID }}>
          <option value="All">All audiences</option>
          {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Asset grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {filtered.map(a => (
          <div key={a.id} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 18, display: "flex", flexDirection: "column", gap: 10, borderTop: `3px solid ${TYPE_COLORS[a.type] || MID}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, paddingRight: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: BLACK }}>{a.name}</div>
                {a.description && <div style={{ fontSize: 11, color: MID, marginTop: 4, lineHeight: 1.4 }}>{a.description}</div>}
              </div>
              <FormatBadge format={a.format} />
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <TypeBadge type={a.type} />
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: BG, color: MID }}>{a.clientType}</span>
            </div>

            <div style={{ fontSize: 10, color: MID }}>Updated {formatDate(a.updatedAt)}</div>

            <div style={{ display: "flex", gap: 7, marginTop: 2 }}>
              {a.storagePath && (
                <button onClick={() => handleDownload(a)} disabled={downloading === a.id}
                  style={{ flex: 1, fontSize: 11, fontWeight: 600, padding: "7px 0", borderRadius: 7, background: downloading === a.id ? BG : BLACK, color: downloading === a.id ? MID : WHITE, border: "none", cursor: downloading === a.id ? "not-allowed" : "pointer" }}>
                  {downloading === a.id ? "Opening…" : "↓ Download"}
                </button>
              )}
              <button onClick={() => setEditAsset(a)}
                style={{ fontSize: 11, fontWeight: 600, padding: "7px 14px", borderRadius: 7, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer" }}>
                Edit
              </button>
              <button onClick={() => handleDelete(a)}
                style={{ fontSize: 11, fontWeight: 600, padding: "7px 10px", borderRadius: 7, border: `1px solid ${BORDER}`, background: WHITE, color: R, cursor: "pointer" }}>
                ✕
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 40, textAlign: "center", color: MID, fontSize: 13 }}>
            {search || filterType !== "All" || filterAudience !== "All" ? "No assets match your filters." : "No assets yet — click '+ Add asset' to upload your first file."}
          </div>
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSaved={load} />}
      {editAsset && <EditModal asset={editAsset} onClose={() => setEditAsset(null)} onSaved={load} />}
    </div>
  );
}
