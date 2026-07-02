// Form-path hardenings (222/233): Rule 528 VRN gate + LAT/LONG emit-time clamp.
// isValidFormVrn is form-only; clampCoord4 is now the shared coordinate clamp used by BOTH
// the 222 form path and the 234 logbook path (S90 Phase C), so it lives in dfoConstants.
import { isValidFormVrn } from '../submitDfoXml';
import { clampCoord4 } from '../dfoConstants';

describe('isValidFormVrn — Rule 528 (4-6 digits, digits only)', () => {
  it('accepts 4, 5 and 6 digit values', () => {
    expect(isValidFormVrn('104460')).toBe(true); // 6
    expect(isValidFormVrn('10446')).toBe(true);  // 5
    expect(isValidFormVrn('1044')).toBe(true);   // 4
  });

  it('rejects 7-digit (logbook-style), too short, alphanumeric, and empty', () => {
    expect(isValidFormVrn('1004460')).toBe(false); // 7 digits
    expect(isValidFormVrn('104')).toBe(false);     // 3 digits
    expect(isValidFormVrn('10446a')).toBe(false);  // contains a letter
    expect(isValidFormVrn('')).toBe(false);        // empty
  });
});

describe('clampCoord4 — LAT/LONG emit clamp to XSD ≤4 decimals', () => {
  it('rounds high-precision latitude to 4 decimals', () => {
    expect(clampCoord4('43.36526203525844')).toBe('43.3653');
  });

  it('rounds high-precision longitude to 4 decimals and preserves the leading minus', () => {
    expect(clampCoord4('-65.6353660736118')).toBe('-65.6354');
  });

  it('passes a value already within 4 decimals through unchanged', () => {
    expect(clampCoord4('43.53')).toBe('43.53');
    expect(clampCoord4('-65.5')).toBe('-65.5');
  });

  it('returns trimmed input untouched when not a finite number', () => {
    expect(clampCoord4('')).toBe('');
    expect(clampCoord4('  ')).toBe('');
  });
});
