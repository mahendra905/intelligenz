import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Save,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Users,
  Calendar,
  CalendarCheck,
  Lightbulb,
  GraduationCap,
  Award,
  Trophy,
  Flame,
  Code2,
  Terminal,
  BookOpen,
  Globe,
  Cpu,
  Brain,
  Layers,
  Target,
  Zap,
  Star,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  Clock,
  UserCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { CommunityImpactStat, SiteStats } from '../../types';
import { INITIAL_COMMUNITY_IMPACT_STATS } from '../../data/initialData';
import { api, authStorage } from '../../lib/api';

const AVAILABLE_ICONS = [
  { name: 'Users', label: 'Users / Students', icon: Users },
  { name: 'Calendar', label: 'Calendar / Events', icon: Calendar },
  { name: 'CalendarCheck', label: 'Calendar Check', icon: CalendarCheck },
  { name: 'Lightbulb', label: 'Lightbulb / Projects', icon: Lightbulb },
  { name: 'GraduationCap', label: 'Graduation Cap / Labs', icon: GraduationCap },
  { name: 'Award', label: 'Award / Contests', icon: Award },
  { name: 'Trophy', label: 'Trophy / Wins', icon: Trophy },
  { name: 'Flame', label: 'Flame / Core Members', icon: Flame },
  { name: 'Sparkles', label: 'Sparkles / AI', icon: Sparkles },
  { name: 'Brain', label: 'Brain / Intelligence', icon: Brain },
  { name: 'Cpu', label: 'CPU / Hardware Tech', icon: Cpu },
  { name: 'Code2', label: 'Code / Development', icon: Code2 },
  { name: 'Terminal', label: 'Terminal / Hackathons', icon: Terminal },
  { name: 'BookOpen', label: 'Book / Education', icon: BookOpen },
  { name: 'Globe', label: 'Globe / Community', icon: Globe },
  { name: 'Layers', label: 'Layers / Ecosystem', icon: Layers },
  { name: 'Target', label: 'Target / Milestones', icon: Target },
  { name: 'Zap', label: 'Zap / Innovation', icon: Zap },
  { name: 'Star', label: 'Star / Achievements', icon: Star },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Students: Users,
  Calendar,
  CalendarCheck,
  Events: CalendarCheck,
  Lightbulb,
  Projects: Lightbulb,
  GraduationCap,
  Labs: GraduationCap,
  Award,
  Trophy,
  Wins: Award,
  Flame,
  Members: Flame,
  Sparkles,
  Brain,
  Cpu,
  Code2,
  Terminal,
  BookOpen,
  Globe,
  Layers,
  Target,
  Zap,
  Star,
};

function getIconComponent(name?: string) {
  if (!name) return Users;
  return ICON_MAP[name] || Users;
}

interface AdminStatsTabProps {
  stats: SiteStats | null;
  onSaveStats?: (stats: SiteStats) => Promise<void>;
}

export const AdminStatsTab: React.FC<AdminStatsTabProps> = ({ stats, onSaveStats }) => {
  const [items, setItems] = useState<CommunityImpactStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStat, setNewStat] = useState<Partial<CommunityImpactStat>>({
    value: '100+',
    label: 'NEW METRIC',
    icon: 'Sparkles',
    active: true,
  });

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetCommunityImpactStats();
      if (Array.isArray(data) && data.length > 0) {
        setItems(data);
      } else if (stats?.community_impact_stats && Array.isArray(stats.community_impact_stats)) {
        setItems(stats.community_impact_stats);
      } else {
        setItems(INITIAL_COMMUNITY_IMPACT_STATS);
      }
    } catch (err: any) {
      console.warn('Fallback to local stats state:', err);
      if (stats?.community_impact_stats && Array.isArray(stats.community_impact_stats)) {
        setItems(stats.community_impact_stats);
      } else {
        setItems(INITIAL_COMMUNITY_IMPACT_STATS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      if (!isMounted || !authStorage.isAuthenticated()) return;
      setLoading(true);
      try {
        const data = await api.adminGetCommunityImpactStats();
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setItems(data);
          } else if (stats?.community_impact_stats && Array.isArray(stats.community_impact_stats)) {
            setItems(stats.community_impact_stats);
          } else {
            setItems(INITIAL_COMMUNITY_IMPACT_STATS);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          if (stats?.community_impact_stats && Array.isArray(stats.community_impact_stats)) {
            setItems(stats.community_impact_stats);
          } else {
            setItems(INITIAL_COMMUNITY_IMPACT_STATS);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdateField = (id: string, field: keyof CommunityImpactStat, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveIndividual = async (stat: CommunityImpactStat) => {
    if (!stat.value.trim() || !stat.label.trim()) {
      showNotification('Value and Label cannot be empty.', 'error');
      return;
    }
    setSavingId(stat.id);
    try {
      const updated = await api.adminUpdateCommunityImpactStat(stat.id, {
        value: stat.value.trim(),
        label: stat.label.trim(),
        icon: stat.icon,
        active: stat.active,
        order: stat.order,
      });
      setItems((prev) => prev.map((item) => (item.id === stat.id ? updated : item)));
      showNotification(`Saved "${stat.label}" successfully!`);
      if (onSaveStats && stats) {
        onSaveStats({ ...stats, community_impact_stats: items });
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to save statistic', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      // Validate all items
      for (const item of items) {
        if (!item.value.trim() || !item.label.trim()) {
          throw new Error('All statistics must have non-empty Value and Label.');
        }
      }

      const updatedList = await api.adminSaveAllCommunityImpactStats(items);
      setItems(updatedList);
      showNotification('All Community Impact statistics updated and published live!');

      if (onSaveStats && stats) {
        onSaveStats({ ...stats, community_impact_stats: updatedList });
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to save all statistics', 'error');
    } finally {
      setSavingAll(false);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newArr = [...items];
    const [moved] = newArr.splice(index, 1);
    newArr.splice(targetIndex, 0, moved);

    // Reassign order
    const reordered = newArr.map((item, idx) => ({ ...item, order: idx + 1 }));
    setItems(reordered);
  };

  const handleToggleActive = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, active: !item.active } : item))
    );
  };

  const handleDeleteItem = async (id: string, label: string) => {
    if (!window.confirm(`Are you sure you want to remove the metric "${label}"?`)) return;

    try {
      await api.adminDeleteCommunityImpactStat(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      showNotification(`Metric "${label}" removed.`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete metric', 'error');
    }
  };

  const handleResetToDefaults = async () => {
    if (
      !window.confirm(
        'Reset Community Impact Statistics to original institutional defaults (650+ Students, 28+ Events, 14+ Projects, etc.)?'
      )
    ) {
      return;
    }

    try {
      const reset = await api.adminSaveAllCommunityImpactStats(INITIAL_COMMUNITY_IMPACT_STATS);
      setItems(reset);
      showNotification('Reset to institutional defaults successfully!');
    } catch (err: any) {
      showNotification(err.message || 'Failed to reset statistics', 'error');
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStat.value?.trim() || !newStat.label?.trim()) {
      showNotification('Value and Label are required.', 'error');
      return;
    }

    try {
      const created = await api.adminCreateCommunityImpactStat({
        value: newStat.value.trim(),
        label: newStat.label.trim().toUpperCase(),
        icon: newStat.icon || 'Sparkles',
        active: newStat.active !== false,
        order: items.length + 1,
      });

      setItems((prev) => [...prev, created]);
      setShowAddModal(false);
      setNewStat({ value: '100+', label: 'NEW METRIC', icon: 'Sparkles', active: true });
      showNotification(`Added new metric "${created.label}"!`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to add metric', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-[#9CA3AF]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#00E5FF]" />
        <p className="text-xs font-mono">Loading Community Impact Statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#00E5FF] px-2.5 py-0.5 rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/5 mb-1.5">
            Public Website Dynamic Content
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#00E5FF]" />
            Community Impact / Counting Statistics
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Edit the numbers, milestone badges, titles, and icons displayed in the "Real-Time Community Impact" section on the public homepage.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3.5 py-2 rounded-xl bg-[#121622] hover:bg-[#1A1C23] text-xs font-semibold text-[#9CA3AF] hover:text-white border border-[#1A1C23] flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset metrics to initial values"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#121622] hover:bg-[#1A1C23] text-xs font-semibold text-[#00E5FF] border border-[#00E5FF]/20 hover:border-[#00E5FF]/40 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Metric</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={savingAll}
            className="px-5 py-2 rounded-xl bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#00E5FF]/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {savingAll ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{savingAll ? 'Publishing...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {/* Global Notification Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-top duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Live Homepage Simulation Preview */}
      <div className="p-5 rounded-2xl bg-[#0D1017] border border-[#1A1C23] space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span>Live Homepage Display Preview</span>
          </div>
          <span className="text-[10px] text-[#6B7280] font-mono">
            {items.filter((i) => i.active).length} of {items.length} metrics visible
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0A0B0E] border border-[#1A1C23] overflow-x-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 min-w-[500px]">
            {items
              .filter((i) => i.active)
              .map((item) => {
                const Icon = getIconComponent(item.icon);
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-[#0D1017] border border-[#1A1C23] flex flex-col items-center text-center"
                  >
                    <div className="p-1.5 rounded bg-[#0A0B0E] border border-[#1A1C23] text-[#00E5FF] mb-1.5">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-lg font-black text-white font-['Outfit']">
                      {item.value || '0'}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider font-semibold text-[#6B7280] truncate max-w-full">
                      {item.label || 'LABEL'}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Statistics Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Milestone Metrics List ({items.length})
          </h3>
          <span className="text-[11px] text-[#9CA3AF]">
            Use arrows to reorder. Changes take effect on the public site upon saving.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((stat, idx) => {
            const Icon = getIconComponent(stat.icon);
            const isSavingThis = savingId === stat.id;

            return (
              <div
                key={stat.id}
                id={`admin-stat-card-${stat.id}`}
                className={`p-5 rounded-2xl border transition-all space-y-4 relative ${
                  stat.active
                    ? 'bg-[#0D1017] border-[#1A1C23] hover:border-[#00E5FF]/30'
                    : 'bg-[#0A0B0E]/60 border-[#1A1C23]/60 opacity-70'
                }`}
              >
                {/* Card Top: Order, Icon Preview, Active Badge & Controls */}
                <div className="flex items-center justify-between pb-3 border-b border-[#1A1C23]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-[#00E5FF]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-white">
                        Position #{idx + 1}
                      </span>
                      <div className="text-[10px] text-[#6B7280] font-mono">{stat.id}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Reorder Buttons */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className="p-1.5 rounded-lg bg-[#0A0B0E] hover:bg-[#1A1C23] text-[#9CA3AF] hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className="p-1.5 rounded-lg bg-[#0A0B0E] hover:bg-[#1A1C23] text-[#9CA3AF] hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Visibility Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(stat.id)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        stat.active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-[#1A1C23] text-[#6B7280] border-transparent hover:text-white'
                      }`}
                      title={stat.active ? 'Active on Homepage' : 'Hidden from Homepage'}
                    >
                      {stat.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    {/* Delete button (if more than 1 metric) */}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(stat.id, stat.label)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                        title="Delete Metric"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-3">
                  {/* Number / Value */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#D1D5DB] mb-1">
                      Counter Value / Metric Number <span className="text-[#00E5FF]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={stat.value}
                      onChange={(e) => handleUpdateField(stat.id, 'value', e.target.value)}
                      placeholder="e.g. 650+, 28+, 100K"
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-sm text-white font-bold font-['Outfit'] focus:outline-none focus:border-[#00E5FF]"
                    />
                    <p className="text-[10px] text-[#6B7280] mt-0.5">
                      Supports numbers and symbols (e.g. 650+, 14+, 99.8%)
                    </p>
                  </div>

                  {/* Label / Description */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#D1D5DB] mb-1">
                      Display Label / Title <span className="text-[#00E5FF]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={stat.label}
                      onChange={(e) => handleUpdateField(stat.id, 'label', e.target.value.toUpperCase())}
                      placeholder="e.g. STUDENTS REACHED"
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white font-semibold uppercase tracking-wider focus:outline-none focus:border-[#00E5FF]"
                    />
                  </div>

                  {/* Icon Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#D1D5DB] mb-1">
                      Display Icon
                    </label>
                    <div className="relative">
                      <select
                        value={stat.icon || 'Users'}
                        onChange={(e) => handleUpdateField(stat.id, 'icon', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF] appearance-none cursor-pointer"
                      >
                        {AVAILABLE_ICONS.map((opt) => (
                          <option key={opt.name} value={opt.name}>
                            {opt.name} — {opt.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#9CA3AF]">
                        <Icon className="w-3.5 h-3.5 text-[#00E5FF]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with metadata & individual save */}
                <div className="pt-3 border-t border-[#1A1C23] flex items-center justify-between">
                  <div className="text-[10px] text-[#6B7280] flex items-center gap-1">
                    {stat.updated_at ? (
                      <>
                        <Clock className="w-3 h-3 text-[#00E5FF]" />
                        <span>{new Date(stat.updated_at).toLocaleDateString()}</span>
                      </>
                    ) : (
                      <span>System Default</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveIndividual(stat)}
                    disabled={isSavingThis}
                    className="px-3 py-1.5 rounded-lg bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/20 hover:border-[#00E5FF]/40 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingThis ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    <span>{isSavingThis ? 'Saving...' : 'Save Metric'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Metric Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D1017] border border-[#1A1C23] rounded-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A1C23]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#00E5FF]" />
                Add New Impact Metric
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#9CA3AF] hover:text-white text-xs cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateNew} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Counter Value / Metric Number <span className="text-[#00E5FF]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStat.value || ''}
                  onChange={(e) => setNewStat({ ...newStat, value: e.target.value })}
                  placeholder="e.g. 500+, 95%, 15+"
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-sm text-white font-bold focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Display Label <span className="text-[#00E5FF]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStat.label || ''}
                  onChange={(e) => setNewStat({ ...newStat, label: e.target.value.toUpperCase() })}
                  placeholder="e.g. RESEARCH PUBLICATIONS"
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white font-semibold uppercase focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB] mb-1">
                  Icon
                </label>
                <select
                  value={newStat.icon || 'Sparkles'}
                  onChange={(e) => setNewStat({ ...newStat, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#1A1C23] text-xs text-white focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                >
                  {AVAILABLE_ICONS.map((opt) => (
                    <option key={opt.name} value={opt.name}>
                      {opt.name} — {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="new-stat-active"
                  checked={newStat.active !== false}
                  onChange={(e) => setNewStat({ ...newStat, active: e.target.checked })}
                  className="rounded border-[#1A1C23] bg-[#0A0B0E] text-[#00E5FF] focus:ring-0"
                />
                <label htmlFor="new-stat-active" className="text-xs text-[#D1D5DB] cursor-pointer">
                  Display immediately on public homepage
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#1A1C23]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#121622] hover:bg-[#1A1C23] text-xs text-[#9CA3AF] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#00E5FF] hover:bg-[#33ebff] text-[#0A0B0E] text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Add Metric
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
