import { useEffect, useMemo, useState } from 'react';
import {
  watchAllReviews,
  watchAllVotes,
  watchListings,
} from '../lib/db.js';
import { average } from '../lib/format.js';
import { computeTrustScore } from '../lib/trustScore.js';

export function useListingsFeed() {
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loaded, setLoaded] = useState({ l: false, r: false, v: false });

  useEffect(() => {
    const u1 = watchListings((next) => {
      setListings(next);
      setLoaded((s) => ({ ...s, l: true }));
    });
    const u2 = watchAllReviews((next) => {
      setReviews(next);
      setLoaded((s) => ({ ...s, r: true }));
    });
    const u3 = watchAllVotes((next) => {
      setVotes(next);
      setLoaded((s) => ({ ...s, v: true }));
    });
    return () => {
      u1?.();
      u2?.();
      u3?.();
    };
  }, []);

  const enriched = useMemo(() => {
    return listings.map((l) => {
      const myReviews = reviews.filter((r) => r.listingId === l.id);
      const upvotes = votes.filter(
        (v) => v.listingId === l.id && v.type === 'upvote',
      ).length;
      const downvotes = votes.filter(
        (v) => v.listingId === l.id && v.type === 'downvote',
      ).length;
      const avgRating = average(myReviews.map((r) => r.rating));
      const reviewCount = myReviews.length;
      const netVotes = upvotes - downvotes;
      const trustScore = computeTrustScore({ avgRating, reviewCount, netVotes });
      return {
        ...l,
        avgRating,
        reviewCount,
        upvotes,
        downvotes,
        netVotes,
        trustScore,
      };
    });
  }, [listings, reviews, votes]);

  return {
    listings: enriched,
    isLoading: !(loaded.l && loaded.r && loaded.v),
    rawReviews: reviews,
    rawVotes: votes,
  };
}
