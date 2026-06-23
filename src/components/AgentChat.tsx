"use client";

import { useEffect, useRef, useState } from "react";
import { PRIMARY, WHITE, BORDER, INK, MUTED, MID, SURFACE, SHADOW_MD, R_MD, R_SM } from "@/lib/tokens";

type Message = { role: "user" | "assistant"; text: string };

const BRAND = "#EE3C30";

export default function AgentChat() {
  const [open, setOpen]       = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("agent_open") === "true";
  });
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hey! Harvey here 👋 Your Printribe business brain. Ask me anything — orders, clients, revenue, what's overdue, what's killing your margins. Or just tell me what to create or update and I'll handle it." },
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("agent_open", String(open));
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 9000)
    );
    try {
      const res = await Promise.race([
        fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        }),
        timeout,
      ]);
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.reply ?? "Sorry, no response." }]);
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === "timeout";
      setMessages(prev => [...prev, {
        role: "assistant",
        text: isTimeout
          ? "This query took too long (Vercel's 10s limit). Try asking something simpler, or break it into smaller questions."
          : "Network error. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    await fetch("/api/agent", { method: "DELETE" });
    setMessages([{ role: "assistant", text: "Fresh start. What do you need?" }]);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open AI assistant"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #a259ff 0%, #7c3aed 40%, #4f46e5 100%)",
          border: "none", cursor: "pointer",
          boxShadow: "0 4px 22px rgba(124,58,237,0.55), 0 2px 8px rgba(0,0,0,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.18s ease",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 32px rgba(124,58,237,0.7), 0 2px 10px rgba(0,0,0,0.22)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 22px rgba(124,58,237,0.55), 0 2px 8px rgba(0,0,0,0.2)";
        }}
        onMouseDown={e => (e.currentTarget.style.transform = "scale(0.95)")}
        onMouseUp={e => (e.currentTarget.style.transform = "scale(1.1)")}
      >
        {/* Outer glow ring */}
        {!open && (
          <span style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            border: "1.5px solid rgba(124,58,237,0.4)",
            animation: "ring-pulse 2.4s ease-out infinite",
            pointerEvents: "none",
          }} />
        )}

        {open ? (
          /* Close X */
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          /* Futuristic AI icon */
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            {/* Orbit ring */}
            <ellipse cx="13" cy="13" rx="11" ry="5.5" stroke={WHITE} strokeWidth="1" opacity="0.3" transform="rotate(-30 13 13)"/>
            <ellipse cx="13" cy="13" rx="11" ry="5.5" stroke={WHITE} strokeWidth="1" opacity="0.2" transform="rotate(30 13 13)"/>
            {/* Central 4-point star */}
            <path d="M13 5 L14.2 11 L20 12 L14.2 13 L13 19 L11.8 13 L6 12 L11.8 11 Z" fill={WHITE} opacity="0.95"/>
            {/* Accent dot top-right */}
            <circle cx="20" cy="6" r="1.5" fill={WHITE} opacity="0.6"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 88, right: 24, zIndex: 999,
          width: 380, height: 520,
          background: WHITE, borderRadius: R_MD,
          border: `1px solid ${BORDER}`, boxShadow: SHADOW_MD,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px", borderBottom: `1px solid ${BORDER}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "linear-gradient(135deg, #a259ff 0%, #7c3aed 60%, #4f46e5 100%)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>Harvey</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)" }}>Your Printribe AI</div>
              </div>
            </div>
            <button onClick={clearChat} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: R_SM, padding: "4px 10px", color: WHITE, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
              Clear
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%",
                  padding: "9px 13px",
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: m.role === "user" ? "#7c3aed" : SURFACE,
                  color: m.role === "user" ? WHITE : INK,
                  fontSize: 13,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: "16px 16px 16px 4px", background: SURFACE, display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: "50%", background: MID,
                      animation: "bounce 1.2s ease-in-out infinite",
                      animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask anything about your business…"
              disabled={loading}
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 20,
                border: `1px solid ${BORDER}`, fontSize: 13, outline: "none",
                background: loading ? SURFACE : WHITE, color: INK,
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: loading || !input.trim() ? BORDER : "#7c3aed",
                border: "none", cursor: loading || !input.trim() ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes ring-pulse {
          0% { transform: scale(1); opacity: 0.7; }
          70% { transform: scale(1.55); opacity: 0; }
          100% { transform: scale(1.55); opacity: 0; }
        }
      `}</style>
    </>
  );
}
