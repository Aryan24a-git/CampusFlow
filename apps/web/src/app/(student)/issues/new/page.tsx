'use client';

import { useState, useEffect, useRef } from 'react';
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

  // Image upload states
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newFiles = files.slice(0, 3 - images.length);
    setImages(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function uploadImages(): Promise<string[]> {
    if (images.length === 0) return [];
    setUploadingImages(true);
    const urls: string[] = [];
    try {
      for (const file of images) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `issues/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('attachments').upload(path, file);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
          urls.push(urlData.publicUrl);
        }
      }
    } finally {
      setUploadingImages(false);
    }
    return urls;
  }

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
      const imageUrls = await uploadImages();
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
          image_urls: imageUrls,
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

        {/* Photo Evidence Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            📷 Attach Photo Evidence <span className="text-slate-500 normal-case">(optional, helps staff identify problem faster, max 3)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
            disabled={images.length >= 3}
          />
          {previews.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {previews.map((src, i) => (
                <div key={i} className="relative group">
                  <img
                    src={src}
                    alt={`Preview ${i + 1}`}
                    className="w-16 h-16 object-cover rounded-xl border border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= 3 || uploadingImages}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-blue-500/40 text-slate-400 hover:text-blue-300 rounded-xl text-xs transition-all w-full justify-center disabled:opacity-40"
          >
            <span>📎</span>
            {images.length > 0 ? `Add more photos (${images.length}/3)` : 'Attach photo of problem / damage'}
          </button>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || uploadingImages}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {uploadingImages ? '⏳ Uploading photos...' : loading ? 'Submitting Report...' : 'Submit Issue'}
        </button>
      </form>
    </div>
  );
}
