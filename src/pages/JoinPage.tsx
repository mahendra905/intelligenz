import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { SiteSettings } from '../types';
import {
  Sparkles,
  CheckCircle2,
  Brain,
  Code2,
  Trophy,
  Award,
  Layers,
  Users,
  ShieldCheck,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface JoinPageProps {
  onNavigate: (path: string) => void;
  settings?: SiteSettings;
}

export const JoinPage: React.FC<JoinPageProps> = ({ onNavigate, settings: propSettings }) => {
  const [localSettings, setLocalSettings] = useState<SiteSettings | undefined>(propSettings);

  useEffect(() => {
    if (propSettings) {
      setLocalSettings(propSettings);
    } else {
      api.getSettings().then(setLocalSettings).catch(() => {});
    }
  }, [propSettings]);

  const isJoinUsOpen = localSettings
    ? (localSettings.join_us_status !== undefined
        ? localSettings.join_us_status
        : localSettings.is_recruitment_open !== false)
    : true;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('CSE (AIML)');
  const [year, setYear] = useState('2nd Year');
  const [rollNumber, setRollNumber] = useState('');
  const [interestedDomains, setInterestedDomains] = useState<string[]>([
    'AI & Machine Learning',
  ]);
  const [skills, setSkills] = useState('');
  const [reason, setReason] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<any | null>(null);

  const availableDomains = [
    'AI & Machine Learning',
    'Deep Learning & LLMs',
    'Computer Vision',
    'Web Development',
    'Robotics & Embedded AI',
    'Graphic & UI/UX Design',
    'Event Management & Logistics',
    'Media & Content Writing',
  ];

  const handleToggleDomain = (domain: string) => {
    if (interestedDomains.includes(domain)) {
      setInterestedDomains(interestedDomains.filter((d) => d !== domain));
    } else {
      setInterestedDomains([...interestedDomains, domain]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // bot detected

    if (!isJoinUsOpen) {
      setError("We're currently not accepting new club member applications.");
      return;
    }

    if (interestedDomains.length === 0) {
      setError('Please select at least one domain of interest.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        full_name: fullName,
        email,
        phone,
        department,
        year,
        roll_number: rollNumber,
        interested_domains: interestedDomains,
        skills,
        reason,
        github_url: githubUrl,
        linkedin_url: linkedinUrl,
      };

      const res = await api.submitApplication(payload);

      setSubmitted({
        ...payload,
        id: res.application_id || 'APP-' + Math.floor(Math.random() * 10000),
      });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00E5FF', '#34D399', '#FBBF24', '#818CF8'],
      });
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      title: 'Dedicated AI & GPU Lab Access',
      desc: 'Work with high-performance workstations and cloud computing credits for training deep neural networks.',
      icon: Brain,
    },
    {
      title: 'Hackathon Mentorship & Sponsorship',
      desc: 'Get fast-tracked into competitive squads with faculty guidance and travel sponsorship for national hackathons.',
      icon: Trophy,
    },
    {
      title: 'Live Project Incubation',
      desc: 'Build deployable AI products for college automation, healthcare diagnostics, and open-source ecosystems.',
      icon: Code2,
    },
    {
      title: 'Official Department Credentials',
      desc: 'Earn verified club membership certificates endorsed by the Department of CSE (AIML) & AI and DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY.',
      icon: Award,
    },
    {
      title: 'Leadership & Organizing Experience',
      desc: 'Lead technical tracks, organize state-level symposiums, host workshops, and build real-world leadership credentials.',
      icon: Users,
    },
    {
      title: 'Tech Talks with Industry Mentors',
      desc: 'Direct interaction with alumni and industry veterans working at leading tech enterprises.',
      icon: Layers,
    },
    {
      title: 'Peer Review & Coding Sprints',
      desc: 'Weekly problem-solving sessions, DSA interview preparation, and algorithmic bootcamps.',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16 text-left">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 border border-[#00E5FF]/20 bg-[#00E5FF]/5 rounded-full py-1.5 px-4 text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-[#00E5FF] font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Membership &amp; Core Recruitment</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white font-['Outfit'] tracking-tight">
          Build the Future With Us.
        </h1>

        <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
          Join INTELLIGENZ — the official AI &amp; technical club of the{' '}
          <span className="text-white font-semibold">Department of CSE (AIML) &amp; AI</span> at{' '}
          <span className="text-white font-semibold">DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: 7 Benefits */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0D1017] border border-[#1A1C23] shadow-xl space-y-6">
            <h2 className="text-xl font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#00E5FF]/10 text-[#00E5FF]">
                <Sparkles className="w-4 h-4" />
              </span>
              <span>Why Join INTELLIGENZ?</span>
            </h2>

            <div className="space-y-4">
              {benefits.map((b, idx) => {
                const Icon = b.icon;
                return (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="p-2 rounded-lg bg-[#0A0B0E] text-[#00E5FF] border border-[#1A1C23] shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">{b.title}</h4>
                      <p className="text-[#9CA3AF] mt-0.5 leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Institutional Stamp */}
            <div className="pt-4 border-t border-[#1A1C23] text-[11px] text-[#9CA3AF] space-y-1">
              <div className="font-semibold text-white">Department of CSE (AIML) &amp; AI</div>
              <div className="text-[10px] text-[#6B7280]">DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY, KURNOOL</div>
            </div>
          </div>
        </div>

        {/* Right Column: Application Form or Closed Message */}
        <div className="lg:col-span-7">
          <div className="p-6 sm:p-10 rounded-2xl bg-[#0D1017] border border-[#1A1C23] shadow-xl relative overflow-hidden">
            {!isJoinUsOpen ? (
              <div className="text-center py-12 sm:py-16 px-4 space-y-6">
                <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                  <AlertCircle className="w-12 h-12" />
                </div>
                <div className="space-y-3 max-w-lg mx-auto">
                  <h3 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
                    We're currently not accepting new club member applications.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
                    Student membership recruitment is temporarily closed. Please stay tuned to our upcoming events and official club announcements for future recruitment rounds.
                  </p>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => onNavigate('/announcements')}
                    className="px-6 py-2.5 rounded-lg bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    View Announcements
                  </button>
                  <button
                    onClick={() => onNavigate('/')}
                    className="px-6 py-2.5 rounded-lg bg-[#1A1C23] hover:bg-[#252833] text-white font-semibold text-xs transition-colors"
                  >
                    Return to Homepage
                  </button>
                </div>
              </div>
            ) : submitted ? (
              <div className="text-center py-12 space-y-5">
                <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                  <CheckCircle2 className="w-14 h-14" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
                  Application Submitted!
                </h3>
                <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-md mx-auto leading-relaxed">
                  Thank you, <span className="text-[#00E5FF] font-bold">{submitted.full_name}</span>. Your application for <span className="font-semibold text-white">INTELLIGENZ</span> has been logged under Roll Number <span className="font-mono text-[#00E5FF]">{submitted.roll_number}</span>.
                </p>
                <div className="p-4 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-left text-xs space-y-2 text-[#9CA3AF] max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Application ID:</span>
                    <span className="font-mono text-white">{(submitted.id || '').slice(0, 8) || 'SUBMITTED'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Department:</span>
                    <span className="text-white">{submitted.department} ({submitted.year})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Domains:</span>
                    <span className="text-[#00E5FF] font-semibold">{(submitted.interested_domains || []).join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Next Step:</span>
                    <span className="text-amber-400 font-medium">Domain Interview / Task Round</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('/')}
                  className="px-8 py-3 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-bold text-xs uppercase tracking-widest shadow-md transition-colors"
                >
                  Return to Homepage
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-6 space-y-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-white font-['Outfit']">
                    Student Membership Application
                  </h3>
                  <p className="text-xs text-[#9CA3AF]">
                    Fill in your academic and technical background. Open to all branches with passion for AI/ML and technology.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Honeypot */}
                  <input
                    type="text"
                    name="website"
                    value={honeypot || ''}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  {/* Name & Roll Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={fullName || ''}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#00E5FF] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                        College Roll Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 238X1A05XX"
                        value={rollNumber || ''}
                        onChange={(e) => setRollNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs font-mono uppercase placeholder-[#6B7280] focus:outline-none focus:border-[#00E5FF] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                        College / Personal Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="student@drkvsrit.ac.in"
                        value={email || ''}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#00E5FF] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                        WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={phone || ''}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#00E5FF] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Department & Year */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                        Department *
                      </label>
                      <select
                        value={department || 'CSE (AIML)'}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs focus:outline-none focus:border-[#00E5FF] transition-colors"
                      >
                        <option value="CSE (AIML)">CSE (AIML)</option>
                        <option value="AI & Data Science">AI &amp; Data Science</option>
                        <option value="CSE Core">CSE Core</option>
                        <option value="ECE">ECE</option>
                        <option value="EEE">EEE</option>
                        <option value="Mechanical">Mechanical</option>
                        <option value="Civil">Civil</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                        Year of Study *
                      </label>
                      <select
                        value={year || '1st Year'}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs focus:outline-none focus:border-[#00E5FF] transition-colors"
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </div>

                  {/* Domains of Interest */}
                  <div>
                    <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">
                      Domains of Interest (Select all that apply) *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableDomains.map((domain) => {
                        const isSelected = interestedDomains.includes(domain);
                        return (
                          <button
                            type="button"
                            key={domain}
                            onClick={() => handleToggleDomain(domain)}
                            className={`p-2.5 rounded-lg text-xs font-medium text-left border transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/40'
                                : 'bg-[#0A0B0E] text-[#9CA3AF] border-[#1A1C23] hover:border-[#252833]'
                            }`}
                          >
                            <span>{domain}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Technical Skills */}
                  <div>
                    <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                      Technical Skills / Tools Known (e.g. Python, TensorFlow, PyTorch, React, Figma, Arduino)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Python, OpenCV, Git, HTML/CSS"
                      value={skills || ''}
                      onChange={(e) => setSkills(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#00E5FF] transition-colors"
                    />
                  </div>

                  {/* Motivation / SOP */}
                  <div>
                    <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                      Why do you want to join INTELLIGENZ? *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Briefly tell us what you hope to build, learn, or contribute..."
                      value={reason || ''}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#00E5FF] transition-colors resize-none"
                    />
                  </div>

                  {/* Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                        GitHub Profile URL (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/yourhandle"
                        value={githubUrl || ''}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#00E5FF] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                        LinkedIn Profile URL (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/yourhandle"
                        value={linkedinUrl || ''}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#00E5FF] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#00E5FF]/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting Application...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>SUBMIT MEMBERSHIP APPLICATION</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
