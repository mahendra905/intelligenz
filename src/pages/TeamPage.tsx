import React from 'react';
import { TeamMember, TeamCategory } from '../types';
import { Users, Linkedin, Github, Mail, Shield, Sparkles } from 'lucide-react';

interface TeamPageProps {
  team: TeamMember[];
  onNavigate: (path: string) => void;
}

export const TeamPage: React.FC<TeamPageProps> = ({ team, onNavigate }) => {
  const categories: { title: string; category: TeamCategory; desc: string }[] = [
    {
      title: 'Faculty Mentorship & Patronage',
      category: 'Faculty Coordinator',
      desc: 'Academic leadership from the Department of CSE (AIML) & AI guiding club research, projects, and curriculum.',
    },
    {
      title: 'Executive Council',
      category: 'Club Lead',
      desc: 'Leading club vision, strategic partnerships, and technical hackathon organization.',
    },
    {
      title: 'Vice Leadership & Operations',
      category: 'Vice Lead',
      desc: 'Managing team logistics, domain tracks, and cross-departmental collaborations.',
    },
    {
      title: 'Technical & AI/ML Wing',
      category: 'Technical Team',
      desc: 'Engineers specializing in Deep Learning, Computer Vision, Generative AI, and Competitive Programming.',
    },
    {
      title: 'UI/UX & Creative Design Wing',
      category: 'Design Team',
      desc: 'Crafting the digital branding, Figma interfaces, and futuristic visuals of INTELLIGENZ.',
    },
    {
      title: 'Event Operations & Logistics',
      category: 'Event Team',
      desc: 'Executing seamless workshops, coding marathons, and symposiums.',
    },
    {
      title: 'Media & Public Relations',
      category: 'Media Team',
      desc: 'Amplifying club initiatives, technical newsletters, and digital presence.',
    },
  ];

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
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

      {/* Category Sections */}
      <div className="space-y-14">
        {categories.map((catSection, idx) => {
          const members = team
            .filter((m) => m.category === catSection.category)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          if (members.length === 0) return null;

          return (
            <div key={idx} className="space-y-6 text-left">
              <div className="border-b border-[#1A1C23] pb-3">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white font-['Outfit'] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                  {catSection.title}
                </h2>
                <p className="text-xs text-[#9CA3AF] mt-1">{catSection.desc}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-2xl bg-[#0D1017] border border-[#1A1C23] hover:border-[#00E5FF]/40 p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#00E5FF]/5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Photo */}
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-2xl overflow-hidden bg-[#0A0B0E] border-2 border-[#00E5FF]/30 shadow-lg shadow-[#00E5FF]/10 mb-4">
                        <img
                          src={member.photo_url}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Name & Position */}
                      <div className="text-center space-y-1">
                        <h3 className="text-base font-bold text-white font-['Outfit']">
                          {member.name}
                        </h3>
                        <p className="text-xs font-semibold text-[#00E5FF]">
                          {member.position}
                        </p>
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-[#9CA3AF] mt-3 text-center line-clamp-3 leading-relaxed">
                        {member.bio}
                      </p>
                    </div>

                    {/* Socials */}
                    <div className="mt-5 pt-3.5 border-t border-[#1A1C23] flex items-center justify-center gap-2">
                      {member.linkedin && (
                        <a
                          href={member.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-[#0A0B0E] hover:bg-[#121622] text-[#9CA3AF] hover:text-[#00E5FF] border border-[#1A1C23] transition-colors"
                          aria-label={`${member.name} LinkedIn`}
                        >
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                      {member.github && (
                        <a
                          href={member.github}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-[#0A0B0E] hover:bg-[#121622] text-[#9CA3AF] hover:text-white border border-[#1A1C23] transition-colors"
                          aria-label={`${member.name} GitHub`}
                        >
                          <Github className="w-4 h-4" />
                        </a>
                      )}
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="p-2 rounded-lg bg-[#0A0B0E] hover:bg-[#121622] text-[#9CA3AF] hover:text-indigo-400 border border-[#1A1C23] transition-colors"
                          aria-label={`${member.name} Email`}
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
