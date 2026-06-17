"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// ── number to words (Indian system) ─────────────────────────
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function convert(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n] + " ";
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "") + " ";
  if (n < 1000) return ONES[Math.floor(n / 100)] + " Hundred " + convert(n % 100);
  if (n < 100000) return convert(Math.floor(n / 1000)) + "Thousand " + convert(n % 1000);
  if (n < 10000000) return convert(Math.floor(n / 100000)) + "Lakh " + convert(n % 100000);
  return convert(Math.floor(n / 10000000)) + "Crore " + convert(n % 10000000);
}

function toWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = "INR " + convert(rupees).trim();
  if (paise > 0) result += " and " + convert(paise).trim() + " Paise";
  return result + " Only";
}

// ── capitalise words ─────────────────────────────────────────
function titleCase(str: string) {
  return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

type InvoiceData = {
  id: string; date: string; qty: number; product: string; hsn: string;
  saleValue: number; gst: number;
  client: { name: string; gstin: string | null; address: string | null; city: string | null; email: string | null; phone: string | null };
};

// ── Printribe logo SVG ───────────────────────────────────────
function PrintribeLogo() {
  return (
    <svg width="180" height="48" viewBox="0 0 180 48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="lh"><rect x="0" y="0" width="21" height="44" /></clipPath>
        <clipPath id="rh"><rect x="21" y="0" width="21" height="44" /></clipPath>
      </defs>
      {/* Heart split: blue left, red right */}
      <path d="M21 40 C21 40 2 27 2 15 C2 8 7 3 14 3 C17 3 20 5 21 8 C22 5 25 3 28 3 C35 3 40 8 40 15 C40 27 21 40 21 40Z"
        fill="#2266A1" clipPath="url(#lh)" />
      <path d="M21 40 C21 40 2 27 2 15 C2 8 7 3 14 3 C17 3 20 5 21 8 C22 5 25 3 28 3 C35 3 40 8 40 15 C40 27 21 40 21 40Z"
        fill="#EE3C30" clipPath="url(#rh)" />
      {/* PRINTRIBE text */}
      <text x="50" y="32" fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900" fontSize="21" fill="#111111" letterSpacing="0.5">PRINTRIBE</text>
      <text x="168" y="16" fontFamily="Arial, sans-serif" fontSize="9" fill="#111111">®</text>
    </svg>
  );
}

export default function InvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/invoices/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load invoice."); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Arial, sans-serif", color: "#888" }}>
      Loading invoice…
    </div>
  );
  if (error || !data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Arial, sans-serif", color: "#EE3C30" }}>
      {error || "Invoice not found."}
    </div>
  );

  const { saleValue, gst, qty, product, hsn, client } = data;
  const rate = qty > 0 ? saleValue / qty : 0;
  const gstPct = saleValue > 0 ? Math.round((gst / saleValue) * 100) : 5;
  const halfGstPct = gstPct / 2;
  const cgst = gst / 2;
  const sgst = gst / 2;
  const amountDue = Math.round(saleValue + gst);
  const roundOff = amountDue - (saleValue + gst);
  const amountInWords = toWords(amountDue);

  const BLUE = "#2266A1";
  const GOLD_BG = "#F5A100";
  const NAVY = "#1B3A6B";
  const RED = "#EE3C30";
  const BORDER = "#D8D8D8";
  const BOX_BG = "#F2F4F8";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .invoice-wrap { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
        }
        body { margin: 0; background: #f0f0f0; font-family: Arial, sans-serif; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Print / Back buttons */}
      <div className="no-print" style={{ background: "#111", padding: "12px 24px", display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={() => window.history.back()}
          style={{ fontSize: 12, padding: "7px 14px", borderRadius: 6, background: "#333", color: "#fff", border: "none", cursor: "pointer" }}>
          ← Back
        </button>
        <button onClick={() => window.print()}
          style={{ fontSize: 12, fontWeight: 700, padding: "7px 18px", borderRadius: 6, background: RED, color: "#fff", border: "none", cursor: "pointer" }}>
          Print / Download PDF
        </button>
        <span style={{ fontSize: 11, color: "#888", marginLeft: 6 }}>
          In the print dialog, choose "Save as PDF" to download
        </span>
      </div>

      {/* Invoice */}
      <div style={{ padding: "24px", minHeight: "calc(100vh - 50px)" }}>
        <div className="invoice-wrap" style={{
          background: "#fff", maxWidth: 820, margin: "0 auto",
          boxShadow: "0 2px 20px rgba(0,0,0,0.12)", borderRadius: 4,
          overflow: "hidden",
        }}>
          <div style={{ padding: "32px 40px 0" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#111", marginBottom: 12 }}>GST Invoice</div>
                <table style={{ fontSize: 13, borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ color: "#555", paddingRight: 16, paddingBottom: 4 }}>Invoice No.</td>
                      <td style={{ fontWeight: 700, paddingBottom: 4 }}>{data.id}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "#555", paddingRight: 16 }}>Invoice Date</td>
                      <td style={{ fontWeight: 700 }}>{formatDate(data.date)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <PrintribeLogo />
            </div>

            {/* Billed By / Billed To */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "24px 0" }}>
              {[
                {
                  label: "Billed By",
                  name: "PRINTRIBE",
                  lines: [
                    "1, Mallayya Industrial Area, Kereguddadahalli,",
                    "Chikkabanavara, Bengaluru, Karnataka, 560090",
                  ],
                  gstin: "29ABAFP5040J1Z6",
                  email: "info@theprintribe.com",
                  phone: "+91 88848 63036",
                },
                {
                  label: "Billed To",
                  name: client.name.toUpperCase(),
                  lines: client.address
                    ? [client.address]
                    : client.city
                    ? [client.city]
                    : [],
                  gstin: client.gstin,
                  email: client.email,
                  phone: client.phone,
                },
              ].map(box => (
                <div key={box.label} style={{ background: BOX_BG, borderRadius: 8, padding: "16px 18px", fontSize: 13 }}>
                  <div style={{ color: BLUE, fontWeight: 600, marginBottom: 8, fontSize: 12 }}>{box.label}</div>
                  <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 14 }}>{box.name}</div>
                  {box.lines.map((l, i) => <div key={i} style={{ color: "#444", lineHeight: 1.5 }}>{l}</div>)}
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                    {box.gstin && (
                      <div><span style={{ color: BLUE, marginRight: 8, fontSize: 12 }}>GSTIN</span>{box.gstin}</div>
                    )}
                    {box.email && (
                      <div><span style={{ color: BLUE, marginRight: 8, fontSize: 12 }}>Email</span>{box.email}</div>
                    )}
                    {box.phone && (
                      <div><span style={{ color: BLUE, marginRight: 8, fontSize: 12 }}>Phone</span>{box.phone}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Line items table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 24 }}>
              <thead>
                <tr style={{ background: GOLD_BG }}>
                  {[
                    { label: "Product Description", align: "left", w: "40%" },
                    { label: "HSN", align: "center", w: "10%" },
                    { label: "UoM", align: "center", w: "10%" },
                    { label: "Qty", align: "center", w: "10%" },
                    { label: "Rate", align: "right", w: "15%" },
                    { label: "Total", align: "right", w: "15%" },
                  ].map(h => (
                    <th key={h.label} style={{
                      padding: "10px 12px", textAlign: h.align as "left" | "center" | "right",
                      fontWeight: 700, fontSize: 12, width: h.w, color: "#111",
                    }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "14px 12px", fontWeight: 600 }}>{titleCase(product)}</td>
                  <td style={{ padding: "14px 12px", textAlign: "center" }}>{hsn}</td>
                  <td style={{ padding: "14px 12px", textAlign: "center" }}>Nos.</td>
                  <td style={{ padding: "14px 12px", textAlign: "center" }}>{qty}</td>
                  <td style={{ padding: "14px 12px", textAlign: "right" }}>{rate.toFixed(2)}</td>
                  <td style={{ padding: "14px 12px", textAlign: "right", fontWeight: 600 }}>₹ {saleValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
                {/* Empty rows for spacing */}
                <tr><td colSpan={6} style={{ height: 40 }} /></tr>
              </tbody>
            </table>

            {/* Amount in words + Totals */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24, alignItems: "start" }}>
              {/* Left: amount in words + bank details */}
              <div>
                <div style={{ background: NAVY, borderRadius: 6, padding: "14px 16px", marginBottom: 20 }}>
                  <div style={{ color: "#aac4e8", fontSize: 11, marginBottom: 6 }}>Amount Chargeable incl. tax (in words)</div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, lineHeight: 1.4 }}>{amountInWords}</div>
                </div>

                <div style={{ fontSize: 13 }}>
                  <div style={{ color: BLUE, fontWeight: 600, marginBottom: 10, fontSize: 12 }}>Bank Account Details</div>
                  {[
                    ["Bank Name", "HDFC Bank, Amruthalli Branch"],
                    ["Account Holder Name", "PRINTRIBE"],
                    ["Account Number", "59209967439181"],
                    ["IFSC", "HDFC0004829"],
                    ["Account Type", "Current"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, marginBottom: 5 }}>
                      <span style={{ color: BLUE, fontSize: 11 }}>{k}</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: totals */}
              <div style={{ fontSize: 13 }}>
                {[
                  ["Sub Total", saleValue],
                  [`Output CGST(${halfGstPct}%)`, cgst],
                  [`Output SGST(${halfGstPct}%)`, sgst],
                  ["Total Tax(GST)", gst],
                  ["Round Off", roundOff],
                ].map(([label, value]) => (
                  <div key={label as string} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ color: "#444" }}>{label as string}</span>
                    <span style={{ fontWeight: 500 }}>₹ {(value as number).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, borderTop: `2px solid #111` }}>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>Amount Due</span>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>₹ {amountDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>

                {/* Signature */}
                <div style={{ textAlign: "right", marginTop: 28 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>For PRINTRIBE</div>
                  <div style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize: 22, color: "#222", marginBottom: 2 }}>
                    Nehal Ganapathy
                  </div>
                  <div style={{ fontSize: 11, color: "#555" }}>Authorized Signatory</div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: "14px 16px", marginBottom: 0, fontSize: 12, color: "#444", lineHeight: 1.6 }}>
              <div style={{ color: BLUE, fontWeight: 600, marginBottom: 8 }}>Terms and Conditions</div>
              <p style={{ margin: "0 0 6px 0" }}>Our responsibility ceases once the goods leave our premises/factory. Goods once sold cannot be exchanged/returned. All disputes subject to Bangalore Jurisdiction Only.</p>
              <p style={{ margin: "0 0 6px 0" }}>By signing this copy/accepting delivery, you agree to the above terms of sales.</p>
              <p style={{ margin: 0 }}>Thank you for your valuable order.</p>
            </div>
          </div>

          {/* Red footer */}
          <div style={{ background: RED, marginTop: 24, padding: "12px 40px", textAlign: "center", color: "#fff", fontSize: 11, letterSpacing: "0.03em" }}>
            This is computer generated document and requires no signature
          </div>
        </div>
      </div>
    </>
  );
}
