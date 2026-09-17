import { Platform } from 'react-native';
import forge from 'node-forge';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { saveNavionicsPurchase, NavionicsPurchase } from './navionicsStorage';

// S170 Phase 5 — the Cloud Function that now does the signing and the Garmin POST.
// Region is pinned to match the deployed function (and the dfo-elog database).
const PROVISION_FUNCTION = 'provisionNavionics';
const PROVISION_REGION = 'northamerica-northeast1';

// Navionics product IDs (Garmin developer store)
export const NAVIONICS_PRODUCT_MONTHLY = '24d8a68d-5f52-11f1-9975-02b1eb525205';
export const NAVIONICS_PRODUCT_ANNUAL = '24d6f56a-5f52-11f1-9975-02b1eb525205';

const NAVIONICS_PURCHASE_URL =
  'https://developers-store-sandbox.navionics.com/3rdparty/api/v1/purchase';

// Generates a valid UUID v4 string
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Encrypts transactionId with the Garmin purchase private key using
 * raw PKCS#1 v1.5 BLOCK TYPE 1 (forge ...encrypt(em, key, 0x01)).
 * NO SHA1. NO hashing. NO digest wrapper. This is the ONLY method the
 * Navionics server accepts — it returned 201 (purchase_id 207724) with it.
 * DO NOT change this to an RSA-SHA1 signature; the server will reject it.
 * The result is sent as encrypted_transaction_id in the purchase payload.
 */
export const generateGarminEncryptedTransaction = (
  transactionId: string,
  rawPrivateKey: string
): string | null => {
  try {
    const formattedKey = rawPrivateKey
      .replace(/^"|"$/g, '')
      .replace(/^'|'$/g, '')
      .replace(/\\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');

    const privateKey = forge.pki.privateKeyFromPem(formattedKey);
    const em = forge.util.encodeUtf8(transactionId);
    const signature = (forge.pki.rsa as any).encrypt(em, privateKey, 0x01);
    return forge.util.encode64(signature);
  } catch (error) {
    console.error('❌ Cryptography Error:', error);
    return null;
  }
};

/**
 * Why a provisioning attempt did not produce a Navionics purchase. Each value is a
 * DISTINCT, actionable cause — the caller decides what the user is told.
 *
 *   missing-credential  the Garmin signing credential is not present in this build
 *   encryption-failed   the credential is present but could not be parsed/used
 *   store-rejected      the Garmin store answered with a non-2xx status
 *   network-error       the request threw — offline, DNS, timeout, bad JSON
 *   tier-unresolved     NOT raised here. Raised by a CALLER that could not work out
 *                       which product to ask for (see resolveRestoredNavionicsProduct
 *                       in usePurchases). It lives in this union so one reason type
 *                       and one message map cover every provisioning failure.
 */
export type NavionicsFailureReason =
  | 'missing-credential'
  | 'encryption-failed'
  | 'store-rejected'
  | 'network-error'
  | 'tier-unresolved';

export type NavionicsProvisionResult =
  | { ok: true; purchase: NavionicsPurchase }
  | { ok: false; reason: NavionicsFailureReason; status?: number };

/**
 * Ask the SERVER to provision Navionics charts, and persist what it returns.
 *
 * ⭐ S170 PHASE 5 — THE SIGNING AND THE GARMIN POST NOW HAPPEN IN A CLOUD FUNCTION.
 * The private key is no longer in the app, in `.env`, or in any bundle: it lives in
 * Firebase Secret Manager and never leaves the server. This body used to sign a UUID
 * on the device and POST it to Garmin; it now calls `provisionNavionics` and stores
 * the result. (Founder ruling S168: the key lives server-side. Option A — an
 * `EXPO_PUBLIC_` variable baked into the binary — is rejected permanently.)
 *
 * ⚠ THE CONTRACT IS UNCHANGED, deliberately:
 *   - same signature, so the three call sites did not move;
 *   - same `NavionicsProvisionResult` union, so `navionicsNotice.ts` needed no edit;
 *   - still NEVER THROWS — a Garmin failure must not block access the user already
 *     paid for through RevenueCat, which remains the source of truth for access;
 *   - still the only `saveNavionicsPurchase()` call site.
 *
 * ⚠ `userId` IS NOW IGNORED. It is kept only so the callers compile unchanged.
 * The server uses `request.auth.uid` — Jonathon's S170 ruling that Garmin's `user_id`
 * is the Firebase uid, not the member's email address. Passing an email here no
 * longer sends one anywhere. Phase 7 removes the parameter along with the old signer.
 *
 * ⚠ The old on-device signer (`generateGarminEncryptedTransaction`, above) is
 * DELIBERATELY LEFT IN PLACE and is no longer called from here. It is removed in
 * Phase 7, once the function is proven live. Do not delete it early.
 */
export async function runNavionicsPurchase(
  productId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId: string
): Promise<NavionicsProvisionResult> {
  try {
    const callable = httpsCallable(
      getFunctions(getApp(), PROVISION_REGION),
      PROVISION_FUNCTION
    );

    // The server derives the Garmin user_id from the authenticated caller; the app
    // only says WHICH product and WHICH platform token to use.
    const response = await callable({ productId, platform: Platform.OS });
    const data: any = response?.data;

    if (!data || !data.purchase_id) {
      // A success response with nothing in it must not become an "active" entitlement.
      console.log('[navionics] function returned no purchase_id');
      return { ok: false, reason: 'store-rejected' };
    }

    const purchase: NavionicsPurchase = {
      purchase_id: data.purchase_id,
      expiration_date: data.expiration_date,
      plain_transaction_id: data.plain_transaction_id,
      product_id: data.product_id ?? productId,
      stored_at: new Date().toISOString(),
    };
    await saveNavionicsPurchase(purchase);
    console.log('💾 Navionics purchase saved to storage:', data.purchase_id);
    return { ok: true, purchase };
  } catch (error: any) {
    // The server speaks in Firebase error codes; this app speaks in
    // NavionicsFailureReason. Map rather than widen the union — `navionicsNotice.ts`
    // holds exhaustive Records over it, so a new reason would mean editing a second
    // file for no user-visible gain.
    //
    // ⚠ THE MAPPING RULE IS ABOUT HONESTY, NOT NEATNESS: 'store-rejected' and
    // 'network-error' render "check your connection". Anything that never reached
    // Garmin must therefore NOT map to those two, or a harvester is sent chasing a
    // problem on his boat that is really on our server.
    //
    //   unavailable        Garmin itself refused (429/403 duplicate guards, 5xx)
    //                        → store-rejected      (it DID reach Garmin)
    //   failed-precondition credentials not loaded yet
    //   permission-denied   RevenueCat says no active Pro
    //   unauthenticated     not signed in
    //   invalid-argument    our bug
    //   internal            signing failed, or RevenueCat could not be reached
    //                        → missing-credential  (none of these reached Garmin)
    //   anything else       transport/unknown → network-error
    //
    // ⚠ The reference codes a harvester quotes are coarser than the server's codes.
    // The precise code is logged here so support can decode it.
    const code: string = String(error?.code ?? '').replace(/^functions\//, '');
    console.log('[navionics] provision call failed. code:', code, 'message:', error?.message);

    if (code === 'unavailable') return { ok: false, reason: 'store-rejected' };
    if (
      code === 'failed-precondition' ||
      code === 'permission-denied' ||
      code === 'unauthenticated' ||
      code === 'invalid-argument' ||
      code === 'internal'
    ) {
      return { ok: false, reason: 'missing-credential' };
    }
    return { ok: false, reason: 'network-error' };
  }
}
