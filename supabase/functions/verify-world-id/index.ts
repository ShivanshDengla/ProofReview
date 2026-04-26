// Supabase Edge Function: verify-world-id (World ID 4.0)
//
// Verifies a World ID 4.0 IDKit response by forwarding it to the Worldcoin
// Developer Portal v4 verify endpoint. The new endpoint accepts both 3.0 and
// 4.0 proofs (when `allow_legacy_proofs: true` is used on the client) and is
// keyed by the Relying Party id (`rp_id`), not the legacy `app_id`.
//
// Why an edge function and not a direct browser fetch:
// the Developer Portal verify endpoint is intended to be called
// server-to-server and does not return permissive CORS headers. The edge
// function is our backend.
//
// Deploy
// ------
//   supabase secrets set WORLD_RP_ID=rp_xxxxxxxx
//   # Optional: WORLD_APP_ID is no longer used here, only kept for logging
//   supabase functions deploy verify-world-id --no-verify-jwt

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

// IDKit returns multiple possible response shapes (3.0 uniqueness, 4.0
// uniqueness, 4.0 session). For storing per-human identity we want a single
// stable hex nullifier. Pick the first response and choose the right field.
function pickNullifier(idkitResponse: any): string | null {
  const responses = idkitResponse?.responses;
  if (!Array.isArray(responses) || responses.length === 0) return null;
  const first = responses[0];

  // 3.0 / 4.0 uniqueness proofs use `nullifier`.
  if (typeof first?.nullifier === "string" && first.nullifier.length > 0) {
    return first.nullifier;
  }
  // 4.0 session proofs use `session_nullifier` as a [nullifier, action] tuple.
  if (Array.isArray(first?.session_nullifier) && first.session_nullifier[0]) {
    return String(first.session_nullifier[0]);
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, code: "method_not_allowed" });
  }

  const RP_ID = Deno.env.get("WORLD_RP_ID");
  if (!RP_ID || !RP_ID.startsWith("rp_")) {
    console.error("[verify-world-id] WORLD_RP_ID is missing or malformed:", RP_ID);
    return json(500, {
      ok: false,
      code: "rp_id_missing",
      detail:
        "WORLD_RP_ID is not configured on the edge function. Run `supabase secrets set WORLD_RP_ID=rp_...`.",
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

  // Client posts { idkitResponse } — exactly the object IDKit returned to it.
  // We forward it verbatim per Worldcoin's spec (no field remapping).
  const idkitResponse = payload?.idkitResponse ?? payload;
  if (!idkitResponse || typeof idkitResponse !== "object") {
    return json(400, {
      ok: false,
      code: "invalid_payload",
      detail: "Missing `idkitResponse` in request body.",
    });
  }

  console.log(
    `[verify-world-id] forwarding to v4 rp_id=${RP_ID} protocol_version=${idkitResponse?.protocol_version} action=${idkitResponse?.action ?? "(session)"}`,
  );

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://developer.world.org/api/v4/verify/${RP_ID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(idkitResponse),
      },
    );
  } catch (err) {
    console.error("[verify-world-id] upstream fetch failed:", err);
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
    const debug = `rp_id=${RP_ID} protocol=${idkitResponse?.protocol_version} action=${idkitResponse?.action ?? "(session)"}`;
    console.warn(
      `[verify-world-id] upstream ${upstream.status} ${
        upstreamJson?.code ?? ""
      } ${debug} — ${upstreamJson?.detail ?? ""}`,
    );
    return json(upstream.status, {
      ok: false,
      code: upstreamJson?.code ?? `http_${upstream.status}`,
      detail: `${
        upstreamJson?.detail ?? upstream.statusText ?? "Verification failed."
      } (${debug})`,
      attempted: { rp_id: RP_ID },
    });
  }

  const nullifier = pickNullifier(idkitResponse);

  return json(200, {
    ok: true,
    nullifier_hash: nullifier,
    protocol_version: idkitResponse?.protocol_version ?? null,
    action: idkitResponse?.action ?? null,
  });
});
