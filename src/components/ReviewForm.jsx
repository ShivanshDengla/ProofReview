import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createReview,
  findReviewByUser,
  updateReview,
} from '../lib/db.js';
import StarRating from './StarRating.jsx';
import VerifyButton from './VerifyButton.jsx';

export default function ReviewForm({ listingId, onSubmitted }) {
  const { user, isVerified } = useAuth();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [existing, setExisting] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!isVerified || !user) {
        setExisting(null);
        return;
      }
      const found = await findReviewByUser(listingId, user.nullifier_hash);
      if (cancelled) return;
      setExisting(found);
      if (found) {
        setRating(found.rating);
        setText(found.text);
      } else {
        setRating(0);
        setText('');
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [isVerified, user, listingId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isVerified || !user) {
      setError('Please verify with World ID first.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setError('Please choose a rating from 1 to 5 stars.');
      return;
    }
    if (text.trim().length < 4) {
      setError('Add a few words about your experience.');
      return;
    }
    setBusy(true);
    try {
      if (existing) {
        await updateReview(existing.id, { rating, text });
      } else {
        await createReview({
          listingId,
          rating,
          text,
          userId: user.nullifier_hash,
        });
      }
      setEditing(false);
      onSubmitted?.();
      // Re-check to flip into edit-mode UI immediately.
      const found = await findReviewByUser(listingId, user.nullifier_hash);
      setExisting(found);
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!isVerified) {
    return (
      <div className="card flex flex-col items-start gap-3 border-dashed">
        <div>
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">
            Want to leave a review?
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            Only verified humans can review. One human, one review — no fakes.
          </p>
        </div>
        <VerifyButton label="Verify with World ID" />
      </div>
    );
  }

  // Existing review and not editing -> show summary + edit button
  if (existing && !editing) {
    return (
      <div className="card border-dashed">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">
              You've reviewed this
            </h3>
            <p className="mt-1 text-xs text-ink-500">
              One human = one review. You can update yours anytime.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary !px-3 !py-1.5 !text-xs"
            onClick={() => setEditing(true)}
          >
            Edit review
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">
          {existing ? 'Update your review' : 'Leave a verified review'}
        </h3>
        <p className="mt-1 text-xs text-ink-500">
          Your World ID stays anonymous — only your nullifier hash is stored.
        </p>
      </div>

      <div>
        <span className="label">Your rating</span>
        <StarRating
          value={rating}
          size="lg"
          interactive
          onChange={setRating}
        />
      </div>

      <div>
        <label htmlFor="review-text" className="label">
          Your review
        </label>
        <textarea
          id="review-text"
          rows={4}
          maxLength={500}
          className="input resize-y"
          placeholder="What was your experience like?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-1 text-right text-[11px] text-ink-400">
          {text.length}/500
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        {existing && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setEditing(false);
              setRating(existing.rating);
              setText(existing.text);
            }}
            disabled={busy}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Submitting…' : existing ? 'Save changes' : 'Submit review'}
        </button>
      </div>
    </form>
  );
}
