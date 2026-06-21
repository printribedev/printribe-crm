"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, LabelList,
} from "recharts";
import {
  PRIMARY, SUCCESS, ERROR, WARNING, GOLD, PURPLE, ORANGE, TEAL, PINK,
  INK, BODY, MID, MUTED, WHITE, SURFACE, SURFACE2, BORDER, SHADOW_SM, SHADOW_MD,
  R_SM, R_MD,
  GLASS_DARK_BG, GLASS_DARK_BORDER, GLASS_BLUR_SM,
  GRAD_HERO, GRAD_PRIMARY, GRAD_SUCCESS, GRAD_WARNING, GRAD_DANGER, GRAD_TEAL, GRAD_GOLD,
} from "@/lib/tokens";

const SEG_COLORS: Record<string, string> = {
  Reseller: ERROR, Sports: PRIMARY, Education: SUCCESS,
  Corporate: GOLD, NGO_Govt: PURPLE, B2C: ORANGE,
};
const SEG_LABELS: Record<string, string> = {
  Reseller: "Reseller", Sports: "Sports", Education: "Education",
  Corporate: "Corporate", NGO_Govt: "NGO/Govt", B2C: "B2C",
};
const CHART_PALETTE = [ERROR, PRIMARY, SUCCESS, GOLD, PURPLE, ORANGE, TEAL, PINK, MID];

type Order = {
  id: string; clientId: number | null; clientName: string; product: string;
  segment: string; stage: string; priority: string;
  saleValue: number; gst: number; fabric: number; printing: number; transport: number;
  misc: number; jobWork: number; packaging: number; design: number; ribCost: number;
  date: string; dueDate: string | null; deliveryDate: string | null;
};
type ClientStat = { id: number; name: string; segment: string; totalValue: number };

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const pct = (n: number) => (n * 100).toFixed(1) + "%";

function normalizeProductName(name: string, canonicalNames: string[]): string {
  const lower = name.trim().toLowerCase();
  return canonicalNames.find(c => c.toLowerCase() === lower) ?? name;
}

function parseProductItems(product: string): { name: string; weight: number }[] {
  try {
    const parsed = JSON.parse(product);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const total = parsed.reduce((s: number, p: { qty: number; unitPrice: number }) => s + p.qty * p.unitPrice, 0);
      return parsed.map((p: { name: string; qty: number; unitPrice: number }) => ({
        name: p.name,
        weight: total > 0 ? (p.qty * p.unitPrice) / total : 1 / parsed.length,
      }));
    }
  } catch { /* plain string */ }
  return [{ name: product, weight: 1 }];
}

function orderCost(o: Order) {
  return o.fabric + o.printing + o.transport + o.misc + o.jobWork + o.packaging + o.design + (o.ribCost || 0);
}
function calcMargin(o: Order) {
  return o.saleValue > 0 ? (o.saleValue - orderCost(o)) / o.saleValue : 0;
}
function marginColor(m: number) { return m > 0.25 ? SUCCESS : m >= 0.15 ? WARNING : ERROR; }
function marginGrad(m: number) { return m > 0.25 ? GRAD_SUCCESS : m >= 0.15 ? GRAD_WARNING : GRAD_DANGER; }

const PERIODS = ["This month", "Last 3 months", "Last 6 months", "FY 26-27", "All time"];

function analyticsDate(o: Order): Date { return new Date(o.deliveryDate ?? o.date); }

function filterOrders(orders: Order[], period: string): Order[] {
  const now = new Date();
  const msAgo = (months: number) => { const d = new Date(now); d.setMonth(d.getMonth() - months); return d; };
  switch (period) {
    case "This month":
      return orders.filter(o => { const d = analyticsDate(o); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    case "Last 3 months":
      return orders.filter(o => analyticsDate(o) >= msAgo(3));
    case "Last 6 months":
      return orders.filter(o => analyticsDate(o) >= msAgo(6));
    case "FY 26-27":
      return orders.filter(o => { const d = analyticsDate(o); const fy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return fy === 2026; });
    default:
      return orders;
  }
}

function toMonthlyData(orders: Order[]) {
  const map: Record<string, { sales: number; cost: number; count: number; ts: number }> = {};
  orders.forEach(o => {
    const d = analyticsDate(o);
    const key = d.toLocaleDateString("en-IN", { month: "short" }) + " " + String(d.getFullYear()).slice(2);
    const ts = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    if (!map[key]) map[key] = { sales: 0, cost: 0, count: 0, ts };
    map[key].sales += o.saleValue;
    map[key].cost += orderCost(o);
    map[key].count += 1;
  });
  return Object.entries(map).map(([month, v]) => {
    const profit = v.sales - v.cost;
    const margin = v.sales > 0 ? (profit / v.sales) * 100 : 0;
    return { month, sales: v.sales, cost: v.cost, profit, margin, count: v.count, ts: v.ts };
  }).sort((a, b) => a.ts - b.ts);
}

// Glass KPI card — sits on the dark hero band
function GlassKpiCard({ label, value, sub, accent = PRIMARY, gradient, badge, badgeColor = SUCCESS }: {
  label: string; value: string | number; sub?: string;
  accent?: string; gradient?: string; badge?: string; badgeColor?: string;
}) {
  return (
    <div style={{
      background: GLASS_DARK_BG,
      backdropFilter: GLASS_BLUR_SM,
      WebkitBackdropFilter: GLASS_BLUR_SM,
      border: `1px solid ${GLASS_DARK_BORDER}`,
      borderRadius: R_MD + 2,
      padding: "18px 20px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: gradient ?? accent, flexShrink: 0 }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", color: WHITE, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 5, lineHeight: 1.4 }}>{sub}</div>}
      {badge && (
        <div style={{
          display: "inline-flex", alignItems: "center", marginTop: 8,
          fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: R_SM,
          background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", letterSpacing: "0.02em",
        }}>{badge}</div>
      )}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: WHITE, borderRadius: R_MD, boxShadow: SHADOW_SM,
      border: `1px solid ${BORDER}`, ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: INK, letterSpacing: "-0.01em" }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ToggleGroup<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, background: SURFACE2, borderRadius: R_SM, padding: 3 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 5, cursor: "pointer",
          border: "none",
          background: value === o.value ? WHITE : "transparent",
          color: value === o.value ? INK : MID,
          boxShadow: value === o.value ? SHADOW_SM : "none",
          transition: "all 120ms ease",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

// Gradient bar shape for recharts
const GradientBar = (props: { x?: number; y?: number; width?: number; height?: number; fill?: string; gradient?: string }) => {
  const { x = 0, y = 0, width = 0, height = 0, gradient = GRAD_PRIMARY } = props;
  const id = `grad-${Math.random().toString(36).slice(2, 6)}`;
  const [c1, c2] = gradient.replace(/linear-gradient\(135deg,\s*/, "").replace(/\s*\)$/, "").split(",").map(s => s.trim().split(" ")[0]);
  return (
    <svg>
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={c2 || c1} />
          <stop offset="100%" stopColor={c1} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={width} height={height} rx={4} fill={`url(#${id})`} />
    </svg>
  );
};

export default function DashboardPage() {
  const [period, setPeriod] = useState("FY 26-27");
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<ClientStat[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [marginSort, setMarginSort] = useState<"asc" | "desc">("desc");
  const [segView, setSegView] = useState<"client" | "product">("client");

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(d => {
      setOrders(d.orders);
      setClients(d.clients);
      setProductNames(d.productNames ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingScreen />;

  const filtered = filterOrders(orders, period);
  const monthlyData = toMonthlyData(filtered);

  const totalRevenue = filtered.reduce((s, o) => s + o.saleValue, 0);
  const totalGst = filtered.reduce((s, o) => s + o.gst, 0);
  const totalProfit = filtered.reduce((s, o) => s + (o.saleValue - orderCost(o)), 0);
  const avgMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const activeJobs = filtered.filter(o => o.stage !== "delivered" && o.stage !== "delivered_pending").length;
  const pendingPayment = filtered.filter(o => o.stage === "delivered_pending").length;
  const avgOrderValue = filtered.length ? totalRevenue / filtered.length : 0;
  const overdue = filtered.filter(o => o.stage !== "delivered" && o.stage !== "delivered_pending" && o.dueDate && new Date(o.dueDate) < new Date()).length;

  const segMap: Record<string, number> = {};
  filtered.forEach(o => { segMap[o.segment] = (segMap[o.segment] || 0) + o.saleValue; });
  const segByClient = Object.entries(segMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const prodMap: Record<string, number> = {};
  filtered.forEach(o => {
    parseProductItems(o.product).forEach(item => {
      const canonical = normalizeProductName(item.name, productNames);
      prodMap[canonical] = (prodMap[canonical] || 0) + o.saleValue * item.weight;
    });
  });
  const segByProduct = Object.entries(prodMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const segData = segView === "client" ? segByClient : segByProduct;

  const clientOrderValue: Record<number, number> = {};
  filtered.forEach(o => {
    const c = o.clientId
      ? clients.find(c => c.id === o.clientId)
      : clients.find(c => c.name.trim().toLowerCase() === o.clientName.trim().toLowerCase());
    if (c) clientOrderValue[c.id] = (clientOrderValue[c.id] || 0) + o.saleValue;
  });
  const topClients = clients
    .filter(c => clientOrderValue[c.id] > 0)
    .map(c => ({ ...c, periodValue: clientOrderValue[c.id] || 0 }))
    .sort((a, b) => b.periodValue - a.periodValue)
    .slice(0, 10);
  const topMax = topClients[0]?.periodValue || 1;

  const clientMarginMap: Record<string, { revenue: number; profit: number }> = {};
  filtered.forEach(o => {
    const key = o.clientName;
    if (!clientMarginMap[key]) clientMarginMap[key] = { revenue: 0, profit: 0 };
    clientMarginMap[key].revenue += o.saleValue;
    clientMarginMap[key].profit += o.saleValue - orderCost(o);
  });
  const marginData = Object.entries(clientMarginMap)
    .map(([name, { revenue, profit }]) => ({
      name: name.split(" ")[0],
      fullName: name,
      margin: revenue > 0 ? parseFloat(((profit / revenue) * 100).toFixed(1)) : 0,
      raw: revenue > 0 ? profit / revenue : 0,
    }))
    .sort((a, b) => marginSort === "desc" ? b.margin - a.margin : a.margin - b.margin);

  const tooltipStyle: React.CSSProperties = {
    background: WHITE, border: `1px solid ${BORDER}`, borderRadius: R_SM,
    padding: "10px 14px", fontSize: 12, boxShadow: SHADOW_MD,
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        @keyframes heroShimmer { 0%,100%{opacity:1} 50%{opacity:0.8} }
      `}</style>

      {/* Dark hero band */}
      <div style={{
        background: GRAD_HERO,
        padding: "28px 32px 32px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle ambient glow */}
        <div style={{ position: "absolute", width: 600, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)", top: -100, right: 100, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 400, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)", bottom: -80, left: 200, pointerEvents: "none" }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: WHITE, letterSpacing: "-0.03em" }}>Dashboard</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
              Printribe CRM · {orders.length} orders total
            </div>
          </div>
          <div style={{
            display: "flex", gap: 3,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: R_SM, padding: 4,
            backdropFilter: GLASS_BLUR_SM,
            WebkitBackdropFilter: GLASS_BLUR_SM,
          }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                fontSize: 11, fontWeight: 500, padding: "6px 12px", borderRadius: R_SM - 1,
                border: "none",
                background: period === p ? "rgba(255,255,255,0.15)" : "transparent",
                color: period === p ? WHITE : "rgba(255,255,255,0.5)",
                cursor: "pointer",
                transition: "all 120ms ease",
              }}>{p}</button>
            ))}
          </div>
        </div>

        {/* Glass KPI row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12, position: "relative", zIndex: 1 }}>
          <GlassKpiCard label="Revenue (excl. GST)" value={fmt(totalRevenue)} sub={`${filtered.length} orders`} gradient={GRAD_PRIMARY} />
          <GlassKpiCard label="GST Collected" value={fmt(totalGst)} sub="Incl. in invoices" gradient={GRAD_TEAL} badge="Tax" />
          <GlassKpiCard label="Avg Order Value" value={fmt(avgOrderValue)} sub="Per invoice" gradient={GRAD_GOLD} />
          <GlassKpiCard label="Avg Gross Margin" value={pct(avgMargin)} sub="All orders in period"
            gradient={avgMargin > 0.25 ? GRAD_SUCCESS : avgMargin >= 0.15 ? GRAD_WARNING : GRAD_DANGER}
            badge={avgMargin > 0.25 ? "Healthy" : avgMargin >= 0.15 ? "Watch" : "Below target"} />
        </div>

        {/* Glass KPI row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, position: "relative", zIndex: 1 }}>
          <GlassKpiCard label="Active Jobs" value={activeJobs} sub="Not yet delivered" gradient={GRAD_WARNING} badge="Live" />
          <GlassKpiCard label="Payment Pending" value={pendingPayment} sub="Delivered, awaiting pay"
            badge={pendingPayment > 0 ? "Follow up" : "All clear"} />
          <GlassKpiCard label="Overdue Orders" value={overdue} sub="Past due date"
            gradient={overdue > 0 ? GRAD_DANGER : GRAD_SUCCESS}
            badge={overdue > 0 ? "Action needed" : "On track"} />
          <GlassKpiCard label="Total Clients" value={clients.length}
            sub={`${clients.filter(c => (clientOrderValue[c.id] || 0) > 0).length} active this period`} gradient={GRAD_PRIMARY} />
        </div>
      </div>

      {/* Chart section */}
      <div style={{ padding: "24px 32px", maxWidth: 1400 }}>
        {/* Revenue trend + Segment mix */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
          <Card style={{ padding: 24 }}>
            <SectionTitle title="Revenue trend" sub={`Monthly sale value (excl. GST) · ${period}`} />
            {monthlyData.length === 0 ? (
              <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 13 }}>
                No orders in this period yet.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} barSize={26}>
                    <defs>
                      <linearGradient id="profitGrad" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#0D9488" />
                      </linearGradient>
                      <linearGradient id="costGrad" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#E2E8F0" />
                        <stop offset="100%" stopColor="#F1F5F9" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: MID }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: MID }} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 100000 ? (v / 100000).toFixed(1) + "L" : (v / 1000).toFixed(0) + "K"} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const d = monthlyData.find(m => m.month === label);
                        return (
                          <div style={tooltipStyle}>
                            <div style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>{label}</div>
                            <div style={{ color: MID, marginBottom: 2 }}>Revenue: <b style={{ color: INK }}>{fmt(d?.sales ?? 0)}</b></div>
                            <div style={{ color: MID, marginBottom: 2 }}>Profit: <b style={{ color: SUCCESS }}>{fmt(d?.profit ?? 0)}</b></div>
                            <div style={{ color: MID }}>Margin: <b style={{ color: marginColor((d?.margin ?? 0) / 100) }}>{(d?.margin ?? 0).toFixed(1)}%</b></div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="cost" stackId="a" fill="url(#costGrad)" radius={[0, 0, 0, 0]} name="Cost" />
                    <Bar dataKey="profit" stackId="a" fill="url(#profitGrad)" radius={[4, 4, 0, 0]} name="Profit">
                      <LabelList
                        dataKey="margin"
                        position="top"
                        formatter={(v) => Number(v) > 0 ? Number(v).toFixed(0) + "%" : ""}
                        style={{ fontSize: 9, fontWeight: 700, fill: MID }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                  {[[SUCCESS, "Profit"], [SURFACE2, "Cost"]].map(([c, l]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: MID }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: c, border: `1px solid ${BORDER}` }} />{l}
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <SectionTitle title="Segment mix" sub={`Revenue · ${period}`} />
              <ToggleGroup
                options={[{ value: "client" as const, label: "Client" }, { value: "product" as const, label: "Product" }]}
                value={segView}
                onChange={setSegView}
              />
            </div>
            {segData.length === 0 ? (
              <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 13 }}>No data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={segData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3}>
                      {segData.map((e, i) => {
                        const fill = segView === "client" ? (SEG_COLORS[e.name] || MID) : CHART_PALETTE[i % CHART_PALETTE.length];
                        return <Cell key={e.name} fill={fill} />;
                      })}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 12px", marginTop: 8 }}>
                  {segData.map((s, i) => {
                    const color = segView === "client" ? (SEG_COLORS[s.name] || MID) : CHART_PALETTE[i % CHART_PALETTE.length];
                    return (
                      <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                        <span style={{ color: MID }}>{segView === "client" ? (SEG_LABELS[s.name] || s.name) : s.name}</span>
                        <span style={{ fontWeight: 700, color: INK }}>{pct(s.value / (totalRevenue || 1))}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Margin per client + Top clients */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <SectionTitle title="Avg margin per client" sub={period} />
              <ToggleGroup
                options={[{ value: "desc" as const, label: "High → Low" }, { value: "asc" as const, label: "Low → High" }]}
                value={marginSort}
                onChange={setMarginSort}
              />
            </div>
            {marginData.length === 0 ? (
              <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 13 }}>No data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={Math.max(140, marginData.length * 24)}>
                  <BarChart data={marginData} barSize={16}>
                    <defs>
                      {marginData.map((d, i) => {
                        const [c1, c2] = marginGrad(d.raw).replace(/linear-gradient\(135deg,\s*/, "").replace(/\s*\)$/, "").split(",").map(s => s.trim().split(" ")[0]);
                        return (
                          <linearGradient key={i} id={`mg${i}`} x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor={c2 || c1} />
                            <stop offset="100%" stopColor={c1} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: MID }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: MID }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip formatter={(v, _, props) => [Number(v).toFixed(1) + "%", props.payload?.fullName || ""]} contentStyle={tooltipStyle} />
                    <Bar dataKey="margin" radius={[4, 4, 0, 0]}>
                      {marginData.map((d, i) => <Cell key={i} fill={`url(#mg${i})`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                  {[[SUCCESS, "> 25%"], [WARNING, "15–25%"], [ERROR, "< 15%"]].map(([c, l]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: MID }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card style={{ padding: 24 }}>
            <SectionTitle title={`Top clients · ${period}`} />
            {topClients.length === 0 ? (
              <div style={{ color: MUTED, fontSize: 13 }}>No client data for this period.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {topClients.map((c, i) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, width: 20, flexShrink: 0, textAlign: "right" }}>#{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: BODY }}>{c.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{fmt(c.periodValue)}</span>
                      </div>
                      <div style={{ height: 4, background: SURFACE2, borderRadius: 2 }}>
                        <div style={{
                          width: `${(c.periodValue / topMax) * 100}%`, height: "100%",
                          background: SEG_COLORS[c.segment] || PRIMARY, borderRadius: 2,
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
