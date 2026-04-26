import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ListingCard from '../components/ListingCard.jsx';
import { useListingsFeed } from '../hooks/useListings.js';
import { CATEGORIES } from '../lib/format.js';

const SORTS = [
  { id: 'trust', label: 'Most trusted' },
  { id: 'upvoted', label: 'Most upvoted' },
  { id: 'rated', label: 'Highest rated' },
  { id: 'recent', label: 'Newest' },
];

export default function Listings() {
  const { listings, rawVotes, isLoading } = useListingsFeed();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('trust');

  const filtered = useMemo(() => {
    let out = listings;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q),
      );
    }
    if (category !== 'All') {
      out = out.filter((l) => l.category === category);
    }
    out = [...out];
    if (sort === 'trust') out.sort((a, b) => b.trustScore - a.trustScore);
    else if (sort === 'upvoted') out.sort((a, b) => b.netVotes - a.netVotes);
    else if (sort === 'rated')
      out.sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount);
    else if (sort === 'recent') out.sort((a, b) => b.createdAt - a.createdAt);
    return out;
  }, [listings, search, category, sort]);

  return (
    <div className="container-app space-y-4 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
            Browse listings
          </h1>
          <p className="text-sm text-ink-500">
            {listings.length} listings · {filtered.length} shown
          </p>
        </div>
        <Link to="/new" className="btn-primary !px-3 !py-2 !text-xs sm:!text-sm">
          + Add
        </Link>
      </div>

      <div className="card space-y-3 !p-3">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
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
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Search businesses, products…"
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {['All', ...CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition ${
                category === c
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                sort === s.id
                  ? 'bg-ink-900 text-white dark:bg-ink-50 dark:text-ink-900'
                  : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && listings.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No listings match your filters"
          description="Try clearing the search or switching category."
          action={
            <Link to="/new" className="btn-primary">
              Add a listing
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((l) => (
            <li key={l.id}>
              <ListingCard listing={l} votes={rawVotes} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
