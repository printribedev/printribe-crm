"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { usePermissions } from "@/context/PermissionsContext";
import { ResponsiveSankey } from "@nivo/sankey";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, LabelList,
} from "recharts";
import {
  PRIMARY, PRIMARY_LIGHT, SUCCESS, ERROR, WARNING, GOLD, PURPLE, ORANGE, TEAL, PINK,
  INK, BODY, MID, MUTED, WHITE, SURFACE, SURFACE2, BORDER, SHADOW_SM, SHADOW_MD,
  R_SM, R_MD,
  GRAD_PRIMARY, GRAD_SUCCESS, GRAD_WARNING, GRAD_DANGER, GRAD_TEAL, GRAD_GOLD,
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

// Compact glass KPI card — Dashboard skill: 8pt grid, tight data hierarchy
function KpiCard({ label, value, sub, gradient = GRAD_PRIMARY, badge, badgeColor = SUCCESS }: {
  label: string; value: string | number; sub?: string;
  gradient?: string; badge?: string; badgeColor?: string;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.76)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.85)",
      boxShadow: "0 0 0 0.5px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.06)",
      padding: "14px 16px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: gradient }} />
      <div style={{ fontSize: 9.5, fontWeight: 600, color: MID, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: INK, lineHeight: 1.1 }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        {sub && <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.3 }}>{sub}</div>}
        {badge && (
          <div style={{
            fontSize: 9.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
            background: badgeColor + "18", color: badgeColor, letterSpacing: "0.02em", flexShrink: 0, marginLeft: 4,
          }}>{badge}</div>
        )}
      </div>
    </div>
  );
}

// Glass chart card
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.78)",
      backdropFilter: "blur(16px) saturate(160%)",
      WebkitBackdropFilter: "blur(16px) saturate(160%)",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.85)",
      boxShadow: "0 0 0 0.5px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: INK, letterSpacing: "-0.01em" }}>{title}</div>
      {sub && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{sub}</div>}
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

type HeatCell = { rev: number; cost: number };
type HeatProduct = { name: string; total: number; months: Record<string, HeatCell> };

function HeatmapCard({ products, months, heatMax, period, fmt, tooltipStyle }: {
  products: HeatProduct[];
  months: string[];
  heatMax: number;
  period: string;
  fmt: (n: number) => string;
  tooltipStyle: React.CSSProperties;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; below: boolean; product: string; month: string; rev: number; margin: number } | null>(null);

  return (
    <Card style={{ padding: 16, marginTop: 12 }}>
      <SectionTitle title="Revenue by product mix" sub={`Monthly revenue intensity · ${period} · top ${products.length} products`} />
      <div data-heatmap="1" style={{ overflowX: "auto", position: "relative" }}>
        <div style={{ minWidth: 480 }}>
          {/* Month headers */}
          <div style={{ display: "grid", gridTemplateColumns: `148px repeat(${months.length}, 1fr)`, gap: 3, marginBottom: 3 }}>
            <div />
            {months.map(m => (
              <div key={m} style={{ fontSize: 9, fontWeight: 600, color: MUTED, textAlign: "center", letterSpacing: "0.04em", textTransform: "uppercase", paddingBottom: 4 }}>{m}</div>
            ))}
          </div>
          {/* Product rows */}
          {products.map(p => (
            <div key={p.name} style={{ display: "grid", gridTemplateColumns: `148px repeat(${months.length}, 1fr)`, gap: 3, marginBottom: 3, alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: BODY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }} title={p.name}>{p.name}</div>
              {months.map(m => {
                const cell = p.months[m];
                const rev = cell?.rev || 0;
                const intensity = rev / heatMax;
                const alpha = intensity < 0.05 ? 0.06 : 0.12 + intensity * 0.78;
                const margin = cell && cell.rev > 0 ? (cell.rev - cell.cost) / cell.rev : null;
                return (
                  <div
                    key={m}
                    style={{
                      height: 28, borderRadius: 5,
                      background: rev > 0 ? `rgba(79,70,229,${alpha.toFixed(2)})` : "rgba(0,0,0,0.03)",
                      border: rev > 0 ? `1px solid rgba(79,70,229,${(alpha * 0.4).toFixed(2)})` : "1px solid rgba(0,0,0,0.05)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: rev > 0 ? "pointer" : "default",
                      position: "relative",
                    }}
                    onMouseEnter={e => {
                      if (rev > 0) {
                        const el = e.currentTarget as HTMLElement;
                        const wrapper = el.closest("[data-heatmap]") as HTMLElement | null;
                        const rect = el.getBoundingClientRect();
                        const wRect = wrapper?.getBoundingClientRect();
                        const yInWrapper = rect.top - (wRect?.top || 0);
                        const below = yInWrapper < 90;
                        setTooltip({ x: rect.left - (wRect?.left || 0) + rect.width / 2, y: below ? yInWrapper + rect.height + 6 : yInWrapper - 6, below, product: p.name, month: m, rev, margin: margin ?? 0 });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {rev > 0 && intensity > 0.2 && (
                      <span style={{ fontSize: 8, fontWeight: 700, color: intensity > 0.55 ? WHITE : PRIMARY, letterSpacing: "-0.02em", pointerEvents: "none" }}>
                        {rev >= 100000 ? (rev / 100000).toFixed(1) + "L" : (rev / 1000).toFixed(0) + "K"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {/* Scale legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 9, color: MUTED }}>Low</span>
            {[0.06, 0.25, 0.45, 0.65, 0.85].map(a => (
              <div key={a} style={{ width: 18, height: 10, borderRadius: 2, background: `rgba(79,70,229,${a})` }} />
            ))}
            <span style={{ fontSize: 9, color: MUTED }}>High</span>
          </div>
        </div>

        {/* Hover tooltip */}
        {tooltip && (
          <div
            style={{
              ...tooltipStyle,
              position: "absolute",
              left: tooltip.x,
              top: tooltip.below ? tooltip.y : undefined,
              bottom: tooltip.below ? undefined : `calc(100% - ${tooltip.y}px)`,
              transform: "translateX(-50%)",
              pointerEvents: "none",
              zIndex: 50,
              whiteSpace: "nowrap",
              minWidth: 140,
            }}
          >
            <div style={{ fontWeight: 700, color: INK, marginBottom: 4, fontSize: 11 }}>{tooltip.product}</div>
            <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>{tooltip.month}</div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 11 }}>
              <span style={{ color: MID }}>Revenue</span>
              <span style={{ fontWeight: 700, color: INK }}>{fmt(tooltip.rev)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 11, marginTop: 2 }}>
              <span style={{ color: MID }}>Margin</span>
              <span style={{ fontWeight: 700, color: tooltip.margin > 0.25 ? SUCCESS : tooltip.margin >= 0.15 ? WARNING : ERROR }}>
                {(tooltip.margin * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function SankeyCard({ filtered, period, fmt }: { filtered: Order[]; period: string; fmt: (n: number) => string }) {
  const totalRev = filtered.reduce((s, o) => s + o.saleValue, 0);
  if (totalRev === 0) return null;

  const totalCost = filtered.reduce((s, o) => s + orderCost(o), 0);
  const totalProfit = totalRev - totalCost;

  const segMap: Record<string, number> = {};
  filtered.forEach(o => { segMap[o.segment] = (segMap[o.segment] || 0) + o.saleValue; });
  const segs = Object.entries(segMap).filter(([, v]) => v > 0);

  const costItems: [string, number, string][] = ([
    ["Fabric & Rib", filtered.reduce((s, o) => s + o.fabric + (o.ribCost || 0), 0), GOLD],
    ["Printing",     filtered.reduce((s, o) => s + o.printing, 0), ORANGE],
    ["Job Work",     filtered.reduce((s, o) => s + o.jobWork, 0), PURPLE],
    ["Transport",    filtered.reduce((s, o) => s + o.transport, 0), TEAL],
    ["Packaging",    filtered.reduce((s, o) => s + o.packaging, 0), PRIMARY_LIGHT],
    ["Design",       filtered.reduce((s, o) => s + o.design, 0), PINK],
    ["Misc",         filtered.reduce((s, o) => s + o.misc, 0), MID],
  ] as [string, number, string][]).filter(([, v]) => v > 0);

  // Build nivo sankey data
  const nodeColorMap: Record<string, string> = {
    Revenue: PRIMARY,
    "Gross Profit": SUCCESS,
    "Total Cost": ERROR,
  };
  segs.forEach(([s]) => { nodeColorMap[s] = SEG_COLORS[s] || MID; });
  costItems.forEach(([id,, c]) => { nodeColorMap[id] = c; });

  const nodes = [
    ...segs.map(([s]) => ({ id: s })),
    { id: "Revenue" },
    ...(totalProfit > 0 ? [{ id: "Gross Profit" }] : []),
    ...(totalCost   > 0 ? [{ id: "Total Cost" }]   : []),
    ...costItems.map(([id]) => ({ id })),
  ];

  const links = [
    ...segs.map(([s, v]) => ({ source: s, target: "Revenue", value: Math.round(v) })),
    ...(totalProfit > 0 ? [{ source: "Revenue", target: "Gross Profit", value: Math.round(totalProfit) }] : []),
    ...(totalCost   > 0 ? [{ source: "Revenue", target: "Total Cost",   value: Math.round(totalCost)   }] : []),
    ...costItems.map(([id, v]) => ({ source: "Total Cost", target: id, value: Math.round(v) })),
  ];

  return (
    <Card style={{ padding: 20, marginTop: 12 }}>
      <SectionTitle title="Revenue flow" sub={`Segment sources → gross profit & cost breakdown · ${period}`} />
      <div style={{ height: 420 }}>
        <ResponsiveSankey
          data={{ nodes, links }}
          margin={{ top: 10, right: 180, bottom: 10, left: 180 }}
          align="justify"
          colors={node => nodeColorMap[node.id] ?? MID}
          nodeOpacity={1}
          nodeThickness={14}
          nodeInnerPadding={3}
          nodeSpacing={10}
          nodeBorderWidth={0}
          nodeBorderRadius={3}
          linkOpacity={0.25}
          linkHoverOpacity={0.5}
          linkContract={2}
          enableLinkGradient
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={14}
          labelTextColor={INK}
          tooltip={({ node }) => (
            <div style={{
              background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8,
              padding: "8px 12px", fontSize: 12, boxShadow: SHADOW_MD,
            }}>
              <span style={{ fontWeight: 700, color: nodeColorMap[node.id] ?? INK }}>{node.id}</span>
              <span style={{ color: MUTED, marginLeft: 8 }}>{fmt(node.value)}</span>
            </div>
          )}
        />
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { showFinancials } = usePermissions();
  const [period, setPeriod] = useState("FY 26-27");
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<ClientStat[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [marginSort, setMarginSort] = useState<"asc" | "desc">("desc");

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
  const segData = segByClient;

  // Heatmap: top products × months (revenue + cost for margin)
  const allMonths = monthlyData.map(m => m.month);
  const prodMonthMap: Record<string, Record<string, { rev: number; cost: number }>> = {};
  filtered.forEach(o => {
    const d = analyticsDate(o);
    const month = d.toLocaleDateString("en-IN", { month: "short" }) + " " + String(d.getFullYear()).slice(2);
    const oCost = orderCost(o);
    parseProductItems(o.product).forEach(item => {
      const name = normalizeProductName(item.name, productNames);
      if (!prodMonthMap[name]) prodMonthMap[name] = {};
      if (!prodMonthMap[name][month]) prodMonthMap[name][month] = { rev: 0, cost: 0 };
      prodMonthMap[name][month].rev += o.saleValue * item.weight;
      prodMonthMap[name][month].cost += oCost * item.weight;
    });
  });
  const heatProducts = Object.entries(prodMonthMap)
    .map(([name, months]) => ({
      name,
      total: Object.values(months).reduce((s, v) => s + v.rev, 0),
      months,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  const heatMax = Math.max(...heatProducts.flatMap(p => Object.values(p.months).map(v => v.rev)), 1);

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
    <div className="page-pad" style={{ padding: "22px 28px", maxWidth: 1400 }}>
      {/* Header */}
      <div className="dash-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: INK, letterSpacing: "-0.03em" }}>Dashboard</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
            {orders.length} orders total
          </div>
        </div>
        <div className="dash-period-bar" style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: `1px solid ${BORDER}`, borderRadius: R_SM + 2, padding: 3, flexWrap: "wrap" }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} className="dash-period-btn" style={{
              fontSize: 10, fontWeight: 500, padding: "5px 10px", borderRadius: R_SM,
              border: "none",
              background: period === p ? WHITE : "transparent",
              color: period === p ? INK : MID,
              cursor: "pointer",
              boxShadow: period === p ? SHADOW_SM : "none",
              transition: "all 120ms ease",
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPI rows */}
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
        {showFinancials && <KpiCard label="Revenue (excl. GST)" value={fmt(totalRevenue)} sub={`${filtered.length} orders`} gradient={GRAD_PRIMARY} />}
        {showFinancials && <KpiCard label="GST Collected" value={fmt(totalGst)} sub="Incl. in invoices" gradient={GRAD_TEAL} badge="Tax" badgeColor={TEAL} />}
        {showFinancials && <KpiCard label="Avg Order Value" value={fmt(avgOrderValue)} sub="Per invoice" gradient={GRAD_GOLD} />}
        {showFinancials && <KpiCard label="Avg Gross Margin" value={pct(avgMargin)} sub="All orders in period"
          gradient={avgMargin > 0.25 ? GRAD_SUCCESS : avgMargin >= 0.15 ? GRAD_WARNING : GRAD_DANGER}
          badge={avgMargin > 0.25 ? "Healthy" : avgMargin >= 0.15 ? "Watch" : "Below target"}
          badgeColor={avgMargin > 0.25 ? SUCCESS : avgMargin >= 0.15 ? WARNING : ERROR} />}
      </div>
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        <KpiCard label="Active Jobs" value={activeJobs} sub="Not yet delivered" gradient={GRAD_WARNING} badge="Live" badgeColor={ORANGE} />
        <KpiCard label="Payment Pending" value={pendingPayment} sub="Delivered, awaiting pay"
          gradient={GRAD_PRIMARY}
          badge={pendingPayment > 0 ? "Follow up" : "All clear"} badgeColor={pendingPayment > 0 ? ERROR : SUCCESS} />
        <KpiCard label="Overdue Orders" value={overdue} sub="Past due date"
          gradient={overdue > 0 ? GRAD_DANGER : GRAD_SUCCESS}
          badge={overdue > 0 ? "Action needed" : "On track"} badgeColor={overdue > 0 ? ERROR : SUCCESS} />
        <KpiCard label="Total Clients" value={clients.length}
          sub={`${clients.filter(c => (clientOrderValue[c.id] || 0) > 0).length} active this period`} gradient={GRAD_PRIMARY} />
      </div>

      {/* Charts below */}
      <div>
        {/* Revenue trend + Segment mix */}
        {showFinancials && <div className="chart-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
          <Card style={{ padding: 16 }}>
            <SectionTitle title="Revenue trend" sub={`Monthly sale value (excl. GST) · ${period}`} />
            {monthlyData.length === 0 ? (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 13 }}>
                No orders in this period yet.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
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

          <Card style={{ padding: 16 }}>
            <SectionTitle title="Client segment mix" sub={`Revenue by segment · ${period}`} />
            {segData.length === 0 ? (
              <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 13 }}>No data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={148}>
                  <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <Pie data={segData} cx="50%" cy="50%" innerRadius={36} outerRadius={56} dataKey="value" paddingAngle={3}>
                      {segData.map((e) => <Cell key={e.name} fill={SEG_COLORS[e.name] || MID} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 12px", marginTop: 8 }}>
                  {segData.map((s) => (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: SEG_COLORS[s.name] || MID }} />
                      <span style={{ color: MID }}>{SEG_LABELS[s.name] || s.name}</span>
                      <span style={{ fontWeight: 700, color: INK }}>{pct(s.value / (totalRevenue || 1))}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>}

        {/* Margin per client + Top clients */}
        {showFinancials && <div className="chart-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
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

          <Card style={{ padding: 16 }}>
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
        </div>}

        {/* Product revenue heatmap */}
        {showFinancials && heatProducts.length > 0 && allMonths.length > 0 && (
          <HeatmapCard
            products={heatProducts}
            months={allMonths}
            heatMax={heatMax}
            period={period}
            fmt={fmt}
            tooltipStyle={tooltipStyle}
          />
        )}

        {/* Sankey revenue flow */}
        {showFinancials && filtered.length > 0 && (
          <SankeyCard filtered={filtered} period={period} fmt={fmt} />
        )}
      </div>
    </div>
  );
}

