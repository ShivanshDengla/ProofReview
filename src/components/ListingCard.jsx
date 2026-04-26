import { Link } from 'react-router-dom';
import StarRating from './StarRating.jsx';
import VoteButtons from './VoteButtons.jsx';
import { trustLabel } from '../lib/trustScore.js';

export default function ListingCard({ listing, votes }) {
  const {
    id,
    name,
    category,
    description,
    avgRating,
    reviewCount,
    trustScore,
  } = listing;

  return (
    <Link
      to={`/listings/${id}`}
      className="card block animate-fade-in transition hover:-translate-y-0.5 hover:shadow-soft-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-ink-900 dark:text-ink-50">
              {name}
            </h3>
            <span className="chip">{category}</span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm text-ink-600 dark:text-ink-300">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className="rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700 dark:from-brand-500/20 dark:to-brand-700/20 dark:text-brand-200"
            title="Trust score 0–100"
          >
            {trustScore}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-ink-400">
            {trustLabel(trustScore)}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StarRating value={avgRating} size="sm" />
          <span className="text-xs font-medium text-ink-600 dark:text-ink-300">
            {reviewCount > 0 ? avgRating.toFixed(1) : '—'}
            <span className="ml-1 text-ink-400">
              ({reviewCount} verified)
            </span>
          </span>
        </div>
        <VoteButtons listingId={id} votes={votes} />
      </div>
    </Link>
  );
}
