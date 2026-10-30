import { useState, useRef, useEffect } from 'react';
import { Stethoscope, Send, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';

const SUGGESTIONS = [
  { en: 'I have a fever and headache, what should I do?', hi: 'मुझे बुखार और सिरदर्द है, मुझे क्या करना चाहिए?', ta: 'எனக்கு காய்ச்சல் மற்றும் தலைவலி உள்ளது, நான் என்ன செய்ய வேண்டும்?', te: 'నాకు జ్వరం మరియు తలనొప్పి ఉంది, నేను ఏమి చేయాలి?', bn: 'আমার জ্বর এবং মাথাব্যথা আছে, আমি কী করব?' },
  { en: 'What are the side effects of metformin?', hi: 'मेटफॉर्मिन के दुष्प्रभाव क्या हैं?', ta: 'மெட்ஃபார்மின் பக்க விளைவுகள் யாவை?', te: 'మెట్‌ఫార్మిన్ దుష్ప్రభావాలు ఏమిటి?', bn: 'মেটফর্মিনের পার্শ্বপ্রতিক্রিয়া কী কী?' },
  { en: 'How can I manage my blood sugar levels?', hi: 'मैं अपने रक्त शर्करा को नियंत्रित कैसे रख सकता हूँ?', ta: 'ரத்த சர்க்கரை அளவை எவ்வாறு கட்டுப்படுத்துவது?', te: 'రక్త చక్కెర స్థాయిలను నేను ఎలా నియంత్రించగలను?', bn: 'আমি আমার রক্ত চিনির মাত্রা কীভাবে নিয়ন্ত্রণ করব?' }
];

export default function DoctorAi() {
  const { lang, t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const ask = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInput('');
    setBusy(true);
    try {
      const res = await base44.functions.invoke('doctorAi', { question: q, language: lang });
      const answer = res?.data?.answer || res?.answer || 'Sorry, I could not process that.';
      setMessages((prev) => [...prev, { role: 'ai', text: answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'The doctor AI is unavailable right now. Please try again.' }]);
    }
    setBusy(false);
  };

  const quickQ = SUGGESTIONS.map((s) => s[lang] || s.en);

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Stethoscope className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t('doctorAi')}</h1>
          <p className="text-sm text-muted-foreground">{t('medicalDisclaimer')}</p>
        </div>
      </div>

      <Card className="flex flex-col h-[60vh] min-h-[400px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Stethoscope className="h-12 w-12 mb-3 text-primary/40" />
              <p className="text-sm max-w-xs">{t('askQuestion')}</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted border'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-muted border rounded-2xl px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {messages.length === 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {quickQ.map((q, i) => (
              <button key={i} onClick={() => ask(q)}
                className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="border-t p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder={t('askQuestion')}
            className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={() => ask()}
            disabled={busy || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </Card>

      <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>{t('medicalDisclaimer')}</span>
      </div>
    </div>
  );
}