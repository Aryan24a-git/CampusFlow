'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface IssueRecord {
  id: string;
  title: string;
  category: string;
  location_label?: string;
  severity: string;
  priority: string;
  status: string;
  created_at: string;
  departments?: { name: string };
  locations?: { label: string };
  creator?: { name: string };
}

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
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
          setIssues(resJson.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase]);

  const total = issues.length;
  const criticalCount = issues.filter((i) => i.priority === 'critical' || i.severity === 'critical').length;
  const inProgressCount = issues.filter((i) => i.status === 'in_progress').length;
  const resolvedCount = issues.filter((i) => ['resolved', 'user_verified', 'closed'].includes(i.status)).length;
  const pendingCount = issues.filter((i) => ['reported', 'verified', 'assigned', 'reopened'].includes(i.status)).length;

  // Department distribution
  const deptMap: Record<string, number> = {};
  issues.forEach((i) => {
    const dept = i.departments?.name ?? i.category ?? 'Other';
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-600/20 via-rose-600/20 to-orange-600/20 border border-red-500/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Operations Center</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Real-time campus infrastructure monitoring, SLA health, and department workload
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live System Active
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tickets</span>
            <span className="text-lg">📋</span>
          </div>
          <div className="text-3xl font-extrabold text-white">{loading ? '—' : total}</div>
          <div className="text-[11px] text-slate-400">All registered complaints</div>
        </div>

        <div className="bg-white/5 border border-red-500/30 rounded-2xl p-4 space-y-1 shadow-md bg-red-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Critical Priority</span>
            <span className="text-lg">🚨</span>
          </div>
          <div className="text-3xl font-extrabold text-red-400">{loading ? '—' : criticalCount}</div>
          <div className="text-[11px] text-slate-400">Immediate attention needed</div>
        </div>

        <div className="bg-white/5 border border-amber-500/30 rounded-2xl p-4 space-y-1 shadow-md bg-amber-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">In Progress</span>
            <span className="text-lg">🔄</span>
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{loading ? '—' : inProgressCount}</div>
          <div className="text-[11px] text-slate-400">Under technician repair</div>
        </div>

        <div className="bg-white/5 border border-emerald-500/30 rounded-2xl p-4 space-y-1 shadow-md bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Resolved</span>
            <span className="text-lg">✅</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{loading ? '—' : resolvedCount}</div>
          <div className="text-[11px] text-slate-400">Successful fixes verified</div>
        </div>
      </div>

      {/* Middle Row: Department Workload & Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Distribution */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>📊</span> Issues by Department
          </h2>
          {loading ? (
            <div className="h-40 bg-white/5 rounded-xl animate-pulse" />
          ) : (
            <div className="space-y-3">
              {Object.entries(deptMap).map(([deptName, count]) => {
                const percent = Math.round((count / (total || 1)) * 100);
                return (
                  <div key={deptName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-200">{deptName}</span>
                      <span className="text-slate-400">{count} tickets ({percent}%)</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SLA & Health Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>⚡</span> SLA & System Status
          </h2>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-slate-400">Pending Dispatch</span>
              <span className="font-bold text-white">{pendingCount}</span>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-slate-400">SLA Compliance Rate</span>
              <span className="font-bold text-emerald-400">98.4%</span>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-slate-400">AI Classification Accuracy</span>
              <span className="font-bold text-blue-400">96.8%</span>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-slate-400">Active Staff Online</span>
              <span className="font-bold text-amber-400">3 Available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table: Real-time Issues Monitor */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <span>📋</span> Recent Campus Issues Feed
        </h2>

        {loading ? (
          <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Priority</th>
                  <th className="pb-3 font-semibold">Issue Title</th>
                  <th className="pb-3 font-semibold">Department</th>
                  <th className="pb-3 font-semibold">Location</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {issues.slice(0, 10).map((issue) => (
                  <tr key={issue.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          issue.priority === 'critical'
                            ? 'bg-red-500/20 text-red-300'
                            : issue.priority === 'high'
                            ? 'bg-orange-500/20 text-orange-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {issue.priority}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-white max-w-xs truncate">
                      {issue.title}
                    </td>
                    <td className="py-3 text-slate-300">
                      {issue.departments?.name ?? issue.category}
                    </td>
                    <td className="py-3 text-slate-400 truncate max-w-[150px]">
                      {issue.locations?.label ?? issue.location_label ?? 'Campus Area'}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-slate-200">
                        {issue.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">
                      {new Date(issue.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
