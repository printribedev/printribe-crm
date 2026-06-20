"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, LineChart, Line, LabelList,
} from "recharts";

const R = "#EE3C30", BLUE = "#2266A1", GOLD = "#D4B800", PURPLE = "#7B4FBF", ORANGE = "#E67E22";
const MID = "#888", BORDER = "#E8E7E3", BG = "#F7F6F2", WHITE = "#FFFFFF", BLACK = "#111111";
const GREEN = "#1A7A4A";

const SEG_COLORS: Record<string, string> = {
  Reseller: R, Sports: BLUE, Education: GREEN, Corporate: GOLD, NGO_Govt: PURPLE, B2C: ORANGE,
};
const SEG_LABELS: Record<string, string> = {
  Reseller: "Reseller", Sports: "Sports", Education: "Education",
  Corporate: "Corporate", NGO_Govt: "NGO/Govt", B2C: "B2C",
};

type Order = {
  id: string; clientId: number | null; clientName: string; product: string; segment: string; stage: string; priority: string;
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

function calcMargin(o: Order) {
  return o.saleValue > 0 ? (o.saleValue - orderCost(o)) / o.saleValue : 0;
}
function marginColor(m: number) { return m > 0.35 ? GREEN : m >= 0.15 ? "#8a7300" : R; }

const PERIODS = ["This month", "Last 3 months", "Last 6 months", "FY 26-27", "All time"];

function analyticsDate(o: Order): Date {
  return new Date(o.deliveryDate ?? o.date);
}

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

function orderCost(o: Order) {
  return o.fabric + o.printing + o.transport + o.misc + o.jobWork + o.packaging + o.design + (o.ribCost || 0);
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

function KpiCard({ label, value, sub, color = R, badge, badgeColor = GREEN }: {
  label: string; value: string | number; sub?: string;
  color?: string; badge?: string; badgeColor?: string;
}) {
  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "20px 22px", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MID, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: BLACK }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: MID, marginTop: 5 }}>{sub}</div>}
      {badge && <div style={{ display: "inline-block", marginTop: 6, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: badgeColor + "18", color: badgeColor }}>{badge}</div>}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: R }}>{fmt(p.value)}</div>
      ))}
    </div>
  );
}

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

  if (loading) return <div style={{ padding: "26px 28px", color: MID, fontSize: 13 }}>Loading dashboard…</div>;

  const filtered = filterOrders(orders, period);
  const monthlyData = toMonthlyData(filtered);

  // KPIs from filtered orders
  const totalRevenue = filtered.reduce((s, o) => s + o.saleValue, 0);
  const totalGst = filtered.reduce((s, o) => s + o.gst, 0);
  const avgMargin = filtered.length ? filtered.reduce((s, o) => s + calcMargin(o), 0) / filtered.length : 0;
  const activeJobs = filtered.filter(o => o.stage !== "delivered" && o.stage !== "delivered_pending").length;
  const pendingPayment = filtered.filter(o => o.stage === "delivered_pending").length;
  const avgOrderValue = filtered.length ? totalRevenue / filtered.length : 0;
  const overdue = filtered.filter(o => o.stage !== "delivered" && o.stage !== "delivered_pending" && o.dueDate && new Date(o.dueDate) < new Date()).length;

  // Segment breakdown from filtered orders
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

  // Stage breakdown from ALL orders
  const stageLabels: Record<string, string> = {
    design: "Design", sampling: "Sampling",
    production: "In Production", qc: "QC", dispatch: "Dispatched",
    delivered: "Delivered", delivered_pending: "Pmt Pending",
  };
  const stageMap: Record<string, number> = {};
  orders.forEach(o => { stageMap[o.stage] = (stageMap[o.stage] || 0) + 1; });
  const stageData = Object.entries(stageMap).map(([id, count]) => ({ name: stageLabels[id] || id, count }));

  // Top clients from filtered orders — match by clientId first, fall back to name
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

  // Avg margin per client for filtered period — profit/revenue
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

  return (
    <div style={{ padding: "26px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK }}>Dashboard</div>
          <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>Printribe CRM · FY 26-27 · {orders.length} orders total</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 20,
              border: `1px solid ${period === p ? R : BORDER}`,
              background: period === p ? R : WHITE,
              color: period === p ? WHITE : MID, cursor: "pointer",
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPI row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
        <KpiCard label="Revenue (excl. GST)" value={fmt(totalRevenue)} sub={`${filtered.length} orders`} color={R} />
        <KpiCard label="GST Collected" value={fmt(totalGst)} sub="Incl. in invoices" color={BLUE} badge="Tax" badgeColor={BLUE} />
        <KpiCard label="Avg Order Value" value={fmt(avgOrderValue)} sub="Per invoice" color={GOLD} />
        <KpiCard label="Avg Gross Margin" value={pct(avgMargin)} sub="All orders in period" color={GREEN}
          badge={avgMargin > 0.35 ? "Healthy" : avgMargin >= 0.15 ? "Watch" : "Below target"} badgeColor={avgMargin > 0.35 ? GREEN : avgMargin >= 0.15 ? ORANGE : R} />
      </div>

      {/* KPI row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <KpiCard label="Active Jobs" value={activeJobs} sub="Not yet delivered" color={ORANGE} badge="Live" badgeColor={ORANGE} />
        <KpiCard label="Payment Pending" value={pendingPayment} sub="Delivered, awaiting pay" color={PURPLE}
          badge={pendingPayment > 0 ? "Follow up" : "All clear"} badgeColor={pendingPayment > 0 ? R : GREEN} />
        <KpiCard label="Overdue Orders" value={overdue} sub="Past due date" color={R}
          badge={overdue > 0 ? "Action needed" : "On track"} badgeColor={overdue > 0 ? R : GREEN} />
        <KpiCard label="Total Clients" value={clients.length} sub={`${clients.filter(c => (clientOrderValue[c.id] || 0) > 0).length} active this period`} color={BLUE} />
      </div>

      {/* Revenue trend + Segment mix */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Revenue trend</div>
          <div style={{ fontSize: 11, color: MID, marginBottom: 18 }}>Monthly sale value (excl. GST) · {period}</div>
          {monthlyData.length === 0 ? (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: MID, fontSize: 12 }}>
              No orders in this period yet.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barSize={28} stackOffset="none">
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: MID }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: MID }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 100000 ? (v / 100000).toFixed(1) + "L" : (v / 1000).toFixed(0) + "K"} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = monthlyData.find(m => m.month === label);
                      return (
                        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
                          <div style={{ color: MID }}>Revenue: <b style={{ color: BLACK }}>{fmt(d?.sales ?? 0)}</b></div>
                          <div style={{ color: MID }}>Profit: <b style={{ color: GREEN }}>{fmt(d?.profit ?? 0)}</b></div>
                          <div style={{ color: MID }}>Margin: <b style={{ color: marginColor((d?.margin ?? 0) / 100) }}>{(d?.margin ?? 0).toFixed(1)}%</b></div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="cost" stackId="a" fill="#E8E7E3" radius={[0, 0, 0, 0]} name="Cost" />
                  <Bar dataKey="profit" stackId="a" fill={GREEN} radius={[4, 4, 0, 0]} name="Profit">
                    <LabelList
                      dataKey="margin"
                      position="top"
                      formatter={(v) => Number(v) > 0 ? Number(v).toFixed(0) + "%" : ""}
                      style={{ fontSize: 9, fontWeight: 700, fill: MID }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: MID }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: GREEN }} /> Profit
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: MID }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: "#E8E7E3", border: `1px solid ${BORDER}` }} /> Cost
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Segment mix</div>
              <div style={{ fontSize: 11, color: MID }}>Revenue breakdown · {period}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["client", "product"] as const).map(v => (
                <button key={v} onClick={() => setSegView(v)} style={{
                  fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${segView === v ? BLUE : BORDER}`,
                  background: segView === v ? BLUE : WHITE,
                  color: segView === v ? WHITE : MID,
                }}>{v === "client" ? "By Client" : "By Product"}</button>
              ))}
            </div>
          </div>
          {segData.length === 0 ? (
            <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: MID, fontSize: 12 }}>No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={segData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3}>
                    {segData.map((e, i) => {
                      const fill = segView === "client"
                        ? (SEG_COLORS[e.name] || MID)
                        : [R, BLUE, GREEN, GOLD, PURPLE, ORANGE, MID][i % 7];
                      return <Cell key={e.name} fill={fill} />;
                    })}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 12px", marginTop: 8 }}>
                {segData.map((s, i) => {
                  const color = segView === "client"
                    ? (SEG_COLORS[s.name] || MID)
                    : [R, BLUE, GREEN, GOLD, PURPLE, ORANGE, MID][i % 7];
                  return (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                      <span style={{ color: MID }}>{segView === "client" ? (SEG_LABELS[s.name] || s.name) : s.name}</span>
                      <span style={{ fontWeight: 700, color: BLACK }}>{pct(s.value / (totalRevenue || 1))}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Avg margin per client + Top clients */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Avg margin per client</div>
              <div style={{ fontSize: 11, color: MID }}>{period}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["desc", "asc"] as const).map(s => (
                <button key={s} onClick={() => setMarginSort(s)} style={{
                  fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${marginSort === s ? BLUE : BORDER}`,
                  background: marginSort === s ? BLUE : WHITE,
                  color: marginSort === s ? WHITE : MID,
                }}>{s === "desc" ? "High → Low" : "Low → High"}</button>
              ))}
            </div>
          </div>
          {marginData.length === 0 ? (
            <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: MID, fontSize: 12 }}>No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(140, marginData.length * 24)}>
                <BarChart data={marginData} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: MID }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: MID }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip formatter={(v, _, props) => [Number(v).toFixed(1) + "%", props.payload?.fullName || ""]} />
                  <Bar dataKey="margin" radius={[3, 3, 0, 0]}>
                    {marginData.map((d, i) => <Cell key={i} fill={marginColor(d.raw)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                {[[GREEN, "> 35%"], ["#8a7300", "15–35%"], [R, "< 15%"]].map(([c, l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: MID }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top clients */}
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Top clients · {period}</div>
        {topClients.length === 0 ? (
          <div style={{ color: MID, fontSize: 12 }}>No client data for this period.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topClients.map((c, i) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MID, width: 18, flexShrink: 0 }}>#{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt(c.periodValue)}</span>
                  </div>
                  <div style={{ height: 4, background: BG, borderRadius: 2 }}>
                    <div style={{ width: `${(c.periodValue / topMax) * 100}%`, height: "100%", background: SEG_COLORS[c.segment] || R, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
