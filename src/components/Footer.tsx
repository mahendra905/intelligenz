import React, { useState } from 'react';
import { IntelligenzLogo } from './IntelligenzLogo';
import {
  Mail,
  MapPin,
  Phone,
  ArrowUpRight,
  Sparkles,
  Shield,
  Heart,
  Globe,
  Award,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { SiteSettings } from '../types';
import { api } from '../lib/api';

interface FooterProps {
  onNavigate: (path: string) => void;
  settings?: SiteSettings;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, settings }) => {
  const currentYear = new Date().getFullYear();
  const [subEmail, setSubEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subStatus, setSubStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleNav = (path: string) => {
    onNavigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail.trim()) return;
    setSubscribing(true);
    setSubStatus(null);
    try {
      const res = await api.subscribeNewsletter({
        email: subEmail.trim(),
        name: 'Student Subscriber',
        department: 'CSE (AIML)',
      });
      setSubStatus({ type: 'success', message: res.message || 'Subscribed successfully!' });
      setSubEmail('');
    } catch (err: any) {
      setSubStatus({ type: 'error', message: err.message || 'Failed to subscribe' });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer id="main-footer" className="relative bg-[#0A0B0E] border-t border-[#1A1C23] text-[#9CA3AF] pt-14 pb-10 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00E5FF]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-8 pb-10 border-b border-[#1A1C23]">
          
          {/* Column 1: Institutional & Brand Identity (2 columns wide) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <IntelligenzLogo size="sm" />
              <div>
                <h3 className="text-xl font-black tracking-tight text-white font-['Outfit']">
                  INTELLIGENZ
                </h3>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#00E5FF]">
                  {settings?.club_sub_name || 'IntelliGenZ Club'}
                </p>
              </div>
            </div>

            {/* Department & College Affiliation hierarchy */}
            <div className="p-3.5 rounded-lg bg-[#0D1017] border border-[#1A1C23] space-y-1">
              <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">
                Official Institutional Affiliation
              </div>
              <div className="text-xs font-semibold text-[#E0E2E6] uppercase tracking-wide">
                {settings?.department_name || 'Department of CSE (AIML) & AI'}
              </div>
              <div className="text-[11px] font-medium text-[#9CA3AF]">
                {settings?.college_name || 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY'}
              </div>
            </div>

            <p className="text-xs text-[#6B7280] leading-relaxed max-w-md">
              {settings?.supporting_text ||
                'Where curiosity meets code, intelligence meets innovation, and students build the future.'}
            </p>

            {/* Newsletter Subscription Bar */}
            <div className="pt-2">
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Subscribe to Club Bulletins & Hackathons
                </label>
                <div className="flex items-center gap-1.5 max-w-sm">
                  <input
                    type="email"
                    required
                    value={subEmail || ''}
                    onChange={(e) => setSubEmail(e.target.value)}
                    placeholder="Enter college email..."
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={subscribing || !subEmail.trim()}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Send className="w-3 h-3" />
                    <span>Join</span>
                  </button>
                </div>
                {subStatus && (
                  <p
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      subStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {subStatus.type === 'success' && <CheckCircle2 className="w-3 h-3" />}
                    {subStatus.message}
                  </p>
                )}
              </form>
            </div>

            {/* Social / Direct Channels */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={settings?.linkedin_url || 'https://linkedin.com'}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded bg-[#0D1017] border border-[#1A1C23] text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-colors flex items-center gap-1.5"
              >
                <span>LinkedIn</span>
                <ArrowUpRight className="w-3 h-3 text-[#00E5FF]" />
              </a>
              <a
                href={settings?.github_url || 'https://github.com'}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded bg-[#0D1017] border border-[#1A1C23] text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-colors flex items-center gap-1.5"
              >
                <span>GitHub</span>
                <ArrowUpRight className="w-3 h-3 text-[#00E5FF]" />
              </a>
              <a
                href={settings?.instagram_url || 'https://instagram.com'}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded bg-[#0D1017] border border-[#1A1C23] text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-colors flex items-center gap-1.5"
              >
                <span>Instagram</span>
                <ArrowUpRight className="w-3 h-3 text-[#00E5FF]" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-[#00E5FF] uppercase tracking-widest font-mono">
              Navigation
            </h4>
            <ul className="space-y-2 text-[11px] uppercase tracking-wider font-medium text-[#9CA3AF]">
              <li>
                <button onClick={() => handleNav('/')} className="hover:text-[#00E5FF] transition-colors flex items-center gap-1.5">
                  <span>Official Portal</span>
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('/events')} className="hover:text-[#00E5FF] transition-colors">
                  Events &amp; Hackathons
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('/announcements')} className="hover:text-[#00E5FF] transition-colors">
                  Announcements
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('/certificates')} className="hover:text-[#00E5FF] transition-colors flex items-center gap-1">
                  <Award className="w-3 h-3 text-cyan-400" />
                  <span>Verify Certificates</span>
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('/projects')} className="hover:text-[#00E5FF] transition-colors">
                  Innovations &amp; Projects
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('/team')} className="hover:text-[#00E5FF] transition-colors">
                  Executive Committee
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Club Activities & Join */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-[#00E5FF] uppercase tracking-widest font-mono">
              Explore &amp; Engage
            </h4>
            <ul className="space-y-2 text-[11px] uppercase tracking-wider font-medium text-[#9CA3AF]">
              <li>
                <button onClick={() => handleNav('/gallery')} className="hover:text-[#00E5FF] transition-colors">
                  Photo &amp; Video Gallery
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('/about')} className="hover:text-[#00E5FF] transition-colors">
                  About IntelliGenZ
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('/join')} className="text-[#00E5FF] font-bold hover:text-white transition-colors flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>Join the Club</span>
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('/contact')} className="hover:text-[#00E5FF] transition-colors">
                  Contact Club Office
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-[#00E5FF] uppercase tracking-widest font-mono">
              Campus Office
            </h4>
            <div className="space-y-2 text-xs text-[#9CA3AF]">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#00E5FF] shrink-0 mt-0.5" />
                <span className="leading-tight text-[11px]">
                  {settings?.campus_address || 'Opp. Dupadu Railway Station, Lakshmipuram Post, Kurnool, AP 518218'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
                <a href={`mailto:${settings?.official_email || 'intelligenz@drkvsrit.ac.in'}`} className="hover:text-white transition-colors truncate text-[11px]">
                  {settings?.official_email || 'intelligenz@drkvsrit.ac.in'}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
                <span className="text-[11px]">{settings?.phone || '+91 8518 287611'}</span>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => handleNav('/admin')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0D1017] hover:bg-[#1A1C23] text-[#6B7280] hover:text-[#00E5FF] border border-[#1A1C23] text-[10px] font-semibold uppercase tracking-wider transition-colors"
                >
                  <Shield className="w-3 h-3 text-[#00E5FF]" />
                  <span>Admin Portal</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Section */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-[#6B7280] text-center sm:text-left">
          <div>
            <span>© 2026 INTELLIGENZ CLUB • DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY.</span>
          </div>
          <div>
            <span>DEPT OF CSE (AIML) &amp; AI • CODE • INNOVATE • INTELLIGENTLY</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
