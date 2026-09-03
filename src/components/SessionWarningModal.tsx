import React, { useEffect } from 'react';
import { Clock, RefreshCw, LogOut, X, AlertTriangle } from 'lucide-react';

interface SessionWarningModalProps {
  isOpen: boolean;
  remainingMs: number;
  onStaySignedIn: () => void;
  onSignOut: () => void;
  isVerifying?: boolean;
}

export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  isOpen,
  remainingMs,
  onStaySignedIn,
  onSignOut,
  isVerifying = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Do not dismiss without action; pressing enter can stay signed in
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Format remaining time as MM:SS
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      id="session-warning-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="session-warning-modal-box"
        className="w-full max-w-md bg-[#0D1017] border border-amber-500/30 rounded-2xl p-6 shadow-2xl shadow-amber-950/40 text-left relative animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Session Expiring Soon
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {formattedTime}
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-1.5 leading-relaxed">
              Your session will expire in{' '}
              <span className="font-mono text-amber-300 font-bold">
                {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds} seconds`}
              </span>{' '}
              due to inactivity.
            </p>
            <p className="text-[11px] text-[#6B7280] mt-1 leading-relaxed">
              Select <span className="text-[#00E5FF] font-semibold">Stay Signed In</span> to keep your administrator session active and resume working.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1C23] mt-2">
          <button
            id="session-warning-signout-btn"
            type="button"
            onClick={onSignOut}
            className="px-4 py-2.5 rounded-xl border border-[#1A1C23] text-xs font-semibold text-[#9CA3AF] hover:text-white hover:bg-[#1A1C23] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Now</span>
          </button>
          <button
            id="session-warning-stay-btn"
            type="button"
            disabled={isVerifying}
            onClick={onStaySignedIn}
            className="px-5 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-bold text-xs shadow-lg shadow-[#00E5FF]/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isVerifying ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Stay Signed In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
