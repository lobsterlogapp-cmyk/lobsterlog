// ONE-OFF (S152F, defect 59): the 233 emits ONE identity, from ONE moment.
//
// THE DEFECT THIS PINS. Form233Screen's buildEntry snapshots the harvester's licence and FIN into
// the record when he closes the form (`licenceNo: profile.fishingNumber`, `fin:
// profile.licenceHolderFin`). The generator used to emit FIN and LIC_NO from that frozen copy while
// emitting VRN and REG_ID from the LIVE profile — so a 233 closed one week and sent the next, after
// he corrected his profile, carried the old licence beside the new vessel number. One document
// describing him at two different moments, and the two frozen fields were the MANDATORY ones
// (LIC_NO is CSV REQUIRED=Y; FIN is Rule-961 mandatory outside the Arctic) while the live one was
// optional. The 234 and the 222 both already read live; the 233 was the only form doing this.
//
// ⚠ WHY THIS SUITE HAD TO BE WRITTEN AT ALL. Not one existing test could tell the bug from the fix,
// because every other 233 fixture sets its entry values EQUAL to its profile values — so the
// document comes out the same whichever source the generator reads. The fixtures below deliberately
// make them DIFFER. That is the whole point: a fix nothing can detect is a fix nothing protects.
//
// There is no DFO rule naming which moment is correct. Ruling S152 #8, option A: read all four live,
// because the same action should behave the same way on all three forms.
import {
  Form233Entry,
  generateForm233Xml,
  validateForm233Xml,
} from '../dfoForm233Generator';

// What the profile held when he CLOSED the form — the values frozen into the record.
const AT_CLOSE = {
  fishingNumber: '104460',
  licenceHolderFin: '100400460',
  vesselNumber: '104460',
  regId: 1004,
};

// What the profile holds NOW, at send: he has since corrected all four.
const AT_SEND: any = {
  operatorName: 'Test Operator',
  fishingNumber: '104999',
  licenceHolderFin: '100499999',
  vesselNumber: '104461',
  regId: 1006,
  units: 'lbs',
  language: 'en',
};

// The stored record, still carrying the frozen copy taken at close.
const entry: Form233Entry = {
  uid: 'ABCDEF',
  savedAt: 0,
  periodStartDate: '2026-06-01',
  periodEndDate: '2026-06-30',
  reason: 'Weather',
  licenceNo: AT_CLOSE.fishingNumber,
  fin: AT_CLOSE.licenceHolderFin,
  closeDt: '2026-06-30T15:00:00.000Z',
  sentToDfo: false,
};

const el = (xml: string, name: string): string | null => {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1] : null;
};

describe('S152F: the 233 emits one identity, from one moment (defect 59)', () => {
  test('all four identity fields come from the LIVE profile, not the frozen copy', () => {
    const xml = generateForm233Xml(entry, AT_SEND);
    expect(el(xml, 'FIN')).toBe(AT_SEND.licenceHolderFin);       // was entry.fin
    expect(el(xml, 'LIC_NO')).toBe(AT_SEND.fishingNumber);       // was entry.licenceNo
    expect(el(xml, 'VRN')).toBe(AT_SEND.vesselNumber);           // already live
    expect(el(xml, 'REG_ID')).toBe(String(AT_SEND.regId));       // already live
  });

  test('the stale frozen values do not appear ANYWHERE in the document', () => {
    const xml = generateForm233Xml(entry, AT_SEND);
    // the record still carries them — the document must not
    expect(entry.fin).toBe(AT_CLOSE.licenceHolderFin);
    expect(entry.licenceNo).toBe(AT_CLOSE.fishingNumber);
    expect(xml).not.toContain(AT_CLOSE.licenceHolderFin);
    expect(xml).not.toContain(AT_CLOSE.fishingNumber);
  });

  test('no two-clock document: changing ONLY the licence moves only LIC_NO', () => {
    const xml = generateForm233Xml(entry, { ...AT_SEND, ...AT_CLOSE, fishingNumber: '104999' });
    expect(el(xml, 'LIC_NO')).toBe('104999');                    // the corrected value
    expect(el(xml, 'FIN')).toBe(AT_CLOSE.licenceHolderFin);      // untouched, and still current
    expect(el(xml, 'VRN')).toBe(AT_CLOSE.vesselNumber);
    expect(el(xml, 'REG_ID')).toBe(String(AT_CLOSE.regId));
  });

  test('no two-clock document: changing ONLY the FIN moves only FIN', () => {
    const xml = generateForm233Xml(entry, { ...AT_SEND, ...AT_CLOSE, licenceHolderFin: '100499999' });
    expect(el(xml, 'FIN')).toBe('100499999');
    expect(el(xml, 'LIC_NO')).toBe(AT_CLOSE.fishingNumber);
    expect(el(xml, 'VRN')).toBe(AT_CLOSE.vesselNumber);
  });

  test('an UNCHANGED profile is unaffected — the ordinary case still emits the same values', () => {
    const unchanged: any = { ...AT_SEND, ...AT_CLOSE };
    const xml = generateForm233Xml(entry, unchanged);
    expect(el(xml, 'FIN')).toBe(AT_CLOSE.licenceHolderFin);
    expect(el(xml, 'LIC_NO')).toBe(AT_CLOSE.fishingNumber);
    expect(el(xml, 'VRN')).toBe(AT_CLOSE.vesselNumber);
    expect(el(xml, 'REG_ID')).toBe(String(AT_CLOSE.regId));
    expect(validateForm233Xml(xml).valid).toBe(true);
  });

  test('the corrected document still validates', () => {
    expect(validateForm233Xml(generateForm233Xml(entry, AT_SEND)).valid).toBe(true);
  });
});
