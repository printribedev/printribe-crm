"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
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
  id: string; clientName: string; segment: string; stage: string; priority: string;
  saleValue: number; fabric: number; printing: number; transport: number;
  misc: number; jobWork: number; packaging: number; design: number; date: string;
};
type ClientStat = { id: number; name: string; segment: string; totalValue: number };
type MonthlySale = { id: number; month: string; sales: number; orderCount: number; fyYear: string };

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const pct = (n: number) => (n * 100).toFixed(1) + "%";

function calcMargin(o: Order) {
  const cost = o.fabric + o.printing + o.transport + o.misc + o.jobWork + o.packaging + o.design;
  return o.saleValue > 0 ? (o.saleValue - cost) / o.saleValue : 0;
}
function marginColor(m: number) { return m > 0.35 ? GREEN : m > 0.2 ? "#8a7300" : R; }

const PERIODS = ["Last 3 months", "Last 6 months", "FY 25-26", "FY 26-27 YTD", "All time"];

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

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ color: R }}>{fmt(payload[0].value)}</div>
    </div>
  );
}

function filterSales(sales: MonthlySale[], period: string) {
  if (period === "Last 3 months") return sales.slice(-3);
  if (period === "Last 6 months") return sales.slice(-6);
  if (period === "FY 25-26") return sales.filter(s => s.fyYear === "2025-26");
  if (period === "FY 26-27 YTD") return sales.filter(s => s.fyYear === "2026-27");
  return sales;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState("FY 26-27 YTD");
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<ClientStat[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(d => {
      setOrders(d.orders);
      setClients(d.clients);
      setMonthlySales(d.monthlySales);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding: "26px 28px", color: MID, fontSize: 13 }}>Loading dashboard…</div>;

  const data = filterSales(monthlySales, period);
  const totalSales = data.reduce((s, d) => s + d.sales, 0);
  const totalInvoices = data.reduce((s, d) => s + d.orderCount, 0);
  const avgOrder = totalInvoices ? totalSales / totalInvoices : 0;
  const allMargins = orders.map(calcMargin);
  const avgMargin = allMargins.length ? allMargins.reduce((a, b) => a + b, 0) / allMargins.length : 0;
  const activeJobs = orders.filter(o => o.stage !== "delivered").length;

  // Segment pie — group clients by segment
  const segMap: Record<string, number> = {};
  clients.forEach(c => { segMap[c.segment] = (segMap[c.segment] || 0) + c.totalValue; });
  const segData = Object.entries(segMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Top clients
  const sortedClients = [...clients].sort((a, b) => b.totalValue - a.totalValue);
  const topMax = sortedClients[0]?.totalValue || 1;

  // Margin by order (last 8 orders by date)
  const recentOrders = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  const marginChartData = recentOrders.map(o => ({
    name: o.clientName.split(" ")[0],
    margin: parseFloat((calcMargin(o) * 100).toFixed(1)),
    marginRaw: calcMargin(o),
  }));

  return (
    <div style={{ padding: "26px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK }}>Dashboard</div>
          <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>Printribe CRM · FY overview</div>
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

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <KpiCard label="Total Revenue" value={fmt(totalSales)} sub={`${data.length} months`} color={R} badge="↑ Growing" />
        <KpiCard label="Invoices Raised" value={totalInvoices} sub={`Avg ${fmt(avgOrder)}`} color={BLUE} badge="All FYs" badgeColor={BLUE} />
        <KpiCard label="Avg Gross Margin" value={pct(avgMargin)} sub="Tracked orders" color={GOLD}
          badge={avgMargin > 0.3 ? "Healthy" : "Watch"} badgeColor={avgMargin > 0.3 ? GREEN : ORANGE} />
        <KpiCard label="Active Jobs" value={activeJobs} sub="In production" color={ORANGE} badge="Live" badgeColor={ORANGE} />
      </div>

      {/* Revenue trend + Segment mix */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Revenue trend</div>
          <div style={{ fontSize: 11, color: MID, marginBottom: 18 }}>Monthly gross sales (taxable value)</div>
          {data.length === 0 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: MID, fontSize: 12 }}>
              No data for this period — seed monthly_sales table
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.map(d => ({ m: d.month, sales: d.sales }))} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: MID }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: MID }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 100000 ? (v / 100000).toFixed(1) + "L" : (v / 1000).toFixed(0) + "K"} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="sales" fill={R} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Segment mix</div>
          <div style={{ fontSize: 11, color: MID, marginBottom: 14 }}>Revenue by client type</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={segData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                {segData.map(e => <Cell key={e.name} fill={SEG_COLORS[e.name] || MID} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 12px", marginTop: 8 }}>
            {segData.map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: SEG_COLORS[s.name] || MID }} />
                <span style={{ color: MID }}>{SEG_LABELS[s.name] || s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top clients + Margin by order */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Top clients</div>
          {sortedClients.slice(0, 6).map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MID, width: 18 }}>#{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</div>
                <div style={{ height: 4, background: BG, borderRadius: 2, marginTop: 4 }}>
                  <div style={{ width: `${(c.totalValue / topMax) * 100}%`, height: "100%", background: R, borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{fmt(c.totalValue)}</div>
            </div>
          ))}
        </div>

        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Margin by order</div>
          <div style={{ fontSize: 11, color: MID, marginBottom: 14 }}>Last 8 orders</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={marginChartData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: MID }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: MID }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip formatter={(v) => Number(v).toFixed(1) + "%"} />
              <Bar dataKey="margin" radius={[3, 3, 0, 0]}>
                {marginChartData.map((d, i) => <Cell key={i} fill={marginColor(d.marginRaw)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            {[[GREEN, "> 35%"], ["#8a7300", "20–35%"], [R, "< 20%"]].map(([c, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: MID }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
