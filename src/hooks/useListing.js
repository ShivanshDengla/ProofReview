import { useEffect, useMemo, useState } from 'react';
import {
  watchAllVotes,
  watchListing,
  watchReviewsForListing,
} from '../lib/db.js';
import { average } from '../lib/format.js';
import { computeTrustScore } from '../lib/trustScore.js';

export function useListing(id) {
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loaded, setLoaded] = useState({ l: false, r: false, v: false });

  useEffect(() => {
    if (!id) return undefined;
    const u1 = watchListing(id, (next) => {
      setListing(next);
      setLoaded((s) => ({ ...s, l: true }));
    });
    const u2 = watchReviewsForListing(id, (next) => {
      setReviews(next);
      setLoaded((s) => ({ ...s, r: true }));
    });
    const u3 = watchAllVotes((next) => {
      setVotes(next.filter((v) => v.listingId === id));
      setLoaded((s) => ({ ...s, v: true }));
    });
    return () => {
      u1?.();
      u2?.();
      u3?.();
    };
  }, [id]);

  const stats = useMemo(() => {
    const upvotes = votes.filter((v) => v.type === 'upvote').length;
    const downvotes = votes.filter((v) => v.type === 'downvote').length;
    const avgRating = average(reviews.map((r) => r.rating));
    const reviewCount = reviews.length;
    const breakdown = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
    }));
    const netVotes = upvotes - downvotes;
    const trustScore = computeTrustScore({ avgRating, reviewCount, netVotes });
    return {
      upvotes,
      downvotes,
      netVotes,
      avgRating,
      reviewCount,
      breakdown,
      trustScore,
    };
  }, [reviews, votes]);

  return {
    listing,
    reviews: [...reviews].sort((a, b) => b.createdAt - a.createdAt),
    votes,
    stats,
    isLoading: !(loaded.l && loaded.r && loaded.v),
  };
}
