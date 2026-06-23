"use client";

import { useState } from "react";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import AgentChat from "@/components/AgentChat";
import { BORDER, PRIMARY } from "@/lib/tokens";
import { PermissionsProvider, usePermissions } from "@/context/PermissionsContext";

function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showHarvey } = usePermissions();

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: "linear-gradient(145deg, #eef0fb 0%, #f4f6ff 25%, #f8fafc 60%, #f0fdf8 100%)",
    }}>
      {/* Dim overlay — mobile only, sits behind open sidebar */}
      <div
        className={`sidebar-overlay${sidebarOpen ? " sidebar-overlay-open" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, overflow: "auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile sticky top bar */}
        <div className="mobile-topbar">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "8px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#64748B",
            }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Image
            src="/Printribe-Logo-TM-without-bg-1@2x.png"
            alt="Printribe"
            width={100}
            height={32}
            style={{ objectFit: "contain" }}
            priority
          />

          {/* Spacer so logo is centred */}
          <div style={{ width: 36 }} />
        </div>

        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>

      {showHarvey && <AgentChat />}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionsProvider>
      <AppShell>{children}</AppShell>
    </PermissionsProvider>
  );
}
