"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const R = "#EE3C30";
const MID = "#888";
const BLACK = "#111";
const BORDER = "#E8E7E3";

const NAV = [
  { href: "/", label: "Dashboard", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { href: "/orders", label: "Orders", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { href: "/production", label: "Production", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { href: "/products", label: "Products", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { href: "/clients", label: "Clients", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
  { href: "/vendors", label: "Vendors", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/assets", label: "Assets", icon: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" },
  { href: "/quotes", label: "Quotes", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
];

function Icon({ d, size = 15, color = MID }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function Sidebar({ activeJobCount = 0 }: { activeJobCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div style={{ width: 216, background: "#fff", borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, flexShrink: 0 }}>
      <div style={{ padding: "20px 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: R, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#fff" }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em" }}>Printribe</div>
            <div style={{ fontSize: 9, color: MID, letterSpacing: "0.07em", textTransform: "uppercase" }}>Operations CRM</div>
          </div>
        </div>
      </div>

      <nav style={{ padding: "6px 10px", flex: 1, overflowY: "auto" }}>
        {NAV.map(n => {
          const isActive = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          const showBadge = n.href === "/production" && activeJobCount > 0;
          return (
            <Link key={n.href} href={n.href} style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 8, marginBottom: 2, background: isActive ? R + "12" : "transparent", color: isActive ? R : BLACK }}>
                <Icon d={n.icon} color={isActive ? R : MID} />
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, flex: 1 }}>{n.label}</span>
                {showBadge && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: R, color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {activeJobCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "14px 18px", borderTop: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: BLACK }}>Usman</div>
        <div style={{ fontSize: 10, color: MID, marginBottom: 8 }}>theprintribe@gmail.com</div>
        <button
          onClick={handleSignOut}
          style={{ fontSize: 11, color: MID, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
