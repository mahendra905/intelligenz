import React from 'react';
import {
  Calendar,
  Bell,
  Users,
  Code2,
  Image as ImageIcon,
  FileText,
  Mail,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { JoinApplication, EventRegistration, ContactMessage } from '../../types';

interface AdminOverviewTabProps {
  overviewData: any;
  onNavigateTab: (tab: string) => void;
  onOpenCreateEvent: () => void;
  onOpenCreateAnnouncement: () => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  overviewData,
  onNavigateTab,
  onOpenCreateEvent,
  onOpenCreateAnnouncement,
}) => {
  const statCards = [
    {
      label: 'Total Events',
      value: overviewData?.total_events ?? 0,
      sub: `${overviewData?.upcoming_events ?? 0} active/upcoming`,
      icon: Calendar,
      tab: 'events',
      color: 'text-[#00E5FF]',
      bgColor: 'bg-[#00E5FF]/10',
      borderColor: 'border-[#00E5FF]/20',
    },
    {
      label: 'Club Announcements',
      value: overviewData?.total_announcements ?? 0,
      sub: 'Official bulletins',
      icon: Bell,
      tab: 'announcements',
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
      borderColor: 'border-amber-400/20',
    },
    {
      label: 'Join Applications',
      value: overviewData?.total_applications ?? 0,
      sub: `${overviewData?.new_applications ?? 0} pending review`,
      icon: FileText,
      tab: 'applications',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      borderColor: 'border-emerald-400/20',
    },
    {
      label: 'Event Registrations',
      value: overviewData?.total_registrations ?? 0,
      sub: 'Student RSVPs recorded',
      icon: Users,
      tab: 'registrations',
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      borderColor: 'border-purple-400/20',
    },
    {
      label: 'Technical Projects',
      value: overviewData?.total_projects ?? 0,
      sub: 'AI & Full-stack labs',
      icon: Code2,
      tab: 'projects',
      color: 'text-cyan-300',
      bgColor: 'bg-cyan-400/10',
      borderColor: 'border-cyan-400/20',
    },
    {
      label: 'Core Team Members',
      value: overviewData?.total_team ?? 0,
      sub: 'Leads, Mentors & Heads',
      icon: Users,
      tab: 'team',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-400/10',
      borderColor: 'border-indigo-400/20',
    },
    {
      label: 'Student Inquiries',
      value: overviewData?.unread_messages ?? 0,
      sub: 'New unread messages',
      icon: Mail,
      tab: 'messages',
      color: 'text-rose-400',
      bgColor: 'bg-rose-400/10',
      borderColor: 'border-rose-400/20',
    },
    {
      label: 'Gallery Photos',
      value: overviewData?.total_gallery ?? 0,
      sub: 'Event memories & albums',
      icon: ImageIcon,
      tab: 'gallery',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/20',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0D1017] via-[#121622] to-[#0D1017] border border-[#1A1C23] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-[#00E5FF]/10 text-[#00E5FF] text-[10px] uppercase font-bold tracking-widest border border-[#00E5FF]/20">
              Admin Portal
            </span>
            <span className="text-xs text-[#6B7280]">
              CSE (AIML) &amp; AI • DR. KVSRIT
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] tracking-tight">
            IntelliGenZ Operations Dashboard
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-1 max-w-2xl">
            Live database management suite for events, student recruitment, workshop registrations, and official department publications.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            id="overview-quick-add-event"
            onClick={onOpenCreateEvent}
            className="px-4 py-2.5 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#00E5FF]/20 flex items-center gap-1.5 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Event</span>
          </button>
          <button
            id="overview-quick-add-announcement"
            onClick={onOpenCreateAnnouncement}
            className="px-4 py-2.5 rounded-lg bg-[#1A1C23] hover:bg-[#252833] text-white font-semibold text-xs uppercase tracking-wider transition-all border border-[#2A2E3D] flex items-center gap-1.5"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>Post Bulletin</span>
          </button>
        </div>
      </div>

      {/* Real-time stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              id={`stat-card-${c.tab}`}
              onClick={() => onNavigateTab(c.tab)}
              className="p-4 rounded-xl bg-[#0D1017] hover:bg-[#121622] border border-[#1A1C23] hover:border-[#2A2E3D] transition-all text-left group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${c.bgColor} ${c.color} border ${c.borderColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#4B5563] group-hover:text-white transition-colors" />
              </div>
              <div>
                <div className="text-2xl font-black text-white font-['Outfit'] tracking-tight">
                  {c.value}
                </div>
                <div className="text-xs font-semibold text-[#D1D5DB] mt-0.5">
                  {c.label}
                </div>
                <div className="text-[10px] text-[#6B7280] mt-1 font-medium truncate">
                  {c.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent submissions lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Join Applications */}
        <div className="p-5 rounded-2xl bg-[#0D1017] border border-[#1A1C23]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Recent Join Applications
              </h3>
              <p className="text-[11px] text-[#6B7280] mt-0.5">
                Prospective student members awaiting committee review
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('applications')}
              className="text-xs text-[#00E5FF] hover:underline font-semibold"
            >
              View All ({overviewData?.total_applications ?? 0})
            </button>
          </div>

          <div className="space-y-2.5">
            {overviewData?.recent_applications && overviewData.recent_applications.length > 0 ? (
              overviewData.recent_applications.map((app: JoinApplication) => (
                <div
                  key={app.id}
                  className="p-3 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">
                      {app.full_name}
                    </div>
                    <div className="text-[10px] text-[#6B7280] mt-0.5 truncate">
                      {app.department} • {app.year} • {app.roll_number}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      app.status === 'Accepted'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : app.status === 'Rejected'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : app.status === 'Reviewed'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-[#6B7280]">
                No recent applications received yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Event Registrations */}
        <div className="p-5 rounded-2xl bg-[#0D1017] border border-[#1A1C23]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Recent Registrations
              </h3>
              <p className="text-[11px] text-[#6B7280] mt-0.5">
                Students registered for upcoming workshops &amp; hackathons
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('registrations')}
              className="text-xs text-[#00E5FF] hover:underline font-semibold"
            >
              View All ({overviewData?.total_registrations ?? 0})
            </button>
          </div>

          <div className="space-y-2.5">
            {overviewData?.recent_registrations && overviewData.recent_registrations.length > 0 ? (
              overviewData.recent_registrations.map((reg: EventRegistration) => (
                <div
                  key={reg.id}
                  className="p-3 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">
                      {reg.participant_name || reg.full_name}
                    </div>
                    <div className="text-[10px] text-[#6B7280] mt-0.5 truncate">
                      {reg.event_title || 'Event Registration'} • {reg.roll_number}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      reg.status === 'Confirmed'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : reg.status === 'Cancelled'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    }`}
                  >
                    {reg.status || 'Registered'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-[#6B7280]">
                No event registrations recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
