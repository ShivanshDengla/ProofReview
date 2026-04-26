import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { castVote, clearVote } from '../lib/db.js';

function Arrow({ dir }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: dir === 'down' ? 'rotate(180deg)' : undefined }}
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export default function VoteButtons({
  listingId,
  votes = [],
  size = 'sm',
  layout = 'horizontal',
}) {
  const { user, isVerified } = useAuth();
  const [busy, setBusy] = useState(false);

  const myVote = useMemo(() => {
    if (!user) return null;
    return (
      votes.find((v) => v.listingId === listingId && v.userId === user.nullifier_hash) ||
      null
    );
  }, [votes, listingId, user]);

  const upvotes = votes.filter((v) => v.listingId === listingId && v.type === 'upvote')
    .length;
  const downvotes = votes.filter(
    (v) => v.listingId === listingId && v.type === 'downvote',
  ).length;

  async function vote(type) {
    if (!isVerified || !user) return;
    if (busy) return;
    setBusy(true);
    try {
      if (myVote?.type === type) {
        await clearVote({ listingId, userId: user.nullifier_hash });
      } else {
        await castVote({ listingId, userId: user.nullifier_hash, type });
      }
    } finally {
      setBusy(false);
    }
  }

  const isUp = myVote?.type === 'upvote';
  const isDown = myVote?.type === 'downvote';

  const wrap =
    layout === 'vertical'
      ? 'flex flex-col items-center gap-1'
      : 'flex items-center gap-1';
  const padding = size === 'lg' ? 'px-3 py-2' : 'px-2 py-1.5';

  return (
    <div className={wrap}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          vote('upvote');
        }}
        disabled={!isVerified || busy}
        className={`inline-flex items-center gap-1 rounded-lg border ${padding} text-xs font-semibold transition ${
          isUp
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700'
        } disabled:cursor-not-allowed disabled:opacity-60`}
        aria-pressed={isUp}
        aria-label="Upvote"
        title={isVerified ? 'Upvote' : 'Verify with World ID to vote'}
      >
        <Arrow dir="up" />
        {upvotes}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          vote('downvote');
        }}
        disabled={!isVerified || busy}
        className={`inline-flex items-center gap-1 rounded-lg border ${padding} text-xs font-semibold transition ${
          isDown
            ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/60 dark:bg-rose-500/10 dark:text-rose-300'
            : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700'
        } disabled:cursor-not-allowed disabled:opacity-60`}
        aria-pressed={isDown}
        aria-label="Downvote"
        title={isVerified ? 'Downvote' : 'Verify with World ID to vote'}
      >
        <Arrow dir="down" />
        {downvotes}
      </button>
    </div>
  );
}
