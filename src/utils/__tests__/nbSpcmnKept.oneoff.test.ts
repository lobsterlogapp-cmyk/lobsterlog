// ONE-OFF (Session 110 Phase 2 guard test): CATCH.NB_SPCMN_KEPT per region —
// Subforms_requirements_234.xlsx row 93 (Blocked QC-88 / Blocked GLF-89 / Blocked MAR-90 /
// Optional NL-91) + FS-NAT-234-12 Rule 976 ("NL … lobster … then the capture of the number
// of specimen kept (Catch.Nb_spcmn_kept) is mandatory") + Rule 977 (NL non-lobster → blocked).
//   • NL(91) with a value → emitted in the XSD slot (after KEPT_WT, before SPECIE_FRM_ID)
//   • NL(91) without → Rule 976 mandatory error
//   • QC/GLF with a STORED value → never emitted; injected → blocked (row 93)
//   • MAR(90) injected → the pre-existing "blocked for MAR(90)" guard (regression pin)
//   • NL(91) non-lobster CATCH with the element → Rule 977 blocked
// Mirrors the fixture/injection style of validateTrpSzId.oneoff.test.ts.
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
    log.data.gpsLat = '48.4488';
    log.data.gpsLng = '-68.5236';
    log.data.gpsSrc = 'gps';
    log.data.useCrInd = 'Y';
    log.data.carrierVrn = '106460';
    log.data.prtnshpId = '39468';
    log.data.transferYes = 'true';
    log.data.transferTime = '15:00';
    log.data.transferWt = '50';
    log.data.transferToVrn = '106461';
    return log;
  }
  if (subformId === 89) {
    const log = baseLog(89, 1014);
    log.data.fmaId = '1526';
    log.data.portLanded = 'ABOITEAU';
    log.data.portLandedCodeId = '19322';
    log.data.soakDuration = '2';
    log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
    log.data.gpsLat = '46.2412';
    log.data.gpsLng = '-64.5433';
    log.data.gpsSrc = 'manual';
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
  // NL-91 (no nbSpcmnKept by default — tests set it explicitly)
  const log = baseLog(91, 1002);
  log.data.fmaId = '2071';
  log.data.departurePort = 'PORT AUX BASQUES (CHANNEL)';
  log.data.departurePortCodeId = '21331';
  log.data.portLanded = 'PORT AUX BASQUES (CHANNEL)';
  log.data.portLandedCodeId = '21331';
  log.data.soakDuration = '2';
  log.data.trapSize = '39682';
  log.data.gearSubtypeId = '39684';
  log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
  return log;
}

const MANDATORY_MSG = 'NB_SPCMN_KEPT is mandatory for NL lobster catches (Rule 976)';
const ROW93_MSG = 'NB_SPCMN_KEPT is blocked for subform';
const MAR_MSG = 'NB_SPCMN_KEPT is blocked for MAR(90)';
const RULE977_MSG = 'NB_SPCMN_KEPT is blocked for non-lobster catches (Rule 977)';

test('NL-91 WITH a value emits NB_SPCMN_KEPT in the XSD slot and passes clean', () => {
  const log = makeLog(91);
  log.data.nbSpcmnKept = '120';
  const xml = generateElogXml(log, profile);
  // XSD catch_type sequence: SPECIE_ID, KEPT_WT, NB_SPCMN_KEPT, …, SPECIE_FRM_ID
  expect(xml).toMatch(/<KEPT_WT>[^<]*<\/KEPT_WT>\n\s*<NB_SPCMN_KEPT>120<\/NB_SPCMN_KEPT>\n\s*<SPECIE_FRM_ID>/);

  const { valid, errors } = validateElogXml(xml, 91);
  expect(errors.filter(e => e.includes('NB_SPCMN_KEPT'))).toEqual([]);
  expect(valid).toBe(true);
});

test('NL-91 WITHOUT a value trips the Rule 976 mandatory guard — and only that', () => {
  const log = makeLog(91); // no nbSpcmnKept
  const xml = generateElogXml(log, profile);
  expect(xml).not.toContain('<NB_SPCMN_KEPT>');

  const { errors } = validateElogXml(xml, 91);
  const keptErrs = errors.filter(e => e.includes('NB_SPCMN_KEPT'));
  expect(keptErrs).toEqual([expect.stringContaining(MANDATORY_MSG)]);
});

test.each([88, 89])('subform %s: a STORED nbSpcmnKept is never emitted; injection trips row 93', (sf) => {
  const log = makeLog(sf);
  log.data.nbSpcmnKept = '120'; // stored (e.g. region switched after entry) — must not emit
  const clean = generateElogXml(log, profile);
  expect(clean).not.toContain('<NB_SPCMN_KEPT>');

  const injected = clean.replace(
    /<KEPT_WT>([^<]*)<\/KEPT_WT>/,
    '<KEPT_WT>$1</KEPT_WT>\n            <NB_SPCMN_KEPT>120</NB_SPCMN_KEPT>',
  );
  expect(injected).toContain('<NB_SPCMN_KEPT>120</NB_SPCMN_KEPT>');

  const { errors } = validateElogXml(injected, sf);
  expect(errors.some(e => e.includes(`${ROW93_MSG} ${sf}`))).toBe(true);
  expect(errors.some(e => e.includes(MANDATORY_MSG))).toBe(false);
});

test('MAR-90: injection still trips the pre-existing MAR(90) blocked guard (regression pin)', () => {
  const clean = generateElogXml(makeLog(90), profile);
  expect(clean).not.toContain('<NB_SPCMN_KEPT>');

  const injected = clean.replace(
    /<KEPT_WT>([^<]*)<\/KEPT_WT>/,
    '<KEPT_WT>$1</KEPT_WT>\n            <NB_SPCMN_KEPT>120</NB_SPCMN_KEPT>',
  );
  const { errors } = validateElogXml(injected, 90);
  expect(errors.some(e => e.includes(MAR_MSG))).toBe(true);
});

test('NL-91: NB_SPCMN_KEPT on a NON-lobster catch trips Rule 977', () => {
  const log = makeLog(91);
  log.data.nbSpcmnKept = '120';
  const xml = generateElogXml(log, profile);
  // Flip the (single, lobster) CATCH species to Rock Crab — kept-count now rides a non-lobster catch
  const nonLobster = xml.replace(
    '            <SPECIE_ID>1312</SPECIE_ID>',
    '            <SPECIE_ID>1287</SPECIE_ID>',
  );
  const { errors } = validateElogXml(nonLobster, 91);
  expect(errors.some(e => e.includes(RULE977_MSG))).toBe(true);
  expect(errors.some(e => e.includes(MANDATORY_MSG))).toBe(false);
});
