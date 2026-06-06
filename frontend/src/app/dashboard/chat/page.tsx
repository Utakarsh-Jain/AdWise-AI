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
        <strong key={match.index} className="font-bold text-slate-200">
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
    <div className="h-[calc(100vh-6rem)] flex flex-col justify-between z-10 relative">
      {/* Header */}
      <div className="pb-4 border-b border-slate-900 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            AI Data Analyst Chat
          </h1>
          <p className="text-slate-400 mt-1">
            Query your marketing dashboards and reallocations in natural language.
          </p>
        </div>
        
        <div className="bg-indigo-600/15 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-indigo-400 text-xs font-semibold flex items-center gap-2 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Virtual CMO Online
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-2 min-h-0">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 max-w-[85%] ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* User Avatar */}
              <div className={`p-2 rounded-xl border shrink-0 ${
                isUser 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10' 
                  : 'bg-slate-900 border-slate-850 text-slate-400'
              }`}>
                {isUser ? <UserIcon className="w-4 h-4" /> : <MessageSquare className="w-4 h-4 text-indigo-400" />}
              </div>

              {/* Message Ballons */}
              <div className={`rounded-2xl p-4 border text-slate-350 shadow-sm ${
                isUser 
                  ? 'bg-slate-900/60 border-slate-850/80 rounded-tr-none' 
                  : 'bg-slate-900/40 border-slate-800/80 rounded-tl-none backdrop-blur-md'
              }`}>
                {isUser ? (
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">{msg.text}</p>
                ) : (
                  <div className="space-y-1">{renderMessageText(msg.text)}</div>
                )}
                <span className="block text-[8px] text-slate-600 font-bold mt-2 text-right">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-3.5 max-w-[80%]">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-850 text-indigo-400 shrink-0">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="rounded-2xl p-4 bg-slate-900/40 border border-slate-800/80 rounded-tl-none backdrop-blur-md flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span className="text-xs text-slate-500 font-medium">AI Analyst is calculating...</span>
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
      <div className="pt-4 border-t border-slate-900 shrink-0 space-y-4 bg-slate-950/85">
        {/* Action chips (Quick prompts) */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => handleQuickAction('Which is my best campaign?')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-850 hover:border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all group"
            >
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              Best performing campaign
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
            </button>
            <button
              onClick={() => handleQuickAction('Which campaign is the worst?')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-850 hover:border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all group"
            >
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
              Identify underperforming campaigns
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
            </button>
            <button
              onClick={() => handleQuickAction('How should I reallocate my budgets?')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-850 hover:border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all group"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
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
            className="flex-1 px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-xs disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 border border-transparent rounded-xl shadow-lg text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-indigo-600/10 hover:scale-[1.02] flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
