export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome banner skeleton */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="h-7 bg-white/10 rounded-lg w-48 mb-3" />
        <div className="h-4 bg-white/10 rounded w-72" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="h-8 bg-white/10 rounded w-8 mx-auto mb-2" />
            <div className="h-3 bg-white/10 rounded w-12 mx-auto" />
          </div>
        ))}
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="w-9 h-9 bg-white/10 rounded-lg mb-3" />
            <div className="h-4 bg-white/10 rounded w-24 mb-2" />
            <div className="h-3 bg-white/10 rounded w-36" />
          </div>
        ))}
      </div>

      {/* Recent issues */}
      <div className="space-y-2">
        <div className="h-3 bg-white/10 rounded w-24 mb-3" />
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-4">
            <div className="flex-1">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-1.5" />
              <div className="h-3 bg-white/10 rounded w-1/3" />
            </div>
            <div className="h-3 bg-white/10 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
