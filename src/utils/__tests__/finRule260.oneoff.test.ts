// ONE-OFF (S143 defect 39): the FIN validator's Rule-260 letter-position branch.
//
// Rule 260 (FS-NAT-234-12-FR L467-471 / EN L430-434) specifies exactly two FIN shapes, both
// NINE characters:
//   - nine digits                                              e.g. 999999999
//   - a digit, then an uppercase C or D, then seven digits     e.g. 9D9999999
//
// The app implemented the second as [CD]\d{7} — letter FIRST, eight characters — so it REJECTED
// 1D1400466 and 1D1400467, the two Gulf FINs in DFO's own reserved test file
// (~/Desktop/LL_sessions/S124_docs/Test_values_LobsterLog.txt), which are exactly the shape
// Rule 260 gives as its worked example. A Gulf tester could not get past the setup screen.
//
// This suite pins BOTH directions of that fix:
//   - the Rule-260 digit-then-letter shape is now ACCEPTED (the defect), and
//   - nothing that used to be accepted was removed (the ruling: the three non-Rule-260 branches
//     stay until their own recon session, because DFOCC… appears in every region block of
//     DFO's test file and dropping it would lock out a DFO-issued identity).
//
// The validator is DUPLICATED byte-for-byte in DfoSetupScreen.tsx and CaptainProfileScreen.tsx.
// Neither screen exports it (both are default-exported components), so the regex is mirrored
// here and the two copies are proven identical by a source comparison at the end of the file.
import * as fs from 'fs';
import * as path from 'path';

const isValidFin = (s: string): boolean =>
  /^(\d{9}|\d[CD]\d{7}|[CD]\d{7}|\d{5,6}|DFOCC\d{9})$/.test(s);

describe('Rule 260: the digit-then-C/D shape the app used to reject', () => {
  // The two Gulf rows of Test_values_LobsterLog.txt. Before this fix both were REJECTED:
  // not \d{9} (they contain a D), not [CD]\d{7} (they start with a digit and are 9 chars),
  // not \d{5,6}, not DFOCC\d{9}.
  test.each(['1D1400466', '1D1400467'])(
    'accepts %s — a DFO Gulf test FIN in the exact shape Rule 260 gives as its example',
    (fin) => {
      expect(isValidFin(fin)).toBe(true);
    },
  );

  test('accepts the C form as well as the D form (Rule 260 allows either letter)', () => {
    expect(isValidFin('1C1400466')).toBe(true);
  });

  test('still rejects letters Rule 260 does not allow in that position', () => {
    for (const bad of ['1A1400466', '1E1400466', '1Z1400466']) {
      expect(isValidFin(bad)).toBe(false);
    }
  });

  test('still rejects the shape at the wrong length', () => {
    expect(isValidFin('1D140046')).toBe(false);   // six trailing digits
    expect(isValidFin('1D14004666')).toBe(false); // eight trailing digits
  });
});

describe('nothing that was accepted before was removed (S143 ruling: additive only)', () => {
  // The four nine-digit regional identities named in the recon.
  test.each([
    ['MAR', '100400460'],
    ['NL', '100200460'],
    ['QC', '100600460'],
    ['GLF', '101400460'],
  ])('%s test identity %s stays accepted', (_region, fin) => {
    expect(isValidFin(fin)).toBe(true);
  });

  test('Jonathon’s own stored profile FIN stays accepted', () => {
    expect(isValidFin('100400460')).toBe(true);
  });

  // The three branches that are NOT in Rule 260 and were deliberately kept by ruling.
  // If a future session narrows the validator to Rule 260 exactly, these three go red ON
  // PURPOSE — that is the signal the deferred decision was taken, not that something broke.
  test('DFOCC + 9 digits stays accepted — it is in every region block of DFO’s test file', () => {
    expect(isValidFin('DFOCC100400468')).toBe(true);
    expect(isValidFin('DFOCC100200468')).toBe(true);
  });

  test('the letter-first form and the 5–6 digit form stay accepted (deferred, not endorsed)', () => {
    expect(isValidFin('D1234567')).toBe(true); // letter-first: not Rule 260, kept by ruling
    expect(isValidFin('12345')).toBe(true);    // 5 digits: not Rule 260, kept by ruling
    expect(isValidFin('123456')).toBe(true);   // 6 digits: not Rule 260, kept by ruling
  });

  // 6ASU… is in DFO's test file but conforms to NO branch, before or after this change.
  // Recorded so the recon's finding stays visible: DFO's fixture list is looser than Rule 260.
  test('6ASU04469 is rejected — it was before this change too, and Rule 260 forbids it', () => {
    expect(isValidFin('6ASU04469')).toBe(false);
  });
});

describe('the two screen copies of isValidFin stay identical', () => {
  // Changing one screen and not the other would let a FIN be accepted on one and rejected on
  // the other — worse than the original bug. Neither screen exports the function, so this
  // compares the source lines directly.
  const read = (rel: string) =>
    fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

  const RE = /const isValidFin = \(s: string\): boolean =>\s*\n\s*(\/\^.*\$\/)\.test\(s\);/;

  test('DfoSetupScreen and CaptainProfileScreen use the same pattern, and it matches this suite', () => {
    const setup = read('screens/DfoSetupScreen.tsx').match(RE);
    const profile = read('screens/CaptainProfileScreen.tsx').match(RE);
    expect(setup).not.toBeNull();
    expect(profile).not.toBeNull();
    expect(setup![1]).toBe(profile![1]);
    // and the pattern the screens ship is the one this suite exercises
    expect(setup![1]).toBe(String(/^(\d{9}|\d[CD]\d{7}|[CD]\d{7}|\d{5,6}|DFOCC\d{9})$/));
  });
});
