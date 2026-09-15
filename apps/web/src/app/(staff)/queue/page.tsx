export default function StaffQueuePage() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/20 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white">Work Queue 🔧</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Your assigned maintenance jobs — sorted by priority
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-white font-medium text-sm">Queue is empty</h3>
        <p className="text-slate-500 text-xs mt-1">
          New jobs will appear here once assigned
        </p>
        <p className="text-slate-600 text-xs mt-3">
          Full work queue coming in Level 3
        </p>
      </div>
    </div>
  );
}
