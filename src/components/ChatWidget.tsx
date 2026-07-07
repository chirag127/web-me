'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (message: string, options?: { model?: string; system?: string }) => Promise<string | { message?: { content?: string } }>;
      };
    };
  }
}

const SYSTEM_PROMPT =
  "You are Chirag Singhal's personal assistant on me.oriz.in. Answer questions about Chirag: software engineer at SAP, solo dev building the chirag127 family (20+ free sites, apps, CLIs), loves TypeScript/Rust/Python/Astro, based in Bhubaneswar India, no card on file rule, everything open source.";

const S = {
  fab: {
    position: 'fixed' as const,
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: '#2dd4bf',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(45,212,191,0.4)',
    zIndex: 9999,
    transition: 'transform 0.15s ease',
  },
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 10000,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  drawer: {
    background: '#0a0a0a',
    width: 380,
    maxWidth: '100vw',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    borderLeft: '1px solid #1a1a1a',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #1a1a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#030303',
  },
  headerTitle: {
    color: '#f5f5f5',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 15,
    fontWeight: 600,
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#888',
    fontSize: 20,
    lineHeight: 1,
    padding: 4,
  },
  messages: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  msgUser: {
    alignSelf: 'flex-end' as const,
    background: '#2dd4bf',
    color: '#030303',
    borderRadius: '12px 12px 2px 12px',
    padding: '8px 12px',
    maxWidth: '80%',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 13,
    lineHeight: 1.5,
  },
  msgAssistant: {
    alignSelf: 'flex-start' as const,
    background: '#1a1a1a',
    color: '#e5e5e5',
    borderRadius: '12px 12px 12px 2px',
    padding: '8px 12px',
    maxWidth: '80%',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 13,
    lineHeight: 1.5,
  },
  msgError: {
    alignSelf: 'flex-start' as const,
    background: '#2a1a1a',
    color: '#f87171',
    borderRadius: '12px 12px 12px 2px',
    padding: '8px 12px',
    maxWidth: '80%',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 13,
    lineHeight: 1.5,
  },
  inputRow: {
    padding: '12px 16px',
    borderTop: '1px solid #1a1a1a',
    display: 'flex',
    gap: 8,
    background: '#030303',
  },
  input: {
    flex: 1,
    background: '#111',
    border: '1px solid #222',
    borderRadius: 8,
    color: '#f5f5f5',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 13,
    padding: '8px 12px',
    outline: 'none',
    resize: 'none' as const,
  },
  sendBtn: {
    background: '#2dd4bf',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    color: '#030303',
    fontWeight: 700,
    fontSize: 13,
    padding: '0 16px',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    background: '#1a3a38',
    color: '#2dd4bf88',
    cursor: 'not-allowed',
  },
  typing: {
    alignSelf: 'flex-start' as const,
    color: '#888',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 12,
    fontStyle: 'italic',
    padding: '2px 4px',
  },
};

type Message = { role: 'user' | 'assistant' | 'error'; text: string };

function loadPuter(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.puter) { resolve(); return; }
    const existing = document.querySelector('script[src="https://js.puter.com/v2/"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://js.puter.com/v2/';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [puterReady, setPuterReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !puterReady) {
      loadPuter()
        .then(() => {
          // puter.js fires its own ready; poll briefly
          const check = setInterval(() => {
            if (window.puter) { setPuterReady(true); clearInterval(check); }
          }, 100);
          setTimeout(() => clearInterval(check), 8000);
        })
        .catch(() => {
          setMessages((m) => [...m, { role: 'error', text: 'Failed to load Puter.js. Check your connection.' }]);
        });
    }
  }, [open, puterReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!puterReady || !window.puter) {
      setMessages((m) => [...m, { role: 'error', text: 'Puter.js not ready yet, please wait a moment.' }]);
      return;
    }
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setLoading(true);
    try {
      const raw = await window.puter.ai.chat(text, { system: SYSTEM_PROMPT });
      const reply =
        typeof raw === 'string'
          ? raw
          : raw?.message?.content ?? JSON.stringify(raw);
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((m) => [...m, { role: 'error', text: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, puterReady]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        style={S.fab}
        aria-label="Open chat"
        onClick={() => setOpen(true)}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
      >
        {/* Chat bubble SVG */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#030303" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Drawer overlay */}
      {open && (
        <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div style={S.drawer} role="dialog" aria-modal="true" aria-label="Chat with Chirag's assistant">
            {/* Header */}
            <div style={S.header}>
              <p style={S.headerTitle}>Ask about Chirag</p>
              <button style={S.closeBtn} aria-label="Close chat" onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* Messages */}
            <div style={S.messages}>
              {messages.length === 0 && (
                <p style={{ color: '#555', fontFamily: 'system-ui, sans-serif', fontSize: 13, alignSelf: 'center' as const, marginTop: 32 }}>
                  Ask me anything about Chirag.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={m.role === 'user' ? S.msgUser : m.role === 'error' ? S.msgError : S.msgAssistant}
                >
                  {m.text}
                </div>
              ))}
              {loading && <div style={S.typing}>typing…</div>}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={S.inputRow}>
              <textarea
                ref={textareaRef}
                rows={1}
                style={S.input}
                placeholder={puterReady ? 'Type a message…' : 'Loading AI…'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                disabled={loading}
              />
              <button
                style={{ ...S.sendBtn, ...(loading || !input.trim() ? S.sendBtnDisabled : {}) }}
                onClick={send}
                disabled={loading || !input.trim()}
                aria-label="Send message"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
