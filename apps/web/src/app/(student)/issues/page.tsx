'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface IssueItem {
  id: string;
  title: string;
  category: string;
  location_label?: string;
  severity: string;
  priority: string;
  status: string;
  created_at: string;
  created_by: string;
  image_urls?: string[];
  departments?: { name: string };
  locations?: { label: string };
  creator?: { name: string; email: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  reported: { label: 'Reported', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  verified: { label: 'Verified', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  assigned: { label: 'Assigned', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  user_verified: { label: 'Closed & Verified', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  reopened: { label: 'Reopened', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  high: { label: 'High', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  medium: { label: 'Medium', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  low: { label: 'Low', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
};

export default function MyIssuesPage() {
  const supabase = createClient();
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'resolved'>('all');
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function loadIssues() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    let query = supabase
      .from('issues')
      .select('id, title, category, location_label, severity, priority, status, created_at, created_by, image_urls, departments(name), locations(label), creator:users!created_by(name, email)')
      .order('created_at', { ascending: false });

    if (scope === 'mine' && user) {
      query = query.eq('created_by', user.id);
    }

    const { data, error } = await query;
    if (!error && data) {
      setIssues(data as any);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadIssues();

    // Supabase Realtime for instant live updates
    const channel = supabase
      .channel('student_issues_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issues' },
        () => {
          loadIssues();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, scope]);

  const filteredIssues = issues.filter((issue) => {
    if (activeTab === 'active') {
      return ['reported', 'verified', 'assigned', 'in_progress', 'reopened'].includes(issue.status);
    }
    if (activeTab === 'resolved') {
      return ['resolved', 'user_verified', 'closed'].includes(issue.status);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campus Issues Hub</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Real-time feed of all reported campus infrastructure complaints and repair status
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/chat"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl text-sm transition-all border border-white/10 flex items-center gap-2"
          >
            <span>💬 Report via AI</span>
          </Link>
          <Link
            href="/issues/new"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <span>+ Manual Report</span>
          </Link>
        </div>
      </div>

      {/* Scope Switcher: All Campus Issues vs My Reported Tickets */}
      <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 p-1.5 rounded-2xl">
        <div className="flex gap-1">
          <button
            onClick={() => setScope('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              scope === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🌐 All Campus Issues</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">
              {scope === 'all' ? issues.length : 'All'}
            </span>
          </button>
          <button
            onClick={() => setScope('mine')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              scope === 'mine'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>👤 My Reported Tickets</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">
              {scope === 'mine' ? issues.length : 'Mine'}
            </span>
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 pr-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Sync Active</span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex border-b border-white/10">
        {(['all', 'active', 'resolved'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-4 text-sm font-medium transition-all capitalize border-b-2 ${
              activeTab === tab
                ? 'border-blue-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab} ({
              tab === 'all'
                ? issues.length
                : tab === 'active'
                ? issues.filter(i => ['reported', 'verified', 'assigned', 'in_progress', 'reopened'].includes(i.status)).length
                : issues.filter(i => ['resolved', 'user_verified', 'closed'].includes(i.status)).length
            })
          </button>
        ))}
      </div>

      {/* Issue List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-white font-medium text-base">No issues found</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            {activeTab === 'all'
              ? "You haven't reported any issues yet. If something on campus is broken, report it and our team will get it resolved!"
              : `You don't have any ${activeTab} issues right now.`}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/chat"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
            >
              Report via AI Chat
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue) => {
            const statusBadge = STATUS_CONFIG[issue.status] ?? STATUS_CONFIG.reported;
            const priorityBadge = PRIORITY_CONFIG[issue.priority] ?? PRIORITY_CONFIG.medium;
            const location = issue.locations?.label ?? issue.location_label ?? 'Campus Area';

            return (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                className="group block bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-blue-500/40 rounded-2xl p-4 transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${priorityBadge.color}`}>
                        {priorityBadge.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {issue.departments?.name ?? issue.category}
                      </span>
                      {currentUserId && issue.created_by === currentUserId ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          👤 My Ticket
                        </span>
                      ) : (
                        issue.creator?.name && (
                          <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                            By {issue.creator.name}
                          </span>
                        )
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                      {issue.title}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1 truncate">
                        📍 {location}
                      </span>
                      <span className="shrink-0">
                        🕒 {new Date(issue.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      {issue.image_urls && issue.image_urls.length > 0 && (
                        <span className="flex items-center gap-1 text-sky-400 font-medium shrink-0 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md text-[11px]">
                          📷 {issue.image_urls.length} photo{issue.image_urls.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {issue.image_urls && issue.image_urls.length > 0 && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black/40">
                        <img
                          src={issue.image_urls[0]}
                          alt="Ticket photo"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <span className="text-xs text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-medium">
                      View Details & Timeline →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
