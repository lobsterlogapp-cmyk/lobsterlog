// ONE-OFF (S116 Phase 2): 233 VRN conformance — VRN is CSV-optional on the 233 and Rule 528
// is a format restriction that applies only when the element is used. The screen gate now
// blocks MALFORMED VRNs only (blank allowed); this suite proves the generator side of that
// contract: blank profile.vesselNumber → NO <VRN> element at all (never an empty tag) and
// the document still validates; populated → <VRN> emits as before. The malformed-block path
// is isValidFormVrn (covered by formVrnAndCoordClamp.oneoff.test.ts) + the on-device walk.
import * as fs from 'fs';
import {
  Form233Entry,
  generateForm233Xml,
  validateForm233Xml,
} from '../dfoForm233Generator';

const baseProfile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '104460',
  fishingNumber: '104460',
  licenceHolderFin: '100400460',
  regId: 1004,
  units: 'lbs',
  language: 'en',
};

const entry: Form233Entry = {
  uid: 'ABCDEF',
  savedAt: 0,
  periodStartDate: '2026-07-01',
  periodEndDate: '2026-07-10',
  reason: 'Weather',
  licenceNo: '104460',
  fin: '100400460',
  sentToDfo: false,
};

test('blank profile VRN → no <VRN> element at all, document still valid', () => {
  for (const vesselNumber of ['', '   ']) {
    const xml = generateForm233Xml(entry, { ...baseProfile, vesselNumber });
    expect(xml).not.toContain('<VRN>');
    expect(xml).not.toContain('VRN');
    expect(validateForm233Xml(xml).valid).toBe(true);
  }
  const dir = process.env.CLAUDE_JOB_DIR ? `${process.env.CLAUDE_JOB_DIR}/tmp` : '/tmp';
  fs.writeFileSync(`${dir}/sample_233_vrn_blank.xml`, generateForm233Xml(entry, { ...baseProfile, vesselNumber: '' }));
});

test('populated profile VRN still emits', () => {
  const xml = generateForm233Xml(entry, baseProfile);
  expect(xml).toContain('<VRN>104460</VRN>');
  expect(validateForm233Xml(xml).valid).toBe(true);
  const dir = process.env.CLAUDE_JOB_DIR ? `${process.env.CLAUDE_JOB_DIR}/tmp` : '/tmp';
  fs.writeFileSync(`${dir}/sample_233_vrn_present.xml`, xml);
});
