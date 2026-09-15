import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function StudentDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/20 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {profile?.name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          What can CampusFlow help you with today?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          href="/chat"
          className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10"
        >
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <span className="text-xl">💬</span>
          </div>
          <h3 className="font-semibold text-white text-sm">Report an Issue</h3>
          <p className="text-slate-500 text-xs mt-1">
            Describe any campus problem in natural language
          </p>
        </a>

        <a
          href="/issues"
          className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
        >
          <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <span className="text-xl">📋</span>
          </div>
          <h3 className="font-semibold text-white text-sm">My Issues</h3>
          <p className="text-slate-500 text-xs mt-1">
            Track the status of your complaints
          </p>
        </a>

        <a
          href="/lost-found"
          className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/10"
        >
          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <span className="text-xl">🔍</span>
          </div>
          <h3 className="font-semibold text-white text-sm">Lost & Found</h3>
          <p className="text-slate-500 text-xs mt-1">
            Report lost items or check found items
          </p>
        </a>
      </div>

      {/* Issues placeholder — will be wired in Level 3 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">📭</div>
        <h3 className="text-white font-medium text-sm">No issues yet</h3>
        <p className="text-slate-500 text-xs mt-1">
          Use the AI Chat to report your first issue
        </p>
        <a
          href="/chat"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-medium rounded-lg transition-all"
        >
          💬 Open AI Chat
        </a>
      </div>
    </div>
  );
}
