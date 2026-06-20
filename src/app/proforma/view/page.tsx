"use client";

import { useEffect, useRef, useState, Suspense } from "react";
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

export type ProformaItem = {
  product: string;
  hsn: string;
  qty: number;
  unitPrice: number;
  gstPct: number;
};

export type ProformaData = {
  ref: string;
  date: string;
  items: ProformaItem[];
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

function ProformaContent() {
  const [data, setData] = useState<ProformaData | null>(null);
  const [error, setError] = useState("");
  const [printZoom, setPrintZoom] = useState(0.75);
  const cardRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      fetch(`/api/proformas/${id}`)
        .then(r => r.ok ? r.json() : Promise.reject("Not found"))
        .then(p => setData(p.data as ProformaData))
        .catch(() => setError("Failed to load proforma from database."));
    } else {
      try {
        const raw = sessionStorage.getItem("printribe_proforma");
        if (!raw) { setError("No proforma data found. Please go back and click Generate Proforma."); return; }
        setData(JSON.parse(raw));
      } catch {
        setError("Failed to load proforma data.");
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!data || !cardRef.current) return;
    const A4_PX = 1123;
    const BASE_ZOOM = 0.75;
    const naturalHeight = cardRef.current.scrollHeight;
    const availableHeight = A4_PX / BASE_ZOOM;
    setPrintZoom(naturalHeight > availableHeight
      ? parseFloat((A4_PX / naturalHeight).toFixed(2))
      : BASE_ZOOM);
  }, [data]);

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Inter, sans-serif", color: "#EE3C30" }}>
      {error}
    </div>
  );
  if (!data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Inter, sans-serif", color: "#737982" }}>
      Loading proforma…
    </div>
  );

  const { items, totalSaleValue, totalGst, client } = data;

  // GST breakdown by rate
  const gstGroups: { rate: number; cgst: number; sgst: number }[] = [];
  items.forEach(item => {
    const itemSale = item.qty * item.unitPrice;
    const itemGst = itemSale * (item.gstPct / 100);
    const existing = gstGroups.find(g => g.rate === item.gstPct);
    if (existing) { existing.cgst += itemGst / 2; existing.sgst += itemGst / 2; }
    else gstGroups.push({ rate: item.gstPct, cgst: itemGst / 2, sgst: itemGst / 2 });
  });
  gstGroups.sort((a, b) => a.rate - b.rate);

  const exactTotal = totalSaleValue + totalGst;
  const amountDue = Math.round(exactTotal);
  const roundOff = amountDue - exactTotal;
  const amountInWords = toWords(amountDue);
  const fmtAmt = (n: number) => "₹ " + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pdfTitle = `Proforma_${data.ref.replace(/\//g, "_")}_${client.name.replace(/\s+/g, "_")}`;
  if (typeof document !== "undefined") document.title = pdfTitle;

  // accent colour — blue for proforma (vs red for GST invoice)
  const ACCENT = "#2266A1";
  const ACCENT_LIGHT = "#eff2f5";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=La+Belle+Aurore&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; line-height: normal; background: #f0f0f0; font-family: Inter, sans-serif; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .no-print { display: none !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; width: 100% !important; }
          .screen-outer { padding: 0 !important; margin: 0 !important; background: #fff !important; min-height: unset !important; width: 100% !important; }
          .screen-card { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; width: 100% !important; max-width: 100% !important; overflow: visible !important; }
          .pf-footer { position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; margin: 0 !important; }
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
          style={{ fontSize: 12, fontWeight: 700, padding: "6px 18px", borderRadius: 6, background: ACCENT, color: "#fff", border: "none", cursor: "pointer" }}>
          Print / Download PDF
        </button>
        <span style={{ fontSize: 11, color: "#888", marginLeft: 4 }}>Choose "Save as PDF" · tick "Background graphics"</span>
      </div>

      <div className="screen-outer" style={{ padding: "24px 16px", minHeight: "calc(100vh - 46px)", zoom: printZoom }}>
        <div ref={cardRef} className="screen-card" style={{
          width: 1062, maxWidth: "100%",
          backgroundColor: "#fff",
          overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "flex-start",
          padding: "40px 40px 169px",
          boxSizing: "border-box",
          position: "relative", isolation: "isolate",
          gap: 28, lineHeight: "normal", letterSpacing: "normal",
          margin: "0 auto",
          boxShadow: "0 2px 24px rgba(0,0,0,0.1)",
          borderRadius: 8,
          fontFamily: "Inter, sans-serif",
        }}>

          {/* ── HEADER ── */}
          <section style={{
            alignSelf: "stretch", display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", flexWrap: "wrap", gap: 0, rowGap: 20,
            zIndex: 2, flexShrink: 0, textAlign: "left", fontSize: 32, color: "#000", fontFamily: "Inter",
          }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, minWidth: 230, maxWidth: "100%" }}>
              <h1 style={{ margin: 0, fontSize: "inherit", letterSpacing: "-0.5px", lineHeight: "40px", fontWeight: 700, fontFamily: "inherit" }}>
                PROFORMA
              </h1>
              <div style={{ width: 303.5, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, fontSize: 16, color: "#737982" }}>
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ width: 116, flexShrink: 0, lineHeight: "24px", display: "inline-block" }}>Reference No.</div>
                  <div style={{ flex: 1, fontWeight: 500, color: "#000", lineHeight: "24px" }}>{data.ref}</div>
                </div>
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ width: 116, flexShrink: 0, lineHeight: "24px", display: "inline-block" }}>Date</div>
                  <div style={{ flex: 1, fontWeight: 500, color: "#000", lineHeight: "24px" }}>{formatDate(data.date)}</div>
                </div>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Printribe-Logo-TM-without-bg-1@2x.png" alt="Printribe"
              style={{ width: 402, height: "auto", objectFit: "contain", minWidth: 310, maxWidth: 402 }} />
          </section>

          {/* ── BILLED BY / TO ── */}
          <section style={{
            alignSelf: "stretch", display: "flex", alignItems: "flex-start",
            flexWrap: "wrap", alignContent: "flex-start",
            padding: "2px 0 0", boxSizing: "border-box",
            gap: "10px 20px", maxWidth: "100%", zIndex: 3, flexShrink: 0,
          }}>
            {/* Billed By */}
            <div style={{
              flex: 1, borderRadius: 16, backgroundColor: ACCENT_LIGHT, border: `1px solid ${ACCENT_LIGHT}`,
              boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "flex-start",
              padding: 24, gap: 12, minWidth: 361, maxWidth: "100%",
              textAlign: "left", fontSize: 18, color: ACCENT, fontFamily: "Inter",
            }}>
              <div style={{ lineHeight: "28px", fontWeight: 500 }}>Billed By</div>
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
                  <div style={{ width: 50, flexShrink: 0, lineHeight: "24px" }}>Email</div>
                  <div style={{ fontWeight: 500, color: "#000", lineHeight: "24px" }}>info@theprintribe.com</div>
                </div>
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ minWidth: 50, lineHeight: "24px" }}>Phone</div>
                  <div style={{ fontWeight: 500, color: "#000", lineHeight: "24px" }}>+91 88848 63036</div>
                </div>
              </div>
            </div>

            {/* Billed To */}
            <div style={{
              flex: 1, borderRadius: 16, backgroundColor: ACCENT_LIGHT, border: `1px solid ${ACCENT_LIGHT}`,
              boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "flex-start",
              padding: 24, gap: 12, minWidth: 361, maxWidth: "100%",
              textAlign: "left", fontSize: 18, color: ACCENT, fontFamily: "Inter",
            }}>
              <div style={{ lineHeight: "28px", fontWeight: 500 }}>Billed To</div>
              <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, fontSize: 20, color: "#000" }}>
                <h3 style={{ alignSelf: "stretch", margin: 0, fontSize: "inherit", letterSpacing: "-0.25px", lineHeight: "32px", fontWeight: 700, fontFamily: "inherit" }}>{client.name.toUpperCase()}</h3>
                <div style={{ width: "100%", fontSize: 18, lineHeight: "28px", fontWeight: 500, display: "inline-block", maxWidth: 431 }}>
                  {(client.address || client.city) ? [client.address, client.city].filter(Boolean).join(", ") : "-"}
                </div>
              </div>
              <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, fontSize: 16 }}>
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ lineHeight: "24px" }}>GSTIN</div>
                  <div style={{ fontWeight: 500, color: "#000", lineHeight: "24px" }}>{client.gstin || "-"}</div>
                </div>
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ width: 50, flexShrink: 0, lineHeight: "24px" }}>Email</div>
                  <div style={{ fontWeight: 500, color: "#000", lineHeight: "24px" }}>{client.email || "-"}</div>
                </div>
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ minWidth: 50, lineHeight: "24px" }}>Phone</div>
                  <div style={{ fontWeight: 500, color: "#000", lineHeight: "24px" }}>{client.phone || "-"}</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── TABLE ── */}
          <section style={{
            alignSelf: "stretch", borderRadius: "12px 12px 0 0", overflow: "hidden",
            display: "flex", flexDirection: "column", alignItems: "flex-start",
            isolation: "isolate", zIndex: 4, flexShrink: 0,
            textAlign: "left", fontSize: 16, color: "#000", fontFamily: "Inter",
          }}>
            {/* Header row — blue for proforma */}
            <div style={{
              alignSelf: "stretch", backgroundColor: ACCENT, padding: "12px 20px",
              boxSizing: "border-box", display: "flex", alignItems: "flex-start", maxWidth: "100%", gap: 8,
            }}>
              <div style={{ flex: 1, minWidth: 155, maxWidth: 432 }}>
                <div style={{ lineHeight: "24px", fontWeight: 600, color: "#fff" }}>Product Description</div>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 24, minWidth: 270, maxWidth: "100%", textAlign: "center", color: "#fff" }}>
                <div style={{ lineHeight: "24px", fontWeight: 600 }}>HSN/SAC</div>
                <div style={{ flex: 1, lineHeight: "24px", fontWeight: 600, minWidth: 27 }}>UoM</div>
                <div style={{ flex: 1, lineHeight: "24px", fontWeight: 600, minWidth: 27 }}>Qty</div>
                <div style={{ flex: 1, lineHeight: "24px", fontWeight: 600, minWidth: 27 }}>Rate</div>
                <div style={{ width: 129, lineHeight: "24px", fontWeight: 600 }}>Total</div>
              </div>
            </div>

            {/* Item rows */}
            {items.map((item, idx) => (
              <div key={idx} style={{
                alignSelf: "stretch",
                borderRight: "1px solid #fff", borderBottom: "1px solid #fff", borderLeft: "1px solid #fff",
                boxSizing: "border-box", padding: 20,
                display: "flex", alignItems: "flex-start", maxWidth: "100%", gap: 8,
                fontSize: 16, color: "#000", fontFamily: "Inter",
              }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 163, maxWidth: 432 }}>
                  <div style={{ alignSelf: "stretch", lineHeight: "28px", fontWeight: 600 }}>{item.product}</div>
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 24, minWidth: 310, maxWidth: "100%", textAlign: "center" }}>
                  <div style={{ flex: 1, lineHeight: "28px", fontWeight: 600, minWidth: 44 }}>{item.hsn || "6109"}</div>
                  <div style={{ flex: 1, lineHeight: "28px", fontWeight: 600, minWidth: 44 }}>Nos.</div>
                  <div style={{ flex: 1, lineHeight: "28px", fontWeight: 600, minWidth: 44 }}>{item.qty}</div>
                  <div style={{ flex: 1, lineHeight: "28px", fontWeight: 600, minWidth: 44 }}>{item.unitPrice.toFixed(2)}</div>
                  <div style={{ width: 129, display: "flex", alignItems: "flex-start", textAlign: "right" }}>
                    <div style={{ flex: 1, lineHeight: "28px", fontWeight: 600 }}>{fmtAmt(item.qty * item.unitPrice)}</div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* ── BOTTOM ── */}
          <main className="invoice-bottom" style={{
            alignSelf: "stretch", display: "flex", alignItems: "flex-start",
            flexWrap: "wrap", alignContent: "flex-start",
            padding: "0 20px 0 0", boxSizing: "border-box",
            gap: 32, maxWidth: "100%", zIndex: 5, flexShrink: 0,
          }}>
            {/* LEFT */}
            <div style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start",
              gap: 10, minWidth: 335, maxWidth: 574,
              textAlign: "left", fontSize: 18, color: ACCENT, fontFamily: "Inter",
            }}>
              {/* Amount in words */}
              <div style={{
                alignSelf: "stretch", borderRadius: 16, backgroundColor: ACCENT,
                border: `1px solid ${ACCENT_LIGHT}`, padding: 20,
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, color: "#fff",
              }}>
                <div style={{ lineHeight: "28px", fontWeight: 500 }}>Amount Chargeable incl. tax (in words)</div>
                <b style={{ width: "100%", lineHeight: "24px", display: "inline-block", maxWidth: 532 }}>{amountInWords}</b>
              </div>

              {/* Bank details + UPI */}
              <div style={{
                alignSelf: "stretch", borderRadius: 16, backgroundColor: ACCENT_LIGHT,
                border: `1px solid ${ACCENT_LIGHT}`, boxSizing: "border-box",
                display: "flex", flexDirection: "column", padding: 20, alignItems: "flex-start", maxWidth: "100%",
              }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, maxWidth: "100%" }}>
                  <div style={{ lineHeight: "28px", fontWeight: 500 }}>Bank Account Details</div>
                  <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 20, maxWidth: "100%", fontSize: 16 }}>
                    <div style={{ flex: 1, display: "flex", gap: 16 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ lineHeight: "24px" }}>Bank Name</div>
                        <div style={{ lineHeight: "24px" }}>Account Holder Name</div>
                        <div style={{ lineHeight: "24px" }}>Account Number</div>
                        <div style={{ lineHeight: "24px" }}>IFSC</div>
                        <div style={{ lineHeight: "24px" }}>Account Type</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, color: "#000" }}>
                        <div style={{ lineHeight: "24px", fontWeight: 500 }}>HDFC Bank, Amruthalli Branch</div>
                        <div style={{ lineHeight: "24px", fontWeight: 500 }}>PRINTRIBE</div>
                        <div style={{ lineHeight: "24px", fontWeight: 500 }}>59209967439181</div>
                        <div style={{ lineHeight: "24px", fontWeight: 500 }}>HDFC0004829</div>
                        <div style={{ lineHeight: "24px", fontWeight: 500 }}>Current</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/upi-qr.png" alt="UPI QR Code" style={{ width: 100, height: 100, objectFit: "contain" }} />
                      <div style={{ fontSize: 12, color: "#000", fontWeight: 500 }}>Scan to Pay</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div style={{
                alignSelf: "stretch", borderRadius: 16, backgroundColor: ACCENT_LIGHT,
                border: `1px solid ${ACCENT_LIGHT}`, display: "flex", flexDirection: "column",
                alignItems: "flex-start", padding: 20, gap: 10,
              }}>
                <div style={{ lineHeight: "28px", fontWeight: 500 }}>Terms and Conditions</div>
                <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, fontSize: 16, color: "#000" }}>
                  <div style={{ lineHeight: "24px" }}>
                    This is a proforma invoice and not a tax invoice. Goods will be dispatched only after advance payment confirmation.<br />
                    All disputes subject to Bangalore Jurisdiction Only.
                  </div>
                  <div style={{ lineHeight: "24px" }}>Thank you for your valuable order.</div>
                </div>
              </div>
            </div>

            {/* RIGHT — totals */}
            <section style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 142, maxWidth: 356 }}>
              <div style={{
                alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start",
                gap: 24, textAlign: "left", fontSize: 16, color: "#000", fontFamily: "Inter",
              }}>
                <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-start", gap: 24, overflow: "hidden", color: "#737982" }}>
                  {/* Labels */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, minWidth: 108 }}>
                    <div style={{ lineHeight: "24px", fontWeight: 500 }}>Sub Total</div>
                    {gstGroups.map(g => (<>
                      <div key={`cl-${g.rate}`} style={{ lineHeight: "24px", fontWeight: 500 }}>Output CGST({g.rate / 2}%)</div>
                      <div key={`sl-${g.rate}`} style={{ lineHeight: "24px", fontWeight: 500 }}>Output SGST({g.rate / 2}%)</div>
                    </>))}
                    <div style={{ lineHeight: "24px", fontWeight: 500 }}>Total Tax(GST)</div>
                    <div style={{ lineHeight: "24px", fontWeight: 500 }}>Round Off</div>
                  </div>
                  {/* Values */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 16, minWidth: 108, textAlign: "right", color: "#000" }}>
                    <div style={{ lineHeight: "24px", fontWeight: 600 }}>{fmtAmt(totalSaleValue)}</div>
                    {gstGroups.map(g => (<>
                      <div key={`cv-${g.rate}`} style={{ lineHeight: "24px", fontWeight: 600 }}>{fmtAmt(g.cgst)}</div>
                      <div key={`sv-${g.rate}`} style={{ lineHeight: "24px", fontWeight: 600 }}>{fmtAmt(g.sgst)}</div>
                    </>))}
                    <div style={{ lineHeight: "24px", fontWeight: 600 }}>{fmtAmt(totalGst)}</div>
                    <div style={{ lineHeight: "24px", fontWeight: 600 }}>{fmtAmt(roundOff)}</div>
                  </div>
                </div>

                {/* Amount Due */}
                <div style={{
                  alignSelf: "stretch", height: 62,
                  borderTop: "1px solid #000", borderBottom: "1px solid #000",
                  boxSizing: "border-box", overflow: "hidden", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 0", fontSize: 24,
                }}>
                  <h3 style={{ margin: 0, fontSize: "inherit", letterSpacing: "-0.5px", lineHeight: "36px", fontWeight: 600 }}>Amount Due</h3>
                  <h3 style={{ margin: 0, fontSize: "inherit", letterSpacing: "-0.5px", lineHeight: "36px", fontWeight: 600 }}>{fmtAmt(amountDue)}</h3>
                </div>

                {/* Signature */}
                <div style={{ alignSelf: "stretch", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 0", textAlign: "right" }}>
                  <div style={{ width: 336, letterSpacing: "-0.5px", lineHeight: "36px", display: "inline-block", flexShrink: 0, maxWidth: "100%" }}>
                    <span style={{ fontWeight: 600 }}>For PRINTRIBE<br /></span>
                    <span style={{ fontSize: 20, fontFamily: '"La Belle Aurore", cursive', color: ACCENT, lineHeight: "36px" }}>Nehal Ganapathy<br /></span>
                    <span style={{ fontWeight: 600 }}>Authorized Signatory</span>
                  </div>
                </div>
              </div>
            </section>
          </main>

          {/* ── FOOTER ── */}
          <footer className="pf-footer" style={{
            width: "100%", height: 49, margin: 0,
            position: "absolute", right: 0, bottom: 0, left: 0,
            backgroundColor: ACCENT,
            overflow: "hidden", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            minHeight: 49, maxWidth: "100%",
            zIndex: 1, textAlign: "center", fontSize: 16, color: "#fff", fontFamily: "Inter",
          }}>
            <div style={{ flex: 1, lineHeight: "24px" }}>
              This is a computer generated PROFORMA and requires no signature
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

export default function ProformaPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Inter, sans-serif", color: "#737982" }}>Loading proforma…</div>}>
      <ProformaContent />
    </Suspense>
  );
}
