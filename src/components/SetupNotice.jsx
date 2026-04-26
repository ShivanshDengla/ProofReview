import { isSupabaseConfigured } from '../lib/supabase.js';
import { ALLOW_MOCK_VERIFY, isWorldIdConfigured } from '../lib/worldId.js';

export default function SetupNotice() {
  const worldOk = isWorldIdConfigured();
  const supaOk = isSupabaseConfigured;

  if (worldOk && supaOk && !ALLOW_MOCK_VERIFY) return null;

  const lines = [];
  if (!supaOk) {
    lines.push(
      <span key="supa">
        <strong>Supabase not configured.</strong> Set{' '}
        <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
        <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> in{' '}
        <code className="font-mono">.env.local</code> — see README.
      </span>,
    );
  }
  if (!worldOk) {
    lines.push(
      <span key="world">
        <strong>World ID not configured.</strong> Set{' '}
        <code className="font-mono">VITE_WORLD_APP_ID</code> in{' '}
        <code className="font-mono">.env.local</code>.
      </span>,
    );
  }
  if (worldOk && supaOk && ALLOW_MOCK_VERIFY) {
    lines.push(
      <span key="mock">
        <strong>Dev-only mock verification is enabled.</strong> Disable{' '}
        <code className="font-mono">VITE_ALLOW_MOCK_VERIFY</code> before
        shipping.
      </span>,
    );
  }

  return (
    <div
      role="status"
      className="border-b border-amber-300/70 bg-amber-50 px-4 py-2 text-center text-[11px] font-medium text-amber-900 dark:border-amber-700/60 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <div className="container-app flex flex-col gap-0.5">
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
