import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Megaphone,
  UserCheck,
  Award,
} from 'lucide-react';
import { SiteSettings } from '../../types';

interface AdminSettingsTabProps {
  settings: SiteSettings | null;
  onSaveSettings: (settings: SiteSettings) => Promise<void>;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<SiteSettings>({
    club_name: 'INTELLIGENZ',
    club_tagline: 'Empowering Next-Gen AI Innovators & Leaders',
    department_name: 'Department of CSE (AIML) & AI',
    college_name: 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
    contact_email: 'intelligenz.club@drkvsrit.ac.in',
    contact_phone: '+91 98765 43210',
    contact_address: 'AI & Data Science Block, Room 304, DR. KVSRIT Campus, Kurnool, Andhra Pradesh - 518218',
    is_recruitment_open: true,
    join_us_status: true,
    certificate_signing_authority: 'Dr. K. E. Sreenivasa Murthy',
    certificate_lead_name: 'Dr. K. E. Sreenivasa Murthy',
    certificate_lead_designation: 'Faculty Coordinator & HOD - CSE (AIML)',
    social_links: {
      github: 'https://github.com/intelligenz-club',
      linkedin: 'https://linkedin.com/company/intelligenz-club',
      instagram: 'https://instagram.com/intelligenz_kvsrit',
      youtube: 'https://youtube.com',
      discord: 'https://discord.gg',
    },
    announcement_ticker: 'Welcome to INTELLIGENZ — Official Website of CSE (AIML) & AI Club at DR. KVSRIT!',
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        club_name: settings.club_name || '',
        club_tagline: settings.club_tagline || '',
        department_name: settings.department_name || '',
        college_name: settings.college_name || '',
        contact_email: settings.contact_email || '',
        contact_phone: settings.contact_phone || '',
        contact_address: settings.contact_address || '',
        is_recruitment_open: settings.join_us_status !== undefined ? settings.join_us_status : (settings.is_recruitment_open ?? true),
        join_us_status: settings.join_us_status !== undefined ? settings.join_us_status : (settings.is_recruitment_open ?? true),
        announcement_ticker: settings.announcement_ticker || '',
        certificate_signing_authority: settings.certificate_signing_authority || settings.certificate_lead_name || 'Dr. K. E. Sreenivasa Murthy',
        certificate_lead_name: settings.certificate_lead_name || settings.certificate_signing_authority || 'Dr. K. E. Sreenivasa Murthy',
        certificate_lead_designation: settings.certificate_lead_designation || 'Faculty Coordinator & HOD - CSE (AIML)',
        social_links: {
          github: settings.social_links?.github || '',
          linkedin: settings.social_links?.linkedin || '',
          instagram: settings.social_links?.instagram || '',
          youtube: settings.social_links?.youtube || '',
          discord: settings.social_links?.discord || '',
        },
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await onSaveSettings(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#00E5FF]" />
            Site Configuration &amp; Branding
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Manage institutional identities, contact links, recruitment flags, and live marquee announcements
          </p>
        </div>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Site settings saved and applied successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Brand & Identity */}
        <div className="p-6 rounded-2xl bg-[#0D1017] border border-[#1A1C23] space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1A1C23] pb-3">
            <Globe className="w-4 h-4 text-[#00E5FF]" />
            Identity &amp; Affiliation
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                Club Name *
              </label>
              <input
                type="text"
                required
                value={formData.club_name || ''}
                onChange={(e) => setFormData({ ...formData, club_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                Club Tagline
              </label>
              <input
                type="text"
                value={formData.club_tagline || ''}
                onChange={(e) => setFormData({ ...formData, club_tagline: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                Department Affiliation *
              </label>
              <input
                type="text"
                required
                value={formData.department_name || ''}
                onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                Official College Name *
              </label>
              <input
                type="text"
                required
                value={formData.college_name || ''}
                onChange={(e) => setFormData({ ...formData, college_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
              />
            </div>
          </div>
        </div>

        {/* Ticker & Recruitment Status */}
        <div className="p-6 rounded-2xl bg-[#0D1017] border border-[#1A1C23] space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1A1C23] pb-3">
            <Megaphone className="w-4 h-4 text-amber-400" />
            Live Announcements &amp; Recruitment Status
          </h3>

          <div>
            <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
              Top Header Announcement Marquee
            </label>
            <input
              type="text"
              value={formData.announcement_ticker || ''}
              onChange={(e) => setFormData({ ...formData, announcement_ticker: e.target.value })}
              placeholder="e.g. Registrations now open for HackAI 2026! Join us this weekend..."
              className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Join Us Status */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`p-2.5 rounded-lg border shrink-0 transition-colors ${
                  (formData.join_us_status ?? formData.is_recruitment_open)
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Join Us Status</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-extrabold uppercase border ${
                      (formData.join_us_status ?? formData.is_recruitment_open)
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {(formData.join_us_status ?? formData.is_recruitment_open) ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                  {(formData.join_us_status ?? formData.is_recruitment_open)
                    ? 'Join Us is currently ON: Public website allows prospective students to submit membership applications.'
                    : 'Join Us is currently OFF: Public website displays "We\'re currently not accepting new club member applications." and blocks new submissions.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-center">
              <span className="text-xs text-[#9CA3AF] font-medium hidden xs:inline">
                Join Us Applications
              </span>
              <button
                type="button"
                id="join-us-status-toggle"
                onClick={() => {
                  const currentStatus = formData.join_us_status !== undefined
                    ? formData.join_us_status
                    : (formData.is_recruitment_open ?? true);
                  const nextStatus = !currentStatus;
                  setFormData({
                    ...formData,
                    is_recruitment_open: nextStatus,
                    join_us_status: nextStatus,
                  });
                }}
                className={`px-4 py-2 rounded-lg text-xs font-black font-mono tracking-wider uppercase transition-all duration-200 border cursor-pointer flex items-center gap-1.5 shadow-sm ${
                  (formData.join_us_status ?? formData.is_recruitment_open)
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-[#0A0B0E] border-emerald-400 shadow-emerald-500/20'
                    : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-rose-600/20'
                }`}
              >
                <span>[ {(formData.join_us_status ?? formData.is_recruitment_open) ? 'ON' : 'OFF'} ]</span>
              </button>
            </div>
          </div>
        </div>

        {/* Contact & Social Links */}
        <div className="p-6 rounded-2xl bg-[#0D1017] border border-[#1A1C23] space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1A1C23] pb-3">
            <Mail className="w-4 h-4 text-indigo-400" />
            Official Contact &amp; Social Channels
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                Official Email Address
              </label>
              <input
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                Helpline Phone
              </label>
              <input
                type="text"
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
              Physical Department / Lab Address
            </label>
            <input
              type="text"
              value={formData.contact_address || ''}
              onChange={(e) => setFormData({ ...formData, contact_address: e.target.value })}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-indigo-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                GitHub Organization
              </label>
              <input
                type="url"
                value={formData.social_links?.github || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    social_links: { ...formData.social_links, github: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                LinkedIn Page
              </label>
              <input
                type="url"
                value={formData.social_links?.linkedin || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    social_links: { ...formData.social_links, linkedin: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                Instagram Handle
              </label>
              <input
                type="url"
                value={formData.social_links?.instagram || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    social_links: { ...formData.social_links, instagram: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
              />
            </div>
          </div>
        </div>

        {/* Certificate Credentials & Signing Authority */}
        <div className="p-6 rounded-2xl bg-[#0D1017] border border-[#1A1C23] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1A1C23] pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Certificate Credentials &amp; Verification
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30 uppercase font-bold">
              Dynamic Setting
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="cert-signing-authority-input" className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                Certificate Signing Authority / Lead Name *
              </label>
              <input
                id="cert-signing-authority-input"
                type="text"
                required
                placeholder="e.g. Dr. K. E. Sreenivasa Murthy"
                value={formData.certificate_signing_authority || formData.certificate_lead_name || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    certificate_signing_authority: val,
                    certificate_lead_name: val,
                  });
                }}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
              />
              <p className="text-[11px] text-[#9CA3AF] mt-1.5 leading-relaxed">
                Controls the official signatory lead name rendered dynamically on all student certificates, PDF downloads, and public credential verification views without hardcoded values.
              </p>
            </div>

            <div>
              <label htmlFor="cert-designation-input" className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                Signing Authority Designation
              </label>
              <input
                id="cert-designation-input"
                type="text"
                placeholder="e.g. Faculty Coordinator & HOD - CSE (AIML)"
                value={formData.certificate_lead_designation || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    certificate_lead_designation: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#00E5FF]/20 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
