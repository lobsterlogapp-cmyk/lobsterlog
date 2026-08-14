// S128 Phase 2 — the licence number is CHAR(18) alphanumeric (XML data dictionary LIC_NO,
// ELEMENT_ID 307), and generateDfoXmlFileName must never emit a name that violates Standard
// v6.1 §3.10. Founder ruling: REJECT (throw) a non-conformant name, never silently strip.
import { isValidDfoLicence, generateDfoXmlFileName } from '../dfoXmlGenerator';

// Aug-9 accepted name from the recon (docs/RECON_S128_FILENAME.md) — the conformant baseline.
const AUG9 = new Date(Date.UTC(2026, 7, 9, 13, 19, 11)); // 2026-08-09 13:19:11 UTC

test('isValidDfoLicence: alphanumeric 1-18 accepted', () => {
  expect(isValidDfoLicence('104460')).toBe(true);
  expect(isValidDfoLicence('1004460')).toBe(true);
  expect(isValidDfoLicence('AB12')).toBe(true);
  expect(isValidDfoLicence('T123456')).toBe(true);
  expect(isValidDfoLicence('A'.repeat(18))).toBe(true); // exactly 18
});

test('isValidDfoLicence: hyphen / punctuation / space / empty / over-18 rejected', () => {
  expect(isValidDfoLicence('104460-')).toBe(false);   // the live Aug-14 defect
  expect(isValidDfoLicence('AB-12')).toBe(false);
  expect(isValidDfoLicence('T-123456')).toBe(false);  // the placeholder's shape
  expect(isValidDfoLicence('10 4460')).toBe(false);
  expect(isValidDfoLicence('AB_12')).toBe(false);
  expect(isValidDfoLicence('')).toBe(false);
  expect(isValidDfoLicence('A'.repeat(19))).toBe(false); // 19 > 18
});

test('clean profile: file name is byte-identical to the §3.10 baseline', () => {
  // Same shape as the accepted Aug-9 name 1004-104460-20260809131911.XML.
  expect(generateDfoXmlFileName(1004, '104460', AUG9)).toBe('1004-104460-20260809131911.XML');
});

test('a bad licence value cannot produce a non-conformant name — it throws (blocked)', () => {
  expect(() => generateDfoXmlFileName(1004, '104460-', AUG9)).toThrow(/licence number/i);
  expect(() => generateDfoXmlFileName(1004, '', AUG9)).toThrow(/licence number/i);
  expect(() => generateDfoXmlFileName(1004, 'AB-12', AUG9)).toThrow(/licence number/i);
  // The double-hyphen filename from the recon can never be emitted by the builder.
  expect(() => generateDfoXmlFileName(1004, '104460-', AUG9)).toThrow();
});

test('a bad Regional ID also throws (never a malformed first field)', () => {
  expect(() => generateDfoXmlFileName(0, '104460', AUG9)).toThrow(/Regional ID/i);
  expect(() => generateDfoXmlFileName(-1, '104460', AUG9)).toThrow(/Regional ID/i);
  expect(() => generateDfoXmlFileName(NaN, '104460', AUG9)).toThrow(/Regional ID/i);
});
