export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center shadow-soft dark:border-ink-700 dark:bg-ink-800/60">
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-ink-100 text-ink-500 dark:bg-ink-700 dark:text-ink-300">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-ink-500">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
