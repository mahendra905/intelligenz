import React, { useState } from 'react';
import {
  Mail,
  Search,
  CheckCircle2,
  Trash2,
  Calendar,
  Phone,
  MessageSquare,
  Eye,
  X,
  MailOpen,
} from 'lucide-react';
import { ContactMessage } from '../../types';
import { DeleteConfirmModal } from '../DeleteConfirmModal';

interface AdminMessagesTabProps {
  messages: ContactMessage[];
  onUpdateStatus: (id: string, is_read: boolean, is_responded?: boolean) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
}

export const AdminMessagesTab: React.FC<AdminMessagesTabProps> = ({
  messages,
  onUpdateStatus,
  onDeleteMessage,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Selected Detail Modal
  const [viewingMsg, setViewingMsg] = useState<ContactMessage | null>(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = messages.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase()) ||
      m.message.toLowerCase().includes(search.toLowerCase());
    const matchesRead =
      filter === 'all' ? true : filter === 'unread' ? !m.is_read : m.is_read;
    return matchesSearch && matchesRead;
  });

  const handleOpenMsg = async (msg: ContactMessage) => {
    setViewingMsg(msg);
    if (!msg.is_read) {
      await onUpdateStatus(msg.id, true, msg.is_responded);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteMessage(deleteTarget.id);
      if (viewingMsg?.id === deleteTarget.id) {
        setViewingMsg(null);
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
            <Mail className="w-5 h-5 text-rose-400" />
            Contact Inquiries &amp; Messages ({messages.length})
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Incoming inquiries from prospective students, industry speakers, and academic partners
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by sender name, email, subject, or message content..."
            value={search || ''}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-rose-400"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-[#0A0B0E] text-[#9CA3AF] border border-[#1A1C23]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'unread'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-[#0A0B0E] text-[#9CA3AF] border border-[#1A1C23]'
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'read'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-[#0A0B0E] text-[#9CA3AF] border border-[#1A1C23]'
            }`}
          >
            Read
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-[#0D1017] border border-[#1A1C23] rounded-2xl text-[#6B7280] text-xs">
            No contact messages found.
          </div>
        ) : (
          filtered.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                !msg.is_read
                  ? 'bg-[#121622] border-rose-500/30'
                  : 'bg-[#0D1017] border-[#1A1C23] hover:border-[#2A2E3D]'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {!msg.is_read ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      Unread
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-500/10 text-gray-400">
                      Read
                    </span>
                  )}
                  {msg.is_responded && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Responded
                    </span>
                  )}
                  <span className="text-[11px] text-[#6B7280]">
                    {new Date(msg.created_at).toLocaleDateString()} at{' '}
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white tracking-tight">
                  {msg.subject || 'General Inquiry'}{' '}
                  <span className="text-xs font-normal text-[#9CA3AF]">
                    — from {msg.name} ({msg.email})
                  </span>
                </h3>

                <p className="text-xs text-[#9CA3AF] line-clamp-1 mt-0.5">
                  {msg.message}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  id={`view-msg-${msg.id}`}
                  onClick={() => handleOpenMsg(msg)}
                  className="px-3 py-1.5 rounded-lg bg-[#1A1C23] hover:bg-[#252833] text-white text-xs font-semibold transition-colors border border-[#2A2E3D] flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-rose-400" />
                  <span>Read Message</span>
                </button>

                <button
                  id={`delete-msg-${msg.id}`}
                  onClick={() => setDeleteTarget(msg)}
                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message View Modal */}
      {viewingMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-[#0D1017] border border-[#1A1C23] rounded-2xl p-6 shadow-2xl my-8 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1A1C23]">
              <div>
                <h3 className="text-base font-bold text-white">
                  {viewingMsg.subject || 'Inquiry Details'}
                </h3>
                <p className="text-xs text-[#9CA3AF]">
                  From {viewingMsg.name} • {new Date(viewingMsg.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setViewingMsg(null)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1A1C23]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#0A0B0E] border border-[#1A1C23]">
                <div>
                  <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Email Address</span>
                  <a href={`mailto:${viewingMsg.email}`} className="text-[#00E5FF] hover:underline font-medium">
                    {viewingMsg.email}
                  </a>
                </div>
                {viewingMsg.phone && (
                  <div>
                    <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Phone</span>
                    <a href={`tel:${viewingMsg.phone}`} className="text-white hover:underline">
                      {viewingMsg.phone}
                    </a>
                  </div>
                )}
              </div>

              <div>
                <span className="text-[#9CA3AF] font-bold block mb-1">Message Content:</span>
                <div className="p-4 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-[#D1D5DB] leading-relaxed whitespace-pre-wrap text-xs">
                  {viewingMsg.message}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#1A1C23]">
                <button
                  onClick={() => {
                    const newResponded = !viewingMsg.is_responded;
                    onUpdateStatus(viewingMsg.id, true, newResponded);
                    setViewingMsg({ ...viewingMsg, is_responded: newResponded });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    viewingMsg.is_responded
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-[#1A1C23] text-[#D1D5DB] border-[#2A2E3D] hover:text-white'
                  }`}
                >
                  {viewingMsg.is_responded ? '✓ Responded' : 'Mark as Responded'}
                </button>

                <a
                  href={`mailto:${viewingMsg.email}?subject=Re: ${encodeURIComponent(viewingMsg.subject || 'IntelliGenZ Inquiry')}`}
                  className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Reply via Email</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Message"
        itemType="Message"
        itemName={deleteTarget?.subject || deleteTarget?.name || ''}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
