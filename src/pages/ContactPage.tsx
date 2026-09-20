import React, { useState } from 'react';
import { api } from '../lib/api';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ContactPageProps {
  onNavigate: (path: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.submitContactMessage({
        name,
        email,
        subject,
        message,
      });

      setSuccess(true);
      confetti({
        particleCount: 70,
        spread: 50,
        origin: { y: 0.6 },
      });
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-16 text-left">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 border border-[#00E5FF]/20 bg-[#00E5FF]/5 rounded-full py-1.5 px-4 text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-[#00E5FF] font-bold">
          <Mail className="w-3.5 h-3.5" />
          <span>Institutional Correspondence &amp; Help Desk</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-['Outfit'] tracking-tight">
          Contact INTELLIGENZ &amp; Faculty Leads
        </h1>

        <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
          Have an inquiry regarding technical workshops, hackathon sponsorships, or student collaborations? Reach out to our leadership team at{' '}
          <span className="text-white font-semibold">DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Contact Cards */}
        <div className="lg:col-span-5 space-y-6">
          {/* Institutional Affiliation card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0D1017] border border-[#1A1C23] shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Building className="w-5 h-5 text-[#00E5FF]" />
              <span>Official Departmental Address</span>
            </h2>

            <div className="space-y-4 text-xs text-[#9CA3AF]">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">INTELLIGENZ Club HQ</div>
                  <div className="text-[#9CA3AF] mt-0.5">
                    Department of CSE (AIML) &amp; AI, Innovation &amp; GPU Lab
                  </div>
                  <div className="font-semibold text-[#00E5FF] mt-1">
                    DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY
                  </div>
                  <div className="text-[#6B7280] mt-0.5">
                    Opp. Dupadu Railway Station, Lakshmipuram Post, Kurnool - 518218, Andhra Pradesh, India.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-[#1A1C23]">
                <Mail className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Email Inquiries:</div>
                  <a href="mailto:intelligenz@drkvsrit.ac.in" className="text-[#00E5FF] hover:underline block mt-0.5">
                    intelligenz@drkvsrit.ac.in
                  </a>
                  <a href="mailto:cseaiml.hod@drkvsrit.ac.in" className="text-[#6B7280] hover:underline block mt-0.5 text-[11px]">
                    cseaiml.hod@drkvsrit.ac.in (HOD Desk)
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-[#1A1C23]">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Helpline &amp; Coordination:</div>
                  <div className="text-[#D1D5DB] mt-0.5 font-mono">+91 8518 280200 / +91 94402 88888</div>
                  <div className="text-[10px] text-[#6B7280] mt-0.5">Mon - Sat: 9:00 AM - 5:00 PM IST</div>
                </div>
              </div>
            </div>

            {/* Campus directions map pill */}
            <div className="p-4 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-[11px] text-[#9CA3AF] flex items-center justify-between">
              <div>
                <span className="font-bold text-white">Need Campus Directions?</span>
                <p className="text-[10px] text-[#6B7280]">Located on NH-44 near Kurnool City.</p>
              </div>
              <a
                href="https://maps.google.com/?q=Dr.+K.+V.+Subba+Reddy+Institute+of+Technology+Kurnool"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#121622] hover:bg-[#1A1C23] text-[#00E5FF] hover:text-white border border-[#1A1C23] text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Contact Message Form */}
        <div className="lg:col-span-7">
          <div className="p-6 sm:p-10 rounded-2xl bg-[#0D1017] border border-[#1A1C23] shadow-xl space-y-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white font-['Outfit']">
                Send Us a Direct Message
              </h3>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Responses are typically provided by student coordinators or faculty mentors within 24–48 hours.
              </p>
            </div>

            {success ? (
              <div className="p-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-lg font-bold text-white font-['Outfit']">Message Dispatched!</h4>
                <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto">
                  Thank you for contacting INTELLIGENZ. Your message has been routed to the club administration team.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="px-5 py-2 rounded-lg bg-[#0A0B0E] text-[#00E5FF] text-xs font-bold hover:bg-[#121622] transition-colors mt-2"
                >
                  Send Another Note
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ananya Rao"
                      value={name || ''}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#00E5FF] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                      Your Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@domain.com"
                      value={email || ''}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#00E5FF] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                    Subject / Topic *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hackathon Sponsorship / Workshop Inquiry"
                    value={subject || ''}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#00E5FF] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                    Your Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Write your query or proposal details..."
                    value={message || ''}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#00E5FF] transition-colors resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#00E5FF]/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>DISPATCH MESSAGE</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
