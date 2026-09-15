'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = [
  'Electrical',
  'Plumbing',
  'IT/Network',
  'Hostel',
  'Housekeeping',
  'Academic',
  'Security',
  'Library',
  'Other',
];

const SEVERITIES = [
  { id: 'low', label: 'Low', desc: 'Cosmetic or minor inconvenience' },
  { id: 'medium', label: 'Medium', desc: 'Single user affected or partial defect' },
  { id: 'high', label: 'High', desc: 'Affects multiple users or lab work' },
  { id: 'critical', label: 'Critical', desc: 'Safety hazard, electrical risk or flood' },
];

export default function NewIssuePage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Electrical');
  const [subcategory, setSubcategory] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [locations, setLocations] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchLocations() {
      const { data } = await supabase.from('locations').select('id, label').order('label');
      if (data) setLocations(data);
    }
    fetchLocations();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

      const res = await fetch(`${backendUrl}/api/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          subcategory: subcategory.trim() || undefined,
          location_label: locationLabel || undefined,
          severity,
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        router.push(`/issues/${resJson.data.id}`);
      } else {
        setError(resJson.error || 'Failed to submit issue');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/issues" className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Back to My Issues
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Report an Issue
          </h1>
          <p className="text-xs text-slate-400">
            Submit a campus maintenance or service complaint directly
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Issue Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Broken fan making grinding noise"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* Category & Subcategory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Subcategory
            </label>
            <input
              type="text"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="e.g. Ceiling Fan, AC, Wi-Fi"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
            </input>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Location *
          </label>
          <div className="space-y-2">
            <select
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">Select a known location or specify below</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.label}>
                  {loc.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              placeholder="Or type custom location (e.g. Hostel B - Room 204)"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Severity Level
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SEVERITIES.map((sev) => (
              <button
                key={sev.id}
                type="button"
                onClick={() => setSeverity(sev.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  severity === sev.id
                    ? 'border-blue-500 bg-blue-500/15 text-white shadow-md'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="text-xs font-semibold capitalize">{sev.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{sev.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Detailed Description *
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe the exact defect, any error codes, or safety concerns..."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
        >
          {loading ? 'Submitting Report...' : 'Submit Issue'}
        </button>
      </form>
    </div>
  );
}
