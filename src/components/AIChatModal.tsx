import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.ts';
import { useData } from '../contexts/DataContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronRight,
  Cpu,
  AlertTriangle,
  Activity,
  Layers,
  Wrench,
  Check,
  Copy
} from 'lucide-react';
import { formatNumber, formatDuration } from '../utils/formatters.ts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  'Analyze equipment downtime and top root causes',
  'Triage open incidents on Line 1 and Line 2',
  'What is current plant OEE and shift shortfall?',
  'Recommend preventive maintenance schedule'
];

export const AIChatModal: React.FC<AIChatModalProps> = ({ isOpen, onClose }) => {
  const { user, activeFactory } = useAuth();
  const { machines, incidents, workOrders, kpis } = useData();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: `Hello ${user?.name?.split(' ')[0] || 'Operator'}. I am your FactoryOps Operations & Maintenance Copilot. I have live access to plant telemetry across all ${machines.length} equipment assets. How can I assist your shift?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      api.ai.getStatus()
        .then(status => setAiConfigured(status.configured))
        .catch(() => setAiConfigured(false));

      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        text: m.text
      }));

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI Copilot request timed out after 15 seconds. Please check server connection and retry.')), 15000)
      );

      const res = await Promise.race([
        api.ai.chat(text, historyPayload),
        timeoutPromise
      ]);

      const assistantMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: res.reply || 'Operational analysis completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('AI chat failed:', err);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `⚠️ ${err.message || 'Unable to connect to AI Assistant. Please verify GEMINI_API_KEY in your .env file.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        text: `Chat session reset. Live telemetry active across ${machines.length} machines. How can I assist?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  if (!isOpen) return null;

  const runningCount = machines.filter(m => m.status === 'running' || m.status === 'Active').length;
  const warningCount = machines.filter(m => m.status === 'warning').length;
  const criticalCount = incidents.filter(i => i.severity === 'Critical').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-2xs flex items-end sm:items-center justify-end sm:justify-end sm:p-6 p-0 pointer-events-auto">
      <div
        className={`bg-white border border-slate-200 shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          isExpanded
            ? 'w-full h-full sm:w-[720px] sm:h-[85vh] sm:rounded-2xl'
            : 'w-full h-[90vh] sm:w-[460px] sm:h-[640px] sm:rounded-2xl'
        }`}
      >
        {/* Header */}
        <div className="bg-[#191923] text-white px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">FactoryOps AI Copilot</span>
                <span className="text-[9px] font-mono font-bold bg-[#0E79B2] text-white px-1.5 py-0.2 rounded">
                  Gemini 3.8
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{activeFactory?.name || 'Austin Gigafactory'}</span>
                <span>•</span>
                <span>Live Grounded Telemetry</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChat}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors hidden sm:block"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Grounding Snapshot Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-emerald-600" />
              <strong className="text-slate-900">{runningCount}/{machines.length}</strong> Running
            </span>
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-amber-700">
                <Activity className="w-3 h-3 text-amber-600" />
                <strong>{warningCount}</strong> Alerts
              </span>
            )}
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 text-rose-700 font-bold">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                {criticalCount} Critical
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {aiConfigured === true && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Gemini Live
              </span>
            )}
            {aiConfigured === false && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                Key Missing (.env)
              </span>
            )}
            <span className="text-[10px] font-mono text-slate-500">
              OEE: {formatNumber(kpis?.oee || 90.24, 1)}%
            </span>
          </div>
        </div>

        {/* AI Key Configuration Warning Banner if unconfigured */}
        {aiConfigured === false && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-[11px] text-amber-800 flex items-start gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <strong>Gemini API key not configured:</strong> To activate live generative AI responses, add <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px] font-mono">GEMINI_API_KEY</code> to your <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px] font-mono">.env</code> file. Mock responses are disabled to ensure operational authenticity.
            </div>
          </div>
        )}

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-[#191923] text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-3 text-xs shadow-2xs group relative ${
                    isUser
                      ? 'bg-[#0E79B2] text-white rounded-br-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  {/* Message Content */}
                  <div className="whitespace-pre-wrap leading-relaxed space-y-1 font-sans">
                    {msg.text}
                  </div>

                  {/* Message Footer / Copy */}
                  <div
                    className={`mt-1.5 flex items-center justify-between text-[10px] ${
                      isUser ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 hover:text-slate-700"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs text-[10px] font-bold">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 justify-start items-center">
              <div className="w-7 h-7 rounded-lg bg-[#191923] text-emerald-400 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 flex items-center gap-2 shadow-2xs">
                <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                <span className="font-medium">Analyzing factory telemetry...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Prompt:
          </span>
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={isLoading}
              className="shrink-0 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full border border-slate-200 transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-300 rounded-xl p-1.5 focus-within:border-[#0E79B2] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#0E79B2] transition-all">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Copilot about telemetry, OEE, downtime, or SOPs... (Enter to send)"
              className="flex-1 bg-transparent border-0 resize-none px-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              className="p-2 rounded-lg bg-[#0E79B2] hover:bg-[#0E79B2]/90 text-white disabled:bg-slate-300 disabled:text-slate-500 transition-colors cursor-pointer shrink-0"
              title="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
            <span>Powered by Gemini 3.8 Flash • Live Supabase Telemetry</span>
            <span>Shift+Enter for newline</span>
          </div>
        </div>
      </div>
    </div>
  );
};
