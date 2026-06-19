"use client";

import { useEffect, useRef, useState } from "react";

const R = "#EE3C30", BLUE = "#2266A1", GREEN = "#1A7A4A", GOLD = "#D4B800";
const MID = "#888", BORDER = "#E8E7E3", BG = "#F7F6F2", WHITE = "#FFFFFF", BLACK = "#111111";
const ORANGE = "#E67E22", PURPLE = "#7B4FBF";

// ── Types ────────────────────────────────────────────────────────────────────

type Order = {
  id: string; clientName: string; product: string; segment: string;
  date: string; dueDate: string | null; qty: number; saleValue: number; gst: number;
  fabric: number; printing: number; transport: number; misc: number;
  jobWork: number; packaging: number; design: number; ribCost: number;
  stage: string; priority: string;
  deliveryDate: string | null; paymentDate: string | null;
};
type Client = { id: number; name: string; segment: string; totalValue: number; orderCount: number; city: string | null };
type Product = { id: number; name: string; category: string; basePrice: number; active: boolean };
type CRMData = { orders: Order[]; clients: Client[]; products: Product[] };

type Stat = { label: string; value: string; color?: string };
type TableData = { headers: string[]; rows: string[][] };
type ChatMsg = {
  role: "user" | "bot";
  text: string;
  stats?: Stat[];
  table?: TableData;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const pct = (n: number) => (n * 100).toFixed(1) + "%";

function getProductDisplay(product: string): string {
  try {
    const p = JSON.parse(product);
    if (Array.isArray(p)) return p.map((l: { name?: string }) => l.name).filter(Boolean).join(", ");
  } catch { /* legacy */ }
  return product || "—";
}

function calcMargin(o: Order): number {
  const cost = o.fabric + o.printing + o.transport + o.misc + o.jobWork + o.packaging + o.design + (o.ribCost || 0);
  return o.saleValue > 0 ? (o.saleValue - cost) / o.saleValue : 0;
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

const STAGE_LABELS: Record<string, string> = {
  enquiry: "Enquiry", design: "Design", sampling: "Sampling",
  production: "In Production", qc: "QC / Finishing", dispatch: "Dispatched",
  delivered: "Delivered", delivered_pending: "Delivered, Payment Pending",
};

const SEG_LABELS: Record<string, string> = {
  Reseller: "Reseller", Sports: "Sports", Education: "Education",
  Corporate: "Corporate", NGO_Govt: "NGO/Govt", B2C: "B2C",
};

// ── Learning store (localStorage) ────────────────────────────────────────────

const ALIAS_KEY = "printribe_chat_aliases";
const UNKNOWN_KEY = "printribe_chat_unknown";

function loadAliases(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(ALIAS_KEY) || "{}"); } catch { return {}; }
}
function saveAlias(alias: string, command: string) {
  const a = loadAliases();
  a[alias.toLowerCase().trim()] = command.trim();
  localStorage.setItem(ALIAS_KEY, JSON.stringify(a));
}
function logUnknown(query: string) {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(UNKNOWN_KEY) || "[]");
    if (!list.includes(query)) list.push(query);
    localStorage.setItem(UNKNOWN_KEY, JSON.stringify(list.slice(-50)));
  } catch { /* ignore */ }
}

// ── Query Engine ─────────────────────────────────────────────────────────────

function runQuery(raw: string, data: CRMData): ChatMsg {
  const q = raw.trim();

  // ── teach command ──────────────────────────────────────────────────────────
  const teachMatch = q.match(/^teach[:\s]+(.+?)\s*=\s*(.+)$/i);
  if (teachMatch) {
    saveAlias(teachMatch[1], teachMatch[2]);
    return { role: "bot", text: `Got it! I'll remember "**${teachMatch[1]}**" as a shortcut for "**${teachMatch[2]}**". Try it now.` };
  }

  // ── alias lookup ───────────────────────────────────────────────────────────
  const aliases = loadAliases();
  const aliasHit = aliases[q.toLowerCase()];
  if (aliasHit) return runQuery(aliasHit, data);

  // ── list aliases ───────────────────────────────────────────────────────────
  if (/^(list |show )?(my )?aliases|shortcuts|what have i taught/i.test(q)) {
    const aliases = loadAliases();
    const keys = Object.keys(aliases);
    if (!keys.length) return { role: "bot", text: "You haven't taught me any shortcuts yet. Use `teach: [shortcut] = [command]` to add one." };
    return {
      role: "bot",
      text: `You have **${keys.length}** saved shortcut${keys.length > 1 ? "s" : ""}:`,
      table: { headers: ["Shortcut", "Runs as"], rows: keys.map(k => [k, aliases[k]]) },
    };
  }

  const { orders, clients, products } = data;

  // ── greeting ───────────────────────────────────────────────────────────────
  if (/^(hi|hello|hey|howdy|sup)\b/i.test(q)) {
    return { role: "bot", text: `Hi! I can answer questions about your orders, clients, and products. Try asking things like:\n- "overdue orders"\n- "total revenue this month"\n- "top 5 clients"\n- "orders in production"\n- "pending payment"\n\nYou can also teach me shortcuts:\n\`teach: at risk = overdue high priority\`` };
  }

  // ── help ───────────────────────────────────────────────────────────────────
  if (/^help|what can you (do|answer)|commands/i.test(q)) {
    return {
      role: "bot",
      text: "Here's what I can answer:",
      table: {
        headers: ["Ask me…", "Example"],
        rows: [
          ["Order counts & totals", "how many orders / total orders"],
          ["Revenue & sales", "total revenue / revenue this month"],
          ["Overdue orders", "overdue orders / late orders"],
          ["By stage", "orders in production / dispatched orders"],
          ["Pending payment", "pending payment / unpaid orders"],
          ["High priority", "high priority orders / urgent"],
          ["By segment", "reseller orders / sports orders"],
          ["By client", "orders for Vyomha Fabrica"],
          ["By product", "custom jersey orders"],
          ["Margin analysis", "low margin orders / average margin"],
          ["Top clients", "top 5 clients / best clients"],
          ["Client lookup", "find client Vyomha"],
          ["Products", "list products / active products"],
          ["Summary", "summary / overview / dashboard"],
          ["Custom shortcuts", "teach: risk = overdue high priority"],
        ],
      },
    };
  }

  // ── summary / overview ─────────────────────────────────────────────────────
  if (/\b(summary|overview|dashboard|snapshot)\b/i.test(q)) {
    const active = orders.filter(o => o.stage !== "delivered" && o.stage !== "delivered_pending");
    const totalRev = orders.reduce((s, o) => s + o.saleValue, 0);
    const avgMargin = orders.length ? orders.reduce((s, o) => s + calcMargin(o), 0) / orders.length : 0;
    const overdue = active.filter(o => o.dueDate && daysUntil(o.dueDate) < 0);
    const pendingPayment = orders.filter(o => o.stage === "delivered_pending");
    return {
      role: "bot",
      text: "Here's your CRM snapshot:",
      stats: [
        { label: "Total Orders", value: String(orders.length) },
        { label: "Active Orders", value: String(active.length) },
        { label: "Total Revenue", value: fmt(totalRev) },
        { label: "Avg Margin", value: pct(avgMargin), color: avgMargin > 0.3 ? GREEN : avgMargin > 0.2 ? GOLD : R },
        { label: "Overdue", value: String(overdue.length), color: overdue.length > 0 ? R : GREEN },
        { label: "Pending Payment", value: String(pendingPayment.length), color: pendingPayment.length > 0 ? ORANGE : GREEN },
        { label: "Total Clients", value: String(clients.length) },
        { label: "Products", value: String(products.filter(p => p.active).length) + " active" },
      ],
    };
  }

  // ── total orders ───────────────────────────────────────────────────────────
  if (/\b(how many|total|count).{0,15}orders?\b/i.test(q)) {
    const active = orders.filter(o => o.stage !== "delivered" && o.stage !== "delivered_pending");
    return {
      role: "bot",
      text: `You have **${orders.length}** orders total.`,
      stats: [
        { label: "Total", value: String(orders.length) },
        { label: "Active", value: String(active.length) },
        { label: "Delivered", value: String(orders.filter(o => o.stage === "delivered").length) },
        { label: "Payment Pending", value: String(orders.filter(o => o.stage === "delivered_pending").length) },
      ],
    };
  }

  // ── revenue ────────────────────────────────────────────────────────────────
  if (/\b(revenue|sales|sale value|turnover)\b/i.test(q)) {
    let subset = orders;
    let label = "All time";

    if (/this month/i.test(q)) {
      const now = new Date(); subset = orders.filter(o => { const d = new Date(o.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
      label = "This month";
    } else if (/last month/i.test(q)) {
      const now = new Date(); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      subset = orders.filter(o => { const d = new Date(o.date); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); });
      label = "Last month";
    } else if (/this (fy|financial year|year)/i.test(q)) {
      const now = new Date(); const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      subset = orders.filter(o => { const d = new Date(o.date); const fy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return fy === fyStart; });
      label = `FY ${fyStart}-${fyStart + 1}`;
    } else if (/this week/i.test(q)) {
      const now = new Date(); const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      subset = orders.filter(o => new Date(o.date) >= weekAgo);
      label = "Last 7 days";
    }

    const total = subset.reduce((s, o) => s + o.saleValue, 0);
    const gst = subset.reduce((s, o) => s + o.gst, 0);
    return {
      role: "bot",
      text: `**${label}** revenue:`,
      stats: [
        { label: "Sale Value (excl. GST)", value: fmt(total) },
        { label: "GST Collected", value: fmt(gst) },
        { label: "Total incl. GST", value: fmt(total + gst) },
        { label: "Orders", value: String(subset.length) },
      ],
    };
  }

  // ── average margin ─────────────────────────────────────────────────────────
  if (/\b(average|avg|mean)\s+margin\b/i.test(q)) {
    const withSale = orders.filter(o => o.saleValue > 0);
    const avg = withSale.length ? withSale.reduce((s, o) => s + calcMargin(o), 0) / withSale.length : 0;
    const high = withSale.filter(o => calcMargin(o) > 0.35).length;
    const low = withSale.filter(o => calcMargin(o) < 0.2).length;
    return {
      role: "bot", text: "Margin summary across all orders:",
      stats: [
        { label: "Average Margin", value: pct(avg), color: avg > 0.3 ? GREEN : avg > 0.2 ? GOLD : R },
        { label: "Above 35%", value: String(high), color: GREEN },
        { label: "Below 20%", value: String(low), color: R },
      ],
    };
  }

  // ── low / high margin ──────────────────────────────────────────────────────
  if (/\b(low|poor|bad)\s+margin\b/i.test(q) || /margin\s+below\s+(\d+)/i.test(q)) {
    const threshMatch = q.match(/margin\s+below\s+(\d+)/i);
    const thresh = threshMatch ? parseInt(threshMatch[1]) / 100 : 0.2;
    const low = orders.filter(o => o.saleValue > 0 && calcMargin(o) < thresh).sort((a, b) => calcMargin(a) - calcMargin(b));
    if (!low.length) return { role: "bot", text: `No orders with margin below ${pct(thresh)}.` };
    return {
      role: "bot", text: `**${low.length}** orders with margin below ${pct(thresh)}:`,
      table: { headers: ["Invoice", "Client", "Sale Value", "Margin"], rows: low.map(o => [o.id, o.clientName, fmt(o.saleValue), pct(calcMargin(o))]) },
    };
  }

  // ── overdue orders ─────────────────────────────────────────────────────────
  if (/\b(overdue|late|past due|missed deadline)\b/i.test(q)) {
    const active = orders.filter(o => o.stage !== "delivered" && o.stage !== "delivered_pending");
    const hp = /high priority|urgent/i.test(q);
    let overdue = active.filter(o => o.dueDate && daysUntil(o.dueDate) < 0);
    if (hp) overdue = overdue.filter(o => o.priority === "High");
    if (!overdue.length) return { role: "bot", text: "No overdue active orders. 🎉" };
    return {
      role: "bot", text: `**${overdue.length}** overdue order${overdue.length > 1 ? "s" : ""}${hp ? " (high priority)" : ""}:`,
      table: { headers: ["Invoice", "Client", "Stage", "Days Overdue"], rows: overdue.map(o => [o.id, o.clientName, STAGE_LABELS[o.stage] || o.stage, String(Math.abs(daysUntil(o.dueDate!))) + "d"]) },
    };
  }

  // ── pending payment ────────────────────────────────────────────────────────
  if (/\b(pending payment|payment pending|unpaid|awaiting payment)\b/i.test(q)) {
    const pending = orders.filter(o => o.stage === "delivered_pending");
    if (!pending.length) return { role: "bot", text: "No orders pending payment." };
    const total = pending.reduce((s, o) => s + o.saleValue, 0);
    return {
      role: "bot", text: `**${pending.length}** orders awaiting payment — **${fmt(total)}** outstanding:`,
      table: { headers: ["Invoice", "Client", "Value", "Delivery Date"], rows: pending.map(o => [o.id, o.clientName, fmt(o.saleValue), o.deliveryDate ? o.deliveryDate.slice(0, 10) : "—"]) },
    };
  }

  // ── high priority ──────────────────────────────────────────────────────────
  if (/\b(high priority|urgent|priority)\b/i.test(q)) {
    const hp = orders.filter(o => o.priority === "High" && o.stage !== "delivered" && o.stage !== "delivered_pending");
    if (!hp.length) return { role: "bot", text: "No active high priority orders." };
    return {
      role: "bot", text: `**${hp.length}** active high priority order${hp.length > 1 ? "s" : ""}:`,
      table: { headers: ["Invoice", "Client", "Stage", "Due"], rows: hp.map(o => [o.id, o.clientName, STAGE_LABELS[o.stage] || o.stage, o.dueDate ? o.dueDate.slice(0, 10) : "—"]) },
    };
  }

  // ── orders by stage ────────────────────────────────────────────────────────
  const stageMap: Record<string, string> = { enquiry: "enquiry", design: "design", sampling: "sampling", production: "production", "qc": "qc", "quality": "qc", "finishing": "qc", dispatch: "dispatch", dispatched: "dispatch", delivered: "delivered" };
  const stageHit = Object.keys(stageMap).find(k => new RegExp(`\\b${k}\\b`, "i").test(q));
  if (stageHit) {
    const stageId = stageMap[stageHit];
    const matches = orders.filter(o => o.stage === stageId);
    if (!matches.length) return { role: "bot", text: `No orders in **${STAGE_LABELS[stageId]}** stage.` };
    return {
      role: "bot", text: `**${matches.length}** order${matches.length > 1 ? "s" : ""} in **${STAGE_LABELS[stageId]}**:`,
      table: { headers: ["Invoice", "Client", "Product", "Value"], rows: matches.map(o => [o.id, o.clientName, getProductDisplay(o.product), fmt(o.saleValue)]) },
    };
  }

  // ── active orders ──────────────────────────────────────────────────────────
  if (/\bactive orders?\b/i.test(q)) {
    const active = orders.filter(o => o.stage !== "delivered" && o.stage !== "delivered_pending");
    return {
      role: "bot", text: `**${active.length}** active orders:`,
      table: { headers: ["Invoice", "Client", "Stage", "Value"], rows: active.map(o => [o.id, o.clientName, STAGE_LABELS[o.stage] || o.stage, fmt(o.saleValue)]) },
    };
  }

  // ── orders by segment ──────────────────────────────────────────────────────
  const segMap: Record<string, string> = { reseller: "Reseller", sports: "Sports", education: "Education", corporate: "Corporate", ngo: "NGO_Govt", govt: "NGO_Govt", b2c: "B2C" };
  const segHit = Object.keys(segMap).find(k => new RegExp(`\\b${k}\\b`, "i").test(q));
  if (segHit) {
    const segId = segMap[segHit];
    const matches = orders.filter(o => o.segment === segId);
    const total = matches.reduce((s, o) => s + o.saleValue, 0);
    if (!matches.length) return { role: "bot", text: `No orders in **${SEG_LABELS[segId]}** segment.` };
    return {
      role: "bot", text: `**${matches.length}** orders in **${SEG_LABELS[segId]}** — ${fmt(total)} total:`,
      table: { headers: ["Invoice", "Client", "Value", "Stage"], rows: matches.map(o => [o.id, o.clientName, fmt(o.saleValue), STAGE_LABELS[o.stage] || o.stage]) },
    };
  }

  // ── top clients ────────────────────────────────────────────────────────────
  if (/\b(top|best|biggest|largest)\s*(\d+)?\s*clients?\b/i.test(q)) {
    const nMatch = q.match(/\d+/);
    const n = nMatch ? parseInt(nMatch[0]) : 5;
    const sorted = [...clients].sort((a, b) => b.totalValue - a.totalValue).slice(0, n);
    return {
      role: "bot", text: `Top **${n}** clients by order value:`,
      table: { headers: ["Client", "Orders", "Total Value", "Segment"], rows: sorted.map(c => [c.name, String(c.orderCount), fmt(c.totalValue), SEG_LABELS[c.segment] || c.segment]) },
    };
  }

  // ── total clients ──────────────────────────────────────────────────────────
  if (/\b(how many|total|count).{0,10}clients?\b/i.test(q)) {
    return {
      role: "bot", text: `You have **${clients.length}** clients.`,
      stats: Object.entries(
        clients.reduce((acc, c) => { acc[c.segment] = (acc[c.segment] || 0) + 1; return acc; }, {} as Record<string, number>)
      ).map(([seg, count]) => ({ label: SEG_LABELS[seg] || seg, value: String(count) })),
    };
  }

  // ── find client ────────────────────────────────────────────────────────────
  if (/\b(find|search|lookup|show)\s+client\b/i.test(q) || /\bclient\b.{0,20}\b(details?|info|data)\b/i.test(q)) {
    const words = q.replace(/find|search|lookup|show|client|details?|info|data/gi, "").trim();
    if (words.length > 2) {
      const matches = clients.filter(c => c.name.toLowerCase().includes(words.toLowerCase()));
      if (!matches.length) return { role: "bot", text: `No client found matching "${words}".` };
      return {
        role: "bot", text: `Found **${matches.length}** client${matches.length > 1 ? "s" : ""}:`,
        table: { headers: ["Name", "Segment", "Orders", "Total Value", "City"], rows: matches.map(c => [c.name, SEG_LABELS[c.segment] || c.segment, String(c.orderCount), fmt(c.totalValue), c.city || "—"]) },
      };
    }
  }

  // ── orders for [client] ────────────────────────────────────────────────────
  const clientMatch = q.match(/\borders?\s+(?:for|by|from)\s+(.{3,})/i) || q.match(/(.{3,})\s+orders?/i);
  if (clientMatch) {
    const name = clientMatch[1].trim();
    const matches = orders.filter(o => o.clientName.toLowerCase().includes(name.toLowerCase()));
    if (matches.length) {
      const total = matches.reduce((s, o) => s + o.saleValue, 0);
      return {
        role: "bot", text: `**${matches.length}** orders matching "${name}" — ${fmt(total)} total:`,
        table: { headers: ["Invoice", "Client", "Value", "Stage"], rows: matches.map(o => [o.id, o.clientName, fmt(o.saleValue), STAGE_LABELS[o.stage] || o.stage]) },
      };
    }
  }

  // ── products ───────────────────────────────────────────────────────────────
  if (/\b(list|show|all)\s+products?\b/i.test(q) || /\bproducts?\s+(list|catalog)\b/i.test(q)) {
    const active = products.filter(p => p.active);
    return {
      role: "bot", text: `**${active.length}** active products in catalog:`,
      table: { headers: ["Product", "Category", "Base Price"], rows: active.map(p => [p.name, p.category, fmt(p.basePrice)]) },
    };
  }

  // ── keyword fallback search ────────────────────────────────────────────────
  const keywords = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const orderHits = orders.filter(o =>
    keywords.some(kw => o.clientName.toLowerCase().includes(kw) || o.id.toLowerCase().includes(kw) || getProductDisplay(o.product).toLowerCase().includes(kw))
  );
  const clientHits = clients.filter(c => keywords.some(kw => c.name.toLowerCase().includes(kw)));

  if (orderHits.length || clientHits.length) {
    logUnknown(q);
    const parts: ChatMsg = {
      role: "bot",
      text: `I'm not sure what you meant, but here's what I found searching for "${q}":`,
    };
    if (orderHits.length) {
      parts.table = {
        headers: ["Invoice", "Client", "Value", "Stage"],
        rows: orderHits.slice(0, 8).map(o => [o.id, o.clientName, fmt(o.saleValue), STAGE_LABELS[o.stage] || o.stage]),
      };
    }
    return parts;
  }

  // ── truly unknown ─────────────────────────────────────────────────────────
  logUnknown(q);
  return {
    role: "bot",
    text: `I don't know how to answer that yet.\n\nYou can teach me:\n\`teach: ${q} = [known command]\`\n\nOr type **help** to see what I can answer.`,
  };
}

// ── UI ────────────────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "bot", text: "Hi! Ask me anything about your orders, clients, or products. Type **help** to see what I can do." },
  ]);
  const [input, setInput] = useState("");
  const [data, setData] = useState<CRMData | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !data) {
      setLoading(true);
      Promise.all([fetch("/api/orders"), fetch("/api/clients"), fetch("/api/products")])
        .then(([o, c, p]) => Promise.all([o.json(), c.json(), p.json()]))
        .then(([orders, clients, products]) => {
          setData({ orders, clients, products: products.map((p: Product) => ({ ...p, basePrice: Number(p.basePrice) })) });
          setLoading(false);
        });
    }
  }, [open, data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const q = input.trim();
    if (!q || !data) return;
    setInput("");
    const userMsg: ChatMsg = { role: "user", text: q };
    const botMsg = runQuery(q, data);
    setMessages(m => [...m, userMsg, botMsg]);
  }

  function renderText(text: string) {
    // Simple markdown: **bold**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>
    );
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 2000,
          width: 52, height: 52, borderRadius: "50%",
          background: R, border: "none", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(238,60,48,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, color: WHITE, transition: "transform 0.15s",
        }}
        title="CRM Assistant"
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 88, right: 24, zIndex: 1999,
          width: 420, height: 560, background: WHITE,
          borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: `1px solid ${BORDER}`,
        }}>
          {/* Header */}
          <div style={{ background: R, padding: "14px 18px", flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>CRM Assistant</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              {loading ? "Loading your data…" : data ? `${data.orders.length} orders · ${data.clients.length} clients loaded` : "Opening…"}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%", padding: "8px 12px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: m.role === "user" ? R : BG,
                  color: m.role === "user" ? WHITE : BLACK,
                  fontSize: 12, lineHeight: 1.5,
                }}>
                  {m.text.split("\n").map((line, j) => (
                    <div key={j} style={{ marginBottom: j < m.text.split("\n").length - 1 ? 4 : 0 }}>
                      {renderText(line)}
                    </div>
                  ))}
                </div>

                {/* Stats */}
                {m.stats && m.stats.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, maxWidth: "100%" }}>
                    {m.stats.map((s, j) => (
                      <div key={j} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", minWidth: 80 }}>
                        <div style={{ fontSize: 9, color: MID, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: s.color || BLACK, marginTop: 2 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Table */}
                {m.table && (
                  <div style={{ marginTop: 6, width: "100%", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: BLACK }}>
                          {m.table.headers.map((h, j) => (
                            <th key={j} style={{ padding: "5px 8px", textAlign: "left", color: WHITE, fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {m.table.rows.map((row, j) => (
                          <tr key={j} style={{ background: j % 2 === 0 ? WHITE : BG }}>
                            {row.map((cell, k) => (
                              <td key={k} style={{ padding: "5px 8px", borderBottom: `1px solid ${BORDER}`, color: k === 0 ? R : BLACK, fontWeight: k === 0 ? 600 : 400 }}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 8, flexShrink: 0 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder={loading ? "Loading data…" : "Ask something…"}
              disabled={loading || !data}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 20, border: `1px solid ${BORDER}`,
                fontSize: 12, outline: "none", background: BG,
              }}
            />
            <button onClick={send} disabled={loading || !data || !input.trim()}
              style={{
                padding: "8px 14px", borderRadius: 20, background: input.trim() && data ? R : BORDER,
                color: WHITE, border: "none", cursor: input.trim() && data ? "pointer" : "default",
                fontSize: 12, fontWeight: 600, transition: "background 0.15s",
              }}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
