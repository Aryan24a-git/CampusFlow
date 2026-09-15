export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-600/20 to-rose-600/20 border border-red-500/20 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard ⚙️</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Campus operations command center
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open Issues', value: '—', icon: '📋', color: 'blue' },
          { label: 'Critical', value: '—', icon: '🚨', color: 'red' },
          { label: 'In Progress', value: '—', icon: '🔄', color: 'orange' },
          { label: 'Resolved Today', value: '—', icon: '✅', color: 'green' },
        ].map(stat => (
          <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-slate-400 text-xs mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="text-white font-medium text-sm">Analytics coming in Level 10</h3>
        <p className="text-slate-500 text-xs mt-1">
          Live charts, department workload, SLA tracking
        </p>
      </div>
    </div>
  );
}
