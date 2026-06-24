"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type InvoiceData = {
  id: string;
  date: string;
  client: { name: string; gstin: string | null; address: string | null; city: string | null; email: string | null; phone: string | null };
  items: { product: string; hsn: string; qty: number; saleValue: number; gst: number }[];
  totalSaleValue: number;
  totalGst: number;
};

export default function InvoicePage() {
  return <Suspense fallback={<div style={{ padding: 40, color: "#666" }}>Loading…</div>}><InvoiceContent /></Suspense>;
}

function InvoiceContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError]     = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/invoices/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => d.error ? setError(d.error) : setInvoice(d))
      .catch(() => setError("Failed to load invoice"));
  }, [id]);

  async function downloadPdf() {
    if (!printRef.current) return;
    const html2pdf = (await import("html2pdf.js")).default;
    html2pdf()
      .set({
        margin: 10,
        filename: `Invoice-${invoice?.id?.replace(/\//g, "-")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(printRef.current)
      .save();
  }

  if (!id)       return <div style={{ padding: 40, color: "#666" }}>No invoice ID provided.</div>;
  if (error)     return <div style={{ padding: 40, color: "#dc2626" }}>{error}</div>;
  if (!invoice)  return <div style={{ padding: 40, color: "#666" }}>Loading invoice…</div>;

  const subtotal = invoice.totalSaleValue;
  const gst      = invoice.totalGst;
  const total    = subtotal + gst;
  const date     = new Date(invoice.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "32px 16px" }}>
      {/* Download button — outside print area */}
      <div style={{ maxWidth: 720, margin: "0 auto 20px", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={downloadPdf}
          style={{
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 24px", fontSize: 14, fontWeight: 600,
            cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
          }}
        >
          Download PDF
        </button>
      </div>

      {/* Invoice — this is what gets exported */}
      <div ref={printRef} style={{
        maxWidth: 720, margin: "0 auto",
        background: "#fff", borderRadius: 16,
        padding: "40px 48px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        fontFamily: "'Inter', sans-serif",
        color: "#111827",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#7c3aed", letterSpacing: "-0.5px" }}>Printribe</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Custom Print & Apparel Manufacturing</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Bengaluru, Karnataka</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>INVOICE</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{invoice.id}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{date}</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 2, background: "linear-gradient(90deg, #7c3aed, #4f46e5)", borderRadius: 2, marginBottom: 32 }} />

        {/* Bill To */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Bill To</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{invoice.client.name}</div>
          {invoice.client.address && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{invoice.client.address}</div>}
          {invoice.client.city    && <div style={{ fontSize: 13, color: "#6b7280" }}>{invoice.client.city}</div>}
          {invoice.client.gstin   && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>GSTIN: {invoice.client.gstin}</div>}
          {invoice.client.email   && <div style={{ fontSize: 13, color: "#6b7280" }}>{invoice.client.email}</div>}
          {invoice.client.phone   && <div style={{ fontSize: 13, color: "#6b7280" }}>{invoice.client.phone}</div>}
        </div>

        {/* Items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32 }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              {["Product", "HSN", "Qty", "Unit Price", "Amount"].map(h => (
                <th key={h} style={{
                  padding: "10px 12px", textAlign: h === "Product" ? "left" : "right",
                  fontSize: 11, fontWeight: 600, color: "#9ca3af",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  borderBottom: "1px solid #e5e7eb",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "12px 12px", fontSize: 14, color: "#111827" }}>{item.product}</td>
                <td style={{ padding: "12px 12px", fontSize: 13, color: "#6b7280", textAlign: "right" }}>{item.hsn}</td>
                <td style={{ padding: "12px 12px", fontSize: 14, color: "#111827", textAlign: "right" }}>{item.qty}</td>
                <td style={{ padding: "12px 12px", fontSize: 14, color: "#111827", textAlign: "right" }}>₹{(item.saleValue / item.qty).toLocaleString("en-IN")}</td>
                <td style={{ padding: "12px 12px", fontSize: 14, fontWeight: 600, color: "#111827", textAlign: "right" }}>₹{item.saleValue.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 260 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#6b7280" }}>
              <span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#6b7280" }}>
              <span>GST</span><span>₹{gst.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ height: 1, background: "#e5e7eb", margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 16, fontWeight: 700, color: "#111827" }}>
              <span>Total</span><span>₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #f3f4f6", textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
          Thank you for your business · theprintribe@gmail.com
        </div>
      </div>
    </div>
  );
}
