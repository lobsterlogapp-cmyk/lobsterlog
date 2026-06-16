// ONE-OFF (S1–S4 diagnostics): writes /tmp/sample_{qc88,glf89,mar90,nl91}.xml for
// xmllint validation against the DFO Form 234 XSD, and prints validateElogXml()
// results per subform. Diagnostic only — no validity assertions beyond file output.
// Delete after the restructure sessions; not a real assertion suite.
import * as fs from 'fs';
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

// Region-appropriate minimal fixtures (codeIds from dfoConstants region lists)
const FIXTURES: { name: string; file: string; log: any }[] = [
  (() => {
    // QC-88: CREW_NB + PORT_ID mandatory; SOAKED_DUR required; BT_COND_ID required for
    // Mackerel(1315) per Rule 984 (deliberately chosen to surface the Item 13 gap)
    const log = baseLog(88, 1006);
    log.data.fmaId = '25640'; // LFA 17b
    log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
    log.data.departurePort = 'RIMOUSKI';
    log.data.departurePortCodeId = '22648'; // MV_PORT — Rimouski (QC)
    log.data.portLanded = 'RIMOUSKI';
    log.data.portLandedCodeId = '22648';
    log.data.soakDuration = '2'; // days (Rule 286) — wire converts to minutes
    log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
    // QC-only: USE_CR_IND + carrier VRN (Rules 639/642), PRTNSHP_ID, TRANSFER (Rules 248-252)
    log.data.useCrInd = 'Y';
    log.data.carrierVrn = '106460';
    log.data.prtnshpId = '39468';
    log.data.transferYes = 'true';
    log.data.transferTime = '15:00';
    log.data.transferWt = '50';
    log.data.transferToVrn = '106461';
    return { name: 'QC-88', file: '/tmp/sample_qc88.xml', log };
  })(),
  (() => {
    // GLF-89: CREW_NB blocked, TRIP.PORT_ID blocked, LANDING.PORT_ID mandatory, SOAKED_DUR required
    const log = baseLog(89, 1014);
    log.data.fmaId = '1526'; // LFA 15
    log.data.portLanded = 'ABOITEAU';
    log.data.portLandedCodeId = '19322'; // MV_PORT — Aboiteau (NB); LANDING.PORT_ID now mandatory all subforms
    log.data.soakDuration = '2'; // days (Rule 286) — wire converts to minutes
    log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
    return { name: 'GLF-89', file: '/tmp/sample_glf89.xml', log };
  })(),
  (() => {
    // MAR-90: CREW_NB mandatory, TRIP.PORT_ID blocked, LANDING.PORT_ID mandatory, SOAKED_DUR blocked, NB_SPCMN_BRD opt
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
    return { name: 'MAR-90', file: '/tmp/sample_mar90.xml', log };
  })(),
  (() => {
    // NL-91: PORT_ID mandatory, CREW_NB blocked, SOAKED_DUR required, GEAR_SBTYP_ID req
    const log = baseLog(91, 1002);
    log.data.fmaId = '2071'; // LFA 01
    log.data.departurePort = 'PORT AUX BASQUES (CHANNEL)';
    log.data.departurePortCodeId = '21331'; // MV_PORT — Port aux Basques (NL)
    log.data.portLanded = 'PORT AUX BASQUES (CHANNEL)';
    log.data.portLandedCodeId = '21331';
    log.data.soakDuration = '2'; // days (Rule 286) — wire converts to minutes
    log.data.gearSubtypeId = '39684'; // Wooden traps
    log.data.trapSize = '39682'; // TRP_SZ_ID — Standard (mandatory for NL-91, Rule 611)
    log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
    return { name: 'NL-91', file: '/tmp/sample_nl91.xml', log };
  })(),
];

test('writes all four subform samples and prints validator results', () => {
  for (const f of FIXTURES) {
    const xml = generateElogXml(f.log, profile);
    fs.writeFileSync(f.file, xml);
    const result = validateElogXml(xml, f.log.subformId);
    console.log(`${f.name} validator (${result.valid ? 'VALID' : `${result.errors.length} error(s)`}):`);
    for (const e of result.errors) console.log(`  - ${e}`);
    expect(xml).toContain('<GENERAL_INFO>');
  }
});
