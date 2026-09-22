import React from 'react';
import { Hero } from '../components/Hero';
import { StatsSection } from '../components/StatsSection';
import { EventCard } from '../components/EventCard';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { IntelligenzLogo } from '../components/IntelligenzLogo';
import { Event, Announcement, Project, SiteStats, SiteSettings } from '../types';
import {
  Calendar,
  Bell,
  Sparkles,
  ArrowRight,
  Code2,
  Brain,
  Cpu,
  Layers,
  ChevronRight,
  CheckCircle2,
  Terminal,
  Award,
  Search,
} from 'lucide-react';

interface HomePageProps {
  events: Event[];
  announcements: Announcement[];
  projects: Project[];
  stats?: SiteStats;
  settings?: SiteSettings;
  onNavigate: (path: string) => void;
  onSelectEvent: (event: Event) => void;
  onRegisterEvent: (event: Event) => void;
  onSelectAnnouncement: (ann: Announcement) => void;
  onSelectProject: (proj: Project) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  events,
  announcements,
  projects,
  stats,
  settings,
  onNavigate,
  onSelectEvent,
  onRegisterEvent,
  onSelectAnnouncement,
  onSelectProject,
}) => {
  const upcomingEvents = (events || []).slice(0, 3);
  const latestAnnouncements = (announcements || []).slice(0, 3);
  const featuredProjects = (projects || []).slice(0, 3);

  return (
    <div className="space-y-16 pb-20">
      {/* 1. Cinematic Hero Section */}
      <Hero onNavigate={onNavigate} settings={settings} />

      {/* 2. Announcement Ticker (if configured) */}
      {settings?.announcement_ticker && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="p-3 rounded-lg bg-[#0D1017] border border-[#1A1C23] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#E0E2E6] font-medium truncate">
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 uppercase shrink-0">
                Notice
              </span>
              <span className="truncate">{settings.announcement_ticker}</span>
            </div>
            <button
              onClick={() => onNavigate('/announcements')}
              className="shrink-0 text-[#00E5FF] hover:text-white font-bold uppercase tracking-wider flex items-center gap-1 text-[11px]"
            >
              <span>View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Live Club Information Section */}
      <StatsSection stats={stats} />

      {/* 3.5 Quick Hub Highlights: Certificates, Innovation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Feature 1: Certificates */}
          <div
            onClick={() => onNavigate('/certificates')}
            className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group shadow-lg hover:shadow-cyan-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors font-['Outfit']">
                Certificate Verification
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Instantly authenticate participation credentials and certificates of excellence issued by DR. KVSRIT.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-400 font-semibold uppercase tracking-wider">
              <span>Verify ID</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Feature 2: AI Projects & Innovation */}
          <div
            onClick={() => onNavigate('/projects')}
            className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group shadow-lg hover:shadow-purple-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors font-['Outfit']">
                AI Projects &amp; Research
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Explore student-built neural networks, autonomous robotics, computer vision pipelines, and production systems.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-purple-400 font-semibold uppercase tracking-wider">
              <span>View Projects</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Upcoming Events Section */}
      <section id="upcoming-events-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#00E5FF] px-3.5 py-1 rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/5 mb-2">
              <Calendar className="w-3 h-3" />
              Calendar of Activities
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
              Upcoming Events &amp; Workshops
            </h2>
            <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1 max-w-xl">
              State-level hackathons, technical masterclasses, coding duels, and guest seminars hosted by the club.
            </p>
          </div>

          <button
            id="home-view-all-events-btn"
            onClick={() => onNavigate('/events')}
            className="self-start md:self-auto px-5 py-2.5 rounded bg-[#0D1017] hover:bg-[#1A1C23] text-white hover:text-[#00E5FF] border border-[#1A1C23] hover:border-[#00E5FF]/40 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 group"
          >
            <span>VIEW ALL EVENTS</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="p-10 rounded-lg bg-[#0D1017] border border-[#1A1C23] text-center text-[#6B7280] text-xs">
            No upcoming events right now. Follow our announcements for the next release!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onViewDetails={onSelectEvent}
                onRegister={onRegisterEvent}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. What is IntelliGenZ? / About Club Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-[#0D1017] border border-[#1A1C23] p-8 sm:p-12 relative overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute -top-12 -right-12 w-96 h-96 bg-[#00E5FF]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            
            {/* Left: About Text */}
            <div className="lg:col-span-7 space-y-5 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/5 text-[10px] font-mono uppercase tracking-[0.25em] text-[#00E5FF] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Departmental AI &amp; Tech Hub</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-['Outfit'] leading-tight">
                Where Curiosity Meets Code &amp; Intelligence Meets Innovation
              </h2>

              {/* Department & College Tag */}
              <div className="p-3.5 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-[#9CA3AF]">
                <span className="font-bold text-[#00E5FF]">INTELLIGENZ</span> is the official student technology and AI club of the{' '}
                <span className="font-semibold text-white">Department of CSE (AIML) &amp; AI</span> at{' '}
                <span className="font-semibold text-white">DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY</span>.
              </div>

              <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
                Founded with a mission to bridge academia and cutting-edge industry practice, IntelliGenZ provides an energetic ecosystem for engineering students to build production AI models, collaborate on open-source tools, organize hackathons, and compete nationally.
              </p>

              {/* Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-[#E0E2E6]">
                  <CheckCircle2 className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                  <span>Generative AI &amp; LLM Orchestration</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-[#E0E2E6]">
                  <CheckCircle2 className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                  <span>Computer Vision &amp; Autonomous Robotics</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-[#E0E2E6]">
                  <CheckCircle2 className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                  <span>24-Hour Code Sprints &amp; Hackathons</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-[#E0E2E6]">
                  <CheckCircle2 className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                  <span>Peer Mentorship &amp; Industry Sessions</span>
                </div>
              </div>

              <div className="pt-3 flex items-center gap-4">
                <button
                  onClick={() => onNavigate('/about')}
                  className="px-6 py-2.5 rounded bg-[#0A0B0E] hover:bg-[#1A1C23] text-white font-bold text-xs uppercase tracking-widest border border-[#1A1C23] hover:border-[#00E5FF]/40 transition-all flex items-center gap-2"
                >
                  <span>LEARN MORE ABOUT US</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right: Emblem Visual */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-center">
              <IntelligenzLogo size="hero" interactive />
              <div className="mt-4 text-center">
                <div className="text-lg font-black text-white font-['Outfit'] tracking-wide">
                  INTELLIGENZ CLUB
                </div>
                <div className="text-xs text-[#00E5FF] font-mono mt-0.5 uppercase tracking-wider">
                  Code • Innovate • IntelliGently
                </div>
                <div className="text-[10px] text-[#6B7280] mt-1 max-w-xs uppercase tracking-wider">
                  DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Latest Announcements Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#00E5FF] px-3.5 py-1 rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/5 mb-2">
              <Bell className="w-3 h-3" />
              Club Updates
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
              Latest Announcements
            </h2>
            <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1">
              Official circulars, recruitment notices, competition milestones, and departmental highlights.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/announcements')}
            className="self-start md:self-auto px-5 py-2.5 rounded bg-[#0D1017] hover:bg-[#1A1C23] text-white hover:text-[#00E5FF] border border-[#1A1C23] hover:border-[#00E5FF]/40 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 group"
          >
            <span>ALL ANNOUNCEMENTS</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {latestAnnouncements.map((ann) => (
            <AnnouncementCard
              key={ann.id}
              announcement={ann}
              onReadMore={onSelectAnnouncement}
            />
          ))}
        </div>
      </section>

      {/* 7. Student Projects Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#00E5FF] px-3.5 py-1 rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/5 mb-2">
              <Code2 className="w-3 h-3" />
              Innovations &amp; R&amp;D
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
              Featured Student Projects
            </h2>
            <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1">
              Real AI models and applications engineered by students of CSE (AIML) &amp; AI.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/projects')}
            className="self-start md:self-auto px-5 py-2.5 rounded bg-[#0D1017] hover:bg-[#1A1C23] text-white hover:text-[#00E5FF] border border-[#1A1C23] hover:border-[#00E5FF]/40 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 group"
          >
            <span>EXPLORE ALL PROJECTS</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProjects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => onSelectProject(proj)}
              className="group rounded-lg bg-[#0D1017] border border-[#1A1C23] hover:border-[#00E5FF]/40 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#00E5FF]/5 cursor-pointer flex flex-col justify-between"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0A0B0E]">
                <img
                  src={proj.image_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80'}
                  alt={proj.name || proj.title || 'Project'}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1017] via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0A0B0E]/90 text-[#00E5FF] border border-[#00E5FF]/30 uppercase tracking-wider">
                  {proj.category || 'AI Project'}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between text-left">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-['Outfit'] group-hover:text-[#00E5FF] transition-colors line-clamp-2">
                    {proj.name || proj.title || 'Untitled Project'}
                  </h3>
                  <p className="text-xs text-[#9CA3AF] mt-2 line-clamp-2 leading-relaxed">
                    {proj.short_description || proj.description || 'IntelliGenZ technical research project.'}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(Array.isArray(proj.tech_stack)
                      ? proj.tech_stack
                      : Array.isArray(proj.technologies)
                      ? proj.technologies
                      : typeof proj.tech_stack === 'string'
                      ? (proj.tech_stack as string).split(',').map((s) => s.trim()).filter(Boolean)
                      : []
                    ).slice(0, 4).map((tech, i) => (
                      <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0A0B0E] text-[#6B7280] border border-[#1A1C23]">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1A1C23] flex items-center justify-between text-xs text-[#00E5FF] font-bold uppercase tracking-wider">
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Big CTA Section: Join Us */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-[#0D1017] border border-[#1A1C23] p-8 sm:p-12 text-center relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/5 text-[10px] font-mono uppercase tracking-[0.3em] text-[#00E5FF] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Membership &amp; Recruitment</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-['Outfit']">
              Build the Future With Us.
            </h2>

            <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed max-w-2xl mx-auto">
              Are you a student of DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY passionate about AI, programming, design, robotics, or technical event management? Join the IntelliGenZ family today.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                id="home-cta-join-btn"
                onClick={() => onNavigate('/join')}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#00E5FF]/20 transition-all flex items-center justify-center gap-2 rounded-sm active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>APPLY TO JOIN INTELLIGENZ</span>
              </button>

              <button
                onClick={() => onNavigate('/contact')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-sm font-bold text-xs uppercase tracking-widest text-[#9CA3AF] hover:text-white bg-[#0A0B0E] hover:bg-[#1A1C23] border border-[#1A1C23] transition-colors"
              >
                Contact Faculty &amp; Leads
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
