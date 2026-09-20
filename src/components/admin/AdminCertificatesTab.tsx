import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Search,
  Trash2,
  Edit2,
  Printer,
  Copy,
  Check,
  Download,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Certificate, CertificateType, Event } from '../../types';

interface AdminCertificatesTabProps {
  onRefreshData?: () => void;
}

export function AdminCertificatesTab({ onRefreshData }: AdminCertificatesTabProps) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [singleForm, setSingleForm] = useState({
    student_name: '',
    student_roll_no: '',
    student_email: '',
    department: 'CSE (AIML)',
    college_name: 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
    event_id: '',
    event_title: '',
    certificate_type: 'Participation' as CertificateType,
    issue_date: new Date().toISOString().slice(0, 10),
    issued_by: 'Department of CSE (AIML) & AI',
    designation: 'Faculty Coordinator & President',
    notes: 'Awarded for active participation and project demonstration.',
  });

  const [batchForm, setBatchForm] = useState({
    event_id: '',
    event_title: '',
    certificate_type: 'Participation' as CertificateType,
    issue_date: new Date().toISOString().slice(0, 10),
    issued_by: 'Department of CSE (AIML) & AI',
    designation: 'Faculty Coordinator & President',
    studentData: '', // CSV or multi-line text
  });

  const [formLoading, setFormLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [certsData, eventsData] = await Promise.all([
        api.adminGetCertificates(),
        api.getEvents(),
      ]);
      setCertificates(certsData);
      setEvents(eventsData);
    } catch (err: any) {
      console.error('Failed to load certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setActionMessage(null);
    try {
      if (editingCert) {
        await api.adminUpdateCertificate(editingCert.id, singleForm);
        setActionMessage({ type: 'success', text: 'Certificate updated successfully!' });
      } else {
        await api.adminCreateCertificate(singleForm);
        setActionMessage({ type: 'success', text: 'Certificate issued successfully!' });
      }
      setIsCreateModalOpen(false);
      setEditingCert(null);
      loadData();
      onRefreshData?.();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to save certificate' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setActionMessage(null);
    try {
      const lines = batchForm.studentData.trim().split('\n');
      const students: Array<{ student_name: string; student_roll_no: string; student_email: string; department?: string }> = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(/[,\t|]/).map((p) => p.trim());
        if (parts.length >= 2) {
          students.push({
            student_name: parts[0],
            student_roll_no: parts[1],
            student_email: parts[2] || `${parts[1].toLowerCase()}@drkvsrit.ac.in`,
            department: parts[3] || 'CSE (AIML)',
          });
        }
      }

      if (students.length === 0) {
        throw new Error('Please enter at least one student in the format: Name, Roll Number, Email, Department');
      }

      await api.adminBatchCreateCertificates({
        event_id: batchForm.event_id,
        event_title: batchForm.event_title || 'IntelliGenZ AI Workshop',
        certificate_type: batchForm.certificate_type,
        issue_date: batchForm.issue_date,
        issued_by: batchForm.issued_by,
        designation: batchForm.designation,
        students,
      });

      setActionMessage({ type: 'success', text: `Batch generated ${students.length} certificates successfully!` });
      setIsBatchModalOpen(false);
      loadData();
      onRefreshData?.();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Batch generation failed' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.adminDeleteCertificate(id);
      setDeleteConfirmId(null);
      loadData();
      onRefreshData?.();
    } catch (err) {
      console.error('Failed to delete certificate:', err);
    }
  };

  const exportToCSV = () => {
    const headers = ['Certificate Code', 'Student Name', 'Roll No', 'Email', 'Department', 'Event Title', 'Type', 'Issue Date', 'Issued By', 'Status'];
    const rows = certificates.map((c) => [
      `"${c.certificate_code}"`,
      `"${c.student_name}"`,
      `"${c.student_roll_no}"`,
      `"${c.student_email}"`,
      `"${c.department}"`,
      `"${c.event_title}"`,
      `"${c.certificate_type}"`,
      `"${c.issue_date}"`,
      `"${c.issued_by}"`,
      c.is_valid ? 'Valid' : 'Revoked',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `intelligenz_certificates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCertificates = certificates.filter((c) => {
    const matchesType = selectedType === 'All' || c.certificate_type === selectedType;
    const matchesSearch =
      c.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.student_roll_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certificate_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.event_title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            Certificates & Credential Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Issue, batch generate, verify, and export official certificates for club events and workshops.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportToCSV}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => {
              setBatchForm({
                event_id: events[0]?.id || '',
                event_title: events[0]?.title || '',
                certificate_type: 'Participation',
                issue_date: new Date().toISOString().slice(0, 10),
                issued_by: 'Department of CSE (AIML) & AI',
                designation: 'Faculty Coordinator & President',
                studentData: '',
              });
              setIsBatchModalOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
          >
            <Users className="w-3.5 h-3.5" />
            Batch Generator
          </button>
          <button
            onClick={() => {
              setEditingCert(null);
              setSingleForm({
                student_name: '',
                student_roll_no: '',
                student_email: '',
                department: 'CSE (AIML)',
                college_name: 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
                event_id: events[0]?.id || '',
                event_title: events[0]?.title || '',
                certificate_type: 'Participation',
                issue_date: new Date().toISOString().slice(0, 10),
                issued_by: 'Department of CSE (AIML) & AI',
                designation: 'Faculty Coordinator & President',
                notes: 'Awarded for active participation and technical excellence.',
              });
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            Issue Certificate
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/60 border border-red-500/40 text-red-300'
          }`}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll number, certificate ID, event..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-1.5 pl-8 text-xs text-white placeholder-slate-500 transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Type:</span>
          <select
            value={selectedType || 'All'}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500"
          >
            <option value="All">All Types</option>
            <option value="Participation">Participation</option>
            <option value="Merit">Merit</option>
            <option value="Winner">Winner</option>
            <option value="Runner-up">Runner-up</option>
            <option value="Speaker">Speaker</option>
            <option value="Coordinator">Coordinator</option>
            <option value="Appreciation">Appreciation</option>
          </select>
        </div>
      </div>

      {/* Certificates Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-mono">Loading certificates registry...</div>
      ) : filteredCertificates.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800 text-xs">
          No certificates found. Click "Issue Certificate" or "Batch Generator" to create new certificates.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Certificate ID</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Event Title</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCertificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-amber-400/90 whitespace-nowrap">
                    {cert.certificate_code}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-white">{cert.student_name}</p>
                    <p className="text-[11px] font-mono text-slate-400">{cert.student_roll_no} • {cert.department}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-200 max-w-[200px] truncate" title={cert.event_title}>
                    {cert.event_title}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {cert.certificate_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {cert.issue_date}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {cert.is_valid ? (
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        Revoked
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                    <button
                      onClick={() => setPreviewCert(cert)}
                      title="Preview / Print"
                      className="p-1.5 rounded hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/certificates?code=${encodeURIComponent(cert.certificate_code)}`;
                        navigator.clipboard.writeText(url);
                        setCopiedId(cert.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      title="Copy Public Verification Link"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {copiedId === cert.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingCert(cert);
                        setSingleForm({
                          student_name: cert.student_name || '',
                          student_roll_no: cert.student_roll_no || '',
                          student_email: cert.student_email || '',
                          department: cert.department || '',
                          college_name: cert.college_name || '',
                          event_id: cert.event_id || '',
                          event_title: cert.event_title || '',
                          certificate_type: cert.certificate_type || 'Participation',
                          issue_date: cert.issue_date || '',
                          issued_by: cert.issued_by || '',
                          designation: cert.designation || '',
                          notes: cert.notes || '',
                        });
                        setIsCreateModalOpen(true);
                      }}
                      title="Edit"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(cert.id)}
                      title="Revoke & Delete"
                      className="p-1.5 rounded hover:bg-red-950/60 text-red-400 hover:text-red-300 transition-colors"
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

      {/* Single Certificate Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-400" />
              {editingCert ? 'Edit Certificate' : 'Issue Official Certificate'}
            </h3>

            <form onSubmit={handleCreateSingle} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={singleForm.student_name || ''}
                  onChange={(e) => setSingleForm({ ...singleForm, student_name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={singleForm.student_roll_no || ''}
                    onChange={(e) => setSingleForm({ ...singleForm, student_roll_no: e.target.value })}
                    placeholder="e.g. 22K61A4201"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={singleForm.department || ''}
                    onChange={(e) => setSingleForm({ ...singleForm, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Student Email</label>
                <input
                  type="email"
                  value={singleForm.student_email || ''}
                  onChange={(e) => setSingleForm({ ...singleForm, student_email: e.target.value })}
                  placeholder="student@drkvsrit.ac.in"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={singleForm.event_title || ''}
                  onChange={(e) => setSingleForm({ ...singleForm, event_title: e.target.value })}
                  placeholder="e.g. NeuroHack 2026: 24-Hour AI Hackathon"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Certificate Type</label>
                  <select
                    value={singleForm.certificate_type || 'Participation'}
                    onChange={(e) => setSingleForm({ ...singleForm, certificate_type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500"
                  >
                    <option value="Participation">Participation</option>
                    <option value="Merit">Merit</option>
                    <option value="Winner">Winner</option>
                    <option value="Runner-up">Runner-up</option>
                    <option value="Speaker">Speaker</option>
                    <option value="Coordinator">Coordinator</option>
                    <option value="Appreciation">Appreciation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={singleForm.issue_date || ''}
                    onChange={(e) => setSingleForm({ ...singleForm, issue_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Issued By</label>
                  <input
                    type="text"
                    value={singleForm.issued_by || ''}
                    onChange={(e) => setSingleForm({ ...singleForm, issued_by: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Signer Designation</label>
                  <input
                    type="text"
                    value={singleForm.designation || ''}
                    onChange={(e) => setSingleForm({ ...singleForm, designation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Remarks / Notes</label>
                <textarea
                  rows={2}
                  value={singleForm.notes || ''}
                  onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                >
                  {formLoading ? 'Saving...' : editingCert ? 'Update Certificate' : 'Issue Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Generator Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Batch Certificate Generator
            </h3>
            <p className="text-xs text-slate-400">
              Generate hundreds of unique verifiable certificates in one click by pasting or importing student list.
            </p>

            <form onSubmit={handleBatchGenerate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Select Event / Workshop</label>
                  <input
                    type="text"
                    required
                    value={batchForm.event_title || ''}
                    onChange={(e) => setBatchForm({ ...batchForm, event_title: e.target.value })}
                    placeholder="e.g. NeuroHack 2026 AI Hackathon"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Certificate Type</label>
                  <select
                    value={batchForm.certificate_type || 'Participation'}
                    onChange={(e) => setBatchForm({ ...batchForm, certificate_type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500"
                  >
                    <option value="Participation">Participation</option>
                    <option value="Merit">Merit</option>
                    <option value="Winner">Winner</option>
                    <option value="Runner-up">Runner-up</option>
                    <option value="Speaker">Speaker</option>
                    <option value="Coordinator">Coordinator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Paste Students (Format: Name, Roll Number, Email, Department) - One per line
                </label>
                <textarea
                  rows={8}
                  required
                  value={batchForm.studentData || ''}
                  onChange={(e) => setBatchForm({ ...batchForm, studentData: e.target.value })}
                  placeholder={`Rahul Sharma, 22K61A4201, rahul@drkvsrit.ac.in, CSE (AIML)\nPriya Reddy, 22K61A4202, priya@drkvsrit.ac.in, AI\nKavitha S, 22K61A4203, kavitha@drkvsrit.ac.in, CSE (AIML)`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-indigo-500 font-mono leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !batchForm.studentData.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                >
                  {formLoading ? 'Generating...' : 'Batch Generate Certificates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview / Print Certificate Modal */}
      {previewCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-3xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                Certificate Preview: {previewCert.certificate_code}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / PDF
                </button>
                <button
                  onClick={() => setPreviewCert(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Certificate Frame */}
            <div className="rounded-xl bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-amber-500/40 p-8 text-center space-y-5 relative">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY
              </div>
              <div className="text-xs font-medium text-slate-400">
                Department of CSE (AIML) & Artificial Intelligence
              </div>
              <div className="text-2xl font-black tracking-widest text-amber-300 font-mono">
                INTELLIGENZ CLUB
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Certificate of {previewCert.certificate_type}
              </div>

              <div className="py-4 border-y border-slate-800 space-y-2">
                <p className="text-xs text-slate-400 italic">This is proudly presented to</p>
                <h2 className="text-3xl font-bold text-white font-serif">{previewCert.student_name}</h2>
                <p className="text-xs font-mono text-cyan-400">
                  Roll No: <span className="font-bold text-white">{previewCert.student_roll_no}</span> • {previewCert.department}
                </p>
                <p className="text-sm text-slate-300 max-w-xl mx-auto mt-2 leading-relaxed">
                  for participation and excellence demonstrated in <span className="font-semibold text-cyan-300">"{previewCert.event_title}"</span>.
                </p>
              </div>

              <div className="grid grid-cols-2 text-left pt-2 text-xs">
                <div>
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Certificate Code</p>
                  <p className="font-mono font-bold text-amber-300">{previewCert.certificate_code}</p>
                  <p className="text-[10px] text-slate-500">Issued: {previewCert.issue_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Signed Authority</p>
                  <p className="font-bold text-white">{previewCert.issued_by}</p>
                  <p className="text-[10px] text-slate-400">{previewCert.designation}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Revoke & Delete Certificate?</h3>
            <p className="text-xs text-slate-400">
              This action will permanently invalidate this certificate from public online verification.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white"
              >
                Revoke Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
