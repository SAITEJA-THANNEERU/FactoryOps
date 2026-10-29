import React from 'react';
import { Clock, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';

interface SessionExpiryModalProps {
  isOpen: boolean;
  timeLeftSeconds: number;
  onExtend: () => Promise<void>;
  onLogout: () => Promise<void>;
  isExtending: boolean;
}

export const SessionExpiryModal: React.FC<SessionExpiryModalProps> = ({
  isOpen,
  timeLeftSeconds,
  onExtend,
  onLogout,
  isExtending
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
        <div className="flex items-center gap-3 text-amber-600">
          <div className="p-2.5 rounded-full bg-amber-50 border border-amber-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Session Expiring Soon</h3>
            <p className="text-xs text-slate-500">Security timeout notice</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          For your operational security, your session will automatically expire in{' '}
          <strong className="text-amber-700 font-mono text-sm font-bold">
            {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </strong>. Any unsaved modal inputs have been automatically drafted locally.
        </p>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Click <strong>Extend Session</strong> to keep working without interruption.</span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onLogout}
            disabled={isExtending}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Save Draft & Logout</span>
          </button>
          <button
            type="button"
            onClick={onExtend}
            disabled={isExtending}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isExtending ? 'animate-spin' : ''}`} />
            <span>{isExtending ? 'Extending...' : 'Extend Session'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
