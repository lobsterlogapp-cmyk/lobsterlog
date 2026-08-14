// S125 Phase 9 — the behaviour the fallback removal introduces (ruling 2). Covers what the
// migrated fixtures no longer exercise: the unclosed-group emit + the send-path guard inputs.
import { generateElogXml } from '../dfoXmlGenerator';
import { unclosedUsedGroupKeys, usedDataGroupKeys, DfoLog } from '../dfoLogStorage';
import { EMPTY_PROFILE, CaptainProfile } from '../captainStorage';
import { closeAllGroups } from './support/closeAllGroups';

const profile: CaptainProfile = {
  ...EMPTY_PROFILE, regId: 1004, subformId: 90, vesselNumber: '104460',
  licenceHolderFin: '100400460', fishingNumber: '104460', dfoLicenceNo: '104460', elogKey: 'x',
};

// A minimal MAR-90 log. `bait` toggles whether the BAIT data group is used.
const mar90 = (bait: boolean): DfoLog => ({
  id: 'p9', lgbkUid: 'ABCDEF', firstEntryDt: '2026-06-10T08:55:00.000Z', mode: 'full',
  status: 'complete', dateFished: '2026-06-10', createdAt: 1, subformId: 90, regId: 1004,
  sentToDfo: false,
  data: {
    timeSailed: '05:30', timeStartedHauling: '06:00', timeStoppedHauling: '13:30', timeOfLanding: '14:45',
    crewRegistry: JSON.stringify(['Crew One']), catchWeight: '500', trapHauls: '250',
    fmaId: '38065', lgridCodeId: '101', portLanded: "Abbott's Harbour", portLandedCodeId: '20913',
    baitEntries: bait ? JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]) : '[]',
    bycatchEntries: '[]', personalUse: '', mmYes: 'false', sarYes: 'false',
    hlinCompany: '', hlinConfirmNo: '', hloutCompany: '', hloutConfirmNo: '',
  },
});

const baitBlock = (xml: string) => (xml.match(/<BAIT_USED>[\s\S]*?<\/BAIT_USED>/) || [])[0] || '';

// (a) A USED group with no close stamp emits NO DG_CLOSE_DT (no fabricated now()); an UNUSED group
//     emits NO node at all.
test('used-but-unstamped bait: node present, but NO DG_CLOSE_DT (no fallback stamp)', () => {
  // bait used, effort+landing stamped so the rest is well-formed, but dgCloseBaitUsed is absent
  const log = mar90(true);
  log.data.dgCloseEffort = '2026-06-10T15:00:00.000Z';
  log.data.dgCloseLanding = '2026-06-10T15:00:00.000Z';
  const xml = generateElogXml(log, profile);
  expect(baitBlock(xml)).toContain('<BT_TYP_ID>');       // the node IS emitted (bait is used)
  expect(baitBlock(xml)).not.toContain('<DG_CLOSE_DT>');  // but no fabricated close stamp
});

test('unused bait: NO BAIT_USED node at all', () => {
  const xml = generateElogXml(closeAllGroups(mar90(false)), profile);
  expect(xml).not.toContain('<BAIT_USED>');
});

// (b) unclosedUsedGroupKeys returns exactly the used-but-unstamped sections for a PART-closed log.
test('part-closed log: unclosedUsedGroupKeys lists only the still-open used groups', () => {
  const log = mar90(true); // effort/landing/bait all used, none stamped
  log.data.dgCloseEffort = '2026-06-10T15:00:00.000Z'; // close effort only
  // used = effort, landing, bait; stamped = effort → open used = landing + bait
  expect(unclosedUsedGroupKeys(log).sort()).toEqual(['dgCloseBaitUsed', 'dgCloseLanding']);
  // once all are stamped, nothing is open
  expect(unclosedUsedGroupKeys(closeAllGroups(mar90(true)))).toEqual([]);
});

// (c) A LEGACY pre-S124 log — NO dgClose* keys at all — trips the guard. Pins the old shape.
test('legacy log with NO dgClose* keys: guard fires (effort + landing always used)', () => {
  const legacy = mar90(false); // no dgClose* keys anywhere in data
  const open = unclosedUsedGroupKeys(legacy);
  expect(open).toContain('dgCloseEffort');
  expect(open).toContain('dgCloseLanding');
  expect(open.length).toBeGreaterThan(0); // → the send refuses, names these sections
  // and the "used" set for a MAR-90 no-extras log is exactly effort + landing
  expect(usedDataGroupKeys({
    subformId: 90, fmaId: 38065, effortYes: true, baitCount: 0, bycatchYes: false, bycatchCount: 0,
    personalUse: '', sarYes: false, transferYes: false,
    hlinCompany: '', hlinConfirmNo: '', hloutCompany: '', hloutConfirmNo: '',
  }).sort()).toEqual(['dgCloseEffort', 'dgCloseLanding']);
});
