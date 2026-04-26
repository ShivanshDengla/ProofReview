// World ID 4.0 configuration + proof verification.
//
// Verification flow (works identically in browsers and inside World App,
// because IDKit v4 detects the World App webview and uses the native
// transport automatically — no MiniKit needed):
//
//   1. Browser asks our `rp-sign` Edge Function for an RP signature
//      (Edge function holds the signing_key as a server secret and signs
//       per the spec at https://docs.world.org/world-id/idkit/signatures).
//   2. Browser opens IDKitRequestWidget with that signature in `rp_context`.
//   3. User approves in World App, IDKit returns a proof payload.
//   4. Browser POSTs the IDKit response to our `verify-world-id` Edge
//      Function, which forwards it server-side to
//      POST https://developer.world.org/api/v4/verify/{rp_id}.
//   5. On success we call `signIn({ nullifier_hash })` to mark the user
//      as a verified human in our app's local session.

export const WORLD_APP_ID = import.meta.env.VITE_WORLD_APP_ID || '';
export const WORLD_RP_ID = import.meta.env.VITE_WORLD_RP_ID || '';
export const WORLD_ACTION =
  import.meta.env.VITE_WORLD_ACTION || 'verify-human';

// Whether to also accept legacy World ID 3.0 proofs alongside 4.0. We turn
// this on so users who haven't migrated their World App credentials yet can
// still verify — the v4 verify endpoint accepts both.
export const ALLOW_LEGACY_PROOFS =
  String(import.meta.env.VITE_WORLD_ALLOW_LEGACY_PROOFS ?? 'true').toLowerCase() !== 'false';

// Mock mode is opt-in only and never auto-engages on a placeholder app id.
// You must explicitly set VITE_ALLOW_MOCK_VERIFY=true to enable it.
export const ALLOW_MOCK_VERIFY =
  String(import.meta.env.VITE_ALLOW_MOCK_VERIFY || '').toLowerCase() === 'true';

// Names of the two Supabase Edge Functions backing this flow.
export const RP_SIGN_FUNCTION_NAME =
  import.meta.env.VITE_RP_SIGN_FUNCTION_NAME || 'rp-sign';
export const VERIFY_FUNCTION_NAME =
  import.meta.env.VITE_VERIFY_FUNCTION_NAME || 'verify-world-id';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function fnEndpoint(name) {
  const base = SUPABASE_URL.replace(/\/+$/, '');
  return `${base}/functions/v1/${name}`;
}

function isBackendConfigured() {
  return Boolean(
    SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      SUPABASE_URL.startsWith('https://'),
  );
}

export function isWorldIdConfigured() {
  return Boolean(
    WORLD_APP_ID &&
      WORLD_APP_ID.startsWith('app_') &&
      WORLD_RP_ID &&
      WORLD_RP_ID.startsWith('rp_'),
  );
}

function supabaseHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

/**
 * Ask our Edge Function for a fresh RP signature. The signing key never
 * leaves the server; we only get back a short-lived signed nonce + timestamps.
 *
 * @param {string} [action] - the action to bind into the signature
 * @returns {Promise<{ ok: true, rp_context: import('@worldcoin/idkit').RpContext } | { ok: false, code?: string, detail?: string }>}
 */
export async function fetchRpContext(action) {
  if (!isWorldIdConfigured()) {
    return {
      ok: false,
      code: 'world_id_misconfigured',
      detail:
        'VITE_WORLD_APP_ID and VITE_WORLD_RP_ID must be set in .env.local. Get them from developer.world.org.',
    };
  }
  if (!isBackendConfigured()) {
    return {
      ok: false,
      code: 'backend_missing',
      detail:
        'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and deploy the rp-sign + verify-world-id Edge Functions.',
    };
  }

  let res;
  try {
    res = await fetch(fnEndpoint(RP_SIGN_FUNCTION_NAME), {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ action: action || WORLD_ACTION }),
    });
  } catch (networkErr) {
    return {
      ok: false,
      code: 'network_error',
      detail:
        networkErr?.message ||
        `Failed to reach the ${RP_SIGN_FUNCTION_NAME} Edge Function. Make sure it is deployed.`,
    };
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok || !json?.ok) {
    return {
      ok: false,
      code: json?.code || `http_${res.status}`,
      detail:
        json?.detail || res.statusText || 'rp-sign Edge Function returned an error.',
    };
  }

  return {
    ok: true,
    rp_context: {
      rp_id: WORLD_RP_ID,
      nonce: json.nonce,
      created_at: json.created_at,
      expires_at: json.expires_at,
      signature: json.sig,
    },
  };
}

/**
 * Forward the IDKit response to our verify-world-id Edge Function, which
 * proxies to POST https://developer.world.org/api/v4/verify/{rp_id}.
 *
 * @param {import('@worldcoin/idkit').IDKitResult} idkitResponse
 * @returns {Promise<{ ok: true, nullifier_hash: string } | { ok: false, code?: string, detail?: string }>}
 */
export async function verifyWorldIdProof(idkitResponse) {
  if (!isWorldIdConfigured()) {
    return {
      ok: false,
      code: 'world_id_misconfigured',
      detail:
        'VITE_WORLD_APP_ID and VITE_WORLD_RP_ID must be set in .env.local.',
    };
  }
  if (!isBackendConfigured()) {
    return {
      ok: false,
      code: 'backend_missing',
      detail:
        'Supabase is not configured, so the verify-world-id Edge Function cannot be reached.',
    };
  }

  let res;
  try {
    res = await fetch(fnEndpoint(VERIFY_FUNCTION_NAME), {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ idkitResponse }),
    });
  } catch (networkErr) {
    return {
      ok: false,
      code: 'network_error',
      detail:
        networkErr?.message ||
        'Failed to reach the verify-world-id Edge Function. Make sure it is deployed.',
    };
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* may be empty */
  }

  if (!res.ok) {
    return {
      ok: false,
      code: json?.code || `http_${res.status}`,
      detail:
        json?.detail ||
        res.statusText ||
        'verify-world-id Edge Function returned an error.',
    };
  }

  if (!json || json.ok !== true) {
    return {
      ok: false,
      code: json?.code || 'verification_failed',
      detail: json?.detail || 'Verification failed.',
    };
  }

  if (!json.nullifier_hash) {
    return {
      ok: false,
      code: 'no_nullifier',
      detail: 'Verification succeeded but no nullifier was returned.',
    };
  }

  return { ok: true, nullifier_hash: json.nullifier_hash };
}
