// ONE-OFF (Session 111): Form 233 REM (REPORT-level "Comments", string_2000). Asserts
// emit presence, XSD sequence position (report_type: after DG_CLOSE_DT, before REPORT_DTL),
// empty→omission, and FR-accent round-trip. Also writes the sample for the xmllint gate.
import * as fs from 'fs';
import {
  Form233Entry,
  generateForm233Xml,
  validateForm233Xml,
} from '../dfoForm233Generator';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '104460',
  fishingNumber: '104460',
  licenceHolderFin: '100400460',
  regId: 1004,
  units: 'lbs',
  language: 'en',
};

const base: Form233Entry = {
  uid: 'ABCDEF',
  savedAt: 0,
  periodStartDate: '2026-07-01',
  periodEndDate: '2026-07-10',
  reason: 'Weather',
  licenceNo: '104460',
  fin: '100400460',
  sentToDfo: false,
};

// FR-accented remark with an apostrophe that must XML-escape to &apos;
const REMARK = "Bateau immobilisé au quai à cause d'une panne de moteur — pièce en commande";

test('REM emits with value + FR accents round-trip', () => {
  const xml = generateForm233Xml({ ...base, remarks: REMARK }, profile);
  expect(xml).toContain(
    "<REM>Bateau immobilisé au quai à cause d&apos;une panne de moteur — pièce en commande</REM>"
  );
  expect(validateForm233Xml(xml).valid).toBe(true);
});

test('REM sits at the REPORT level: after DG_CLOSE_DT, before REPORT_DTL', () => {
  const xml = generateForm233Xml({ ...base, remarks: REMARK }, profile);
  const iRem = xml.indexOf('<REM>');
  const iDg = xml.indexOf('<DG_CLOSE_DT>');
  const iDtl = xml.indexOf('<REPORT_DTL>');
  expect(iRem).toBeGreaterThan(-1);
  expect(iRem).toBeGreaterThan(iDg);
  expect(iRem).toBeLessThan(iDtl);          // NOT inside REPORT_DTL
});

test('empty remarks omit REM entirely (minOccurs=0)', () => {
  const xml = generateForm233Xml(base, profile); // no remarks
  expect(xml).not.toContain('<REM>');
  expect(validateForm233Xml(xml).valid).toBe(true);
});

test('writes the REM sample for the xmllint gate', () => {
  const xml = generateForm233Xml({ ...base, remarks: REMARK }, profile);
  const dir = process.env.CLAUDE_JOB_DIR ? `${process.env.CLAUDE_JOB_DIR}/tmp` : '/tmp';
  fs.writeFileSync(`${dir}/sample_233_rem.xml`, xml);
  expect(validateForm233Xml(xml).valid).toBe(true);
});

// ---- Session 112: REPORT_DTL.REM (the section note) ----
// A separate FR-accented note (distinct text from REMARK) so both REMs can be told apart.
const DTL_REMARK = "Période d'inactivité prolongée — attente d'une pièce du fournisseur";
const DTL_ESCAPED = "Période d&apos;inactivité prolongée — attente d&apos;une pièce du fournisseur";
const REPORT_ESCAPED = "Bateau immobilisé au quai à cause d&apos;une panne de moteur — pièce en commande";

test('REPORT_DTL.REM emits as the last child of REPORT_DTL (after REASON)', () => {
  const xml = generateForm233Xml({ ...base, reportDtlRemarks: DTL_REMARK }, profile);
  const dtlBlock = xml.slice(xml.indexOf('<REPORT_DTL>'), xml.indexOf('</REPORT_DTL>'));
  expect(dtlBlock).toContain(`<REM>${DTL_ESCAPED}</REM>`);
  expect(dtlBlock.indexOf('<REM>')).toBeGreaterThan(dtlBlock.indexOf('<REASON>')); // last child
  expect(validateForm233Xml(xml).valid).toBe(true);
});

test('empty section note omits REPORT_DTL.REM; REPORT.REM is unaffected', () => {
  const xml = generateForm233Xml({ ...base, remarks: REMARK }, profile); // no reportDtlRemarks
  const dtlBlock = xml.slice(xml.indexOf('<REPORT_DTL>'), xml.indexOf('</REPORT_DTL>'));
  expect(dtlBlock).not.toContain('<REM>'); // REPORT_DTL.REM cleanly absent
  expect(xml).toContain(`<REM>${REPORT_ESCAPED}</REM>`); // REPORT-level REM still present
  expect(validateForm233Xml(xml).valid).toBe(true);
});

test('both REMs filled with different text → each carries its own text (R-C)', () => {
  const xml = generateForm233Xml({ ...base, remarks: REMARK, reportDtlRemarks: DTL_REMARK }, profile);
  // REPORT.REM sits OUTSIDE/before REPORT_DTL; REPORT_DTL.REM sits INSIDE it.
  const iReportRem = xml.indexOf(`<REM>${REPORT_ESCAPED}</REM>`);
  const iDtlOpen = xml.indexOf('<REPORT_DTL>');
  expect(iReportRem).toBeGreaterThan(-1);
  expect(iReportRem).toBeLessThan(iDtlOpen);
  const dtlBlock = xml.slice(iDtlOpen, xml.indexOf('</REPORT_DTL>'));
  expect(dtlBlock).toContain(`<REM>${DTL_ESCAPED}</REM>`);
  expect(dtlBlock).not.toContain(REPORT_ESCAPED); // the two texts never cross
  expect(validateForm233Xml(xml).valid).toBe(true);
});

test('writes the REPORT_DTL.REM sample for the xmllint gate', () => {
  const xml = generateForm233Xml({ ...base, remarks: REMARK, reportDtlRemarks: DTL_REMARK }, profile);
  const dir = process.env.CLAUDE_JOB_DIR ? `${process.env.CLAUDE_JOB_DIR}/tmp` : '/tmp';
  fs.writeFileSync(`${dir}/sample_233_dtl_rem.xml`, xml);
  expect(validateForm233Xml(xml).valid).toBe(true);
});

// ---- Session 112 Phase 2: both REMs are length-checked (string_2000) ----
test('validator catches an over-length REPORT_DTL.REM', () => {
  const xml = generateForm233Xml({ ...base, reportDtlRemarks: 'x'.repeat(2001) }, profile);
  const res = validateForm233Xml(xml);
  expect(res.valid).toBe(false);
  expect(res.errors.some(e => e.includes('REPORT_DTL.REM') && e.includes('string_2000'))).toBe(true);
});

test('validator still catches an over-length REPORT.REM (first-match regression)', () => {
  const xml = generateForm233Xml({ ...base, remarks: 'y'.repeat(2001) }, profile);
  const res = validateForm233Xml(xml);
  expect(res.valid).toBe(false);
  expect(res.errors.some(e => e.includes('REPORT.REM') && e.includes('string_2000'))).toBe(true);
});
