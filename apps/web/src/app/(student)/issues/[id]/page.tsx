'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface UpdateItem {
  id: string;
  old_status?: string;
  new_status?: string;
  comment?: string;
  created_at: string;
  actor?: { name: string; role: string };
}

interface IssueDetail {
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
  resolved_at?: string;
  sla_deadline?: string;
  image_urls?: string[];
  departments?: { name: string; contact?: string };
  locations?: { label: string; building?: string; room?: string };
  staff?: { id: string; user?: { name: string; phone?: string } };
  updates?: UpdateItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; step: number }> = {
  reported: { label: 'Reported', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', step: 1 },
  verified: { label: 'Verified', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', step: 2 },
  assigned: { label: 'Assigned', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', step: 3 },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', step: 4 },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', step: 5 },
  user_verified: { label: 'Closed & Verified', color: 'bg-green-500/20 text-green-300 border-green-500/30', step: 6 },
  reopened: { label: 'Reopened', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', step: 2 },
};

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const issueId = params.id as string;

  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenModal, setShowReopenModal] = useState(false);

  async function fetchIssue() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

    try {
      const res = await fetch(`${backendUrl}/api/issues/${issueId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resJson = await res.json();
      if (resJson.success) {
        setIssue(resJson.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (issueId) fetchIssue();
  }, [issueId]);

  async function handleVerifyResolution() {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

      const res = await fetch(`${backendUrl}/api/issues/${issueId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'user_verified',
          comment: 'Resolution verified and accepted by user',
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        await fetchIssue();
      } else {
        alert(resJson.error || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReopen() {
    if (!reopenReason.trim()) return;
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

      const res = await fetch(`${backendUrl}/api/issues/${issueId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'reopened',
          comment: `Reopened by user: ${reopenReason.trim()}`,
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        setShowReopenModal(false);
        setReopenReason('');
        await fetchIssue();
      } else {
        alert(resJson.error || 'Failed to reopen issue');
      }
    } catch (err: any) {
      alert(err.message || 'Error reopening issue');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-4">
        <div className="h-8 bg-white/5 rounded-xl w-1/3 animate-pulse" />
        <div className="h-40 bg-white/5 rounded-2xl animate-pulse" />
        <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="text-4xl">🔍</div>
        <h2 className="text-lg font-bold text-white">Issue Not Found</h2>
        <p className="text-xs text-slate-400">The ticket may have been moved or you don't have permission to view it.</p>
        <Link href="/issues" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
          Return to My Issues
        </Link>
      </div>
    );
  }

  const statusBadge = STATUS_CONFIG[issue.status] ?? STATUS_CONFIG.reported;
  const locationText = issue.locations?.label ?? issue.location_label ?? 'Campus Area';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link href="/issues" className="text-xs text-slate-400 hover:text-white transition-colors">
          ← Back to My Issues
        </Link>
      </div>

      {/* Main Ticket Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
              <span className="text-xs text-slate-400 uppercase font-mono">
                #{issue.id.slice(0, 8)}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {issue.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs px-3 py-1 bg-white/10 rounded-lg text-slate-300 border border-white/10">
              Priority: <strong className="text-white capitalize">{issue.priority}</strong>
            </span>
          </div>
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-slate-500 block mb-1">Category</span>
            <span className="text-white font-medium">{issue.departments?.name ?? issue.category}</span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-slate-500 block mb-1">Location</span>
            <span className="text-white font-medium truncate block">{locationText}</span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-slate-500 block mb-1">Reported On</span>
            <span className="text-white font-medium">
              {new Date(issue.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-slate-500 block mb-1">Assigned Technician</span>
            <span className="text-white font-medium">
              {issue.staff?.user?.name ?? 'Assigned to Dept Queue'}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Issue Description
          </h3>
          <p className="text-sm text-slate-200 bg-white/5 p-4 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed">
            {issue.description}
          </p>
        </div>

        {/* Attached Photos */}
        {issue.image_urls && issue.image_urls.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              📷 Attached Photos ({issue.image_urls.length})
            </h3>
            <div className="flex gap-3 flex-wrap">
              {issue.image_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" title="Click to view full photo">
                  <img
                    src={url}
                    alt={`Attached photo ${i + 1}`}
                    className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border border-white/20 hover:scale-105 transition-transform"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Resolution Banner / Action Buttons */}
        {issue.status === 'resolved' && (
          <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <span>✅</span> Maintenance Staff marked this issue as resolved!
            </div>
            <p className="text-xs text-slate-300">
              Please inspect the repair on site and verify if the issue has been completely fixed.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleVerifyResolution}
                disabled={actionLoading}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : '✓ Verify & Close Ticket'}
              </button>
              <button
                onClick={() => setShowReopenModal(true)}
                disabled={actionLoading}
                className="py-2 px-4 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-semibold transition-all"
              >
                Issue Not Fixed (Reopen)
              </button>
            </div>
          </div>
        )}

        {issue.status === 'user_verified' && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-xs text-green-400 font-medium">
            <span>🎉</span> This issue has been verified and permanently closed. Thank you for making our campus better!
          </div>
        )}
      </div>

      {/* Stepper / Timeline */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <span>🕒</span> Resolution Timeline & Updates
        </h2>

        {(!issue.updates || issue.updates.length === 0) ? (
          <p className="text-xs text-slate-500 italic">No activity recorded yet.</p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
            {issue.updates.map((update, idx) => (
              <div key={update.id || idx} className="relative group">
                {/* Node dot */}
                <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-blue-500 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white capitalize">
                      {update.new_status ? `Status changed to ${update.new_status.replace('_', ' ')}` : 'Update'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(update.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {update.comment && (
                    <p className="text-xs text-slate-300 pt-0.5">
                      {update.comment}
                    </p>
                  )}

                  {update.actor && (
                    <div className="text-[10px] text-slate-500 pt-1">
                      By {update.actor.name} ({update.actor.role})
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Reopen Issue</h3>
            <p className="text-xs text-slate-400">
              Please explain why the repair is incomplete or what still needs attention:
            </p>
            <textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g. The fan blades are fixed but switch spark still continues..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 bg-white/10 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !reopenReason.trim()}
                onClick={handleReopen}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                {actionLoading ? 'Reopening...' : 'Confirm Reopen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
