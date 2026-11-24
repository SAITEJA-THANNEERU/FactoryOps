import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.ts';
import { useData } from '../contexts/DataContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  X,
  Send,
  Loader2,
  Bot,
  RotateCcw,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Wrench,
  Check,
  Copy,
  Server,
  Radio,
  Factory,
  BarChart3
} from 'lucide-react';
import { formatNumber } from '../utils/formatters.ts';
import { useLockBodyScroll } from '../utils/useLockBodyScroll.ts';
import { ChatMarkdown, normalizeEscapedMarkdown } from './ChatMarkdown.tsx';
import type { Machine } from '../types/index.ts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  greetingKind?: 'initial' | 'reset';
}

type MachineCountStatus = 'loading' | 'loaded' | 'error';

function buildGreetingText(
  kind: 'initial' | 'reset',
  firstName: string,
  status: MachineCountStatus,
  count: number | null
): string {
  if (kind === 'reset') {
    if (status === 'loading') {
      return 'Chat session reset. Retrieving live equipment count from plant telemetry... How can I assist?';
    }
    if (status === 'loaded' && count !== null) {
      return `Chat session reset. Live telemetry active across ${count} registered ${count === 1 ? 'machine' : 'machines'}. How can I assist?`;
    }
    return 'Chat session reset. Live plant operations and maintenance telemetry is active. How can I assist?';
  }

  if (status === 'loading') {
    return `Hello ${firstName}. I am your FactoryOps Operations & Maintenance Copilot. Retrieving live plant equipment inventory... How can I assist your shift?`;
  }
  if (status === 'loaded' && count !== null) {
    return `Hello ${firstName}. I am your FactoryOps Operations & Maintenance Copilot. I have live access to plant telemetry across all ${count} registered ${count === 1 ? 'equipment asset' : 'equipment assets'}. How can I assist your shift?`;
  }
  return `Hello ${firstName}. I am your FactoryOps Operations & Maintenance Copilot. I have live access to plant operations and maintenance telemetry. How can I assist your shift?`;
}

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_QUESTIONS = [
  {
    label: 'Machine status',
    prompt: 'What is the current machine status across our registered equipment?',
    icon: Factory,
    iconClass: 'text-blue-600'
  },
  {
    label: 'Open work orders',
    prompt: 'Summarize all open work orders and their priorities.',
    icon: Wrench,
    iconClass: 'text-sky-600'
  },
  {
    label: 'Unresolved incidents',
    prompt: 'List all unresolved incidents and critical alerts.',
    icon: AlertTriangle,
    iconClass: 'text-red-500'
  },
  {
    label: 'Production summary',
    prompt: 'Provide a current production summary and OEE overview.',
    icon: BarChart3,
    iconClass: 'text-teal-600'
  }
];

export const AIChatModal: React.FC<AIChatModalProps> = ({ isOpen, onClose }) => {
  useLockBodyScroll(isOpen);
  const { user, activeFactory } = useAuth();
  const { machines, incidents, kpis } = useData();

  const firstName = user?.name?.split(' ')[0] || 'Operator';
  const [machineCountStatus, setMachineCountStatus] = useState<MachineCountStatus>('loading');
  const [liveMachines, setLiveMachines] = useState<Machine[] | null>(null);
  const liveMachineCount = liveMachines !== null ? liveMachines.length : null;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: buildGreetingText('initial', firstName, 'loading', null),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      greetingKind: 'initial'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string>(
    () => `factoryops-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    api.ai.getStatus()
      .then(status => {
        if (!cancelled) setAiConfigured(status.configured);
      })
      .catch(() => {
        if (!cancelled) setAiConfigured(false);
      });

    setMachineCountStatus('loading');
    api.machines.getAll(activeFactory?.id)
      .then(fetchedMachines => {
        if (cancelled) return;
        if (Array.isArray(fetchedMachines)) {
          setLiveMachines(fetchedMachines);
          setMachineCountStatus('loaded');
        } else {
          setLiveMachines(null);
          setMachineCountStatus('error');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLiveMachines(null);
        setMachineCountStatus('error');
      });

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
      scrollToBottom();
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(focusTimer);
    };
  }, [isOpen, activeFactory?.id]);

  useEffect(() => {
    setMessages(prev =>
      prev.map(msg =>
        msg.greetingKind
          ? {
              ...msg,
              text: buildGreetingText(msg.greetingKind, firstName, machineCountStatus, liveMachineCount)
            }
          : msg
      )
    );
  }, [firstName, machineCountStatus, liveMachineCount]);

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
      const historyPayload = messages
        .filter(m => !(m.greetingKind && machineCountStatus === 'loading'))
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          text: m.text
        }));

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI Copilot request timed out. Please check server connection and retry.')), 28000)
      );

      const res = await Promise.race([
        api.ai.chat(text, chatSessionId, historyPayload),
        timeoutPromise
      ]);

      const assistantMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: res.answer || res.reply || 'Operational analysis completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('AI chat failed:', err);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `⚠️ ${err.message || 'Unable to connect to AI Assistant. Please try again shortly.'}`,
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
    navigator.clipboard.writeText(normalizeEscapedMarkdown(text));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setChatSessionId(`factoryops-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        text: buildGreetingText('reset', firstName, machineCountStatus, liveMachineCount),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        greetingKind: 'reset'
      }
    ]);
  };

  if (!isOpen) return null;

  const displayMachines = liveMachines ?? machines;
  const totalMachinesCount = liveMachines !== null ? liveMachines.length : machines.length > 0 ? machines.length : null;
  const runningCount = displayMachines.filter(m => {
    const s = String(m.status || '').toLowerCase();
    return s === 'running' || s === 'active';
  }).length;

  const criticalCount = incidents.filter(
    i => i.severity === 'Critical' && String(i.status || '').toLowerCase() !== 'closed'
  ).length;

  const computedOee =
    typeof kpis?.oee === 'number'
      ? kpis.oee
      : displayMachines.length > 0
        ? displayMachines.reduce((acc, m) => acc + (Number(m.oee) || 0), 0) / displayMachines.length
        : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-2xs flex items-end sm:items-center justify-end sm:p-5 p-0 pointer-events-auto">
      <div
        className={`bg-white border border-slate-200/90 shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          isExpanded
            ? 'w-full h-full sm:w-[760px] sm:h-[86vh] sm:rounded-2xl'
            : 'w-full h-[92vh] sm:w-[560px] sm:h-[680px] sm:rounded-2xl'
        }`}
      >
        {/* Header */}
        <div className="bg-[#16233b] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#18488a] flex items-center justify-center text-white shrink-0 shadow-inner">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight truncate">
                FactoryOps AI Copilot
              </h2>
              <p className="text-xs text-slate-300 truncate mt-0.5">
                Operations &amp; Maintenance Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleResetChat}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Reset conversation"
              aria-label="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden sm:inline-flex cursor-pointer"
              title={isExpanded ? 'Collapse' : 'Expand'}
              aria-label={isExpanded ? 'Collapse window' : 'Expand window'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Close"
              aria-label="Close AI Copilot"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Metrics Section */}
        <div className="bg-white border-b border-slate-200/90 px-4 py-2.5 shrink-0">
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2.5 sm:gap-0 sm:divide-x sm:divide-slate-200">
            {/* Machines Online */}
            <div className="flex items-center gap-2.5 sm:pr-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600 shrink-0">
                <Server className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                {machineCountStatus === 'loading' && totalMachinesCount === null ? (
                  <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Syncing...</span>
                  </div>
                ) : totalMachinesCount !== null ? (
                  <div className="text-xs font-bold text-slate-900">
                    {runningCount} / {totalMachinesCount}
                  </div>
                ) : (
                  <div className="text-xs font-bold text-slate-700">Active</div>
                )}
                <div className="text-[11px] text-slate-500">Machines Online</div>
              </div>
            </div>

            {/* Critical Alerts */}
            <div className="flex items-center gap-2.5 sm:px-4">
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200/70 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <div className="text-xs font-bold text-red-600">{criticalCount}</div>
                <div className="text-[11px] text-slate-500">Critical Alerts</div>
              </div>
            </div>

            {/* OEE */}
            <div className="flex items-center gap-2.5 sm:px-4">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="leading-tight">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">OEE</div>
                <div className="text-xs font-bold text-slate-900">
                  {computedOee !== null ? `${formatNumber(computedOee, 1)}%` : '—'}
                </div>
              </div>
            </div>

            {/* Live Telemetry Status */}
            <div className="flex items-center justify-start sm:justify-end sm:pl-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-semibold">
                <Radio className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Telemetry</span>
              </span>
            </div>
          </div>
        </div>

        {/* AI Configuration Warning Banner if unconfigured */}
        {aiConfigured === false && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-[11px] text-amber-800 flex items-start gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <strong>AI Assistant backend authentication not configured:</strong> Set{' '}
              <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px] font-mono">
                RAG_INTERNAL_JWT_SECRET
              </code>{' '}
              on the Express server environment to enable authenticated RAG queries.
            </div>
          </div>
        )}

        {/* Chat Conversation */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-[#f8fafc]">
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-[#e8f0fe] border border-blue-200/70 text-[#18488a] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-[13px] group relative ${
                    isUser
                      ? 'bg-[#0b66c3] text-white shadow-xs'
                      : 'bg-[#f1f5f9] border border-slate-200/90 text-slate-800 shadow-2xs'
                  }`}
                >
                  {/* Message Content */}
                  {isUser ? (
                    <div className="whitespace-pre-wrap leading-relaxed font-sans break-words">
                      {msg.text}
                    </div>
                  ) : msg.greetingKind && machineCountStatus === 'loading' ? (
                    <div className="space-y-1.5 font-sans leading-relaxed">
                      <p>{msg.text}</p>
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Loader2 className="w-3 h-3 animate-spin text-[#0b66c3]" />
                        <span>Syncing live machine inventory...</span>
                      </div>
                    </div>
                  ) : (
                    <ChatMarkdown content={msg.text} />
                  )}

                  {/* Message Footer / Copy */}
                  <div
                    className={`mt-1.5 flex items-center justify-between text-[11px] ${
                      isUser ? 'text-blue-100/90' : 'text-slate-500'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-0.5 hover:text-slate-700 cursor-pointer"
                        title="Copy message"
                        aria-label="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-[#1e293b] text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 justify-start items-center">
              <div className="w-8 h-8 rounded-full bg-[#e8f0fe] border border-blue-200/70 text-[#18488a] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#f1f5f9] border border-slate-200/90 rounded-2xl px-4 py-3 text-xs text-slate-600 flex items-center gap-2 shadow-2xs">
                <Loader2 className="w-3.5 h-3.5 text-[#0b66c3] animate-spin" />
                <span className="font-medium">Analyzing factory telemetry...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        <div className="px-4 py-2.5 bg-white border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-xs font-semibold text-slate-700 shrink-0 mr-1">
            Try asking:
          </span>
          {SUGGESTED_QUESTIONS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(item.prompt)}
                disabled={isLoading}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Icon className={`w-3.5 h-3.5 ${item.iconClass}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Message Input & Footer */}
        <div className="px-4 pt-2.5 pb-3 bg-white border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-2xs focus-within:border-[#0b66c3] focus-within:ring-1 focus-within:ring-[#0b66c3] transition-all">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about telemetry, OEE, downtime, SOPs, or maintenance..."
              className="flex-1 bg-transparent border-0 resize-none py-1.5 text-xs sm:text-[13px] text-slate-900 placeholder-slate-400 focus:outline-hidden max-h-24"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              className="w-8 h-8 rounded-lg bg-[#0b66c3] hover:bg-[#0956a6] text-white disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Send message"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-2.5 px-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Connected to live plant data (Supabase)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
