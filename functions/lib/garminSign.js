'use strict';

/**
 * S170 Phase 3 — the Garmin purchase signer, ported SERVER-SIDE.
 *
 * ⚠⚠ PORTED VERBATIM from src/utils/navionicsPurchase.ts:29-51. The behaviour of
 * this file must stay byte-for-byte identical to the client's, because the client's
 * version is the one Navionics has actually accepted (HTTP 201, purchase_id 207724,
 * proven S44/S47 on a real device).
 *
 * ⚠⚠ THE WARNING THAT TRAVELS WITH THIS CODE — carried over unchanged:
 *
 *   Encrypts transactionId with the Garmin purchase private key using
 *   raw PKCS#1 v1.5 BLOCK TYPE 1 (forge ...encrypt(em, key, 0x01)).
 *   NO SHA1. NO hashing. NO digest wrapper. This is the ONLY method the
 *   Navionics server accepts — it returned 201 (purchase_id 207724) with it.
 *   DO NOT change this to an RSA-SHA1 signature; the server will reject it.
 *   The result is sent as encrypted_transaction_id in the purchase payload.
 *
 * The only deliberate differences from the client version:
 *   - it throws instead of returning null, so a failure cannot be mistaken for a
 *     successful empty signature by the caller;
 *   - it never console.errors the key or the error object.
 */

const forge = require('node-forge');

/** UUID v4, same shape the client generates. */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Normalise a PEM that may arrive quoted and/or with literal \n sequences —
 * identical to the client's normaliser, because a secret pasted into Secret
 * Manager can carry exactly the same quirks a .env value did.
 */
function normalisePem(rawPrivateKey) {
  return String(rawPrivateKey)
    .replace(/^"|"$/g, '')
    .replace(/^'|'$/g, '')
    .replace(/\\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * @returns {string} base64 of the raw PKCS#1 v1.5 block-type-1 result
 * @throws if the key will not parse or the operation fails — never returns null
 */
function generateGarminEncryptedTransaction(transactionId, rawPrivateKey) {
  if (typeof transactionId !== 'string' || transactionId.length === 0) {
    throw new Error('transactionId is required');
  }
  if (!rawPrivateKey) {
    throw new Error('Garmin purchase private key is required');
  }

  const formattedKey = normalisePem(rawPrivateKey);
  const privateKey = forge.pki.privateKeyFromPem(formattedKey);
  const em = forge.util.encodeUtf8(transactionId);
  const signature = forge.pki.rsa.encrypt(em, privateKey, 0x01);
  return forge.util.encode64(signature);
}

module.exports = { generateUUID, normalisePem, generateGarminEncryptedTransaction };
