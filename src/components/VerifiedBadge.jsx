export default function VerifiedBadge({ size = 'sm', label = 'Verified Human' }) {
  const dims = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 ${dims} font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300`}
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2l2.39 1.79 2.93-.32 1.04 2.76 2.5 1.55-.84 2.84.84 2.84-2.5 1.55-1.04 2.76-2.93-.32L12 19.5 9.61 17.7l-2.93.32-1.04-2.76-2.5-1.55.84-2.84-.84-2.84 2.5-1.55 1.04-2.76 2.93.32L12 2zm-1.1 12.3l5.6-5.6-1.4-1.4-4.2 4.2-1.9-1.9-1.4 1.4 3.3 3.3z" />
      </svg>
      {label}
    </span>
  );
}
