import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Sparkles,
  ExternalLink,
  Star,
  CheckCircle2,
  X,
  Trophy,
  Award,
  Medal,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Event, EventCategory, EventStatus, ParticipationType, EventWinner, EventRegistration } from '../../types';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { ImageUploader } from './ImageUploader';
import { api, adminApi } from '../../lib/api';

interface AdminEventsTabProps {
  events: Event[];
  onSaveEvent: (eventData: Partial<Event>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onDuplicateEvent: (id: string) => Promise<void>;
  onRefreshEvents?: () => Promise<void>;
}

export const AdminEventsTab: React.FC<AdminEventsTabProps> = ({
  events,
  onSaveEvent,
  onDeleteEvent,
  onDuplicateEvent,
  onRefreshEvents,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manage Winners State
  const [winnersTargetEvent, setWinnersTargetEvent] = useState<Event | null>(null);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [firstPlaceId, setFirstPlaceId] = useState<string>('');
  const [secondPlaceId, setSecondPlaceId] = useState<string>('');
  const [thirdPlaceId, setThirdPlaceId] = useState<string>('');
  const [resultsNote, setResultsNote] = useState<string>('');
  const [savingWinners, setSavingWinners] = useState(false);
  const [winnersError, setWinnersError] = useState<string | null>(null);
  const [winnersSuccess, setWinnersSuccess] = useState<string | null>(null);

  const categories: EventCategory[] = [
    'Workshop',
    'Hackathon',
    'Seminar',
    'Coding Contest',
    'Technical Talk',
    'Orientation',
    'Project Expo',
  ];

  const statuses: EventStatus[] = [
    'Upcoming',
    'Registration Open',
    'Registration Closed',
    'Ongoing',
    'Completed',
  ];

  const participationTypes: ParticipationType[] = ['SOLO', 'DUO', 'TEAM'];

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'All' || e.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
    const matchesType = typeFilter === 'All' || (e.participation_type || 'SOLO') === typeFilter;
    return matchesSearch && matchesCat && matchesStatus && matchesType;
  });

  const handleOpenCreate = () => {
    setEditingEvent({
      title: '',
      category: 'Workshop',
      status: 'Registration Open',
      participation_type: 'SOLO',
      min_team_size: 1,
      max_team_size: 1,
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM - 04:00 PM',
      venue: 'Main Seminar Hall / AI Lab 301',
      description: '',
      short_description: '',
      banner_image: '',
      event_image: '',
      featured: false,
      maximum_participants: 120,
      current_participants: 0,
      registration_deadline: '',
      highlights: ['Hands-on laboratory exercises', 'Certificates of completion'],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evt: Event) => {
    const pType = evt.participation_type || 'SOLO';
    setEditingEvent({
      ...evt,
      participation_type: pType,
      min_team_size: evt.min_team_size || (pType === 'SOLO' ? 1 : 2),
      max_team_size: evt.max_team_size || (pType === 'SOLO' ? 1 : pType === 'DUO' ? 2 : 4),
    });
    setIsModalOpen(true);
  };

  const handleOpenWinners = async (evt: Event) => {
    setWinnersTargetEvent(evt);
    setWinnersError(null);
    setWinnersSuccess(null);
    setResultsNote(evt.results || '');
    setLoadingRegs(true);

    try {
      const regs = await api.getEventRegistrations(evt.id);
      setEventRegistrations(regs);

      // Prepopulate existing winners if any
      const w1 = evt.winners?.find((w) => w.position.includes('1st') || w.position === '1');
      const w2 = evt.winners?.find((w) => w.position.includes('2nd') || w.position === '2');
      const w3 = evt.winners?.find((w) => w.position.includes('3rd') || w.position === '3');

      // Try matching by registration_id or student name / team name
      const findRegId = (winner?: EventWinner) => {
        if (!winner) return '';
        if (winner.registration_id) return winner.registration_id;
        const match = regs.find(
          (r) =>
            (winner.team_name && r.team_name === winner.team_name) ||
            r.full_name === winner.name
        );
        return match ? match.id : '';
      };

      setFirstPlaceId(findRegId(w1));
      setSecondPlaceId(findRegId(w2));
      setThirdPlaceId(findRegId(w3));
    } catch (err: any) {
      setWinnersError('Failed to load registrations for this event.');
    } finally {
      setLoadingRegs(false);
    }
  };

  const handleSaveWinners = async () => {
    if (!winnersTargetEvent) return;
    setWinnersError(null);
    setWinnersSuccess(null);

    // Validate uniqueness if multiple positions selected
    const selected = [firstPlaceId, secondPlaceId, thirdPlaceId].filter(Boolean);
    if (new Set(selected).size !== selected.length) {
      setWinnersError('Cannot assign the same registration/team to more than one winner position.');
      return;
    }

    setSavingWinners(true);
    try {
      const res = await adminApi.adminUpdateEventWinners(winnersTargetEvent.id, {
        first_registration_id: firstPlaceId || undefined,
        second_registration_id: secondPlaceId || undefined,
        third_registration_id: thirdPlaceId || undefined,
        results: resultsNote,
      });

      setWinnersSuccess('Podium winners successfully updated!');
      if (onRefreshEvents) await onRefreshEvents();
      setTimeout(() => {
        setWinnersTargetEvent(null);
      }, 1200);
    } catch (err: any) {
      setWinnersError(err.message || 'Failed to save winners');
    } finally {
      setSavingWinners(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.title) return;

    // Validate team sizes if TEAM type
    if (editingEvent.participation_type === 'TEAM') {
      const min = Number(editingEvent.min_team_size) || 2;
      const max = Number(editingEvent.max_team_size) || 4;
      if (min < 2) {
        alert('Minimum team size must be at least 2 members.');
        return;
      }
      if (max < min) {
        alert('Maximum team size cannot be smaller than minimum team size.');
        return;
      }
    }

    setSaving(true);
    try {
      await onSaveEvent(editingEvent);
      setIsModalOpen(false);
      setEditingEvent(null);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteEvent(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#00E5FF]" />
            Events Management ({events.length})
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Create, schedule, edit, configure Solo/Duo/Team participation and manage winners
          </p>
        </div>

        <button
          id="admin-create-event-btn"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#00E5FF]/20 flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Event</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events by title, venue or description..."
            value={search || ''}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00E5FF]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={categoryFilter || 'All'}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={typeFilter || 'All'}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
          >
            <option value="All">All Types</option>
            <option value="SOLO">Solo Only</option>
            <option value="DUO">Duo Only</option>
            <option value="TEAM">Team Only</option>
          </select>

          <select
            value={statusFilter || 'All'}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
          >
            <option value="All">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Table / Card List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center bg-[#0D1017] border border-[#1A1C23] rounded-2xl text-[#6B7280] text-xs">
            No events match the selected criteria.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const pType = evt.participation_type || 'SOLO';
            const hasWinners = evt.winners && evt.winners.length > 0;
            return (
              <div
                key={evt.id}
                className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] hover:border-[#2A2E3D] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Event Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <img
                    src={evt.banner_image || evt.event_image || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=300&q=80'}
                    alt={evt.title}
                    className="w-16 h-16 rounded-lg object-cover border border-[#1A1C23] shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20">
                        {evt.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          pType === 'SOLO'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : pType === 'DUO'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {pType === 'SOLO' && 'Solo (1)'}
                        {pType === 'DUO' && 'Duo (2)'}
                        {pType === 'TEAM' && `Team (${evt.min_team_size || 2}–${evt.max_team_size || 4})`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          evt.status === 'Registration Open'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : evt.status === 'Upcoming'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : evt.status === 'Ongoing'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        }`}
                      >
                        {evt.status}
                      </span>
                      {hasWinners && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          Winners Published ({evt.winners?.length})
                        </span>
                      )}
                      {evt.featured && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400" />
                          Featured
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white tracking-tight truncate">
                      {evt.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#9CA3AF] mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#00E5FF]" />
                        {evt.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
                        {evt.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#6B7280]" />
                        {evt.venue}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#6B7280]" />
                        {evt.current_participants ?? 0} / {evt.maximum_participants || '∞'} Registrations
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                  {/* Manage Winners Button */}
                  <button
                    onClick={() => handleOpenWinners(evt)}
                    title="Manage Winners"
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-colors border border-amber-500/30 flex items-center gap-1.5"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Winners</span>
                  </button>

                  <button
                    id={`duplicate-event-${evt.id}`}
                    onClick={() => onDuplicateEvent(evt.id)}
                    title="Duplicate Event"
                    className="p-2 rounded-lg bg-[#1A1C23] hover:bg-[#252833] text-[#9CA3AF] hover:text-[#00E5FF] transition-colors border border-[#1A1C23]"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    id={`edit-event-${evt.id}`}
                    onClick={() => handleOpenEdit(evt)}
                    className="px-3 py-1.5 rounded-lg bg-[#1A1C23] hover:bg-[#252833] text-white text-xs font-semibold transition-colors border border-[#2A2E3D] flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#00E5FF]" />
                    <span>Edit</span>
                  </button>

                  <button
                    id={`delete-event-${evt.id}`}
                    onClick={() => setDeleteTarget(evt)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Event Modal */}
      {isModalOpen && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0D1017] border border-[#1A1C23] rounded-2xl p-6 shadow-2xl my-8 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1A1C23]">
              <h3 className="text-base font-bold text-white">
                {editingEvent.id ? 'Edit Event' : 'Create New Event'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1A1C23]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingEvent.title || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  placeholder="e.g. Next-Gen Generative AI Masterclass"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              {/* Category, Status, Participation Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Category *
                  </label>
                  <select
                    value={editingEvent.category || 'Workshop'}
                    onChange={(e) => setEditingEvent({ ...editingEvent, category: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Status *
                  </label>
                  <select
                    value={editingEvent.status || 'Registration Open'}
                    onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#00E5FF] mb-1">
                    Participation Type *
                  </label>
                  <select
                    value={editingEvent.participation_type || 'SOLO'}
                    onChange={(e) => {
                      const newType = e.target.value as ParticipationType;
                      setEditingEvent({
                        ...editingEvent,
                        participation_type: newType,
                        min_team_size: newType === 'SOLO' ? 1 : 2,
                        max_team_size: newType === 'SOLO' ? 1 : newType === 'DUO' ? 2 : 4,
                      });
                    }}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#00E5FF]/40 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  >
                    <option value="SOLO">SOLO (1 Participant)</option>
                    <option value="DUO">DUO (2 Members)</option>
                    <option value="TEAM">TEAM (Variable Size)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Team Size Settings if TEAM is selected */}
              {editingEvent.participation_type === 'TEAM' && (
                <div className="p-3.5 rounded-xl bg-[#0A0B0E] border border-[#A78BFA]/30 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-[#A78BFA] mb-1">
                      Min Team Size (Leader + Members) *
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      required
                      value={editingEvent.min_team_size || 2}
                      onChange={(e) => setEditingEvent({ ...editingEvent, min_team_size: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#A78BFA]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A78BFA] mb-1">
                      Max Team Size *
                    </label>
                    <input
                      type="number"
                      min={editingEvent.min_team_size || 2}
                      max={12}
                      required
                      value={editingEvent.max_team_size || 4}
                      onChange={(e) => setEditingEvent({ ...editingEvent, max_team_size: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#A78BFA]"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editingEvent.date || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Time / Duration *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEvent.time || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                    placeholder="e.g. 09:30 AM - 04:30 PM"
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Venue *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEvent.venue || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, venue: e.target.value })}
                    placeholder="e.g. CSE AI Lab 304 / Main Auditorium"
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Capacity (Max Participants)
                  </label>
                  <input
                    type="number"
                    value={editingEvent.maximum_participants || 100}
                    onChange={(e) => setEditingEvent({ ...editingEvent, maximum_participants: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              <div>
                <ImageUploader
                  value={editingEvent.banner_image || editingEvent.event_image || ''}
                  onChange={(url) => setEditingEvent({ ...editingEvent, banner_image: url, event_image: url })}
                  category="events"
                  label="Event Banner Image"
                  aspectRatio="banner"
                  helpText="Supported formats: JPG, PNG, WEBP (Max 50 MB)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Short Summary (for cards)
                </label>
                <input
                  type="text"
                  value={editingEvent.short_description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, short_description: e.target.value })}
                  placeholder="One sentence overview..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Detailed Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  placeholder="Full agenda, eligibility, software prerequisites, and outcomes..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="event-featured-toggle"
                  checked={editingEvent.featured || false}
                  onChange={(e) => setEditingEvent({ ...editingEvent, featured: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#0A0B0E] border-[#1A1C23] text-[#00E5FF] focus:ring-0"
                />
                <label htmlFor="event-featured-toggle" className="text-xs text-[#D1D5DB] cursor-pointer">
                  Feature this event on the Homepage Hero &amp; Spotlight
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#1A1C23]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#1A1C23] text-xs text-[#9CA3AF] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingEvent.id ? 'Update Event' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Winners Modal */}
      {winnersTargetEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-[#0D1017] border border-amber-500/30 rounded-2xl p-6 shadow-2xl my-8 text-left max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setWinnersTargetEvent(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-[#1A1C23] text-[#9CA3AF] hover:text-white hover:bg-[#252833]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Trophy className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Podium Winners Management</span>
            </div>

            <h3 className="text-lg font-bold text-white font-['Outfit'] line-clamp-1 mb-1">
              {winnersTargetEvent.title}
            </h3>
            <p className="text-xs text-[#9CA3AF] mb-4">
              Select verified event participants or registered teams from the database for the 1st, 2nd, and 3rd place podium.
            </p>

            {winnersError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{winnersError}</span>
              </div>
            )}

            {winnersSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{winnersSuccess}</span>
              </div>
            )}

            {loadingRegs ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-[#9CA3AF]">
                <Loader2 className="w-6 h-6 animate-spin text-[#00E5FF] mb-2" />
                <span className="text-xs">Loading registered participants...</span>
              </div>
            ) : eventRegistrations.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-center text-[#9CA3AF] text-xs space-y-2">
                <p>No student or team registrations found in database for this event.</p>
                <p className="text-[11px] text-[#6B7280]">Participants must register first before they can be chosen as podium winners.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1st Place */}
                <div className="p-3.5 rounded-xl bg-[#0A0B0E] border border-yellow-500/30 space-y-1.5">
                  <label className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                    <Medal className="w-4 h-4" />
                    🥇 1st Place (Winner)
                  </label>
                  <select
                    value={firstPlaceId || ''}
                    onChange={(e) => setFirstPlaceId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="">-- Select 1st Place Registration --</option>
                    {eventRegistrations.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.team_name ? `[Team ${reg.team_name}] Leader: ` : ''}{reg.full_name} ({reg.roll_number}) - {reg.department}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2nd Place */}
                <div className="p-3.5 rounded-xl bg-[#0A0B0E] border border-slate-400/30 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Medal className="w-4 h-4" />
                    🥈 2nd Place (Runner Up)
                  </label>
                  <select
                    value={secondPlaceId || ''}
                    onChange={(e) => setSecondPlaceId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-slate-300"
                  >
                    <option value="">-- Select 2nd Place Registration --</option>
                    {eventRegistrations.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.team_name ? `[Team ${reg.team_name}] Leader: ` : ''}{reg.full_name} ({reg.roll_number}) - {reg.department}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3rd Place */}
                <div className="p-3.5 rounded-xl bg-[#0A0B0E] border border-amber-700/30 space-y-1.5">
                  <label className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                    <Medal className="w-4 h-4" />
                    🥉 3rd Place (2nd Runner Up)
                  </label>
                  <select
                    value={thirdPlaceId || ''}
                    onChange={(e) => setThirdPlaceId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#11141D] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-amber-600"
                  >
                    <option value="">-- Select 3rd Place Registration --</option>
                    {eventRegistrations.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.team_name ? `[Team ${reg.team_name}] Leader: ` : ''}{reg.full_name} ({reg.roll_number}) - {reg.department}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Results & Remarks */}
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Results Statement / Remarks
                  </label>
                  <input
                    type="text"
                    value={resultsNote || ''}
                    onChange={(e) => setResultsNote(e.target.value)}
                    placeholder="e.g. Felicitated by the Head of Department with shields and cash prizes."
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-[#1A1C23]">
                  <button
                    type="button"
                    onClick={() => {
                      setFirstPlaceId('');
                      setSecondPlaceId('');
                      setThirdPlaceId('');
                      setResultsNote('');
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                  >
                    Clear All Winners
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setWinnersTargetEvent(null)}
                      className="px-4 py-2 rounded-lg bg-[#1A1C23] text-xs text-[#9CA3AF] hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveWinners}
                      disabled={savingWinners}
                      className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0A0B0E] text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {savingWinners ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5" />}
                      <span>Save Winners</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Event"
        itemType="Event"
        itemName={deleteTarget?.title || ''}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
