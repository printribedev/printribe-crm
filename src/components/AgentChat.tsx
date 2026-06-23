"use client";

import { useEffect, useRef, useState } from "react";
import { WHITE } from "@/lib/tokens";
import { createClient } from "@/lib/supabase/client";

const RAILWAY = process.env.NEXT_PUBLIC_RAILWAY_AGENT_URL;

async function agentFetch(path: string, options: RequestInit) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const url = RAILWAY ? `${RAILWAY}${path}` : `/api/agent`;
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(RAILWAY && session ? { "Authorization": `Bearer ${session.access_token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

type Message = { role: "user" | "assistant"; text: string };

export default function AgentChat() {
  const [open, setOpen] = useState(() => {
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
      setTimeout(() => reject(new Error("timeout")), 55000)
    );
    try {
      const res = await Promise.race([
        agentFetch("/agent", {
          method: "POST",
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
          ? "That one took too long. Try asking something more specific — e.g. 'top 3 orders by margin this month' instead of a broad analysis."
          : "Network error. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    await agentFetch("/agent", { method: "DELETE", body: "{}" });
    setMessages([{ role: "assistant", text: "Fresh start. What do you need?" }]);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const isWelcome = messages.length === 1 && messages[0].role === "assistant";

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open Harvey AI assistant"
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
        {!open && (
          <span style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            border: "1.5px solid rgba(124,58,237,0.4)",
            animation: "ring-pulse 2.4s ease-out infinite",
            pointerEvents: "none",
          }} />
        )}
        {open ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <ellipse cx="13" cy="13" rx="11" ry="5.5" stroke={WHITE} strokeWidth="1" opacity="0.3" transform="rotate(-30 13 13)"/>
            <ellipse cx="13" cy="13" rx="11" ry="5.5" stroke={WHITE} strokeWidth="1" opacity="0.2" transform="rotate(30 13 13)"/>
            <path d="M13 5 L14.2 11 L20 12 L14.2 13 L13 19 L11.8 13 L6 12 L11.8 11 Z" fill={WHITE} opacity="0.95"/>
            <circle cx="20" cy="6" r="1.5" fill={WHITE} opacity="0.6"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 88, right: 24, zIndex: 999,
          width: 380, height: 580,
          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderRadius: 28,
          border: "1px solid rgba(255, 255, 255, 0.65)",
          boxShadow: "0 8px 48px rgba(124,58,237,0.18), 0 2px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{
            padding: "14px 16px 12px",
            borderBottom: "1px solid rgba(124,58,237,0.08)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(255,255,255,0.45)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "linear-gradient(135deg, #c084fc 0%, #7c3aed 50%, #4f46e5 100%)",
                boxShadow: "0 2px 14px rgba(124,58,237,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 26 26" fill="none">
                  <path d="M13 5 L14.2 11 L20 12 L14.2 13 L13 19 L11.8 13 L6 12 L11.8 11 Z" fill={WHITE} opacity="0.95"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#3b1fa8", letterSpacing: "-0.01em" }}>Harvey</div>
                <div style={{ fontSize: 10, color: "#7c3aed", opacity: 0.65, marginTop: 1 }}>Your Printribe AI</div>
              </div>
            </div>
            <button onClick={clearChat} style={{
              background: "rgba(124,58,237,0.07)",
              border: "1px solid rgba(124,58,237,0.15)",
              borderRadius: 20, padding: "5px 13px",
              color: "#7c3aed", fontSize: 11, cursor: "pointer", fontWeight: 600,
              transition: "background 0.15s",
            }}>
              Clear
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Welcome / empty state */}
            {isWelcome && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "8px 16px 16px" }}>
                <div style={{
                  width: 88, height: 88, borderRadius: "50%",
                  background: "radial-gradient(circle at 38% 32%, #c084fc 0%, #7c3aed 55%, #4338ca 100%)",
                  boxShadow: "0 0 0 12px rgba(124,58,237,0.07), 0 0 48px rgba(124,58,237,0.35), 0 0 90px rgba(162,89,255,0.18)",
                  animation: "orb-float 3.5s ease-in-out infinite",
                  marginBottom: 24,
                  flexShrink: 0,
                }} />
                <p style={{ fontSize: 13, color: "#4c1d95", textAlign: "center", lineHeight: 1.7, margin: 0, opacity: 0.85 }}>
                  {messages[0].text}
                </p>
              </div>
            )}

            {/* Conversation messages */}
            {!isWelcome && messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
                {m.role === "assistant" && (
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, #c084fc, #4f46e5)",
                    boxShadow: "0 2px 8px rgba(124,58,237,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="10" height="10" viewBox="0 0 26 26" fill="none">
                      <path d="M13 5 L14.2 11 L20 12 L14.2 13 L13 19 L11.8 13 L6 12 L11.8 11 Z" fill={WHITE}/>
                    </svg>
                  </div>
                )}
                <div style={{
                  maxWidth: "74%",
                  padding: "10px 14px",
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: m.role === "user"
                    ? "linear-gradient(135deg, #a259ff 0%, #7c3aed 100%)"
                    : "rgba(255,255,255,0.82)",
                  backdropFilter: m.role === "assistant" ? "blur(8px)" : "none",
                  WebkitBackdropFilter: m.role === "assistant" ? "blur(8px)" : "none",
                  border: m.role === "assistant" ? "1px solid rgba(124,58,237,0.1)" : "none",
                  boxShadow: m.role === "user"
                    ? "0 3px 14px rgba(124,58,237,0.35)"
                    : "0 2px 8px rgba(0,0,0,0.05)",
                  color: m.role === "user" ? WHITE : "#1e1b4b",
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #c084fc, #4f46e5)",
                  boxShadow: "0 2px 8px rgba(124,58,237,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="10" height="10" viewBox="0 0 26 26" fill="none">
                    <path d="M13 5 L14.2 11 L20 12 L14.2 13 L13 19 L11.8 13 L6 12 L11.8 11 Z" fill={WHITE}/>
                  </svg>
                </div>
                <div style={{
                  padding: "11px 16px", borderRadius: "18px 18px 18px 4px",
                  background: "rgba(255,255,255,0.82)",
                  border: "1px solid rgba(124,58,237,0.1)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  display: "flex", gap: 5, alignItems: "center",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "linear-gradient(135deg, #a259ff, #7c3aed)",
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
          <div style={{
            padding: "10px 14px 18px",
            background: "rgba(255,255,255,0.4)",
            borderTop: "1px solid rgba(124,58,237,0.07)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(124,58,237,0.18)",
              borderRadius: 30,
              padding: "6px 6px 6px 16px",
              boxShadow: "0 2px 14px rgba(124,58,237,0.1), inset 0 1px 0 rgba(255,255,255,0.9)",
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ask Harvey anything…"
                disabled={loading}
                style={{
                  flex: 1, border: "none", outline: "none",
                  fontSize: 13, background: "transparent",
                  color: "#1e1b4b", padding: "5px 0",
                }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: loading || !input.trim()
                    ? "rgba(124,58,237,0.12)"
                    : "linear-gradient(135deg, #a259ff 0%, #7c3aed 100%)",
                  border: "none",
                  cursor: loading || !input.trim() ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                  boxShadow: loading || !input.trim() ? "none" : "0 2px 10px rgba(124,58,237,0.45)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
        @keyframes ring-pulse {
          0% { transform: scale(1); opacity: 0.7; }
          70% { transform: scale(1.55); opacity: 0; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes orb-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.04); }
        }
      `}</style>
    </>
  );
}
