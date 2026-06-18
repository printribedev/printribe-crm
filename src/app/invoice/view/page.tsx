"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

type InvoiceItem = {
  product: string;
  hsn: string;
  qty: number;
  saleValue: number;
  gst: number;
};

type InvoiceData = {
  id: string;
  date: string;
  items: InvoiceItem[];
  totalSaleValue: number;
  totalGst: number;
  client: {
    name: string;
    gstin: string | null;
    address: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
  };
};

function InvoiceContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) { setError("No invoice ID provided."); setLoading(false); return; }
    fetch(`/api/invoices/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load invoice."); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Inter, sans-serif", color: "#737982" }}>
      Loading invoice…
    </div>
  );
  if (error || !data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Inter, sans-serif", color: "#EE3C30" }}>
      {error || "Invoice not found."}
    </div>
  );

  const { items, totalSaleValue, totalGst, client } = data;
  const firstItem = items[0] ?? { saleValue: 0, gst: 0 };
  const firstGstPct = firstItem.saleValue > 0 ? Math.round((firstItem.gst / firstItem.saleValue) * 100) : 5;
  const halfGstPct = firstGstPct / 2;
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const exactTotal = totalSaleValue + totalGst;
  const amountDue = Math.round(exactTotal);
  const roundOff = amountDue - exactTotal;
  const amountInWords = toWords(amountDue);
  const fmtAmt = (n: number) => "₹ " + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pdfTitle = `GST Invoice_${data.id.replace(/\//g, "_")}`;
  if (typeof document !== "undefined") document.title = pdfTitle;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=La+Belle+Aurore&display=swap');
        :root {
          --White-100: #fff;
          --Neutral-Neutral-500: #737982;
          --Neutral-Neutral-800: #363c45;
          --Neutral-Neutral-50: #f5f7fa;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; line-height: normal; background: #f0f0f0; font-family: Inter, sans-serif; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .screen-outer { padding: 0 !important; margin: 0 !important; background: #fff !important; min-height: unset !important; }
          .screen-card { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; width: 100% !important; max-width: 100% !important; overflow: visible !important; }
          .invoice-footer { position: fixed !important; bottom: -1px !important; left: 0 !important; right: 0 !important; width: 100vw !important; }
          html { zoom: 0.75; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: "#111", padding: "10px 24px", display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={() => window.history.back()}
          style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, background: "#333", color: "#fff", border: "none", cursor: "pointer" }}>
          ← Back
        </button>
        <button onClick={() => window.print()}
          style={{ fontSize: 12, fontWeight: 700, padding: "6px 18px", borderRadius: 6, background: "#EE3C30", color: "#fff", border: "none", cursor: "pointer" }}>
          Print / Download PDF
        </button>
        <span style={{ fontSize: 11, color: "#888", marginLeft: 4 }}>Choose "Save as PDF" · tick "Background graphics"</span>
      </div>

      <div className="screen-outer" style={{ padding: "24px 16px", minHeight: "calc(100vh - 46px)" }}>
        {/*
          Exact Locofy CSS:
          .gstInvoicePrintribe {
            width: 1062px; background-color: #fff; overflow: hidden;
            display: flex; flex-direction: column; align-items: flex-start;
            padding: 40px 40px 169px;   ← 169px bottom for absolute footer
            position: relative; isolation: isolate;
            gap: 28px; line-height: normal; letter-spacing: normal;
          }
        */}
        <div className="screen-card" style={{
          width: 1062,
          maxWidth: "100%",
          backgroundColor: "#fff",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          padding: "40px 40px 169px",
          boxSizing: "border-box",
          position: "relative",
          isolation: "isolate",
          gap: 28,
          lineHeight: "normal",
          letterSpacing: "normal",
          margin: "0 auto",
          boxShadow: "0 2px 24px rgba(0,0,0,0.1)",
          borderRadius: 8,
          fontFamily: "Inter, sans-serif",
        }}>

          {/* ── HEADER: FrameComponent11 ── */}
          {/*
            .frameParent (header section):
            align-self:stretch; display:flex; align-items:flex-start;
            justify-content:space-between; flex-wrap:wrap; gap:0; row-gap:20px;
            z-index:2; flex-shrink:0; text-align:left; font-size:32px; color:#000;
          */}
          <section style={{
            alignSelf: "stretch",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            flexWrap: "wrap", gap: 0, rowGap: 20,
            zIndex: 2, flexShrink: 0,
            textAlign: "left", fontSize: 32, color: "#000", fontFamily: "Inter",
          }}>
            {/* Left: GST Invoice + Invoice No/Date */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, minWidth: 230, maxWidth: "100%" }}>
              <div style={{ alignSelf: "stretch", display: "flex", alignItems: "center" }}>
                <h1 style={{ margin: 0, fontSize: "inherit", letterSpacing: "-0.5px", lineHeight: "40px", fontWeight: 700, fontFamily: "inherit" }}>
                  GST Invoice
                </h1>
              </div>
              {/* width:303.5px, gap:12px, font-size:16px, color:Neutral-500 */}
              <div style={{ width: 303.5, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, fontSize: 16, color: "#737982" }}>
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ width: 116, flexShrink: 0, lineHeight: "24px", display: "inline-block" }}>Invoice No.</div>
                  <div style={{ flex: 1, fontWeight: 500, color: "#000", lineHeight: "24px", minWidth: 98 }}>{data.id}</div>
                </div>
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ width: 116, flexShrink: 0, lineHeight: "24px", display: "inline-block" }}>Invoice Date</div>
                  <div style={{ flex: 1, fontWeight: 500, color: "#000", lineHeight: "24px", minWidth: 83 }}>{formatDate(data.date)}</div>
                </div>
              </div>
            </div>
            {/* Logo: width:402px, object-fit:cover, min-width:310px, max-width:402px */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Printribe-Logo-TM-without-bg-1@2x.png"
              alt="Printribe"
              style={{ width: 402, height: "auto", objectFit: "contain", minWidth: 310, maxWidth: 402 }}
            />
          </section>

          {/* ── BILLED BY / TO: .frameParent ── */}
          {/*
            padding: 2px 0 0; gap: 10px 20px; flex-wrap:wrap; align-content:flex-start;
          */}
          <section style={{
            alignSelf: "stretch",
            display: "flex", alignItems: "flex-start",
            flexWrap: "wrap", alignContent: "flex-start",
            padding: "2px 0 0", boxSizing: "border-box",
            gap: "10px 20px",
            maxWidth: "100%", zIndex: 3, flexShrink: 0,
          }}>
            {/* Billed By */}
            <div style={{
              flex: 1, borderRadius: 16, backgroundColor: "#eff2f5", border: "1px solid #eff2f5",
              boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "flex-start",
              padding: 24, gap: 12, minWidth: 361, maxWidth: "100%",
              textAlign: "left", fontSize: 18, color: "#2266a1", fontFamily: "Inter",
            }}>
              <div style={{ position: "relative", lineHeight: "28px", fontWeight: 500 }}>Billed By</div>
              <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, fontSize: 20, color: "#000" }}>
                <h3 style={{ alignSelf: "stretch", margin: 0, fontSize: "inherit", letterSpacing: "-0.25px", lineHeight: "32px", fontWeight: 700, fontFamily: "inherit" }}>PRINTRIBE</h3>
                <div style={{ width: "100%", fontSize: 18, lineHeight: "28px", fontWeight: 500, display: "inline-block", maxWidth: 431 }}>
                  1, Mallayya Industrial Area, Kereguddadahalli, Chikkabanavara, Bengaluru, Karnataka, 560090
                </div>
              </div>
              <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, fontSize: 16 }}>
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ lineHeight: "24px" }}>GSTIN</div>
                  <div style={{ fontWeight: 500, color: "#000", lineHeight: "24px" }}>29ABAFP5040J1Z6</div>
                </div>
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ width: 50, flexShrink: 0, display: "inline-block", lineHeight: "24px" }}>Email</div>
                  <div style={{ fontWeight: 500, color: "#000", lineHeight: "24px" }}>info@theprintribe.com</div>
                </div>
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ display: "inline-block", minWidth: 50, lineHeight: "24px" }}>Phone</div>
                  <div style={{ fontWeight: 500, color: "#000", lineHeight: "24px" }}>+91 88848 63036</div>
                </div>
              </div>
            </div>

            {/* Billed To */}
            <div style={{
              flex: 1, borderRadius: 16, backgroundColor: "#eff2f5", border: "1px solid #eff2f5",
              boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "flex-start",
              padding: 24, gap: 12, minWidth: 361, maxWidth: "100%",
              textAlign: "left", fontSize: 18, color: "#2266a1", fontFamily: "Inter",
            }}>
              <div style={{ position: "relative", lineHeight: "28px", fontWeight: 500 }}>Billed To</div>
              <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, fontSize: 20, color: "#000" }}>
                <h3 style={{ alignSelf: "stretch", margin: 0, fontSize: "inherit", letterSpacing: "-0.25px", lineHeight: "32px", fontWeight: 700, fontFamily: "inherit" }}>{client.name.toUpperCase()}</h3>
                {(client.address || client.city) && (
                  <div style={{ width: "100%", fontSize: 18, lineHeight: "28px", fontWeight: 500, display: "inline-block", maxWidth: 431 }}>
                    {client.address || client.city}
                  </div>
                )}
              </div>
              <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, fontSize: 16 }}>
                {client.gstin && (
                  <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ lineHeight: "24px" }}>GSTIN</div>
                    <div style={{ fontWeight: 500, color: "#000", lineHeight: "24px" }}>{client.gstin}</div>
                  </div>
                )}
                {client.email && (
                  <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ width: 50, flexShrink: 0, display: "inline-block", lineHeight: "24px" }}>Email</div>
                    <div style={{ fontWeight: 500, color: "#000", lineHeight: "24px" }}>{client.email}</div>
                  </div>
                )}
                {client.phone && (
                  <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ display: "inline-block", minWidth: 50, lineHeight: "24px" }}>Phone</div>
                    <div style={{ fontWeight: 500, color: "#000", lineHeight: "24px" }}>{client.phone}</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── TABLE: FrameComponent111 ── */}
          <section style={{
            alignSelf: "stretch", borderRadius: "12px 12px 0 0", overflow: "hidden",
            display: "flex", flexDirection: "column", alignItems: "flex-start",
            isolation: "isolate", zIndex: 4, flexShrink: 0,
            textAlign: "left", fontSize: 16, color: "#000", fontFamily: "Inter",
          }}>
            {/* Header row */}
            <div style={{
              alignSelf: "stretch", backgroundColor: "#fde28d", padding: "12px 20px",
              boxSizing: "border-box", display: "flex", alignItems: "flex-start", maxWidth: "100%", gap: 8,
            }}>
              <div style={{ flex: 1, minWidth: 155, maxWidth: 432, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 600 }}>Product Description</div>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 24, minWidth: 270, maxWidth: "100%", textAlign: "center" }}>
                <div style={{ lineHeight: "24px", fontWeight: 600 }}>HSN/SAC</div>
                <div style={{ flex: 1, lineHeight: "24px", fontWeight: 600, display: "inline-block", minWidth: 27 }}>UoM</div>
                <div style={{ flex: 1, lineHeight: "24px", fontWeight: 600, display: "inline-block", minWidth: 27 }}>Qty</div>
                <div style={{ flex: 1, lineHeight: "24px", fontWeight: 600, display: "inline-block", minWidth: 27 }}>Rate</div>
                <div style={{ width: 129, lineHeight: "24px", fontWeight: 600, display: "inline-block" }}>Total</div>
              </div>
            </div>

            {/* Item rows */}
            {items.map((item, idx) => (
              <div key={idx} style={{
                alignSelf: "stretch",
                borderRight: "1px solid var(--White-100)", borderBottom: "1px solid var(--White-100)", borderLeft: "1px solid var(--White-100)",
                boxSizing: "border-box", padding: 20,
                display: "flex", alignItems: "flex-start", maxWidth: "100%", gap: 8,
                fontSize: 16, color: "#000", fontFamily: "Inter",
              }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 163, maxWidth: 432 }}>
                  <div style={{ alignSelf: "stretch", lineHeight: "28px", fontWeight: 600 }}>{item.product}</div>
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 24, minWidth: 310, maxWidth: "100%", textAlign: "center" }}>
                  <div style={{ flex: 1, lineHeight: "28px", fontWeight: 600, display: "inline-block", minWidth: 44 }}>{item.hsn}</div>
                  <div style={{ flex: 1, lineHeight: "28px", fontWeight: 600, display: "inline-block", minWidth: 44 }}>Nos.</div>
                  <div style={{ flex: 1, lineHeight: "28px", fontWeight: 600, display: "inline-block", minWidth: 44 }}>{item.qty}</div>
                  <div style={{ flex: 1, lineHeight: "28px", fontWeight: 600, display: "inline-block", minWidth: 44 }}>{(item.qty > 0 ? item.saleValue / item.qty : 0).toFixed(2)}</div>
                  <div style={{ width: 129, display: "flex", alignItems: "flex-start", textAlign: "right" }}>
                    <div style={{ flex: 1, lineHeight: "28px", fontWeight: 600 }}>{fmtAmt(item.saleValue)}</div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* ── BOTTOM: .spanhdremovebefore ── */}
          {/*
            padding: 0 20px 0 0; gap: 32px; flex-wrap:wrap; align-content:flex-start;
          */}
          <main style={{
            alignSelf: "stretch",
            display: "flex", alignItems: "flex-start",
            flexWrap: "wrap", alignContent: "flex-start",
            padding: "0 20px 0 0", boxSizing: "border-box",
            gap: 32, maxWidth: "100%", zIndex: 5, flexShrink: 0,
          }}>
            {/* ── LEFT: FrameComponent1 ── */}
            <div style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start",
              gap: 10, minWidth: 335, maxWidth: 574,
              textAlign: "left", fontSize: 18, color: "#2266a1", fontFamily: "Inter",
            }}>
              {/* Amount in words */}
              <div style={{
                alignSelf: "stretch", borderRadius: 16, backgroundColor: "#2266a1",
                border: "1px solid #eff2f5", padding: 20,
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, color: "#fff",
              }}>
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "center" }}>
                  <div style={{ position: "relative", lineHeight: "28px", fontWeight: 500 }}>Amount Chargeable incl. tax (in words)</div>
                </div>
                <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <b style={{ width: "100%", position: "relative", lineHeight: "24px", display: "inline-block", maxWidth: 532 }}>{amountInWords}</b>
                </div>
              </div>

              {/* Bank details */}
              <div style={{
                alignSelf: "stretch", borderRadius: 16, backgroundColor: "#eff2f5",
                border: "1px solid #eff2f5", boxSizing: "border-box",
                display: "flex", flexDirection: "column", padding: 20, alignItems: "flex-start", maxWidth: "100%",
              }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, maxWidth: "100%" }}>
                  <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <div style={{ width: 184, height: 28, display: "flex", alignItems: "center" }}>
                      <div style={{ position: "relative", lineHeight: "28px", fontWeight: 500 }}>Bank Account Details</div>
                    </div>
                  </div>
                  <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 20, maxWidth: "100%", fontSize: 16 }}>
                    <div style={{ height: 152, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ lineHeight: "24px" }}>Bank Name</div>
                      <div style={{ lineHeight: "24px" }}>Account Holder Name</div>
                      <div style={{ lineHeight: "24px" }}>Account Number</div>
                      <div style={{ lineHeight: "24px" }}>IFSC</div>
                      <div style={{ display: "inline-block", minWidth: 106, lineHeight: "24px" }}>Account Type</div>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, minWidth: 224, maxWidth: "100%", color: "#000" }}>
                      <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 500 }}>HDFC Bank, Amruthalli Branch</div>
                      <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 500 }}>PRINTRIBE</div>
                      <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 500 }}>59209967439181</div>
                      <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 500 }}>HDFC0004829</div>
                      <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 500 }}>Current</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div style={{
                alignSelf: "stretch", borderRadius: 16, backgroundColor: "#eff2f5",
                border: "1px solid #eff2f5", display: "flex", flexDirection: "column",
                alignItems: "flex-start", padding: 20, gap: 10,
              }}>
                <div style={{ width: 189, height: 28, display: "flex", alignItems: "center" }}>
                  <div style={{ lineHeight: "28px", fontWeight: 500, flexShrink: 0 }}>Terms and Conditions</div>
                </div>
                <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, fontSize: 16, color: "#000" }}>
                  <div style={{ width: "100%", position: "relative", lineHeight: "24px", display: "inline-block" }}>
                    Our responsibility ceases once the goods leave our premises/factory. Goods once sold cannot be exchanged/returned. All disputes subject to Bangalore Jurisdiction Only.<br />
                    By signing this copy/accepting delivery, you agree to the above terms of sales.
                  </div>
                  <div style={{ alignSelf: "stretch", position: "relative", lineHeight: "24px" }}>
                    Thank you for your valuable order.
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: P (.pWrapper) ── */}
            {/* flex:1; flex-direction:column; min-width:142px; max-width:356px */}
            <section style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start",
              minWidth: 142, maxWidth: 356,
            }}>
              {/* .p: align-self:stretch, display:flex, flex-direction:column, gap:24px, font-size:16px */}
              <div style={{
                alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start",
                gap: 24, textAlign: "left", fontSize: 16, color: "#000", fontFamily: "Inter",
              }}>
                {/* Totals rows: .prvaKolaPlivanjaZaDojena — gap:24px, color:Neutral-500 */}
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 24, overflow: "hidden", color: "#737982" }}>
                  {/* Labels: .subTotalParent — gap:16px */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, minWidth: 108 }}>
                    <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 500 }}>Sub Total</div>
                    <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 500 }}>Output CGST({halfGstPct}%)</div>
                    <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 500 }}>Output SGST({halfGstPct}%)</div>
                    <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 500 }}>Total Tax(GST)</div>
                    <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 500 }}>Round Off</div>
                  </div>
                  {/* Values: .parent — gap:16px, text-align:right, color:#000 */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 16, minWidth: 108, textAlign: "right", color: "#000" }}>
                    <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 600 }}>{fmtAmt(totalSaleValue)}</div>
                    <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 600 }}>{fmtAmt(cgst)}</div>
                    <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 600 }}>{fmtAmt(sgst)}</div>
                    <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 600 }}>{fmtAmt(totalGst)}</div>
                    <div style={{ alignSelf: "stretch", lineHeight: "24px", fontWeight: 600 }}>{fmtAmt(roundOff)}</div>
                  </div>
                </div>

                {/* Amount Due: height:62px, border-top/bottom:1px solid #000, font-size:24px, letter-spacing:-0.5px */}
                <div style={{
                  alignSelf: "stretch", height: 62,
                  borderTop: "1px solid #000", borderBottom: "1px solid #000",
                  boxSizing: "border-box", overflow: "hidden", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 0", gap: 0, rowGap: 20, fontSize: 24,
                }}>
                  <h3 style={{ margin: 0, fontSize: "inherit", letterSpacing: "-0.5px", lineHeight: "36px", fontWeight: 600, fontFamily: "inherit" }}>Amount Due</h3>
                  <h3 style={{ margin: 0, fontSize: "inherit", letterSpacing: "-0.5px", lineHeight: "36px", fontWeight: 600, fontFamily: "inherit" }}>{fmtAmt(amountDue)}</h3>
                </div>

                {/* Signature: justify-content:center, padding:12px 0, text-align:right */}
                <div style={{ alignSelf: "stretch", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 0", boxSizing: "border-box", maxWidth: "100%", textAlign: "right" }}>
                  {/* width:336px, letter-spacing:-0.5px, line-height:36px */}
                  <div style={{ width: 336, position: "relative", letterSpacing: "-0.5px", lineHeight: "36px", display: "inline-block", flexShrink: 0, maxWidth: "100%" }}>
                    <span style={{ fontWeight: 600, lineHeight: "36px" }}>For PRINTRIBE<br /></span>
                    <span style={{ fontSize: 20, fontFamily: '"La Belle Aurore", cursive', color: "#2266a1", lineHeight: "36px" }}>Nehal Ganapathy<br /></span>
                    <span style={{ fontWeight: 600, lineHeight: "36px" }}>Authorized Signatory</span>
                  </div>
                </div>
              </div>
            </section>
          </main>

          {/* ── FOOTER: position:absolute, bottom:0, height:49px ── */}
          <footer className="invoice-footer" style={{
            width: "100%", height: 49,
            margin: 0,
            position: "absolute", right: 0, bottom: 0, left: 0,
            backgroundColor: "#ee3c30",
            overflow: "hidden", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            minHeight: 49, maxWidth: "100%",
            zIndex: 1, textAlign: "center", fontSize: 16, color: "#fff", fontFamily: "Inter",
          }}>
            <div style={{ flex: 1, position: "relative", lineHeight: "24px", display: "inline-block", maxWidth: "100%" }}>
              This is computer generated document and requires no signature
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Inter, sans-serif", color: "#737982" }}>Loading invoice…</div>}>
      <InvoiceContent />
    </Suspense>
  );
}
