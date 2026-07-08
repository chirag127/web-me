import { useState, useEffect, useRef, useCallback } from 'react';

const SYSTEM_PROMPT = `You are Chirag Singhal's AI digital twin. Answer questions as Chirag would, in first person.

BACKGROUND:
- Software Engineer at Tata Consultancy Services (Jun 2025 – Present)
- Previously: Full Stack Developer at QRsay.com (Jul 2023 – May 2025)
- Education: B.Tech CSE, AKTU, CGPA 8.81, Rank #1 in batch (2025)
- JEE Advanced: AIR 11870, Top 1%

KEY ACHIEVEMENTS:
- Optimized Python pricing engines — 60% latency reduction at TCS
- 40% API response time improvement at QRsay via DB tuning + Kafka
- Built 192+ open source tools at oriz.in
- AWS Certified Developer – Associate (2025)
- Meta Backend Developer Professional Certificate (2024)

TECH STACK:
- Languages: Python (expert), JavaScript/TypeScript (expert), Go, SQL
- Backend: FastAPI, Node.js, Django, REST APIs, GraphQL, gRPC
- AI/ML: LangChain, LangGraph, HuggingFace, ONNX, OpenAI API
- Infra: AWS, Docker, Kubernetes, Cloudflare, GitHub Actions
- Databases: PostgreSQL, MongoDB, Redis, DynamoDB
- Messaging: Kafka, RabbitMQ, Celery

TOP PROJECTS:
1. Oriz (oriz.in) — 192+ tools & apps platform
2. NexusAI — Multi-agent RAG with LangGraph + Kubernetes, 10 LLM providers
3. TubeDigest — YouTube AI summarization (T5 + ONNX)
4. Olivia — Local AI voice assistant (Llama-3 + Whisper)
5. Crawl4AI — Distributed web crawler (Redis + Playwright)

PERSONALITY & PHILOSOPHY:
- Ship fast, iterate. Measure, don't guess. Build in public. Free tiers only.

CONTACT: hi@chirag127.in | github.com/chirag127 | linkedin.com/in/chirag127

Keep answers concise — 2-4 sentences max. Be direct, speak as Chirag.`;

const STARTERS = [
  "What's your tech stack?",
  'Tell me about your projects',
  'Are you available for hire?',
  "What's your biggest achievement?",
];

type Message = { role: 'user' | 'assistant'; content: string };

declare global {
  interface Window {
    g4fClient?: any;
  }
}

async function callG4F(messages: Message[]): Promise<string> {
  // Use g4f.dev official JS client loaded via script tag
  const g4f = window.g4fClient;
  if (g4f) {
    try {
      const result = await g4f.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      });
      return result?.choices?.[0]?.message?.content ?? 'No response.';
    } catch (e) {
      // fall through to fetch
    }
  }

  // Fallback: try multiple free endpoints
  const endpoints = [
    'https://api.g4f.dev/v1/chat/completions',
    'https://g4f.dev/api/openai/v1/chat/completions',
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (reply) return reply;
    } catch {
      continue;
    }
  }
  throw new Error('All AI endpoints unavailable. Try again in a moment.');
}

function TypingDot({ delay }: { delay: number }) {
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%', background: '#79747E',
      display: 'inline-block',
      animation: 'twinBounce 1.2s infinite',
      animationDelay: `${delay}ms`,
    }} />
  );
}

function ChatWindow({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStarters, setShowStarters] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setShowStarters(false);
    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const reply = await callG4F(next);
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  return (
    <div style={{
      position: 'fixed', bottom: 88, right: 20, zIndex: 10000,
      width: 360, height: 520,
      background: '#0F0D13',
      borderRadius: 20,
      border: '1px solid rgba(208,188,255,0.15)',
      boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(79,55,139,0.2)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif',
      animation: 'twinSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 10, background: '#13111A', flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg,#4F378B,#7965AF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Outfit,system-ui,sans-serif', fontWeight: 700, fontSize: 12, color: '#fff',
        }}>CS</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#E6E0E9', fontWeight: 600, fontSize: 14 }}>Chirag's AI Twin</div>
          <div style={{ color: '#6B9953', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6B9953', display: 'inline-block' }} />
            Always online
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#79747E', cursor: 'pointer',
          fontSize: 18, padding: '4px 6px', borderRadius: 6, lineHeight: 1,
        }}>×</button>
      </div>

      {/* Messages */}
      <div className="twin-scroll" style={{
        flex: 1, overflowY: 'auto', padding: '16px 12px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {messages.length === 0 && !loading && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', flex: 1, gap: 6, color: '#79747E',
            fontSize: 13, textAlign: 'center', padding: '0 20px',
          }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>◈</div>
            <div style={{ color: '#E6E0E9', fontWeight: 600, fontSize: 14 }}>Hey, I'm Chirag's AI twin</div>
            <div>Ask me about my experience, projects, or background.</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-end', gap: 6,
            flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: m.role === 'user' ? 'linear-gradient(135deg,#6B4EFF,#9C7AF0)' : 'linear-gradient(135deg,#4F378B,#7965AF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700, color: '#fff',
            }}>{m.role === 'user' ? 'You' : 'CS'}</div>
            <div style={{
              maxWidth: '78%', padding: '9px 13px', fontSize: 13, lineHeight: 1.55,
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role === 'user' ? '#4F378B' : '#211F26',
              color: m.role === 'user' ? '#fff' : '#E6E0E9',
            }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'linear-gradient(135deg,#4F378B,#7965AF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700, color: '#fff',
            }}>CS</div>
            <div style={{
              background: '#211F26', borderRadius: '16px 16px 16px 4px',
              padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center',
            }}>
              <TypingDot delay={0} /><TypingDot delay={200} /><TypingDot delay={400} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Starter chips */}
      {showStarters && (
        <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 5, flexShrink: 0 }}>
          {STARTERS.map(q => (
            <button key={q} className="twin-chip" onClick={() => sendMessage(q)} disabled={loading} style={{
              background: 'rgba(79,55,139,0.15)', border: '1px solid rgba(79,55,139,0.35)',
              borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#B0A7C0',
              cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>{q}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', gap: 8, background: '#13111A', alignItems: 'flex-end', flexShrink: 0,
      }}>
        <textarea
          className="twin-input"
          rows={1}
          style={{
            flex: 1, background: '#1C1B23', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, color: '#E6E0E9', fontFamily: 'Inter,system-ui,sans-serif',
            fontSize: 13, padding: '8px 12px', outline: 'none', resize: 'none',
            lineHeight: 1.5, transition: 'border-color 0.15s',
          }}
          placeholder="Ask me anything…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }}}
          disabled={loading}
        />
        <button
          className="twin-send"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? '#2A1F42' : '#4F378B',
            border: 'none', borderRadius: 10, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            color: loading || !input.trim() ? '#6B5A8E' : '#fff',
            fontFamily: 'Outfit,system-ui,sans-serif', fontWeight: 600, fontSize: 12,
            padding: '8px 14px', flexShrink: 0, transition: 'background 0.15s', height: 38,
          }}
        >Send</button>
      </div>
    </div>
  );
}

export default function TwinWidget() {
  const [open, setOpen] = useState(false);

  // Load g4f.dev JS client
  useEffect(() => {
    if (typeof window === 'undefined' || window.g4fClient) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      import Client from 'https://g4f.dev/dist/js/client.js';
      window.g4fClient = new Client();
    `;
    document.head.appendChild(script);
  }, []);

  return (
    <>
      <style>{`
        @keyframes twinBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes twinSlideUp { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes twinPulse { 0%,100%{box-shadow:0 0 0 0 rgba(79,55,139,0.4)} 50%{box-shadow:0 0 0 8px rgba(79,55,139,0)} }
        .twin-fab:hover { background: linear-gradient(135deg,#6B4EFF,#9C7AF0) !important; transform: scale(1.08) !important; }
        .twin-chip:hover { background: rgba(79,55,139,0.3) !important; color: #D0C5E0 !important; }
        .twin-input:focus { border-color: rgba(79,55,139,0.6) !important; }
        .twin-send:hover:not(:disabled) { background: #6B4EFF !important; }
        .twin-scroll::-webkit-scrollbar{width:3px} .twin-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>

      {open && <ChatWindow onClose={() => setOpen(false)} />}

      {/* FAB */}
      <button
        className="twin-fab"
        onClick={() => setOpen(o => !o)}
        title="Chat with Chirag's AI Twin"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg,#4F378B,#7965AF)',
          border: 'none', cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(79,55,139,0.5)',
          transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          transform: 'scale(1)',
          animation: open ? 'none' : 'twinPulse 3s infinite',
          fontFamily: 'Outfit,system-ui,sans-serif', fontWeight: 700, fontSize: 15,
        }}
      >
        {open ? '×' : 'CS'}
      </button>
    </>
  );
}
