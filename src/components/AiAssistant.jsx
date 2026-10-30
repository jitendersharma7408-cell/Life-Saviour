import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import AvatarFace from '@/components/AvatarFace';
import { Loader2, X, Send, Bot } from 'lucide-react';

const SUGGESTIONS = [
  'Which patients need follow-up today?',
  'How do I escalate a missed task?',
  'What does consent block?'
];

export default function AiAssistant() {
  const { user } = useAuth();
  const role = user?.role;
  const [open, setOpen] = useState(false);
  const [gender, setGender] = useState('female');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  if (!role) return null;

  const ask = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const next = [...messages, { role: 'user', text: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await base44.functions.invoke('aiAssistant', { question: q, context: `Staff role: ${role}` });
      const answer = res?.data?.answer || res?.answer || res?.data?.error || 'Sorry, I could not process that.';
      setMessages((m) => [...m, { role: 'assistant', text: answer }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'The assistant is unavailable right now.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90"
      >
        <Bot className="h-5 w-5" /> Assistant
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative flex w-full max-w-md flex-col rounded-xl bg-background border shadow-xl overflow-hidden" style={{ height: '70vh' }}>
            <div className="flex items-center justify-between border-b bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <AvatarFace gender={gender} talking={busy} size={40} />
                <div>
                  <div className="text-sm font-semibold">Care Assistant</div>
                  <div className="text-[0.65rem] text-muted-foreground">{busy ? 'Typing…' : 'Online'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setGender(gender === 'female' ? 'male' : 'female')} className="rounded-md border px-2 py-1 text-[0.65rem] text-muted-foreground hover:bg-muted">
                  {gender === 'female' ? '♀ Female' : '♂ Male'}
                </button>
                <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <AvatarFace gender={gender} size={72} />
                  <p className="mt-3 text-sm text-muted-foreground">Hi! I can help with task prioritisation, escalations, and consent rules.</p>
                  <div className="mt-4 flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} onClick={() => ask(s)} className="rounded-lg border bg-background px-3 py-2 text-left text-xs hover:bg-muted">{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-background border px-3 py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                </div>
              )}
            </div>

            <div className="border-t p-3 flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ask()}
                placeholder="Ask the care assistant…"
                className="flex-1 rounded-full border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button onClick={() => ask()} disabled={busy || !input.trim()} className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}