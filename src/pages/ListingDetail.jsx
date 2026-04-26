import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useListing } from '../hooks/useListing.js';
import EmptyState from '../components/EmptyState.jsx';
import RatingBreakdown from '../components/RatingBreakdown.jsx';
import ReviewForm from '../components/ReviewForm.jsx';
import ReviewItem from '../components/ReviewItem.jsx';
import StarRating from '../components/StarRating.jsx';
import VoteButtons from '../components/VoteButtons.jsx';
import { timeAgo } from '../lib/format.js';
import { trustLabel } from '../lib/trustScore.js';

export default function ListingDetail() {
  const { id } = useParams();
  const { listing, reviews, votes, stats, isLoading } = useListing(id);
  const { user } = useAuth();

  if (isLoading && !listing) {
    return (
      <div className="container-app space-y-3 py-6">
        <div className="h-32 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
        <div className="h-24 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container-app py-10">
        <EmptyState
          title="Listing not found"
          description="It may have been removed or the link is incorrect."
          action={
            <Link to="/listings" className="btn-primary">
              Back to browse
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-app space-y-5 py-6">
      <div>
        <Link
          to="/listings"
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-700 dark:hover:text-ink-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </Link>
      </div>

      <header className="card !p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="chip">{listing.category}</span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
              {listing.name}
            </h1>
            <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
              {listing.description}
            </p>
            <p className="mt-2 text-xs text-ink-400">
              Listed {timeAgo(listing.createdAt)}
            </p>
          </div>
          <div className="text-right">
            <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-4 py-3 text-white shadow-soft">
              <div className="text-3xl font-bold leading-none">
                {stats.trustScore}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                {trustLabel(stats.trustScore)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <StarRating value={stats.avgRating} size="md" />
            <span className="text-sm font-semibold text-ink-900 dark:text-ink-50">
              {stats.reviewCount > 0 ? stats.avgRating.toFixed(1) : '—'}
            </span>
            <span className="text-xs text-ink-500">
              ({stats.reviewCount} verified review{stats.reviewCount === 1 ? '' : 's'})
            </span>
          </div>
          <VoteButtons listingId={listing.id} votes={votes} size="lg" />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <div className="card">
          <h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">
            Rating breakdown
          </h2>
          <div className="mt-3">
            <RatingBreakdown breakdown={stats.breakdown} total={stats.reviewCount} />
          </div>
        </div>
        <div className="card">
          <h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">
            Community signal
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">Upvotes</dt>
              <dd className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {stats.upvotes}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">Downvotes</dt>
              <dd className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {stats.downvotes}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">Net score</dt>
              <dd className="text-lg font-bold text-ink-900 dark:text-ink-50">
                {stats.netVotes >= 0 ? `+${stats.netVotes}` : stats.netVotes}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">Reviews</dt>
              <dd className="text-lg font-bold text-ink-900 dark:text-ink-50">
                {stats.reviewCount}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-ink-900 dark:text-ink-50">
          Leave a review
        </h2>
        <ReviewForm listingId={listing.id} />
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-ink-900 dark:text-ink-50">
          Verified reviews
        </h2>
        {reviews.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            description="Be the first verified human to share your experience."
          />
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id}>
                <ReviewItem
                  review={r}
                  isMine={user?.nullifier_hash === r.userId}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
