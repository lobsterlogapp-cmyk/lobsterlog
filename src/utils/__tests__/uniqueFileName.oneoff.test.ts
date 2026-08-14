// S128 Phase 3 — two logs must never share a file name. §3.10 mandates exactly three fields,
// so uniqueness can't be an appended token: generateUniqueDfoXmlFileName advances the UTC
// second past any name already used by the account (the S112 same-second collision).
import { generateDfoXmlFileName, generateUniqueDfoXmlFileName } from '../dfoXmlGenerator';

const AT = new Date(Date.UTC(2026, 7, 9, 13, 19, 11)); // 2026-08-09 13:19:11 UTC
const BASE = '1004-104460-20260809131911.XML';
const PLUS1 = '1004-104460-20260809131912.XML';
const PLUS2 = '1004-104460-20260809131913.XML';

// §3.10: exactly three dash-separated fields, third is 14 digits + .XML.
const conformant = (n: string) => /^\d+-[A-Za-z0-9]+-\d{14}\.XML$/.test(n) && n.split('-').length === 3;

test('no prior names: unchanged — byte-identical to the base builder', () => {
  expect(generateUniqueDfoXmlFileName(1004, '104460', [], AT)).toBe(BASE);
  expect(generateUniqueDfoXmlFileName(1004, '104460', [], AT)).toBe(generateDfoXmlFileName(1004, '104460', AT));
});

test('same-second collision (S112): advances one second, stays §3.10-conformant', () => {
  const out = generateUniqueDfoXmlFileName(1004, '104460', [BASE], AT);
  expect(out).toBe(PLUS1);
  expect(out).not.toBe(BASE);
  expect(conformant(out)).toBe(true);
});

test('two consecutive seconds taken: skips to the first free one', () => {
  expect(generateUniqueDfoXmlFileName(1004, '104460', [BASE, PLUS1], AT)).toBe(PLUS2);
});

test('two sends forced into the same second get two different conformant names', () => {
  const used: string[] = [];
  const first = generateUniqueDfoXmlFileName(1004, '104460', used, AT);
  used.push(first);
  const second = generateUniqueDfoXmlFileName(1004, '104460', used, AT); // same base second
  expect(first).not.toBe(second);
  expect(conformant(first)).toBe(true);
  expect(conformant(second)).toBe(true);
});

test('accepts a Set as well as an array', () => {
  expect(generateUniqueDfoXmlFileName(1004, '104460', new Set([BASE]), AT)).toBe(PLUS1);
});

test('inherits the Phase 2 §3.10 guard — a bad licence still throws', () => {
  expect(() => generateUniqueDfoXmlFileName(1004, '104460-', [], AT)).toThrow(/licence number/i);
});
