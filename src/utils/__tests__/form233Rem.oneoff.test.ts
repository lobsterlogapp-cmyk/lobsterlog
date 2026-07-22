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
