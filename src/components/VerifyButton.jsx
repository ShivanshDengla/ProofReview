import { IDKitRequestWidget, orbLegacy } from '@worldcoin/idkit';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  ALLOW_LEGACY_PROOFS,
  ALLOW_MOCK_VERIFY,
  WORLD_ACTION,
  WORLD_APP_ID,
  fetchRpContext,
  isWorldIdConfigured,
  verifyWorldIdProof,
} from '../lib/worldId.js';

function ShieldIcon({ className = '' }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/**
 * World ID 4.0 verification button.
 *
 * Flow:
 *   1. Click → ask `rp-sign` Edge Function for an RP signature.
 *   2. Open IDKitRequestWidget with `rp_context` → user proves humanness in
 *      World App. IDKit auto-detects the World App webview and uses native
 *      transport there, otherwise it shows a QR / connect popup in browsers.
 *   3. handleVerify() → forward proof to `verify-world-id` Edge Function,
 *      which calls POST https://developer.world.org/api/v4/verify/{rp_id}.
 *   4. On success, sign the user in locally with the returned nullifier.
 *
 * The widget alone does NOT prove anything — only the v4 verify call does.
 * That is why we throw inside handleVerify on backend failure: it tells
 * IDKit to surface the error to the user instead of closing successfully.
 */
export default function VerifyButton({
  className = '',
  fullWidth = false,
  label = 'Verify with World ID',
  variant = 'primary',
}) {
  const { signIn, isVerified, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState(null);

  // Diagnostic logger — also shows on screen so we can debug in World App
  // (where the dev console isn't available). Status messages are short-lived
  // and replaced on every step.
  function trace(message, extra) {
    setStatus(message);
    // eslint-disable-next-line no-console
    console.log(`[ProofReview] ${message}`, extra ?? '');
  }

  const buttonClass =
    variant === 'primary'
      ? `btn-primary ${fullWidth ? 'w-full' : ''} ${className}`
      : `btn-secondary ${fullWidth ? 'w-full' : ''} ${className}`;

  // ----- already verified: show a sign-out chip -----
  if (isVerified) {
    return (
      <button
        type="button"
        onClick={signOut}
        className={`btn-secondary ${fullWidth ? 'w-full' : ''} ${className}`}
        title="Sign out (clears local verification)"
      >
        <ShieldIcon />
        Verified — Sign out
      </button>
    );
  }

  // ----- click: fetch RP signature, then open the widget -----
  async function handleStart() {
    if (busy) return;
    setError('');
    setStatus('');
    if (!isWorldIdConfigured()) {
      setError(
        'World ID is not configured. Set VITE_WORLD_APP_ID and VITE_WORLD_RP_ID in .env.local (and Vercel env vars).',
      );
      return;
    }
    setBusy(true);
    trace('1/4 requesting RP signature…');
    try {
      const result = await fetchRpContext(WORLD_ACTION);
      if (!result.ok) {
        setError(
          `Could not start verification (${result.code || 'unknown'}). ${
            result.detail || ''
          }`,
        );
        return;
      }
      trace('2/4 opening World ID widget…');
      setRpContext(result.rp_context);
      setOpen(true);
    } catch (err) {
      setError(err?.message || 'Could not start verification.');
    } finally {
      setBusy(false);
    }
  }

  // ----- IDKit handed us a proof: forward it to our verify backend -----
  async function handleVerify(idkitResult) {
    setError('');
    trace('3/4 received proof from World App, verifying server-side…', idkitResult);
    setBusy(true);
    try {
      const verification = await verifyWorldIdProof(idkitResult);
      if (!verification.ok) {
        const msg = `Verification failed (${verification.code || 'unknown'}). ${
          verification.detail || ''
        }`;
        setError(msg);
        // eslint-disable-next-line no-console
        console.error('[ProofReview] World ID verification failed', {
          verification,
        });
        // Throwing rejects the proof in the IDKit UI so the user sees an error.
        throw new Error(msg);
      }
      trace('4/4 verified, signing in…', verification);
      await signIn({ nullifier_hash: verification.nullifier_hash });
      trace('signed in!');
    } finally {
      setBusy(false);
    }
  }

  // ----- DEV-ONLY: explicit mock -----
  async function handleMockVerify() {
    setBusy(true);
    setError('');
    try {
      const stable =
        window.localStorage.getItem('proofreview:mockNullifier') ||
        `0xmock_${Math.random().toString(16).slice(2, 12)}`;
      window.localStorage.setItem('proofreview:mockNullifier', stable);
      await signIn({ nullifier_hash: stable });
    } finally {
      setBusy(false);
    }
  }

  // ----- not configured → hint, with optional dev mock -----
  if (!isWorldIdConfigured()) {
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          disabled={!ALLOW_MOCK_VERIFY || busy}
          onClick={ALLOW_MOCK_VERIFY ? handleMockVerify : undefined}
          className={`${buttonClass} ${!ALLOW_MOCK_VERIFY ? 'opacity-60' : ''}`}
          title={
            ALLOW_MOCK_VERIFY
              ? 'Dev-only mock verification — set VITE_ALLOW_MOCK_VERIFY=false in production.'
              : 'Set VITE_WORLD_APP_ID and VITE_WORLD_RP_ID in .env.local to enable World ID verification.'
          }
        >
          <ShieldIcon />
          {ALLOW_MOCK_VERIFY ? `${label} (dev mock)` : label}
        </button>
        <p className="max-w-xs rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          {ALLOW_MOCK_VERIFY
            ? 'Dev-only mock active. Set real VITE_WORLD_APP_ID + VITE_WORLD_RP_ID and remove VITE_ALLOW_MOCK_VERIFY for production.'
            : 'World ID is not configured. Add VITE_WORLD_APP_ID and VITE_WORLD_RP_ID from developer.world.org to .env.local.'}
        </p>
      </div>
    );
  }

  // ----- normal path -----
  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleStart}
        disabled={busy}
        className={buttonClass}
      >
        <ShieldIcon />
        {busy ? 'Verifying…' : label}
      </button>
      {rpContext && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setRpContext(null);
          }}
          app_id={WORLD_APP_ID}
          action={WORLD_ACTION}
          rp_context={rpContext}
          allow_legacy_proofs={ALLOW_LEGACY_PROOFS}
          preset={orbLegacy()}
          handleVerify={handleVerify}
          onSuccess={() => {
            // Already handled by handleVerify; widget will close automatically.
          }}
          onError={(err) => {
            // eslint-disable-next-line no-console
            console.warn('[ProofReview] IDKit error', err);
            setError(
              err?.message ||
                err?.code ||
                'Verification was cancelled or failed.',
            );
          }}
        />
      )}
      {status && !error && (
        <p className="max-w-xs rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-700 dark:bg-slate-700/30 dark:text-slate-200">
          {status}
        </p>
      )}
      {error && (
        <p className="max-w-xs rounded-md bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
