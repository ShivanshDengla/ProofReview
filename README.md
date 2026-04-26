# ProofReview

Real reviews. Real humans. A human-verified review and reputation platform built for **World Build 3**.

ProofReview lets people post businesses, products, and services, then collect reviews and votes — but only **verified humans** (via [World ID](https://docs.world.org/)) can review or vote. Each verified human's `nullifier_hash` is their unique identity, so it's literally one person → one review → one vote per listing. Storage is **Supabase** (Postgres + Realtime). There is **no** local fallback — if Supabase isn't connected, the app can't read or write.

## Stack

- **React 18 + Vite**, mobile-first
- **Tailwind CSS 3**
- **Supabase** (Postgres + Realtime) for storage, plus 2 Edge Functions
- **World ID 4.0** via **`@worldcoin/idkit`** v4 (single SDK works on web _and_ inside the World App webview)
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

### 3. Set up World ID 4.0

ProofReview targets **World ID 4.0**. The flow is:

```
Browser → /functions/rp-sign  (server signs an RP request)
        → IDKit shows QR / native World App prompt
        → user proves humanness
Browser → /functions/verify-world-id  (server forwards to v4 verify)
```

#### 3a. Register the app

1. Go to <https://developer.world.org/> and create an app.
2. On the app page, click **Enable World ID 4.0** and complete RP registration.
3. Add an **Action** with identifier `verify-human` (or pick your own and update `VITE_WORLD_ACTION` in `.env.local`).
4. From the app page, copy these three values:
   - **App ID** (e.g. `app_xxxxxxxx`) → `VITE_WORLD_APP_ID`
   - **RP ID** (e.g. `rp_xxxxxxxx`) → `VITE_WORLD_RP_ID`
   - **Signing key** — server secret. Save it for step 3c. **Never** commit it
     or expose it to the browser. If it leaks, click **Reset signer key** in
     the dashboard and rotate.

```bash
VITE_WORLD_APP_ID=app_xxxxxxxx
VITE_WORLD_RP_ID=rp_xxxxxxxx
VITE_WORLD_ACTION=verify-human
```

#### 3b. Deploy both Edge Functions (REQUIRED)

The Developer Portal verify endpoint is server-to-server only and the
signing key must never reach the browser. ProofReview ships two tiny
Supabase Edge Functions to handle both responsibilities:

- [`supabase/functions/rp-sign`](./supabase/functions/rp-sign) — signs RP
  requests with `WORLD_SIGNING_KEY` per the
  [signing spec](https://docs.world.org/world-id/idkit/signatures).
- [`supabase/functions/verify-world-id`](./supabase/functions/verify-world-id)
  — proxies `POST https://developer.world.org/api/v4/verify/{rp_id}`.

```bash
# Install the Supabase CLI if you don't have it: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref <your-project-ref>           # the part before .supabase.co
```

#### 3c. Set the function secrets

```bash
supabase secrets set \
  WORLD_RP_ID=rp_xxxxxxxx \
  WORLD_SIGNING_KEY=0xYOUR_RP_SIGNING_KEY \
  WORLD_ACTION=verify-human
```

#### 3d. Deploy

```bash
# --no-verify-jwt lets the SPA call them without a Supabase auth session
# (the World ID proof is the actual auth here).
supabase functions deploy rp-sign --no-verify-jwt
supabase functions deploy verify-world-id --no-verify-jwt
```

After deploy, the client automatically calls
`${VITE_SUPABASE_URL}/functions/v1/rp-sign` and
`${VITE_SUPABASE_URL}/functions/v1/verify-world-id`.

#### 3e. Smoke-test from the terminal

```bash
# rp-sign should issue a real signature for any action you ask for.
curl -s -X POST \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"verify-human"}' \
  https://<your-project-ref>.supabase.co/functions/v1/rp-sign | jq .

# verify-world-id with a bogus payload should return HTTP 400 with
# {"ok":false,"code":...} — that means the function is live and reachable.
curl -i -X POST \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"idkitResponse":{}}' \
  https://<your-project-ref>.supabase.co/functions/v1/verify-world-id
```

### 4. Run

```bash
npm run dev
```

Open <http://localhost:5173>. You should see a clean home page with **no listings yet** — you're starting from a fresh, real database. Tap **Verify with World ID**, complete the verification, and add your first listing.

If you see an amber banner at the top, it tells you what's still missing.

### 5. (Optional) Test inside World App

1. `ngrok http 5173`
2. Set the ngrok URL as your app's URL in the developer portal.
3. Open from World App on your phone — IDKit v4 detects the World App webview and switches to the native transport automatically (no separate SDK needed).

---

## Folder structure

```
src/
├── App.jsx                     # Routes + shell (with setup banner)
├── main.jsx                    # Entry, providers
├── index.css                   # Tailwind + design tokens
├── lib/
│   ├── supabase.js             # Supabase client (no fallback)
│   ├── db.js                   # CRUD + realtime subscriptions
│   ├── worldId.js              # World ID 4.0 client: rp-sign + verify
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
│   ├── VerifyButton.jsx        # IDKitRequestWidget + v4 portal verification
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
    ├── rp-sign/                # Signs RP requests with WORLD_SIGNING_KEY
    │   └── index.ts
    └── verify-world-id/        # Proxies POST /api/v4/verify/{rp_id}
        └── index.ts
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
- **Add listing / review / vote:** require an active verified-human session (`AuthContext.isVerified`), which is only set after a successful World ID 4.0 proof verification. The browser:
  1. Calls our `rp-sign` Edge Function to get a signed RP context.
  2. Opens IDKit v4 with that context; the user proves humanness in World App.
  3. Forwards the IDKit response to our `verify-world-id` Edge Function, which calls `POST https://developer.world.org/api/v4/verify/{rp_id}` server-side.
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
