// ONE-OFF (Session 93 guard test): locks in the 234.12 LOST_GEAR_IND de-emit.
// Authority: docs/GATE_234_12_DEEMIT_S93.md (LOST_GEAR_IND maxOccurs 1→0 = Blocked).
//
// (a) ABSENCE — generateElogXml() never emits <LOST_GEAR_IND> for ANY of the four subforms,
//     even when the input data carries lostGearYes:'true'|'false' (proves stored input can
//     never resurrect the now-Blocked element).
// (b) BLOCKED-DIRECTION — validateElogXml() REJECTS a document that DOES contain
//     <LOST_GEAR_IND> (XSD maxOccurs=0; EFFORT_SPEC spec min:0,max:0 → "too many <LOST_GEAR_IND>").
//
// Mirrors the fixture style of validateMar90Blocks / genSampleAllSubforms.oneoff.test.ts.
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
      lostGearYes: 'false', // overridden per-case below — must never resurrect the element
      hlinCompany: '',
      hlinConfirmNo: '',
      hloutCompany: '',
      hloutConfirmNo: '',
    },
  };
}

// Region-appropriate valid fixtures (same overrides as genSampleAllSubforms).
function makeQc88Log(): any {
  const log = baseLog(88, 1006);
  log.data.fmaId = '25640'; // LFA 17b
  log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
  log.data.departurePort = 'RIMOUSKI';
  log.data.departurePortCodeId = '22648';
  log.data.portLanded = 'RIMOUSKI';
  log.data.portLandedCodeId = '22648';
  log.data.soakDuration = '2';
  log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
  log.data.useCrInd = 'Y';
  log.data.carrierVrn = '106460';
  log.data.prtnshpId = '39468';
  log.data.transferYes = 'true';
  log.data.transferTime = '15:00';
  log.data.transferWt = '50';
  log.data.transferToVrn = '106461';
  return log;
}

function makeGlf89Log(): any {
  const log = baseLog(89, 1014);
  log.data.fmaId = '1526'; // LFA 15
  log.data.portLanded = 'ABOITEAU';
  log.data.portLandedCodeId = '19322';
  log.data.soakDuration = '2';
  log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
  return log;
}

function makeMar90Log(): any {
  const log = baseLog(90, 1004);
  log.data.fmaId = '28599'; // 38b
  log.data.portLanded = "ABBOTT'S HARBOUR";
  log.data.portLandedCodeId = '20913';
  log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
  log.data.lgridCodeId = '101';
  log.data.obsTripNum = '';
  log.data.gpsLat = '44.1234';
  log.data.gpsLng = '-66.5432';
  log.data.gpsSrc = 'gps';
  log.data.nbSpcmnBrd = '3';
  log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
  return log;
}

function makeNl91Log(): any {
  const log = baseLog(91, 1002);
  log.data.fmaId = '2071'; // LFA 01
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

const SUBFORMS = [
  { name: 'QC-88', make: makeQc88Log, subformId: 88 },
  { name: 'GLF-89', make: makeGlf89Log, subformId: 89 },
  { name: 'MAR-90', make: makeMar90Log, subformId: 90 },
  { name: 'NL-91', make: makeNl91Log, subformId: 91 },
];

// (a) ABSENCE — one test per subform × per lostGearYes value.
for (const sf of SUBFORMS) {
  for (const val of ['true', 'false']) {
    test(`(a) ${sf.name}: <LOST_GEAR_IND> never emitted (lostGearYes='${val}')`, () => {
      const log = sf.make();
      log.data.lostGearYes = val;
      const xml = generateElogXml(log, profile);
      expect(xml).not.toContain('LOST_GEAR_IND');
      // sanity: the two surviving mandatory EFFORT indicators are still emitted
      expect(xml).toContain('<SAR_IND>');
      expect(xml).toContain('<MM_INTER_IND>');
    });
  }
}

// (b) BLOCKED-DIRECTION — a doc that DOES carry <LOST_GEAR_IND> must fail validation.
test('(b) validateElogXml rejects an injected <LOST_GEAR_IND> (blocked, maxOccurs=0)', () => {
  const clean = generateElogXml(makeMar90Log(), profile);
  // negative control: clean doc has no LOST_GEAR_IND and validates
  expect(clean).not.toContain('LOST_GEAR_IND');
  expect(validateElogXml(clean, 90).valid).toBe(true);

  // inject LOST_GEAR_IND into its old 234.11 XSD slot (right after SAR_IND, before MM_INTER_IND)
  const injected = clean.replace(
    '</SAR_IND>',
    '</SAR_IND>\n      <LOST_GEAR_IND>N</LOST_GEAR_IND>',
  );
  expect(injected).toContain('<LOST_GEAR_IND>N</LOST_GEAR_IND>');

  const { valid, errors } = validateElogXml(injected, 90);
  expect(valid).toBe(false);
  expect(errors.some(e => e.includes('too many <LOST_GEAR_IND>'))).toBe(true);
});
