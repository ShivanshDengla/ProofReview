// Single source of truth for all data: Supabase (Postgres + realtime).
// No mock fallback — if Supabase isn't configured the app refuses to read/write
// and the SetupNotice tells the user how to fix it.

import { isSupabaseConfigured, supabase } from './supabase.js';

class NotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
    );
    this.code = 'supabase_not_configured';
  }
}

function requireClient() {
  if (!isSupabaseConfigured || !supabase) throw new NotConfiguredError();
  return supabase;
}

// ---------- normalizers (snake_case → camelCase) ----------

function tsToMillis(s) {
  if (!s) return Date.now();
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

function normalizeListing(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    createdAt: tsToMillis(row.created_at),
  };
}

function normalizeReview(row) {
  return {
    id: row.id,
    listingId: row.listing_id,
    userId: row.user_id,
    rating: row.rating,
    text: row.text,
    createdAt: tsToMillis(row.created_at),
  };
}

function normalizeVote(row) {
  return {
    id: row.id,
    listingId: row.listing_id,
    userId: row.user_id,
    type: row.type,
  };
}

// ---------- helper: fetch + realtime subscribe pattern ----------
//
// Each watch* function does an initial SELECT and then subscribes to all
// changes on the relevant table, refetching the slice it cares about whenever
// anything changes. This keeps the code simple and guarantees the UI always
// reflects what's actually in Postgres.

function watchTable({ table, fetchFn, onChange }) {
  if (!isSupabaseConfigured || !supabase) {
    onChange([]);
    return () => {};
  }

  let cancelled = false;

  async function refresh() {
    try {
      const rows = await fetchFn();
      if (!cancelled) onChange(rows);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[ProofReview] Failed to load ${table}:`, err);
      if (!cancelled) onChange([]);
    }
  }

  refresh();

  const channel = supabase
    .channel(`pr_${table}_${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      () => refresh(),
    )
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

// ---------- listings ----------

export async function createListing({ name, category, description }) {
  const client = requireClient();
  const { data, error } = await client
    .from('listings')
    .insert({
      name: name.trim(),
      category,
      description: description.trim(),
    })
    .select()
    .single();
  if (error) throw error;
  return normalizeListing(data);
}

export function watchListings(onChange) {
  return watchTable({
    table: 'listings',
    onChange,
    fetchFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizeListing);
    },
  });
}

export function watchListing(id, onChange) {
  return watchTable({
    table: 'listings',
    onChange: (rows) => {
      const found = rows.find((r) => r.id === id) || null;
      onChange(found);
    },
    fetchFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      return (data || []).map(normalizeListing);
    },
  });
}

// ---------- reviews ----------

export async function createReview({ listingId, rating, text, userId }) {
  const client = requireClient();
  const { data, error } = await client
    .from('reviews')
    .insert({
      listing_id: listingId,
      rating: Number(rating),
      text: text.trim(),
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return normalizeReview(data);
}

export async function updateReview(id, { rating, text }) {
  const client = requireClient();
  const { data, error } = await client
    .from('reviews')
    .update({ rating: Number(rating), text: text.trim() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return normalizeReview(data);
}

export async function findReviewByUser(listingId, userId) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('listing_id', listingId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? normalizeReview(data) : null;
}

export function watchReviewsForListing(listingId, onChange) {
  return watchTable({
    table: 'reviews',
    onChange,
    fetchFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizeReview);
    },
  });
}

export function watchAllReviews(onChange) {
  return watchTable({
    table: 'reviews',
    onChange,
    fetchFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizeReview);
    },
  });
}

// ---------- votes ----------

export async function castVote({ listingId, userId, type }) {
  const client = requireClient();
  const id = `vote_${listingId}_${userId}`;
  const { data, error } = await client
    .from('votes')
    .upsert(
      { id, listing_id: listingId, user_id: userId, type },
      { onConflict: 'id' },
    )
    .select()
    .single();
  if (error) throw error;
  return normalizeVote(data);
}

export async function clearVote({ listingId, userId }) {
  const client = requireClient();
  const id = `vote_${listingId}_${userId}`;
  const { error } = await client.from('votes').delete().eq('id', id);
  if (error) throw error;
  return { id, listingId, userId, type: null };
}

export function watchAllVotes(onChange) {
  return watchTable({
    table: 'votes',
    onChange,
    fetchFn: async () => {
      const { data, error } = await supabase.from('votes').select('*');
      if (error) throw error;
      return (data || []).map(normalizeVote);
    },
  });
}

// ---------- users ----------

export async function upsertUser({ nullifier_hash }) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from('users')
    .upsert(
      { nullifier_hash, verified: true },
      { onConflict: 'nullifier_hash' },
    )
    .select()
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[ProofReview] upsertUser failed:', error);
    return null;
  }
  return data;
}
