import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { AIChatModal } from './AIChatModal.tsx';

export const AIChatLauncher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('factoryops:open-ai-chat', handleOpen);
    return () => window.removeEventListener('factoryops:open-ai-chat', handleOpen);
  }, []);

  return (
    <>
      {/* Floating Chatbot Launcher Button */}
      <aside aria-label="AI Operations Assistant" className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-5 py-3 bg-gradient-to-b from-[#17284b] to-[#0f1c36] hover:from-[#1d315c] hover:to-[#132342] text-white rounded-full shadow-[0_8px_24px_rgba(14,121,178,0.28)] hover:shadow-[0_10px_28px_rgba(14,121,178,0.38)] border border-sky-400/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
          title="Open FactoryOps AI Copilot"
        >
          <Bot className="w-5 h-5 text-sky-300 group-hover:scale-105 transition-transform duration-200" />
          <span className="text-sm font-semibold tracking-tight text-white">AI Copilot</span>
        </button>
      </aside>

      {/* Interactive Modal Drawer */}
      <AIChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
