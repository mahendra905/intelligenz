import React, { useState } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Trash2,
  Calendar,
  Mail,
  Phone,
  Building,
  GraduationCap,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { EventRegistration, Event } from '../../types';
import { DeleteConfirmModal } from '../DeleteConfirmModal';

interface AdminRegistrationsTabProps {
  registrations: EventRegistration[];
  events: Event[];
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onDeleteRegistration: (id: string) => Promise<void>;
}

export const AdminRegistrationsTab: React.FC<AdminRegistrationsTabProps> = ({
  registrations,
  events,
  onUpdateStatus,
  onDeleteRegistration,
}) => {
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected Detail Modal
  const [viewingReg, setViewingReg] = useState<EventRegistration | null>(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<EventRegistration | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = registrations.filter((r) => {
    const studentName = r.full_name || r.participant_name || '';
    const studentEmail = r.email || '';
    const studentRoll = r.roll_number || '';
    const studentDept = r.department || '';

    const matchesSearch =
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      studentRoll.toLowerCase().includes(search.toLowerCase()) ||
      studentEmail.toLowerCase().includes(search.toLowerCase()) ||
      studentDept.toLowerCase().includes(search.toLowerCase());
    const matchesEvent = eventFilter === 'All' || r.event_id === eventFilter;
    const matchesStatus = statusFilter === 'All' || (r.status || 'Confirmed') === statusFilter;
    return matchesSearch && matchesEvent && matchesStatus;
  });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteRegistration(deleteTarget.id);
      if (viewingReg?.id === deleteTarget.id) {
        setViewingReg(null);
      }
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Event Title', 'Participant Name', 'Roll Number', 'Email', 'Phone', 'College', 'Department', 'Year', 'Status', 'Registered At'];
    const rows = filtered.map((r) => [
      `"${r.event_title || ''}"`,
      `"${r.full_name || r.participant_name || 'Participant'}"`,
      `"${r.roll_number || ''}"`,
      `"${r.email || ''}"`,
      `"${r.phone || ''}"`,
      `"${r.college || 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY'}"`,
      `"${r.department || ''}"`,
      `"${r.year || ''}"`,
      `"${r.status || 'Confirmed'}"`,
      `"${new Date(r.created_at || r.registered_at || Date.now()).toLocaleString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `intelligenz_registrations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Event Workshop Registrations ({registrations.length})
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Track student RSVP rosters, verify attendance status, and export participant roll lists
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          className="px-4 py-2.5 rounded-lg bg-[#1A1C23] hover:bg-[#252833] text-purple-300 font-bold text-xs uppercase tracking-wider transition-all border border-purple-500/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4 text-purple-400" />
          <span>Export CSV / Attendance</span>
        </button>
      </div>

      {/* Filter */}
      <div className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by participant name, roll number, email, or college..."
            value={search || ''}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-purple-400"
          />
        </div>

        <select
          value={eventFilter || 'All'}
          onChange={(e) => setEventFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-purple-400"
        >
          <option value="All">All Events / Workshops</option>
          {events.map((evt) => (
            <option key={evt.id} value={evt.id}>
              {evt.title}
            </option>
          ))}
        </select>
      </div>

      {/* Table List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-[#0D1017] border border-[#1A1C23] rounded-2xl text-[#6B7280] text-xs">
            No registrations found.
          </div>
        ) : (
          filtered.map((reg) => (
            <div
              key={reg.id}
              className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] hover:border-[#2A2E3D] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {reg.event_title || 'Workshop'}
                  </span>
                  <span className="text-[11px] text-[#6B7280]">
                    {reg.department} • {reg.year}
                  </span>
                  <span className="text-[11px] text-[#4B5563]">
                    {reg.college || 'DR. KVSRIT'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white tracking-tight">
                  {reg.full_name || reg.participant_name || 'Participant'}{' '}
                  <span className="text-xs font-normal text-[#9CA3AF]">
                    ({reg.roll_number})
                  </span>
                </h3>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6B7280] mt-1">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {reg.email}
                  </span>
                  {reg.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {reg.phone}
                    </span>
                  )}
                  <span>
                    RSVP Date: {new Date(reg.created_at || reg.registered_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                <select
                  value={reg.status || 'Confirmed'}
                  onChange={(e) => onUpdateStatus(reg.id, e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Waitlisted">Waitlisted</option>
                  <option value="Attended">Attended</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <button
                  id={`delete-reg-${reg.id}`}
                  onClick={() => setDeleteTarget(reg)}
                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Registration Record"
        itemType="Registration"
        itemName={deleteTarget?.full_name || deleteTarget?.participant_name || 'Registration'}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
