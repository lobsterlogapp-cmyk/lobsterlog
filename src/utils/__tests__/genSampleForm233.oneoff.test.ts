// ONE-OFF (Session 51 F233 audit): writes /tmp/sample_form233.xml for xmllint
// validation against the DFO Form 233 XSD, and prints validateForm233Xml() results.
// Diagnostic only — delete after the restructure sessions.
import * as fs from 'fs';
import { generateForm233Xml, validateForm233Xml } from '../dfoForm233Generator';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  dfoLicenceNo: '300123',
  dfoFin: '123456789',
  regId: 1004,
  units: 'lbs',
  language: 'en',
};

const entry: any = {
  uid: 'ABCDEF',
  savedAt: Date.now(),
  periodStartDate: '2026-06-01',
  periodEndDate: '2026-06-07',
  reason: 'Weather',
  licenceNo: '300123',
  fin: '123456789',
  sentToDfo: false,
};

test('writes Form 233 sample and prints validator results', () => {
  const xml = generateForm233Xml(entry, profile);
  fs.writeFileSync('/tmp/sample_form233.xml', xml);
  const res = validateForm233Xml(xml);
  console.log(`F233 validator: ${res.valid ? 'VALID' : `${res.errors.length} error(s)`}`);
  res.errors.forEach(e => console.log(`  - ${e}`));
  expect(res.valid).toBe(true);
});
