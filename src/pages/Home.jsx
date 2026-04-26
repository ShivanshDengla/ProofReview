import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useListingsFeed } from '../hooks/useListings.js';
import VerifyButton from '../components/VerifyButton.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';
import ListingCard from '../components/ListingCard.jsx';

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3 text-center shadow-soft dark:border-ink-800 dark:bg-ink-800/60">
      <div className="text-xl font-bold text-ink-900 dark:text-ink-50">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-ink-500">
        {label}
      </div>
    </div>
  );
}

export default function Home() {
  const { isVerified } = useAuth();
  const { listings, rawReviews, rawVotes } = useListingsFeed();

  const top = [...listings]
    .sort((a, b) => b.trustScore - a.trustScore)
    .slice(0, 3);

  const totalVerifiedReviews = rawReviews.length;
  const totalVerifiedVotes = rawVotes.filter((v) => v.type).length;

  return (
    <div className="container-app space-y-8 py-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 p-6 text-white shadow-soft-lg sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt=""
              aria-hidden="true"
              className="h-12 w-12 shrink-0 rounded-xl bg-white/15 p-1.5 shadow-soft backdrop-blur"
              draggable="false"
            />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
              </svg>
              Powered by World ID
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Real Reviews. <br className="sm:hidden" />
            Real Humans.
          </h1>
          <p className="mt-3 max-w-md text-base text-white/85 sm:text-lg">
            Discover and rate businesses with zero fake reviews. Each verified human
            gets exactly one voice — no bots, no spam, no sock puppets.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {isVerified ? (
              <>
                <VerifiedBadge size="lg" />
                <Link to="/listings" className="btn-secondary !bg-white !text-brand-700 hover:!bg-white/90">
                  Browse listings
                </Link>
              </>
            ) : (
              <>
                <VerifyButton label="Verify to start" />
                <Link
                  to="/listings"
                  className="btn-secondary !border-white/30 !bg-white/10 !text-white hover:!bg-white/20"
                >
                  Just browsing
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat value={listings.length} label="Listings" />
        <Stat value={totalVerifiedReviews} label="Reviews" />
        <Stat value={totalVerifiedVotes} label="Verified votes" />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-900 dark:text-ink-50">
              Most trusted
            </h2>
            <p className="text-sm text-ink-500">
              Ranked by verified rating + community votes.
            </p>
          </div>
          <Link
            to="/listings"
            className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300"
          >
            View all →
          </Link>
        </div>

        {top.length === 0 ? (
          <div className="card text-center text-sm text-ink-500">
            No listings yet — be the first to{' '}
            <Link to="/new" className="font-semibold text-brand-600 dark:text-brand-300">
              add one
            </Link>
            .
          </div>
        ) : (
          <ul className="space-y-3">
            {top.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} votes={rawVotes} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft dark:border-ink-800 dark:bg-ink-800/60">
        <h2 className="text-base font-bold text-ink-900 dark:text-ink-50">
          How ProofReview works
        </h2>
        <ol className="mt-3 space-y-2 text-sm text-ink-600 dark:text-ink-300">
          <li className="flex gap-2">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
              1
            </span>
            Verify with World ID — no email, no password, just proof of humanity.
          </li>
          <li className="flex gap-2">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
              2
            </span>
            Browse and review businesses, products, and services.
          </li>
          <li className="flex gap-2">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
              3
            </span>
            One human, one review, one vote — guaranteed by zero-knowledge proofs.
          </li>
        </ol>
      </section>
    </div>
  );
}
