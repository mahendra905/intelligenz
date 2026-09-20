import React, { useState, useEffect } from 'react';
import { IntelligenzLogo } from './IntelligenzLogo';
import {
  Menu,
  X,
  Search,
  Sparkles,
  Shield,
  Calendar,
  Bell,
  Code2,
  Users,
  Image as ImageIcon,
  Info,
  Mail,
  ChevronRight,
  ExternalLink,
  Award,
} from 'lucide-react';
import { SiteSettings } from '../types';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenSearch: () => void;
  settings?: SiteSettings;
  isAdminLoggedIn?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  onNavigate,
  onOpenSearch,
  settings,
  isAdminLoggedIn,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Home', path: '/', icon: Sparkles },
    { label: 'Events', path: '/events', icon: Calendar },
    { label: 'Announcements', path: '/announcements', icon: Bell },
    { label: 'Certificates', path: '/certificates', icon: Award },
    { label: 'Projects', path: '/projects', icon: Code2 },
    { label: 'Team', path: '/team', icon: Users },
    { label: 'Gallery', path: '/gallery', icon: ImageIcon },
    { label: 'About', path: '/about', icon: Info },
    { label: 'Contact', path: '/contact', icon: Mail },
  ];

  const handleLinkClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header
      id="main-navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#0A0B0E]/95 backdrop-blur-xl border-b border-[#1A1C23] shadow-xl py-3'
          : 'bg-[#0A0B0E]/90 backdrop-blur-md border-b border-[#1A1C23]/60 py-4'
      }`}
    >
      {/* Top bar with brand, navigation & institutional affiliation */}
      <div className="w-full max-w-[1800px] mr-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo & Brand Identity */}
          <button
            id="nav-brand-btn"
            onClick={() => handleLinkClick('/')}
            className="flex items-center gap-3 text-left focus:outline-none group shrink-0"
          >
            <IntelligenzLogo size="sm" interactive />
            
            <div className="flex flex-col">
              <span className="text-[20px] sm:text-[22px] font-black tracking-tighter text-[#00E5FF] font-['Outfit'] group-hover:text-white transition-colors">
                INTELLIGENZ
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#6B7280] font-semibold -mt-0.5">
                {settings?.club_sub_name || 'IntelliGenZ Club'}
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav id="desktop-nav" className="hidden lg:flex items-center gap-3.5 xl:gap-4.5 2xl:gap-6 text-[12px] font-medium uppercase tracking-widest text-[#9CA3AF]">
            {navItems.map((item) => {
              const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  id={`nav-link-${item.label.toLowerCase()}`}
                  onClick={() => handleLinkClick(item.path)}
                  className={`transition-colors whitespace-nowrap ${
                    isActive
                      ? 'text-[#00E5FF] border-b border-[#00E5FF] pb-0.5 font-bold'
                      : 'hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Institutional Affiliation, Search & CTA */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Institutional Hierarchy Info on Desktop */}
            <div className="text-right hidden 2xl:flex flex-col">
              <div className="text-[9px] uppercase tracking-[0.2em] text-[#6B7280] leading-tight max-w-xs truncate font-medium">
                {settings?.college_name || 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY'}
              </div>
              <div className="text-[10px] font-semibold text-[#D1D5DB] uppercase tracking-wider">
                {settings?.department_name || 'DEPT OF CSE (AIML) & AI'}
              </div>
            </div>

            {/* Search Trigger */}
            <button
              id="search-open-btn"
              onClick={onOpenSearch}
              aria-label="Search website"
              className="p-2 sm:px-3 sm:py-1.5 min-h-[38px] min-w-[38px] rounded-lg bg-[#0D1017] hover:bg-[#1A1C23] text-[#9CA3AF] hover:text-[#00E5FF] border border-[#1A1C23] transition-colors flex items-center justify-center gap-2 text-xs"
            >
              <Search className="w-4 h-4 text-[#00E5FF]" />
              <span className="hidden xl:inline text-[#6B7280]">Search</span>
              <kbd className="hidden xl:inline text-[9px] bg-[#0A0B0E] px-1 py-0.5 rounded border border-[#1A1C23] text-[#6B7280]">⌘K</kbd>
            </button>

            {/* Admin Badge if logged in */}
            {isAdminLoggedIn ? (
              <button
                id="nav-admin-dashboard-btn"
                onClick={() => handleLinkClick('/admin')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1A1C23] text-[#00E5FF] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/10 transition-colors uppercase tracking-wider"
              >
                <Shield className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Admin</span>
              </button>
            ) : null}

            {/* Join Us Highlight CTA - Hidden on mobile top notch to keep screen fit & uncluttered */}
            <button
              id="nav-join-us-btn"
              onClick={() => handleLinkClick('/join')}
              className="hidden md:flex bg-[#00E5FF] text-[#0A0B0E] hover:bg-[#33ebff] px-4 sm:px-5 py-2 font-bold text-[12px] uppercase tracking-widest transition-all shadow-md shadow-[#00E5FF]/20 items-center gap-1.5 rounded-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>JOIN US</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 min-h-[38px] min-w-[38px] rounded-lg bg-[#0D1017] text-[#9CA3AF] hover:text-white border border-[#1A1C23] transition-colors flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="lg:hidden fixed inset-x-0 top-[65px] bg-[#0A0B0E]/98 border-b border-[#1A1C23] shadow-2xl backdrop-blur-2xl px-5 py-6 max-h-[85vh] overflow-y-auto"
        >
          {/* Institutional info in drawer */}
          <div className="p-3.5 mb-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] text-xs">
            <div className="font-bold text-[#00E5FF] tracking-wider uppercase font-['Outfit'] flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping" />
              INTELLIGENZ • CLUB PORTAL
            </div>
            <div className="text-[#D1D5DB] text-[11px] font-semibold mt-1 uppercase tracking-wide">
              {settings?.department_name || 'DEPARTMENT OF CSE (AIML) & AI'}
            </div>
            <div className="text-[#6B7280] text-[10px] mt-0.5 font-medium uppercase tracking-[0.1em]">
              {settings?.college_name || 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  id={`mobile-nav-${item.label.toLowerCase()}`}
                  onClick={() => handleLinkClick(item.path)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-[#0D1017] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#00E5FF]' : 'text-[#6B7280]'}`} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#4B5563]" />
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-[#1A1C23] flex flex-col gap-3">
            <button
              id="mobile-join-cta"
              onClick={() => handleLinkClick('/join')}
              className="w-full py-3 bg-[#00E5FF] text-[#0A0B0E] font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#00E5FF]/20 flex items-center justify-center gap-2 rounded-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply to Join IntelliGenZ</span>
            </button>

            <div className="flex items-center justify-between text-xs text-[#6B7280] px-1 pt-1">
              <button
                id="mobile-admin-login-link"
                onClick={() => handleLinkClick('/admin')}
                className="flex items-center gap-1.5 text-[#6B7280] hover:text-[#00E5FF] transition-colors uppercase tracking-wider text-[10px]"
              >
                <Shield className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Admin Portal</span>
              </button>
              <span className="text-[10px] text-[#4B5563] uppercase tracking-widest font-mono">v2.5 PRODUCTION</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
