import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { PageHeader } from '../components/ui';
import { Bot, Send, User, Sparkles, ClipboardList, Pill, Users } from 'lucide-react';

type ChatMode = 'general' | 'tasks' | 'medications' | 'family';
type MessageRole = 'user' | 'assistant';

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
};

const MODES: { id: ChatMode; icon: React.ElementType; labelHe: string; labelEn: string; descHe: string; descEn: string }[] = [
  { id: 'general',     icon: Sparkles,      labelHe: 'עזרה כללית',     labelEn: 'General help',      descHe: 'שאל כל שאלה',                          descEn: 'Ask anything' },
  { id: 'tasks',       icon: ClipboardList, labelHe: 'משימות',          labelEn: 'Tasks',             descHe: 'עזרה בתכנון משימות טיפול',             descEn: 'Help planning care tasks' },
  { id: 'medications', icon: Pill,          labelHe: 'תרופות',          labelEn: 'Medications',       descHe: 'שאלות על תרופות ומינונים',             descEn: 'Questions about medications' },
  { id: 'family',      icon: Users,         labelHe: 'משפחה',           labelEn: 'Family',            descHe: 'ייעוץ לטיפול בדמנציה עבור המשפחה',   descEn: 'Dementia care advice for family' },
];

function getSmartSuggestions(mode: ChatMode, lang: string): string[] {
  const hour = new Date().getHours();
  const isMorning = hour < 12;
  const isEvening = hour >= 18;

  if (lang === 'he') {
    const base: Record<ChatMode, string[]> = {
      general: ['מה מומלץ לעשות היום?', 'איך אפשר לעזור לי?', 'הסבר לי על דמנציה'],
      tasks:   ['מה המשימות הדחופות ביותר?', 'עזור לי לתכנן את יום הטיפול', 'מה לא הושלם השבוע?'],
      medications: ['האם יש אינטראקציות בין התרופות?', 'מה עושים אם מפספסים מנה?', 'מה הזמן הטוב ביותר לתת את התרופות?'],
      family: ['איך מתמודדים עם בלבול?', 'מה לעשות כשיש תסיסה?', 'איך מסבירים לילדים?'],
    };
    if (isMorning) base.general.unshift('בוקר טוב, מה תוכנית הבוקר?');
    if (isEvening) base.general.unshift('איך מתכוננים לישון?');
    return base[mode].slice(0, 3);
  } else {
    const base: Record<ChatMode, string[]> = {
      general: ['What should we do today?', 'How can you help me?', 'Explain dementia to me'],
      tasks:   ['What are the most urgent tasks?', 'Help me plan the care day', 'What was not completed this week?'],
      medications: ['Are there drug interactions?', 'What to do if a dose is missed?', 'What is the best time for medications?'],
      family: ['How to handle confusion?', 'What to do during agitation?', 'How to explain to children?'],
    };
    if (isMorning) base.general.unshift('Good morning, what is the morning plan?');
    if (isEvening) base.general.unshift('How to prepare for sleep?');
    return base[mode].slice(0, 3);
  }
}

let msgIdCounter = 0;
function mkId() { return `msg-${++msgIdCounter}`; }

export default function AssistantPage() {
  const { dir, lang } = useI18n();
  const { user } = useAuth();
  const [mode, setMode] = useState<ChatMode>('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Greeting on mode change
    setMessages([{
      id: mkId(),
      role: 'assistant',
      content: lang === 'he'
        ? `שלום${user?.fullName ? ` ${user.fullName.split(' ')[0]}` : ''}! אני עוזר ה-AI של MEMORAID. אני כאן לעזור לך בכל הנוגע לטיפול. במה אוכל לעזור?`
        : `Hello${user?.fullName ? ` ${user.fullName.split(' ')[0]}` : ''}! I'm MEMORAID's AI assistant. I'm here to help with caregiving. How can I help you?`,
      createdAt: new Date(),
    }]);
  }, [mode, lang, user?.fullName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setInput('');

    const userMsg: Message = { id: mkId(), role: 'user', content, createdAt: new Date() };
    const placeholderId = mkId();
    const placeholder: Message = { id: placeholderId, role: 'assistant', content: '...', createdAt: new Date() };

    setMessages((prev) => [...prev, userMsg, placeholder]);
    setSending(true);

    try {
      const res = await apiFetch<{ message: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: content, mode, lang }),
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId ? { ...m, content: res.message, createdAt: new Date() } : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? { ...m, content: lang === 'he' ? 'מצטער, אירעה שגיאה. נסה שוב.' : 'Sorry, an error occurred. Please try again.' }
            : m
        )
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const suggestions = getSmartSuggestions(mode, lang);
  const currentMode = MODES.find((m) => m.id === mode)!;
  const ModeIcon = currentMode.icon;

  return (
    <div dir={dir} className="flex flex-col h-[calc(100vh-10rem)] max-h-[760px]">
      {/* Header */}
      <PageHeader
        title={lang === 'he' ? 'עוזר AI' : 'AI Assistant'}
        subtitle={lang === 'he' ? 'מופעל על ידי בינה מלאכותית · לעזרה כללית בלבד, אינו תחליף לייעוץ רפואי' : 'Powered by AI · General guidance only, not a substitute for medical advice'}
      />

      {/* Mode selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {MODES.map(({ id, icon: Icon, labelHe, labelEn }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === id
                ? 'bg-[hsl(var(--primary))] text-white'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/70'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {lang === 'he' ? labelHe : labelEn}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-4 min-h-0">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const isTyping = m.content === '...';
          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isUser
                ? (dir === 'rtl' ? 'flex-row' : 'flex-row-reverse')
                : (dir === 'rtl' ? 'flex-row-reverse' : 'flex-row')
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isUser ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--muted))]'
              }`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-[hsl(var(--primary))]" />}
              </div>
              <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                isUser
                  ? 'bg-[hsl(var(--primary))] text-white rounded-tr-sm'
                  : 'bg-[hsl(var(--muted))]/60 text-[hsl(var(--foreground))] rounded-tl-sm'
              }`}>
                {isTyping ? (
                  <span className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </span>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Smart suggestions */}
      {messages.length <= 2 && (
        <div className={`flex flex-wrap gap-2 my-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendMessage(s)}
              disabled={sending}
              className="text-xs px-3 py-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))]/50 transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={`flex gap-2 mt-auto pt-3 border-t border-[hsl(var(--border))] ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] shrink-0 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <ModeIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{lang === 'he' ? currentMode.labelHe : currentMode.labelEn}</span>
        </div>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={lang === 'he' ? 'שאל שאלה... (Enter לשליחה)' : 'Ask a question... (Enter to send)'}
          disabled={sending}
          className="flex-1 resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/30 disabled:opacity-50"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
        />
        <button
          type="button"
          onClick={() => sendMessage()}
          disabled={sending || !input.trim()}
          aria-label={lang === 'he' ? 'שלח' : 'Send'}
          className="btn-primary h-10 w-10 p-0 justify-center shrink-0 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
