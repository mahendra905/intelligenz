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
import { Certificate, SiteSettings } from '../types';
import { printCertificateElement } from '../lib/printCertificate';

interface CertificatesPageProps {
  onNavigate: (path: string) => void;
}

export function CertificatesPage({ onNavigate }: CertificatesPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [verifiedCert, setVerifiedCert] = useState<Certificate | null>(null);
  const [multipleCerts, setMultipleCerts] = useState<Certificate[]>([]);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [recentCertificates, setRecentCertificates] = useState<Certificate[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    // Fetch site settings to dynamically load certificate signing authority / lead name
    api.getSettings().then(setSiteSettings).catch(console.error);

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
    const code = (codeToVerify || searchQuery).trim();
    if (!code) return;

    setSearching(true);
    setVerificationError(null);
    setVerifiedCert(null);
    setMultipleCerts([]);

    try {
      const result = await api.verifyCertificate(code);
      if (result.status === 'MultipleFound' && result.certificates && result.certificates.length > 1) {
        setMultipleCerts(result.certificates);
        setVerifiedCert(null);
      } else if (result.valid && (result.certificate || (result.certificates && result.certificates.length === 1))) {
        const cert = result.certificate || result.certificates![0];
        setVerifiedCert(cert);
        setMultipleCerts([]);
      } else {
        setVerificationError(result.error || 'Certificate not found. Please verify the Certificate ID or Student Roll Number and try again.');
      }
    } catch (err: any) {
      setVerificationError(err.message || 'Verification lookup failed. Please check the Certificate ID or Roll Number.');
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
    if (verifiedCert) {
      printCertificateElement('intelligenz-certificate-card', verifiedCert.certificate_code);
    } else {
      window.print();
    }
  };

  return (
    <div className="certificate-page-container min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 print:p-0 print:m-0 print:bg-slate-950 print:min-h-0 print:w-full">
      {/* Screen View */}
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 no-print print:hidden">
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
        <div className="max-w-2xl mx-auto bg-slate-900/80 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl shadow-cyan-950/20 backdrop-blur-sm no-print print:hidden">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="space-y-4"
          >
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider">
              ENTER CERTIFICATE ID OR STUDENT ROLL NUMBER
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. IZ-2026-NH-8942 or 23261A3204"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder-slate-500 font-mono transition-colors"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500 flex items-center gap-2">
                Sample:
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('IZ-2026-NH-8942');
                    handleVerify('IZ-2026-NH-8942');
                  }}
                  className="text-cyan-400 hover:underline font-mono"
                >
                  IZ-2026-NH-8942
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('23261A3204');
                    handleVerify('23261A3204');
                  }}
                  className="text-cyan-400 hover:underline font-mono"
                >
                  23261A3204
                </button>
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

        {/* Multiple Matching Certificates Selection */}
        {multipleCerts.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-4 no-print print:hidden">
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-cyan-300 font-bold text-sm sm:text-base">
                    Multiple Certificates Found ({multipleCerts.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Registered under Roll Number: <span className="text-cyan-300 font-mono font-semibold">{multipleCerts[0].student_roll_no}</span> ({multipleCerts[0].student_name})
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                Select a certificate to view
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {multipleCerts.map((cert) => (
                <div
                  key={cert.id}
                  onClick={() => {
                    setVerifiedCert(cert);
                    setTimeout(() => {
                      const target = document.getElementById('intelligenz-certificate-card');
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }, 100);
                  }}
                  className={`cursor-pointer bg-slate-900/80 hover:bg-slate-900 border rounded-xl p-5 transition-all space-y-3 shadow-md ${
                    verifiedCert?.id === cert.id
                      ? 'border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-950/20'
                      : 'border-slate-800 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {cert.certificate_type}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{cert.issue_date}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{cert.event_title}</h4>
                    <p className="text-xs font-mono text-slate-400 mt-1">
                      ID: <span className="text-amber-400">{cert.certificate_code}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">{cert.department}</span>
                    <button
                      type="button"
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] font-semibold"
                    >
                      {verifiedCert?.id === cert.id ? 'Currently Selected' : 'View Certificate'} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verification Success Display */}
        {verifiedCert && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Status Banner & Actions */}
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4 no-print print:hidden">
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
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700 shadow-sm"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Link Copied' : 'Share Link'}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
              </div>
            </div>

            {/* Premium IntelliGenZ Dark Theme Showcase Certificate */}
            <div
              id="intelligenz-certificate-card"
              className="certificate-dark-print-target relative rounded-3xl bg-slate-950 border-2 border-slate-800 p-8 sm:p-12 shadow-2xl shadow-cyan-950/30 overflow-hidden box-border"
            >
              {/* Subtle Tech Cyber Grid & Ambient Radial Glows */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/15 via-slate-950/80 to-slate-950 pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

              {/* Multi-Layered Metallic Gold & Cyan Precision Borders */}
              <div className="absolute inset-3 rounded-2xl border border-amber-500/30 pointer-events-none"></div>
              <div className="absolute inset-4 rounded-xl border border-cyan-500/20 pointer-events-none"></div>

              {/* Futuristic Corner Brackets */}
              <div className="absolute top-5 left-5 text-amber-400/80 font-mono text-sm leading-none select-none">┌──</div>
              <div className="absolute top-5 right-5 text-amber-400/80 font-mono text-sm leading-none select-none text-right">──┐</div>
              <div className="absolute bottom-5 left-5 text-amber-400/80 font-mono text-sm leading-none select-none">└──</div>
              <div className="absolute bottom-5 right-5 text-amber-400/80 font-mono text-sm leading-none select-none text-right">──┘</div>

              {/* Watermark Emblem in Background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                <ShieldCheck className="w-96 h-96 text-cyan-400" />
              </div>

              {/* Certificate Inner Content */}
              <div className="relative z-10 text-center space-y-6 sm:space-y-7 flex flex-col justify-between h-full">
                {/* Header Branding */}
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-slate-900 border border-cyan-500/40 p-2.5 flex items-center justify-center shadow-lg shadow-cyan-500/10 mb-1">
                    <IntelligenzLogo size="md" />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-slate-200 font-sans">
                      DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY
                    </h2>
                    <p className="text-[10px] sm:text-[11px] tracking-wider text-slate-400 uppercase font-medium">
                      Department of Computer Science & Engineering (AIML) & Artificial Intelligence
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-1">
                    <div className="h-[1px] w-12 sm:w-20 bg-gradient-to-r from-transparent to-cyan-500/60"></div>
                    <span className="text-xl sm:text-2xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-amber-200 to-cyan-400 font-mono">
                      INTELLIGENZ CLUB
                    </span>
                    <div className="h-[1px] w-12 sm:w-20 bg-gradient-to-l from-transparent to-cyan-500/60"></div>
                  </div>

                  {/* Certificate Title Badge */}
                  <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm mt-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em] font-mono">
                      CERTIFICATE OF {verifiedCert.certificate_type.toUpperCase()}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                </div>

                {/* Recipient Section */}
                <div className="space-y-3 sm:space-y-4 py-4 sm:py-6 border-y border-slate-800/90 relative">
                  <p className="text-xs text-slate-400 italic font-serif tracking-wide">
                    This official credential is proudly awarded to
                  </p>

                  <div className="space-y-1.5">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-white to-amber-200 font-serif tracking-wide">
                      {verifiedCert.student_name}
                    </h1>
                    <div className="h-[2px] w-48 sm:w-64 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent mx-auto"></div>
                  </div>

                  {/* Student Metadata Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs font-mono pt-1">
                    <span className="px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300">
                      Roll No: <span className="font-bold text-cyan-300">{verifiedCert.student_roll_no}</span>
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300">
                      Department: <span className="font-bold text-cyan-300">{verifiedCert.department}</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-medium">
                    {verifiedCert.college_name || 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY'}
                  </p>

                  {/* Citation Text */}
                  <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed pt-2">
                    for outstanding active participation, technical excellence, and successful completion in{' '}
                    <span className="font-semibold text-cyan-300 font-serif">"{verifiedCert.event_title}"</span> organized under the aegis of the IntelliGenZ Club.
                  </p>

                  {verifiedCert.notes && (
                    <div className="inline-block px-4 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 italic font-serif mt-1">
                      "{verifiedCert.notes}"
                    </div>
                  )}
                </div>

                {/* Footer: Identification, Holographic Seal & Signatures */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end pt-3 text-left">
                  {/* Left: Credential Metadata */}
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-semibold">Credential ID</p>
                    <p className="text-sm font-mono font-bold text-amber-300 tracking-wide">{verifiedCert.certificate_code}</p>
                    <p className="text-[11px] text-slate-400 font-mono">Issued: {verifiedCert.issue_date}</p>
                    <div className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 pt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Tamper-Evident Verified
                    </div>
                  </div>

                  {/* Center: Official Seal */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-slate-900 to-amber-500/5 p-1 flex items-center justify-center shadow-lg shadow-amber-500/5">
                      <div className="w-full h-full rounded-full border border-dashed border-amber-400/50 flex flex-col items-center justify-center text-amber-400">
                        <Award className="w-6 h-6" />
                        <span className="text-[7px] font-mono font-black uppercase tracking-tighter mt-0.5">SEAL</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold mt-1.5">
                      Official Club Seal
                    </span>
                  </div>

                  {/* Right: Signing Authority */}
                  <div className="sm:text-right space-y-1">
                    <div className="border-b border-slate-700 w-40 sm:ml-auto pb-1 mb-1">
                      <span className="text-xs text-amber-300/80 font-serif italic select-none">Authorized Signatory</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
                      {siteSettings?.certificate_signing_authority || siteSettings?.certificate_lead_name || verifiedCert.issued_by}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {siteSettings?.certificate_lead_designation || verifiedCert.designation || 'Faculty Coordinator & Head'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">CSE (AIML) & AI Department</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Publicly Verified Certificates Catalog */}
        <div className="space-y-6 pt-8 border-t border-slate-800 no-print print:hidden">
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
