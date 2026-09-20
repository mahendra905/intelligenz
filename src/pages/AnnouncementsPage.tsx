import React, { useState, useMemo } from 'react';
import { Announcement } from '../types';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { Bell, Search, Sparkles, Filter, Megaphone } from 'lucide-react';

interface AnnouncementsPageProps {
  announcements: Announcement[];
  onSelectAnnouncement: (ann: Announcement) => void;
  onNavigate: (path: string) => void;
}

export const AnnouncementsPage: React.FC<AnnouncementsPageProps> = ({
  announcements,
  onSelectAnnouncement,
  onNavigate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Events', 'Club News', 'Recruitment', 'Workshops', 'Important'];

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      const matchCat =
        selectedCategory === 'All' ||
        a.category === selectedCategory ||
        (selectedCategory === 'Events' && (a.category === 'Events' || (a.category as any) === 'Event')) ||
        (selectedCategory === 'Workshops' && (a.category === 'Workshops' || (a.category as any) === 'Workshop'));
      const matchSearch =
        !searchQuery.trim() ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [announcements, selectedCategory, searchQuery]);

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 border border-[#00E5FF]/20 bg-[#00E5FF]/5 rounded-full py-1.5 px-4 text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-[#00E5FF] font-bold">
          <Megaphone className="w-3.5 h-3.5" />
          <span>Official Circulars &amp; Dispatches</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-['Outfit'] tracking-tight">
          Club Announcements
        </h1>

        <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
          Stay informed on core committee recruitment, hackathon results, technical project expos, and official notices from the{' '}
          <span className="text-white font-semibold">Department of CSE (AIML) &amp; AI</span> at{' '}
          <span className="text-white font-semibold">DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY</span>.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1017] border border-[#1A1C23] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search circulars, tags or keywords..."
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#00E5FF] transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#00E5FF] text-[#0A0B0E] shadow-md shadow-[#00E5FF]/20'
                  : 'bg-[#0A0B0E] text-[#9CA3AF] hover:text-white border border-[#1A1C23]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredAnnouncements.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-[#0D1017] border border-[#1A1C23] p-8 space-y-3">
          <p className="text-sm font-semibold text-white">
            No announcements match the selected filter.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-[#1A1C23] hover:bg-[#252833] text-[#00E5FF] text-xs font-bold transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAnnouncements.map((ann) => (
            <AnnouncementCard
              key={ann.id}
              announcement={ann}
              onReadMore={onSelectAnnouncement}
            />
          ))}
        </div>
      )}
    </div>
  );
};
