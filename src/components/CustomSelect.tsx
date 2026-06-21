"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { WHITE, BORDER, INK, MID, MUTED, PRIMARY, PRIMARY_LIGHT, SURFACE2, R_SM, SHADOW_MD } from "@/lib/tokens";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export default function CustomSelect({
  value, onChange, options, placeholder = "— Select —", style, disabled,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  const close = useCallback(() => { setOpen(false); setFocused(-1); }, []);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open, close]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) { setOpen(true); setFocused(options.findIndex(o => o.value === value)); }
      else if (focused >= 0) { onChange(options[focused].value); close(); }
    } else if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setFocused(f => Math.min(f + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused(f => Math.max(f - 1, 0));
    }
  }

  useEffect(() => {
    if (open && focused >= 0 && listRef.current) {
      const item = listRef.current.children[focused] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [focused, open]);

  return (
    <div ref={containerRef} style={{ position: "relative", ...style }}>
      {/* Trigger */}
      <div
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onKeyDown={onKeyDown}
        onClick={() => { if (!disabled) { setOpen(o => !o); setFocused(options.findIndex(o => o.value === value)); } }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 10px", cursor: disabled ? "default" : "pointer",
          border: `1px solid ${open ? PRIMARY : BORDER}`,
          borderRadius: R_SM, background: disabled ? SURFACE2 : WHITE,
          fontSize: 13, color: selected ? INK : MUTED,
          outline: "none",
          transition: "border-color 150ms ease, box-shadow 150ms ease",
          boxShadow: open ? `0 0 0 3px ${PRIMARY}22` : "none",
          userSelect: "none",
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          width={14} height={14} viewBox="0 0 24 24" fill="none"
          stroke={MID} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{
            flexShrink: 0, marginLeft: 6,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Dropdown */}
      <div
        role="listbox"
        ref={listRef}
        style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 9999,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.9)",
          borderRadius: R_SM + 2,
          boxShadow: "0 0 0 0.5px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.12)",
          maxHeight: 220, overflowY: "auto",
          padding: "4px",
          // Animation
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.97)",
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 180ms cubic-bezier(0.16,1,0.3,1), transform 180ms cubic-bezier(0.16,1,0.3,1)",
          transformOrigin: "top center",
        }}
      >
        {options.map((opt, i) => {
          const isSelected = opt.value === value;
          const isFocused = i === focused;
          return (
            <div
              key={opt.value}
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => setFocused(i)}
              onMouseDown={e => { e.preventDefault(); onChange(opt.value); close(); }}
              style={{
                padding: "8px 10px",
                borderRadius: R_SM - 1,
                fontSize: 13,
                cursor: "pointer",
                color: isSelected ? PRIMARY : INK,
                fontWeight: isSelected ? 600 : 400,
                background: isSelected ? PRIMARY_LIGHT : isFocused ? SURFACE2 : "transparent",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "background 80ms ease",
              }}
            >
              {opt.label}
              {isSelected && (
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
