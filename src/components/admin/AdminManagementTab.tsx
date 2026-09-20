import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  UserPlus,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Search,
  Lock,
  UserCheck,
  Shield,
  Eye,
  EyeOff,
  X,
  Sparkles,
  RefreshCw,
  Clock,
  UserX,
  Ban,
  Activity,
  Calendar,
} from 'lucide-react';
import { AdminAccount, AdminRole, AdminStatus } from '../../types';
import { api, authStorage } from '../../lib/api';

export const AdminManagementTab: React.FC = () => {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdminStatus>('ALL');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminAccount | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'ADMIN' as AdminRole,
    status: 'ACTIVE' as AdminStatus,
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const [editAdmin, setEditAdmin] = useState<AdminAccount | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    email: '',
    role: 'ADMIN' as AdminRole,
    status: 'ACTIVE' as AdminStatus,
  });

  const [passwordTarget, setPasswordTarget] = useState<AdminAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const currentUser = authStorage.getUser();

  useEffect(() => {
    let isMounted = true;

    const fetchAdmins = async () => {
      if (!isMounted || !authStorage.isAuthenticated()) return;
      setLoading(true);
      try {
        const data = await api.adminGetAdmins();
        if (isMounted) {
          setAdmins(data || []);
        }
      } catch (err: any) {
        if (!isMounted || err?.name === 'AbortError') return;
        setFeedback({ message: err.message || 'Failed to fetch administrator accounts', type: 'error' });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAdmins();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadAdmins = async () => {
    if (!authStorage.isAuthenticated()) return;
    setLoading(true);
    try {
      const data = await api.adminGetAdmins();
      setAdmins(data || []);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setFeedback({ message: err.message || 'Failed to fetch administrator accounts', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  const handleOpenCreate = () => {
    setCreateForm({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    setShowCreatePassword(false);
    setIsCreateModalOpen(true);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let generated = 'IZ@';
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateForm((prev) => ({ ...prev, password: generated }));
    setShowCreatePassword(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.username.trim() || !createForm.email.trim() || !createForm.password) {
      showNotification('Please fill in all required fields.', 'error');
      return;
    }
    if (createForm.password.length < 6) {
      showNotification('Password must be at least 6 characters in length.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.adminCreateAdmin(createForm);
      showNotification(res.message || `Administrator '${createForm.name}' created successfully.`, 'success');
      setIsCreateModalOpen(false);
      loadAdmins();
    } catch (err: any) {
      showNotification(err.message || 'Failed to create administrator.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (admin: AdminAccount) => {
    setEditAdmin(admin);
    setEditForm({
      name: admin.name || '',
      username: admin.username || '',
      email: admin.email || '',
      role: admin.role || 'ADMIN',
      status: admin.status || 'ACTIVE',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAdmin) return;
    setSubmitting(true);
    try {
      const res = await api.adminUpdateAdmin(editAdmin.id, editForm);
      showNotification(res.message || 'Administrator updated successfully.', 'success');
      setIsEditModalOpen(false);
      setEditAdmin(null);
      loadAdmins();
    } catch (err: any) {
      showNotification(err.message || 'Failed to update administrator.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPasswordModal = (admin: AdminAccount) => {
    setPasswordTarget(admin);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTarget) return;
    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showNotification('Password must be at least 6 characters in length.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.adminSetAdminPassword(passwordTarget.id, newPassword);
      showNotification(res.message || `Password for '${passwordTarget.name}' updated successfully.`, 'success');
      setIsPasswordModalOpen(false);
      setPasswordTarget(null);
    } catch (err: any) {
      showNotification(err.message || 'Failed to update administrator password.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatusToggle = async (admin: AdminAccount, newStatus: AdminStatus) => {
    try {
      const res = await api.adminUpdateAdminStatus(admin.id, newStatus);
      showNotification(res.message || `Status set to ${newStatus}.`, 'success');
      loadAdmins();
    } catch (err: any) {
      showNotification(err.message || 'Failed to change administrator status.', 'error');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await api.adminDeleteAdmin(deleteTarget.id);
      showNotification(res.message || `Administrator '${deleteTarget.name}' removed.`, 'success');
      setDeleteTarget(null);
      loadAdmins();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete administrator.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered List
  const filteredAdmins = admins.filter((a) => {
    const query = search.toLowerCase();
    const matchesSearch =
      a.name.toLowerCase().includes(query) ||
      a.username.toLowerCase().includes(query) ||
      a.email.toLowerCase().includes(query);
    const matchesRole = roleFilter === 'ALL' || a.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalSuperAdmins = admins.filter((a) => a.role === 'SUPER_ADMIN').length;
  const totalActive = admins.filter((a) => a.status === 'ACTIVE').length;
  const totalInactive = admins.filter((a) => a.status !== 'ACTIVE').length;

  if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-8 rounded-2xl bg-[#0D1017] border border-red-500/20 text-center max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white font-['Outfit']">Restricted Access</h3>
        <p className="text-xs text-[#9CA3AF] leading-relaxed">
          The Admin Management suite is strictly restricted to Super Administrators. Normal administrators do not have authorization to create or manage other administrator accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight font-['Outfit']">
              Admin Account Management
            </h2>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Super Administrator Control Suite • Create, monitor, and manage permanent administrator credentials
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="refresh-admins-btn"
            onClick={loadAdmins}
            disabled={loading}
            className="p-2 rounded-xl bg-[#0D1017] hover:bg-[#1A1C23] text-[#9CA3AF] hover:text-white border border-[#1A1C23] transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00E5FF]' : ''}`} />
          </button>
          <button
            id="create-admin-modal-btn"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#00E5FF]/20 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Admin</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-white/10 rounded text-inherit transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#0D1017] border border-[#1A1C23] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF] shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{admins.length}</div>
            <div className="text-[11px] text-[#6B7280] font-medium">Total Administrators</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0D1017] border border-[#1A1C23] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{totalSuperAdmins}</div>
            <div className="text-[11px] text-[#6B7280] font-medium">Super Admins</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0D1017] border border-[#1A1C23] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{totalActive}</div>
            <div className="text-[11px] text-[#6B7280] font-medium">Active Accounts</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0D1017] border border-[#1A1C23] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{totalInactive}</div>
            <div className="text-[11px] text-[#6B7280] font-medium">Inactive / Revoked</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl bg-[#0D1017] border border-[#1A1C23] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search || ''}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00E5FF]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter || 'ALL'}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-[#D1D5DB] focus:outline-none focus:border-[#00E5FF] cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admins</option>
            <option value="ADMIN">Admins</option>
            <option value="EDITOR">Editors</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter || 'ALL'}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-[#D1D5DB] focus:outline-none focus:border-[#00E5FF] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      {/* Admin List Table / Cards */}
      <div className="rounded-2xl bg-[#0D1017] border border-[#1A1C23] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#6B7280] text-xs flex flex-col items-center gap-3">
            <span className="w-6 h-6 border-2 border-[#00E5FF]/30 border-t-[#00E5FF] rounded-full animate-spin" />
            <span>Loading administrator accounts...</span>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center text-[#6B7280] text-xs space-y-2">
            <UserX className="w-8 h-8 text-[#4B5563] mx-auto" />
            <p className="font-semibold text-white">No administrators found</p>
            <p className="text-[#9CA3AF]">Try adjusting your search criteria or create a new administrator account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#D1D5DB]">
              <thead className="bg-[#0A0B0E] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider border-b border-[#1A1C23]">
                <tr>
                  <th className="py-3.5 px-4">Administrator</th>
                  <th className="py-3.5 px-4">Login Identifier</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created / Activity</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1C23]">
                {filteredAdmins.map((admin) => {
                  const isCurrent = currentUser?.id === admin.id;
                  const isSuper = admin.role === 'SUPER_ADMIN';

                  return (
                    <tr key={admin.id} className="hover:bg-[#131722]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                              isSuper
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20'
                            }`}
                          >
                            {admin.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{admin.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00E5FF]/20 text-[#00E5FF] uppercase border border-[#00E5FF]/30">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#6B7280] font-mono">{admin.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#9CA3AF]">
                        <span className="px-2 py-1 rounded bg-[#0A0B0E] border border-[#1A1C23] text-white">
                          @{admin.username}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            admin.role === 'SUPER_ADMIN'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : admin.role === 'ADMIN'
                              ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{admin.role.replace('_', ' ')}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            admin.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : admin.status === 'INACTIVE'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              admin.status === 'ACTIVE'
                                ? 'bg-emerald-400 animate-pulse'
                                : admin.status === 'INACTIVE'
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                            }`}
                          />
                          <span>{admin.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-[#6B7280]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#4B5563]" />
                          <span>Created {new Date(admin.created_at).toLocaleDateString()}</span>
                        </div>
                        {admin.last_login_at && (
                          <div className="flex items-center gap-1 text-[10px] text-[#4B5563] mt-0.5 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>Active {new Date(admin.last_login_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Password Change */}
                          <button
                            id={`reset-pwd-admin-${admin.id}`}
                            onClick={() => handleOpenPasswordModal(admin)}
                            title="Set Permanent Password"
                            className="p-1.5 rounded-lg bg-[#0A0B0E] hover:bg-[#1A1C23] text-[#9CA3AF] hover:text-amber-400 border border-[#1A1C23] transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Status Toggle */}
                          {admin.status === 'ACTIVE' ? (
                            <button
                              id={`deactivate-admin-${admin.id}`}
                              onClick={() => handleQuickStatusToggle(admin, 'INACTIVE')}
                              title="Deactivate Account"
                              disabled={isSuper && totalSuperAdmins <= 1}
                              className="p-1.5 rounded-lg bg-[#0A0B0E] hover:bg-[#1A1C23] text-[#9CA3AF] hover:text-amber-400 border border-[#1A1C23] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              id={`activate-admin-${admin.id}`}
                              onClick={() => handleQuickStatusToggle(admin, 'ACTIVE')}
                              title="Activate Account"
                              className="p-1.5 rounded-lg bg-[#0A0B0E] hover:bg-[#1A1C23] text-[#9CA3AF] hover:text-emerald-400 border border-[#1A1C23] transition-colors cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Details */}
                          <button
                            id={`edit-admin-${admin.id}`}
                            onClick={() => handleOpenEdit(admin)}
                            title="Edit Administrator"
                            className="p-1.5 rounded-lg bg-[#0A0B0E] hover:bg-[#1A1C23] text-[#9CA3AF] hover:text-[#00E5FF] border border-[#1A1C23] transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            id={`delete-admin-${admin.id}`}
                            onClick={() => setDeleteTarget(admin)}
                            title="Delete Administrator"
                            disabled={isCurrent || (isSuper && totalSuperAdmins <= 1)}
                            className="p-1.5 rounded-lg bg-[#0A0B0E] hover:bg-red-500/10 text-[#9CA3AF] hover:text-red-400 border border-[#1A1C23] hover:border-red-500/30 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security Architecture Notice */}
      <div className="p-5 rounded-2xl bg-[#0D1017] border border-[#1A1C23] space-y-2">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#00E5FF]" />
          Admin Security Policy &amp; Access Controls
        </h4>
        <p className="text-xs text-[#9CA3AF] leading-relaxed">
          Administrator accounts are managed exclusively by the primary <strong>SUPER_ADMIN</strong>. There is no public administrator registration. Credentials assigned by the Super Admin are permanent, salted with unique 16-byte cryptographic random salts, and hashed using <strong>PBKDF2 with SHA-512</strong> (1,000 iterations). Status changes and account removals immediately invalidate active session tokens.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* CREATE ADMIN MODAL */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1017] border border-[#1A1C23] p-6 space-y-5 text-left shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1A1C23] pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Administrator Account</h3>
                  <p className="text-[11px] text-[#9CA3AF]">Provision credentials with permanent access</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1A1C23] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 uppercase tracking-wider">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name || ''}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Varma / Student Lead"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 uppercase tracking-wider">
                    Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email || ''}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="e.g. rajesh@drkvsrit.ac.in"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 uppercase tracking-wider">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.username || ''}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="e.g. rajesh_admin"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#D1D5DB] uppercase tracking-wider">
                    Permanent Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={createForm.password || ''}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="At least 6 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00E5FF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#00E5FF] cursor-pointer"
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#6B7280] mt-1">
                  Credentials are permanent. No temporary password or forced reset will be required.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 uppercase tracking-wider">
                    Role
                  </label>
                  <select
                    value={createForm.role || 'ADMIN'}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as AdminRole })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                  >
                    <option value="ADMIN">ADMIN (Full Content &amp; Registrations)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Full Access &amp; User Management)</option>
                    <option value="EDITOR">EDITOR (Content Editing Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 uppercase tracking-wider">
                    Initial Status
                  </label>
                  <select
                    value={createForm.status || 'ACTIVE'}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as AdminStatus })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE (Can Login Immediately)</option>
                    <option value="INACTIVE">INACTIVE (Login Suspended)</option>
                    <option value="REVOKED">REVOKED (Access Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1C23]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#33ebff] font-bold text-xs text-[#0A0B0E] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-[#00E5FF]/20"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[#0A0B0E]/30 border-t-[#0A0B0E] rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT ADMIN MODAL */}
      {/* ========================================================================= */}
      {isEditModalOpen && editAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1017] border border-[#1A1C23] p-6 space-y-5 text-left shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#1A1C23] pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Administrator</h3>
                  <p className="text-[11px] text-[#9CA3AF]">Update account info, roles, or access status</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1A1C23] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 uppercase tracking-wider">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 uppercase tracking-wider">
                    Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 uppercase tracking-wider">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.username || ''}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 uppercase tracking-wider">
                    Role
                  </label>
                  <select
                    value={editForm.role || 'ADMIN'}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as AdminRole })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                  >
                    <option value="ADMIN">ADMIN (Full Content &amp; Registrations)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Full Access &amp; User Management)</option>
                    <option value="EDITOR">EDITOR (Content Editing Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={editForm.status || 'ACTIVE'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as AdminStatus })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="REVOKED">REVOKED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1C23]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#33ebff] font-bold text-xs text-[#0A0B0E] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-[#00E5FF]/20"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SET PERMANENT PASSWORD MODAL */}
      {/* ========================================================================= */}
      {isPasswordModalOpen && passwordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0D1017] border border-[#1A1C23] p-6 space-y-5 text-left shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#1A1C23] pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Set Permanent Password</h3>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Updating password for <strong className="text-white">{passwordTarget.name}</strong> (@{passwordTarget.username})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1A1C23] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 uppercase tracking-wider">
                  New Permanent Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword || ''}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-amber-400 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 uppercase tracking-wider">
                  Confirm New Password *
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword || ''}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-3 bg-[#0A0B0E] border border-[#1A1C23] rounded-xl text-[11px] text-[#9CA3AF] space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Immediate Re-authentication Notice</span>
                </div>
                <p>
                  Changing the administrator's password will invalidate their active session tokens immediately. They will log in using this new permanent password.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1C23]">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 font-bold text-xs text-[#0A0B0E] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20"
                >
                  {submitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE ADMIN CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0D1017] border border-red-500/30 p-6 space-y-4 text-left shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Delete Administrator Account?</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-white">{deleteTarget.name}</strong> (@{deleteTarget.username})? Their administrative credentials and login permissions will be permanently revoked.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1C23]">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteSubmit}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 font-bold text-xs text-white uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-red-500/20"
              >
                {submitting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
