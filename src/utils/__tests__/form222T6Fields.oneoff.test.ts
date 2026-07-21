// ONE-OFF (Session 111): Form 222 T6 free-text fields — SITE_DSC / GEAR_DMG_REM /
// DOC_REM / EVENT_DSC (form-level) + INCDNT_REM (incident-node level). Asserts emit
// presence, XSD sequence position, first-node-only INCDNT_REM, empty→omission, and
// FR-accent round-trip. Also writes the full sample for the manual xmllint gate.
import * as fs from 'fs';
import {
  Form222Entry,
  generateForm222Xml,
  validateForm222Xml,
  MARINE_MAMMAL_SPECIES_LABELS,
  INTERACTION_TYPE_LABELS,
  LENGTH_CATEGORY_LABELS,
} from '../dfoForm222Generator';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  regId: 1004,
  units: 'lbs',
  language: 'en',
};

// FR-accented free text (grave/acute accents + an apostrophe that must XML-escape to &apos;)
const T6 = {
  siteDsc: '2 milles au SO du cap Sable, près des hauts-fonds',
  gearDmgRem: 'Casier endommagé',
  docRem: 'Photos prises',
  eventDsc: "Chronologie : relâché près de l'île à 09h30",
  incdntRem: 'Enchevêtrement dans les cordages',
};

const base: Form222Entry = {
  uid: 'ABCDEF',
  savedAt: 0,
  interactInd: 'Y',
  reportDate: '2026-06-11',
  interactionDate: '2026-06-10',
  interactionTime: '08:30',
  lat: '44.1234',
  lon: '-66.5432',
  speciesLabel: MARINE_MAMMAL_SPECIES_LABELS[0],
  nbAnimals: '2',
  interactionTypeLabel: INTERACTION_TYPE_LABELS[0],
  injuryInd: 'Y',   // → adds a distinct MM_INTER_INCDNT node
  deathInd: 'Y',    // → adds another distinct MM_INTER_INCDNT node (guarantees ≥2 nodes)
  entangleInd: 'N',
  releaseInd: 'N',
  gearDamageInd: 'Y',
  observerNm: 'Jane Observer',
  contactInfo: 'jane@example.com',
  remarks: 'General comment',
  lengthCatLabel: LENGTH_CATEGORY_LABELS[0], // ensures BDY_LEN_ID emits (sequence anchor)
  lgbkNumRef: 'QWERTY',
  sentToDfo: false,
};

test('all 5 T6 fields emit with correct values + FR accents round-trip', () => {
  const xml = generateForm222Xml({ ...base, ...T6 }, profile);
  expect(xml).toContain('<SITE_DSC>2 milles au SO du cap Sable, près des hauts-fonds</SITE_DSC>');
  expect(xml).toContain('<GEAR_DMG_REM>Casier endommagé</GEAR_DMG_REM>');
  expect(xml).toContain('<DOC_REM>Photos prises</DOC_REM>');
  // apostrophe escapes to &apos;, accents preserved
  expect(xml).toContain("<EVENT_DSC>Chronologie : relâché près de l&apos;île à 09h30</EVENT_DSC>");
  expect(xml).toContain('<INCDNT_REM>Enchevêtrement dans les cordages</INCDNT_REM>');
  expect(validateForm222Xml(xml).valid).toBe(true);
});

test('T6 fields sit at the correct XSD sequence positions', () => {
  const xml = generateForm222Xml({ ...base, ...T6 }, profile);
  const at = (needle: string) => {
    const i = xml.indexOf(needle);
    expect(i).toBeGreaterThan(-1);
    return i;
  };
  // SITE_DSC after INTERACT_DT, before LAT
  expect(at('<SITE_DSC>')).toBeGreaterThan(at('<INTERACT_DT>'));
  expect(at('<SITE_DSC>')).toBeLessThan(at('<LAT'));
  // GEAR_DMG_REM after GEAR_DMG_IND, before NOAA_SPECIE_COD
  expect(at('<GEAR_DMG_REM>')).toBeGreaterThan(at('<GEAR_DMG_IND>'));
  expect(at('<GEAR_DMG_REM>')).toBeLessThan(at('<NOAA_SPECIE_COD>'));
  // DOC_REM after NB_SPCMN_BEST, before BDY_LEN_ID
  expect(at('<DOC_REM>')).toBeGreaterThan(at('<NB_SPCMN_BEST>'));
  expect(at('<DOC_REM>')).toBeLessThan(at('<BDY_LEN_ID>'));
  // EVENT_DSC after BDY_LEN_ID, before DG_CLOSE_DT
  expect(at('<EVENT_DSC>')).toBeGreaterThan(at('<BDY_LEN_ID>'));
  expect(at('<EVENT_DSC>')).toBeLessThan(at('<DG_CLOSE_DT>'));
  // INCDNT_REM inside the incident node, after INCDNT_TYP_ID
  expect(at('<INCDNT_REM>')).toBeGreaterThan(at('<INCDNT_TYP_ID>'));
});

test('INCDNT_REM rides only the FIRST incident node (≥2 nodes present)', () => {
  const xml = generateForm222Xml({ ...base, ...T6 }, profile);
  const nodeCount = (xml.match(/<MM_INTER_INCDNT>/g) || []).length;
  const remCount = (xml.match(/<INCDNT_REM>/g) || []).length;
  expect(nodeCount).toBeGreaterThanOrEqual(2);
  expect(remCount).toBe(1);
  // the single INCDNT_REM belongs to the first node: it precedes the 2nd node open tag
  expect(xml.indexOf('<INCDNT_REM>')).toBeLessThan(xml.lastIndexOf('<MM_INTER_INCDNT>'));
});

test('empty T6 fields are omitted entirely (minOccurs=0)', () => {
  const xml = generateForm222Xml(base, profile); // no T6 values
  for (const el of ['SITE_DSC', 'GEAR_DMG_REM', 'DOC_REM', 'EVENT_DSC', 'INCDNT_REM']) {
    expect(xml).not.toContain(`<${el}>`);
  }
  expect(validateForm222Xml(xml).valid).toBe(true);
});

test('writes the full-T6 sample for the xmllint gate', () => {
  const xml = generateForm222Xml({ ...base, ...T6 }, profile);
  const dir = process.env.CLAUDE_JOB_DIR ? `${process.env.CLAUDE_JOB_DIR}/tmp` : '/tmp';
  fs.writeFileSync(`${dir}/sample_222_t6.xml`, xml);
  expect(validateForm222Xml(xml).valid).toBe(true);
});
