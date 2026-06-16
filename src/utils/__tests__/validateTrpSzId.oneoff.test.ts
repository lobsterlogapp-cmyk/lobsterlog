// ONE-OFF (Session 57 guard test): proves the two new EFFORT_DETAIL.TRP_SZ_ID
// validator overlays fire at runtime —
//   • NL(91) with NO trap size  → "mandatory for NL(91)"
//   • QC/GLF/MAR (88/89/90) with an injected TRP_SZ_ID → "blocked"
// Per Subforms_requirements_234.xlsx row 79. Mirrors the fixture/injection style
// of validateMar90Blocks.oneoff.test.ts (the generator never emits TRP_SZ_ID for
// 88/89/90, so the blocked case must be injected into an otherwise-clean document).
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  dfoLicenceNo: '300123',
  dfoFin: '123456789',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  units: 'lbs',
  language: 'en',
};

function baseLog(subformId: number, regId: number): any {
  return {
    id: `test-log-${subformId}`,
    dateFished: '2026-06-10',
    lgbkUid: 'ABCDEF',
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

// Minimal region-appropriate fixtures (same overrides as genSampleAllSubforms).
function makeLog(subformId: number): any {
  if (subformId === 88) {
    const log = baseLog(88, 1006);
    log.data.fmaId = '25640';
    log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
    log.data.departurePort = 'RIMOUSKI';
    log.data.departurePortCodeId = '22648';
    log.data.portLanded = 'RIMOUSKI';
    log.data.portLandedCodeId = '22648';
    log.data.soakDuration = '2';
    log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
    return log;
  }
  if (subformId === 89) {
    const log = baseLog(89, 1014);
    log.data.fmaId = '1526';
    log.data.portLanded = 'ABOITEAU';
    log.data.portLandedCodeId = '19322';
    log.data.soakDuration = '2';
    log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
    return log;
  }
  if (subformId === 90) {
    const log = baseLog(90, 1004);
    log.data.fmaId = '28599';
    log.data.portLanded = "ABBOTT'S HARBOUR";
    log.data.portLandedCodeId = '20913';
    log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
    log.data.lgridCodeId = '101';
    log.data.gpsLat = '44.1234';
    log.data.gpsLng = '-66.5432';
    log.data.gpsSrc = 'gps';
    log.data.nbSpcmnBrd = '3';
    log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
    return log;
  }
  // NL-91
  const log = baseLog(91, 1002);
  log.data.fmaId = '2071';
  log.data.departurePort = 'PORT AUX BASQUES (CHANNEL)';
  log.data.departurePortCodeId = '21331';
  log.data.portLanded = 'PORT AUX BASQUES (CHANNEL)';
  log.data.portLandedCodeId = '21331';
  log.data.soakDuration = '2';
  log.data.gearSubtypeId = '39684';
  log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
  return log;
}

const MANDATORY_MSG = 'TRP_SZ_ID is mandatory for NL(91)';
const BLOCKED_MSG = 'TRP_SZ_ID is blocked for subform';

test('NL-91 WITHOUT trapSize trips the mandatory guard', () => {
  const log = makeLog(91); // no trapSize set → generator omits TRP_SZ_ID
  const xml = generateElogXml(log, profile);
  expect(xml).not.toContain('<TRP_SZ_ID>'); // generator emits nothing when value is empty

  const { errors } = validateElogXml(xml, 91);
  expect(errors.some(e => e.includes(MANDATORY_MSG))).toBe(true);
  expect(errors.some(e => e.includes('blocked'))).toBe(false);
});

test('NL-91 WITH trapSize emits TRP_SZ_ID and does not trip either guard (negative control)', () => {
  const log = makeLog(91);
  log.data.trapSize = '39682'; // Standard
  const xml = generateElogXml(log, profile);
  expect(xml).toContain('<TRP_SZ_ID>39682</TRP_SZ_ID>');

  const { errors } = validateElogXml(xml, 91);
  expect(errors.some(e => e.includes(MANDATORY_MSG))).toBe(false);
  expect(errors.some(e => e.includes('blocked'))).toBe(false);
});

test.each([88, 89, 90])('subform %s with an injected TRP_SZ_ID trips the blocked guard', (sf) => {
  const clean = generateElogXml(makeLog(sf), profile);
  expect(clean).not.toContain('<TRP_SZ_ID>'); // never emitted for 88/89/90

  // Inject into EFFORT_DETAIL at its XSD sequence slot (after LONG, before CATCH).
  const injected = clean.replace(
    '          <CATCH>',
    '          <TRP_SZ_ID>39682</TRP_SZ_ID>\n          <CATCH>',
  );
  expect(injected).toContain('<TRP_SZ_ID>39682</TRP_SZ_ID>');

  const { errors } = validateElogXml(injected, sf);
  expect(errors.some(e => e.includes(BLOCKED_MSG))).toBe(true);
  expect(errors.some(e => e.includes(MANDATORY_MSG))).toBe(false);
});
