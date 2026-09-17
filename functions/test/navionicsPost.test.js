'use strict';

/**
 * S170 Phase 4 — the Navionics POST, against a FAKE LOCAL SERVER.
 *
 * ⚠⚠ NOTHING LEAVES THE MACHINE. A real `http.createServer` is started on
 * 127.0.0.1 and the client is pointed at it, so the genuine `fetch` path,
 * headers, JSON body and status handling are all exercised — but the only
 * host contacted is this process. **No call, sandbox or live, reaches Garmin.**
 *
 * The request SHAPE is what matters most here: Navionics accepted the client's
 * exact shape (HTTP 201, proven S44/S47), so the port must reproduce it field for
 * field — with one ruled exception: user_id is now the FIREBASE UID, not the email.
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const { postPurchase, SANDBOX_HOST, PURCHASE_PATH } = require('../lib/navionicsClient');

/** Start a fake Navionics on 127.0.0.1 that records what it was sent. */
async function fakeNavionics(handler) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
      seen.push({ method: req.method, url: req.url, headers: req.headers, body: parsed, raw });
      handler(req, res, parsed);
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    seen,
    close: () => new Promise((r) => server.close(r)),
  };
}

function ok201(_req, res) {
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ purchase_id: 210229, expiration_date: '2027-06-10T00:00:00Z' }));
}

const args = (overrides = {}) => ({
  encryptedTransactionId: 'BASE64SIGNATURE==',
  plainTransactionId: '11111111-2222-4333-8444-555555555555',
  productId: '24d6f56a-5f52-11f1-9975-02b1eb525205',
  userId: 'AHfUKxuIPsOjrGaK0yujk1TpyFP2', // a Firebase uid
  developerToken: 'fake-developer-token',
  fetchImpl: globalThis.fetch,
  ...overrides,
});

test('happy path: 201 → ok, with the purchase fields the app stores', async () => {
  const srv = await fakeNavionics(ok201);
  try {
    const r = await postPurchase(args({ baseUrl: srv.baseUrl }));
    assert.equal(r.ok, true);
    assert.equal(r.purchase.purchase_id, 210229);
    assert.equal(r.purchase.expiration_date, '2027-06-10T00:00:00Z');
    assert.equal(r.purchase.plain_transaction_id, '11111111-2222-4333-8444-555555555555');
    assert.equal(r.purchase.product_id, '24d6f56a-5f52-11f1-9975-02b1eb525205');
  } finally { await srv.close(); }
});

test('⭐ the request body matches the client field-for-field', async () => {
  const srv = await fakeNavionics(ok201);
  try {
    await postPurchase(args({ baseUrl: srv.baseUrl }));
    const body = srv.seen[0].body;
    assert.deepEqual(Object.keys(body).sort(), [
      'encrypted_transaction_id',
      'plain_transaction_id',
      'product_id',
      'purchase_type',
      'user_id',
    ]);
    assert.equal(body.purchase_type, 'PURCHASE');
    assert.equal(body.encrypted_transaction_id, 'BASE64SIGNATURE==');
  } finally { await srv.close(); }
});

test('⭐⭐ user_id is the FIREBASE UID and contains no "@" — the S170 ruling', async () => {
  const srv = await fakeNavionics(ok201);
  try {
    await postPurchase(args({ baseUrl: srv.baseUrl, userId: 'AHfUKxuIPsOjrGaK0yujk1TpyFP2' }));
    const body = srv.seen[0].body;
    assert.equal(body.user_id, 'AHfUKxuIPsOjrGaK0yujk1TpyFP2');
    assert.ok(!String(body.user_id).includes('@'), 'an email must never be sent as user_id');
  } finally { await srv.close(); }
});

test('⭐ the developer token travels in the header, never in the body or url', async () => {
  const srv = await fakeNavionics(ok201);
  try {
    await postPurchase(args({ baseUrl: srv.baseUrl, developerToken: 'SUPER-SECRET-TOKEN' }));
    const rec = srv.seen[0];
    assert.equal(rec.headers['x-navionics-developer-token'], 'SUPER-SECRET-TOKEN');
    assert.ok(!rec.raw.includes('SUPER-SECRET-TOKEN'), 'token leaked into the body');
    assert.ok(!rec.url.includes('SUPER-SECRET-TOKEN'), 'token leaked into the url');
  } finally { await srv.close(); }
});

test('it POSTs to the documented path with JSON content-type', async () => {
  const srv = await fakeNavionics(ok201);
  try {
    await postPurchase(args({ baseUrl: srv.baseUrl }));
    assert.equal(srv.seen[0].method, 'POST');
    assert.equal(srv.seen[0].url, PURCHASE_PATH);
    assert.equal(srv.seen[0].headers['content-type'], 'application/json');
  } finally { await srv.close(); }
});

test('⚠ 429 duplicate guard → clean refusal, not a crash (proven real at S47)', async () => {
  const srv = await fakeNavionics((_q, res) => {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'TOO_MANY_REQUESTS' }));
  });
  try {
    const r = await postPurchase(args({ baseUrl: srv.baseUrl }));
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'store-rejected');
    assert.equal(r.status, 429);
  } finally { await srv.close(); }
});

test('⚠ 403 "too many days still left" → clean refusal (also seen for real at S47)', async () => {
  const srv = await fakeNavionics((_q, res) => {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'FORBIDDEN' }));
  });
  try {
    const r = await postPurchase(args({ baseUrl: srv.baseUrl }));
    assert.equal(r.ok, false);
    assert.equal(r.status, 403);
  } finally { await srv.close(); }
});

test('500 → clean refusal', async () => {
  const srv = await fakeNavionics((_q, res) => { res.writeHead(500); res.end('{}'); });
  try {
    const r = await postPurchase(args({ baseUrl: srv.baseUrl }));
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'store-rejected');
  } finally { await srv.close(); }
});

test('⭐ a 2xx with NO purchase_id fails CLOSED — never stores an empty entitlement', async () => {
  const srv = await fakeNavionics((_q, res) => {
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ expiration_date: '2027-01-01T00:00:00Z' }));
  });
  try {
    const r = await postPurchase(args({ baseUrl: srv.baseUrl }));
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'no-purchase-id');
  } finally { await srv.close(); }
});

test('a non-JSON 200 body does not crash the handler', async () => {
  const srv = await fakeNavionics((_q, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html>nope</html>');
  });
  try {
    const r = await postPurchase(args({ baseUrl: srv.baseUrl }));
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'no-purchase-id');
  } finally { await srv.close(); }
});

test('⚠ a hung server times out and refuses cleanly', async () => {
  const srv = await fakeNavionics(() => { /* never responds */ });
  try {
    const r = await postPurchase(args({ baseUrl: srv.baseUrl, timeoutMs: 250 }));
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'timeout');
  } finally { await srv.close(); }
});

test('an unreachable host refuses cleanly, no throw', async () => {
  const r = await postPurchase(args({ baseUrl: 'http://127.0.0.1:1' }));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'network-error');
});

test('missing inputs throw rather than POSTing a half-formed request', async () => {
  await assert.rejects(() => postPurchase(args({ userId: '' })), /userId is required/);
  await assert.rejects(() => postPurchase(args({ developerToken: '' })), /developerToken is required/);
  await assert.rejects(() => postPurchase(args({ encryptedTransactionId: '' })), /encryptedTransactionId/);
});

test('⚠ the default host is the SANDBOX — production is a deliberate later change', () => {
  assert.equal(SANDBOX_HOST, 'https://developers-store-sandbox.navionics.com');
  assert.ok(!SANDBOX_HOST.includes('developers-store.navionics.com'));
});
