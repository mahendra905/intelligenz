import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Code2,
  Search,
  ExternalLink,
  Github,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Project, ProjectCategory } from '../../types';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { ImageUploader } from './ImageUploader';

interface AdminProjectsTabProps {
  projects: Project[];
  onSaveProject: (data: Partial<Project>) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}

export const AdminProjectsTab: React.FC<AdminProjectsTabProps> = ({
  projects,
  onSaveProject,
  onDeleteProject,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);
  const [techInput, setTechInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const categories: ProjectCategory[] = [
    'Computer Vision',
    'NLP & LLMs',
    'Generative AI',
    'Autonomous Systems',
    'Healthcare AI',
    'Full-Stack AI',
  ];

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleOpenCreate = () => {
    setEditingProject({
      name: '',
      category: 'Computer Vision',
      status: 'Active Development',
      description: '',
      technologies: ['Python', 'PyTorch', 'FastAPI'],
      image_url: '',
      github_url: 'https://github.com/intelligenz-club',
      demo_url: '',
      featured: false,
      team_members: ['AI Research Lab, CSE (AIML)'],
    });
    setTechInput('Python, PyTorch, FastAPI');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (proj: Project) => {
    setEditingProject({ ...proj });
    setTechInput(Array.isArray(proj.technologies) ? proj.technologies.join(', ') : '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject?.name) return;
    setSaving(true);
    try {
      const techList = techInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      await onSaveProject({
        ...editingProject,
        technologies: techList,
      });
      setIsModalOpen(false);
      setEditingProject(null);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteProject(deleteTarget.id);
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
            <Code2 className="w-5 h-5 text-cyan-400" />
            AI &amp; Software Projects ({projects.length})
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Showcase student research labs, open-source repositories and AI prototypes
          </p>
        </div>

        <button
          id="admin-create-project-btn"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#00E5FF]/20 flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Project</span>
        </button>
      </div>

      {/* Filter */}
      <div className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects by name, stack or description..."
            value={search || ''}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00E5FF]"
          />
        </div>

        <select
          value={categoryFilter || 'All'}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
        >
          <option value="All">All Disciplines</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-[#0D1017] border border-[#1A1C23] rounded-2xl text-[#6B7280] text-xs">
            No projects found.
          </div>
        ) : (
          filtered.map((proj) => (
            <div
              key={proj.id}
              className="p-5 rounded-2xl bg-[#0D1017] border border-[#1A1C23] hover:border-[#2A2E3D] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                      {proj.category}
                    </span>
                    <span className="ml-2 text-[10px] text-[#6B7280] font-semibold">
                      {proj.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-project-${proj.id}`}
                      onClick={() => handleOpenEdit(proj)}
                      className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#1A1C23]"
                    >
                      <Edit2 className="w-4 h-4 text-cyan-400" />
                    </button>
                    <button
                      id={`delete-project-${proj.id}`}
                      onClick={() => setDeleteTarget(proj)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">
                  {proj.name}
                </h3>
                <p className="text-xs text-[#9CA3AF] mt-1 line-clamp-2">
                  {proj.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {proj.technologies?.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 rounded bg-[#0A0B0E] border border-[#1A1C23] text-[10px] text-[#9CA3AF] font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1A1C23] flex items-center justify-between text-xs text-[#6B7280]">
                <div className="flex items-center gap-3">
                  {proj.github_url && (
                    <a
                      href={proj.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white flex items-center gap-1"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>Code</span>
                    </a>
                  )}
                  {proj.demo_url && (
                    <a
                      href={proj.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#00E5FF] flex items-center gap-1 text-[#00E5FF]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Live Demo</span>
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-[#4B5563]">ID: {proj.id}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Project Modal */}
      {isModalOpen && editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-[#0D1017] border border-[#1A1C23] rounded-2xl p-6 shadow-2xl my-8 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1A1C23]">
              <h3 className="text-base font-bold text-white">
                {editingProject.id ? 'Edit Project' : 'Add New Project'}
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
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingProject.name || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  placeholder="e.g. IntelliSight: Autonomous Crowd Vision System"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Discipline *
                  </label>
                  <select
                    value={editingProject.category || 'Computer Vision'}
                    onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value as any })}
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
                    Development Status
                  </label>
                  <input
                    type="text"
                    value={editingProject.status || 'Active Development'}
                    onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                    placeholder="e.g. Deployed, Production, Beta"
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Technologies (comma separated)
                </label>
                <input
                  type="text"
                  value={techInput || ''}
                  onChange={(e) => setTechInput(e.target.value)}
                  placeholder="e.g. PyTorch, YOLOv9, OpenCV, FastAPI, React"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <ImageUploader
                  value={editingProject.image_url || ''}
                  onChange={(url) => setEditingProject({ ...editingProject, image_url: url })}
                  category="projects"
                  label="Project Screenshot / Architecture Diagram"
                  aspectRatio="banner"
                  helpText="Supported formats: JPG, PNG, WEBP (Max 50 MB)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={editingProject.description || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  placeholder="Architecture overview, machine learning models, and real-world impact..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    GitHub Repository URL
                  </label>
                  <input
                    type="url"
                    value={editingProject.github_url || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, github_url: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                    Live Demo URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={editingProject.demo_url || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, demo_url: e.target.value })}
                    placeholder="https://demo..."
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
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
                  className="px-5 py-2 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingProject.id ? 'Update Project' : 'Add Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Project"
        itemType="Project"
        itemName={deleteTarget?.name || ''}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
