import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const STATUS_COLOR: Record<string, string> = {
  reported: 'text-blue-400',
  verified: 'text-indigo-400',
  assigned: 'text-purple-400',
  in_progress: 'text-amber-400',
  resolved: 'text-emerald-400',
  user_verified: 'text-green-400',
  reopened: 'text-rose-400',
};

const STATUS_LABEL: Record<string, string> = {
  reported: 'Reported',
  verified: 'Verified',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  user_verified: 'Closed',
  reopened: 'Reopened',
};

export default async function StudentDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const name = user.user_metadata?.name ?? 'there';

  // Fetch issue stats
  const { data: issues } = await supabase
    .from('issues')
    .select('id, title, status, category, created_at, severity')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  const allIssues = issues ?? [];
  const openIssues = allIssues.filter(i => !['resolved', 'user_verified'].includes(i.status));
  const resolvedIssues = allIssues.filter(i => ['resolved', 'user_verified'].includes(i.status));
  const recentIssues = allIssues.slice(0, 3);

  // Fetch unread notifications count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/20 rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 pointer-events-none" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {(name as string).split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {openIssues.length > 0
              ? `You have ${openIssues.length} open issue${openIssues.length > 1 ? 's' : ''} in progress.`
              : 'All your issues are resolved. Campus is looking good!'}
          </p>
          {(unreadCount ?? 0) > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <span className="text-amber-400 text-xs font-medium">🔔 {unreadCount} unread notification{(unreadCount ?? 0) > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{allIssues.length}</div>
          <div className="text-xs text-slate-500 mt-1">Total</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{openIssues.length}</div>
          <div className="text-xs text-slate-500 mt-1">Open</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{resolvedIssues.length}</div>
          <div className="text-xs text-slate-500 mt-1">Resolved</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/chat"
            className="group bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/40 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span className="text-lg">💬</span>
            </div>
            <h3 className="font-semibold text-white text-sm">Report Issue</h3>
            <p className="text-slate-500 text-xs mt-0.5">Describe in natural language</p>
          </Link>

          <Link
            href="/issues"
            className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
          >
            <div className="w-9 h-9 bg-indigo-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span className="text-lg">📋</span>
            </div>
            <h3 className="font-semibold text-white text-sm">My Issues</h3>
            <p className="text-slate-500 text-xs mt-0.5">Track all complaints</p>
          </Link>

          <Link
            href="/lost-found"
            className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/10"
          >
            <div className="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span className="text-lg">🔍</span>
            </div>
            <h3 className="font-semibold text-white text-sm">Lost & Found</h3>
            <p className="text-slate-500 text-xs mt-0.5">Report or find items</p>
          </Link>

          <Link
            href="/grievances"
            className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rose-500/30 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-rose-500/10"
          >
            <div className="w-9 h-9 bg-rose-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span className="text-lg">📣</span>
            </div>
            <h3 className="font-semibold text-white text-sm">Grievances</h3>
            <p className="text-slate-500 text-xs mt-0.5">Submit formal grievance</p>
          </Link>
        </div>
      </div>

      {/* Recent Issues Feed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Issues</h2>
          <Link href="/issues" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View all →</Link>
        </div>

        {recentIssues.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <h3 className="text-white font-medium text-sm">No issues yet</h3>
            <p className="text-slate-500 text-xs mt-1">Use AI Chat to report your first issue</p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-medium rounded-lg transition-all"
            >
              💬 Open AI Chat
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentIssues.map(issue => (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                className="flex items-center gap-4 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">{issue.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{issue.category} · {new Date(issue.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                </div>
                <span className={`text-xs font-medium shrink-0 ${STATUS_COLOR[issue.status] ?? 'text-slate-400'}`}>
                  {STATUS_LABEL[issue.status] ?? issue.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
