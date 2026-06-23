// ONE-OFF (Session 76 launderer sweep): drives the REAL generator (pattern copied from
// genSampleAllSubforms.oneoff.test.ts — NOT the data-layer blankTimestampGate) to surface
// silently-defaulted values. Writes /tmp/sweep_{qc88,glf89,mar90,nl91}.xml.
//
// RUN WITH:  TZ=UTC npx jest launderSweep
// TZ=UTC keeps sentinels literal: time '14:37' -> date_12 ...1437; a midnight launder
// shows ...0000; a now()-stamp shows today's date (machine clock 2026-06-22), never 0610.
//
// SENTINEL CONVENTIONS (so a laundered value is obvious on sight):
//   dateFished = 2026-06-10 (clearly PAST)         times 14:37/14:52/15:08/15:23 (never 00:00)
//   weights 99 / 88 (profile.units='kg' so NO lbs->kg conversion — stays literal)
//   ports = recognizable real MV_PORT codeIds       trapHauls 77   firstEntryDt 0610 08:55
// LEFT BLANK/ABSENT ON PURPOSE: every dgClose* field, sarTime, transferTime, all optional
// location/port fields not pinned, bait/bycatch/personal-use, HLIN/HLOUT.
// QC-88 is the SAR_DT / TRNSF_DT probe: SAR_IND=Y + a TRANSFER, but sarTime & transferTime BLANK.
import * as fs from 'fs';
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  units: 'kg', // literal weights, no lbs->kg laundering of the sentinel
  language: 'en',
};

function baseLog(subformId: number, regId: number): any {
  return {
    id: `sweep-${subformId}`,
    dateFished: '2026-06-10',          // PAST
    lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z',
    sentToDfo: false,
    subformId,
    regId,
    tripNum: 7,
    data: {
      // distinctive sentinel times — NEVER 00:00, ascending (Rules 29/32)
      timeSailed: '14:37',
      timeStartedHauling: '14:52',
      timeStoppedHauling: '15:08',
      timeOfLanding: '15:23',
      catchWeight: '99',               // -> KEPT_WT 99.00
      trapHauls: '77',                 // -> NB_GEAR_HLD 77
      // mandatory indicators (Y/N). SAR overridden per-region.
      mmYes: 'false',
      sarYes: 'false',
      lostGearYes: 'false',
      // explicitly NOT set: every dgClose*, sarTime, transferTime, bait/bycatch/personalUse,
      // hlin*/hlout*, any unpinned port.
    },
  };
}

const FIXTURES: { name: string; file: string; log: any }[] = [
  (() => {
    // QC-88: CREW_NB + TRIP.PORT_ID mandatory; SOAKED_DUR required; USE_CR_IND/PRTNSHP_ID req.
    // PROBE: SAR_IND=Y with sarDate set but sarTime BLANK; TRANSFER with transferTime BLANK.
    const log = baseLog(88, 1006);
    log.data.fmaId = '25640';                       // LFA 17b
    log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']); // -> CREW_NB 2
    log.data.departurePortCodeId = '22648';         // Rimouski (QC) -> TRIP.PORT_ID
    log.data.portLandedCodeId = '22648';            // -> LANDING.PORT_ID
    log.data.soakDuration = '2';                    // days -> 2880 min
    log.data.useCrInd = 'N';                        // Rule 639 default; avoids carrier-VRN requirement
    log.data.prtnshpId = '39468';                   // MV_PARTNERSHIP_TYPE
    // --- SAR probe: date present, TIME blank ---
    log.data.sarYes = 'true';
    log.data.sarDate = '2026-06-10';
    log.data.sarTime = '';                          // BLANK -> watch SAR_DT
    log.data.sarLat = '44.1437';
    log.data.sarLng = '-66.1452';
    log.data.sarSpecies = '888';
    log.data.sarNbSpcmn = '88';
    log.data.sarCondId = '7';
    log.data.sarGpsSrc = 'manual';
    // --- TRANSFER probe: weight present, TIME blank ---
    log.data.transferYes = 'true';
    log.data.transferWt = '88';                     // -> WT 88.00
    log.data.transferTime = '';                     // BLANK -> watch TRNSF_DT
    log.data.transferToVrn = '654321';
    return { name: 'QC-88', file: '/tmp/sweep_qc88.xml', log };
  })(),
  (() => {
    // GLF-89: CREW_NB blocked, TRIP.PORT_ID blocked, LANDING.PORT_ID mandatory, SOAKED_DUR required.
    const log = baseLog(89, 1014);
    log.data.fmaId = '1526';                        // LFA 15
    log.data.portLandedCodeId = '19322';            // Aboiteau (NB)
    log.data.soakDuration = '2';
    return { name: 'GLF-89', file: '/tmp/sweep_glf89.xml', log };
  })(),
  (() => {
    // MAR-90: CREW_NB mandatory, TRIP.PORT_ID blocked, LGRID_ID mandatory, SOAKED_DUR blocked.
    // FMA 38b -> LAT/LONG + NB_SPCMN_BRD mandatory (structurally required given the FMA).
    const log = baseLog(90, 1004);
    log.data.fmaId = '28599';                       // 38b
    log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
    log.data.portLandedCodeId = '20913';            // Abbott's Harbour (NS)
    log.data.lgridCodeId = '101';                   // -> LGRID_ID
    log.data.gpsLat = '44.9090';
    log.data.gpsLng = '-66.9090';
    log.data.gpsSrc = 'gps';
    log.data.nbSpcmnBrd = '90';
    return { name: 'MAR-90', file: '/tmp/sweep_mar90.xml', log };
  })(),
  (() => {
    // NL-91: TRIP.PORT_ID mandatory, CREW_NB blocked, SOAKED_DUR required, TRP_SZ_ID + GEAR_SBTYP_ID req.
    const log = baseLog(91, 1002);
    log.data.fmaId = '2071';                        // LFA 01
    log.data.departurePortCodeId = '21331';         // Port aux Basques (NL) -> TRIP.PORT_ID
    log.data.portLandedCodeId = '21331';            // -> LANDING.PORT_ID
    log.data.soakDuration = '2';
    log.data.trapSize = '39682';                    // Standard
    log.data.gearSubtypeId = '39684';               // Wooden traps
    return { name: 'NL-91', file: '/tmp/sweep_nl91.xml', log };
  })(),
];

test('launderer sweep — generate + write + validate each region', () => {
  for (const f of FIXTURES) {
    const xml = generateElogXml(f.log, profile);
    fs.writeFileSync(f.file, xml);
    const result = validateElogXml(xml, f.log.subformId);
    console.log(`${f.name}: ${result.valid ? 'PASS (structurally valid)' : `FAIL (${result.errors.length})`} -> ${f.file}`);
    for (const e of result.errors) console.log(`   - ${e}`);
    expect(xml).toContain('<GENERAL_INFO>');
  }
});
