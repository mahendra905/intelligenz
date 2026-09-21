import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { SearchModal } from './components/SearchModal';
import { EventRegisterModal } from './components/EventRegisterModal';

// Direct import for fast first-paint
import { HomePage } from './pages/HomePage';

// Lazy-loaded pages for optimized performance and bundle splitting
const EventsPage = lazy(() => import('./pages/EventsPage').then((m) => ({ default: m.EventsPage })));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage').then((m) => ({ default: m.EventDetailPage })));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage').then((m) => ({ default: m.AnnouncementsPage })));
const AnnouncementDetailPage = lazy(() => import('./pages/AnnouncementDetailPage').then((m) => ({ default: m.AnnouncementDetailPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const TeamPage = lazy(() => import('./pages/TeamPage').then((m) => ({ default: m.TeamPage })));
const GalleryPage = lazy(() => import('./pages/GalleryPage').then((m) => ({ default: m.GalleryPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const JoinPage = lazy(() => import('./pages/JoinPage').then((m) => ({ default: m.JoinPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const CertificatesPage = lazy(() => import('./pages/CertificatesPage').then((m) => ({ default: m.CertificatesPage })));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));

// API & Types
import { api } from './lib/api';
import { adminSessionCoordinator } from './lib/adminSession';
import {
  Event,
  Announcement,
  TeamMember,
  Project,
  GalleryImage,
  SiteStats,
  SiteSettings,
} from './types';
import { Loader2, Sparkles } from 'lucide-react';

export default function App() {
  // Navigation Path
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Global Data State
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [stats, setStats] = useState<SiteStats | undefined>(undefined);
  const [settings, setSettings] = useState<SiteSettings | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [registeringEvent, setRegisteringEvent] = useState<Event | null>(null);

  // Selected Detail views
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Admin Auth
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('intelligenz_admin_token');
  });

  const loadClubData = async () => {
    try {
      const [
        eventsData,
        announcementsData,
        teamData,
        projectsData,
        galleryData,
        statsData,
        settingsData,
      ] = await Promise.all([
        api.getEvents(),
        api.getAnnouncements(),
        api.getTeam(),
        api.getProjects(),
        api.getGallery(),
        api.getStats(),
        api.getSettings(),
      ]);

      setEvents(eventsData);
      setAnnouncements(announcementsData);
      setTeam(teamData);
      setProjects(projectsData);
      setGallery(galleryData);
      setStats(statsData);
      setSettings(settingsData);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClubData();

    // Listen to browser popstate for history navigation
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);

    // Listen to auth state changes
    const handleAuthStateChanged = () => {
      setAdminToken(localStorage.getItem('intelligenz_admin_token'));
    };
    window.addEventListener('auth_state_changed', handleAuthStateChanged);
    window.addEventListener('storage', handleAuthStateChanged);

    // Global shortcut '/' to open search
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('auth_state_changed', handleAuthStateChanged);
      window.removeEventListener('storage', handleAuthStateChanged);
      window.removeEventListener('keydown', handleGlobalKey);
    };
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    navigate(`/events/${event.slug}`);
  };

  const handleSelectAnnouncement = (ann: Announcement) => {
    setSelectedAnnouncement(ann);
    navigate(`/announcements/${ann.slug}`);
  };

  const handleSelectProject = (proj: Project) => {
    navigate('/projects');
  };

  const handleAdminLogin = (token: string) => {
    setAdminToken(token);
    adminSessionCoordinator.initializeSession(token);
    navigate('/admin');
  };

  const handleAdminLogout = () => {
    api.cancelPendingAdminRequests();
    setAdminToken(null);
    adminSessionCoordinator.terminateSession('manual', '/admin');
    api.adminLogout();
    navigate('/admin');
  };

  // Render correct view based on path
  const renderContent = () => {
    if (loading) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-xs font-mono">Initializing INTELLIGENZ platform...</p>
        </div>
      );
    }

    if (currentPath.startsWith('/events/')) {
      const slug = currentPath.replace('/events/', '');
      const event = selectedEvent || events.find((e) => e.slug === slug);
      if (event) {
        return (
          <EventDetailPage
            event={event}
            onBack={() => navigate('/events')}
            onRegister={(ev) => setRegisteringEvent(ev)}
            onSelectEvent={handleSelectEvent}
            relatedEvents={events.filter((e) => e.id !== event.id).slice(0, 3)}
          />
        );
      }
    }

    if (currentPath.startsWith('/announcements/')) {
      const slug = currentPath.replace('/announcements/', '');
      const ann = selectedAnnouncement || announcements.find((a) => a.slug === slug);
      if (ann) {
        return (
          <AnnouncementDetailPage
            announcement={ann}
            onBack={() => navigate('/announcements')}
            onNavigate={navigate}
          />
        );
      }
    }

    if (currentPath.startsWith('/admin')) {
      return adminToken ? (
        <AdminDashboardPage
          onLogout={handleAdminLogout}
          onNavigate={navigate}
          onRefreshData={loadClubData}
        />
      ) : (
        <AdminLoginPage onLoginSuccess={handleAdminLogin} onNavigate={navigate} />
      );
    }

    switch (currentPath) {
      case '/events':
        return (
          <EventsPage
            events={events}
            onSelectEvent={handleSelectEvent}
            onRegisterEvent={(ev) => setRegisteringEvent(ev)}
            onNavigate={navigate}
          />
        );
      case '/announcements':
        return (
          <AnnouncementsPage
            announcements={announcements}
            onSelectAnnouncement={handleSelectAnnouncement}
            onNavigate={navigate}
          />
        );
      case '/projects':
        return (
          <ProjectsPage
            projects={projects}
            onSelectProject={handleSelectProject}
            onNavigate={navigate}
          />
        );
      case '/team':
        return <TeamPage team={team} onNavigate={navigate} />;
      case '/certificates':
      case '/verify':
        return <CertificatesPage onNavigate={navigate} />;
      case '/gallery':
        return <GalleryPage gallery={gallery} onNavigate={navigate} />;
      case '/about':
        return <AboutPage onNavigate={navigate} />;
      case '/join':
        return <JoinPage onNavigate={navigate} settings={settings} />;
      case '/contact':
        return <ContactPage onNavigate={navigate} />;
      case '/admin':
      case '/admin/login':
        return adminToken ? (
          <AdminDashboardPage
            onLogout={handleAdminLogout}
            onNavigate={navigate}
            onRefreshData={loadClubData}
          />
        ) : (
          <AdminLoginPage onLoginSuccess={handleAdminLogin} onNavigate={navigate} />
        );
      case '/':
      default:
        return (
          <HomePage
            events={events}
            announcements={announcements}
            projects={projects}
            stats={stats}
            settings={settings}
            onNavigate={navigate}
            onSelectEvent={handleSelectEvent}
            onRegisterEvent={(ev) => setRegisteringEvent(ev)}
            onSelectAnnouncement={handleSelectAnnouncement}
            onSelectProject={handleSelectProject}
          />
        );
    }
  };

  const isAdminRoute = currentPath.startsWith('/admin') && !!adminToken;

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#E0E2E6] flex flex-col font-['Plus_Jakarta_Sans'] selection:bg-[#00E5FF] selection:text-[#0A0B0E]">
      {/* Navigation Header - Public Website Only */}
      {!isAdminRoute && (
        <Navbar
          currentPath={currentPath}
          onNavigate={navigate}
          onOpenSearch={() => setIsSearchOpen(true)}
          settings={settings}
          isAdminLoggedIn={!!adminToken}
        />
      )}

      {/* Main Content Area */}
      <main className={isAdminRoute ? "min-h-screen" : "flex-1"}>
        <Suspense
          fallback={
            <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-xs font-mono">Loading module...</p>
            </div>
          }
        >
          {renderContent()}
        </Suspense>
      </main>

      {/* Footer - Public Website Only */}
      {!isAdminRoute && (
        <Footer onNavigate={navigate} settings={settings} />
      )}

      {/* Global Search Dialog */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectEvent={handleSelectEvent}
        onSelectAnnouncement={handleSelectAnnouncement}
        onSelectProject={handleSelectProject}
      />

      {/* Event Registration Dialog */}
      <EventRegisterModal
        event={registeringEvent}
        isOpen={!!registeringEvent}
        onClose={() => setRegisteringEvent(null)}
        onSuccess={() => loadClubData()}
      />
    </div>
  );
}
