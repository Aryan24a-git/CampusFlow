'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LostFoundItem {
  id: string;
  object_type: string;
  description: string;
  color?: string;
  location?: string;
  status: string;
  created_at: string;
  image_url?: string;
  users?: { name: string };
}

export default function LostFoundPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'browse' | 'report_lost' | 'report_found'>('browse');
  const [lostList, setLostList] = useState<LostFoundItem[]>([]);
  const [foundList, setFoundList] = useState<LostFoundItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Form states
  const [formType, setFormType] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formLoc, setFormLoc] = useState('');
  const [formPrivate, setFormPrivate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [matchAlert, setMatchAlert] = useState<string | null>(null);

  // Image upload
  const [formImages, setFormImages] = useState<File[]>([]);
  const [formPreviews, setFormPreviews] = useState<string[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgFileRef = useRef<HTMLInputElement>(null);

  function handleFormImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newFiles = files.slice(0, 3 - formImages.length);
    setFormImages(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setFormPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    if (imgFileRef.current) imgFileRef.current.value = '';
  }

  function removeFormImage(idx: number) {
    setFormImages(prev => prev.filter((_, i) => i !== idx));
    setFormPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function uploadFormImages(): Promise<string[]> {
    if (formImages.length === 0) return [];
    setUploadingImg(true);
    const urls: string[] = [];
    try {
      for (const file of formImages) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `lost-found/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('attachments').upload(path, file);
        if (!error) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
          urls.push(urlData.publicUrl);
        }
      }
    } finally {
      setUploadingImg(false);
    }
    return urls;
  }

  async function loadItems() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

    try {
      const res = await fetch(`${backendUrl}/api/lost-found`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resJson = await res.json();
      if (resJson.success) {
        setLostList(resJson.data.lost);
        setFoundList(resJson.data.found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleReportLost(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMatchAlert(null);
    try {
      const imageUrls = await uploadFormImages();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

      const res = await fetch(`${backendUrl}/api/lost-found/lost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          object_type: formType,
          description: formDesc,
          color: formColor,
          location: formLoc,
          private_detail: formPrivate,
          image_urls: imageUrls,
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        if (resJson.matches?.length > 0) {
          setMatchAlert(`🎉 We found ${resJson.matches.length} matching found items! Check the found list.`);
        }
        setFormType('');
        setFormDesc('');
        setFormColor('');
        setFormLoc('');
        setFormPrivate('');
        setFormImages([]);
        setFormPreviews([]);
        await loadItems();
        setActiveTab('browse');
      } else {
        alert(resJson.error || 'Failed to report lost item');
      }
    } catch (err: any) {
      alert(err.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReportFound(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const imageUrls = await uploadFormImages();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

      const res = await fetch(`${backendUrl}/api/lost-found/found`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          object_type: formType,
          description: formDesc,
          color: formColor,
          location: formLoc,
          image_urls: imageUrls,
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        alert('Thank you! Item registered in found registry.');
        setFormType('');
        setFormDesc('');
        setFormColor('');
        setFormLoc('');
        setFormImages([]);
        setFormPreviews([]);
        await loadItems();
        setActiveTab('browse');
      } else {
        alert(resJson.error || 'Failed to report found item');
      }
    } catch (err: any) {
      alert(err.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  }

  const allItems = [
    ...lostList.map((i) => ({ ...i, kind: 'lost' as const })),
    ...foundList.map((i) => ({ ...i, kind: 'found' as const })),
  ].filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.object_type.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (item.location && item.location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔍</span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Lost & Found Hub</h1>
          </div>
          <p className="text-slate-400 text-sm mt-0.5">
            AI-matched campus lost property and found item registry
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('report_lost')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'report_lost'
                ? 'bg-rose-600 text-white'
                : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
            }`}
          >
            + Report Lost Item
          </button>
          <button
            onClick={() => setActiveTab('report_found')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'report_found'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
            }`}
          >
            + I Found Something
          </button>
        </div>
      </div>

      {matchAlert && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <span>{matchAlert}</span>
          <button onClick={() => setMatchAlert(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('browse')}
            className={`pb-2 text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'browse'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Browse Registry ({lostList.length + foundList.length})
          </button>
        </div>

        {activeTab === 'browse' && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wallet, keys, laptop..."
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Content depending on tab */}
      {activeTab === 'browse' && (
        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-36 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : allItems.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">📦</div>
              <h3 className="text-white font-medium text-sm">No items found</h3>
              <p className="text-slate-500 text-xs mt-1">Check back later or register your item</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allItems.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 hover:border-white/20 transition-all shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.kind === 'lost'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {item.kind === 'lost' ? 'Lost Item' : 'Found Item'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {item.image_url && (
                    <a href={item.image_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl">
                      <img
                        src={item.image_url}
                        alt={item.object_type}
                        className="w-full h-36 object-cover rounded-xl border border-white/10 hover:scale-105 transition-transform"
                      />
                    </a>
                  )}

                  <div>
                    <h3 className="text-sm font-bold text-white capitalize">{item.object_type}</h3>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">{item.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 pt-1">
                    {item.location && (
                      <span className="bg-white/5 px-2 py-0.5 rounded-md">
                        📍 {item.location}
                      </span>
                    )}
                    {item.color && (
                      <span className="bg-white/5 px-2 py-0.5 rounded-md capitalize">
                        🎨 {item.color}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report Lost Form */}
      {activeTab === 'report_lost' && (
        <form onSubmit={handleReportLost} className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-xl mx-auto space-y-4">
          <h2 className="text-base font-bold text-white">Report a Lost Item</h2>
          <p className="text-xs text-slate-400">Our AI matches your report with items turned into security.</p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Item Name / Type *</label>
            <input
              type="text"
              required
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              placeholder="e.g. Leather Wallet, Student ID Card, Blue Umbrella"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Color</label>
              <input
                type="text"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                placeholder="e.g. Dark Brown, Black"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Approximate Location</label>
              <input
                type="text"
                value={formLoc}
                onChange={(e) => setFormLoc(e.target.value)}
                placeholder="e.g. Near Cafeteria Counter"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
            <textarea
              rows={3}
              required
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Describe distinctive marks, brand, keychain, etc."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:ring-1 focus:ring-rose-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Private Ownership Detail (Secret verification)
            </label>
            <input
              type="text"
              value={formPrivate}
              onChange={(e) => setFormPrivate(e.target.value)}
              placeholder="e.g. ID ends with 4001, photo inside right fold"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:ring-1 focus:ring-rose-500"
            />
            <span className="text-[10px] text-slate-500">Only campus security can see this when you claim.</span>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              📷 Photos <span className="text-slate-500 font-normal">(optional — helps AI matching, max 3)</span>
            </label>
            <input
              ref={imgFileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFormImageSelect}
              className="hidden"
              disabled={formImages.length >= 3}
            />
            {formPreviews.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {formPreviews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt={`Preview ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-white/20" />
                    <button onClick={() => removeFormImage(i)} type="button"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => imgFileRef.current?.click()}
              disabled={formImages.length >= 3}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 rounded-xl text-xs transition-all w-full justify-center disabled:opacity-40">
              <span>📎</span>
              {formImages.length > 0 ? `Add more (${formImages.length}/3)` : 'Attach a photo of the item'}
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting || uploadingImg}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-rose-600/25 disabled:opacity-50"
          >
            {uploadingImg ? '⏳ Uploading photos...' : submitting ? 'Registering...' : 'Register Lost Item'}
          </button>
        </form>
      )}

      {/* Report Found Form */}
      {activeTab === 'report_found' && (
        <form onSubmit={handleReportFound} className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-xl mx-auto space-y-4">
          <h2 className="text-base font-bold text-white">Report a Found Item</h2>
          <p className="text-xs text-slate-400">Help reunite fellow campus members with their belongings.</p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Item Found *</label>
            <input
              type="text"
              required
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              placeholder="e.g. Scientific Calculator, Water Bottle, Car Key"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Color</label>
              <input
                type="text"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                placeholder="e.g. Silver, Blue"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Where Did You Find It? *</label>
              <input
                type="text"
                required
                value={formLoc}
                onChange={(e) => setFormLoc(e.target.value)}
                placeholder="e.g. Library 2nd Floor reading desk"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
            <textarea
              rows={3}
              required
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="General description without revealing secret items..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              📷 Photo of Found Item <span className="text-slate-500 font-normal">(optional but recommended, max 3)</span>
            </label>
            <input
              ref={imgFileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFormImageSelect}
              className="hidden"
              disabled={formImages.length >= 3}
            />
            {formPreviews.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {formPreviews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt={`Preview ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-white/20" />
                    <button onClick={() => removeFormImage(i)} type="button"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => imgFileRef.current?.click()}
              disabled={formImages.length >= 3}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-300 rounded-xl text-xs transition-all w-full justify-center disabled:opacity-40">
              <span>📎</span>
              {formImages.length > 0 ? `Add more (${formImages.length}/3)` : 'Attach a photo of what you found'}
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting || uploadingImg}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50"
          >
            {uploadingImg ? '⏳ Uploading photos...' : submitting ? 'Submitting...' : 'Register Found Item'}
          </button>
        </form>
      )}
    </div>
  );
}
