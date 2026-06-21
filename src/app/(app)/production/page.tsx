"use client";

import { useEffect, useRef, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import DateFilterBar from "@/components/DateFilterBar";
import { DateFilter, applyDateFilter, loadFilter } from "@/lib/dateFilter";

import { PRIMARY, SUCCESS, ERROR, GOLD, PURPLE, ORANGE, INK, MID, BORDER, SURFACE, WHITE, R_SM, R_MD } from "@/lib/tokens";
const R = ERROR, BLUE = PRIMARY, GREEN = SUCCESS, BG = SURFACE, BLACK = INK;
const CARD_RADIUS = R_MD, BTN_RADIUS = R_SM;

const STAGES = [
  { id: "design",            label: "Design",                     color: PURPLE },
  { id: "sampling",          label: "Sampling",                   color: BLUE },
  { id: "production",        label: "In Production",              color: ORANGE },
  { id: "qc",                label: "QC / Finishing",             color: GOLD },
  { id: "dispatch",          label: "Dispatched",                 color: BLUE },
  { id: "delivered_pending", label: "Delivered, Payment Pending", color: ORANGE },
  { id: "delivered",         label: "Delivered",                  color: GREEN },
];

function getProductDisplay(product: string): string {
  try {
    const p = JSON.parse(product);
    if (Array.isArray(p)) return p.map((l: { name?: string }) => l.name).filter(Boolean).join(", ") || "—";
  } catch { /* legacy */ }
  return product || "—";
}

const SEG_COLORS: Record<string, string> = {
  Reseller: R, Sports: BLUE, Education: GREEN, Corporate: GOLD, NGO_Govt: PURPLE, B2C: ORANGE,
};

type Order = {
  id: string; clientName: string; product: string; segment: string;
  date: string; dueDate: string | null; qty: number; saleValue: number;
  fabric: number; printing: number; transport: number; misc: number;
  jobWork: number; packaging: number; design: number;
  stage: string; priority: string;
  deliveryDate: string | null; paymentDate: string | null;
};

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

function calcMargin(o: Order) {
  const cost = o.fabric + o.printing + o.transport + o.misc + o.jobWork + o.packaging + o.design;
  return o.saleValue > 0 ? (o.saleValue - cost) / o.saleValue : 0;
}
function marginColor(m: number) { return m > 0.25 ? GREEN : m >= 0.15 ? MID : R; }

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

// Returns { text, color } for the status badge based on stage
function statusBadge(o: Order): { text: string; color: string } | null {
  if (o.stage === "delivered") {
    // Delivery performance: deliveryDate vs dueDate
    if (o.deliveryDate && o.dueDate) {
      const diff = daysBetween(o.dueDate, o.deliveryDate); // positive = late
      if (diff === 0) return { text: "On time", color: GREEN };
      if (diff < 0)   return { text: `${Math.abs(diff)}d early`, color: GREEN };
      return { text: `${diff}d late`, color: R };
    }
    // Payment delay: paymentDate vs deliveryDate
    if (o.paymentDate && o.deliveryDate) {
      const diff = daysBetween(o.deliveryDate, o.paymentDate);
      return { text: diff === 0 ? "Paid same day" : `Payment ${diff}d after delivery`, color: GOLD };
    }
    return null;
  }

  if (o.stage === "delivered_pending") {
    // Days awaiting payment since delivery
    if (o.deliveryDate) {
      const diff = daysBetween(o.deliveryDate, new Date().toISOString().slice(0, 10));
      return { text: diff === 0 ? "Delivered today" : `${diff}d since delivery`, color: ORANGE };
    }
    return null;
  }

  // Active orders: show due date countdown
  if (o.dueDate) {
    const due = daysUntil(o.dueDate);
    if (due < 0)  return { text: `${Math.abs(due)}d overdue`, color: R };
    if (due === 0) return { text: "Due today", color: ORANGE };
    if (due <= 3)  return { text: `${due}d left`, color: ORANGE };
    return { text: `${due}d left`, color: GREEN };
  }

  return null;
}

function OrderCard({ order, dragging, onDragStart, onDragEnd, onAdvance }: {
  order: Order;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onAdvance: () => void;
}) {
  const margin = calcMargin(order);
  const mc = marginColor(margin);
  const badge = statusBadge(order);
  const segColor = SEG_COLORS[order.segment] || MID;
  const canAdvance = order.stage !== "delivered";

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}
      style={{
        background: WHITE,
        border: `1px solid ${BORDER}`,
        borderRadius: BTN_RADIUS,
        padding: "12px 13px",
        marginBottom: 8,
        borderLeft: `3px solid ${order.priority === "High" ? R : BORDER}`,
        opacity: dragging ? 0.4 : 1,
        cursor: "grab",
        userSelect: "none",
        transition: "opacity 0.15s, box-shadow 0.15s",
        boxShadow: dragging ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: R, letterSpacing: "0.05em" }}>{order.id}</div>
        {order.priority === "High" && (
          <span style={{ fontSize: 9, fontWeight: 700, background: R + "18", color: R, padding: "1px 6px", borderRadius: 10 }}>HIGH</span>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: BLACK, marginBottom: 2, lineHeight: 1.3 }}>{order.clientName}</div>
      <div style={{ fontSize: 11, color: MID, marginBottom: 8 }}>{getProductDisplay(order.product)}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, background: segColor + "18", color: segColor, padding: "2px 7px", borderRadius: 10 }}>{order.segment}</span>
        <span style={{ fontSize: 9, fontWeight: 700, background: mc + "18", color: mc, padding: "2px 7px", borderRadius: 10 }}>{(margin * 100).toFixed(0)}% margin</span>
      </div>

      <div style={{ fontSize: 11, color: MID, display: "flex", justifyContent: "space-between", marginBottom: canAdvance ? 8 : 0 }}>
        <span>{order.qty.toLocaleString()} pcs · {fmt(order.saleValue)}</span>
        {badge && <span style={{ color: badge.color, fontWeight: 600 }}>{badge.text}</span>}
      </div>

      {canAdvance && (
        <button
          onClick={e => { e.stopPropagation(); onAdvance(); }}
          style={{
            width: "100%", fontSize: 11, fontWeight: 600, padding: "5px 0",
            borderRadius: BTN_RADIUS, background: BG, color: MID,
            border: `1px solid ${BORDER}`, cursor: "pointer",
          }}
        >
          Advance →
        </button>
      )}
    </div>
  );
}

function KanbanColumn({ stage, orders, dragOverStage, onDragOver, onDragLeave, onDrop, draggingId, onDragStart, onDragEnd, onAdvance }: {
  stage: typeof STAGES[number];
  orders: Order[];
  dragOverStage: string | null;
  onDragOver: (stageId: string) => void;
  onDragLeave: () => void;
  onDrop: (stageId: string) => void;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onAdvance: (order: Order) => void;
}) {
  const isOver = dragOverStage === stage.id;

  return (
    <div
      onDragOver={e => { e.preventDefault(); onDragOver(stage.id); }}
      onDragLeave={onDragLeave}
      onDrop={e => { e.preventDefault(); onDrop(stage.id); }}
      style={{
        minWidth: 185,
        background: isOver ? stage.color + "0D" : "transparent",
        border: isOver ? `2px dashed ${stage.color}` : "2px dashed transparent",
        borderRadius: CARD_RADIUS,
        padding: 6,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ marginBottom: 10, paddingLeft: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: stage.color, marginBottom: 2 }}>
          {stage.label}
        </div>
        <div style={{ fontSize: 11, color: MID }}>{orders.length} order{orders.length !== 1 ? "s" : ""}</div>
        <div style={{ height: 2, background: stage.color, borderRadius: 2, marginTop: 6 }} />
      </div>
      <div>
        {orders.map(o => (
          <OrderCard
            key={o.id}
            order={o}
            dragging={draggingId === o.id}
            onDragStart={() => onDragStart(o.id)}
            onDragEnd={onDragEnd}
            onAdvance={() => onAdvance(o)}
          />
        ))}
        {orders.length === 0 && !isOver && (
          <div style={{ fontSize: 11, color: BORDER, padding: "16px 0", textAlign: "center" }}>Empty</div>
        )}
        {isOver && (
          <div style={{ height: 60, border: `2px dashed ${stage.color}`, borderRadius: BTN_RADIUS, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: stage.color, fontWeight: 600 }}>Drop here</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductionPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>(() => loadFilter());
  const dragLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    const res = await fetch("/api/orders");
    setOrders(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function moveToStage(orderId: string, newStage: string) {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.stage === newStage) return;
    // Optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, stage: newStage } : o));
    await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...order, stage: newStage }),
    });
  }

  async function advance(order: Order) {
    const idx = STAGES.findIndex(s => s.id === order.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    await moveToStage(order.id, STAGES[idx + 1].id);
  }

  function handleDragOver(stageId: string) {
    if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
    setDragOverStage(stageId);
  }

  function handleDragLeave() {
    dragLeaveTimer.current = setTimeout(() => setDragOverStage(null), 80);
  }

  async function handleDrop(stageId: string) {
    setDragOverStage(null);
    if (draggingId) await moveToStage(draggingId, stageId);
    setDraggingId(null);
  }

  if (loading) return <LoadingScreen />;

  const visibleOrders = applyDateFilter(orders, dateFilter);
  const activeOrders = visibleOrders.filter(o => o.stage !== "delivered" && o.stage !== "delivered_pending");
  const delivered = visibleOrders.filter(o => o.stage === "delivered" || o.stage === "delivered_pending");

  if (view === "kanban") {
    return (
      <div style={{ padding: "26px 28px", minHeight: "100vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: BLACK, letterSpacing: "-0.01em" }}>Production Board</div>
            <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>
              {activeOrders.length} active · {delivered.length} delivered · drag cards to move stages
            </div>
          </div>
          <button onClick={() => setView("list")} style={{ fontSize: 12, padding: "7px 14px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>
            List view
          </button>
        </div>

        <DateFilterBar filter={dateFilter} onChange={setDateFilter} />

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, minmax(185px, 1fr))`, gap: 8, overflowX: "auto", paddingBottom: 16 }}>
          {STAGES.map(stage => {
            const stageOrders = visibleOrders
              .filter(o => o.stage === stage.id)
              .sort((a, b) => {
                if (a.priority === "High" && b.priority !== "High") return -1;
                if (b.priority === "High" && a.priority !== "High") return 1;
                if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                return 0;
              });
            return (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                orders={stageOrders}
                dragOverStage={dragOverStage}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                draggingId={draggingId}
                onDragStart={id => setDraggingId(id)}
                onDragEnd={() => { setDraggingId(null); setDragOverStage(null); }}
                onAdvance={advance}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // List view
  const sorted = [...visibleOrders].sort((a, b) => {
    const si = (o: Order) => STAGES.findIndex(s => s.id === o.stage);
    if (si(a) !== si(b)) return si(a) - si(b);
    if (a.priority === "High" && b.priority !== "High") return -1;
    if (b.priority === "High" && a.priority !== "High") return 1;
    return 0;
  });

  return (
    <div style={{ padding: "26px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK, letterSpacing: "-0.01em" }}>Production — List View</div>
          <div style={{ fontSize: 12, color: MID, marginTop: 3 }}>{activeOrders.length} active · {delivered.length} delivered</div>
        </div>
        <button onClick={() => setView("kanban")} style={{ fontSize: 12, padding: "7px 14px", borderRadius: BTN_RADIUS, border: `1px solid ${BORDER}`, background: WHITE, color: MID, cursor: "pointer", fontWeight: 600 }}>
          Kanban view
        </button>
      </div>

      <DateFilterBar filter={dateFilter} onChange={setDateFilter} />

      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: CARD_RADIUS, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: BLACK, color: WHITE }}>
              {["Invoice", "Client", "Product", "Stage", "Priority", "Margin", "Due", ""].map(h => (
                <th key={h} style={{ padding: "11px 13px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((o, i) => {
              const stage = STAGES.find(s => s.id === o.stage) || STAGES[0];
              const margin = calcMargin(o);
              const mc = marginColor(margin);
              const badge = statusBadge(o);
              return (
                <tr key={o.id} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? WHITE : BG }}>
                  <td style={{ padding: "10px 13px", fontWeight: 600, color: R, fontSize: 11 }}>{o.id}</td>
                  <td style={{ padding: "10px 13px", fontWeight: 500 }}>{o.clientName}</td>
                  <td style={{ padding: "10px 13px", color: MID }}>{getProductDisplay(o.product)}</td>
                  <td style={{ padding: "10px 13px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: stage.color, background: stage.color + "15", padding: "2px 8px", borderRadius: BTN_RADIUS }}>{stage.label}</span>
                  </td>
                  <td style={{ padding: "10px 13px" }}>
                    {o.priority === "High" && <span style={{ fontSize: 10, fontWeight: 700, color: R, background: R + "18", padding: "2px 8px", borderRadius: 20 }}>High</span>}
                  </td>
                  <td style={{ padding: "10px 13px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: mc }}>{(margin * 100).toFixed(0)}%</span>
                  </td>
                  <td style={{ padding: "10px 13px", fontWeight: 600, fontSize: 11, color: badge?.color ?? MID }}>
                    {badge ? badge.text : "—"}
                  </td>
                  <td style={{ padding: "10px 13px" }}>
                    {o.stage !== "delivered" && (
                      <button onClick={() => advance(o)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: BTN_RADIUS, background: BLUE, color: WHITE, border: "none", cursor: "pointer", fontWeight: 600 }}>
                        Advance →
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
