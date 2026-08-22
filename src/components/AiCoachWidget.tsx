import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Transaction, BudgetConfig, Subscription, SavingsGoal } from '../types';
import {
  analyzeUserFinances,
  buildGeminiSystemPrompt,
  generateOfflineResponse,
} from '../utils/aiCoachKnowledge';

interface AiCoachWidgetProps {
  transactions: Transaction[];
  budgetConfig: BudgetConfig;
  subscriptions: Subscription[];
  savingsGoals: SavingsGoal[];
  currency: string;
  themePresetId?: string;
  isDark?: boolean;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export const AiCoachWidget: React.FC<AiCoachWidgetProps> = ({
  transactions = [],
  budgetConfig,
  subscriptions = [],
  savingsGoals = [],
  currency = 'INR',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: `👋 Hi! I'm **Tracky**, your SpendTrack AI Financial Advisor trained across **100+ financial intents**.\n\nAsk me anything about your finances — e.g.:\n• *"How much did I spend on food or Swiggy?"*\n• *"Can I afford a ₹5,000 purchase?"*\n• *"What's my daily safe spending pace?"*\n• *"Audit my subscriptions & emergency fund"*`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Draggable Floating Button State
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const hasMovedRef = useRef(false);

  const getInitialPos = () => ({
    x: 16,
    y: Math.max(88, window.innerHeight - 96 - 48),
  });
  const currentPos = btnPos || getInitialPos();

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    dragStartRef.current = { x: e.clientX, y: e.clientY, initialX: currentPos.x, initialY: currentPos.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) hasMovedRef.current = true;
    const rawX = dragStartRef.current.initialX + dx;
    const rawY = dragStartRef.current.initialY + dy;
    setBtnPos({
      x: Math.max(8, Math.min(window.innerWidth - 56, rawX)),
      y: Math.max(84, Math.min(window.innerHeight - 120, rawY)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (btnPos) {
      const isLeft = btnPos.x < window.innerWidth / 2;
      setBtnPos({ x: isLeft ? 16 : window.innerWidth - 64, y: btnPos.y });
    }
    if (!hasMovedRef.current) setIsOpen((prev) => !prev);
  };

  const getDrawerStyle = (): React.CSSProperties => {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    if (sw < 640) return {};
    const w = Math.min(420, sw - 32);
    const h = Math.min(560, sh - 100);
    const isRight = currentPos.x > sw / 2;
    const style: React.CSSProperties = { position: 'fixed', width: `${w}px`, maxHeight: `${h}px`, zIndex: 50 };
    style[isRight ? 'right' : 'left'] = `${Math.max(16, Math.min(sw - w - 16, isRight ? sw - currentPos.x - 48 : currentPos.x))}px`;
    const isBottom = currentPos.y > sh / 2;
    style[isBottom ? 'bottom' : 'top'] = `${Math.max(16, Math.min(sh - h - 16, isBottom ? sh - currentPos.y : currentPos.y + 54))}px`;
    return style;
  };

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // ─── SEND MESSAGE HANDLER ──────────────────────────────────────────────────
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    const userText = textToSend.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    const apiKey =
      import.meta.env.VITE_GEMINI_API_KEY ||
      (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);

    if (!apiKey) {
      setTimeout(() => {
        const offlineReply = generateOfflineResponse(
          userText,
          transactions,
          budgetConfig,
          subscriptions,
          savingsGoals,
          currency
        );
        setMessages((prev) => [...prev, { sender: 'ai', text: offlineReply }]);
        setLoading(false);
      }, 250);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const audit = analyzeUserFinances(transactions, budgetConfig, subscriptions, savingsGoals, currency);
      const systemInstruction = buildGeminiSystemPrompt(audit, transactions);

      const conversationHistory = messages.slice(-10).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          ...conversationHistory,
          { role: 'user', parts: [{ text: userText }] },
        ] as any,
        config: {
          systemInstruction,
          temperature: 0.25,
          maxOutputTokens: 600,
        },
      });

      const reply =
        response.text?.trim() ||
        generateOfflineResponse(userText, transactions, budgetConfig, subscriptions, savingsGoals, currency);

      setMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
    } catch (err) {
      console.error('Gemini AI error, activating 100+ intent offline engine:', err);
      const fallbackReply = generateOfflineResponse(
        userText,
        transactions,
        budgetConfig,
        subscriptions,
        savingsGoals,
        currency
      );
      setMessages((prev) => [...prev, { sender: 'ai', text: fallbackReply }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const suggestedPrompts = [
    { label: '📊 Full summary', text: 'Give me a full financial summary for this month' },
    { label: '📂 Category breakdown', text: 'Show my category breakdown this month' },
    { label: '🎯 Daily safe pace', text: 'What is my daily safe spending pace?' },
    { label: '🍔 Swiggy spend', text: 'How much have I spent on Swiggy?' },
    { label: '🛍️ Can I afford ₹5,000?', text: 'Can I afford a ₹5,000 purchase right now?' },
    { label: '💸 Top expenses', text: 'What are my biggest single expenses?' },
    { label: '💳 Subscriptions audit', text: 'List all my active subscriptions and annual cost' },
    { label: '📊 50/30/20 rule', text: 'How does my budget align with the 50/30/20 rule?' },
    { label: '🛡️ Emergency fund', text: 'What is my recommended 3-month & 6-month emergency fund target?' },
  ];

  // Markdown-style text renderer for bold & lists
  const renderText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div
          key={i}
          className={`${
            line.startsWith('•') || line.startsWith('-') ? 'ml-1 my-0.5' : 'my-0.5'
          } leading-relaxed`}
        >
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={j} className="font-extrabold" style={{ color: 'var(--primary)' }}>
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            )
          )}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Draggable Launcher Button */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'fixed',
          left: `${currentPos.x}px`,
          top: `${currentPos.y}px`,
          zIndex: 40,
          touchAction: 'none',
          userSelect: 'none',
          transition: isDraggingRef.current
            ? 'none'
            : 'left 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className="touch-none select-none cursor-grab active:cursor-grabbing"
      >
        <button
          type="button"
          aria-label="Open AI Coach"
          className="w-12 h-12 rounded-full flex items-center justify-center relative shadow-xl border border-white/10 transition-transform hover:scale-110 active:scale-90 cursor-pointer"
          style={{ background: 'var(--primary)' }}
        >
          <Bot className="w-5 h-5" style={{ color: 'var(--on-primary)' }} />
          <span className="absolute -top-1 -right-1 px-1.5 py-px text-[8px] font-black text-white bg-emerald-500 rounded-full border border-white/30 shadow-sm">
            AI
          </span>
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Drawer / Modal */}
      {isOpen && (
        <div
          style={{
            ...getDrawerStyle(),
            background: 'var(--surface-container)',
            borderColor: 'color-mix(in srgb, var(--outline-variant) 50%, transparent)',
            height: '540px',
            maxHeight: '85vh',
          }}
          className="fixed bottom-4 left-3 right-3 sm:bottom-auto sm:left-auto sm:right-auto z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl border animate-fade-in"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerCancel={(e) => e.stopPropagation()}
        >
          {/* Mobile Drag Handle Bar */}
          <div
            onClick={() => setIsOpen(false)}
            className="w-full py-2 flex items-center justify-center cursor-pointer"
            style={{ background: 'var(--surface-container-high)' }}
          >
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--outline-variant)' }} />
          </div>

          {/* Header */}
          <div
            className="px-4 py-2.5 flex items-center justify-between border-b"
            style={{
              background: 'var(--surface-container-high)',
              borderColor: 'color-mix(in srgb, var(--outline-variant) 40%, transparent)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl border"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                }}
              >
                <Sparkles className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold" style={{ color: 'var(--on-surface)' }}>
                  Tracky — AI Coach
                </h3>
                <p className="text-[10px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  Gemini 2.0 Flash • 100+ Intent Engine
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close AI Coach"
              className="p-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message History Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 text-xs ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div
                    className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',
                      color: 'var(--primary)',
                    }}
                  >
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className="px-3 py-2.5 rounded-2xl max-w-[85%]"
                  style={
                    msg.sender === 'user'
                      ? { background: 'var(--primary)', color: 'var(--on-primary)', borderRadius: '16px 16px 4px 16px' }
                      : {
                          background: 'var(--surface-container-lowest)',
                          color: 'var(--on-surface)',
                          border: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)',
                          borderRadius: '16px 16px 16px 4px',
                        }
                  }
                >
                  {msg.sender === 'ai' ? renderText(msg.text) : msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl w-fit"
                style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Auditing your finances...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompt Pills */}
          <div
            className="px-3 py-1.5 flex gap-1.5 overflow-x-auto border-t no-scrollbar"
            style={{ borderColor: 'color-mix(in srgb, var(--outline-variant) 30%, transparent)' }}
          >
            {suggestedPrompts.map((sp, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(sp.text)}
                disabled={loading}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50 border"
                style={{
                  background: 'var(--surface-container-lowest)',
                  color: 'var(--on-surface-variant)',
                  borderColor: 'color-mix(in srgb, var(--outline-variant) 50%, transparent)',
                }}
              >
                {sp.label}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleFormSubmit}
            className="p-2.5 flex gap-2 border-t"
            style={{
              background: 'var(--surface-container-high)',
              borderColor: 'color-mix(in srgb, var(--outline-variant) 30%, transparent)',
            }}
          >
            <input
              type="text"
              placeholder="Ask anything (e.g. 'Swiggy spend', 'Can I afford ₹3k?', 'Emergency fund')..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 rounded-xl px-3 py-2 text-xs outline-none border transition-colors"
              style={{
                background: 'var(--surface-container-lowest)',
                color: 'var(--on-surface)',
                borderColor: 'color-mix(in srgb, var(--outline-variant) 50%, transparent)',
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-40 flex items-center justify-center"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
