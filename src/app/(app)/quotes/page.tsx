"use client";

import { useEffect, useState } from "react";

const R = "#EE3C30", BLUE = "#2266A1", GOLD = "#D4B800", PURPLE = "#7B4FBF", ORANGE = "#E67E22";
const MID = "#888", BORDER = "#E8E7E3", BG = "#F7F6F2", WHITE = "#FFFFFF", BLACK = "#111111";
const GREEN = "#1A7A4A";

type Client = { id: number; name: string; gstin: string | null; address: string | null; city: string | null; email: string | null; phone: string | null; segment: string };
type Product = { id: number; name: string; gstRate: string; basePrice: number; hsn: string; category: string; active: boolean };
type SavedProforma = { id: number; ref: string; date: string; clientName: string; createdAt: string };

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const fmtDec = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function marginColor(m: number) { return m > 0.25 ? GREEN : m >= 0.15 ? MID : R; }

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
type PerPcMap = Record<string, boolean>;
const BLANK_COSTS: Costs = { fabric: 0, printing: 0, jobWork: 0, packaging: 0, transport: 0, design: 0, misc: 0 };
const BLANK_PER_PC: PerPcMap = { fabric: false, printing: false, jobWork: false, packaging: false, transport: false, design: false, misc: false };

type LineItem = { productId: number | ""; qty: number; unitPrice: number };
const BLANK_LINE: LineItem = { productId: "", qty: 0, unitPrice: 0 };

export default function QuotesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId, setClientId] = useState<number | "">("");
  const [clientSearch, setClientSearch] = useState("");
  const [showClientList, setShowClientList] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([{ ...BLANK_LINE }]);
  const [costs, setCosts] = useState<Costs>({ ...BLANK_COSTS });
  const [perPc, setPerPc] = useState<PerPcMap>({ ...BLANK_PER_PC });
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [savedProformas, setSavedProformas] = useState<SavedProforma[]>([]);
  const [generating, setGenerating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then(setClients);
    fetch("/api/products").then(r => r.json()).then((data: Product[]) =>
      setProducts(data.filter(p => p.active !== false))
    );
    loadProformas();
  }, []);

  async function loadProformas() {
    try {
      const res = await fetch("/api/proformas");
      if (res.ok) setSavedProformas(await res.json());
    } catch { /* silent */ }
  }

  const selectedClient = clients.find(c => c.id === clientId) ?? null;
  const filteredClients = clientSearch
    ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients;

  function selectClient(c: Client) {
    setClientId(c.id);
    setClientSearch(c.name);
    setShowClientList(false);
  }

  const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0);
  const setLine = (i: number, patch: Partial<LineItem>) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  function handleProductSelect(i: number, id: number | "") {
    const p = products.find(x => x.id === id);
    setLine(i, { productId: id, unitPrice: p ? p.basePrice : 0 });
  }

  function addLine() { setLines(prev => [...prev, { ...BLANK_LINE }]); }
  function removeLine(i: number) { setLines(prev => prev.filter((_, idx) => idx !== i)); }

  const lineSubtotals = lines.map(l => (l.qty || 0) * (l.unitPrice || 0));
  const totalSaleValue = lineSubtotals.reduce((s, v) => s + v, 0);

  const lineGst = lines.map((l, i) => {
    const p = products.find(x => x.id === l.productId);
    const rate = p ? parseFloat(p.gstRate) / 100 : 0.05;
    return lineSubtotals[i] * rate;
  });
  const totalGst = lineGst.reduce((s, v) => s + v, 0);

  const resolvedCosts = (key: string) => perPc[key] ? (costs[key] || 0) * totalQty : (costs[key] || 0);
  const totalCost = COST_LINES.reduce((s, l) => s + resolvedCosts(l.key), 0);
  const grossProfit = totalSaleValue - totalCost;
  const marginPct = totalSaleValue > 0 ? grossProfit / totalSaleValue : 0;
  const mc = marginColor(marginPct);

  function reset() {
    setClientId(""); setClientSearch(""); setLines([{ ...BLANK_LINE }]);
    setCosts({ ...BLANK_COSTS }); setPerPc({ ...BLANK_PER_PC });
    setQuoteDate(new Date().toISOString().slice(0, 10));
  }

  async function generateProforma() {
    if (!selectedClient || totalSaleValue === 0) return;
    setGenerating(true);
    try {
      const proformaItems = lines
        .filter(l => l.productId && l.qty > 0)
        .map(l => {
          const p = products.find(x => x.id === l.productId);
          return { product: p?.name ?? "Product", hsn: p?.hsn ?? "", qty: l.qty, unitPrice: l.unitPrice, gstPct: p ? parseFloat(p.gstRate) : 5 };
        });

      const yr = new Date().getFullYear();
      const proformaRef = `PF/${String(yr).slice(-2)}-${String(yr + 1).slice(-2)}/${String(savedProformas.length + 1).padStart(3, "0")}`;

      const proformaData = {
        ref: proformaRef,
        date: quoteDate,
        items: proformaItems,
        totalSaleValue,
        totalGst,
        client: {
          name: selectedClient.name,
          gstin: selectedClient.gstin,
          address: selectedClient.address,
          city: selectedClient.city,
          email: selectedClient.email,
          phone: selectedClient.phone,
        },
      };

      const res = await fetch("/api/proformas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: proformaRef, date: quoteDate, clientId: selectedClient.id, clientName: selectedClient.name, data: proformaData }),
      });

      if (!res.ok) throw new Error("Failed to save");
      const saved = await res.json();

      sessionStorage.setItem("printribe_proforma", JSON.stringify(proformaData));
      await loadProformas();
      window.open(`/proforma/view?id=${saved.id}`, "_blank");
    } catch (e) {
      console.error("Proforma generation failed:", e);
      alert("Failed to save proforma. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function viewProforma(id: number) {
    const res = await fetch(`/api/proformas/${id}`);
    if (!res.ok) return;
    const p = await res.json();
    sessionStorage.setItem("printribe_proforma", JSON.stringify(p.data));
    window.open(`/proforma/view?id=${id}`, "_blank");
  }

  async function editProforma(p: SavedProforma) {
    const res = await fetch(`/api/proformas/${p.id}`);
    if (!res.ok) return;
    const full = await res.json();
    const data = full.data as { items: { productId?: number; qty: number; unitPrice: number; gstPct: number; product: string }[]; client: { name: string } };
    // Restore state from saved proforma
    const matchedClient = clients.find(c => c.name === data.client.name);
    if (matchedClient) { setClientId(matchedClient.id); setClientSearch(matchedClient.name); }
    setQuoteDate(full.date);
    setLines(data.items.map(item => {
      const prod = products.find(x => x.name === item.product);
      return { productId: prod?.id ?? "", qty: item.qty, unitPrice: item.unitPrice };
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteProforma(id: number) {
    await fetch(`/api/proformas/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    setSavedProformas(prev => prev.filter(p => p.id !== id));
  }

  const activeCosts = COST_LINES.filter(l => resolvedCosts(l.key) > 0);
  const INP: React.CSSProperties = { width: "100%", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, outline: "none", background: WHITE, boxSizing: "border-box" };
  const LBL: React.CSSProperties = { fontSize: 11, color: MID, marginBottom: 4, fontWeight: 600, display: "block" };

  return (
    <div style={{ padding: "26px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK }}>Quote / Proforma Estimator</div>
          <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>Build a proforma and estimate margins before confirming an order</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={reset} style={{ fontSize: 12, padding: "7px 14px", borderRadius: 7, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>
            Reset
          </button>
          <button
            disabled={!selectedClient || totalSaleValue === 0 || generating}
            onClick={generateProforma}
            style={{ fontSize: 12, padding: "7px 16px", borderRadius: 7, border: "none", background: (!selectedClient || totalSaleValue === 0) ? BORDER : R, color: WHITE, cursor: (!selectedClient || totalSaleValue === 0) ? "default" : "pointer", fontWeight: 700 }}>
            {generating ? "Saving…" : "Generate Proforma →"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Client */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14 }}>Client</div>
            <div style={{ position: "relative" }}>
              <label style={LBL}>SELECT CLIENT</label>
              <input
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setClientId(""); setShowClientList(true); }}
                onFocus={() => setShowClientList(true)}
                onBlur={() => setTimeout(() => setShowClientList(false), 150)}
                placeholder="Search client name…"
                style={INP}
              />
              {showClientList && filteredClients.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, zIndex: 50, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", marginTop: 2 }}>
                  {filteredClients.slice(0, 20).map(c => (
                    <div key={c.id} onMouseDown={() => selectClient(c)}
                      style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${BORDER}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = BG)}
                      onMouseLeave={e => (e.currentTarget.style.background = WHITE)}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      {c.city && <span style={{ color: MID, fontSize: 11, marginLeft: 8 }}>{c.city}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedClient && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: BG, borderRadius: 8, fontSize: 12, display: "flex", flexWrap: "wrap", gap: "4px 20px" }}>
                {selectedClient.gstin && <span><span style={{ color: MID }}>GSTIN: </span><strong>{selectedClient.gstin}</strong></span>}
                {selectedClient.city && <span><span style={{ color: MID }}>City: </span><strong>{selectedClient.city}</strong></span>}
                {selectedClient.phone && <span><span style={{ color: MID }}>Phone: </span><strong>{selectedClient.phone}</strong></span>}
                {selectedClient.email && <span><span style={{ color: MID }}>Email: </span><strong>{selectedClient.email}</strong></span>}
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <label style={LBL}>DATE</label>
              <input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} style={{ ...INP, width: "50%" }} />
            </div>
          </div>

          {/* Product lines */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14 }}>Product lines</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {lines.map((line, i) => {
                const p = products.find(x => x.id === line.productId);
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 80px 100px 28px", gap: 8, alignItems: "end" }}>
                    <div>
                      {i === 0 && <label style={LBL}>PRODUCT</label>}
                      <select value={line.productId} onChange={e => handleProductSelect(i, e.target.value ? Number(e.target.value) : "")}
                        style={{ ...INP }}>
                        <option value="">— Select —</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      {p && <div style={{ fontSize: 10, color: MID, marginTop: 2 }}>HSN {p.hsn} · GST {p.gstRate}</div>}
                    </div>
                    <div>
                      {i === 0 && <label style={LBL}>QTY</label>}
                      <input type="number" value={line.qty || ""} onChange={e => setLine(i, { qty: parseInt(e.target.value) || 0 })}
                        placeholder="0" style={INP} />
                    </div>
                    <div>
                      {i === 0 && <label style={LBL}>RATE / PC</label>}
                      <div style={{ display: "flex", alignItems: "center", border: `1px solid ${BORDER}`, borderRadius: 7, overflow: "hidden" }}>
                        <span style={{ padding: "8px 8px", background: BG, fontSize: 11, color: MID, borderRight: `1px solid ${BORDER}` }}>₹</span>
                        <input type="number" value={line.unitPrice || ""} onChange={e => setLine(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                          placeholder="0" style={{ flex: 1, padding: "8px 8px", border: "none", fontSize: 13, outline: "none", background: WHITE, width: 0 }} />
                      </div>
                    </div>
                    <button onClick={() => removeLine(i)} disabled={lines.length === 1}
                      style={{ padding: "7px 8px", border: `1px solid ${BORDER}`, borderRadius: 7, background: WHITE, color: MID, cursor: lines.length === 1 ? "default" : "pointer", fontSize: 14, opacity: lines.length === 1 ? 0.3 : 1 }}>
                      ×
                    </button>
                  </div>
                );
              })}
              <button onClick={addLine}
                style={{ alignSelf: "flex-start", fontSize: 12, padding: "6px 14px", borderRadius: 7, border: `1px dashed ${BORDER}`, background: WHITE, color: BLUE, cursor: "pointer", fontWeight: 600 }}>
                + Add line
              </button>
            </div>
          </div>

          {/* Cost lines */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Cost lines <span style={{ color: MID, fontWeight: 400 }}>(internal — not shown on proforma)</span></div>
            <div style={{ fontSize: 11, color: MID, marginBottom: 14 }}>Toggle each line between total order cost or per-piece cost</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {COST_LINES.map(l => (
                <div key={l.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 11, color: MID, fontWeight: 600 }}>{l.label.toUpperCase()}</div>
                    <button onClick={() => setPerPc(p => ({ ...p, [l.key]: !p[l.key] }))}
                      style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, cursor: "pointer", border: "none", background: perPc[l.key] ? BLUE + "18" : BG, color: perPc[l.key] ? BLUE : MID }}>
                      {perPc[l.key] ? "per pc" : "total"}
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", border: `1px solid ${BORDER}`, borderRadius: 7, overflow: "hidden" }}>
                    <span style={{ padding: "8px 10px", background: BG, fontSize: 12, color: MID, borderRight: `1px solid ${BORDER}` }}>₹</span>
                    <input type="number" value={costs[l.key] || ""} onChange={e => setCosts(p => ({ ...p, [l.key]: parseFloat(e.target.value) || 0 }))}
                      placeholder="0" style={{ flex: 1, padding: "8px 10px", border: "none", fontSize: 13, outline: "none", background: WHITE }} />
                  </div>
                  {perPc[l.key] && totalQty > 0 && costs[l.key] > 0 && (
                    <div style={{ fontSize: 10, color: BLUE, marginTop: 3 }}>= {fmt(resolvedCosts(l.key))} total ({totalQty} pcs)</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — live result */}
        <div style={{ position: "sticky", top: 24 }}>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: R, marginBottom: 12 }}>Live estimate</div>

            <div style={{ textAlign: "center", marginBottom: 20, padding: "20px 0", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 42, fontWeight: 700, color: mc, letterSpacing: "-0.02em" }}>
                {totalSaleValue > 0 ? (marginPct * 100).toFixed(1) + "%" : "—"}
              </div>
              <div style={{ fontSize: 12, color: MID, marginTop: 4 }}>Gross margin</div>
              {totalSaleValue > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, padding: "4px 14px", borderRadius: 20, display: "inline-block", background: mc + "15", color: mc }}>
                  {marginPct > 0.25 ? "Healthy margin" : marginPct >= 0.15 ? "Acceptable — watch costs" : "Below target — review pricing"}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                ["Sale value", totalSaleValue > 0 ? fmt(totalSaleValue) : "—", "excl. GST"],
                ["GST", totalSaleValue > 0 ? fmt(totalGst) : "—", "collected"],
                ["Total cost", totalCost > 0 ? fmt(totalCost) : "—", "all-in"],
                ["Gross profit", totalSaleValue > 0 ? fmt(grossProfit) : "—", grossProfit >= 0 ? "profit" : "loss"],
              ].map(([l, v, s]) => (
                <div key={l} style={{ background: BG, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: MID, fontWeight: 600, marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: l === "Gross profit" ? mc : BLACK }}>{v}</div>
                  <div style={{ fontSize: 10, color: MID }}>{s}</div>
                </div>
              ))}
            </div>

            {totalQty > 0 && totalSaleValue > 0 && (
              <div style={{ background: BG, borderRadius: 8, padding: "12px 14px", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                <div><span style={{ color: MID }}>Total qty: </span><strong>{totalQty.toLocaleString()} pcs</strong></div>
                <div><span style={{ color: MID }}>Total invoice: </span><strong>{fmt(totalSaleValue + totalGst)}</strong></div>
                <div><span style={{ color: MID }}>Avg cost/pc: </span><strong>{totalQty > 0 ? fmtDec(totalCost / totalQty) : "—"}</strong></div>
                <div><span style={{ color: MID }}>Avg sale/pc: </span><strong>{totalQty > 0 ? fmtDec(totalSaleValue / totalQty) : "—"}</strong></div>
              </div>
            )}

            {lines.some(l => l.productId && l.qty > 0) && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Line summary</div>
                {lines.filter(l => l.productId && l.qty > 0).map((l, i) => {
                  const p = products.find(x => x.id === l.productId);
                  const sub = (l.qty || 0) * (l.unitPrice || 0);
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${BORDER}` }}>
                      <span>{p?.name ?? "—"} × {l.qty}</span>
                      <span style={{ fontWeight: 600 }}>{fmt(sub)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {activeCosts.length > 0 && totalCost > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Cost breakdown</div>
                {activeCosts.map(l => (
                  <div key={l.key} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
                      <span>{l.label}</span>
                      <span style={{ fontWeight: 600 }}>{fmt(resolvedCosts(l.key))} <span style={{ color: MID, fontWeight: 400 }}>({((resolvedCosts(l.key) / totalCost) * 100).toFixed(0)}%)</span></span>
                    </div>
                    <div style={{ height: 5, background: BG, borderRadius: 3 }}>
                      <div style={{ width: `${(resolvedCosts(l.key) / totalCost) * 100}%`, height: "100%", background: l.color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalSaleValue === 0 && (
              <div style={{ textAlign: "center", color: MID, fontSize: 12, padding: "12px 0" }}>
                Select a client, add products and quantities to see your estimate
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Saved Proformas list ── */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: BLACK, marginBottom: 14 }}>
          Saved Proformas <span style={{ fontSize: 12, fontWeight: 400, color: MID }}>({savedProformas.length})</span>
        </div>

        {savedProformas.length === 0 ? (
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "28px 0", textAlign: "center", color: MID, fontSize: 13 }}>
            No proformas generated yet
          </div>
        ) : (
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 140px 160px", gap: 16, padding: "10px 20px", background: BG, borderBottom: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: MID, letterSpacing: "0.05em" }}>
              <div>REF</div>
              <div>CLIENT</div>
              <div>DATE</div>
              <div style={{ textAlign: "right" }}>ACTIONS</div>
            </div>
            {savedProformas.map(p => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "140px 1fr 140px 160px", gap: 16, padding: "13px 20px", borderBottom: `1px solid ${BORDER}`, alignItems: "center", fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: BLUE, fontFamily: "monospace", fontSize: 12 }}>{p.ref}</div>
                <div style={{ fontWeight: 500 }}>{p.clientName}</div>
                <div style={{ color: MID, fontSize: 12 }}>{new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button onClick={() => viewProforma(p.id)}
                    style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, color: BLUE, cursor: "pointer", fontWeight: 600 }}>
                    View
                  </button>
                  <button onClick={() => editProforma(p)}
                    style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, color: BLACK, cursor: "pointer", fontWeight: 600 }}>
                    Edit
                  </button>
                  {deleteConfirm === p.id ? (
                    <>
                      <button onClick={() => deleteProforma(p.id)}
                        style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "none", background: R, color: WHITE, cursor: "pointer", fontWeight: 700 }}>
                        Confirm
                      </button>
                      <button onClick={() => setDeleteConfirm(null)}
                        style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer" }}>
                        ✕
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteConfirm(p.id)}
                      style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, color: R, cursor: "pointer", fontWeight: 600 }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm overlay backdrop */}
      {deleteConfirm !== null && (
        <div onClick={() => setDeleteConfirm(null)}
          style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      )}
    </div>
  );
}
