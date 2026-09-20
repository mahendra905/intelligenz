import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Bell,
  Calendar,
  Search,
  Star,
  Sparkles,
  ExternalLink,
  X,
  FileText,
} from 'lucide-react';
import { Announcement, AnnouncementCategory } from '../../types';
import { DeleteConfirmModal } from '../DeleteConfirmModal';

interface AdminAnnouncementsTabProps {
  announcements: Announcement[];
  onSaveAnnouncement: (data: Partial<Announcement>) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
}

export const AdminAnnouncementsTab: React.FC<AdminAnnouncementsTabProps> = ({
  announcements,
  onSaveAnnouncement,
  onDeleteAnnouncement,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<Announcement> | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const categories: AnnouncementCategory[] = [
    'General',
    'Recruitment',
    'Event',
    'Workshop',
    'Hackathon',
    'Opportunity',
  ];

  const filtered = announcements.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'All' || a.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleOpenCreate = () => {
    setEditingAnnouncement({
      title: '',
      category: 'General',
      published_date: new Date().toISOString().split('T')[0],
      summary: '',
      content: '',
      author: 'IntelliGenZ Executive Committee',
      featured: false,
      pinned: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ann: Announcement) => {
    setEditingAnnouncement({ ...ann });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement?.title) return;
    setSaving(true);
    try {
      await onSaveAnnouncement(editingAnnouncement);
      setIsModalOpen(false);
      setEditingAnnouncement(null);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteAnnouncement(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Announcements &amp; Bulletins ({announcements.length})
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Publish department circulars, recruitment notifications, and club updates
          </p>
        </div>

        <button
          id="admin-create-announcement-btn"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0A0B0E] font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-400/20 flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Post Announcement</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search announcements by title or keyword..."
            value={search || ''}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-amber-400"
          />
        </div>

        <select
          value={categoryFilter || 'All'}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-amber-400"
        >
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-[#0D1017] border border-[#1A1C23] rounded-2xl text-[#6B7280] text-xs">
            No announcements found.
          </div>
        ) : (
          filtered.map((ann) => (
            <div
              key={ann.id}
              className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] hover:border-[#2A2E3D] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400/10 text-amber-400 border border-amber-400/20">
                    {ann.category}
                  </span>
                  {ann.featured && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-[#00E5FF]" />
                      Featured
                    </span>
                  )}
                  {ann.pinned && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Pinned
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white tracking-tight truncate">
                  {ann.title}
                </h3>

                <p className="text-xs text-[#9CA3AF] line-clamp-1 mt-0.5">
                  {ann.summary || ann.content}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-[#6B7280] mt-1.5 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {ann.published_date}
                  </span>
                  <span>• By {ann.author || 'IntelliGenZ Committee'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  id={`edit-announcement-${ann.id}`}
                  onClick={() => handleOpenEdit(ann)}
                  className="px-3 py-1.5 rounded-lg bg-[#1A1C23] hover:bg-[#252833] text-white text-xs font-semibold transition-colors border border-[#2A2E3D] flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit</span>
                </button>

                <button
                  id={`delete-announcement-${ann.id}`}
                  onClick={() => setDeleteTarget(ann)}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && editingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0D1017] border border-[#1A1C23] rounded-2xl p-6 shadow-2xl my-8 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1A1C23]">
              <h3 className="text-base font-bold text-white">
                {editingAnnouncement.id ? 'Edit Announcement' : 'Create New Announcement'}
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
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingAnnouncement.title || ''}
                  onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                  placeholder="e.g. Call for Core Committee Nominations 2026-27"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Category *
                  </label>
                  <select
                    value={editingAnnouncement.category || 'General'}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, category: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-amber-400"
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
                    Published Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editingAnnouncement.published_date || ''}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, published_date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Short Summary / Abstract
                </label>
                <input
                  type="text"
                  value={editingAnnouncement.summary || ''}
                  onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, summary: e.target.value })}
                  placeholder="A concise overview visible in lists..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Full Announcement Content *
                </label>
                <textarea
                  rows={6}
                  required
                  value={editingAnnouncement.content || ''}
                  onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })}
                  placeholder="Full bulletin body, instructions, eligibility criteria, and deadlines..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ann-featured-toggle"
                    checked={editingAnnouncement.featured || false}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, featured: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#0A0B0E] border-[#1A1C23] text-amber-400 focus:ring-0"
                  />
                  <label htmlFor="ann-featured-toggle" className="text-xs text-[#D1D5DB] cursor-pointer">
                    Feature on Homepage Ticker
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ann-pinned-toggle"
                    checked={editingAnnouncement.pinned || false}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, pinned: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#0A0B0E] border-[#1A1C23] text-purple-400 focus:ring-0"
                  />
                  <label htmlFor="ann-pinned-toggle" className="text-xs text-[#D1D5DB] cursor-pointer">
                    Pin to Top of Announcements List
                  </label>
                </div>
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
                  className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0A0B0E] text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingAnnouncement.id ? 'Update Bulletin' : 'Publish Bulletin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Announcement"
        itemType="Announcement"
        itemName={deleteTarget?.title || ''}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
