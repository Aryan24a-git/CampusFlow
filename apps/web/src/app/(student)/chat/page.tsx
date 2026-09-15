'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actionCard?: {
    type: 'issue_confirmation' | 'duplicate_found' | 'issue_status' | 'lost_found_match';
    data: any;
  };
  timestamp: string;
}

const SAMPLE_PROMPTS = [
  '⚡ Broken ceiling fan in Hostel B Room 204',
  '💧 Water tap leaking in Hostel A washroom',
  '📶 Wi-Fi is down in CSE Lab 302',
  '📚 What are the library timings on weekends?',
  '🔍 I lost my college ID card near cafeteria',
];

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am CampusFlow AI 👋\nHow can I help you today? You can report any campus facility issue, track existing complaints, or ask about campus procedures.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingCard, setSubmittingCard] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        const assistantMsg: Message = {
          id: Math.random().toString(),
          role: 'assistant',
          content: resJson.data.reply,
          actionCard: resJson.data.actionCard,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        throw new Error(resJson.error || 'Failed to process message');
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: `Sorry, I encountered an issue processing that: ${err.message || 'Server error'}. You can still report issues manually via the "My Issues" tab.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmTicket(extracted: any, cardId: string) {
    setSubmittingCard(cardId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

      const res = await fetch(`${backendUrl}/api/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: extracted.title,
          description: extracted.description,
          category: extracted.category,
          subcategory: extracted.subcategory,
          location_label: extracted.location_label,
          severity: extracted.severity,
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        const issueId = resJson.data.id;
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            role: 'assistant',
            content: `✅ Ticket #${issueId.slice(0, 8)} created successfully! It has been dispatched to the ${extracted.category || 'Maintenance'} department.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        router.push(`/issues/${issueId}`);
      } else {
        alert(resJson.error || 'Failed to create issue');
      }
    } catch (err: any) {
      alert(`Error submitting ticket: ${err.message}`);
    } finally {
      setSubmittingCard(null);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
            🤖
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              CampusFlow Assistant
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </h1>
            <p className="text-xs text-slate-400">Natural language ticket resolution & campus AI</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[78%]">
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs shrink-0 mb-1">
                  CF
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20'
                    : 'bg-white/10 text-slate-100 rounded-bl-none border border-white/10 backdrop-blur-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <div
                  className={`text-[10px] mt-1 text-right ${
                    msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>

            {/* Action Cards */}
            {msg.actionCard && (
              <div className="mt-3 w-full max-w-md ml-9">
                {/* Issue Confirmation Card */}
                {msg.actionCard.type === 'issue_confirmation' && (
                  <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 shadow-xl shadow-blue-900/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                        Extracted Ticket Preview
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                        {msg.actionCard.data.severity || 'Medium'} Priority
                      </span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 space-y-2 border border-white/5">
                      <div className="font-semibold text-white text-sm">
                        {msg.actionCard.data.title}
                      </div>
                      <p className="text-xs text-slate-300">
                        {msg.actionCard.data.description}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-400">
                        <span className="bg-white/10 px-2 py-1 rounded-md text-[11px]">
                          🏷️ {msg.actionCard.data.category}
                        </span>
                        <span className="bg-white/10 px-2 py-1 rounded-md text-[11px]">
                          📍 {msg.actionCard.data.location_label}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleConfirmTicket(msg.actionCard!.data, msg.id)}
                      disabled={submittingCard === msg.id}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl text-xs transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submittingCard === msg.id ? (
                        <span>Creating Ticket...</span>
                      ) : (
                        <span>✅ Confirm & Dispatch Ticket</span>
                      )}
                    </button>
                  </div>
                )}

                {/* Duplicate Found Card */}
                {msg.actionCard.type === 'duplicate_found' && (
                  <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                      <span>⚠️</span> Potential Duplicate Incident Found
                    </div>
                    <p className="text-xs text-slate-300">
                      An active report already exists for <strong>{msg.actionCard.data.location_label}</strong>.
                      Joining it increases priority and ensures faster dispatch.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/issues/${msg.actionCard!.data.existingIssueId}`)}
                        className="flex-1 py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-medium transition-all"
                      >
                        Join Incident
                      </button>
                      <button
                        onClick={() => handleConfirmTicket(msg.actionCard!.data, msg.id)}
                        className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-all"
                      >
                        Create New Anyway
                      </button>
                    </div>
                  </div>
                )}

                {/* Issue Status Card */}
                {msg.actionCard.type === 'issue_status' && (
                  <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Active Tickets
                    </div>
                    {msg.actionCard.data.issues?.map((iss: any) => (
                      <div
                        key={iss.id}
                        onClick={() => router.push(`/issues/${iss.id}`)}
                        className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 cursor-pointer transition-all"
                      >
                        <div className="truncate mr-2">
                          <div className="text-xs font-medium text-white truncate">{iss.title}</div>
                          <div className="text-[10px] text-slate-400">{iss.category}</div>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 shrink-0">
                          {iss.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs ml-9">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>CampusFlow AI is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts (if message history is short) */}
      {messages.length <= 2 && (
        <div className="py-2 overflow-x-auto flex gap-2 no-scrollbar">
          {SAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt.slice(2).trim())}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 whitespace-nowrap transition-all shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-3 border-t border-white/10 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe an issue, request status, or ask a question..."
          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        >
          Send
        </button>
      </form>
    </div>
  );
}
