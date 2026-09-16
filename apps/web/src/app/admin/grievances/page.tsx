'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Grievance {
  id: string;
  submitted_by: string;
  category: string;
  description: string;
  status: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  users?: { name: string; email: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  submitted: { label: 'Submitted', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: '⏳' },
  under_review: { label: 'Under Review', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: '🔍' },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: '✅' },
  closed: { label: 'Closed', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: '❌' },
};

const NEXT_STATUSES: Record<string, { label: string; value: string; color: string }[]> = {
  submitted: [
    { label: 'Start Review', value: 'under_review', color: 'bg-blue-600 hover:bg-blue-500' },
    { label: 'Close', value: 'closed', color: 'bg-slate-600 hover:bg-slate-500' },
  ],
  under_review: [
    { label: 'Resolve', value: 'resolved', color: 'bg-emerald-600 hover:bg-emerald-500' },
    { label: 'Close', value: 'closed', color: 'bg-slate-600 hover:bg-slate-500' },
  ],
  resolved: [],
  closed: [],
};

export default function AdminGrievancesPage() {
  const supabase = createClient();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'under_review' | 'resolved'>('submitted');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadGrievances();
  }, []);

  async function loadGrievances() {
    setLoading(true);
    const { data } = await supabase
      .from('grievances')
      .select('*, users(name, email)')
      .order('created_at', { ascending: false });
    setGrievances(data ?? []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await supabase.from('grievances').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setGrievances(prev => prev.map(g => g.id === id ? { ...g, status } : g));
    setUpdating(null);
  }

  const filtered = filter === 'all' ? grievances : grievances.filter(g => g.status === filter);

  const counts = {
    all: grievances.length,
    submitted: grievances.filter(g => g.status === 'submitted').length,
    under_review: grievances.filter(g => g.status === 'under_review').length,
    resolved: grievances.filter(g => g.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Grievance Management</h1>
        <p className="text-slate-400 text-sm mt-1">Review and respond to formal grievances submitted by students and faculty</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['submitted', 'under_review', 'all', 'resolved'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              filter === tab
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/8'
            }`}
          >
            {tab === 'submitted' ? '⏳' : tab === 'under_review' ? '🔍' : tab === 'resolved' ? '✅' : '📋'}
            <span className="capitalize">{tab.replace('_', ' ')}</span>
            <span className="bg-white/10 text-xs px-1.5 py-0.5 rounded-full">{counts[tab]}</span>
          </button>
        ))}
      </div>

      {/* Grievance List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-1/4 mb-3" />
              <div className="h-3 bg-white/10 rounded w-full mb-2" />
              <div className="h-3 bg-white/10 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-white font-medium">No {filter !== 'all' ? filter.replace('_', ' ') : ''} grievances</h3>
          <p className="text-slate-500 text-sm mt-1">All clear in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(g => {
            const cfg = STATUS_CONFIG[g.status] ?? STATUS_CONFIG.pending;
            const actions = NEXT_STATUSES[g.status] ?? [];
            return (
              <div key={g.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Meta row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-300 bg-slate-800 border border-white/10 px-2 py-0.5 rounded">
                        {g.category}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {g.is_anonymous ? (
                        <span className="text-xs text-slate-500 italic">Anonymous</span>
                      ) : (
                        g.users && (
                          <span className="text-xs text-slate-400">{g.users.name} · {g.users.email}</span>
                        )
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-300 leading-relaxed">{g.description}</p>

                    {/* Date */}
                    <p className="text-xs text-slate-600 mt-2">
                      Submitted {new Date(g.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Actions */}
                  {actions.length > 0 && (
                    <div className="flex flex-col gap-2 shrink-0">
                      {actions.map(action => (
                        <button
                          key={action.value}
                          onClick={() => updateStatus(g.id, action.value)}
                          disabled={updating === g.id}
                          className={`px-3 py-1.5 ${action.color} text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 whitespace-nowrap`}
                        >
                          {updating === g.id ? '...' : action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
