import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Event, Announcement, Project } from '../types';
import { Search, X, Calendar, Bell, Code2, ArrowRight, Loader2 } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent: (event: Event) => void;
  onSelectAnnouncement: (announcement: Announcement) => void;
  onSelectProject: (project: Project) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectEvent,
  onSelectAnnouncement,
  onSelectProject,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ events: Event[]; announcements: Announcement[]; projects: Project[] }>({
    events: [],
    announcements: [],
    projects: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ events: [], announcements: [], projects: [] });
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ events: [], announcements: [], projects: [] });
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(query);
        setResults(res);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults = results.events.length + results.announcements.length + results.projects.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-cyan-500/30 p-5 sm:p-6 shadow-2xl shadow-cyan-950/60 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center mb-4">
          <Search className="w-5 h-5 text-cyan-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            autoFocus
            placeholder="Search events, workshops, projects, announcements..."
            value={query || ''}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-950/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline absolute right-3.5 px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 text-left">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs">Searching Intelligenz database...</span>
            </div>
          ) : query && totalResults === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No results found for "<span className="text-slate-200">{query}</span>". Try another keyword like "AI", "Hackathon", or "Python".
            </div>
          ) : !query ? (
            <div className="py-8 text-center text-slate-400 text-xs space-y-2">
              <p>Type keywords to search live club content.</p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {['AI Workshop', 'Hackathon', 'RetinaScan', 'Recruitment', 'Computer Vision'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700/60"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Events Results */}
              {results.events.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Events ({results.events.length})
                  </div>
                  <div className="space-y-2">
                    {results.events.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          onSelectEvent(e);
                          onClose();
                        }}
                        className="w-full p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800/80 hover:border-cyan-500/40 text-left transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {e.title}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {e.date} • {e.category} • {e.status}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Announcements Results */}
              {results.announcements.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5" />
                    Announcements ({results.announcements.length})
                  </div>
                  <div className="space-y-2">
                    {results.announcements.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          onSelectAnnouncement(a);
                          onClose();
                        }}
                        className="w-full p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800/80 hover:border-purple-500/40 text-left transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                            {a.title}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {a.category} • {new Date(a.published_at).toLocaleDateString()}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects Results */}
              {results.projects.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    Projects ({results.projects.length})
                  </div>
                  <div className="space-y-2">
                    {results.projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectProject(p);
                          onClose();
                        }}
                        className="w-full p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800/80 hover:border-amber-500/40 text-left transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {p.category} • {p.tech_stack.join(', ')}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
