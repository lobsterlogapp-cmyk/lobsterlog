'use strict';

/**
 * S170 Phase 2 — provisionNavionics (SKELETON + ENTITLEMENT CHECK ONLY).
 *
 * Design: docs/SECURITY_AUDIT_S115.md §4, as corrected by the S168 status block.
 * Plan + phase order: LobsterLog_docs/GATE_S170_PURCHASE_FUNCTION.md §4.
 *
 * WHAT THIS FUNCTION IS
 *   It does NOT take money. The member pays at the App Store / Google Play through
 *   RevenueCat, and Pro access is granted from the RevenueCat entitlement BEFORE any
 *   Garmin call. This function authorises a CHART entitlement after a purchase that
 *   has already happened — so: no payment handling, no card data, no refund path.
 *
 * WHAT IS BUILT HERE (Phase 2)
 *   1. Callable, region-pinned.
 *   2. Firebase auth required.
 *   3. App Check required.
 *   4. ⭐ Server-side RevenueCat entitlement check — the security win.
 *
 * WHAT IS DELIBERATELY NOT BUILT YET
 *   Phase 3 — the RSA signer (ported verbatim; raw PKCS#1 v1.5 block-type-1, NO hash).
 *   Phase 4 — the Navionics POST.
 *   Neither the Garmin private key nor the Navionics developer tokens are read here,
 *   and no secret other than the RevenueCat key is declared.
 *
 * ⚠ user_id RULING (Jonathon, S170): Garmin's user_id becomes the FIREBASE UID,
 *   not the email. That is `request.auth.uid` below. Phase 4 sends it.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

const { checkEntitlement } = require('./lib/entitlement');
const { generateUUID, generateGarminEncryptedTransaction } = require('./lib/garminSign');
const { postPurchase } = require('./lib/navionicsClient');

// ⚠ Phase 4 declares the Garmin key and the Navionics developer tokens.
// ⚠⚠ NONE OF THESE VALUES ARE SET. Declaring a secret only tells Firebase the
// function WANTS it; the value is loaded separately by Jonathon, step by step,
// once Garmin has registered the new public key. Until then every call will fail
// cleanly at the "credential not loaded" guard below — it cannot half-work.
const REVENUECAT_SECRET_KEY = defineSecret('REVENUECAT_SECRET_KEY');
const GARMIN_PURCHASE_PRIVATE_KEY = defineSecret('GARMIN_PURCHASE_PRIVATE_KEY');
const NAVIONICS_TOKEN_IOS = defineSecret('NAVIONICS_TOKEN_IOS');
const NAVIONICS_TOKEN_ANDROID = defineSecret('NAVIONICS_TOKEN_ANDROID');

// Matches src/config/constants.ts — an identifier, not a secret.
const ENTITLEMENT_ID = 'Lobster Log Pro';

// Matches the dfo-elog database's region so everything sits in one place.
const REGION = 'northamerica-northeast1';

// ⚠ SANDBOX. Switching to the production Navionics host is a separate, deliberate
// decision — it is NOT part of this build. Overridable only for local fake-server
// testing, never set in a deployed configuration.
const NAVIONICS_BASE_URL =
  process.env.S170_NAVIONICS_BASE_URL || 'https://developers-store-sandbox.navionics.com';

/**
 * Read a declared secret, tolerating one that has never had a value set.
 *
 * Verified behaviour (firebase-functions 6.6.0): `.value()` on an unset secret
 * does NOT throw — it logs a WARNING and yields an empty value. The try/catch is
 * belt-and-braces against that changing; the `|| ''` is what actually does the work.
 * Phase 4 ships with the Garmin credentials DECLARED BUT UNSET on purpose, so this
 * has to degrade to '' and let the guard below refuse cleanly.
 */
function safeSecret(param) {
  try {
    return param.value() || '';
  } catch {
    return '';
  }
}

// Copied verbatim from src/utils/navionicsPurchase.ts:6-7 (Navionics product
// identifiers, confirmed by Mauro at S47 — identifiers, not secrets).
const NAVIONICS_PRODUCT_MONTHLY = '24d8a68d-5f52-11f1-9975-02b1eb525205';
const NAVIONICS_PRODUCT_ANNUAL = '24d6f56a-5f52-11f1-9975-02b1eb525205';
const KNOWN_PRODUCT_IDS = new Set([NAVIONICS_PRODUCT_MONTHLY, NAVIONICS_PRODUCT_ANNUAL]);

exports.provisionNavionics = onCall(
  {
    region: REGION,
    secrets: [
      REVENUECAT_SECRET_KEY,
      GARMIN_PURCHASE_PRIVATE_KEY,
      NAVIONICS_TOKEN_IOS,
      NAVIONICS_TOKEN_ANDROID,
    ],
    enforceAppCheck: true, // App Check is already integrated app-side (Play Integrity / DeviceCheck)
    cors: false,
  },
  async (request) => {
    // ── 1. Auth ────────────────────────────────────────────────────────────────
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'Sign-in required.');
    }
    const uid = request.auth.uid;

    // ── 2. App Check ───────────────────────────────────────────────────────────
    // enforceAppCheck rejects before we get here, but assert it so a future config
    // change cannot silently open the door.
    if (!request.app) {
      throw new HttpsError('failed-precondition', 'App Check token required.');
    }

    // ── 3. Input ───────────────────────────────────────────────────────────────
    const productId = request.data && request.data.productId;
    if (typeof productId !== 'string' || productId.length === 0) {
      throw new HttpsError('invalid-argument', 'productId is required.');
    }

    // ── 4. ⭐ THE ENTITLEMENT CHECK — the whole point ──────────────────────────
    let verdict;
    try {
      verdict = await checkEntitlement({
        appUserId: uid, // RevenueCat is keyed on the Firebase uid (Purchases.logIn)
        entitlementId: ENTITLEMENT_ID,
        secretKey: REVENUECAT_SECRET_KEY.value(),
        fetchImpl: globalThis.fetch,
      });
    } catch (err) {
      // A RevenueCat outage or a bad key is a SERVER fault, never "not entitled".
      logger.error('entitlement check failed', { uid, message: err.message });
      throw new HttpsError('internal', 'Could not verify the subscription.');
    }

    if (!verdict.active) {
      logger.warn('provision refused — no active entitlement', { uid, reason: verdict.reason });
      throw new HttpsError('permission-denied', 'No active Pro subscription.');
    }

    logger.info('entitlement verified', { uid, reason: verdict.reason });

    // ── 5. Credentials must actually be loaded ─────────────────────────────────
    // ⚠ The secrets are DECLARED but their values are NOT SET yet (Garmin has not
    // registered the new public key). Fail here, clearly and early, rather than
    // producing a signature with an empty key or a POST with an empty token.
    const garminKey = safeSecret(GARMIN_PURCHASE_PRIVATE_KEY);
    const platform = request.data && request.data.platform === 'ios' ? 'ios' : 'android';
    const developerToken = safeSecret(
      platform === 'ios' ? NAVIONICS_TOKEN_IOS : NAVIONICS_TOKEN_ANDROID
    );

    if (!garminKey || !developerToken) {
      logger.warn('provision unavailable — Garmin credentials not loaded', {
        uid,
        hasKey: Boolean(garminKey),
        hasToken: Boolean(developerToken),
        platform,
      });
      throw new HttpsError(
        'failed-precondition',
        'Chart provisioning is not available yet.'
      );
    }

    // ── 6. Sign ────────────────────────────────────────────────────────────────
    // ⚠ Raw PKCS#1 v1.5 block-type-1, NO hash. Proven byte-identical to the client
    // in test/signerParity.test.js. DO NOT convert this to an RSA-SHA1 signature.
    const plainTransactionId = generateUUID();
    let encryptedTransactionId;
    try {
      encryptedTransactionId = generateGarminEncryptedTransaction(plainTransactionId, garminKey);
    } catch (err) {
      logger.error('signing failed', { uid, message: err.message }); // never logs the key
      throw new HttpsError('internal', 'Could not authorise the chart entitlement.');
    }

    // ── 7. POST to Navionics ───────────────────────────────────────────────────
    // ⚠⚠ user_id is the FIREBASE UID (Jonathon's S170 ruling), not the email.
    const result = await postPurchase({
      encryptedTransactionId,
      plainTransactionId,
      productId,
      userId: uid,
      developerToken,
      fetchImpl: globalThis.fetch,
      baseUrl: NAVIONICS_BASE_URL,
    });

    if (!result.ok) {
      // 429 / 403 are Garmin's duplicate guards and are EXPECTED (proven S47) —
      // surfaced as a clean refusal, never as a crash.
      logger.warn('navionics refused', { uid, reason: result.reason, status: result.status });
      throw new HttpsError('unavailable', `Chart provisioning failed: ${result.reason}`);
    }

    logger.info('navionics provisioned', { uid, purchaseId: result.purchase.purchase_id });

    // Same shape the app already stores (navionicsStorage.NavionicsPurchase).
    return {
      status: 'provisioned',
      phase: 4,
      ...result.purchase,
    };
  }
);
