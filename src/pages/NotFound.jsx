import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-app py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink-900 dark:text-ink-50">
        Page not found
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        The page you're looking for doesn't exist.
      </p>
      <Link to="/" className="btn-primary mt-6 inline-flex">
        Back home
      </Link>
    </div>
  );
}
