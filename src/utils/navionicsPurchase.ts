import { Platform } from 'react-native';
import forge from 'node-forge';
import { saveNavionicsPurchase, NavionicsPurchase } from './navionicsStorage';

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
 * Full Navionics purchase flow: generate a transaction-id pair, encrypt it, POST
 * to the Garmin store, and persist the response via saveNavionicsPurchase().
 * Never throws — a Garmin failure must not block access the user already paid for
 * via RevenueCat (the source of truth for access). Navionics is a feature layer on top.
 *
 * It used to return `null` for all four failures, which is why every failure was
 * invisible: the callers could not tell the causes apart and none of them looked.
 * It now returns a typed result. NOTHING about the purchase logic itself changed —
 * same order, same payload, same guards, same silence toward the caller's control flow.
 */
export async function runNavionicsPurchase(
  productId: string,
  userId: string
): Promise<NavionicsProvisionResult> {
  try {
    const purchasePrivateKey = process.env.EXPO_PUBLIC_GARMIN_PURCHASE_PRIVATE_KEY || '';
    if (!purchasePrivateKey) {
      console.log('❌ EXPO_PUBLIC_GARMIN_PURCHASE_PRIVATE_KEY is UNDEFINED in .env');
      return { ok: false, reason: 'missing-credential' };
    }

    const navionicsToken =
      Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_NAVIONICS_TOKEN_IOS
        : process.env.EXPO_PUBLIC_NAVIONICS_TOKEN_ANDROID;

    const transactionId = generateUUID();
    const encrypted64 = generateGarminEncryptedTransaction(transactionId, purchasePrivateKey);
    if (!encrypted64) {
      console.log('Aborting Navionics purchase: encryption failed.');
      return { ok: false, reason: 'encryption-failed' };
    }

    const response = await fetch(NAVIONICS_PURCHASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-navionics-developer-token': navionicsToken || '',
      },
      body: JSON.stringify({
        encrypted_transaction_id: encrypted64,
        plain_transaction_id: transactionId,
        purchase_type: 'PURCHASE',
        product_id: productId,
        user_id: userId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.log(`⚠️ Navionics purchase failed (${response.status}):`, data);
      return { ok: false, reason: 'store-rejected', status: response.status };
    }

    const purchase: NavionicsPurchase = {
      purchase_id: data.purchase_id,
      expiration_date: data.expiration_date,
      plain_transaction_id: transactionId,
      product_id: productId,
      stored_at: new Date().toISOString(),
    };
    await saveNavionicsPurchase(purchase);
    console.log('💾 Navionics purchase saved to storage:', data.purchase_id);
    return { ok: true, purchase };
  } catch (error) {
    console.log('Navionics purchase error:', error);
    return { ok: false, reason: 'network-error' };
  }
}
