// ONE-OFF (Phase 3 guard test): proves the EFFORT_DETAIL.GRID_ID emit + validator overlay
// (Rules 1011 / 1012 / 613x-614x) fire at runtime. QC(88) only, FMA-gated — like STAT_SECT_ID,
// not subform-gated. Mandatory for the 11 required QC FMAs (DFO_FMA_GRID_MAP), blocked for the
// 29 Rule-1011 FMAs (DFO_GRID_BLOCKED_FMA). Map digit: LFA 22 (1534) = "4" (613x); the twelve
// 18-series = "1" (614x). Real MV_GRID codes: 38507 = "4C29" (map 4), 29649 = "1GV40" (map 1).
//   • required FMA 1534 + valid "4" grid 38507  → emits <GRID_ID>, passes
//   • blocked  FMA 25640 (LFA 17b) + grid absent → passes (absent is correct, Rule 1011)
//   • required FMA 1534 + a "1" grid 29649        → Rule 613x (wrong map digit)
//   • required FMA 1534 + grid omitted            → Rule 1012 (mandatory)
//   • blocked  FMA 25640 + an injected GRID_ID    → Rule 1011 (blocked)
// The blocked-present case is INJECTED: the generator correctly refuses to emit GRID_ID for a
// blocked FMA, so the blocked guard is exercised on an otherwise-clean doc (mirrors
// validateLgridId.oneoff.test.ts). QC-88 fixture mirrors genSampleAllSubforms' valid QC-88.
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

// QC-88 fixture (regId 1006). gridId omitted entirely when undefined.
function qcLog(fmaId: string, gridId?: string): any {
  const log: any = {
    id: 'test-grid-88',
    dateFished: '2026-06-10',
    lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z',
    sentToDfo: false,
    subformId: 88,
    regId: 1006,
    data: {
      timeSailed: '05:30',
      timeStartedHauling: '06:00',
      timeStoppedHauling: '13:30',
      timeOfLanding: '14:45',
      crewRegistry: JSON.stringify(['Crew One', 'Crew Two']),
      catchWeight: '500',
      trapHauls: '250',
      bycatchEntries: '[]',
      personalUse: '10',
      dgClosePcons: '2026-06-10T15:00:00.000Z',
      mmYes: 'false',
      sarYes: 'false',
      lostGearYes: 'false',
      hlinCompany: '', hlinConfirmNo: '', hloutCompany: '', hloutConfirmNo: '',
      fmaId,
      departurePort: 'RIMOUSKI',
      departurePortCodeId: '22648',
      portLanded: 'RIMOUSKI',
      portLandedCodeId: '22648',
      soakDuration: '2',
      baitEntries: JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]),
      // S110 G1: LAT/LONG now mandatory for QC (rows 82/83) — needed for the valid:true asserts
      gpsLat: '48.4488',
      gpsLng: '-68.5236',
      gpsSrc: 'gps',
      useCrInd: 'Y',
      carrierVrn: '106460',
      prtnshpId: '39468',
      transferYes: 'true',
      transferTime: '15:00',
      transferWt: '50',
      transferToVrn: '106461',
    },
  };
  if (gridId !== undefined) log.data.gridId = gridId;
  return log;
}

const BLOCKED_MSG = 'GRID_ID is blocked for this FMA (Rule 1011)';
const MANDATORY_MSG = 'GRID_ID is mandatory for this FMA (Rule 1012)';
const INVALID_FRAG = 'is not valid for this FMA';

test('QC-88 required FMA 1534 with a valid map-"4" grid emits GRID_ID and passes', () => {
  const xml = generateElogXml(closeAllGroups(qcLog('1534', '38507')), profile);
  expect(xml).toContain('<GRID_ID>38507</GRID_ID>');

  const { valid, errors } = validateElogXml(xml, 88);
  expect(errors.some(e => e.includes('GRID_ID'))).toBe(false);
  expect(valid).toBe(true);
});

test('QC-88 blocked FMA 25640 with grid absent passes (absent is correct, Rule 1011)', () => {
  const xml = generateElogXml(closeAllGroups(qcLog('25640')), profile);
  expect(xml).not.toContain('<GRID_ID>');

  const { valid, errors } = validateElogXml(xml, 88);
  expect(errors.some(e => e.includes('GRID_ID'))).toBe(false);
  expect(valid).toBe(true);
});

test('QC-88 required FMA 1534 with a wrong-map "1" grid trips 613x — and only that', () => {
  const xml = generateElogXml(closeAllGroups(qcLog('1534', '29649')), profile);
  expect(xml).toContain('<GRID_ID>29649</GRID_ID>');

  const { errors } = validateElogXml(xml, 88);
  const gridErrs = errors.filter(e => e.includes('GRID_ID'));
  expect(gridErrs).toEqual([expect.stringContaining(INVALID_FRAG)]);
  expect(gridErrs[0]).toContain('613x'); // FMA 1534 map digit "4" → 613x
});

test('QC-88 required FMA 1534 with grid omitted trips Rule 1012 — and only that', () => {
  const xml = generateElogXml(closeAllGroups(qcLog('1534')), profile);
  expect(xml).not.toContain('<GRID_ID>');

  const { errors } = validateElogXml(xml, 88);
  const gridErrs = errors.filter(e => e.includes('GRID_ID'));
  expect(gridErrs).toEqual([expect.stringContaining(MANDATORY_MSG)]);
});

test('QC-88 blocked FMA 25640 with an injected GRID_ID trips Rule 1011 — and only that', () => {
  const clean = generateElogXml(closeAllGroups(qcLog('25640')), profile);
  expect(clean).not.toContain('<GRID_ID>'); // generator never emits for a blocked FMA
  const injected = clean.replace(
    '          <GEAR_GRP_NUM>',
    '          <GRID_ID>38507</GRID_ID>\n          <GEAR_GRP_NUM>'
  );
  expect(injected).toContain('<GRID_ID>38507</GRID_ID>');

  const { errors } = validateElogXml(injected, 88);
  const gridErrs = errors.filter(e => e.includes('GRID_ID'));
  expect(gridErrs).toEqual([expect.stringContaining(BLOCKED_MSG)]);
});
