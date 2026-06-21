"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { WHITE, BORDER, INK, MID, MUTED, PRIMARY, PRIMARY_LIGHT, SURFACE2, R_SM } from "@/lib/tokens";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }

export default function DatePicker({ value, onChange, placeholder = "Select date", style }: DatePickerProps) {
  const parsed = value ? new Date(value + "T00:00:00") : null;
  const today = new Date();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open, close]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }
  function selectDay(d: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    close();
  }
  function clearDate(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  const displayValue = parsed
    ? parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDay(viewYear, viewMonth);
  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDay = parsed?.getFullYear() === viewYear && parsed?.getMonth() === viewMonth ? parsed.getDate() : null;
  const todayDay = today.getFullYear() === viewYear && today.getMonth() === viewMonth ? today.getDate() : null;

  return (
    <div ref={containerRef} style={{ position: "relative", width: (style as React.CSSProperties)?.width, minWidth: (style as React.CSSProperties)?.minWidth }}>
      {/* Trigger */}
      <div
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(o => !o); } if (e.key === "Escape") close(); }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: (style as React.CSSProperties)?.padding ?? "8px 10px",
          fontSize: (style as React.CSSProperties)?.fontSize ?? 13,
          cursor: "pointer",
          border: `1px solid ${open ? PRIMARY : BORDER}`,
          borderRadius: R_SM,
          background: WHITE,
          color: displayValue ? INK : MUTED,
          outline: "none",
          transition: "border-color 150ms ease, box-shadow 150ms ease",
          boxShadow: open ? `0 0 0 3px ${PRIMARY}22` : "none",
          userSelect: "none", boxSizing: "border-box", width: "100%",
        }}
      >
        <span style={{ flex: 1 }}>{displayValue || placeholder}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 6 }}>
          {value && (
            <span onClick={clearDate} style={{ color: MUTED, fontSize: 12, lineHeight: 1, cursor: "pointer", padding: "0 2px" }} title="Clear">✕</span>
          )}
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={MID} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
      </div>

      {/* Calendar panel */}
      <div style={{
        position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 9999,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.9)",
        borderRadius: R_SM + 4,
        boxShadow: "0 0 0 0.5px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.14)",
        padding: "14px 14px 12px",
        width: 260,
        opacity: open ? 1 : 0,
        transform: open ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.97)",
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 180ms cubic-bezier(0.16,1,0.3,1), transform 180ms cubic-bezier(0.16,1,0.3,1)",
        transformOrigin: "top left",
      }}>
        {/* Month/year nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: MID, padding: "4px 6px", borderRadius: 6, fontSize: 14, lineHeight: 1 }}>‹</button>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>
            {MONTHS[viewMonth]} {viewYear}
          </div>
          <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: MID, padding: "4px 6px", borderRadius: 6, fontSize: 14, lineHeight: 1 }}>›</button>
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: MUTED, padding: "2px 0" }}>{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const isSelected = d === selectedDay;
            const isToday = d === todayDay;
            return (
              <div
                key={i}
                onClick={() => selectDay(d)}
                style={{
                  textAlign: "center", fontSize: 12, fontWeight: isSelected ? 700 : isToday ? 600 : 400,
                  padding: "5px 2px", borderRadius: 6, cursor: "pointer",
                  background: isSelected ? PRIMARY : isToday ? PRIMARY + "18" : "transparent",
                  color: isSelected ? WHITE : isToday ? PRIMARY : INK,
                  transition: "background 80ms ease",
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = SURFACE2; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isToday ? PRIMARY + "18" : "transparent"; }}
              >
                {d}
              </div>
            );
          })}
        </div>

        {/* Today shortcut */}
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={() => { const d = today; setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); selectDay(d.getDate()); }}
            style={{ fontSize: 11, fontWeight: 600, color: PRIMARY, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Today
          </button>
          {value && (
            <button onClick={() => { onChange(""); close(); }} style={{ fontSize: 11, color: MUTED, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
