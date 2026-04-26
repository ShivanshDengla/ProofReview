// Trust score blends average rating and verified-review volume.
// Output is 0–100. Uses a Bayesian-ish prior so listings with very few
// reviews don't shoot to the top with a single 5-star rating.

export function computeTrustScore({ avgRating, reviewCount, netVotes = 0 }) {
  const PRIOR_RATING = 3.5; // neutral baseline
  const PRIOR_WEIGHT = 4; // pretend there are 4 "neutral" reviews to start

  const blended =
    (avgRating * reviewCount + PRIOR_RATING * PRIOR_WEIGHT) /
    (reviewCount + PRIOR_WEIGHT);

  // Map 1–5 -> 0–80 baseline
  const ratingPart = ((blended - 1) / 4) * 80;

  // Up to +20 from popularity (verified votes net)
  const votePart = Math.max(0, Math.min(20, netVotes * 2));

  return Math.round(Math.max(0, Math.min(100, ratingPart + votePart)));
}

export function trustLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Trusted';
  if (score >= 50) return 'Promising';
  if (score >= 30) return 'Mixed';
  return 'New';
}
