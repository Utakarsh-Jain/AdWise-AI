'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import { 
  Send, 
  Sparkles, 
  Loader2, 
  User as UserIcon, 
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Target,
  AlertCircle
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function CampaignChat() {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    setMessages([
      {
        id: 'greet',
        sender: 'ai',
        text: `Hello! I am your **AdWise AI CMO Analyst**. I have indexed your campaign performance data.

Feel free to ask me detailed analytical questions! Here are some ideas:
- *"Which campaign has the best CPA?"*
- *"Why are Meta budgets inefficient?"*
- *"Give me a summary of platform conversions."*`,
        timestamp: new Date()
      }
    ]);
  }, []);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !token) return;

    setError(null);
    const userMsgId = Date.now().toString();
    const newUserMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: textToSend })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to communicate with AI analyst.');

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.reply,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to connect to AI server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const handleQuickAction = (question: string) => {
    handleSendMessage(question);
  };

  // Zero-dependency markdown text parser inside chat balloons
  const renderMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // 1. Bullet points
      if (line.trim().startsWith('- ')) {
        const cleaned = line.trim().replace('- ', '');
        return (
          <li key={idx} className="text-xs list-disc ml-4 py-0.5 leading-relaxed">
            {renderInlineMarkdown(cleaned)}
          </li>
        );
      }
      // 2. Empty spaces
      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }
      // 3. Notices
      if (line.startsWith('*Notice:') || line.startsWith('*Note:')) {
        return (
          <div key={idx} className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-lg text-[10px] text-slate-500 italic my-1 leading-relaxed flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>{line.replace(/\*/g, '')}</span>
          </div>
        );
      }
      // 4. Default Paragraph
      return (
        <p key={idx} className="text-xs leading-relaxed py-0.5">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  const renderInlineMarkdown = (text: string) => {
    const regex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <strong key={match.index} className="font-bold text-zinc-950 dark:text-slate-100">
          {match[1]}
        </strong>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] md:h-[calc(100vh-6rem)] flex flex-col justify-between z-10 relative">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            AI Data Analyst Chat
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Query your marketing dashboards and reallocations in natural language.
          </p>
        </div>
        
        <div className="hidden sm:flex bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-xl text-zinc-900 dark:text-zinc-200 text-xs font-semibold items-center gap-2 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-zinc-500 animate-pulse" />
          Virtual CMO Online
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2 min-h-0">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 max-w-[90%] sm:max-w-[85%] ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* User Avatar */}
              <div className={`p-2 rounded-xl border shrink-0 ${
                isUser 
                  ? 'bg-zinc-950 border-zinc-900 text-white' 
                  : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}>
                {isUser ? <UserIcon className="w-4 h-4" /> : <MessageSquare className="w-4 h-4 text-zinc-500" />}
              </div>

              {/* Message Balloons */}
              <div className={`rounded-2xl p-4 border text-zinc-800 dark:text-zinc-200 shadow-sm ${
                isUser 
                  ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-700 rounded-tr-none' 
                  : 'bg-white dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-700 rounded-tl-none backdrop-blur-md'
              }`}>
                {isUser ? (
                  <p className="text-xs text-zinc-900 dark:text-zinc-200 leading-relaxed font-medium">{msg.text}</p>
                ) : (
                  <div className="space-y-1">{renderMessageText(msg.text)}</div>
                )}
                <span className="block text-[8px] text-zinc-500 font-bold mt-2 text-right">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-3.5 max-w-[80%]">
            <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 shrink-0">
              <MessageSquare className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="rounded-2xl p-4 bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700 rounded-tl-none backdrop-blur-md flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-zinc-900 dark:text-zinc-100" />
              <span className="text-xs text-zinc-500 font-medium">AI Analyst is calculating...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3 max-w-md mx-auto">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span className="text-xs text-rose-300">{error}</span>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Input Area + Action Chips */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 shrink-0 space-y-4 bg-zinc-50 dark:bg-zinc-950">
        {/* Action chips (Quick prompts) */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickAction('Which is my best campaign?')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900/70 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-semibold transition-all group"
            >
              <Target className="w-3.5 h-3.5 text-zinc-600" />
              Best performing campaign
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
            </button>
            <button
              onClick={() => handleQuickAction('Which campaign is the worst?')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900/70 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-semibold transition-all group"
            >
              <TrendingUp className="w-3.5 h-3.5 text-zinc-600" />
              Identify underperforming campaigns
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
            </button>
            <button
              onClick={() => handleQuickAction('How should I reallocate my budgets?')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900/70 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-semibold transition-all group"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-500 animate-pulse" />
              Show budget optimizations
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
            </button>
          </div>
        )}

        {/* TextInput form */}
        <form onSubmit={handleSubmit} className="flex gap-3 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder={loading ? 'Waiting for response...' : 'Ask your AI Analyst... e.g. "Platform rankings?"'}
            className="flex-1 px-4 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950/40 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-zinc-500 transition-all text-xs disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 border border-transparent rounded-xl shadow-lg text-white bg-zinc-950 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-zinc-600/10 hover:scale-[1.02] flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
