'use strict';

/**
 * S170 Phase 4 — the callable's own guards, exercised end to end.
 *
 * ⚠⚠ THE ONE THAT MATTERS MOST RIGHT NOW: the Garmin credentials are DECLARED
 * BUT UNSET (Garmin has not registered the new public key). This proves the
 * function refuses **cleanly and early** in that state — it does not sign with an
 * empty key, does not POST with an empty token, and does not crash.
 *
 * ⚠ No network: the entitlement fetch is stubbed, and the Navionics host is pointed
 * at a dead port. Nothing leaves the machine.
 */

const test = require('node:test');
const assert = require('node:assert');

process.env.S170_NAVIONICS_BASE_URL = 'http://127.0.0.1:1'; // dead port, belt-and-braces

// ⚠ The RevenueCat secret must be present for these tests, or EVERY call fails at the
// entitlement step with 'internal' and the guards below are never reached — which would
// make several of them pass for entirely the wrong reason. (That happened on the first
// run of this file and is why this line exists.) A throwaway value: the fetch is stubbed,
// so it is never used against anything.
process.env.REVENUECAT_SECRET_KEY = 'test-only-not-a-real-key';

// ⚠⚠ GARMIN_PURCHASE_PRIVATE_KEY and the Navionics tokens are LEFT UNSET on purpose —
// that is the live situation this file is here to prove is safe.

const { provisionNavionics } = require('../index.js');

const ENT = 'Lobster Log Pro';

/** Stub global fetch so RevenueCat says "active" without any network. */
function stubEntitled(active = true) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({
    status: 200,
    ok: true,
    json: async () => ({
      subscriber: {
        entitlements: active ? { [ENT]: { expires_date: '2099-01-01T00:00:00Z' } } : {},
      },
    }),
  });
  return () => { globalThis.fetch = original; };
}

const req = (over = {}) => ({
  auth: { uid: 'AHfUKxuIPsOjrGaK0yujk1TpyFP2', token: {} },
  app: { appId: 'test' },
  data: { productId: '24d6f56a-5f52-11f1-9975-02b1eb525205', platform: 'android' },
  rawRequest: { headers: {} },
  ...over,
});

async function callAndCatch(request) {
  try {
    const value = await provisionNavionics.run(request);
    return { value };
  } catch (err) {
    return { code: err.code, message: err.message };
  }
}

test('⚠ no auth → unauthenticated', async () => {
  const r = await callAndCatch(req({ auth: null }));
  assert.match(String(r.code), /unauthenticated/);
});

test('⚠ no App Check token → failed-precondition', async () => {
  const r = await callAndCatch(req({ app: undefined }));
  assert.match(String(r.code), /failed-precondition/);
});

test('⚠ missing productId → invalid-argument', async () => {
  const r = await callAndCatch(req({ data: { platform: 'android' } }));
  assert.match(String(r.code), /invalid-argument/);
});

test('⚠ no active entitlement → permission-denied (the security win)', async () => {
  const restore = stubEntitled(false);
  try {
    const r = await callAndCatch(req());
    assert.match(String(r.code), /permission-denied/);
  } finally { restore(); }
});

test('⭐⭐ entitled BUT Garmin key unset → failed-precondition, clean refusal', async () => {
  const restore = stubEntitled(true);
  try {
    const r = await callAndCatch(req());
    assert.ok(r.code, `expected a refusal, got a value: ${JSON.stringify(r.value)}`);
    assert.match(String(r.code), /failed-precondition/);
    // The member-facing message must not leak internals.
    assert.match(r.message, /not available yet/i);
    assert.ok(!/key|secret|token|pem/i.test(r.message), 'message leaks credential wording');
  } finally { restore(); }
});

test('⭐ a RevenueCat outage is a SERVER fault, not "not entitled"', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 500, ok: false, json: async () => ({}) });
  try {
    const r = await callAndCatch(req());
    assert.match(String(r.code), /internal/);
    assert.ok(!/permission-denied/.test(String(r.code)), 'an outage must never read as unentitled');
  } finally { globalThis.fetch = original; }
});
