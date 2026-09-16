'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const DEMO_ACCOUNTS = [
  { role: 'Student', email: 'student@campus.demo', icon: '🎓' },
  { role: 'Faculty', email: 'faculty@campus.demo', icon: '👨‍🏫' },
  { role: 'Maintenance Staff', email: 'staff@campus.demo', icon: '🔧' },
  { role: 'Admin', email: 'admin@campus.demo', icon: '⚙️' },
  { role: 'Head of Dept', email: 'depthead@campus.demo', icon: '🏛️' },
];

const ROLE_ROUTES: Record<string, string> = {
  student: '/dashboard',
  faculty: '/dashboard',
  staff: '/queue',
  admin: '/admin/dashboard',
  grievance_authority: '/admin/dashboard',
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await signIn(email, password);
    setLoading(false);
  }

  async function signIn(em: string, pw: string) {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: em,
      password: pw,
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    // Get role and redirect
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Fallback to JWT metadata if DB query returns null (RLS or timing)
    const role = profile?.role ?? (user.user_metadata?.role as string) ?? 'student';
    const dest = ROLE_ROUTES[role] ?? '/dashboard';
    router.push(dest);
    router.refresh();
  }

  async function handleDemoLogin(demoEmail: string) {
    setLoadingDemo(demoEmail);
    setError('');
    await signIn(demoEmail, 'Demo1234!');
    setLoadingDemo(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/25 mb-4">
            <span className="text-2xl">🎓</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CampusFlow</h1>
          <p className="text-slate-400 mt-1 text-sm">AI-powered campus issue resolution</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@campus.edu"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <span className="text-red-400 text-xs">⚠️ {error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-slate-500 font-medium">DEMO ACCOUNTS</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Demo Accounts */}
          <div className="grid grid-cols-1 gap-2">
            {DEMO_ACCOUNTS.map(({ role, email: demoEmail, icon }) => (
              <button
                key={demoEmail}
                onClick={() => handleDemoLogin(demoEmail)}
                disabled={!!loadingDemo}
                className="flex items-center gap-3 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-150 text-left group disabled:opacity-50"
              >
                <span className="text-lg">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">{role}</div>
                  <div className="text-xs text-slate-500 truncate">{demoEmail}</div>
                </div>
                {loadingDemo === demoEmail ? (
                  <svg className="animate-spin h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className="text-slate-600 group-hover:text-slate-400 transition-colors text-xs">→</span>
                )}
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-slate-600 mt-4">
            Demo password: <code className="text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">Demo1234!</code>
          </p>
        </div>
      </div>
    </div>
  );
}
