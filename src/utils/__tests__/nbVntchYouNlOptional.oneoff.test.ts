// ONE-OFF (Session 145 defect-51 guard test): EFFORT_DETAIL.NB_VNTCH_YOU is OPTIONAL on the 19
// Newfoundland fishing areas (LFA 01–14c), not blocked.
//
// FS-NAT-234-12 Rule 625 blocks the entry only « lorsque la zone de gestion … ne fait PAS partie »
// of a 47-FMA list (19 NL + 28 QC); Rule 626 makes it « obligatoire » on 28 of those (the QC set,
// identical to Rule 624's) and carries NO "otherwise blocked" clause. The 19 FMAs inside 625 and
// outside 626 are therefore permitted-but-not-compelled. Subforms_requirements_234.xlsx row 88
// says the same thing in one word: NL(91) = "Optional".
//
// Before this session six places asked "is this a Quebec logbook?" before consulting the area
// list, so Newfoundland was never offered the field at all.
//
//   • NL(91) on LFA 01 with a typed number → emitted in the XSD slot, send check clean
//   • NL(91) on LFA 01 left blank        → element ABSENT ENTIRELY, send check clean
//   • QC(88) on a Rule 626 FMA blank      → still mandatory (regression pin)
//   • MAR(90) with an injected element    → still blocked (Rule 625, outside the 47)
//
// The blank case is the one that matters: it is the normal case for a Newfoundland harvester, and
// it must produce NO element rather than an empty one — the XSD types NB_VNTCH_YOU as integer_04
// with minOccurs=0, so `<NB_VNTCH_YOU></NB_VNTCH_YOU>` would be rejected. Asserted on the emitted
// string, not merely on the absence of a validator error.
// Mirrors the fixture/injection style of nbSpcmnKept.oneoff.test.ts.
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

// NL-91 on LFA 01 (2071). LFA 01 and LFA 02 are the only two of the 19 NL areas that are NOT
// also in DFO_FMA_STAT_SECT_REQUIRED, so the fixture stays clear of the Rule 621 statistical
// section — an unrelated mandatory field that would otherwise dominate the errors.
function makeNlLog(): any {
  const log = baseLog(91, 1002);
  log.data.fmaId = '2071';
  log.data.departurePort = 'PORT AUX BASQUES (CHANNEL)';
  log.data.departurePortCodeId = '21331';
  log.data.portLanded = 'PORT AUX BASQUES (CHANNEL)';
  log.data.portLandedCodeId = '21331';
  log.data.soakDuration = '2';
  log.data.trapSize = '39682';
  log.data.gearSubtypeId = '39684';
  log.data.nbSpcmnKept = '120';            // Rule 976 — mandatory on an NL lobster catch
  log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
  return log;
}

// QC-88 on LFA 19a1 (25656) — in Rule 626's mandatory 28.
function makeQcLog(): any {
  const log = baseLog(88, 1006);
  log.data.fmaId = '25656';
  log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
  log.data.departurePort = 'RIMOUSKI';
  log.data.departurePortCodeId = '22648';
  log.data.portLanded = 'RIMOUSKI';
  log.data.portLandedCodeId = '22648';
  log.data.soakDuration = '2';
  log.data.gpsLat = '48.4488';
  log.data.gpsLng = '-68.5236';
  log.data.gpsSrc = 'gps';
  log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
  log.data.vNotchCount = '4';
  return log;
}

// MAR-90 on LFA 34 (1589) — outside Rule 625's 47, so the element is blocked there.
function makeMarLog(): any {
  const log = baseLog(90, 1004);
  log.data.fmaId = '1589';
  log.data.portLanded = "ABBOTT'S HARBOUR";
  log.data.portLandedCodeId = '20913';
  log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
  log.data.lgridCodeId = '29340';
  log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
  return log;
}

const MANDATORY_MSG = 'NB_VNTCH_YOU is mandatory for this FMA (Rule 626)';
const BLOCKED_MSG = 'NB_VNTCH_YOU is blocked for this FMA (Rule 625)';

test('NL-91 on LFA 01 WITH a number emits NB_VNTCH_YOU in the XSD slot and passes clean', () => {
  const log = makeNlLog();
  log.data.nbVntchYou = '3';
  const xml = generateElogXml(closeAllGroups(log), profile);

  // Exactly one element, carrying the typed value.
  expect(xml.match(/<NB_VNTCH_YOU>/g) ?? []).toHaveLength(1);
  expect(xml).toContain('<NB_VNTCH_YOU>3</NB_VNTCH_YOU>');
  // XSD effort_detail sequence: … SOAKED_DUR, NB_VNTCH, NB_VNTCH_YOU, NB_GEAR_HLD …
  expect(xml).toMatch(/<NB_VNTCH_YOU>3<\/NB_VNTCH_YOU>\n\s*<NB_GEAR_HLD>/);

  const { valid, errors } = validateElogXml(xml, 91);
  expect(errors.filter(e => e.includes('NB_VNTCH_YOU'))).toEqual([]);
  expect(valid).toBe(true);
});

test('NL-91 on LFA 01 left BLANK emits no NB_VNTCH_YOU element at all and passes clean', () => {
  const log = makeNlLog();                 // nbVntchYou deliberately never set
  const xml = generateElogXml(closeAllGroups(log), profile);

  // The element must be ABSENT — not present-and-empty. An empty element would be invalid
  // against integer_04, and the send check below would not catch it.
  expect(xml).not.toContain('NB_VNTCH_YOU');
  expect(xml).not.toContain('<NB_VNTCH_YOU></NB_VNTCH_YOU>');

  const { valid, errors } = validateElogXml(xml, 91);
  expect(errors.filter(e => e.includes('NB_VNTCH_YOU'))).toEqual([]);
  expect(valid).toBe(true);
});

test('NL-91 on LFA 02 is optional too — blank sends clean, a number is carried', () => {
  const blank = makeNlLog();
  blank.data.fmaId = '1652';               // LFA 02
  const blankXml = generateElogXml(closeAllGroups(blank), profile);
  expect(blankXml).not.toContain('NB_VNTCH_YOU');
  expect(validateElogXml(blankXml, 91).valid).toBe(true);

  const filled = makeNlLog();
  filled.data.fmaId = '1652';
  filled.data.nbVntchYou = '0';            // a typed zero is a real answer, not a blank
  const filledXml = generateElogXml(closeAllGroups(filled), profile);
  expect(filledXml).toContain('<NB_VNTCH_YOU>0</NB_VNTCH_YOU>');
  expect(validateElogXml(filledXml, 91).valid).toBe(true);
});

test('QC-88 on a Rule 626 FMA still DEMANDS the count when blank (regression pin)', () => {
  const log = makeQcLog();                 // nbVntchYou deliberately never set
  const xml = generateElogXml(closeAllGroups(log), profile);
  const { errors } = validateElogXml(xml, 88);
  expect(errors.some(e => e.includes(MANDATORY_MSG))).toBe(true);
});

test('QC-88 on a Rule 626 FMA passes once the count is filled (regression pin)', () => {
  const log = makeQcLog();
  log.data.nbVntchYou = '2';
  const xml = generateElogXml(closeAllGroups(log), profile);
  expect(xml).toContain('<NB_VNTCH_YOU>2</NB_VNTCH_YOU>');
  const { errors } = validateElogXml(xml, 88);
  expect(errors.filter(e => e.includes('NB_VNTCH_YOU'))).toEqual([]);
});

test('MAR-90 never emits the count, and an injected one trips the blocked guard (Rule 625)', () => {
  const log = makeMarLog();
  log.data.nbVntchYou = '5';               // stored value must not resurrect the element
  const clean = generateElogXml(closeAllGroups(log), profile);
  expect(clean).not.toContain('NB_VNTCH_YOU');

  // Inject at its XSD sequence slot (after NB_VNTCH's slot, before NB_GEAR_HLD).
  const injected = clean.replace(
    '          <NB_GEAR_HLD>',
    '          <NB_VNTCH_YOU>5</NB_VNTCH_YOU>\n          <NB_GEAR_HLD>',
  );
  expect(injected).toContain('<NB_VNTCH_YOU>5</NB_VNTCH_YOU>');

  const { errors } = validateElogXml(injected, 90);
  expect(errors.some(e => e.includes(BLOCKED_MSG))).toBe(true);
});
