// ONE-OFF (S116): Form 233 LOGBOOK_UID_REFERED (REPORT-level, string_6, optional; DFO's
// schema spelling "REFERED"). Asserts emit presence, XSD sequence position (report_type:
// after REPORT_UID, before DG_CLOSE_DT), blank→omission (no empty tag), and the Rule 953
// six-uppercase-A-Z validator check. Also writes the samples for the xmllint gate.
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

test('LOGBOOK_UID_REFERED emits between REPORT_UID and DG_CLOSE_DT', () => {
  const xml = generateForm233Xml({ ...base, logbookUidRefered: 'GHJKLM' }, profile);
  expect(xml).toContain('<LOGBOOK_UID_REFERED>GHJKLM</LOGBOOK_UID_REFERED>');
  const iUid = xml.indexOf('<REPORT_UID>');
  const iRef = xml.indexOf('<LOGBOOK_UID_REFERED>');
  const iClose = xml.indexOf('<DG_CLOSE_DT>');
  expect(iUid).toBeGreaterThan(-1);
  expect(iRef).toBeGreaterThan(iUid);
  expect(iClose).toBeGreaterThan(iRef);
  expect(validateForm233Xml(xml).valid).toBe(true);
  const dir = process.env.CLAUDE_JOB_DIR ? `${process.env.CLAUDE_JOB_DIR}/tmp` : '/tmp';
  fs.writeFileSync(`${dir}/sample_233_logbook_ref.xml`, xml);
});

test('blank / absent field emits NO element at all (no empty tag)', () => {
  for (const entry of [base, { ...base, logbookUidRefered: '' }, { ...base, logbookUidRefered: '   ' }]) {
    const xml = generateForm233Xml(entry, profile);
    expect(xml).not.toContain('LOGBOOK_UID_REFERED');
    expect(validateForm233Xml(xml).valid).toBe(true);
  }
  const dir = process.env.CLAUDE_JOB_DIR ? `${process.env.CLAUDE_JOB_DIR}/tmp` : '/tmp';
  fs.writeFileSync(`${dir}/sample_233_logbook_ref_blank.xml`, generateForm233Xml(base, profile));
});

test('malformed values are rejected by the Rule 953 check; valid six letters pass', () => {
  for (const bad of ['ABC', 'abcdef', 'AB12EF', 'ABCDEFG']) {
    // ABCDEFG exceeds maxLength at the UI, but the validator must still catch a 7-char
    // value arriving by any other path; build the XML by hand to bypass tag()'s trim.
    const xml = generateForm233Xml({ ...base, logbookUidRefered: 'GHJKLM' }, profile)
      .replace('<LOGBOOK_UID_REFERED>GHJKLM</LOGBOOK_UID_REFERED>',
               `<LOGBOOK_UID_REFERED>${bad}</LOGBOOK_UID_REFERED>`);
    const res = validateForm233Xml(xml);
    expect(res.valid).toBe(false);
    expect(res.errors.join('\n')).toContain('six uppercase letters');
  }
  const ok = generateForm233Xml({ ...base, logbookUidRefered: 'ZZQQXX' }, profile);
  expect(validateForm233Xml(ok).valid).toBe(true);
});
