import React from 'react';
import { TeamMember } from '../types';
import { Users, Linkedin, Github, Mail } from 'lucide-react';

interface TeamPageProps {
  team: TeamMember[];
  onNavigate: (path: string) => void;
}

export const TeamPage: React.FC<TeamPageProps> = ({ team, onNavigate }) => {
  const sortedTeam = [...team].sort((a, b) => {
    const orderA = a.order !== undefined ? a.order : (a.order_index !== undefined ? a.order_index : 999);
    const orderB = b.order !== undefined ? b.order : (b.order_index !== undefined ? b.order_index : 999);
    return orderA - orderB;
  });

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 border border-[#00E5FF]/20 bg-[#00E5FF]/5 rounded-full py-1.5 px-4 text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-[#00E5FF] font-bold">
          <Users className="w-3.5 h-3.5" />
          <span>Core Committee &amp; Faculty Leadership</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-['Outfit'] tracking-tight">
          The Minds Behind INTELLIGENZ
        </h1>

        <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
          Dedicated professors, student leaders, AI researchers, and developers driving innovation at the{' '}
          <span className="text-white font-semibold">Department of CSE (AIML) &amp; AI</span> at{' '}
          <span className="text-white font-semibold">DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY</span>.
        </p>
      </div>

      {/* Unified Team Members Section */}
      <div className="space-y-6 text-left">
        <div className="border-b border-[#1A1C23] pb-3 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white font-['Outfit'] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
            Team Members
          </h2>
          <span className="text-xs text-[#9CA3AF] font-medium">
            {sortedTeam.length} {sortedTeam.length === 1 ? 'Member' : 'Members'}
          </span>
        </div>

        {sortedTeam.length === 0 ? (
          <div className="rounded-2xl bg-[#0D1017] border border-[#1A1C23] p-12 text-center text-[#9CA3AF] text-sm">
            No team members found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sortedTeam.map((member) => {
              const photoSrc = member.photo_url || member.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
              const designation = member.position || member.role || 'Member';
              const linkedinUrl = member.linkedin || member.social_links?.linkedin;
              const githubUrl = member.github || member.social_links?.github;
              const emailAddress = member.email || member.social_links?.email;

              return (
                <div
                  key={member.id}
                  className="rounded-2xl bg-[#0D1017] border border-[#1A1C23] hover:border-[#00E5FF]/40 p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#00E5FF]/5 flex flex-col justify-between"
                >
                  <div>
                    {/* Photo */}
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-2xl overflow-hidden bg-[#0A0B0E] border-2 border-[#00E5FF]/30 shadow-lg shadow-[#00E5FF]/10 mb-4">
                      <img
                        src={photoSrc}
                        alt={member.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Name & Position */}
                    <div className="text-center space-y-1">
                      <h3 className="text-base font-bold text-white font-['Outfit']">
                        {member.name}
                      </h3>
                      <p className="text-xs font-semibold text-[#00E5FF]">
                        {designation}
                      </p>
                      {member.department && (
                        <p className="text-[11px] text-[#6B7280]">
                          {member.department} {member.year ? `• ${member.year}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Bio */}
                    {member.bio && (
                      <p className="text-xs text-[#9CA3AF] mt-3 text-center line-clamp-3 leading-relaxed">
                        {member.bio}
                      </p>
                    )}
                  </div>

                  {/* Socials */}
                  <div className="mt-5 pt-3.5 border-t border-[#1A1C23] flex items-center justify-center gap-2">
                    {linkedinUrl && (
                      <a
                        href={linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-[#0A0B0E] hover:bg-[#121622] text-[#9CA3AF] hover:text-[#00E5FF] border border-[#1A1C23] transition-colors"
                        aria-label={`${member.name} LinkedIn`}
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {githubUrl && (
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-[#0A0B0E] hover:bg-[#121622] text-[#9CA3AF] hover:text-white border border-[#1A1C23] transition-colors"
                        aria-label={`${member.name} GitHub`}
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {emailAddress && (
                      <a
                        href={emailAddress.startsWith('mailto:') ? emailAddress : `mailto:${emailAddress}`}
                        className="p-2 rounded-lg bg-[#0A0B0E] hover:bg-[#121622] text-[#9CA3AF] hover:text-indigo-400 border border-[#1A1C23] transition-colors"
                        aria-label={`${member.name} Email`}
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
