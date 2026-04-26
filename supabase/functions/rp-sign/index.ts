// Supabase Edge Function: rp-sign
//
// Signs a World ID 4.0 Relying Party (RP) request using the app's
// `signing_key` from the Developer Portal. The signature is then attached
// to the IDKit request as `rp_context` so World App can verify the request
// genuinely came from this app.
//
// SECURITY: the signing key is a SERVER SECRET. It must NEVER reach the
// browser. The client only sees the resulting `{ sig, nonce, created_at,
// expires_at }` tuple, which is per-request and short-lived.
//
// Algorithm spec: https://docs.world.org/world-id/idkit/signatures
// We implement the spec directly with @noble/hashes (keccak256) and
// @noble/curves (secp256k1) to avoid pulling the full IDKit npm package
// into the edge runtime.
//
// Deploy
// ------
//   supabase secrets set WORLD_SIGNING_KEY=0xYOUR_RP_SIGNING_KEY
//   supabase functions deploy rp-sign --no-verify-jwt

// deno-lint-ignore-file no-explicit-any

import { keccak_256 } from "npm:@noble/hashes@1.4.0/sha3";
import { secp256k1 } from "npm:@noble/curves@1.4.0/secp256k1";

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

// ---------- crypto helpers ----------

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") || hex.startsWith("0X")
    ? hex.slice(2)
    : hex;
  if (clean.length % 2 !== 0) throw new Error("invalid hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(clean.substr(i * 2, 2), 16);
    if (Number.isNaN(byte)) throw new Error("invalid hex digit");
    out[i] = byte;
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, "0");
  }
  return s;
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function concatBytes(...arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

function u64BE(n: number): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, BigInt(n), false);
  return buf;
}

// hash_to_field per spec:
//   h = keccak256(input)
//   n = big_endian_uint256(h) >> 8
//   return uint256_to_32bytes_be(n)
// Equivalent: 0x00 || h[0..30]  (drop last byte, prepend 0x00).
// Verified against doc test vector: hash_to_field("") =
// 0x00c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a4
function hashToField(input: Uint8Array): Uint8Array {
  const h = keccak_256(input);
  const out = new Uint8Array(32);
  out[0] = 0;
  for (let i = 0; i < 31; i++) out[i + 1] = h[i];
  return out;
}

// compute_rp_signature_message per spec.
// Layout:
//   msg[0]      = 0x01                       (version)
//   msg[1..32]  = nonce_bytes32              (32 bytes)
//   msg[33..40] = u64_to_be(created_at)      (8 bytes)
//   msg[41..48] = u64_to_be(expires_at)      (8 bytes)
//   msg[49..80] = hash_to_field(action)      (32 bytes, only if action set)
// Total length 49 (no action) or 81 (with action).
function computeMessage(
  nonce: Uint8Array,
  createdAt: number,
  expiresAt: number,
  action?: string,
): Uint8Array {
  if (nonce.length !== 32) throw new Error("nonce must be 32 bytes");
  const hasAction = typeof action === "string" && action.length > 0;
  const msg = new Uint8Array(hasAction ? 81 : 49);
  msg[0] = 0x01;
  msg.set(nonce, 1);
  msg.set(u64BE(createdAt), 33);
  msg.set(u64BE(expiresAt), 41);
  if (hasAction) {
    msg.set(hashToField(utf8(action!)), 49);
  }
  return msg;
}

// EIP-191: keccak256("\x19Ethereum Signed Message:\n" + dec(len(msg)) + msg)
function eip191Digest(msg: Uint8Array): Uint8Array {
  const prefix = utf8(`\x19Ethereum Signed Message:\n${msg.length}`);
  return keccak_256(concatBytes(prefix, msg));
}

function signRequest(
  signingKeyHex: string,
  action?: string,
  ttlSeconds = 300,
): {
  sig: string;
  nonce: string;
  createdAt: number;
  expiresAt: number;
} {
  const key = hexToBytes(signingKeyHex);
  if (key.length !== 32) throw new Error("signing key must be 32 bytes");

  const random = crypto.getRandomValues(new Uint8Array(32));
  const nonce = hashToField(random);

  const createdAt = Math.floor(Date.now() / 1000);
  const expiresAt = createdAt + ttlSeconds;

  const msg = computeMessage(nonce, createdAt, expiresAt, action);
  const digest = eip191Digest(msg);

  const sig = secp256k1.sign(digest, key); // canonical (lowS) by default
  const compact = sig.toCompactRawBytes(); // r || s, 64 bytes
  const v = (sig.recovery ?? 0) + 27;

  const sig65 = new Uint8Array(65);
  sig65.set(compact, 0);
  sig65[64] = v;

  return {
    sig: "0x" + bytesToHex(sig65),
    nonce: "0x" + bytesToHex(nonce),
    createdAt,
    expiresAt,
  };
}

// ---------- handler ----------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, code: "method_not_allowed" });
  }

  const SIGNING_KEY = Deno.env.get("WORLD_SIGNING_KEY");
  const DEFAULT_ACTION = Deno.env.get("WORLD_ACTION") ?? "verify-human";

  if (!SIGNING_KEY) {
    console.error("[rp-sign] WORLD_SIGNING_KEY secret is not set");
    return json(500, {
      ok: false,
      code: "signing_key_missing",
      detail:
        "WORLD_SIGNING_KEY is not configured on the edge function. Run `supabase secrets set WORLD_SIGNING_KEY=0x...`.",
    });
  }

  let payload: any = {};
  try {
    payload = (await req.json()) ?? {};
  } catch {
    /* empty body is allowed; we'll fall back to the default action */
  }

  const action: string =
    typeof payload.action === "string" && payload.action.length > 0
      ? payload.action
      : DEFAULT_ACTION;

  let signed;
  try {
    signed = signRequest(SIGNING_KEY, action);
  } catch (err) {
    console.error("[rp-sign] failed to sign:", err);
    return json(500, {
      ok: false,
      code: "sign_failed",
      detail: (err as Error)?.message ?? "Failed to sign RP request.",
    });
  }

  console.log(
    `[rp-sign] issued signature for action="${action}" expires_at=${signed.expiresAt}`,
  );

  // Field names match what the IDKit `rp_context` expects on the client.
  return json(200, {
    ok: true,
    action,
    sig: signed.sig,
    nonce: signed.nonce,
    created_at: signed.createdAt,
    expires_at: signed.expiresAt,
  });
});
