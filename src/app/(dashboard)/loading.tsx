export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* En-tête */}
      <div className="space-y-2">
        <div className="h-7 bg-muted rounded-md w-52" />
        <div className="h-4 bg-muted/60 rounded-md w-80" />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-3 bg-muted rounded w-24" />
            <div className="h-7 bg-muted rounded w-16" />
            <div className="h-3 bg-muted/60 rounded w-20" />
          </div>
        ))}
      </div>

      {/* Contenu principal */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <div className="h-4 bg-muted rounded w-40" />
        </div>
        <div className="divide-y">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4">
              <div className="h-4 bg-muted rounded flex-1" />
              <div className="h-4 bg-muted/70 rounded w-24" />
              <div className="h-5 bg-muted/50 rounded-full w-16" />
              <div className="h-4 bg-muted/60 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
