"use client";

import { PRIMARY, SURFACE, BORDER } from "@/lib/tokens";

export default function LoadingScreen() {
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", background: SURFACE, zIndex: 50,
    }}>
      <style>{`
        @keyframes pt-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
        @keyframes pt-bar {
          0% { transform: scaleX(0); opacity: 1; }
          70% { transform: scaleX(1); opacity: 1; }
          100% { transform: scaleX(1); opacity: 0; }
        }
        @keyframes pt-fade {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .pt-logo { animation: pt-pulse 2s ease-in-out infinite; }
        .pt-bar { animation: pt-bar 1.8s ease-in-out infinite; transform-origin: left; }
        .pt-dot { animation: pt-fade 1.4s ease-in-out infinite; }
        .pt-dot:nth-child(2) { animation-delay: 0.2s; }
        .pt-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      <img
        src="/Printribe-Logo-TM-without-bg-1@2x.png"
        alt="Printribe"
        className="pt-logo"
        style={{ width: 130, height: "auto", marginBottom: 32 }}
      />
      <div style={{ width: 120, height: 2, background: BORDER, borderRadius: 1, overflow: "hidden", marginBottom: 20 }}>
        <div className="pt-bar" style={{ height: "100%", background: PRIMARY, borderRadius: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {[0,1,2].map(i => (
          <div key={i} className="pt-dot" style={{
            width: 5, height: 5, borderRadius: "50%", background: PRIMARY,
            animationDelay: `${i * 0.15}s`,
          }} />
        ))}
      </div>
    </div>
  );
}
