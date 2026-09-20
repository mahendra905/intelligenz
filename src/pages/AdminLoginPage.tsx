import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Shield, Lock, Mail, AlertCircle, Eye, EyeOff, ArrowLeft, Clock } from 'lucide-react';
import { IntelligenzLogo } from '../components/IntelligenzLogo';
import { AUTH_CONFIG } from '../config/authConfig';

interface AdminLoginPageProps {
  onLoginSuccess: (token: string) => void;
  onNavigate: (path: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onNavigate,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiredNotice, setExpiredNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const notice = sessionStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.EXPIRED_REASON);
      if (notice) {
        setExpiredNotice(notice);
        sessionStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.EXPIRED_REASON);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const trimmedIdentifier = identifier.trim();
      const res = await api.adminLogin({
        identifier: trimmedIdentifier,
        email: trimmedIdentifier.includes('@') ? trimmedIdentifier : undefined,
        username: !trimmedIdentifier.includes('@') ? trimmedIdentifier : undefined,
        password,
      });
      onLoginSuccess(res.token);
    } catch (err: any) {
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center pt-24 pb-16 px-4 bg-[#0A0B0E]">
      <div className="w-full max-w-md rounded-2xl bg-[#0D1017] border border-[#1A1C23] p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden text-left">
        {/* Subtle cyan glow */}
        <div className="absolute top-0 right-0 w-48 h-32 bg-[#00E5FF]/5 rounded-full blur-3xl pointer-events-none" />

        <button
          id="admin-back-to-home-btn"
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#00E5FF] transition-colors mb-6 font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Public Website</span>
        </button>

        <div className="text-center mb-6 space-y-2">
          <div className="flex justify-center">
            <IntelligenzLogo size="sm" interactive={false} />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold uppercase tracking-widest text-[#00E5FF] font-['Outfit']">
              INTELLIGENZ CLUB
            </div>
            <h1 className="text-2xl font-black text-white font-['Outfit'] tracking-tight">
              ADMIN PORTAL
            </h1>
          </div>
          <p className="text-xs text-[#9CA3AF]">
            CSE (AIML) &amp; AI • DR. KVSRIT
          </p>
        </div>

        {expiredNotice && (
          <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Clock className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{expiredNotice}</span>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 uppercase tracking-wider">
              ADMIN EMAIL OR USERNAME
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="admin-login-identifier"
                type="text"
                required
                autoComplete="username"
                value={identifier || ''}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter admin email or username"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder:text-[#4B5563] focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#D1D5DB] uppercase tracking-wider">
                PASSWORD
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[#6B7280] hover:text-[#00E5FF] flex items-center gap-1 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="admin-login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password || ''}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder:text-[#4B5563] focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              id="admin-login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] font-bold text-xs text-[#0A0B0E] uppercase tracking-widest shadow-lg shadow-[#00E5FF]/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0A0B0E]/30 border-t-[#0A0B0E] rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>SIGN IN TO ADMIN PORTAL</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-[#1A1C23] text-center text-[10px] text-[#6B7280] font-medium">
          Official Digital Platform of IntelliGenZ Club
          <div className="text-[9px] uppercase tracking-wider text-[#4B5563] mt-0.5">
            DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY
          </div>
        </div>
      </div>
    </div>
  );
};
