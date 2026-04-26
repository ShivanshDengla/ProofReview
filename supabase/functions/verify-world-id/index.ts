// Supabase Edge Function: verify-world-id
//
// Why this exists
// ---------------
// The Worldcoin Developer Portal verify endpoint
//   POST https://developer.worldcoin.org/api/v2/verify/{app_id}
// is intended to be called server-to-server. It does not return permissive
// CORS headers, so calling it directly from a browser (including the World
// App webview) fails with "Failed to fetch" / network_error.
//
// This function takes the proof from the client, forwards it to the Developer
// Portal from the edge, and returns the JSON response with proper CORS
// headers so a static SPA can talk to it.
//
// Deploy
// ------
//   supabase functions deploy verify-world-id --no-verify-jwt
//   supabase secrets set WORLD_APP_ID=app_xxxxxxxx WORLD_ACTION=verify-human
//
// `--no-verify-jwt` keeps the function callable from the SPA without
// requiring a Supabase auth session. (We're already gating on the World ID
// proof itself, which is the actual proof-of-personhood.)

// deno-lint-ignore-file no-explicit-any

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, code: "method_not_allowed" });
  }

  const APP_ID = Deno.env.get("WORLD_APP_ID");
  const DEFAULT_ACTION = Deno.env.get("WORLD_ACTION") ?? "verify-human";

  if (!APP_ID || !APP_ID.startsWith("app_")) {
    return json(500, {
      ok: false,
      code: "app_id_missing",
      detail:
        "WORLD_APP_ID is not configured on the edge function. Run `supabase secrets set WORLD_APP_ID=app_...`.",
    });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, {
      ok: false,
      code: "invalid_json",
      detail: "Request body must be JSON.",
    });
  }

  const required = [
    "proof",
    "merkle_root",
    "nullifier_hash",
    "verification_level",
  ] as const;
  for (const k of required) {
    if (!payload?.[k] || typeof payload[k] !== "string") {
      return json(400, {
        ok: false,
        code: "invalid_payload",
        detail: `Missing or invalid field: ${k}`,
      });
    }
  }

  const body: Record<string, string> = {
    nullifier_hash: payload.nullifier_hash,
    merkle_root: payload.merkle_root,
    proof: payload.proof,
    verification_level: payload.verification_level,
    action: typeof payload.action === "string" && payload.action.length > 0
      ? payload.action
      : DEFAULT_ACTION,
  };
  if (typeof payload.signal === "string" && payload.signal.length > 0) {
    body.signal = payload.signal;
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${APP_ID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  } catch (err) {
    return json(502, {
      ok: false,
      code: "upstream_unreachable",
      detail: (err as Error)?.message ??
        "Failed to reach the World Developer Portal.",
    });
  }

  let upstreamJson: any = null;
  try {
    upstreamJson = await upstream.json();
  } catch {
    /* portal may return empty body on success */
  }

  if (!upstream.ok) {
    return json(upstream.status, {
      ok: false,
      code: upstreamJson?.code ?? `http_${upstream.status}`,
      detail: upstreamJson?.detail ?? upstream.statusText ??
        "Verification failed.",
    });
  }

  return json(200, {
    ok: true,
    nullifier_hash: body.nullifier_hash,
    verification_level: body.verification_level,
    action: body.action,
  });
});
