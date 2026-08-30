// S128 Phase 5 — the open-section count must tell the truth on a no-haul (setting) day.
// usedDataGroupKeys now knows about effortYes: EFFORT (and the SAR node inside it) is not used
// when no haul is declared, so a no-haul log with bait counts 2 open sections (Landing + Bait),
// not 3, and no orphan dgCloseEffort stamp is written. The generator is untouched.
import { usedDataGroupKeys, unclosedUsedGroupKeys, DataGroupInputs, DfoLog } from '../dfoLogStorage';
import { generateElogXml } from '../dfoXmlGenerator';
import { EMPTY_PROFILE, CaptainProfile } from '../captainStorage';

const base: DataGroupInputs = {
  subformId: 90, hailFma: false, effortYes: true, baitCount: 0, bycatchYes: false, bycatchCount: 0,
  personalUse: '', sarYes: false, transferYes: false,
  hlinCompany: '', hlinConfirmNo: '', hlinTotalWeight: '', hloutCompany: '', hloutConfirmNo: '',
};

test('no-haul log with bait: exactly Landing + Bait are used (2), not 3', () => {
  const noHaul = { ...base, effortYes: false, baitCount: 1 };
  expect(usedDataGroupKeys(noHaul).sort()).toEqual(['dgCloseBaitUsed', 'dgCloseLanding']);
  expect(usedDataGroupKeys(noHaul)).not.toContain('dgCloseEffort');
});

test('haul log with bait is unchanged: Effort + Landing + Bait (3)', () => {
  const haul = { ...base, effortYes: true, baitCount: 1 };
  expect(usedDataGroupKeys(haul).sort()).toEqual(['dgCloseBaitUsed', 'dgCloseEffort', 'dgCloseLanding']);
});

test('no-haul with a stale sarYes: SAR is not counted (it lives inside EFFORT)', () => {
  const noHaulStaleSar = { ...base, effortYes: false, sarYes: true };
  const keys = usedDataGroupKeys(noHaulStaleSar);
  expect(keys).not.toContain('dgCloseSar');
  expect(keys).not.toContain('dgCloseEffort');
  expect(keys).toEqual(['dgCloseLanding']);
});

// Send-path guard (both callers share usedDataGroupKeys via dataGroupInputsFromLog).
const noHaulLog = (extra: Record<string, string> = {}): DfoLog => ({
  id: 'nh', lgbkUid: 'ABCDEF', firstEntryDt: '2026-06-10T08:55:00.000Z', mode: 'full',
  status: 'complete', dateFished: '2026-06-10', createdAt: 1, subformId: 90, regId: 1004, sentToDfo: false,
  data: {
    effortYes: 'false',
    timeSailed: '05:30', timeOfLanding: '14:45', landingDate: '2026-06-10',
    portLanded: "Abbott's Harbour", portLandedCodeId: '20913',
    crewRegistry: JSON.stringify(['Crew One']),
    baitEntries: JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]),
    bycatchEntries: '[]', personalUse: '', sarYes: 'true', // stale SAR from a haul→no-haul toggle
    ...extra,
  },
});

test('no-haul send guard never demands Effort or SAR be closed', () => {
  const open = unclosedUsedGroupKeys(noHaulLog());
  expect(open).not.toContain('dgCloseEffort');
  expect(open).not.toContain('dgCloseSar');
  // Only the real used groups (Landing + Bait) still need closing here.
  expect(open.sort()).toEqual(['dgCloseBaitUsed', 'dgCloseLanding']);
  // Once Landing + Bait are stamped, the guard is satisfied — no phantom Effort/SAR blocks the send.
  expect(unclosedUsedGroupKeys(noHaulLog({
    dgCloseLanding: '2026-06-10T15:00:00.000Z', dgCloseBaitUsed: '2026-06-10T15:00:00.000Z',
  }))).toEqual([]);
});

// Byte proof for verify #4: the generator omits EFFORT on a no-haul log, and an orphan
// dgCloseEffort stamp (the old bug) does not change a single byte of the emitted XML.
test('no-haul XML has no EFFORT node, and a dgCloseEffort stamp is inert', () => {
  const profile: CaptainProfile = {
    ...EMPTY_PROFILE, regId: 1004, subformId: 90, vesselNumber: '104460',
    licenceHolderFin: '100400460', fishingNumber: '104460', elogKey: 'x',
  };
  const withoutStamp = generateElogXml(noHaulLog(), profile);
  const withOrphan = generateElogXml(noHaulLog({ dgCloseEffort: '2026-06-10T15:00:00.000Z' }), profile);
  expect(withoutStamp).not.toContain('<EFFORT>');
  expect(withoutStamp).toBe(withOrphan); // the orphan stamp changes nothing on the wire
});
