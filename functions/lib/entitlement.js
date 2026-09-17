'use strict';

/**
 * S170 Phase 2 — the entitlement check.
 *
 * This is THE security win of the whole design (SECURITY_AUDIT_S115 §4 step 2):
 * before anything is signed, the server asks RevenueCat directly whether this
 * caller really holds Pro. The client's claim is never trusted, because the app
 * can be modified and the server cannot.
 *
 * Deliberately pure and dependency-free: `fetchImpl` is injected so the whole
 * thing is unit-testable with no network and no credentials.
 */

const REVENUECAT_API = 'https://api.revenuecat.com/v1/subscribers';

/**
 * Ask RevenueCat whether `appUserId` currently holds `entitlementId`.
 *
 * ⚠ `appUserId` is the FIREBASE UID. The app already calls
 * `Purchases.logIn(uid)` (src/Hooks/useAuth.ts:52, src/Hooks/usePurchases.ts:142),
 * so RevenueCat is keyed on the same uid the callable receives in
 * `request.auth.uid`. No mapping table is needed.
 *
 * @returns {Promise<{active: boolean, reason: string, expiresDate?: string|null, productIdentifier?: string}>}
 */
async function checkEntitlement({ appUserId, entitlementId, secretKey, fetchImpl, now = Date.now }) {
  if (!appUserId) return { active: false, reason: 'no-app-user-id' };
  if (!entitlementId) throw new Error('entitlementId is required');
  if (!secretKey) throw new Error('RevenueCat secret key is required');
  if (typeof fetchImpl !== 'function') throw new Error('fetchImpl is required');

  const url = `${REVENUECAT_API}/${encodeURIComponent(appUserId)}`;

  const res = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      Accept: 'application/json',
    },
  });

  // RevenueCat returns 404 for a subscriber it has never seen.
  if (res.status === 404) return { active: false, reason: 'no-subscriber' };

  if (res.status === 401 || res.status === 403) {
    // A bad/missing secret key must NEVER read as "not entitled" — that would be
    // a silent downgrade. Throw so the caller surfaces it as a server fault.
    throw new Error(`RevenueCat rejected the secret key (HTTP ${res.status})`);
  }

  if (!res.ok) {
    throw new Error(`RevenueCat request failed (HTTP ${res.status})`);
  }

  const body = await res.json();
  const entitlements = body && body.subscriber && body.subscriber.entitlements;
  if (!entitlements) return { active: false, reason: 'no-entitlements' };

  const ent = entitlements[entitlementId];
  if (!ent) return { active: false, reason: 'entitlement-absent' };

  // RevenueCat uses expires_date === null for a non-expiring (lifetime) grant.
  const expiresDate = Object.prototype.hasOwnProperty.call(ent, 'expires_date')
    ? ent.expires_date
    : null;

  if (expiresDate === null || expiresDate === undefined) {
    return {
      active: true,
      reason: 'lifetime',
      expiresDate: null,
      productIdentifier: ent.product_identifier,
    };
  }

  const expiresMs = Date.parse(expiresDate);
  if (Number.isNaN(expiresMs)) {
    // Unparseable date is NOT treated as active — fail closed.
    return { active: false, reason: 'unparseable-expiry', expiresDate };
  }

  const active = expiresMs > now();
  return {
    active,
    reason: active ? 'active' : 'expired',
    expiresDate,
    productIdentifier: ent.product_identifier,
  };
}

module.exports = { checkEntitlement, REVENUECAT_API };
