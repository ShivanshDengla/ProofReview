import { shortHash, timeAgo } from '../lib/format.js';
import StarRating from './StarRating.jsx';
import VerifiedBadge from './VerifiedBadge.jsx';

export default function ReviewItem({ review, isMine = false }) {
  return (
    <article className="card animate-fade-in">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-ink-700 dark:text-ink-200">
              {shortHash(review.userId)}
            </span>
            <VerifiedBadge size="sm" />
            {isMine && (
              <span className="chip border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-700/60 dark:bg-brand-500/10 dark:text-brand-200">
                You
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <StarRating value={review.rating} size="sm" />
            <span className="text-xs text-ink-500">{timeAgo(review.createdAt)}</span>
          </div>
        </div>
      </header>
      <p className="mt-3 whitespace-pre-wrap text-sm text-ink-800 dark:text-ink-100">
        {review.text}
      </p>
    </article>
  );
}
