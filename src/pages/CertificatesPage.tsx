import React, { useState, useEffect } from 'react';
import {
  Award,
  Search,
  CheckCircle2,
  XCircle,
  Download,
  Share2,
  Calendar,
  Building,
  User,
  ShieldCheck,
  Sparkles,
  Printer,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { IntelligenzLogo } from '../components/IntelligenzLogo';
import { Certificate } from '../types';

interface CertificatesPageProps {
  onNavigate: (path: string) => void;
}

export function CertificatesPage({ onNavigate }: CertificatesPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [verifiedCert, setVerifiedCert] = useState<Certificate | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [recentCertificates, setRecentCertificates] = useState<Certificate[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    // Check if URL has ?code= parameter or load recent certificates
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam) {
      setSearchQuery(codeParam);
      handleVerify(codeParam);
    }
    loadRecentCertificates();
  }, []);

  const loadRecentCertificates = async () => {
    try {
      const data = await api.getCertificates();
      setRecentCertificates(data);
    } catch (err) {
      console.error('Failed to load certificates:', err);
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || searchQuery).trim().toUpperCase();
    if (!code) return;

    setSearching(true);
    setVerificationError(null);
    setVerifiedCert(null);

    try {
      const result = await api.verifyCertificate(code);
      if (result.valid && result.certificate) {
        setVerifiedCert(result.certificate);
      } else {
        setVerificationError(result.error || 'Certificate not found or has been revoked.');
      }
    } catch (err: any) {
      setVerificationError(err.message || 'Verification lookup failed. Please check the code.');
    } finally {
      setSearching(false);
    }
  };

  const handleCopyVerificationLink = (code: string) => {
    const url = `${window.location.origin}/certificates?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Printable Certificate View (hidden on screen, visible on print) */}
      {verifiedCert && (
        <div className="hidden print:block fixed inset-0 bg-white text-slate-900 p-8 z-[9999]">
          <div className="border-8 border-double border-amber-600/60 p-8 h-full flex flex-col justify-between items-center text-center relative bg-gradient-to-b from-amber-50/20 to-white">
            {/* Header */}
            <div className="flex flex-col items-center">
              <div className="mb-2">
                <IntelligenzLogo size="md" />
              </div>
              <div className="text-xs uppercase tracking-widest text-slate-600 font-semibold mb-1">
                DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY (DRKVSRIT)
              </div>
              <div className="text-sm font-semibold text-slate-700 tracking-wide">
                DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING (AIML) & ARTIFICIAL INTELLIGENCE
              </div>
              <div className="text-2xl font-black tracking-wider text-cyan-900 mt-2 font-mono">
                INTELLIGENZ CLUB
              </div>
              <div className="text-xs text-slate-500 font-mono tracking-widest mt-1">
                CERTIFICATE OF {verifiedCert.certificate_type.toUpperCase()}
              </div>
            </div>

            {/* Body */}
            <div className="my-6 max-w-2xl">
              <p className="text-sm text-slate-600 italic">This is proudly presented to</p>
              <h1 className="text-3xl font-bold text-slate-900 font-serif my-2 border-b-2 border-slate-300 pb-2">
                {verifiedCert.student_name}
              </h1>
              <p className="text-xs font-mono text-slate-600">
                Roll No: <span className="font-bold">{verifiedCert.student_roll_no}</span> | Department of {verifiedCert.department}
              </p>
              <p className="text-xs text-slate-500 mt-1">{verifiedCert.college_name}</p>

              <p className="text-sm text-slate-700 mt-4 leading-relaxed">
                for outstanding participation, technical excellence, and successful completion in the event{' '}
                <span className="font-bold text-slate-950">"{verifiedCert.event_title}"</span> organized by the IntelliGenZ Club.
              </p>
              {verifiedCert.notes && (
                <p className="text-xs text-slate-500 italic mt-2">"{verifiedCert.notes}"</p>
              )}
            </div>

            {/* Footer / Signatures */}
            <div className="w-full grid grid-cols-3 items-end pt-4 border-t border-slate-200">
              <div className="text-left">
                <p className="text-[10px] text-slate-500 font-mono">Certificate ID:</p>
                <p className="text-xs font-bold font-mono text-slate-800">{verifiedCert.certificate_code}</p>
                <p className="text-[10px] text-slate-500 mt-1">Issued Date: {verifiedCert.issue_date}</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full border-2 border-amber-600/40 flex items-center justify-center text-amber-700 bg-amber-50/50">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500 mt-1 font-mono font-semibold">
                  Official Club Seal
                </span>
              </div>

              <div className="text-right">
                <div className="border-b border-slate-400 w-36 ml-auto mb-1"></div>
                <p className="text-xs font-bold text-slate-800">{verifiedCert.issued_by}</p>
                <p className="text-[10px] text-slate-500">{verifiedCert.designation}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen View */}
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Official Credential Verification Engine
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Verify & Inspect <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">IntelliGenZ Certificates</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Verify authentic certificates issued by Department of CSE (AIML) & AI at DR. K. V. Subba Reddy Institute of Technology for hackathons, workshops, bootcamps, and club memberships.
          </p>
        </div>

        {/* Verification Search Box */}
        <div className="max-w-2xl mx-auto bg-slate-900/80 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl shadow-cyan-950/20 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="space-y-4"
          >
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider">
              Enter Certificate ID or Student Roll Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. IZ-2026-NH-8942 or 22K61A4201"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder-slate-500 font-mono transition-colors"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500">
                Sample: <button type="button" onClick={() => { setSearchQuery('IZ-2026-NH-8942'); handleVerify('IZ-2026-NH-8942'); }} className="text-cyan-400 hover:underline font-mono">IZ-2026-NH-8942</button>
              </span>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm shadow-md shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                {searching ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Verify Authenticity
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Verification Error */}
          {verificationError && (
            <div className="mt-6 p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-sm flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Verification Failed</p>
                <p className="text-xs text-red-300/90 mt-0.5">{verificationError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Verification Success Display */}
        {verifiedCert && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Status Banner */}
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-emerald-300 font-bold text-sm sm:text-base flex items-center gap-2">
                    Officially Verified IntelliGenZ Certificate
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                      Active & Valid
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Issued by Department of CSE (AIML) & AI, DR. K. V. Subba Reddy Institute of Technology
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyVerificationLink(verifiedCert.certificate_code)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Link Copied' : 'Share Link'}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
              </div>
            </div>

            {/* Certificate Visual Showcase Card */}
            <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/30 p-6 sm:p-10 shadow-2xl overflow-hidden">
              {/* Decorative Corner Ornaments */}
              <div className="absolute top-3 left-3 text-amber-400/40 text-xs font-mono">✦</div>
              <div className="absolute top-3 right-3 text-amber-400/40 text-xs font-mono">✦</div>
              <div className="absolute bottom-3 left-3 text-amber-400/40 text-xs font-mono">✦</div>
              <div className="absolute bottom-3 right-3 text-amber-400/40 text-xs font-mono">✦</div>

              <div className="text-center space-y-6">
                <div className="flex flex-col items-center">
                  <div className="mb-2">
                    <IntelligenzLogo size="sm" />
                  </div>
                  <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
                    DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY
                  </div>
                  <div className="text-xs font-medium text-slate-400 mt-0.5">
                    Department of Computer Science & Engineering (AIML) & Artificial Intelligence
                  </div>
                  <div className="text-xl sm:text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-cyan-200 to-amber-300 mt-2 font-mono">
                    INTELLIGENZ CLUB
                  </div>
                  <div className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Certificate of {verifiedCert.certificate_type}
                  </div>
                </div>

                <div className="space-y-2 py-4 border-y border-slate-800">
                  <p className="text-xs text-slate-400 italic">This certifies that</p>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide font-serif">
                    {verifiedCert.student_name}
                  </h2>
                  <p className="text-xs font-mono text-cyan-400">
                    Roll No: <span className="font-bold text-white">{verifiedCert.student_roll_no}</span> • Department of {verifiedCert.department}
                  </p>
                  <p className="text-xs text-slate-400">{verifiedCert.college_name}</p>

                  <p className="text-sm text-slate-300 max-w-xl mx-auto mt-4 leading-relaxed">
                    has successfully participated in and demonstrated exemplary technical aptitude in{' '}
                    <span className="font-semibold text-cyan-300">"{verifiedCert.event_title}"</span>.
                  </p>
                  {verifiedCert.notes && (
                    <p className="text-xs text-slate-400 italic mt-2">"{verifiedCert.notes}"</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-left pt-2">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-mono text-slate-500">Certificate Identifier</p>
                    <p className="text-xs font-mono font-bold text-amber-300">{verifiedCert.certificate_code}</p>
                    <p className="text-[10px] text-slate-400">Issued: {verifiedCert.issue_date}</p>
                  </div>

                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full border border-amber-500/30 bg-amber-500/10 flex flex-col items-center justify-center text-amber-400">
                      <Award className="w-6 h-6" />
                      <span className="text-[8px] font-mono font-bold uppercase mt-0.5">Verified</span>
                    </div>
                  </div>

                  <div className="sm:text-right space-y-1">
                    <p className="text-[10px] uppercase font-mono text-slate-500">Signing Authority</p>
                    <p className="text-xs font-bold text-white">{verifiedCert.issued_by}</p>
                    <p className="text-[10px] text-slate-400">{verifiedCert.designation}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Publicly Verified Certificates Catalog */}
        <div className="space-y-6 pt-8 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                Recently Issued & Verified Certificates
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Browse official credentials issued to club members and hackathon winners.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
              Total Verified: {recentCertificates.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentCertificates.map((cert) => (
              <div
                key={cert.id}
                onClick={() => {
                  setSearchQuery(cert.certificate_code);
                  setVerifiedCert(cert);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="group cursor-pointer bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-5 transition-all space-y-3 shadow-sm hover:shadow-cyan-950/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {cert.certificate_type}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{cert.issue_date}</span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {cert.student_name}
                  </h4>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{cert.student_roll_no} • {cert.department}</p>
                </div>

                <div className="text-xs text-slate-300 line-clamp-1">
                  Event: <span className="text-slate-200 font-medium">{cert.event_title}</span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-amber-400/90">{cert.certificate_code}</span>
                  <span className="text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-[11px] font-medium">
                    View <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
