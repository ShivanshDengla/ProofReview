import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { shortHash } from '../lib/format.js';
import Logo from './Logo.jsx';
import VerifiedBadge from './VerifiedBadge.jsx';
import VerifyButton from './VerifyButton.jsx';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid h-9 w-9 place-items-center rounded-xl border border-ink-200 bg-white text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
        </svg>
      )}
    </button>
  );
}

export default function Header() {
  const { user, isVerified } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
      <div className="container-app flex h-14 items-center justify-between gap-3">
        <Link to="/" className="flex items-center" aria-label="Home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink
            to="/listings"
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-ink-50'
                  : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
              }`
            }
          >
            Browse
          </NavLink>
          <NavLink
            to="/new"
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-ink-50'
                  : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
              }`
            }
          >
            Add listing
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isVerified ? (
            <div className="flex items-center gap-2">
              <VerifiedBadge />
              <span
                className="hidden text-xs font-mono text-ink-500 sm:inline"
                title={user?.nullifier_hash}
              >
                {shortHash(user?.nullifier_hash)}
              </span>
            </div>
          ) : (
            <VerifyButton label="Verify" className="!px-3 !py-2 !text-xs sm:!text-sm" />
          )}
        </div>
      </div>
    </header>
  );
}
