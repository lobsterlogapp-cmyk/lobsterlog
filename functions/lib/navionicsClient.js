'use strict';

/**
 * S170 Phase 4 — the Navionics purchase POST, ported server-side.
 *
 * Ported from src/utils/navionicsPurchase.ts:111-145. The request shape must stay
 * identical to the client's, because the client's is the one Navionics has actually
 * accepted (HTTP 201, proven S44/S47 on a real device).
 *
 * ⚠⚠ THE ONE DELIBERATE BEHAVIOUR CHANGE, ON JONATHON'S S170 RULING:
 *     `user_id` is the FIREBASE UID, not the member's email address.
 *     The client sent `auth.currentUser?.email`. It no longer will.
 *
 * ⚠ SANDBOX by default. The production host is a separate, later decision
 *   (`GATE_S170_PURCHASE_FUNCTION.md`), and switching it must be deliberate —
 *   which is why the host is a parameter with a sandbox default, not a bare constant.
 *
 * `fetchImpl` is injected so the whole thing is testable against a local fake
 * server with no credentials and nothing leaving the machine.
 */

const SANDBOX_HOST = 'https://developers-store-sandbox.navionics.com';
const PURCHASE_PATH = '/3rdparty/api/v1/purchase';

/**
 * @returns {Promise<{ok: true, purchase: object} | {ok: false, reason: string, status?: number}>}
 * Never throws for an expected failure — the caller decides what to surface.
 */
async function postPurchase({
  encryptedTransactionId,
  plainTransactionId,
  productId,
  userId, // ⚠ the Firebase uid
  developerToken,
  fetchImpl,
  baseUrl = SANDBOX_HOST,
  timeoutMs = 20000,
}) {
  if (!encryptedTransactionId) throw new Error('encryptedTransactionId is required');
  if (!plainTransactionId) throw new Error('plainTransactionId is required');
  if (!productId) throw new Error('productId is required');
  if (!userId) throw new Error('userId is required');
  if (!developerToken) throw new Error('developerToken is required');
  if (typeof fetchImpl !== 'function') throw new Error('fetchImpl is required');

  const url = `${baseUrl}${PURCHASE_PATH}`;

  // The client had no timeout at all. A server call must not hang a function
  // instance indefinitely, so one is added — a narrowing, not a shape change.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-navionics-developer-token': developerToken,
      },
      body: JSON.stringify({
        encrypted_transaction_id: encryptedTransactionId,
        plain_transaction_id: plainTransactionId,
        purchase_type: 'PURCHASE',
        product_id: productId,
        user_id: userId,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'network-error' };
  }
  clearTimeout(timer);

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null; // a non-JSON body must not crash the handler
  }

  if (!response.ok) {
    // ⚠ Mirrors the client: 429 TOO_MANY_REQUESTS and 403 "too many days still left"
    // are Garmin's duplicate guards and are EXPECTED, not faults (proven S47).
    return { ok: false, reason: 'store-rejected', status: response.status, body: data };
  }

  if (!data || !data.purchase_id) {
    // A 2xx with no purchase_id is not a success — fail closed rather than store
    // an empty record the app would treat as an active entitlement.
    return { ok: false, reason: 'no-purchase-id', status: response.status };
  }

  return {
    ok: true,
    purchase: {
      purchase_id: data.purchase_id,
      expiration_date: data.expiration_date,
      plain_transaction_id: plainTransactionId,
      product_id: productId,
    },
  };
}

module.exports = { postPurchase, SANDBOX_HOST, PURCHASE_PATH };
