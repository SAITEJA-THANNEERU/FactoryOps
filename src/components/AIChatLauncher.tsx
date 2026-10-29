import React, { useState } from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';
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
      {/* Floating Action Button */}
      <aside aria-label="AI Operations Assistant" className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-2.5 bg-[#191923] hover:bg-[#191923]/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-white/10 hover:scale-[1.02] cursor-pointer"
          title="Open FactoryOps AI Copilot"
        >
          {/* Subtle pulse indicator */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>

          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform duration-200" />
            <span className="text-xs font-bold tracking-tight">AI Copilot</span>
          </div>

          <span className="text-[10px] font-mono font-semibold bg-[#0E79B2] text-white px-1.5 py-0.5 rounded-full ml-0.5">
            Gemini
          </span>
        </button>
      </aside>

      {/* Interactive Modal Drawer */}
      <AIChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
