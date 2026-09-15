'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface JobItem {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location_label?: string;
  severity: string;
  priority: string;
  status: string;
  created_at: string;
  departments?: { name: string };
  locations?: { label: string };
  creator?: { name: string; email: string };
}

const PRIORITY_SORT_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_BADGE: Record<string, { label: string; color: string; border: string }> = {
  critical: { label: 'CRITICAL', color: 'bg-red-500/20 text-red-300', border: 'border-red-500/40' },
  high: { label: 'HIGH', color: 'bg-orange-500/20 text-orange-300', border: 'border-orange-500/40' },
  medium: { label: 'MEDIUM', color: 'bg-yellow-500/20 text-yellow-300', border: 'border-yellow-500/40' },
  low: { label: 'LOW', color: 'bg-slate-500/20 text-slate-300', border: 'border-slate-500/40' },
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  reported: { label: 'Unassigned', color: 'bg-blue-500/20 text-blue-300' },
  verified: { label: 'Verified', color: 'bg-indigo-500/20 text-indigo-300' },
  assigned: { label: 'Assigned', color: 'bg-purple-500/20 text-purple-300' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-300' },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-300' },
  user_verified: { label: 'Closed', color: 'bg-green-500/20 text-green-300' },
  reopened: { label: 'Reopened', color: 'bg-rose-500/20 text-rose-300' },
};

export default function StaffQueuePage() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Resolve modal
  const [resolvingJob, setResolvingJob] = useState<JobItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  async function loadJobs() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

    try {
      const res = await fetch(`${backendUrl}/api/issues`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resJson = await res.json();
      if (resJson.success) {
        // Sort by priority (critical > high > medium > low)
        const sorted = (resJson.data as JobItem[]).sort((a, b) => {
          const pA = PRIORITY_SORT_ORDER[a.priority] ?? 2;
          const pB = PRIORITY_SORT_ORDER[b.priority] ?? 2;
          if (pA !== pB) return pA - pB;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setJobs(sorted);
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function updateStatus(jobId: string, newStatus: string, comment?: string) {
    setUpdatingId(jobId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

      const res = await fetch(`${backendUrl}/api/issues/${jobId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          comment: comment ?? `Staff updated status to ${newStatus}`,
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        await loadJobs();
      } else {
        alert(resJson.error || 'Failed to update job status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleConfirmResolve() {
    if (!resolvingJob) return;
    await updateStatus(resolvingJob.id, 'resolved', resolutionNote.trim() || 'Work completed successfully.');
    setResolvingJob(null);
    setResolutionNote('');
  }

  const filteredJobs = jobs.filter((job) => {
    if (activeTab === 'pending') {
      return ['reported', 'verified', 'assigned', 'reopened'].includes(job.status);
    }
    if (activeTab === 'in_progress') {
      return job.status === 'in_progress';
    }
    if (activeTab === 'resolved') {
      return ['resolved', 'user_verified', 'closed'].includes(job.status);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/20 rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔧</span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Staff Work Queue</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Assigned campus maintenance jobs — sorted by priority
          </p>
        </div>

        {/* Live status chips */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadJobs}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 flex items-center gap-1.5 transition-all"
          >
            <span>🔄</span> Refresh Queue
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {(
          [
            { key: 'pending', label: 'Pending & Assigned' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'resolved', label: 'Completed' },
            { key: 'all', label: 'All Jobs' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 ${
              activeTab === t.key
                ? 'border-orange-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label} (
            {t.key === 'pending'
              ? jobs.filter((j) => ['reported', 'verified', 'assigned', 'reopened'].includes(j.status)).length
              : t.key === 'in_progress'
              ? jobs.filter((j) => j.status === 'in_progress').length
              : t.key === 'resolved'
              ? jobs.filter((j) => ['resolved', 'user_verified', 'closed'].includes(j.status)).length
              : jobs.length}
            )
          </button>
        ))}
      </div>

      {/* Queue List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-white font-medium text-base">Your queue is clear!</h3>
          <p className="text-slate-400 text-xs mt-1">
            No maintenance tickets in this view. Great job keeping the campus running smoothly!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const pBadge = PRIORITY_BADGE[job.priority] ?? PRIORITY_BADGE.medium;
            const sBadge = STATUS_BADGE[job.status] ?? STATUS_BADGE.reported;
            const locLabel = job.locations?.label ?? job.location_label ?? 'Campus Area';
            const isUpdating = updatingId === job.id;

            return (
              <div
                key={job.id}
                className={`bg-slate-900/90 border rounded-2xl p-5 transition-all shadow-lg ${
                  job.priority === 'critical' ? 'border-red-500/40 bg-red-950/10' : 'border-white/10'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${pBadge.color} ${pBadge.border}`}>
                        {pBadge.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${sBadge.color}`}>
                        {sBadge.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        🏷️ {job.departments?.name ?? job.category}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        #{job.id.slice(0, 8)}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-white tracking-tight">
                      {job.title}
                    </h2>

                    <p className="text-xs text-slate-300 line-clamp-2">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-medium text-slate-200">
                        📍 {locLabel}
                      </span>
                      {job.creator && (
                        <span>
                          👤 Reported by {job.creator.name}
                        </span>
                      )}
                      <span>
                        🕒 {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Right Action buttons (large and thumb-friendly for technicians) */}
                  <div className="flex flex-wrap lg:flex-col items-stretch justify-end gap-2 shrink-0 min-w-[170px]">
                    {/* If reported or unassigned */}
                    {['reported', 'verified', 'reopened'].includes(job.status) && (
                      <button
                        onClick={() => updateStatus(job.id, 'assigned', 'Job accepted by technician')}
                        disabled={isUpdating}
                        className="py-3 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isUpdating ? 'Assigning...' : '📥 Accept Job'}
                      </button>
                    )}

                    {/* If assigned */}
                    {job.status === 'assigned' && (
                      <button
                        onClick={() => updateStatus(job.id, 'in_progress', 'Technician arrived on site and started work')}
                        disabled={isUpdating}
                        className="py-3 px-5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/25 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isUpdating ? 'Starting...' : '🚀 Start Work'}
                      </button>
                    )}

                    {/* If in progress */}
                    {job.status === 'in_progress' && (
                      <button
                        onClick={() => setResolvingJob(job)}
                        disabled={isUpdating}
                        className="py-3 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        ✅ Mark Resolved
                      </button>
                    )}

                    {/* Resolved view */}
                    {['resolved', 'user_verified'].includes(job.status) && (
                      <div className="py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl text-center">
                        ✓ Completed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve Note Modal */}
      {resolvingJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <h3 className="text-base font-bold text-white">Complete Job</h3>
            </div>
            <p className="text-xs text-slate-300">
              Complete maintenance for <strong>{resolvingJob.title}</strong> at <strong>{resolvingJob.locations?.label ?? resolvingJob.location_label}</strong>.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Resolution Notes / Replaced Parts
              </label>
              <textarea
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="e.g. Replaced capacitor on fan motor, lubricated bearings, tested normal rotation."
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setResolvingJob(null)}
                className="px-4 py-2 bg-white/10 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25"
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
