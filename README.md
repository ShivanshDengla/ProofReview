# ProofReview

Real reviews. Real humans. A human-verified review and reputation platform built for **World Build 3**.

ProofReview lets people post businesses, products, and services, then collect reviews and votes — but only **verified humans** (via [World ID](https://docs.world.org/)) can review or vote. Each verified human's `nullifier_hash` is their unique identity, so it's literally one person → one review → one vote per listing. Storage is **Supabase** (Postgres + Realtime). There is **no** local fallback — if Supabase isn't connected, the app can't read or write.

## Stack

- **React 18 + Vite**, mobile-first
- **Tailwind CSS 3**
- **Supabase** (Postgres + Realtime) for storage
- **`@worldcoin/idkit`** + **`@worldcoin/minikit-js`** for proof-of-personhood
- **react-router-dom**

---

## Setup (10 minutes, beginner-friendly)

### 1. Install

```bash
npm install
```

### 2. Set up Supabase (your storage)

#### 2a. Create the project

1. Go to <https://supabase.com/dashboard> (you said you already have an account ✅).
2. Click **New project**. Pick a name (e.g. `proofreview`), set a database password (save it somewhere), pick the region closest to you, click **Create new project**. Wait ~1 minute for it to provision.

#### 2b. Create the tables

1. In your project's left sidebar, click **SQL Editor**.
2. Click **New query**.
3. Open the file [`supabase/schema.sql`](./supabase/schema.sql) in this repo, copy the **entire** contents, paste into the SQL editor, and click **Run** (▶ button, or `Cmd/Ctrl + Enter`).
4. You should see "Success. No rows returned." This created `users`, `listings`, `reviews`, `votes` tables, set up RLS policies, and enabled realtime.

You can verify by clicking **Table Editor** in the sidebar — you should see the four tables.

#### 2c. Grab your keys

1. In the sidebar, click **Project Settings** (the gear icon at the bottom).
2. Click **API**.
3. You need two values:
   - **Project URL** — looks like `https://abcdefghijklm.supabase.co`
   - **`anon` `public` key** — starts with `eyJ...` (it's a long JWT). This is the `anon` row, **not** the `service_role` row. Never put `service_role` in a frontend.

#### 2d. Paste them into `.env.local`

Open `.env.local` in this repo and fill in:

```bash
VITE_SUPABASE_URL=https://abcdefghijklm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

### 3. Set up World ID

1. Go to <https://developer.worldcoin.org/> and create an app.
2. Set verification level to **Orb**.
3. Add an **Action** with identifier `verify-human` (or pick your own and update `VITE_WORLD_ACTION` in `.env.local`).
4. Copy the `app_id` (e.g. `app_staging_xxxxxxxx`) and paste it into `.env.local`:

```bash
VITE_WORLD_APP_ID=app_staging_xxxxxxxx
VITE_WORLD_ACTION=verify-human
```

### 3b. Deploy the `verify-world-id` Edge Function (REQUIRED)

The Worldcoin Developer Portal's `/api/v2/verify/{app_id}` endpoint is meant
to be called **server-to-server** and does not return permissive CORS
headers, so calling it from the browser (including the World App webview)
fails with `Failed to fetch` / `network_error`.

ProofReview ships a tiny Supabase Edge Function in
[`supabase/functions/verify-world-id`](./supabase/functions/verify-world-id)
that does the server-side call for you. Deploy it once:

```bash
# Install the Supabase CLI if you don't have it: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref <your-project-ref>           # the part before .supabase.co

# Tell the function which World ID app + action to verify against.
supabase secrets set \
  WORLD_APP_ID=app_staging_xxxxxxxx \
  WORLD_ACTION=verify-human

# Deploy. --no-verify-jwt lets your SPA call it without a Supabase auth session
# (the World ID proof is the actual auth here).
supabase functions deploy verify-world-id --no-verify-jwt
```

After deploy, the client automatically calls
`${VITE_SUPABASE_URL}/functions/v1/verify-world-id`. No new client env vars
are required.

To sanity-check from your terminal:

```bash
curl -i -X POST \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"proof":"x","merkle_root":"x","nullifier_hash":"x","verification_level":"orb"}' \
  https://<your-project-ref>.supabase.co/functions/v1/verify-world-id
```

A bogus payload should return HTTP 400 with `{"ok":false,"code":...}` —
that's how you know the function is live and reachable.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:5173>. You should see a clean home page with **no listings yet** — you're starting from a fresh, real database. Tap **Verify with World ID**, complete the verification, and add your first listing.

If you see an amber banner at the top, it tells you what's still missing.

### 5. (Optional) Test inside World App

1. `ngrok http 5173`
2. Set the ngrok URL as your app's URL in the developer portal.
3. Open from World App on your phone — MiniKit takes over and gives you the native verification flow.

---

## Folder structure

```
src/
├── App.jsx                     # Routes + shell (with setup banner)
├── main.jsx                    # Entry, providers, MiniKit.install()
├── index.css                   # Tailwind + design tokens
├── lib/
│   ├── supabase.js             # Supabase client (no fallback)
│   ├── db.js                   # CRUD + realtime subscriptions
│   ├── worldId.js              # MiniKit boot + REAL proof verification
│   ├── format.js               # Categories, time-ago, hash shortener
│   └── trustScore.js           # 0–100 trust score formula
├── context/
│   ├── AuthContext.jsx         # Verified-human session
│   └── ThemeContext.jsx        # Dark/light toggle
├── hooks/
│   ├── useListings.js          # Aggregated feed (ratings + votes + trust)
│   └── useListing.js           # Single listing + breakdown
├── components/
│   ├── Header.jsx
│   ├── MobileNav.jsx
│   ├── SetupNotice.jsx         # "Supabase / World ID not configured" banner
│   ├── VerifyButton.jsx        # MiniKit + IDKit + portal verification
│   ├── VerifiedBadge.jsx
│   ├── ListingCard.jsx
│   ├── ReviewForm.jsx          # 1-human-1-review enforcement + edit mode
│   ├── ReviewItem.jsx
│   ├── RatingBreakdown.jsx
│   ├── StarRating.jsx
│   ├── VoteButtons.jsx         # Up/down + duplicate-vote prevention
│   ├── EmptyState.jsx
│   └── Logo.jsx
└── pages/
    ├── Home.jsx
    ├── Listings.jsx
    ├── ListingDetail.jsx
    ├── AddListing.jsx
    └── NotFound.jsx
supabase/
├── schema.sql                  # Run this once in the Supabase SQL editor
└── functions/
    └── verify-world-id/        # Edge Function that proxies the proof to
        └── index.ts            # developer.worldcoin.org (CORS-safe)
```

## Database schema (Postgres / Supabase)

```
users
  nullifier_hash text primary key
  verified       boolean default true
  created_at     timestamptz default now()

listings
  id          uuid primary key default gen_random_uuid()
  name        text
  category    text
  description text
  created_at  timestamptz default now()

reviews
  id         uuid primary key default gen_random_uuid()
  listing_id uuid references listings(id) on delete cascade
  user_id    text                                     -- nullifier_hash
  rating     int   check (rating between 1 and 5)
  text       text
  created_at timestamptz default now()
  UNIQUE (listing_id, user_id)                        -- one review per human per listing

votes
  id         text primary key                          -- "vote_<listing_id>_<user_id>"
  listing_id uuid references listings(id) on delete cascade
  user_id    text                                     -- nullifier_hash
  type       text  check (type in ('upvote','downvote'))
  created_at timestamptz default now()
  UNIQUE (listing_id, user_id)                        -- one vote per human per listing
```

The deterministic `votes.id` and the `UNIQUE` constraints on `(listing_id, user_id)` make duplicate reviews and duplicate votes physically impossible at the database layer.

## How verification gates work

- **Browse:** anyone can browse and read.
- **Add listing / review / vote:** require an active verified-human session (`AuthContext.isVerified`), which is only set after a successful World Developer Portal proof verification. The browser POSTs the proof to our `verify-world-id` Supabase Edge Function, which forwards it server-side to `POST https://developer.worldcoin.org/api/v2/verify/{app_id}`.
- **One human = one review:** `findReviewByUser` runs before submit; the form switches into _edit_ mode if the human already reviewed this listing.
- **One human = one vote:** the deterministic `votes.id` plus the unique `(listing_id, user_id)` constraint guarantee it.

## Real-time

Listings, reviews, and votes are subscribed via Supabase Realtime — when anyone, anywhere casts a vote or posts a review, every open browser updates within ~1 second. See `watchTable` in `src/lib/db.js`.

## Production hardening

The current Row-Level-Security policies allow anyone with the anon key to insert/update — fine for a hackathon since we trust the World ID gate at the app layer. For production:

1. Add a tiny backend (Supabase Edge Function works great) that re-verifies the World ID proof and signs a custom JWT containing the `nullifier_hash`.
2. Tighten RLS to require that JWT and check that `auth.jwt() ->> 'sub' = user_id` on writes.
3. Optional: store nullifier-replay protection in a `seen_nullifiers (action, nullifier_hash) UNIQUE` table.

## License

MIT.
