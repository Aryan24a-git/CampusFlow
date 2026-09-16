export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 bg-white/10 rounded-lg w-64 mb-1" />
      <div className="h-4 bg-white/10 rounded w-96" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="h-3 bg-white/10 rounded w-20 mb-3" />
            <div className="h-8 bg-white/10 rounded w-12 mb-2" />
            <div className="h-3 bg-white/10 rounded w-16" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="h-4 bg-white/10 rounded w-36 mb-4" />
            <div className="h-40 bg-white/5 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
