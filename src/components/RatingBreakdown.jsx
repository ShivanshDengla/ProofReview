export default function RatingBreakdown({ breakdown, total }) {
  const max = Math.max(1, ...breakdown.map((b) => b.count));
  return (
    <div className="space-y-1.5">
      {breakdown.map(({ star, count }) => {
        const pct = total ? Math.round((count / max) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-6 font-medium text-ink-600 dark:text-ink-300">
              {star}★
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-6 text-right tabular-nums text-ink-500">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
