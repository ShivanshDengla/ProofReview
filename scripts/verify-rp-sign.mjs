// Verifies our rp-sign implementation against the published World ID test
// vectors at https://docs.world.org/world-id/idkit/signatures.
//
// Run: node scripts/verify-rp-sign.mjs
//
// This file mirrors the algorithm in supabase/functions/rp-sign/index.ts so
// that we can sanity-check it without deploying to Supabase. If both match,
// the edge function will produce signatures World App accepts.

import { keccak_256 } from '@noble/hashes/sha3';
import { secp256k1 } from '@noble/curves/secp256k1';

function hexToBytes(hex) {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}
function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function utf8(s) {
  return new TextEncoder().encode(s);
}
function concatBytes(...arrs) {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}
function u64BE(n) {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, BigInt(n), false);
  return buf;
}

function hashToField(input) {
  const h = keccak_256(input);
  const out = new Uint8Array(32);
  out[0] = 0;
  for (let i = 0; i < 31; i++) out[i + 1] = h[i];
  return out;
}

function computeMessage(nonce, createdAt, expiresAt, action) {
  const hasAction = typeof action === 'string' && action.length > 0;
  const msg = new Uint8Array(hasAction ? 81 : 49);
  msg[0] = 0x01;
  msg.set(nonce, 1);
  msg.set(u64BE(createdAt), 33);
  msg.set(u64BE(expiresAt), 41);
  if (hasAction) msg.set(hashToField(utf8(action)), 49);
  return msg;
}

function eip191Digest(msg) {
  const prefix = utf8(`\x19Ethereum Signed Message:\n${msg.length}`);
  return keccak_256(concatBytes(prefix, msg));
}

function signWithDeterministicNonce(signingKeyHex, nonce, createdAt, expiresAt, action) {
  const key = hexToBytes(signingKeyHex);
  const msg = computeMessage(nonce, createdAt, expiresAt, action);
  const digest = eip191Digest(msg);
  const sig = secp256k1.sign(digest, key); // canonical (lowS) by default
  const compact = sig.toCompactRawBytes();
  const v = (sig.recovery ?? 0) + 27;
  const sig65 = new Uint8Array(65);
  sig65.set(compact, 0);
  sig65[64] = v;
  return '0x' + bytesToHex(sig65);
}

let pass = 0;
let fail = 0;
function check(name, got, want) {
  const ok = got === want;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) {
    console.log(`     got:  ${got}`);
    console.log(`     want: ${want}`);
    fail++;
  } else {
    pass++;
  }
}

// ---- hash_to_field test vectors ----
check(
  'hash_to_field("")',
  '0x' + bytesToHex(hashToField(new Uint8Array(0))),
  '0x00c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a4',
);
check(
  'hash_to_field("test_signal")',
  '0x' + bytesToHex(hashToField(utf8('test_signal'))),
  '0x00c1636e0a961a3045054c4d61374422c31a95846b8442f0927ad2ff1d6112ed',
);
check(
  'hash_to_field([0x01,0x02,0x03])',
  '0x' + bytesToHex(hashToField(new Uint8Array([1, 2, 3]))),
  '0x00f1885eda54b7a053318cd41e2093220dab15d65381b1157a3633a83bfd5c92',
);
check(
  'hash_to_field("hello")',
  '0x' + bytesToHex(hashToField(utf8('hello'))),
  '0x001c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36dea',
);

// ---- compute_rp_signature_message test vectors ----
{
  const nonce = hexToBytes(
    '0x008ae1aa597fa146ebd3aa2ceddf360668dea5e526567e92b0321816a4e895bd',
  );
  const got = bytesToHex(computeMessage(nonce, 1700000000, 1700000300));
  check(
    'computeMessage(no action)',
    got,
    '01008ae1aa597fa146ebd3aa2ceddf360668dea5e526567e92b0321816a4e895bd000000006553f100000000006553f22c',
  );
  const got2 = bytesToHex(computeMessage(nonce, 1700000000, 1700000300, 'test-action'));
  check(
    'computeMessage(action="test-action")',
    got2,
    '01008ae1aa597fa146ebd3aa2ceddf360668dea5e526567e92b0321816a4e895bd000000006553f100000000006553f22c00aa0ce59768ae5b1c52f07a9387f14f09f277422c0d2f8a268c7bad0c60a46a',
  );
}

// ---- sign_request test vectors ----
{
  const random = new Uint8Array(32);
  for (let i = 0; i < 32; i++) random[i] = i;
  const nonce = hashToField(random);
  check(
    'sign nonce',
    '0x' + bytesToHex(nonce),
    '0x008ae1aa597fa146ebd3aa2ceddf360668dea5e526567e92b0321816a4e895bd',
  );

  const key =
    '0xabababababababababababababababababababababababababababababababab';
  const sigNoAction = signWithDeterministicNonce(key, nonce, 1700000000, 1700000300);
  check(
    'sign(no action)',
    sigNoAction,
    '0x14f693175773aed912852a601e9c0fd30f2afe2738d31388316232ce6f64ae9e4edbfb19d81c4229ba9c9fca78ede4b28956b7ba4415f08d957cbc1b3bdaa4021b',
  );
  const sigAction = signWithDeterministicNonce(
    key,
    nonce,
    1700000000,
    1700000300,
    'test-action',
  );
  check(
    'sign(action="test-action")',
    sigAction,
    '0x05594adb6c1495768a38d523d7d6ee6356b2c31231919198794ed022ade7d08f73753f83bd167067d99c9b969d28e9222315837c66af25867b041273a6d5056f1b',
  );
}

console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
