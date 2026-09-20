import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  User,
  Mail,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Save,
  Server,
  Terminal,
} from 'lucide-react';
import { api } from '../../lib/api';

export const AdminProfileTab: React.FC = () => {
  const [profile, setProfile] = useState<{ name: string; email: string; username: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Profile Edit Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Password Change Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const p = await api.getAdminProfile();
      setProfile(p);
      setName(p.name || '');
      setEmail(p.email || '');
      setUsername(p.username || '');
    } catch (err: any) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await api.updateAdminProfile({ name, email, username });
      setProfile(res.profile);
      setProfileMsg({ text: 'Admin profile updated successfully.', type: 'success' });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      setProfileMsg({ text: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwMsg({ text: 'New passwords do not match.', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }

    setPwSaving(true);
    setPwMsg(null);
    try {
      await api.changeAdminPassword({ current_password: currentPassword, new_password: newPassword });
      setPwMsg({ text: 'Security credentials updated successfully.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwMsg(null), 4000);
    } catch (err: any) {
      setPwMsg({ text: err.message || 'Failed to change password.', type: 'error' });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Admin Account &amp; Security Controls
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Manage administrative credentials, email notification settings, and backend authorization secrets
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="p-6 rounded-2xl bg-[#0D1017] border border-[#1A1C23] space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1A1C23] pb-3">
              <User className="w-4 h-4 text-[#00E5FF]" />
              Admin Profile Information
            </h3>

            {profileMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 mt-3 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form id="admin-profile-form" onSubmit={handleUpdateProfile} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Admin Display Name
                </label>
                <input
                  type="text"
                  required
                  value={name || ''}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lead Administrator"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Admin Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email || ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@drkvsrit.ac.in"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Admin Username (for login)
                </label>
                <input
                  type="text"
                  required
                  value={username || ''}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{profileSaving ? 'Saving...' : 'Update Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Change Password */}
        <div className="p-6 rounded-2xl bg-[#0D1017] border border-[#1A1C23] space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1A1C23] pb-3">
              <KeyRound className="w-4 h-4 text-amber-400" />
              Change Master Password
            </h3>

            {pwMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 mt-3 ${
                  pwMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {pwMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span>{pwMsg.text}</span>
              </div>
            )}

            <form id="admin-password-form" onSubmit={handleChangePassword} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword || ''}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword || ''}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword || ''}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0A0B0E] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{pwSaving ? 'Updating...' : 'Change Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Security Best Practices Card */}
      <div className="p-5 rounded-2xl bg-[#0D1017] border border-[#1A1C23] space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4 text-[#00E5FF]" />
          Production Environment Variables &amp; Auth Hardening
        </h4>
        <p className="text-xs text-[#9CA3AF] leading-relaxed">
          Admin authentication uses PBKDF2 with SHA-512 cryptographic key derivation (1,000 iterations + secure salt). For dedicated container deployments, you can declare <code className="px-1.5 py-0.5 rounded bg-[#0A0B0E] text-[#00E5FF] font-mono text-[11px]">ADMIN_EMAIL</code>, <code className="px-1.5 py-0.5 rounded bg-[#0A0B0E] text-[#00E5FF] font-mono text-[11px]">ADMIN_PASSWORD</code>, and <code className="px-1.5 py-0.5 rounded bg-[#0A0B0E] text-[#00E5FF] font-mono text-[11px]">ADMIN_SECRET</code> in your container environment secrets.
        </p>
      </div>
    </div>
  );
};
