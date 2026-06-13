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
 * Full Navionics purchase flow: generate a transaction-id pair, encrypt it, POST
 * to the Garmin store, and persist the response via saveNavionicsPurchase().
 * Returns the stored purchase, or null on any failure. Never throws — failures are
 * logged silently so they cannot block the user, who already paid via RevenueCat
 * (the source of truth for access). Navionics is a feature layer on top.
 */
export async function runNavionicsPurchase(
  productId: string,
  userId: string
): Promise<NavionicsPurchase | null> {
  try {
    const purchasePrivateKey = process.env.EXPO_PUBLIC_GARMIN_PURCHASE_PRIVATE_KEY || '';
    if (!purchasePrivateKey) {
      console.log('❌ EXPO_PUBLIC_GARMIN_PURCHASE_PRIVATE_KEY is UNDEFINED in .env');
      return null;
    }

    const navionicsToken =
      Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_NAVIONICS_TOKEN_IOS
        : process.env.EXPO_PUBLIC_NAVIONICS_TOKEN_ANDROID;

    const transactionId = generateUUID();
    const encrypted64 = generateGarminEncryptedTransaction(transactionId, purchasePrivateKey);
    if (!encrypted64) {
      console.log('Aborting Navionics purchase: encryption failed.');
      return null;
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
      return null;
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
    return purchase;
  } catch (error) {
    console.log('Navionics purchase error:', error);
    return null;
  }
}
