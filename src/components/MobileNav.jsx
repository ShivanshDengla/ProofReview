import { NavLink } from 'react-router-dom';

const items = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <path d="M3 11l9-8 9 8M5 10v10h14V10" />
    ),
  },
  {
    to: '/listings',
    label: 'Browse',
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </>
    ),
  },
  {
    to: '/new',
    label: 'Add',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </>
    ),
  },
];

export default function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 backdrop-blur sm:hidden dark:border-ink-800 dark:bg-ink-900/95">
      <div className="container-app grid h-16 grid-cols-3">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                isActive
                  ? 'text-brand-600 dark:text-brand-300'
                  : 'text-ink-500 dark:text-ink-400'
              }`
            }
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {it.icon}
            </svg>
            {it.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
