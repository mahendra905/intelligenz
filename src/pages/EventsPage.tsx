import React, { useState, useMemo } from 'react';
import { Event, EventCategory, EventStatus } from '../types';
import { EventCard } from '../components/EventCard';
import { Calendar, Filter, Sparkles, Search, ArrowLeft } from 'lucide-react';

interface EventsPageProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
  onRegisterEvent: (event: Event) => void;
  onNavigate: (path: string) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({
  events,
  onSelectEvent,
  onRegisterEvent,
  onNavigate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Workshop', 'Hackathon', 'Coding Contest', 'AI Bootcamp', 'Seminar', 'Tech Talk'];
  const statuses = ['All', 'Registration Open', 'Upcoming', 'Completed'];

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchCat = selectedCategory === 'All' || e.category === selectedCategory;
      const matchStatus = selectedStatus === 'All' || e.status === selectedStatus;
      const matchSearch =
        !searchQuery.trim() ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.short_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.venue.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchStatus && matchSearch;
    });
  }, [events, selectedCategory, selectedStatus, searchQuery]);

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300">
          <Calendar className="w-3.5 h-3.5" />
          <span>Technical Events &amp; Hackathons</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-['Outfit']">
          Events &amp; Workshops
        </h1>

        <p className="text-xs sm:text-sm md:text-base text-slate-300">
          Explore upcoming AI hackathons, hands-on programming bootcamps, and technical symposiums hosted by the Department of CSE (AIML) &amp; AI.
        </p>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 sm:p-5 rounded-lg bg-[#0D1017] border border-[#1A1C23] space-y-4">
        
        {/* Search & Status Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search event title, venue..."
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded bg-[#0A0B0E] border border-[#1A1C23] text-white text-xs placeholder-[#4B5563] focus:outline-none focus:border-[#00E5FF] transition-colors font-mono"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  selectedStatus === status
                    ? 'bg-[#00E5FF] text-[#0A0B0E] shadow-sm'
                    : 'bg-[#0A0B0E] text-[#9CA3AF] hover:text-white border border-[#1A1C23]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[#1A1C23]">
          <span className="text-[10px] font-mono font-bold text-[#6B7280] uppercase mr-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#00E5FF]" /> Cat:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/40'
                  : 'text-[#6B7280] hover:text-white hover:bg-[#1A1C23]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-slate-900/40 border border-slate-800 p-8 space-y-3">
          <p className="text-sm font-semibold text-slate-300">
            No events found matching your filter criteria.
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try resetting your category or search keywords to view all club activities.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSelectedStatus('All');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 text-cyan-300 text-xs font-bold hover:bg-slate-700 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onViewDetails={onSelectEvent}
              onRegister={onRegisterEvent}
            />
          ))}
        </div>
      )}

    </div>
  );
};
