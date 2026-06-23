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
    { role: "assistant", text: "Hi! I'm your Printribe assistant. Ask me about orders, clients, revenue, production — or tell me to create/update something." },
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
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.reply ?? "Sorry, no response." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    await fetch("/api/agent", { method: "DELETE" });
    setMessages([{ role: "assistant", text: "Chat cleared. What would you like to know?" }]);
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
          width: 52, height: 52, borderRadius: "50%",
          background: BRAND, border: "none", cursor: "pointer",
          boxShadow: SHADOW_MD, display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.15s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        }
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
            background: BRAND,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>Printribe AI</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)" }}>Powered by Claude</div>
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
                  background: m.role === "user" ? BRAND : SURFACE,
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
                background: loading || !input.trim() ? BORDER : BRAND,
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
      `}</style>
    </>
  );
}
