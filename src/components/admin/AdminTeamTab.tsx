import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Search,
  Linkedin,
  Github,
  Mail,
  X,
  Sparkles,
} from 'lucide-react';
import { TeamMember, TeamCategory } from '../../types';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { ImageUploader } from './ImageUploader';

interface AdminTeamTabProps {
  team: TeamMember[];
  onSaveMember: (data: Partial<TeamMember>) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
}

export const AdminTeamTab: React.FC<AdminTeamTabProps> = ({
  team,
  onSaveMember,
  onDeleteMember,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Partial<TeamMember> | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const categories: TeamCategory[] = [
    'Faculty Coordinator',
    'Club Lead',
    'Vice Lead',
    'Technical Team',
    'Design Team',
    'Management Team',
    'Media Team',
    'Event Team',
  ];

  const filtered = team.filter((m) => {
    const roleOrPos = (m.position || m.role || '').toLowerCase();
    const dept = (m.department || '').toLowerCase();
    const name = (m.name || '').toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch = name.includes(query) || roleOrPos.includes(query) || dept.includes(query);
    const matchesCat = categoryFilter === 'All' || m.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleOpenCreate = () => {
    setEditingMember({
      name: '',
      role: 'Core Member',
      position: 'Core Member',
      category: 'Technical Team',
      department: 'CSE (AIML) & AI',
      year: '3rd Year',
      bio: '',
      image_url: '',
      photo_url: '',
      order_index: (team.length + 1) * 10,
      order: team.length + 1,
      social_links: {
        linkedin: '',
        github: '',
        email: '',
      },
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mem: TeamMember) => {
    const pos = mem.position || mem.role || '';
    const img = mem.photo_url || mem.image_url || '';
    const linkedin = mem.linkedin || mem.social_links?.linkedin || '';
    const github = mem.github || mem.social_links?.github || '';
    const email = mem.email || mem.social_links?.email || '';

    setEditingMember({
      ...mem,
      role: pos,
      position: pos,
      image_url: img,
      photo_url: img,
      department: mem.department || '',
      year: mem.year || '',
      bio: mem.bio || '',
      social_links: {
        linkedin,
        github,
        email,
        ...mem.social_links,
      },
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember?.name) return;
    setSaving(true);
    try {
      const pos = (editingMember.role || editingMember.position || 'Member').trim();
      const img = (editingMember.image_url || editingMember.photo_url || '').trim();
      const linkedin = (editingMember.social_links?.linkedin || editingMember.linkedin || '').trim();
      const github = (editingMember.social_links?.github || editingMember.github || '').trim();
      const email = (editingMember.social_links?.email || editingMember.email || '').trim();

      const payload: Partial<TeamMember> = {
        ...editingMember,
        name: editingMember.name.trim(),
        role: pos,
        position: pos,
        image_url: img,
        photo_url: img,
        department: (editingMember.department || 'CSE (AIML) & AI').trim(),
        year: (editingMember.year || '').trim(),
        bio: (editingMember.bio || '').trim(),
        linkedin,
        github,
        email,
        social_links: {
          linkedin,
          github,
          email,
          ...(editingMember.social_links || {}),
        },
      };

      await onSaveMember(payload);
      setIsModalOpen(false);
      setEditingMember(null);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteMember(deleteTarget.id);
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
            <Users className="w-5 h-5 text-indigo-400" />
            Core Team &amp; Faculty ({team.length})
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Manage faculty advisors, student leadership, technical mentors and team rosters
          </p>
        </div>

        <button
          id="admin-add-member-btn"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Filter */}
      <div className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, designation or branch..."
            value={search || ''}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-indigo-400"
          />
        </div>

        <select
          value={categoryFilter || 'All'}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-indigo-400"
        >
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-[#0D1017] border border-[#1A1C23] rounded-2xl text-[#6B7280] text-xs">
            No team members found.
          </div>
        ) : (
          filtered.map((mem) => (
            <div
              key={mem.id}
              className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] hover:border-[#2A2E3D] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={mem.photo_url || mem.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                      alt={mem.name}
                      className="w-12 h-12 rounded-xl object-cover border border-[#1A1C23] shrink-0"
                    />
                    <div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 block w-fit mb-0.5">
                        {mem.category}
                      </span>
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        {mem.name}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-team-${mem.id}`}
                      onClick={() => handleOpenEdit(mem)}
                      className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#1A1C23]"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                    </button>
                    <button
                      id={`delete-team-${mem.id}`}
                      onClick={() => setDeleteTarget(mem)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-[#9CA3AF] font-medium">
                  {mem.position || mem.role || 'Member'}
                </div>
                <div className="text-[11px] text-[#6B7280]">
                  {mem.department} {mem.year ? `• ${mem.year}` : ''}
                </div>

                {mem.bio && (
                  <p className="text-xs text-[#6B7280] mt-2 line-clamp-2 italic">
                    "{mem.bio}"
                  </p>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#1A1C23] flex items-center justify-between text-xs text-[#6B7280]">
                <span className="text-[10px]">Order: #{mem.order ?? mem.order_index ?? 0}</span>
                <div className="flex items-center gap-2">
                  {(mem.linkedin || mem.social_links?.linkedin) && (
                    <a
                      href={mem.linkedin || mem.social_links?.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {(mem.github || mem.social_links?.github) && (
                    <a
                      href={mem.github || mem.social_links?.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white"
                    >
                      <Github className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {(mem.email || mem.social_links?.email) && (
                    <a
                      href={(mem.email || mem.social_links?.email || '').startsWith('mailto:') ? (mem.email || mem.social_links?.email) : `mailto:${mem.email || mem.social_links?.email}`}
                      className="hover:text-white"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Member Modal */}
      {isModalOpen && editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0D1017] border border-[#1A1C23] rounded-2xl p-6 shadow-2xl my-8 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1A1C23]">
              <h3 className="text-base font-bold text-white">
                {editingMember.id ? 'Edit Team Member' : 'Add Team Member'}
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
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingMember.name || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Kumar or Jane Doe"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Designation / Role *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMember.role || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                    placeholder="e.g. Club President, AI Research Lead"
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Category *
                  </label>
                  <select
                    value={editingMember.category || 'Technical Team'}
                    onChange={(e) => setEditingMember({ ...editingMember, category: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-indigo-400"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editingMember.department || 'CSE (AIML) & AI'}
                    onChange={(e) => setEditingMember({ ...editingMember, department: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Year / Academic Level
                  </label>
                  <input
                    type="text"
                    value={editingMember.year || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, year: e.target.value })}
                    placeholder="e.g. 3rd Year / Faculty"
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <ImageUploader
                  value={editingMember.image_url || ''}
                  onChange={(url) => setEditingMember({ ...editingMember, image_url: url })}
                  category="team"
                  label="Avatar / Profile Image"
                  aspectRatio="square"
                  helpText="Supported formats: JPG, PNG, WEBP (Max 50 MB)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Short Bio / Specialization
                </label>
                <textarea
                  rows={3}
                  value={editingMember.bio || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, bio: e.target.value })}
                  placeholder="Areas of expertise, vision for the club..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={editingMember.social_links?.linkedin || ''}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        social_links: { ...editingMember.social_links, linkedin: e.target.value },
                      })
                    }
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    GitHub URL
                  </label>
                  <input
                    type="url"
                    value={editingMember.social_links?.github || ''}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        social_links: { ...editingMember.social_links, github: e.target.value },
                      })
                    }
                    placeholder="https://github.com/..."
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
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
                  className="px-5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingMember.id ? 'Update Member' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Team Member"
        itemType="Team Member"
        itemName={deleteTarget?.name || ''}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
