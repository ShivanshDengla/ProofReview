// World ID configuration + real proof verification.
//
// Verification flow used by ProofReview:
// 1. Inside World App  → use MiniKit.commandsAsync.verify() (native, smooth)
// 2. In a browser      → use IDKitWidget (renders the QR / connect popup)
// 3. After EITHER       → POST the proof to our Supabase Edge Function
//                         `verify-world-id`, which forwards it server-side to
//                         the Worldcoin Developer Portal
//                         `/api/v2/verify/{app_id}` and returns the result.
//
// Why an edge function and not a direct browser fetch:
// the Developer Portal's verify endpoint is intended to be called
// server-to-server and does NOT return permissive CORS headers, so calling it
// from the browser (including the World App webview) fails with
// "Failed to fetch" / network_error. The edge function is our backend.

import { MiniKit } from '@worldcoin/minikit-js';

export const WORLD_APP_ID = import.meta.env.VITE_WORLD_APP_ID || '';
export const WORLD_ACTION =
  import.meta.env.VITE_WORLD_ACTION || 'verify-human';

// Mock mode is opt-in only and never auto-engages on a placeholder app id.
// You must explicitly set VITE_ALLOW_MOCK_VERIFY=true to enable it.
export const ALLOW_MOCK_VERIFY =
  String(import.meta.env.VITE_ALLOW_MOCK_VERIFY || '').toLowerCase() === 'true';

// Name of the Supabase Edge Function that proxies to the Developer Portal.
// Override with VITE_VERIFY_FUNCTION_NAME if you deploy it under a different
// name. Default matches `supabase/functions/verify-world-id/index.ts`.
export const VERIFY_FUNCTION_NAME =
  import.meta.env.VITE_VERIFY_FUNCTION_NAME || 'verify-world-id';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function verifyEndpoint() {
  const base = SUPABASE_URL.replace(/\/+$/, '');
  return `${base}/functions/v1/${VERIFY_FUNCTION_NAME}`;
}

function isVerifyBackendConfigured() {
  return Boolean(
    SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      SUPABASE_URL.startsWith('https://'),
  );
}

let miniKitInstalled = false;
let miniKitInstallTried = false;

/**
 * Idempotently install MiniKit. Safe to call multiple times.
 * Returns true if MiniKit is now usable (i.e. we are running inside World App).
 */
export function ensureMiniKitInstalled() {
  if (miniKitInstallTried) return miniKitInstalled;
  miniKitInstallTried = true;
  if (!WORLD_APP_ID) {
    miniKitInstalled = false;
    return false;
  }
  try {
    MiniKit.install(WORLD_APP_ID);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[ProofReview] MiniKit.install failed:', err);
  }
  miniKitInstalled = MiniKit.isInstalled();
  return miniKitInstalled;
}

export function isInWorldApp() {
  return ensureMiniKitInstalled();
}

export function isWorldIdConfigured() {
  return Boolean(WORLD_APP_ID && WORLD_APP_ID.startsWith('app_'));
}

/**
 * Verify a proof against the Worldcoin Developer Portal via our Supabase
 * Edge Function. This is what turns a raw proof into a trustworthy
 * "this is a verified unique human" signal.
 *
 * @param {{
 *   proof: string,
 *   merkle_root: string,
 *   nullifier_hash: string,
 *   verification_level: string,
 *   action?: string,
 *   signal?: string,
 * }} payload
 * @returns {Promise<{ ok: true, nullifier_hash: string } | { ok: false, code?: string, detail?: string }>}
 */
export async function verifyWorldIdProof(payload) {
  if (!isWorldIdConfigured()) {
    return {
      ok: false,
      code: 'app_id_missing',
      detail:
        'VITE_WORLD_APP_ID is not set. Add it from developer.worldcoin.org to enable real verification.',
    };
  }

  if (!isVerifyBackendConfigured()) {
    return {
      ok: false,
      code: 'verify_backend_missing',
      detail:
        'Supabase is not configured, so the verify-world-id Edge Function cannot be reached. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local and deploy the verify-world-id function.',
    };
  }

  const body = {
    nullifier_hash: payload.nullifier_hash,
    merkle_root: payload.merkle_root,
    proof: payload.proof,
    verification_level: payload.verification_level,
    action: payload.action || WORLD_ACTION,
  };
  if (payload.signal) body.signal = payload.signal;

  let res;
  try {
    res = await fetch(verifyEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Supabase Edge Functions require these on the client even when the
        // function is deployed with --no-verify-jwt.
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
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
    /* may be empty on success or on opaque error */
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

  return { ok: true, nullifier_hash: json.nullifier_hash };
}
