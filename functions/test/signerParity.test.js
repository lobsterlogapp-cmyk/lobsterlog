'use strict';

/**
 * S170 Phase 3 — ⭐ THE PARITY TEST.
 *
 * The single most valuable test in this build: it proves the server-side port
 * produces a BYTE-IDENTICAL signature to the code Navionics has actually accepted.
 *
 * The failure it exists to catch is the one the client's own JSDoc warns about in
 * capitals: converting the raw PKCS#1 v1.5 block-type-1 operation into an RSA-SHA1
 * signature. Both "work". Only one is accepted by Garmin. A unit test that only
 * checked "returns a base64 string" would pass either.
 *
 * HOW THE CLIENT SIDE IS OBTAINED — this matters for the test to mean anything:
 *   The real client file cannot be imported here (it pulls in react-native).
 *   So the function's SOURCE TEXT is read out of the actual repo file and evaluated,
 *   rather than retyped into this test. Three documented, mechanical TypeScript strips
 *   are applied, and the extracted text is asserted to still contain the operative
 *   markers — so a silent extraction failure cannot masquerade as a pass.
 *
 * THE KEY: generated fresh into a temp directory by the test's own setup script,
 * used, then deleted. ⚠ The REAL keys in ~/Documents/LobsterLog_KEYS are never read.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const forge = require('node-forge');

const server = require('../lib/garminSign');

const CLIENT_SRC = '/Users/jonny/Desktop/LobsterLog/src/utils/navionicsPurchase.ts';
const THROWAWAY_KEY = process.env.S170_THROWAWAY_KEY;

/** Pull generateGarminEncryptedTransaction out of the real .ts and make it runnable. */
function loadClientSigner() {
  const src = fs.readFileSync(CLIENT_SRC, 'utf8');

  const start = src.indexOf('export const generateGarminEncryptedTransaction');
  assert.ok(start !== -1, 'could not find the client signer in the real source file');
  const end = src.indexOf('\n};', start);
  assert.ok(end !== -1, 'could not find the end of the client signer');
  const raw = src.slice(start, end + 3);

  // The operative lines must survive extraction, or this test proves nothing.
  assert.ok(raw.includes('privateKeyFromPem'), 'extract lost privateKeyFromPem');
  assert.ok(raw.includes('encodeUtf8'), 'extract lost encodeUtf8');
  assert.ok(raw.includes('encrypt(em, privateKey, 0x01)'), 'extract lost the block-type-1 call');
  assert.ok(raw.includes('encode64'), 'extract lost encode64');
  assert.ok(!/sha1|createHash|md\./i.test(raw), 'extract unexpectedly contains a digest');

  // Three mechanical TypeScript strips — nothing else is altered.
  const js = raw
    .replace('export const', 'const')
    .replace(/:\s*string\s*\|\s*null\s*=>/, '=>')
    .replace(/:\s*string(?=\s*[,)])/g, '')
    .replace(/\s+as any/g, '');

  // eslint-disable-next-line no-new-func
  const factory = new Function('forge', 'console', `${js}\nreturn generateGarminEncryptedTransaction;`);
  return {
    fn: factory(forge, { error() {} }),
    js,
  };
}

test('the client signer extracts cleanly from the real repo file', () => {
  const { js } = loadClientSigner();
  assert.ok(!js.includes(': string'), `type annotation survived the strip:\n${js}`);
  assert.ok(js.includes('0x01'), 'block type 1 must survive');
});

test('⭐ server port === client, byte for byte, for a fixed UUID', () => {
  assert.ok(THROWAWAY_KEY, 'S170_THROWAWAY_KEY not set — run via npm run test:parity');
  const { fn: clientSign } = loadClientSigner();

  const uuid = '11111111-2222-4333-8444-555555555555'; // fixed, not random

  const fromClient = clientSign(uuid, THROWAWAY_KEY);
  const fromServer = server.generateGarminEncryptedTransaction(uuid, THROWAWAY_KEY);

  assert.ok(typeof fromClient === 'string' && fromClient.length > 0, 'client produced nothing');
  assert.equal(fromServer, fromClient);
});

test('⭐ parity holds across many UUIDs, including awkward ones', () => {
  assert.ok(THROWAWAY_KEY, 'S170_THROWAWAY_KEY not set');
  const { fn: clientSign } = loadClientSigner();

  const cases = [
    server.generateUUID(),
    server.generateUUID(),
    server.generateUUID(),
    '00000000-0000-4000-8000-000000000000',
    'ffffffff-ffff-4fff-bfff-ffffffffffff',
  ];

  for (const uuid of cases) {
    assert.equal(
      server.generateGarminEncryptedTransaction(uuid, THROWAWAY_KEY),
      clientSign(uuid, THROWAWAY_KEY),
      `parity broke for ${uuid}`
    );
  }
});

test('⭐ block-type-1 is DETERMINISTIC — the same input gives the same bytes', () => {
  assert.ok(THROWAWAY_KEY, 'S170_THROWAWAY_KEY not set');
  const uuid = 'deadbeef-0000-4000-8000-000000000001';
  const a = server.generateGarminEncryptedTransaction(uuid, THROWAWAY_KEY);
  const b = server.generateGarminEncryptedTransaction(uuid, THROWAWAY_KEY);
  assert.equal(a, b, 'block type 1 must not be randomised — type 2 padding would be');
});

test('⚠ an RSA-SHA1 signature is DIFFERENT — the mistake the JSDoc forbids is detectable', () => {
  assert.ok(THROWAWAY_KEY, 'S170_THROWAWAY_KEY not set');
  const uuid = '11111111-2222-4333-8444-555555555555';

  const correct = server.generateGarminEncryptedTransaction(uuid, THROWAWAY_KEY);

  // What a well-meaning refactor would produce instead:
  const key = forge.pki.privateKeyFromPem(server.normalisePem(THROWAWAY_KEY));
  const md = forge.md.sha1.create();
  md.update(uuid, 'utf8');
  const sha1Signature = forge.util.encode64(key.sign(md));

  assert.notEqual(correct, sha1Signature, 'if these ever match, this test is broken');
});

test('normalisePem handles a quoted, \\n-escaped single-line PEM', () => {
  assert.ok(THROWAWAY_KEY, 'S170_THROWAWAY_KEY not set');
  const uuid = '11111111-2222-4333-8444-555555555555';

  const mangled = `"${THROWAWAY_KEY.trim().split('\n').join('\\n')}"`;
  assert.equal(
    server.generateGarminEncryptedTransaction(uuid, mangled),
    server.generateGarminEncryptedTransaction(uuid, THROWAWAY_KEY),
    'a Secret-Manager-style single-line PEM must sign identically'
  );
});

test('⚠ the server signer THROWS on a bad key (never returns a false-success)', () => {
  assert.throws(() => server.generateGarminEncryptedTransaction('x', 'not-a-pem'));
  assert.throws(() => server.generateGarminEncryptedTransaction('', THROWAWAY_KEY || 'x'));
});

test('the throwaway key really is throwaway, not one of the real ones', () => {
  assert.ok(THROWAWAY_KEY, 'S170_THROWAWAY_KEY not set');
  const real = '/Users/jonny/Documents/LobsterLog_KEYS';
  // Never read the real keys — only assert we did not source the material from there.
  assert.ok(
    !String(process.env.S170_THROWAWAY_KEY_PATH || '').startsWith(real),
    'the test key must not come from the real key folder'
  );
  assert.ok(fs.existsSync(path.dirname(process.env.S170_THROWAWAY_KEY_PATH || '/tmp')));
});
