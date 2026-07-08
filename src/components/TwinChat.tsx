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
- "Ship fast, iterate" — always deploying, never perfecting prematurely
- "Measure, don't guess" — data-driven decisions
- Deep modules over shallow — clean interfaces, rich implementation
- Build in public — open source everything
- Free tiers only — no credit card, ever

CONTACT: hi@chirag127.in | github.com/chirag127 | linkedin.com/in/chirag127

Answer questions about experience, projects, tech stack, availability, philosophy. Keep answers concise and direct — 2-4 sentences max unless asked for detail. If asked something you don't know, say so honestly.`;

const STARTERS = [
  "What's your tech stack?",
  'Tell me about your projects',
  'Are you available for hire?',
  "What's your biggest achievement?",
];

type Message = { role: 'user' | 'assistant'; content: string };

const S: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 72px)',
    maxHeight: 800,
    background: '#0F0D13',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#13111A',
    flexShrink: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4F378B, #7965AF)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Outfit, system-ui, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    color: '#fff',
    flexShrink: 0,
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  headerName: {
    color: '#E6E0E9',
    fontFamily: 'Outfit, system-ui, sans-serif',
    fontWeight: 600,
    fontSize: 15,
    margin: 0,
  },
  headerStatus: {
    color: '#6B9953',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 8,
    color: '#79747E',
    fontSize: 14,
    textAlign: 'center',
    padding: '0 24px',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  msgUser: {
    alignSelf: 'flex-end',
    background: '#4F378B',
    color: '#fff',
    borderRadius: '18px 18px 4px 18px',
    padding: '10px 14px',
    maxWidth: '78%',
    fontSize: 14,
    lineHeight: 1.55,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  msgTwin: {
    alignSelf: 'flex-start',
    background: '#211F26',
    color: '#E6E0E9',
    borderRadius: '18px 18px 18px 4px',
    padding: '10px 14px',
    maxWidth: '78%',
    fontSize: 14,
    lineHeight: 1.55,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  msgRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
  },
  msgRowUser: {
    flexDirection: 'row-reverse',
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4F378B, #7965AF)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
    fontFamily: 'Outfit, system-ui, sans-serif',
  },
  smallAvatarUser: {
    background: 'linear-gradient(135deg, #6B4EFF, #9C7AF0)',
  },
  typing: {
    alignSelf: 'flex-start',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
  },
  typingDots: {
    background: '#211F26',
    borderRadius: '18px 18px 18px 4px',
    padding: '10px 16px',
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  },
  starters: {
    padding: '0 16px 12px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    flexShrink: 0,
  },
  chip: {
    background: 'rgba(79,55,139,0.15)',
    border: '1px solid rgba(79,55,139,0.35)',
    borderRadius: 20,
    padding: '5px 12px',
    fontSize: 12,
    color: '#B0A7C0',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'Inter, system-ui, sans-serif',
    whiteSpace: 'nowrap',
  },
  inputRow: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    display: 'flex',
    gap: 8,
    background: '#13111A',
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: '#1C1B23',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#E6E0E9',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    padding: '10px 14px',
    outline: 'none',
    resize: 'none',
    lineHeight: 1.5,
    transition: 'border-color 0.15s',
  },
  sendBtn: {
    background: '#4F378B',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    color: '#fff',
    fontFamily: 'Outfit, system-ui, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    padding: '10px 18px',
    flexShrink: 0,
    transition: 'background 0.15s',
    height: 42,
  },
  sendBtnDisabled: {
    background: '#2A1F42',
    color: '#6B5A8E',
    cursor: 'not-allowed',
  },
};

function TypingDot({ delay }: { delay: number }) {
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%', background: '#79747E',
      display: 'inline-block',
      animation: 'bounce 1.2s infinite',
      animationDelay: `${delay}ms`,
    }} />
  );
}

export default function TwinChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStarters, setShowStarters] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setShowStarters(false);
    const userMsg: Message = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const body = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...nextMessages,
        ],
        stream: false,
      };
      const res = await fetch('https://g4f.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const reply: string = data?.choices?.[0]?.message?.content ?? 'Sorry, no response.';
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        .twin-chip:hover { background: rgba(79,55,139,0.3) !important; border-color: rgba(79,55,139,0.6) !important; color: #D0C5E0 !important; }
        .twin-send:hover:not(:disabled) { background: #6B4EFF !important; }
        .twin-input:focus { border-color: rgba(79,55,139,0.6) !important; }
        .twin-messages::-webkit-scrollbar { width: 4px; }
        .twin-messages::-webkit-scrollbar-track { background: transparent; }
        .twin-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      <div style={S.root}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.avatar}>CS</div>
          <div style={S.headerText}>
            <p style={S.headerName}>Chirag Singhal</p>
            <span style={S.headerStatus}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6B9953', display: 'inline-block' }} />
              AI Digital Twin · Always online
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="twin-messages" style={S.messages}>
          {messages.length === 0 && !loading && (
            <div style={S.emptyState}>
              <div style={S.emptyIcon}>◈</div>
              <div style={{ color: '#E6E0E9', fontWeight: 600, fontSize: 15 }}>Hey, I'm Chirag's AI twin</div>
              <div>Ask me about my experience, projects, tech stack, or anything else.</div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              style={{ ...S.msgRow, ...(m.role === 'user' ? S.msgRowUser : {}) }}
            >
              <div style={{ ...S.smallAvatar, ...(m.role === 'user' ? S.smallAvatarUser : {}) }}>
                {m.role === 'user' ? 'You' : 'CS'}
              </div>
              <div style={m.role === 'user' ? S.msgUser : S.msgTwin}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={S.typing}>
              <div style={{ ...S.smallAvatar }}>CS</div>
              <div style={S.typingDots}>
                <TypingDot delay={0} />
                <TypingDot delay={200} />
                <TypingDot delay={400} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Starter chips */}
        {showStarters && (
          <div style={S.starters}>
            {STARTERS.map(q => (
              <button
                key={q}
                className="twin-chip"
                style={S.chip}
                onClick={() => sendMessage(q)}
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={S.inputRow}>
          <textarea
            ref={textareaRef}
            className="twin-input"
            rows={1}
            style={S.input}
            placeholder="Ask me anything…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={loading}
          />
          <button
            className="twin-send"
            style={{ ...S.sendBtn, ...(loading || !input.trim() ? S.sendBtnDisabled : {}) }}
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
