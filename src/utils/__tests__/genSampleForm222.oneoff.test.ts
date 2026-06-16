// ONE-OFF (Session 51 F222 restructure): writes /tmp/sample_form222_{y,n}.xml for
// xmllint validation against the DFO Form 222 XSD, and prints validateForm222Xml()
// results. Diagnostic only — delete after the restructure sessions.
import * as fs from 'fs';
import { generateForm222Xml, validateForm222Xml } from '../dfoForm222Generator';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  dfoLicenceNo: '300123',
  dfoFin: '123456789',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  regId: 1004,
  units: 'lbs',
  language: 'en',
};

const base: any = {
  uid: 'ABCDEF',
  savedAt: Date.now(),
  reportDate: '2026-06-11',
  interactionDate: '2026-06-10',
  interactionTime: '08:30',
  lat: '44.1234',
  lon: '-66.5432',
  speciesLabel: 'Gray Seal',            // real MV_NOAA_MM_SPECIES descEn
  nbAnimals: '2',
  interactionTypeLabel: 'Entanglement', // real MV_INCIDENT_TYPE descEn
  injuryInd: 'Y',
  deathInd: 'N',
  entangleInd: 'Y',
  releaseInd: 'Y',
  gearDamageInd: 'N',
  observerNm: 'Jane Observer',
  contactInfo: '123 Wharf Rd, Clark Harbour NS',
  remarks: 'Animal released without visible injury',
  lgbkNumRef: 'QWERTY',
  sentToDfo: false,
};

test('writes Form 222 Y and N samples and prints validator results', () => {
  for (const [name, entry] of [
    ['y', { ...base, interactInd: 'Y' }],
    ['n', { ...base, interactInd: 'N' }],
  ] as const) {
    const xml = generateForm222Xml(entry, profile);
    fs.writeFileSync(`/tmp/sample_form222_${name}.xml`, xml);
    const res = validateForm222Xml(xml);
    console.log(`F222 (INTERACT_IND=${entry.interactInd}) validator: ${res.valid ? 'VALID' : `${res.errors.length} error(s)`}`);
    res.errors.forEach(e => console.log(`  - ${e}`));
    expect(res.valid).toBe(true);
  }
});
