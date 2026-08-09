// ONE-OFF (Session 110 guard test, G1 fix): proves the per-region EFFORT_DETAIL.LAT/LONG
// behavior — Subforms_requirements_234.xlsx rows 82/83 (both 234.11 and 234.12 sheets):
//   • QC(88)/GLF(89): Mandatory — emitted with MODE when captured; validator flags absence
//   • NL(91): Blocked — never emitted even when coords sit on the stored log; injection flagged
//   • MAR(90): Rule 3059 unchanged — 38b emits byte-identically to pre-S110; non-38b blocked
// Mirrors the fixture/injection style of validateTrpSzId.oneoff.test.ts.
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';
import { closeAllGroups } from './support/closeAllGroups';

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
    log.data.fmaId = '25640'; // LFA 17b — grid blocked (Rule 1011), not a NB_VNTCH FMA
    log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
    log.data.departurePort = 'RIMOUSKI';
    log.data.departurePortCodeId = '22648';
    log.data.portLanded = 'RIMOUSKI';
    log.data.portLandedCodeId = '22648';
    log.data.soakDuration = '2';
    log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
    // QC-only mandatory: USE_CR_IND + carrier VRN, PRTNSHP_ID, TRANSFER (same as gridId fixture)
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
    log.data.fmaId = '1526'; // LFA 15
    log.data.portLanded = 'ABOITEAU';
    log.data.portLandedCodeId = '19322';
    log.data.soakDuration = '2';
    log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
    return log;
  }
  if (subformId === 90) {
    const log = baseLog(90, 1004);
    log.data.fmaId = '28599'; // 38b
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
  log.data.fmaId = '2071'; // LFA 01 — outside the Rule-621 stat-sect set
  log.data.departurePort = 'PORT AUX BASQUES (CHANNEL)';
  log.data.departurePortCodeId = '21331';
  log.data.portLanded = 'PORT AUX BASQUES (CHANNEL)';
  log.data.portLandedCodeId = '21331';
  log.data.soakDuration = '2';
  log.data.trapSize = '39682';
  log.data.gearSubtypeId = '39684';
  // S110 P2: NB_SPCMN_KEPT mandatory on the NL lobster catch (Rule 976) — needed for valid:true
  log.data.nbSpcmnKept = '120';
  log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
  return log;
}

const MANDATORY_FRAG = 'LAT and LONG are mandatory for subform';
const NL_BLOCKED_FRAG = 'LAT/LONG are blocked for NL(91)';
const MAR_BLOCKED_FRAG = 'LAT/LONG are blocked outside MAR FMA 38b (Rule 3059)';

test.each([
  [88, 'gps', 'G', '48.4488', '-68.5236'],
  [89, 'manual', 'M', '46.2412', '-64.5433'],
])('subform %s WITH coords emits LAT/LONG (MODE=%s→%s) and passes clean', (sf, src, mode, lat, lng) => {
  const log = makeLog(sf as number);
  log.data.gpsLat = lat;
  log.data.gpsLng = lng;
  log.data.gpsSrc = src;
  const xml = generateElogXml(closeAllGroups(log), profile);
  expect(xml).toContain(`<LAT MODE="${mode}">${lat}</LAT>`);
  expect(xml).toContain(`<LONG MODE="${mode}">${lng}</LONG>`);

  const { valid, errors } = validateElogXml(xml, sf as number);
  expect(errors.filter(e => e.includes('LAT'))).toEqual([]);
  expect(valid).toBe(true);
});

test.each([88, 89])('subform %s WITHOUT coords emits nothing and trips the rows-82/83 mandatory guard', (sf) => {
  const log = makeLog(sf); // no gpsLat/gpsLng
  const xml = generateElogXml(closeAllGroups(log), profile);
  expect(xml).not.toContain('<LAT');
  expect(xml).not.toContain('<LONG');

  const { errors } = validateElogXml(xml, sf);
  expect(errors.some(e => e.includes(`${MANDATORY_FRAG} ${sf}`))).toBe(true);
  expect(errors.some(e => e.includes('blocked'))).toBe(false);
});

test('NL-91 with coords ON THE STORED LOG emits nothing (rows 82/83 Blocked — old-draft safety)', () => {
  const log = makeLog(91);
  log.data.gpsLat = '47.5670'; // e.g. a pre-S110 NL draft that used the GPS section
  log.data.gpsLng = '-59.1360';
  log.data.gpsSrc = 'gps';
  const xml = generateElogXml(closeAllGroups(log), profile);
  expect(xml).not.toContain('<LAT');
  expect(xml).not.toContain('<LONG');

  const { valid, errors } = validateElogXml(xml, 91);
  expect(errors.filter(e => e.includes('LAT'))).toEqual([]);
  expect(valid).toBe(true);
});

test('NL-91 with injected LAT/LONG trips the blocked guard', () => {
  const clean = generateElogXml(closeAllGroups(makeLog(91)), profile);
  const injected = clean.replace(
    '          <TRP_SZ_ID>',
    '          <LAT MODE="G">47.5670</LAT>\n          <LONG MODE="G">-59.1360</LONG>\n          <TRP_SZ_ID>',
  );
  expect(injected).toContain('<LAT MODE="G">');

  const { errors } = validateElogXml(injected, 91);
  expect(errors.some(e => e.includes(NL_BLOCKED_FRAG))).toBe(true);
});

test('MAR-90 FMA 38b emits LAT/LONG byte-identically to pre-S110 (regression pin)', () => {
  const xml = generateElogXml(closeAllGroups(makeLog(90)), profile);
  expect(xml).toContain('          <LAT MODE="G">44.1234</LAT>\n          <LONG MODE="G">-66.5432</LONG>\n');

  const { errors } = validateElogXml(xml, 90);
  expect(errors.filter(e => e.includes('LAT'))).toEqual([]);
});

test('MAR-90 non-38b: stored coords are NOT emitted; injection still trips Rule 3059 (unchanged)', () => {
  const log = makeLog(90);
  log.data.fmaId = '1581'; // an LGRID FMA, not 38b
  log.data.nbSpcmnBrd = ''; // BRD is 38b-only
  const xml = generateElogXml(closeAllGroups(log), profile);
  expect(xml).not.toContain('<LAT');

  // XSD sequence puts LAT/LONG after GEAR_GRP_NUM — inject in-slot.
  const injected = xml.replace(
    '          <GEAR_GRP_NUM>1</GEAR_GRP_NUM>\n',
    '          <GEAR_GRP_NUM>1</GEAR_GRP_NUM>\n          <LAT MODE="G">44.1234</LAT>\n          <LONG MODE="G">-66.5432</LONG>\n',
  );
  const { errors } = validateElogXml(injected, 90);
  expect(errors.some(e => e.includes(MAR_BLOCKED_FRAG))).toBe(true);
});
