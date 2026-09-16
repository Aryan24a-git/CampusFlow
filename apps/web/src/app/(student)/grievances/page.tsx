'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Grievance {
  id: string;
  category: string;
  description: string;
  status: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'anti_ragging', label: 'Anti-Ragging' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'discrimination', label: 'Discrimination' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_LABEL: Record<string, string> = {
  anti_ragging: 'Anti-Ragging',
  harassment: 'Harassment',
  discrimination: 'Discrimination',
  safety: 'Safety',
  other: 'Other',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  submitted: { label: 'Submitted', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: '⏳' },
  under_review: { label: 'Under Review', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: '🔍' },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: '✅' },
  closed: { label: 'Closed', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: '❌' },
};

export default function GrievancesPage() {
  const supabase = createClient();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    category: 'other',
    description: '',
    is_anonymous: false,
  });

  useEffect(() => {
    loadGrievances();
  }, []);

  async function loadGrievances() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('grievances')
      .select('*')
      .eq('submitted_by', user.id)
      .order('created_at', { ascending: false });

    setGrievances(data ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim() || form.description.trim().length < 20) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('grievances').insert({
      submitted_by: user.id,
      category: form.category,
      description: form.description.trim(),
      is_anonymous: form.is_anonymous,
      status: 'submitted',
    });

    if (!error) {
      setSuccess(true);
      setForm({ category: 'Academic', description: '', is_anonymous: false });
      setShowForm(false);
      setTimeout(() => setSuccess(false), 4000);
      await loadGrievances();
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Grievances</h1>
          <p className="text-slate-400 text-sm mt-1">Submit and track formal grievances to the authority</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-rose-500/20"
        >
          <span>{showForm ? '✕ Cancel' : '+ New Grievance'}</span>
        </button>
      </div>

      {/* Success Banner */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <span className="text-emerald-400 text-lg">✅</span>
          <div>
            <div className="text-sm font-medium text-emerald-300">Grievance submitted successfully</div>
            <div className="text-xs text-slate-400 mt-0.5">The grievance authority will review it shortly.</div>
          </div>
        </div>
      )}

      {/* Submit Form */}
      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Submit New Grievance</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Description <span className="text-slate-600">(min 20 characters)</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
                rows={5}
                placeholder="Describe your grievance in detail. Be specific about what happened, when, and who was involved..."
                className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/40 resize-none"
              />
              <div className="text-xs text-slate-600 mt-1 text-right">{form.description.length} chars</div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_anonymous: !f.is_anonymous }))}
                className={`relative w-10 h-6 rounded-full transition-colors ${form.is_anonymous ? 'bg-rose-600' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_anonymous ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <div>
                <div className="text-sm text-white">Submit anonymously</div>
                <div className="text-xs text-slate-500">Your name will be hidden from the authority</div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || form.description.trim().length < 20}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {submitting ? 'Submitting...' : 'Submit Grievance'}
            </button>
          </form>
        </div>
      )}

      {/* Grievance List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-1/3 mb-2" />
              <div className="h-3 bg-white/10 rounded w-full mb-1" />
              <div className="h-3 bg-white/10 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : grievances.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
          <div className="text-5xl mb-4">📣</div>
          <h3 className="text-white font-medium">No grievances yet</h3>
          <p className="text-slate-500 text-sm mt-1">Submit a formal grievance to the campus authority</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-lg transition-all"
          >
            + Submit Grievance
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {grievances.map(g => {
            const cfg = STATUS_CONFIG[g.status] ?? STATUS_CONFIG.pending;
            return (
              <div key={g.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        {CATEGORY_LABEL[g.category] ?? g.category}
                      </span>
                      {g.is_anonymous && (
                        <span className="text-xs text-slate-500">Anonymous</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2">{g.description}</p>
                    <p className="text-xs text-slate-600 mt-2">
                      {new Date(g.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
