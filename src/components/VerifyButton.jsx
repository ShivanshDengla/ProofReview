import { IDKitWidget, VerificationLevel } from '@worldcoin/idkit';
import { MiniKit } from '@worldcoin/minikit-js';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  ALLOW_MOCK_VERIFY,
  WORLD_ACTION,
  WORLD_APP_ID,
  ensureMiniKitInstalled,
  isInWorldApp,
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
 * Real World ID verification.
 *
 * Browser context  → IDKitWidget pops the QR / connect flow
 * World App context → MiniKit.commandsAsync.verify() runs the native flow
 *
 * In BOTH cases we forward the proof to the Worldcoin Developer Portal
 * (`/api/v2/verify/{app_id}`) and only sign the user in if the portal says
 * the proof is cryptographically valid for our app + action. The widget
 * handing us a payload does not, by itself, prove anything — only the portal
 * verification does.
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
  const [inWorldApp, setInWorldApp] = useState(false);

  useEffect(() => {
    setInWorldApp(ensureMiniKitInstalled());
    // MiniKit can finish initializing slightly after first paint.
    const t = setTimeout(() => setInWorldApp(isInWorldApp()), 250);
    return () => clearTimeout(t);
  }, []);

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

  // ----- shared post-verification handler -----
  async function finishVerification(rawPayload, source) {
    setBusy(true);
    setError('');
    try {
      const verification = await verifyWorldIdProof({
        proof: rawPayload.proof,
        merkle_root: rawPayload.merkle_root,
        nullifier_hash: rawPayload.nullifier_hash,
        verification_level:
          rawPayload.verification_level || VerificationLevel.Orb,
        action: WORLD_ACTION,
      });

      if (!verification.ok) {
        const msg =
          verification.code === 'app_id_missing'
            ? 'World ID app id is not configured. Set VITE_WORLD_APP_ID in .env.local.'
            : `Verification failed (${verification.code || 'unknown'}). ${verification.detail || ''}`;
        setError(msg);
        // eslint-disable-next-line no-console
        console.error('[ProofReview] World ID verification failed', {
          source,
          verification,
        });
        // Throwing here lets IDKit's handleVerify show its own error UI.
        throw new Error(msg);
      }

      await signIn({ nullifier_hash: verification.nullifier_hash });
    } finally {
      setBusy(false);
    }
  }

  // ----- IN-APP path: MiniKit -----
  async function handleMiniKitVerify() {
    setError('');
    if (!isWorldIdConfigured()) {
      setError(
        'World ID app id is not configured. Set VITE_WORLD_APP_ID in .env.local.',
      );
      return;
    }
    setBusy(true);
    try {
      const { finalPayload } = await MiniKit.commandsAsync.verify({
        action: WORLD_ACTION,
        verification_level: VerificationLevel.Orb,
      });
      if (!finalPayload || finalPayload.status === 'error') {
        const code = finalPayload?.error_code || 'unknown_error';
        setError(`World App returned an error: ${code}`);
        return;
      }
      await finishVerification(finalPayload, 'minikit');
    } catch (err) {
      setError(err?.message || 'Verification was cancelled or failed.');
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

  // ----- which UI to render -----
  // 1. Inside World App → MiniKit button
  if (inWorldApp) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <button
          type="button"
          onClick={handleMiniKitVerify}
          disabled={busy}
          className={buttonClass}
        >
          <ShieldIcon />
          {busy ? 'Verifying…' : label}
        </button>
        {error && (
          <p className="max-w-xs rounded-md bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}
      </div>
    );
  }

  // 2. Web browser, IDKit configured → real IDKit widget
  if (isWorldIdConfigured()) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <IDKitWidget
          app_id={WORLD_APP_ID}
          action={WORLD_ACTION}
          verification_level={VerificationLevel.Orb}
          handleVerify={async (proof) => {
            // Throw to reject the proof in the widget UI.
            await finishVerification(proof, 'idkit');
          }}
          onSuccess={() => {
            // Already handled in handleVerify; widget closes automatically.
          }}
        >
          {({ open }) => (
            <button
              type="button"
              onClick={() => {
                setError('');
                open();
              }}
              disabled={busy}
              className={buttonClass}
            >
              <ShieldIcon />
              {busy ? 'Verifying…' : label}
            </button>
          )}
        </IDKitWidget>
        {error && (
          <p className="max-w-xs rounded-md bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}
      </div>
    );
  }

  // 3. Not configured → show actionable hint (or dev-only mock if explicitly opted in)
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
            : 'Set VITE_WORLD_APP_ID in .env.local to enable World ID verification.'
        }
      >
        <ShieldIcon />
        {ALLOW_MOCK_VERIFY ? `${label} (dev mock)` : label}
      </button>
      <p className="max-w-xs rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
        {ALLOW_MOCK_VERIFY
          ? 'Dev-only mock active. Set a real VITE_WORLD_APP_ID and remove VITE_ALLOW_MOCK_VERIFY for production.'
          : 'World ID is not configured. Add VITE_WORLD_APP_ID from developer.worldcoin.org to .env.local to enable real verification.'}
      </p>
    </div>
  );
}
