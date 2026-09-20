import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Search,
  Calendar,
  Sparkles,
  X,
} from 'lucide-react';
import { GalleryImage } from '../../types';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { ImageUploader } from './ImageUploader';

interface AdminGalleryTabProps {
  gallery: GalleryImage[];
  onSaveItem: (data: Partial<GalleryImage>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

export const AdminGalleryTab: React.FC<AdminGalleryTabProps> = ({
  gallery,
  onSaveItem,
  onDeleteItem,
}) => {
  const [search, setSearch] = useState('');
  const [albumFilter, setAlbumFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<GalleryImage> | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<GalleryImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const albums = Array.from(new Set(gallery.map((g) => g.album).filter(Boolean)));

  const filtered = gallery.filter((g) => {
    const matchesSearch =
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.caption.toLowerCase().includes(search.toLowerCase()) ||
      (g.event_name && g.event_name.toLowerCase().includes(search.toLowerCase()));
    const matchesAlbum = albumFilter === 'All' || g.album === albumFilter;
    return matchesSearch && matchesAlbum;
  });

  const handleOpenCreate = () => {
    setEditingItem({
      title: '',
      album: albums[0] || 'Workshops 2026',
      event_name: '',
      image_url: '',
      caption: '',
      date: new Date().toISOString().split('T')[0],
      featured: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: GalleryImage) => {
    setEditingItem({ ...item });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title || !editingItem?.image_url) return;
    setSaving(true);
    try {
      await onSaveItem(editingItem);
      setIsModalOpen(false);
      setEditingItem(null);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteItem(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-400" />
            Photo Gallery &amp; Event Media ({gallery.length})
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Curate moments from hackathons, guest lectures, orientations, and technical workshops
          </p>
        </div>

        <button
          id="admin-add-gallery-btn"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Photo</span>
        </button>
      </div>

      {/* Filter */}
      <div className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by caption, album or event name..."
            value={search || ''}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-emerald-400"
          />
        </div>

        <select
          value={albumFilter || 'All'}
          onChange={(e) => setAlbumFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-emerald-400"
        >
          <option value="All">All Albums</option>
          {albums.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-[#0D1017] border border-[#1A1C23] rounded-2xl text-[#6B7280] text-xs">
            No gallery items found.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-[#0D1017] border border-[#1A1C23] overflow-hidden group hover:border-[#2A2E3D] transition-all flex flex-col"
            >
              <div className="relative aspect-video overflow-hidden bg-[#0A0B0E]">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-bold uppercase text-white tracking-wider border border-white/10">
                    {item.album}
                  </span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight truncate">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#9CA3AF] line-clamp-2 mt-1">
                    {item.caption}
                  </p>
                  {item.event_name && (
                    <div className="text-[11px] text-[#00E5FF] mt-1 font-semibold">
                      Event: {item.event_name}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-[#1A1C23] flex items-center justify-between">
                  <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {item.date}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-gallery-${item.id}`}
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#1A1C23]"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                    <button
                      id={`delete-gallery-${item.id}`}
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0D1017] border border-[#1A1C23] rounded-2xl p-6 shadow-2xl my-8 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1A1C23]">
              <h3 className="text-base font-bold text-white">
                {editingItem.id ? 'Edit Photo Details' : 'Add Photo to Gallery'}
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
                  Title / Headline *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder="e.g. Hands-on AI Hackathon Coding Session"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Album / Collection *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.album || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, album: e.target.value })}
                    placeholder="e.g. Hackathons, Workshops"
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editingItem.date || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Associated Event Name (Optional)
                </label>
                <input
                  type="text"
                  value={editingItem.event_name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, event_name: e.target.value })}
                  placeholder="e.g. CodeClash 2026 or GenAI Workshop"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <ImageUploader
                  value={editingItem.image_url || ''}
                  onChange={(url) => setEditingItem({ ...editingItem, image_url: url })}
                  category="gallery"
                  label="Image Upload *"
                  required
                  aspectRatio="video"
                  helpText="Supported formats: JPG, PNG, WEBP (Max 50 MB)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Caption / Description
                </label>
                <textarea
                  rows={2}
                  value={editingItem.caption || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, caption: e.target.value })}
                  placeholder="Short description of the moment captured..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-emerald-400"
                />
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
                  disabled={saving || !editingItem.title?.trim() || !editingItem.album?.trim() || !editingItem.date || !editingItem.image_url?.trim()}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? 'Saving...' : editingItem.id ? 'Update Photo' : 'Add Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Photo"
        itemType="Gallery Photo"
        itemName={deleteTarget?.title || ''}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
