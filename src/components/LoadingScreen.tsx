"use client";

import { PRIMARY } from "@/lib/tokens";

export default function LoadingScreen() {
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(145deg, #eef0fb 0%, #f4f6ff 25%, #f8fafc 60%, #f0fdf8 100%)",
      zIndex: 50,
    }}>
      <style>{`
        @keyframes pt-breathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(0.97); }
        }
        @keyframes pt-spin {
          from { stroke-dashoffset: 88; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes pt-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .pt-logo { animation: pt-breathe 2.4s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
        .pt-ring { animation: pt-rotate 1.1s linear infinite; transform-origin: center; }
      `}</style>

      <img
        src="/Printribe-Logo-TM-without-bg-1@2x.png"
        alt="Printribe"
        className="pt-logo"
        style={{ width: 140, height: "auto", marginBottom: 28 }}
      />

      {/* Single elegant ring spinner */}
      <svg width={28} height={28} viewBox="0 0 28 28" fill="none" className="pt-ring">
        <circle cx="14" cy="14" r="11" stroke={PRIMARY + "22"} strokeWidth="2.5" />
        <circle
          cx="14" cy="14" r="11"
          stroke={PRIMARY}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="28 60"
          strokeDashoffset="0"
        />
      </svg>
    </div>
  );
}
