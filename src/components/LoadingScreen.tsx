"use client";

export default function LoadingScreen() {
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", background: "#F7F6F2", zIndex: 50,
    }}>
      <style>{`
        @keyframes pt-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.92); }
        }
        @keyframes pt-bar {
          0% { transform: scaleX(0); }
          60% { transform: scaleX(1); }
          100% { transform: scaleX(1); opacity: 0; }
        }
        .pt-logo { animation: pt-pulse 1.6s ease-in-out infinite; }
        .pt-bar { animation: pt-bar 1.6s ease-in-out infinite; transform-origin: left; }
      `}</style>
      <img
        src="/Printribe-Logo-TM-without-bg-1@2x.png"
        alt="Printribe"
        className="pt-logo"
        style={{ width: 140, height: "auto", marginBottom: 28 }}
      />
      <div style={{ width: 140, height: 3, background: "#E8E7E3", borderRadius: 2, overflow: "hidden" }}>
        <div className="pt-bar" style={{ height: "100%", background: "#EE3C30", borderRadius: 2 }} />
      </div>
    </div>
  );
}
