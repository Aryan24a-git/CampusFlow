'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrls?: string[];
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
      content: 'Hello! I am CampusFlow AI 👋\nHow can I help you today? You can report any campus facility issue, track existing complaints, or ask about campus procedures.\n\n📸 Tip: You can attach a photo before sending to help document the issue!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingCard, setSubmittingCard] = useState<string | null>(null);

  // Image upload state
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle image file selection
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newFiles = files.slice(0, 3 - pendingImages.length); // max 3 total
    setPendingImages(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setPendingPreviews(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pendingImages.length]);

  const removePendingImage = (idx: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== idx));
    setPendingPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  // Upload images to Supabase Storage and return public URLs
  async function uploadImagesToStorage(files: File[]): Promise<string[]> {
    if (files.length === 0) return [];
    setUploadingImages(true);
    const urls: string[] = [];
    try {
      for (const file of files) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `chat-attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('attachments').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (!error) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
          urls.push(urlData.publicUrl);
        }
      }
    } finally {
      setUploadingImages(false);
    }
    return urls;
  }

  async function handleSend(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    const hasText = Boolean(text);
    const hasImages = pendingImages.length > 0;
    if ((!hasText && !hasImages) || loading) return;

    const messageText = hasText ? text : 'I am reporting this issue with the attached photo(s).';

    // Upload any pending images first
    let imageUrls: string[] = [];
    if (pendingImages.length > 0) {
      imageUrls = await uploadImagesToStorage(pendingImages);
    }

    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: messageText,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setPendingImages([]);
    setPendingPreviews([]);
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
        body: JSON.stringify({ message: messageText, imageUrls }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        // Ensure images are securely attached to actionCard data
        const backendImages = resJson.data.actionCard?.data?.image_urls ?? [];
        const combinedImages = Array.from(new Set([...backendImages, ...imageUrls]));

        const actionCard = resJson.data.actionCard
          ? {
              ...resJson.data.actionCard,
              data: {
                ...resJson.data.actionCard.data,
                image_urls: combinedImages,
              },
            }
          : undefined;

        const assistantMsg: Message = {
          id: Math.random().toString(),
          role: 'assistant',
          content: resJson.data.reply,
          actionCard,
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
          image_urls: extracted.image_urls ?? [],
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
            content: `✅ Ticket #${issueId.slice(0, 8)} created successfully! It has been dispatched to the ${extracted.category || 'Maintenance'} department.\n${extracted.image_urls?.length > 0 ? `📎 ${extracted.image_urls.length} photo(s) attached to the ticket.` : ''}`,
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
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>📎</span> <span>Photo uploads supported</span>
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
                {/* Show attached images */}
                {msg.imageUrls && msg.imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.imageUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt={`Attachment ${i + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-white/20 hover:scale-105 transition-transform"
                        />
                      </a>
                    ))}
                  </div>
                )}
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

                      {/* Attached Photo Thumbnails */}
                      {msg.actionCard.data.image_urls && msg.actionCard.data.image_urls.length > 0 && (
                        <div className="pt-2 border-t border-white/5">
                          <div className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                            <span>📷</span> Attached Photos ({msg.actionCard.data.image_urls.length}):
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {msg.actionCard.data.image_urls.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" title="Click to view full photo">
                                <img
                                  src={url}
                                  alt={`Evidence ${i + 1}`}
                                  className="w-16 h-16 object-cover rounded-xl border border-white/20 hover:scale-105 transition-transform"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Direct card photo upload button */}
                      <div className="pt-1">
                        <input
                          type="file"
                          id={`card-upload-${msg.id}`}
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files ?? []);
                            if (files.length === 0) return;
                            const uploaded = await uploadImagesToStorage(files);
                            if (uploaded.length > 0) {
                              setMessages(prev => prev.map(m => {
                                if (m.id === msg.id && m.actionCard) {
                                  const existing = m.actionCard.data.image_urls ?? [];
                                  return {
                                    ...m,
                                    actionCard: {
                                      ...m.actionCard,
                                      data: {
                                        ...m.actionCard.data,
                                        image_urls: Array.from(new Set([...existing, ...uploaded])),
                                      },
                                    },
                                  };
                                }
                                return m;
                              }));
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById(`card-upload-${msg.id}`)?.click()}
                          disabled={uploadingImages}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 text-slate-300 hover:text-blue-300 rounded-lg text-xs flex items-center gap-1.5 transition-all"
                        >
                          <span>📎</span>
                          <span>{uploadingImages ? 'Uploading...' : 'Attach / Add Photo to Ticket'}</span>
                        </button>
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

      {/* Suggested prompts */}
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

      {/* Pending image previews */}
      {pendingPreviews.length > 0 && (
        <div className="flex gap-2 py-2 flex-wrap">
          {pendingPreviews.map((src, i) => (
            <div key={i} className="relative group">
              <img
                src={src}
                alt={`Preview ${i + 1}`}
                className="w-16 h-16 object-cover rounded-xl border border-white/20"
              />
              <button
                onClick={() => removePendingImage(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
          <div className="text-xs text-slate-500 self-end pb-1">
            {pendingPreviews.length}/3 photo{pendingPreviews.length > 1 ? 's' : ''} ready
          </div>
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
        {/* Image attach button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
          disabled={pendingImages.length >= 3}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={pendingImages.length >= 3 || uploadingImages}
          title="Attach photo evidence"
          className={`px-3 py-3 rounded-xl text-sm border transition-all shrink-0 ${
            pendingImages.length > 0
              ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {uploadingImages ? '⏳' : '📎'}
          {pendingImages.length > 0 && (
            <span className="ml-1 text-xs">{pendingImages.length}</span>
          )}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe an issue, request status, or ask a question..."
          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
        />
        <button
          type="submit"
          disabled={loading || (!input.trim() && pendingImages.length === 0)}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        >
          Send
        </button>
      </form>
    </div>
  );
}
