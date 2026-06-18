"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

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

type InvoiceData = {
  id: string; date: string; qty: number; product: string; hsn: string;
  saleValue: number; gst: number;
  client: { name: string; gstin: string | null; address: string | null; city: string | null; email: string | null; phone: string | null };
};

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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Inter, sans-serif", color: "#737982" }}>
      Loading invoice…
    </div>
  );
  if (error || !data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Inter, sans-serif", color: "#EE3C30" }}>
      {error || "Invoice not found."}
    </div>
  );

  const { saleValue, gst, qty, product, hsn, client } = data;
  const rate = qty > 0 ? saleValue / qty : 0;
  const gstPct = saleValue > 0 ? Math.round((gst / saleValue) * 100) : 5;
  const halfGstPct = gstPct / 2;
  const cgst = gst / 2;
  const sgst = gst / 2;
  const exactTotal = saleValue + gst;
  const amountDue = Math.round(exactTotal);
  const roundOff = amountDue - exactTotal;
  const amountInWords = toWords(amountDue);

  const fmtAmt = (n: number) => "₹ " + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=La+Belle+Aurore&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f0f0f0; font-family: Inter, sans-serif; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
          .invoice-page { padding: 0 !important; }
          .invoice-wrap { box-shadow: none !important; max-width: 100% !important; }
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
        <span style={{ fontSize: 11, color: "#888", marginLeft: 4 }}>Choose "Save as PDF" in the print dialog</span>
      </div>

      <div className="invoice-page" style={{ padding: "24px 16px", minHeight: "calc(100vh - 46px)" }}>
        <div className="invoice-wrap" style={{
          background: "#fff",
          maxWidth: 900,
          margin: "0 auto",
          boxShadow: "0 2px 24px rgba(0,0,0,0.1)",
          borderRadius: 8,
          overflow: "hidden",
          fontFamily: "Inter, sans-serif",
        }}>

          {/* Inner padding */}
          <div style={{ padding: "40px 48px 0" }}>

            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20, marginBottom: 32 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, minWidth: 230 }}>
                <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: "40px", color: "#000" }}>
                  GST Invoice
                </h1>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 16 }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ color: "#737982", width: 116, flexShrink: 0 }}>Invoice No.</span>
                    <span style={{ fontWeight: 500, color: "#000" }}>{data.id}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ color: "#737982", width: 116, flexShrink: 0 }}>Invoice Date</span>
                    <span style={{ fontWeight: 500, color: "#000" }}>{formatDate(data.date)}</span>
                  </div>
                </div>
              </div>
              <Image
                src="/Printribe-Logo-TM-without-bg-1@2x.png"
                alt="Printribe"
                width={402}
                height={76}
                style={{ width: "auto", height: 60, objectFit: "contain", maxWidth: 320 }}
              />
            </div>

            {/* ── Billed By / Billed To ── */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
              {/* Billed By */}
              <div style={{
                flex: 1, minWidth: 300,
                background: "#eff2f5", border: "1px solid #eff2f5", borderRadius: 16,
                padding: 24, display: "flex", flexDirection: "column", gap: 12,
                fontSize: 18, color: "#2266a1",
              }}>
                <div style={{ lineHeight: "28px", fontWeight: 500 }}>Billed By</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.25px", lineHeight: "32px", color: "#000" }}>PRINTRIBE</h3>
                    <div style={{ fontSize: 18, fontWeight: 500, lineHeight: "28px", color: "#000" }}>
                      1, Mallayya Industrial Area, Kereguddadahalli,<br />Chikkabanavara, Bengaluru, Karnataka, 560090
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 16 }}>
                    <div style={{ display: "flex", gap: 16 }}><span>GSTIN</span><span style={{ fontWeight: 500, color: "#000" }}>29ABAFP5040J1Z6</span></div>
                    <div style={{ display: "flex", gap: 16 }}><span style={{ width: 50, flexShrink: 0 }}>Email</span><span style={{ fontWeight: 500, color: "#000" }}>info@theprintribe.com</span></div>
                    <div style={{ display: "flex", gap: 16 }}><span style={{ minWidth: 50 }}>Phone</span><span style={{ fontWeight: 500, color: "#000" }}>+91 88848 63036</span></div>
                  </div>
                </div>
              </div>

              {/* Billed To */}
              <div style={{
                flex: 1, minWidth: 300,
                background: "#eff2f5", border: "1px solid #eff2f5", borderRadius: 16,
                padding: 24, display: "flex", flexDirection: "column", gap: 12,
                fontSize: 18, color: "#2266a1",
              }}>
                <div style={{ lineHeight: "28px", fontWeight: 500 }}>Billed To</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.25px", lineHeight: "32px", color: "#000" }}>{client.name.toUpperCase()}</h3>
                    {(client.address || client.city) && (
                      <div style={{ fontSize: 18, fontWeight: 500, lineHeight: "28px", color: "#000" }}>
                        {client.address || client.city}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 16 }}>
                    {client.gstin && <div style={{ display: "flex", gap: 16 }}><span>GSTIN</span><span style={{ fontWeight: 500, color: "#000" }}>{client.gstin}</span></div>}
                    {client.email && <div style={{ display: "flex", gap: 16 }}><span style={{ width: 50, flexShrink: 0 }}>Email</span><span style={{ fontWeight: 500, color: "#000" }}>{client.email}</span></div>}
                    {client.phone && <div style={{ display: "flex", gap: 16 }}><span style={{ minWidth: 50 }}>Phone</span><span style={{ fontWeight: 500, color: "#000" }}>{client.phone}</span></div>}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Line Items Table ── */}
            <div style={{ borderRadius: "12px 12px 0 0", overflow: "hidden", marginBottom: 32 }}>
              {/* Header row */}
              <div style={{ background: "#fde28d", padding: "12px 20px", display: "flex", alignItems: "flex-start", gap: 8, fontSize: 16, fontWeight: 600 }}>
                <div style={{ flex: 1, minWidth: 155, lineHeight: "24px" }}>Product Description</div>
                <div style={{ display: "flex", gap: 24, minWidth: 270 }}>
                  <div style={{ flex: 1, minWidth: 27, textAlign: "center", lineHeight: "24px" }}>HSN/SAC</div>
                  <div style={{ flex: 1, minWidth: 27, textAlign: "center", lineHeight: "24px" }}>UoM</div>
                  <div style={{ flex: 1, minWidth: 27, textAlign: "center", lineHeight: "24px" }}>Qty</div>
                  <div style={{ flex: 1, minWidth: 27, textAlign: "center", lineHeight: "24px" }}>Rate</div>
                  <div style={{ width: 129, textAlign: "right", lineHeight: "24px" }}>Total</div>
                </div>
              </div>
              {/* Item row */}
              <div style={{ borderRight: "1px solid #fff", borderBottom: "1px solid #fff", borderLeft: "1px solid #fff", padding: 20, display: "flex", gap: 8, fontSize: 16 }}>
                <div style={{ flex: 1, minWidth: 155 }}>
                  <div style={{ fontWeight: 600, lineHeight: "28px" }}>{product}</div>
                </div>
                <div style={{ display: "flex", gap: 24, minWidth: 310, flex: "0 0 auto" }}>
                  <div style={{ flex: 1, textAlign: "center", fontWeight: 600, lineHeight: "28px" }}>{hsn}</div>
                  <div style={{ flex: 1, textAlign: "center", fontWeight: 600, lineHeight: "28px" }}>Nos.</div>
                  <div style={{ flex: 1, textAlign: "center", fontWeight: 600, lineHeight: "28px" }}>{qty}</div>
                  <div style={{ flex: 1, textAlign: "center", fontWeight: 600, lineHeight: "28px" }}>{rate.toFixed(2)}</div>
                  <div style={{ width: 129, textAlign: "right", fontWeight: 600, lineHeight: "28px" }}>{fmtAmt(saleValue)}</div>
                </div>
              </div>
            </div>

            {/* ── Bottom: Left column + Right column ── */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start", paddingBottom: 40 }}>

              {/* Left column */}
              <div style={{ flex: 1, minWidth: 335, maxWidth: 574, display: "flex", flexDirection: "column", gap: 10, fontSize: 18, color: "#2266a1", fontFamily: "Inter, sans-serif" }}>
                {/* Amount in words */}
                <div style={{ background: "#2266a1", border: "1px solid #eff2f5", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12, color: "#fff" }}>
                  <div style={{ lineHeight: "28px", fontWeight: 500 }}>Amount Chargeable incl. tax (in words)</div>
                  <div style={{ fontWeight: 700, fontSize: 18, lineHeight: "24px" }}>{amountInWords}</div>
                </div>

                {/* Bank details */}
                <div style={{ background: "#eff2f5", border: "1px solid #eff2f5", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ lineHeight: "28px", fontWeight: 500, color: "#2266a1" }}>Bank Account Details</div>
                  <div style={{ display: "flex", gap: 20, fontSize: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {["Bank Name", "Account Holder Name", "Account Number", "IFSC", "Account Type"].map(k => (
                        <div key={k} style={{ lineHeight: "24px", color: "#737982" }}>{k}</div>
                      ))}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      {["HDFC Bank, Amruthalli Branch", "PRINTRIBE", "59209967439181", "HDFC0004829", "Current"].map(v => (
                        <div key={v} style={{ lineHeight: "24px", fontWeight: 500, color: "#000" }}>{v}</div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div style={{ background: "#eff2f5", border: "1px solid #eff2f5", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ lineHeight: "28px", fontWeight: 500, color: "#2266a1" }}>Terms and Conditions</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 16, color: "#000" }}>
                    <div style={{ lineHeight: "24px" }}>
                      Our responsibility ceases once the goods leave our premises/factory. Goods once sold cannot be exchanged/returned. All disputes subject to Bangalore Jurisdiction Only.<br />
                      By signing this copy/accepting delivery, you agree to the above terms of sales.
                    </div>
                    <div style={{ lineHeight: "24px" }}>Thank you for your valuable order.</div>
                  </div>
                </div>
              </div>

              {/* Right column — totals + signature */}
              <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", fontSize: 16, fontFamily: "Inter, sans-serif" }}>
                {/* Totals rows */}
                <div style={{ display: "flex", gap: 24, overflow: "hidden", color: "#737982", marginBottom: 0 }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 108 }}>
                    {["Sub Total", `Output CGST(${halfGstPct}%)`, `Output SGST(${halfGstPct}%)`, "Total Tax(GST)", "Round Off"].map(label => (
                      <div key={label} style={{ lineHeight: "24px", fontWeight: 500 }}>{label}</div>
                    ))}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 108, alignItems: "flex-end", textAlign: "right", color: "#000" }}>
                    {[saleValue, cgst, sgst, gst, roundOff].map((val, i) => (
                      <div key={i} style={{ lineHeight: "24px", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtAmt(val)}</div>
                    ))}
                  </div>
                </div>

                {/* Amount Due */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "12px 0", marginTop: 16, fontSize: 24, letterSpacing: "-0.5px" }}>
                  <h3 style={{ fontSize: "inherit", fontWeight: 600, lineHeight: "36px" }}>Amount Due</h3>
                  <h3 style={{ fontSize: "inherit", fontWeight: 600, lineHeight: "36px" }}>{fmtAmt(amountDue)}</h3>
                </div>

                {/* Signature */}
                <div style={{ display: "flex", justifyContent: "center", padding: "12px 0", textAlign: "right" }}>
                  <div style={{ letterSpacing: "-0.5px", lineHeight: "36px", textAlign: "right" }}>
                    <div style={{ fontWeight: 600, fontSize: 16, color: "#000" }}>For PRINTRIBE</div>
                    <div style={{ fontFamily: "'La Belle Aurore', cursive", fontSize: 20, color: "#2266a1", lineHeight: "36px" }}>Nehal Ganapathy</div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: "#000" }}>Authorized Signatory</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Red footer ── */}
          <div style={{ background: "#EE3C30", padding: "12px 48px", textAlign: "center", color: "#fff", fontSize: 14 }}>
            This is computer generated document and requires no signature
          </div>
        </div>
      </div>
    </>
  );
}
