// ONE-OFF (Session 56 guard test): proves the three MAR-90 "blocked for MAR(90)"
// validator overlays actually fire at runtime. The generator never emits these
// elements for MAR-90, so they cannot appear in a generated sample — this test
// injects them into an otherwise-valid MAR-90 document and asserts each guard trips.
// Mirrors the fixture style of genSampleAllSubforms.oneoff.test.ts.
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  dfoLicenceNo: '300123',
  dfoFin: '123456789',
  units: 'lbs',
  language: 'en',
};

function baseLog(subformId: number, regId: number): any {
  return {
    id: `test-log-${subformId}`,
    dateFished: '2026-06-10',
    lgbkUid: 'ABCDEF', // Rule 181: six uppercase letters
    firstEntryDt: '2026-06-10T08:55:00.000Z',
    sentToDfo: false,
    subformId,
    regId,
    data: {
      timeSailed: '05:30',
      timeStartedHauling: '06:00',
      timeStoppedHauling: '13:30',
      timeOfLanding: '14:45',
      crewRegistry: '[]',
      catchWeight: '500',
      trapHauls: '250',
      bycatchEntries: '[]',
      personalUse: '10',
      dgClosePcons: '2026-06-10T15:00:00.000Z',
      mmYes: 'false',
      sarYes: 'false',
      lostGearYes: 'false',
      hlinCompany: '',
      hlinConfirmNo: '',
      hloutCompany: '',
      hloutConfirmNo: '',
    },
  };
}

// MAR-90 fixture — same overrides as the genSampleAllSubforms MAR-90 case. With
// personalUse it yields a personal-use PCONS node, and the EFFORT always carries a
// CATCH node, so both PCONS and CATCH targets exist for injection.
function makeMar90Log(): any {
  const log = baseLog(90, 1004);
  log.data.fmaId = '28599'; // 38b
  log.data.portLanded = "ABBOTT'S HARBOUR";
  log.data.portLandedCodeId = '20913'; // MV_PORT — Abbott's Harbour (NS)
  log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
  log.data.lgridCodeId = '101';
  log.data.obsTripNum = '';
  // FMA 38b: LAT/LONG mandatory with MODE attr (Rule 3059), NB_SPCMN_BRD mandatory (Rule 654)
  log.data.gpsLat = '44.1234';
  log.data.gpsLng = '-66.5432';
  log.data.gpsSrc = 'gps';
  log.data.nbSpcmnBrd = '3';
  log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
  return log;
}

const SZ_MSG   = 'SPECIE_SZ_ID is blocked for MAR(90)';
const KEPT_MSG = 'NB_SPCMN_KEPT is blocked for MAR(90)';
const DISC_MSG = 'NB_SPCMN_DISC is blocked for MAR(90)';

test('clean MAR-90 sample does NOT trip the three blocked-field guards (negative control)', () => {
  const xml = generateElogXml(makeMar90Log(), profile);
  // sanity: the injection targets must exist in the clean document
  expect(xml).toContain('<PCONS>');
  expect(xml).toContain('<CATCH>');

  const { valid, errors } = validateElogXml(xml, 90);
  expect(valid).toBe(true);
  expect(errors.some(e => e.includes(SZ_MSG))).toBe(false);
  expect(errors.some(e => e.includes(KEPT_MSG))).toBe(false);
  expect(errors.some(e => e.includes(DISC_MSG))).toBe(false);
});

test('injected blocked elements trip all three MAR-90 guards (positive)', () => {
  const clean = generateElogXml(makeMar90Log(), profile);

  // SPECIE_SZ_ID into the PCONS node — sequence slot is after SPECIE_FRM_ID, before WT.
  // `<WT>` is unique to PCONS here (CATCH uses KEPT_WT), so target the first occurrence.
  let injected = clean.replace('<WT>', '<SPECIE_SZ_ID>826</SPECIE_SZ_ID>\n      <WT>');
  // NB_SPCMN_KEPT + NB_SPCMN_DISC into the CATCH node — sequence slot is after KEPT_WT,
  // before SPECIE_FRM_ID. `<KEPT_WT>…</KEPT_WT>` is unique to the CATCH node.
  injected = injected.replace(
    /(<KEPT_WT>[^<]*<\/KEPT_WT>)/,
    '$1\n            <NB_SPCMN_KEPT>1</NB_SPCMN_KEPT>\n            <NB_SPCMN_DISC>1</NB_SPCMN_DISC>',
  );

  // confirm the injection actually landed before validating
  expect(injected).toContain('<SPECIE_SZ_ID>826</SPECIE_SZ_ID>');
  expect(injected).toContain('<NB_SPCMN_KEPT>1</NB_SPCMN_KEPT>');
  expect(injected).toContain('<NB_SPCMN_DISC>1</NB_SPCMN_DISC>');

  const { errors } = validateElogXml(injected, 90);
  expect(errors.some(e => e.includes(SZ_MSG))).toBe(true);
  expect(errors.some(e => e.includes(KEPT_MSG))).toBe(true);
  expect(errors.some(e => e.includes(DISC_MSG))).toBe(true);
});
