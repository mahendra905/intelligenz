import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Users,
  CheckCircle2,
  Trash2,
  Search,
  Download,
  AlertCircle,
  Clock,
  Sparkles,
  Inbox,
  History,
  FileText,
} from 'lucide-react';
import { api } from '../../lib/api';
import { NewsletterSubscriber, NewsletterBroadcast } from '../../types';

interface AdminNewsletterTabProps {
  onRefreshData?: () => void;
}

export function AdminNewsletterTab({ onRefreshData }: AdminNewsletterTabProps) {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [broadcasts, setBroadcasts] = useState<NewsletterBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'subscribers' | 'broadcasts'>('subscribers');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Broadcast modal
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    subject: '',
    message: '',
    target: 'All Subscribers',
  });
  const [sending, setSending] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsData, broadcastsData] = await Promise.all([
        api.adminGetNewsletterSubscribers(),
        api.adminGetNewsletterBroadcasts(),
      ]);
      setSubscribers(subsData);
      setBroadcasts(broadcastsData);
    } catch (err) {
      console.error('Failed to load newsletter data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setActionNotice(null);

    try {
      const result = await api.adminSendNewsletterBroadcast(broadcastForm);
      setActionNotice({ type: 'success', text: result.message });
      setIsBroadcastModalOpen(false);
      setBroadcastForm({ subject: '', message: '', target: 'All Subscribers' });
      loadData();
      onRefreshData?.();
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Failed to dispatch broadcast.' });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteSubscriber = async (id: string) => {
    try {
      await api.adminDeleteNewsletterSubscriber(id);
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
      onRefreshData?.();
    } catch (err) {
      console.error('Failed to delete subscriber:', err);
    }
  };

  const exportSubscribersCSV = () => {
    const headers = ['Email', 'Name', 'Department', 'Subscribed At', 'Status', 'Source'];
    const rows = subscribers.map((s) => [
      `"${s.email}"`,
      `"${s.name || ''}"`,
      `"${s.department || ''}"`,
      `"${s.subscribed_at}"`,
      `"${s.status}"`,
      `"${s.source || 'Website'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `intelligenz_subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeCount = subscribers.filter((s) => s.status === 'Active').length;

  const filteredSubscribers = subscribers.filter((s) => {
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchesSearch =
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-cyan-400" />
            Newsletter & Bulletin Dispatcher
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage subscriber lists, automated email digests, and broadcast official club circulars.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportSubscribersCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            New Broadcast
          </button>
        </div>
      </div>

      {actionNotice && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/60 border border-red-500/40 text-red-300'
          }`}
        >
          {actionNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Total Subscribers</p>
            <h3 className="text-2xl font-black text-white mt-1 font-mono">{subscribers.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Active Audience</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1 font-mono">{activeCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Broadcasts Sent</p>
            <h3 className="text-2xl font-black text-indigo-400 mt-1 font-mono">{broadcasts.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Send className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-tabs switch */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('subscribers')}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeSubTab === 'subscribers'
              ? 'bg-cyan-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Subscriber Roster ({subscribers.length})
        </button>
        <button
          onClick={() => setActiveSubTab('broadcasts')}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeSubTab === 'broadcasts'
              ? 'bg-cyan-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Broadcast History ({broadcasts.length})
        </button>
      </div>

      {/* Tab: Subscribers */}
      {activeSubTab === 'subscribers' && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email, student name, department..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 pl-8 text-xs text-white placeholder-slate-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={statusFilter || 'All'}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Unsubscribed">Unsubscribed</option>
              </select>
            </div>
          </div>

          {filteredSubscribers.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-400">
              No subscribers match your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Name / Student</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Subscribed At</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {filteredSubscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{sub.email}</td>
                      <td className="py-3 px-4 font-sans text-slate-200">{sub.name || '—'}</td>
                      <td className="py-3 px-4 font-sans text-slate-400">{sub.department || 'CSE (AIML)'}</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(sub.subscribed_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            sub.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteSubscriber(sub.id)}
                          title="Remove Subscriber"
                          className="p-1 rounded hover:bg-red-950/60 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Broadcasts History */}
      {activeSubTab === 'broadcasts' && (
        <div className="space-y-4">
          {broadcasts.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-400">
              No broadcasts sent yet. Click "New Broadcast" to dispatch an email circular.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {broadcasts.map((bc) => (
                <div
                  key={bc.id}
                  className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                      Target: {bc.target}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(bc.sent_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{bc.subject}</h4>
                    <p className="text-xs text-slate-400 mt-1 whitespace-pre-line leading-relaxed line-clamp-3">
                      {bc.message}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Delivered to {bc.recipient_count} subscribers</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Broadcast Modal */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-cyan-400" />
              Dispatch Newsletter Broadcast
            </h3>
            <p className="text-xs text-slate-400">
              Send an instant bulletin, hackathon announcement, or workshop alert to all {activeCount} active subscribers.
            </p>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Audience</label>
                <select
                  value={broadcastForm.target || 'All Subscribers'}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, target: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500"
                >
                  <option value="All Subscribers">All Active Subscribers ({activeCount})</option>
                  <option value="CSE (AIML) & AI Students">CSE (AIML) & AI Students Only</option>
                  <option value="Hackathon Participants">NeuroHack 2026 Participants</option>
                  <option value="Core Club Members">Core Club Members</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Broadcast Subject *</label>
                <input
                  type="text"
                  required
                  value={broadcastForm.subject || ''}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, subject: e.target.value })}
                  placeholder="e.g. 🚨 NeuroHack 2026 Hackathon Schedule & Track Briefing Released!"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Bulletin Content / Message *</label>
                <textarea
                  rows={6}
                  required
                  value={broadcastForm.message || ''}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  placeholder={`Greetings IntelliGenZ Innovators,\n\nWe are thrilled to announce the official schedule for our upcoming 24-hour hackathon...\n\nKey Highlights:\n- Team registrations close on Sept 20\n- Total Prize Pool: ₹50,000\n- Special Keynote by Google Developer Expert`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-cyan-500 leading-relaxed font-sans"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !broadcastForm.subject.trim() || !broadcastForm.message.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? 'Dispatching...' : `Send to ${activeCount} Subscribers`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
