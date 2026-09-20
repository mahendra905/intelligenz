import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Trash2,
  Eye,
  Mail,
  Phone,
  Calendar,
  X,
  MessageSquare,
} from 'lucide-react';
import { JoinApplication } from '../../types';
import { DeleteConfirmModal } from '../DeleteConfirmModal';

interface AdminApplicationsTabProps {
  applications: JoinApplication[];
  onUpdateStatus: (id: string, status: string, notes?: string) => Promise<void>;
  onDeleteApplication: (id: string) => Promise<void>;
  joinUsStatus?: boolean;
  onToggleJoinUs?: () => Promise<void>;
}

export const AdminApplicationsTab: React.FC<AdminApplicationsTabProps> = ({
  applications,
  onUpdateStatus,
  onDeleteApplication,
  joinUsStatus = true,
  onToggleJoinUs,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');

  // Selected Detail Modal
  const [viewingApp, setViewingApp] = useState<JoinApplication | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<JoinApplication | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const statuses = ['Pending', 'Reviewed', 'Accepted', 'Rejected'];

  const filtered = applications.filter((app) => {
    const studentName = app.full_name || '';
    const studentRoll = app.roll_number || '';
    const studentEmail = app.email || app.college_email || '';
    const studentDept = app.department || '';

    const matchesSearch =
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      studentRoll.toLowerCase().includes(search.toLowerCase()) ||
      studentEmail.toLowerCase().includes(search.toLowerCase()) ||
      studentDept.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    const domainList = app.interested_domains || app.technical_interests || [];
    const matchesTeam = teamFilter === 'All' || domainList.includes(teamFilter) || (app as any).primary_interest === teamFilter;
    return matchesSearch && matchesStatus && matchesTeam;
  });

  const handleOpenDetail = (app: JoinApplication) => {
    setViewingApp(app);
    setReviewerNotes(app.reviewer_notes || '');
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!viewingApp) return;
    setUpdating(true);
    try {
      await onUpdateStatus(viewingApp.id, newStatus, reviewerNotes);
      setViewingApp({ ...viewingApp, status: newStatus as any, reviewer_notes: reviewerNotes });
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteApplication(deleteTarget.id);
      if (viewingApp?.id === deleteTarget.id) {
        setViewingApp(null);
      }
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
            <FileText className="w-5 h-5 text-emerald-400" />
            Club Recruitment Applications ({applications.length})
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Review student candidates, check portfolio links, and manage interview approvals
          </p>
        </div>

        {onToggleJoinUs && (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#0D1017] border border-[#1A1C23]">
            <span className="text-xs font-semibold text-white pl-1">Join Us Status:</span>
            <button
              type="button"
              id="admin-app-tab-join-us-toggle"
              onClick={onToggleJoinUs}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black tracking-wider uppercase transition-all duration-200 border cursor-pointer flex items-center gap-1.5 ${
                joinUsStatus
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-[#0A0B0E] border-emerald-400 shadow-sm shadow-emerald-500/20'
                  : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-600/20'
              }`}
            >
              <span>[ {joinUsStatus ? 'ON' : 'OFF'} ]</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, roll number, email, or branch..."
            value={search || ''}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-emerald-400"
          />
        </div>

        <select
          value={statusFilter || 'All'}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-emerald-400"
        >
          <option value="All">All Application Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-[#0D1017] border border-[#1A1C23] rounded-2xl text-[#6B7280] text-xs">
            No recruitment applications found.
          </div>
        ) : (
          filtered.map((app) => (
            <div
              key={app.id}
              className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] hover:border-[#2A2E3D] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      app.status === 'Accepted'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : app.status === 'Rejected'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : app.status === 'Reviewed'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {app.status}
                  </span>

                  {(app.interested_domains?.length || app.technical_interests?.length) ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1A1C23] text-[#D1D5DB]">
                      {(app.interested_domains || app.technical_interests || []).slice(0, 2).join(', ')}
                    </span>
                  ) : (app as any).primary_interest ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1A1C23] text-[#D1D5DB]">
                      {(app as any).primary_interest}
                    </span>
                  ) : null}

                  <span className="text-[11px] text-[#6B7280]">
                    {app.department} • {app.year}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white tracking-tight">
                  {app.full_name}{' '}
                  <span className="text-xs font-normal text-[#9CA3AF]">
                    ({app.roll_number})
                  </span>
                </h3>

                {app.skills && (
                  <p className="text-xs text-[#9CA3AF] line-clamp-1 mt-0.5">
                    <span className="text-[#6B7280]">Skills:</span> {app.skills}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-[#6B7280] mt-1">
                  <span>{app.email || app.college_email}</span>
                  {app.phone && (
                    <>
                      <span>•</span>
                      <span>{app.phone}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>Applied: {new Date(app.created_at || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                <button
                  id={`view-app-${app.id}`}
                  onClick={() => handleOpenDetail(app)}
                  className="px-3 py-1.5 rounded-lg bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] text-xs font-semibold transition-colors border border-[#00E5FF]/20 flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Review Application</span>
                </button>

                <button
                  id={`delete-app-${app.id}`}
                  onClick={() => setDeleteTarget(app)}
                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Application Details Modal */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0D1017] border border-[#1A1C23] rounded-2xl p-6 shadow-2xl my-8 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1A1C23]">
              <div>
                <h3 className="text-base font-bold text-white">
                  Applicant Dossier: {viewingApp.full_name}
                </h3>
                <p className="text-xs text-[#9CA3AF]">
                  Roll No: {viewingApp.roll_number} • {viewingApp.department} ({viewingApp.year})
                </p>
              </div>
              <button
                onClick={() => setViewingApp(null)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1A1C23]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Contact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#0A0B0E] border border-[#1A1C23]">
                <div>
                  <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Email</span>
                  <a href={`mailto:${viewingApp.email || viewingApp.college_email}`} className="text-[#00E5FF] hover:underline">
                    {viewingApp.email || viewingApp.college_email}
                  </a>
                </div>
                <div>
                  <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Phone Number</span>
                  <a href={`tel:${viewingApp.phone}`} className="text-white hover:underline">
                    {viewingApp.phone || 'N/A'}
                  </a>
                </div>
                <div>
                  <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Domain Interests</span>
                  <span className="text-amber-400 font-semibold">
                    {(viewingApp.interested_domains || viewingApp.technical_interests || []).join(', ') || (viewingApp as any).primary_interest || 'General'}
                  </span>
                </div>
                <div>
                  <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Applied Date</span>
                  <span className="text-[#D1D5DB]">{new Date(viewingApp.created_at || Date.now()).toLocaleString()}</span>
                </div>
              </div>

              {/* Skills & Experience */}
              {viewingApp.skills && (
                <div>
                  <span className="text-[#9CA3AF] font-bold block mb-1">Technical Skills &amp; Familiarity:</span>
                  <div className="p-3 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-[#D1D5DB] whitespace-pre-wrap">
                    {viewingApp.skills}
                  </div>
                </div>
              )}

              {/* Motivation */}
              <div>
                <span className="text-[#9CA3AF] font-bold block mb-1">Why do you want to join INTELLIGENZ?</span>
                <div className="p-3 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-[#D1D5DB] whitespace-pre-wrap">
                  {viewingApp.why_join || viewingApp.reason || 'N/A'}
                </div>
              </div>

              {/* Prior Experience */}
              {(viewingApp as any).past_experience && (
                <div>
                  <span className="text-[#9CA3AF] font-bold block mb-1">Past Experience / Projects:</span>
                  <div className="p-3 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-[#D1D5DB] whitespace-pre-wrap">
                    {(viewingApp as any).past_experience}
                  </div>
                </div>
              )}

              {/* External Links */}
              <div className="flex flex-wrap gap-3 pt-1">
                {viewingApp.github_url && (
                  <a
                    href={viewingApp.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#1A1C23] hover:bg-[#252833] text-white text-xs border border-[#2A2E3D] flex items-center gap-1.5"
                  >
                    <span>GitHub Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {viewingApp.linkedin_url && (
                  <a
                    href={viewingApp.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#1A1C23] hover:bg-[#252833] text-[#00E5FF] text-xs border border-[#2A2E3D] flex items-center gap-1.5"
                  >
                    <span>LinkedIn Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Reviewer Notes Section */}
              <div className="pt-3 border-t border-[#1A1C23]">
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Committee Reviewer Notes
                </label>
                <textarea
                  rows={2}
                  value={reviewerNotes || ''}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="e.g. Interview scheduled for Friday at 4 PM in AI Lab..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              {/* Action status buttons */}
              <div className="pt-4 border-t border-[#1A1C23] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B7280]">Current:</span>
                  <span className="text-xs font-bold text-white uppercase">{viewingApp.status}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={updating}
                    onClick={() => handleStatusChange('Accepted')}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs uppercase tracking-wider border border-emerald-500/30 disabled:opacity-50"
                  >
                    Accept Candidate
                  </button>
                  <button
                    disabled={updating}
                    onClick={() => handleStatusChange('Reviewed')}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-[#00E5FF] font-bold text-xs uppercase tracking-wider border border-cyan-500/30 disabled:opacity-50"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    disabled={updating}
                    onClick={() => handleStatusChange('Rejected')}
                    className="px-3.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-xs uppercase tracking-wider border border-red-500/30 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Recruitment Application"
        itemType="Application"
        itemName={deleteTarget?.full_name || ''}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
