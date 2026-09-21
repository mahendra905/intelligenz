import React, { useState, useEffect, lazy, Suspense } from 'react';
import { IntelligenzLogo } from '../components/IntelligenzLogo';
import { api } from '../lib/api';
import {
  Event,
  Announcement,
  JoinApplication,
  EventRegistration,
  ContactMessage,
  Project,
  TeamMember,
  GalleryImage,
  SiteStats,
  SiteSettings,
} from '../types';
import {
  LayoutDashboard,
  Calendar,
  Bell,
  Users,
  Code2,
  Image as ImageIcon,
  FileText,
  Mail,
  BarChart3,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Database,
  LogOut,
  Sparkles,
  ExternalLink,
  Loader2,
  Menu,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Award,
  QrCode,
} from 'lucide-react';

// Subcomponents
import { SignOutConfirmModal } from '../components/SignOutConfirmModal';
import { SessionWarningModal } from '../components/SessionWarningModal';
import { useAdminSession } from '../lib/adminSession';
import { authStorage } from '../lib/api';

// Lazy-loaded Admin Tabs
const AdminOverviewTab = lazy(() => import('../components/admin/AdminOverviewTab').then(m => ({ default: m.AdminOverviewTab })));
const AdminEventsTab = lazy(() => import('../components/admin/AdminEventsTab').then(m => ({ default: m.AdminEventsTab })));
const AdminAnnouncementsTab = lazy(() => import('../components/admin/AdminAnnouncementsTab').then(m => ({ default: m.AdminAnnouncementsTab })));
const AdminProjectsTab = lazy(() => import('../components/admin/AdminProjectsTab').then(m => ({ default: m.AdminProjectsTab })));
const AdminTeamTab = lazy(() => import('../components/admin/AdminTeamTab').then(m => ({ default: m.AdminTeamTab })));
const AdminGalleryTab = lazy(() => import('../components/admin/AdminGalleryTab').then(m => ({ default: m.AdminGalleryTab })));
const AdminApplicationsTab = lazy(() => import('../components/admin/AdminApplicationsTab').then(m => ({ default: m.AdminApplicationsTab })));
const AdminRegistrationsTab = lazy(() => import('../components/admin/AdminRegistrationsTab').then(m => ({ default: m.AdminRegistrationsTab })));
const AdminMessagesTab = lazy(() => import('../components/admin/AdminMessagesTab').then(m => ({ default: m.AdminMessagesTab })));
const AdminStatsTab = lazy(() => import('../components/admin/AdminStatsTab').then(m => ({ default: m.AdminStatsTab })));
const AdminSettingsTab = lazy(() => import('../components/admin/AdminSettingsTab').then(m => ({ default: m.AdminSettingsTab })));
const AdminProfileTab = lazy(() => import('../components/admin/AdminProfileTab').then(m => ({ default: m.AdminProfileTab })));
const AdminManagementTab = lazy(() => import('../components/admin/AdminManagementTab').then(m => ({ default: m.AdminManagementTab })));
const AdminSqlTab = lazy(() => import('../components/admin/AdminSqlTab').then(m => ({ default: m.AdminSqlTab })));
const AdminCertificatesTab = lazy(() => import('../components/admin/AdminCertificatesTab').then(m => ({ default: m.AdminCertificatesTab })));
const AdminAttendanceTab = lazy(() => import('../components/admin/AdminAttendanceTab').then(m => ({ default: m.AdminAttendanceTab })));
const AdminNewsletterTab = lazy(() => import('../components/admin/AdminNewsletterTab').then(m => ({ default: m.AdminNewsletterTab })));

interface AdminDashboardPageProps {
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onRefreshData?: () => void;
}

export type AdminTab =
  | 'overview'
  | 'events'
  | 'announcements'
  | 'certificates'
  | 'attendance'
  | 'newsletter'
  | 'projects'
  | 'team'
  | 'gallery'
  | 'applications'
  | 'registrations'
  | 'messages'
  | 'stats'
  | 'settings'
  | 'profile'
  | 'admin-management'
  | 'sql';

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onLogout,
  onNavigate,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Automatic Admin Session Expiration Hook (15-min idle, 8-hr max, cross-tab synced)
  const {
    isWarningOpen,
    remainingMs,
    isVerifying,
    staySignedIn,
    signOutNow,
  } = useAdminSession(onLogout);

  // Current logged in admin profile
  const [currentUser, setCurrentUser] = useState<any>(() => authStorage.getUser());
  const [currentAdminRole, setCurrentAdminRole] = useState<string>(() => {
    const cached = authStorage.getUser();
    return cached?.role || 'ADMIN';
  });

  // Data States
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [applications, setApplications] = useState<JoinApplication[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [sqlSchema, setSqlSchema] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadAllData = async (isStillValid?: () => boolean) => {
    try {
      const [
        evRes,
        annRes,
        projRes,
        teamRes,
        galRes,
        appRes,
        regRes,
        msgRes,
        statsRes,
        settRes,
        overRes,
        sqlRes,
        profileRes,
      ] = await Promise.all([
        api.getEvents().catch((err) => { console.warn('Could not load events:', err); return []; }),
        api.getAnnouncements().catch((err) => { console.warn('Could not load announcements:', err); return []; }),
        api.getProjects().catch((err) => { console.warn('Could not load projects:', err); return []; }),
        api.getTeam().catch((err) => { console.warn('Could not load team:', err); return []; }),
        api.getGallery().catch((err) => { console.warn('Could not load gallery:', err); return []; }),
        api.getApplications().catch((err) => { console.warn('Could not load applications:', err); return []; }),
        api.getRegistrations().catch((err) => { console.warn('Could not load registrations:', err); return []; }),
        api.getMessages().catch((err) => { console.warn('Could not load messages:', err); return []; }),
        api.getStats().catch((err) => { console.warn('Could not load stats:', err); return null; }),
        api.getSettings().catch((err) => { console.warn('Could not load settings:', err); return null; }),
        api.getOverviewStats().catch(() => null),
        api.getSupabaseSchema().catch(() => ({ schema: '' })),
        api.getAdminProfile().catch(() => null),
      ]);

      if (isStillValid && !isStillValid()) return;

      setEvents(evRes || []);
      setAnnouncements(annRes || []);
      setProjects(projRes || []);
      setTeam(teamRes || []);
      setGallery(galRes || []);
      setApplications(appRes || []);
      setRegistrations(regRes || []);
      setMessages(msgRes || []);
      setStats(statsRes || null);
      setSettings(settRes || null);
      setOverviewData(overRes);
      setSqlSchema(sqlRes?.schema || '');

      if (profileRes?.role) {
        setCurrentAdminRole(profileRes.role);
        setCurrentUser(profileRes);
        authStorage.setUser(profileRes);
      }
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
    } finally {
      if (!isStillValid || isStillValid()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!isMounted || !authStorage.isAuthenticated()) return;
      await loadAllData(() => isMounted && authStorage.isAuthenticated());
    };

    run();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    if (onRefreshData) onRefreshData();
    showFeedback('Data synchronized with database');
  };

  // Event Handlers
  const handleSaveEvent = async (eventData: Partial<Event>) => {
    try {
      if (eventData.id) {
        await api.updateEvent(eventData.id, eventData);
        showFeedback('Event updated successfully');
      } else {
        await api.createEvent(eventData);
        showFeedback('Event created and published');
      }
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to save event', 'error');
      throw err;
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await api.deleteEvent(id);
      showFeedback('Event removed from database');
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to delete event', 'error');
      throw err;
    }
  };

  const handleDuplicateEvent = async (id: string) => {
    try {
      await api.duplicateEvent(id);
      showFeedback('Event duplicated as draft/upcoming');
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to duplicate event', 'error');
      throw err;
    }
  };

  // Announcement Handlers
  const handleSaveAnnouncement = async (annData: Partial<Announcement>) => {
    try {
      if (annData.id) {
        await api.updateAnnouncement(annData.id, annData);
        showFeedback('Announcement updated successfully');
      } else {
        await api.createAnnouncement(annData);
        showFeedback('Announcement published');
      }
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to save announcement', 'error');
      throw err;
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await api.deleteAnnouncement(id);
      showFeedback('Announcement deleted');
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to delete announcement', 'error');
      throw err;
    }
  };

  // Project Handlers
  const handleSaveProject = async (projData: Partial<Project>) => {
    try {
      if (projData.id) {
        await api.updateProject(projData.id, projData);
        showFeedback('Project updated');
      } else {
        await api.createProject(projData);
        showFeedback('Project added');
      }
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to save project', 'error');
      throw err;
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await api.deleteProject(id);
      showFeedback('Project deleted');
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to delete project', 'error');
      throw err;
    }
  };

  // Team Handlers
  const handleSaveMember = async (memberData: Partial<TeamMember>) => {
    try {
      if (memberData.id) {
        await api.updateTeamMember(memberData.id, memberData);
        showFeedback('Team member profile updated');
      } else {
        await api.createTeamMember(memberData);
        showFeedback('Team member added to roster');
      }
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to save team member', 'error');
      throw err;
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await api.deleteTeamMember(id);
      showFeedback('Team member removed from roster');
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to delete member', 'error');
      throw err;
    }
  };

  // Gallery Handlers
  const handleSaveGalleryItem = async (data: Partial<GalleryImage>) => {
    try {
      if (data.id) {
        await api.updateGalleryItem(data.id, data);
        showFeedback('Gallery photo details updated');
      } else {
        await api.createGalleryItem(data);
        showFeedback('Gallery photo published');
      }
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to save photo', 'error');
      throw err;
    }
  };

  const handleDeleteGalleryItem = async (id: string) => {
    try {
      await api.deleteGalleryItem(id);
      showFeedback('Gallery photo removed');
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to delete photo', 'error');
      throw err;
    }
  };

  // Application Handlers
  const handleUpdateApplicationStatus = async (id: string, status: string, notes?: string) => {
    try {
      await api.updateApplicationStatus(id, status, notes);
      showFeedback(`Application status updated to ${status}`);
      await loadAllData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to update application', 'error');
      throw err;
    }
  };

  const handleDeleteApplication = async (id: string) => {
    try {
      await api.deleteApplication(id);
      showFeedback('Application deleted');
      await loadAllData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to delete application', 'error');
      throw err;
    }
  };

  // Registration Handlers
  const handleUpdateRegistrationStatus = async (id: string, status: string) => {
    try {
      await api.updateRegistrationStatus(id, status);
      showFeedback(`Registration updated to ${status}`);
      await loadAllData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to update registration', 'error');
      throw err;
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    try {
      await api.deleteRegistration(id);
      showFeedback('Registration record deleted');
      await loadAllData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to delete registration', 'error');
      throw err;
    }
  };

  // Message Handlers
  const handleUpdateMessageStatus = async (id: string, is_read: boolean, is_responded?: boolean) => {
    try {
      await api.updateMessageStatus(id, is_read, is_responded);
      await loadAllData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to update message', 'error');
      throw err;
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await api.deleteMessage(id);
      showFeedback('Message deleted');
      await loadAllData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to delete message', 'error');
      throw err;
    }
  };

  // Stats & Settings
  const handleSaveStats = async (newStats: SiteStats) => {
    try {
      await api.updateStats(newStats);
      showFeedback('Statistics saved');
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to save stats', 'error');
      throw err;
    }
  };

  const handleSaveSettings = async (newSettings: SiteSettings) => {
    try {
      await api.updateSettings(newSettings);
      showFeedback('Settings saved');
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to save settings', 'error');
      throw err;
    }
  };

  const handleToggleJoinUs = async () => {
    try {
      const current = settings?.join_us_status !== undefined
        ? settings.join_us_status
        : (settings?.is_recruitment_open ?? true);
      const nextStatus = !current;
      const updated = {
        ...settings,
        is_recruitment_open: nextStatus,
        join_us_status: nextStatus,
      };
      await api.updateSettings(updated);
      setSettings((prev) => prev ? { ...prev, is_recruitment_open: nextStatus, join_us_status: nextStatus } : (updated as any));
      showFeedback(`Join Us Applications set to ${nextStatus ? 'ON' : 'OFF'}`);
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to update Join Us Status', 'error');
    }
  };

  const isSuperAdmin = currentAdminRole === 'SUPER_ADMIN';

  const navItems: { id: AdminTab; label: string; icon: any; count?: number; badgeColor?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'events', label: 'Events & Workshops', icon: Calendar, count: events.length },
    { id: 'announcements', label: 'Announcements', icon: Bell, count: announcements.length },
    { id: 'certificates', label: 'Certificates & Credentials', icon: Award },
    { id: 'attendance', label: 'QR Attendance & Check-In', icon: QrCode },
    { id: 'newsletter', label: 'Newsletter & Broadcasts', icon: Mail },
    { id: 'projects', label: 'AI Projects', icon: Code2, count: projects.length },
    { id: 'team', label: 'Core Team & Faculty', icon: Users, count: team.length },
    { id: 'gallery', label: 'Photo Gallery', icon: ImageIcon, count: gallery.length },
    {
      id: 'applications',
      label: 'Recruitment Apps',
      icon: FileText,
      count: applications.filter((a) => a.status === 'Pending').length || undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-400',
    },
    { id: 'registrations', label: 'Event Registrations', icon: Users, count: registrations.length },
    {
      id: 'messages',
      label: 'Contact Messages',
      icon: Mail,
      count: messages.filter((m) => !m.is_read).length || undefined,
      badgeColor: 'bg-rose-500/20 text-rose-400',
    },
    { id: 'stats', label: 'Community Impact & Stats', icon: BarChart3 },
    { id: 'settings', label: 'Site Settings', icon: Settings },
    { id: 'profile', label: 'Admin Security', icon: ShieldCheck },
    ...(isSuperAdmin
      ? [{ id: 'admin-management' as AdminTab, label: 'Admin Management', icon: ShieldAlert }]
      : []),
    { id: 'sql', label: 'Supabase SQL Export', icon: Database },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B0E] flex flex-col items-center justify-center gap-3 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" />
        <p className="text-xs font-mono text-[#9CA3AF]">Accessing INTELLIGENZ Administration Suite...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#D1D5DB] flex flex-col font-['Plus_Jakarta_Sans']">
      {/* ============================================================ */}
      {/* 1. DEDICATED ADMIN HEADER (FULL-WIDTH TOP BAR)                */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-40 bg-[#0D1017] border-b border-[#1A1C23] px-4 sm:px-6 py-3 flex items-center justify-between shadow-lg">
        {/* LEFT: Complete branding group strictly aligned to TOP-LEFT */}
        <div className="flex items-center gap-3.5">
          {/* Mobile sidebar hamburger toggle */}
          <button
            id="admin-mobile-sidebar-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-[#9CA3AF] hover:text-white hover:bg-[#1A1C23] border border-transparent hover:border-[#1A1C23] transition-colors"
            aria-label="Toggle admin sidebar menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Intelligenz Club Brand Identity */}
          <div className="flex items-center gap-3 text-left">
            <IntelligenzLogo size="sm" interactive={false} />
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-base sm:text-lg tracking-wider font-['Outfit'] leading-none">
                  INTELLIGENZ
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20">
                  Admin Portal
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#6B7280] uppercase tracking-widest font-['Outfit'] leading-tight mt-0.5">
                INTELLIGENZ CLUB
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: Admin Profile Badge, Sync Button, Public Site, Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin Profile & Role Pill */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#121622] border border-[#1A1C23]">
            <div className={`w-2 h-2 rounded-full ${isSuperAdmin ? 'bg-amber-400 animate-pulse' : 'bg-[#00E5FF]'}`} />
            <div className="text-left">
              <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                <span>{currentUser?.name || currentUser?.username || 'Administrator'}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                    isSuperAdmin
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/25'
                  }`}
                >
                  {isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
                </span>
              </div>
              <div className="text-[9px] text-[#6B7280] font-mono tracking-tight">
                DR. KVSRIT AI &amp; ML
              </div>
            </div>
          </div>

          {/* Live Database Sync Button */}
          <button
            id="admin-sync-btn"
            onClick={handleManualRefresh}
            disabled={refreshing}
            title="Sync live data from database"
            className="px-3 py-1.5 rounded-xl bg-[#121622] hover:bg-[#1A1C23] text-xs text-[#9CA3AF] hover:text-white border border-[#1A1C23] flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#00E5FF]' : ''}`} />
            <span className="hidden md:inline">{refreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          {/* View Public Website Link */}
          <button
            id="admin-view-public-site-btn"
            onClick={() => onNavigate('/')}
            title="Open Public Website"
            className="px-3 py-1.5 rounded-xl bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] text-xs font-semibold border border-[#00E5FF]/20 flex items-center gap-1.5 transition-all"
          >
            <span className="hidden sm:inline">Public Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Sign Out Button */}
          <button
            id="admin-signout-btn"
            onClick={() => setShowSignOutConfirm(true)}
            title="Sign Out of Admin Portal"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. ADMIN DASHBOARD BODY (SIDEBAR + MAIN CONTENT AREA)        */}
      {/* ============================================================ */}
      <div className="flex flex-1 relative min-h-[calc(100vh-61px)]">
        {/* Desktop Admin Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-[#0D1017] border-r border-[#1A1C23] shrink-0 sticky top-[61px] h-[calc(100vh-61px)] overflow-y-auto">
          {/* Navigation Links */}
          <div className="p-3 space-y-1 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`admin-nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-[#121622]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#00E5FF]' : 'text-[#6B7280]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.badgeColor || 'bg-[#1A1C23] text-[#9CA3AF]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-[#1A1C23] space-y-1">
            <div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider text-[#4B5563]">
              Intelligenz v2.4 Admin
            </div>
          </div>
        </aside>

        {/* Mobile Menu Overlay Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-x-0 top-[61px] bottom-0 z-50 bg-[#0D1017]/98 backdrop-blur-xl border-b border-[#1A1C23] p-4 overflow-y-auto space-y-1">
            <div className="pb-3 mb-2 border-b border-[#1A1C23] flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#6B7280] tracking-wider">Navigation Menu</span>
              <span className="text-[10px] font-mono text-[#00E5FF]">{isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}</span>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                    isActive
                      ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1A1C23] text-[#9CA3AF]">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-3 border-t border-[#1A1C23] flex gap-2">
              <button
                onClick={() => onNavigate('/')}
                className="flex-1 py-2 rounded-lg bg-[#1A1C23] text-xs text-white"
              >
                Public Site
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowSignOutConfirm(true);
                }}
                className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Main Admin Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 bg-[#0A0B0E] overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {/* Global Feedback notification */}
            {feedback && (
              <div
                className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 mb-6 animate-in slide-in-from-top duration-200 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

        {/* Active Tab View */}
        <Suspense
          fallback={
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" />
              <p className="text-xs font-mono text-[#9CA3AF]">Loading administration tab...</p>
            </div>
          }
        >
        {activeTab === 'overview' && (
          <AdminOverviewTab
            overviewData={overviewData}
            onNavigateTab={(tab) => setActiveTab(tab as AdminTab)}
            onOpenCreateEvent={() => setActiveTab('events')}
            onOpenCreateAnnouncement={() => setActiveTab('announcements')}
          />
        )}

        {activeTab === 'events' && (
          <AdminEventsTab
            events={events}
            onSaveEvent={handleSaveEvent}
            onDeleteEvent={handleDeleteEvent}
            onDuplicateEvent={handleDuplicateEvent}
            onRefreshEvents={loadAllData}
          />
        )}

        {activeTab === 'announcements' && (
          <AdminAnnouncementsTab
            announcements={announcements}
            onSaveAnnouncement={handleSaveAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
          />
        )}

        {activeTab === 'certificates' && (
          <AdminCertificatesTab onRefreshData={handleManualRefresh} />
        )}

        {activeTab === 'attendance' && (
          <AdminAttendanceTab onRefreshData={handleManualRefresh} />
        )}

        {activeTab === 'newsletter' && (
          <AdminNewsletterTab onRefreshData={handleManualRefresh} />
        )}

        {activeTab === 'projects' && (
          <AdminProjectsTab
            projects={projects}
            onSaveProject={handleSaveProject}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {activeTab === 'team' && (
          <AdminTeamTab
            team={team}
            onSaveMember={handleSaveMember}
            onDeleteMember={handleDeleteMember}
          />
        )}

        {activeTab === 'gallery' && (
          <AdminGalleryTab
            gallery={gallery}
            onSaveItem={handleSaveGalleryItem}
            onDeleteItem={handleDeleteGalleryItem}
          />
        )}

        {activeTab === 'applications' && (
          <AdminApplicationsTab
            applications={applications}
            onUpdateStatus={handleUpdateApplicationStatus}
            onDeleteApplication={handleDeleteApplication}
            joinUsStatus={settings?.join_us_status !== undefined ? settings.join_us_status : (settings?.is_recruitment_open ?? true)}
            onToggleJoinUs={handleToggleJoinUs}
          />
        )}

        {activeTab === 'registrations' && (
          <AdminRegistrationsTab
            registrations={registrations}
            events={events}
            onUpdateStatus={handleUpdateRegistrationStatus}
            onDeleteRegistration={handleDeleteRegistration}
          />
        )}

        {activeTab === 'messages' && (
          <AdminMessagesTab
            messages={messages}
            onUpdateStatus={handleUpdateMessageStatus}
            onDeleteMessage={handleDeleteMessage}
          />
        )}

        {activeTab === 'stats' && (
          <AdminStatsTab stats={stats} onSaveStats={handleSaveStats} />
        )}

        {activeTab === 'settings' && (
          <AdminSettingsTab settings={settings} onSaveSettings={handleSaveSettings} />
        )}

        {activeTab === 'profile' && <AdminProfileTab />}

        {activeTab === 'admin-management' && isSuperAdmin && <AdminManagementTab />}

        {activeTab === 'sql' && <AdminSqlTab sqlSchema={sqlSchema} />}
        </Suspense>
          </div>
        </main>
      </div>

      {/* Session Expiration Warning Modal (2-minute warning before 15m inactivity timeout) */}
      <SessionWarningModal
        isOpen={isWarningOpen}
        remainingMs={remainingMs}
        onStaySignedIn={staySignedIn}
        onSignOut={signOutNow}
        isVerifying={isVerifying}
      />

      {/* Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        isOpen={showSignOutConfirm}
        onConfirm={onLogout}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </div>
  );
};
