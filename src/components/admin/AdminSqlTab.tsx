import React, { useState, useEffect } from 'react';
import {
  Database,
  Copy,
  Check,
  Download,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  History,
  UploadCloud,
  FileJson,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { api } from '../../lib/api';
import { AuditLog } from '../../types';

interface AdminSqlTabProps {
  sqlSchema: string;
}

export const AdminSqlTab: React.FC<AdminSqlTabProps> = ({ sqlSchema }) => {
  const [copied, setCopied] = useState(false);
  const [subTab, setSubTab] = useState<'sql' | 'audit' | 'backup'>('sql');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [searchLog, setSearchLog] = useState('');

  // Backup & Restore State
  const [restoreJson, setRestoreJson] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await api.adminGetAuditLogs();
      setAuditLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (subTab === 'audit') {
      fetchAuditLogs();
    }
  }, [subTab]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([sqlSchema], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intelligenz_schema_backup_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const data = await api.adminExportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intelligenz_db_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setRestoreStatus({ text: 'Backup snapshot successfully exported and downloaded.', type: 'success' });
    } catch (err: any) {
      setRestoreStatus({ text: err.message || 'Failed to export backup', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // test parse
        JSON.parse(text);
        setRestoreJson(text);
        setRestoreStatus({ text: `Loaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, type: 'success' });
      } catch (err) {
        setRestoreStatus({ text: 'Selected file is not valid JSON.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreSubmit = async () => {
    if (!restoreJson.trim()) {
      setRestoreStatus({ text: 'Please upload or paste a valid JSON backup payload.', type: 'error' });
      return;
    }

    try {
      const parsed = JSON.parse(restoreJson);
      if (!window.confirm('Are you sure you want to restore the database from this backup? Current records will be replaced.')) {
        return;
      }
      setIsRestoring(true);
      const res = await api.adminRestoreBackup(parsed);
      setRestoreStatus({ text: res.message || 'Database restored successfully!', type: 'success' });
      setRestoreJson('');
    } catch (err: any) {
      setRestoreStatus({ text: err.message || 'Failed to restore database.', type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    const term = searchLog.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.entity_type.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      (log.admin_email || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A1C23] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Database &amp; Audit Administration
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Manage PostgreSQL/Supabase exports, audit trail logs, and JSON database backups
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 rounded-xl bg-[#0D1017] border border-[#1A1C23]">
          <button
            onClick={() => setSubTab('sql')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              subTab === 'sql'
                ? 'bg-[#00E5FF] text-[#0A0B0E] font-bold shadow-md shadow-[#00E5FF]/20'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Supabase SQL</span>
          </button>
          <button
            onClick={() => setSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              subTab === 'audit'
                ? 'bg-[#00E5FF] text-[#0A0B0E] font-bold shadow-md shadow-[#00E5FF]/20'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
          <button
            onClick={() => setSubTab('backup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              subTab === 'backup'
                ? 'bg-[#00E5FF] text-[#0A0B0E] font-bold shadow-md shadow-[#00E5FF]/20'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Backups &amp; Restore</span>
          </button>
        </div>
      </div>

      {/* SQL SUBTAB */}
      {subTab === 'sql' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-[#9CA3AF]">
              Export production-ready PostgreSQL 15+ DDL and seed data formatted for Supabase.
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-lg bg-[#1A1C23] hover:bg-[#252833] text-white text-xs font-semibold border border-[#2A2E3D] flex items-center gap-1.5 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#00E5FF]" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy SQL'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="px-3.5 py-2 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-[#00E5FF]/20 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download .sql</span>
              </button>
            </div>
          </div>

          {/* Migration Steps Info */}
          <div className="p-4 rounded-xl bg-[#0D1017] border border-[#1A1C23] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-[#9CA3AF]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#00E5FF]/10 text-[#00E5FF] shrink-0 border border-[#00E5FF]/20">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white">How to deploy to Supabase:</div>
                <div>
                  1. Open Supabase Dashboard → SQL Editor. 2. Paste the SQL script below. 3. Click Run. All tables, Row-Level Security policies, indexes, and initial data will be seeded.
                </div>
              </div>
            </div>

            <a
              href="https://supabase.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00E5FF] hover:underline font-semibold flex items-center gap-1 shrink-0"
            >
              <span>Supabase Docs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Code Viewer */}
          <div className="relative rounded-2xl bg-[#0A0B0E] border border-[#1A1C23] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#0D1017] border-b border-[#1A1C23] flex items-center justify-between text-xs text-[#6B7280]">
              <span className="font-mono text-[11px] text-[#9CA3AF]">schema.sql (PostgreSQL 15+)</span>
              <span>{sqlSchema ? `${sqlSchema.split('\n').length} lines` : 'Generating...'}</span>
            </div>

            <pre className="p-5 font-mono text-xs text-cyan-200/90 leading-relaxed overflow-x-auto max-h-[600px] overflow-y-auto selection:bg-[#00E5FF]/20 selection:text-white">
              <code>{sqlSchema || '-- Generating Supabase SQL export...'}</code>
            </pre>
          </div>
        </div>
      )}

      {/* AUDIT LOGS SUBTAB */}
      {subTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audit actions, entities, or admin..."
                value={searchLog || ''}
                onChange={(e) => setSearchLog(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0D1017] border border-[#1A1C23] text-white text-xs placeholder-[#6B7280] focus:border-[#00E5FF] focus:outline-none"
              />
            </div>

            <button
              onClick={fetchAuditLogs}
              disabled={loadingLogs}
              className="px-3.5 py-2 rounded-xl bg-[#121622] hover:bg-[#1A1C23] text-[#9CA3AF] hover:text-white text-xs font-semibold border border-[#1A1C23] flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin text-[#00E5FF]' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="rounded-2xl bg-[#0D1017] border border-[#1A1C23] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#121622] text-[#9CA3AF] border-b border-[#1A1C23]">
                    <th className="py-3 px-4 font-semibold">Timestamp</th>
                    <th className="py-3 px-4 font-semibold">Action</th>
                    <th className="py-3 px-4 font-semibold">Entity</th>
                    <th className="py-3 px-4 font-semibold">Details</th>
                    <th className="py-3 px-4 font-semibold">Admin</th>
                    <th className="py-3 px-4 font-semibold">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1C23] text-[#D1D5DB]">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#6B7280]">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#00E5FF]" />
                          <span>Loading audit trail...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#6B7280]">
                        No audit records found matching your query.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#121622]/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-[#9CA3AF] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-[#1A1C23] border border-[#2A2E3D] text-[11px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#00E5FF] font-medium whitespace-nowrap">
                          {log.entity_type}
                        </td>
                        <td className="py-3 px-4 max-w-md truncate text-xs text-[#9CA3AF]">
                          {log.details}
                        </td>
                        <td className="py-3 px-4 text-[#9CA3AF] whitespace-nowrap font-mono text-[11px]">
                          {log.admin_email || 'admin'}
                        </td>
                        <td className="py-3 px-4 text-[#6B7280] whitespace-nowrap font-mono text-[11px]">
                          {log.ip_address || '127.0.0.1'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BACKUP & RESTORE SUBTAB */}
      {subTab === 'backup' && (
        <div className="space-y-6">
          {restoreStatus && (
            <div
              className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
                restoreStatus.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {restoreStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{restoreStatus.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Snapshot Card */}
            <div className="p-6 rounded-2xl bg-[#0D1017] border border-[#1A1C23] space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Full JSON Database Export</h3>
                  <p className="text-xs text-[#9CA3AF]">
                    Download a comprehensive snapshot of all events, certificates, applications, team members, and settings.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#121622] border border-[#1A1C23] text-xs text-[#9CA3AF] space-y-2">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  Security Protected Snapshot
                </div>
                <p>
                  Exported snapshot omits sensitive password hashes for safe offline archiving and data portability.
                </p>
              </div>

              <button
                onClick={handleExportBackup}
                disabled={isExporting}
                className="w-full py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-[#00E5FF]/20 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Exporting...' : 'Export & Download Snapshot'}</span>
              </button>
            </div>

            {/* Restore Snapshot Card */}
            <div className="p-6 rounded-2xl bg-[#0D1017] border border-[#1A1C23] space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Restore From Backup File</h3>
                  <p className="text-xs text-[#9CA3AF]">
                    Select a previously exported `.json` database file to restore platform records.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">
                  Upload Backup JSON File:
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-[#9CA3AF] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#1A1C23] file:text-white hover:file:bg-[#252833] cursor-pointer"
                />
              </div>

              <button
                onClick={handleRestoreSubmit}
                disabled={isRestoring || !restoreJson}
                className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 transition-all disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isRestoring ? 'Restoring Database...' : 'Restore Database'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

