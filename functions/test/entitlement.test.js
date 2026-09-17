'use strict';

/**
 * S170 Phase 2 — entitlement-check tests.
 *
 * No network, no credentials, no emulator: `fetchImpl` is injected.
 * Run: npm test   (uses Node's built-in test runner — no dev dependencies)
 *
 * The rule under test: a caller WITHOUT an active Pro entitlement must be
 * refused, and a server/credential fault must NEVER read as "not entitled".
 */

const test = require('node:test');
const assert = require('node:assert');
const { checkEntitlement } = require('../lib/entitlement');

const ENT = 'Lobster Log Pro';
const KEY = 'test-secret-not-a-real-key';
const NOW = () => Date.parse('2026-09-17T12:00:00Z');

function fakeFetch(status, body) {
  return async () => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
}

const base = { entitlementId: ENT, secretKey: KEY, now: NOW };

test('active future expiry → active', async () => {
  const r = await checkEntitlement({
    ...base,
    appUserId: 'uid-1',
    fetchImpl: fakeFetch(200, {
      subscriber: { entitlements: { [ENT]: { expires_date: '2027-01-01T00:00:00Z', product_identifier: 'pro_annual' } } },
    }),
  });
  assert.equal(r.active, true);
  assert.equal(r.reason, 'active');
});

test('expired entitlement → NOT active', async () => {
  const r = await checkEntitlement({
    ...base,
    appUserId: 'uid-2',
    fetchImpl: fakeFetch(200, {
      subscriber: { entitlements: { [ENT]: { expires_date: '2026-01-01T00:00:00Z' } } },
    }),
  });
  assert.equal(r.active, false);
  assert.equal(r.reason, 'expired');
});

test('lifetime (expires_date null) → active', async () => {
  const r = await checkEntitlement({
    ...base,
    appUserId: 'uid-3',
    fetchImpl: fakeFetch(200, { subscriber: { entitlements: { [ENT]: { expires_date: null } } } }),
  });
  assert.equal(r.active, true);
  assert.equal(r.reason, 'lifetime');
});

test('⭐ a DIFFERENT entitlement does not grant ours', async () => {
  const r = await checkEntitlement({
    ...base,
    appUserId: 'uid-4',
    fetchImpl: fakeFetch(200, {
      subscriber: { entitlements: { 'Some Other Thing': { expires_date: '2027-01-01T00:00:00Z' } } },
    }),
  });
  assert.equal(r.active, false);
  assert.equal(r.reason, 'entitlement-absent');
});

test('no entitlements at all → NOT active', async () => {
  const r = await checkEntitlement({
    ...base,
    appUserId: 'uid-5',
    fetchImpl: fakeFetch(200, { subscriber: { entitlements: {} } }),
  });
  assert.equal(r.active, false);
});

test('unknown subscriber (404) → NOT active, no throw', async () => {
  const r = await checkEntitlement({ ...base, appUserId: 'uid-6', fetchImpl: fakeFetch(404, {}) });
  assert.equal(r.active, false);
  assert.equal(r.reason, 'no-subscriber');
});

test('⚠ bad secret key (401) THROWS — never a silent "not entitled"', async () => {
  await assert.rejects(
    () => checkEntitlement({ ...base, appUserId: 'uid-7', fetchImpl: fakeFetch(401, {}) }),
    /rejected the secret key/
  );
});

test('⚠ RevenueCat outage (500) THROWS — never a silent "not entitled"', async () => {
  await assert.rejects(
    () => checkEntitlement({ ...base, appUserId: 'uid-8', fetchImpl: fakeFetch(500, {}) }),
    /HTTP 500/
  );
});

test('unparseable expiry fails CLOSED', async () => {
  const r = await checkEntitlement({
    ...base,
    appUserId: 'uid-9',
    fetchImpl: fakeFetch(200, { subscriber: { entitlements: { [ENT]: { expires_date: 'not-a-date' } } } }),
  });
  assert.equal(r.active, false);
  assert.equal(r.reason, 'unparseable-expiry');
});

test('missing appUserId → NOT active', async () => {
  const r = await checkEntitlement({ ...base, appUserId: '', fetchImpl: fakeFetch(200, {}) });
  assert.equal(r.active, false);
  assert.equal(r.reason, 'no-app-user-id');
});

test('the uid is what gets looked up, url-encoded', async () => {
  let seen = null;
  await checkEntitlement({
    ...base,
    appUserId: 'AHfUKx/uid with space',
    fetchImpl: async (url) => {
      seen = url;
      return { status: 404, ok: false, json: async () => ({}) };
    },
  });
  assert.ok(seen.endsWith('/AHfUKx%2Fuid%20with%20space'), `unexpected url: ${seen}`);
});

test('the secret key travels as a Bearer header, never in the url', async () => {
  let seenUrl = null;
  let seenAuth = null;
  await checkEntitlement({
    ...base,
    appUserId: 'uid-10',
    fetchImpl: async (url, opts) => {
      seenUrl = url;
      seenAuth = opts.headers.Authorization;
      return { status: 404, ok: false, json: async () => ({}) };
    },
  });
  assert.equal(seenAuth, `Bearer ${KEY}`);
  assert.ok(!seenUrl.includes(KEY), 'secret key must never appear in the URL');
});
