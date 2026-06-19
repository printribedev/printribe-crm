"use client";

import { useState } from "react";
import {
  DateFilter, FilterPreset, PRESET_LABELS, presetToRange, saveFilter,
} from "@/lib/dateFilter";

const BORDER = "#E8E7E3", MID = "#888", WHITE = "#FFFFFF", BG = "#F7F6F2";
const R = "#EE3C30", BLACK = "#111111";

const PRESETS: FilterPreset[] = ["all", "7d", "1m", "3m", "6m", "cfy", "lfy", "ytd", "custom"];

export default function DateFilterBar({
  filter,
  onChange,
}: {
  filter: DateFilter;
  onChange: (f: DateFilter) => void;
}) {
  const [showCustom, setShowCustom] = useState(filter.preset === "custom");

  function select(preset: FilterPreset) {
    if (preset === "custom") {
      setShowCustom(true);
      // keep existing from/to so user can tweak
      const next: DateFilter = { preset: "custom", from: filter.from, to: filter.to };
      saveFilter(next);
      onChange(next);
    } else {
      setShowCustom(false);
      const { from, to } = presetToRange(preset);
      const next: DateFilter = { preset, from, to };
      saveFilter(next);
      onChange(next);
    }
  }

  function setCustomDate(key: "from" | "to", val: string) {
    const next: DateFilter = { preset: "custom", from: filter.from, to: filter.to, [key]: val };
    saveFilter(next);
    onChange(next);
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: MID, letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 4 }}>
          Date
        </span>
        {PRESETS.map(p => {
          const active = filter.preset === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => select(p)}
              style={{
                fontSize: 11, padding: "5px 12px", borderRadius: 20, cursor: "pointer", fontWeight: 600,
                border: `1px solid ${active ? R : BORDER}`,
                background: active ? R : WHITE,
                color: active ? WHITE : BLACK,
                transition: "all 0.12s",
              }}
            >
              {PRESET_LABELS[p]}
            </button>
          );
        })}
        {!showCustom && (
          <span style={{ fontSize: 11, color: MID, marginLeft: 4 }}>
            {filter.from} → {filter.to}
          </span>
        )}
      </div>

      {showCustom && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: MID, fontWeight: 600 }}>From</span>
            <input
              type="date"
              value={filter.from}
              onChange={e => setCustomDate("from", e.target.value)}
              style={{ fontSize: 12, padding: "5px 10px", borderRadius: 7, border: `1px solid ${BORDER}`, background: BG, outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: MID, fontWeight: 600 }}>To</span>
            <input
              type="date"
              value={filter.to}
              onChange={e => setCustomDate("to", e.target.value)}
              style={{ fontSize: 12, padding: "5px 10px", borderRadius: 7, border: `1px solid ${BORDER}`, background: BG, outline: "none" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
