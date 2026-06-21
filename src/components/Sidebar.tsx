"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PRIMARY, PRIMARY_LIGHT, BODY, MID, MUTED, WHITE, BORDER, INK, GRAD_PRIMARY } from "@/lib/tokens";

const NAV = [
  {
    href: "/", label: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/orders", label: "Orders",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    href: "/production", label: "Production",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  },
  {
    href: "/products", label: "Products",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    href: "/clients", label: "Clients",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  },
  {
    href: "/vendors", label: "Vendors",
    icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    href: "/assets", label: "Assets",
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    href: "/quotes", label: "Quotes",
    icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  },
];

function PrintribeLogo() {
  return (
    <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${BORDER}` }}>
      <Image
        src="/Printribe-Logo-TM-without-bg-1@2x.png"
        alt="Printribe"
        width={148}
        height={48}
        style={{ objectFit: "contain", objectPosition: "left center" }}
        priority
      />
      <div style={{ fontSize: 9.5, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4, fontWeight: 500, paddingLeft: 2 }}>
        Operations CRM
      </div>
    </div>
  );
}

function NavIcon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
      stroke={active ? PRIMARY : MID}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
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
    <div style={{
      width: 224,
      background: "rgba(255,255,255,0.88)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
      flexShrink: 0,
      borderRight: `1px solid ${BORDER}`,
    }}>
      <PrintribeLogo />

      {/* Nav */}
      <nav style={{ padding: "6px 10px", flex: 1, overflowY: "auto" }}>
        {NAV.map(n => {
          const isActive = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          const showBadge = n.href === "/production" && activeJobCount > 0;
          return (
            <Link key={n.href} href={n.href} style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 9, marginBottom: 1,
                  background: isActive ? PRIMARY_LIGHT : "transparent",
                  borderLeft: isActive ? `2.5px solid ${PRIMARY}` : "2.5px solid transparent",
                  cursor: "pointer",
                  transition: "background 120ms ease",
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(79,70,229,0.05)"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <NavIcon d={n.icon} active={isActive} />
                <span style={{
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  color: isActive ? PRIMARY : BODY,
                  flex: 1, letterSpacing: "-0.01em",
                }}>
                  {n.label}
                </span>
                {showBadge && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: PRIMARY, color: WHITE,
                    borderRadius: 10, padding: "1px 6px", lineHeight: 1.6,
                  }}>
                    {activeJobCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: "12px 16px 16px", borderTop: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%", background: GRAD_PRIMARY,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: WHITE }}>US</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: INK, lineHeight: 1.3 }}>Usman</div>
            <div style={{ fontSize: 10, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              theprintribe@gmail.com
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            width: "100%", fontSize: 11, fontWeight: 500,
            color: MID, background: "none", border: `1px solid ${BORDER}`,
            borderRadius: 7, padding: "6px 10px", cursor: "pointer", textAlign: "left",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FEF2F2"; (e.currentTarget as HTMLElement).style.color = "#DC2626"; (e.currentTarget as HTMLElement).style.borderColor = "#FECACA"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = MID; (e.currentTarget as HTMLElement).style.borderColor = BORDER; }}
        >
          Sign out →
        </button>
      </div>
    </div>
  );
}
