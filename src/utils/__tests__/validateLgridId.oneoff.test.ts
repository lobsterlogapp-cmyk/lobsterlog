// ONE-OFF (Session 59 guard test): proves the EFFORT_DETAIL.LGRID_ID validator overlay
// fires at runtime —
//   • MAR(90) with LGRID_ID populated → emits <LGRID_ID>, trips no guard
//   • QC/GLF/NL (88/89/91) with an injected LGRID_ID → "blocked"
// Per Subforms_requirements_234.xlsx row 85 (Optional for MAR(90) ONLY; Blocked for
// 88/89/91). Mirrors the fixture/injection style of validateTrpSzId.oneoff.test.ts — the
// generator only emits LGRID_ID for 90 when populated, so the blocked case must be
// injected into an otherwise-clean document. LGRID_ID is optional on 90 → no mandatory case.
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
  log.data.trapSize = '39682';
  log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
  return log;
}

const BLOCKED_MSG = 'LGRID_ID is blocked for subform';

test('MAR-90 WITH LGRID_ID populated emits the element and trips no guard', () => {
  const log = makeLog(90); // lgridCodeId = '101'
  const xml = generateElogXml(log, profile);
  expect(xml).toContain('<LGRID_ID>101</LGRID_ID>');

  const { errors } = validateElogXml(xml, 90);
  expect(errors.some(e => e.includes(BLOCKED_MSG))).toBe(false);
});

test.each([88, 89, 91])('subform %s with an injected LGRID_ID trips the blocked guard', (sf) => {
  const clean = generateElogXml(makeLog(sf), profile);
  expect(clean).not.toContain('<LGRID_ID>'); // never emitted for 88/89/91

  // Inject into EFFORT_DETAIL at its XSD sequence slot (after NB_GEAR_HLD, before GEAR_GRP_NUM).
  const injected = clean.replace(
    '          <GEAR_GRP_NUM>',
    '          <LGRID_ID>101</LGRID_ID>\n          <GEAR_GRP_NUM>',
  );
  expect(injected).toContain('<LGRID_ID>101</LGRID_ID>');

  const { errors } = validateElogXml(injected, sf);
  expect(errors.some(e => e.includes(BLOCKED_MSG))).toBe(true);
});
