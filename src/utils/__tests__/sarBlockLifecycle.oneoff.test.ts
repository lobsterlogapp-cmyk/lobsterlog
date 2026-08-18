// S135 Phase 2 — the SAR block lifecycle the new UI drives, tested at the data layer
// (the S134 pattern: the component calls single-sourced dfoLogStorage helpers; the tests
// pin those helpers plus the emit contracts the UI relies on):
//   · delete-slides-up: a closed block promoted from extraSars into the flat block-1 keys
//     transmits BYTE-IDENTICAL XML and stays closed (ruling 3)
//   · close-all: stampOpenSarBlocks stamps only open blocks, never restamps, writes no
//     card key, and satisfies the send guard (ruling 4)
//   · toggle lockout: sarBlocksAnyClosed / sarBlocksAnyOpen incl. the legacy card stamp
//     (§2.2 ruling b — the temporary disable keys off these)
//   · adopt-on-add + ruling 7: existing blocks keep identical bytes once they own the
//     copied stamp/note; the NEW block starts genuinely blank (no REM, no DG_CLOSE_DT)
import { generateElogXml } from '../dfoXmlGenerator';
import {
  unclosedUsedGroupKeys, sarBlocksFromData, sarBlocksAllClosed,
  sarBlocksAnyClosed, sarBlocksAnyOpen, stampOpenSarBlocks, DfoLog,
} from '../dfoLogStorage';
import { EMPTY_PROFILE, CaptainProfile } from '../captainStorage';

const profile: CaptainProfile = {
  ...EMPTY_PROFILE, regId: 1004, subformId: 90, vesselNumber: '104460',
  licenceHolderFin: '100400460', fishingNumber: '104460', dfoLicenceNo: '104460', elogKey: 'x',
};

// Minimal MAR-90 log (the sarPerBlockClose fixture) — SAR blocks injected per test.
const mar90Sar = (): DfoLog => ({
  id: 's135p2', lgbkUid: 'ABCDEF', firstEntryDt: '2026-06-10T08:55:00.000Z', mode: 'full',
  status: 'complete', dateFished: '2026-06-10', createdAt: 1, subformId: 90, regId: 1004,
  sentToDfo: false,
  data: {
    timeSailed: '05:30', timeStartedHauling: '06:00', timeStoppedHauling: '13:30', timeOfLanding: '14:45',
    crewRegistry: JSON.stringify(['Crew One']), catchWeight: '500', trapHauls: '250',
    fmaId: '38065', lgridCodeId: '101', portLanded: "Abbott's Harbour", portLandedCodeId: '20913',
    baitEntries: '[]', bycatchEntries: '[]', personalUse: '', mmYes: 'false',
    hlinCompany: '', hlinConfirmNo: '', hloutCompany: '', hloutConfirmNo: '',
    dgCloseEffort: '2026-06-10T15:00:00.000Z',
    dgCloseLanding: '2026-06-10T15:00:00.000Z',
    sarYes: 'true',
    sarSpecies: '35427', sarLat: '44.1500', sarLng: '-66.6000', sarGpsSrc: 'gps',
    sarDate: '2026-06-10', sarTime: '09:15', sarNbSpcmn: '1', sarCondId: '38996',
  },
});

// The closed second block used by the slide-up tests — its fields, stamp and note.
const E2 = {
  species: '10561', lat: '44.2000', lng: '-66.7000', gpsSrc: 'manual',
  date: '2026-06-10', time: '10:30', nbSpcmn: '2', condId: '11881',
  closeDt: '2026-06-10T16:25:00.000Z', note: 'Second encounter note',
};

const sarNodes = (xml: string) => xml.match(/<SAR>[\s\S]*?<\/SAR>/g) ?? [];

// ── Ruling 3: delete block 1 slides block 2 up — stamp AND note travel, bytes identical ──
test('a closed block slid up into the flat keys transmits byte-identical XML', () => {
  // BEFORE the delete: open block 1 + closed block 2 (E2) in extraSars.
  const before = mar90Sar();
  before.data.extraSars = JSON.stringify([E2]);
  const beforeNodes = sarNodes(generateElogXml(before, profile));
  expect(beforeNodes).toHaveLength(2);

  // AFTER the delete: E2's twelve fields promoted onto the flat keys (what removeSarBlock
  // does), extraSars gone. Same mapping sarBlocksFromData reads back out.
  const after = mar90Sar();
  after.data.sarSpecies = E2.species; after.data.sarLat = E2.lat; after.data.sarLng = E2.lng;
  after.data.sarGpsSrc = E2.gpsSrc; after.data.sarDate = E2.date; after.data.sarTime = E2.time;
  after.data.sarNbSpcmn = E2.nbSpcmn; after.data.sarCondId = E2.condId;
  after.data.sarCloseDt = E2.closeDt; after.data.sarNote = E2.note;
  const afterNodes = sarNodes(generateElogXml(after, profile));
  expect(afterNodes).toHaveLength(1);

  // The slid block's node is byte-for-byte the node it emitted as block 2.
  expect(afterNodes[0]).toBe(beforeNodes[1]);
});

test('a slid closed block stays closed: the reader still shows its stamp and the send guard stays satisfied', () => {
  const after = mar90Sar();
  after.data.sarSpecies = E2.species; after.data.sarLat = E2.lat; after.data.sarLng = E2.lng;
  after.data.sarGpsSrc = E2.gpsSrc; after.data.sarDate = E2.date; after.data.sarTime = E2.time;
  after.data.sarNbSpcmn = E2.nbSpcmn; after.data.sarCondId = E2.condId;
  after.data.sarCloseDt = E2.closeDt; after.data.sarNote = E2.note;
  const blocks = sarBlocksFromData(after.data);
  expect(blocks).toHaveLength(1);
  expect(blocks[0].closeDt).toBe(E2.closeDt);
  expect(blocks[0].note).toBe(E2.note);
  expect(unclosedUsedGroupKeys(after)).toEqual([]);
  // And the pre-delete shape (open block 1) was correctly refused:
  const before = mar90Sar();
  before.data.extraSars = JSON.stringify([E2]);
  expect(unclosedUsedGroupKeys(before)).toEqual(['dgCloseSar']);
});

// ── Ruling 4: the close-all stamping helper ──────────────────────────────────────────────
test('stampOpenSarBlocks stamps block 1 and every open extra; an already-closed extra keeps its earlier stamp', () => {
  const stamp = '2026-06-10T18:00:00.000Z';
  const extras = JSON.stringify([
    { species: '10561', nbSpcmn: '2' },                                   // open
    { species: '35427', nbSpcmn: '1', closeDt: '2026-06-10T16:25:00.000Z' }, // closed earlier
  ]);
  const out = stampOpenSarBlocks(undefined, extras, stamp);
  expect(out.sarCloseDt).toBe(stamp);
  const parsed = JSON.parse(out.extraSars) as { closeDt?: string }[];
  expect(parsed[0].closeDt).toBe(stamp);
  expect(parsed[1].closeDt).toBe('2026-06-10T16:25:00.000Z'); // never restamped
});

test('stampOpenSarBlocks never restamps a block 1 that already carries its own close', () => {
  const out = stampOpenSarBlocks('2026-06-10T14:10:00.000Z', '[]', '2026-06-10T18:00:00.000Z');
  expect(out.sarCloseDt).toBe('2026-06-10T14:10:00.000Z');
});

test('a close-all result satisfies the send guard with NO card-level key', () => {
  const log = mar90Sar();
  log.data.extraSars = JSON.stringify([{ species: '10561', date: '2026-06-10', time: '10:30', nbSpcmn: '2', condId: '11881' }]);
  const out = stampOpenSarBlocks(log.data.sarCloseDt, log.data.extraSars, '2026-06-10T18:00:00.000Z');
  log.data.sarCloseDt = out.sarCloseDt;
  log.data.extraSars = out.extraSars;
  expect(log.data.dgCloseSar).toBeUndefined();      // the card key is never written
  expect(sarBlocksAllClosed(log.data)).toBe(true);
  expect(unclosedUsedGroupKeys(log)).toEqual([]);
});

// ── §2.2 ruling (b): the toggle-lockout predicates ───────────────────────────────────────
test('sarBlocksAnyClosed / sarBlocksAnyOpen: own stamps and the legacy card stamp both lock the toggle', () => {
  const allOpen = mar90Sar().data;
  expect(sarBlocksAnyClosed(allOpen)).toBe(false);
  expect(sarBlocksAnyOpen(allOpen)).toBe(true);

  const oneClosed = mar90Sar().data;
  oneClosed.extraSars = JSON.stringify([{ species: '10561', closeDt: '2026-06-10T16:25:00.000Z' }]);
  expect(sarBlocksAnyClosed(oneClosed)).toBe(true);   // toggle locks
  expect(sarBlocksAnyOpen(oneClosed)).toBe(true);     // block 1 still open → close-all shows

  const legacyClosed = mar90Sar().data;
  legacyClosed.dgCloseSar = '2026-06-10T15:00:00.000Z';
  expect(sarBlocksAnyClosed(legacyClosed)).toBe(true); // toggle locks on a legacy log too
  expect(sarBlocksAnyOpen(legacyClosed)).toBe(false);  // card stamp closes everything → no close-all
});

// ── Adopt-on-add + ruling 7: identical bytes for owners, a genuinely blank new block ─────
test('adopt-on-add: existing blocks emit identical bytes once they own the copied stamp/note; the new block starts blank', () => {
  const cardStamp = '2026-06-10T15:00:00.000Z';
  const sharedNote = 'Legacy shared note';

  // BEFORE the add: a legacy log — card stamp + shared note, no per-block fields.
  const legacy = mar90Sar();
  legacy.data.dgCloseSar = cardStamp;
  legacy.data.extraSars = JSON.stringify([
    { species: '10561', lat: '44.2000', lng: '-66.7000', gpsSrc: 'manual',
      date: '2026-06-10', time: '10:30', nbSpcmn: '2', condId: '11881' },
  ]);
  legacy.remarks = { sar: sharedNote };
  const legacyNodes = sarNodes(generateElogXml(legacy, profile));
  expect(legacyNodes).toHaveLength(2);

  // AFTER the add (what addExtraSar produces): stamp+note copied onto both existing blocks,
  // card key dropped, shared note CLEARED (ruling 7), new open block appended.
  const adopted = mar90Sar();
  adopted.data.sarCloseDt = cardStamp;
  adopted.data.sarNote = sharedNote;
  adopted.data.extraSars = JSON.stringify([
    { species: '10561', lat: '44.2000', lng: '-66.7000', gpsSrc: 'manual',
      date: '2026-06-10', time: '10:30', nbSpcmn: '2', condId: '11881',
      closeDt: cardStamp, note: sharedNote },
    { date: '2026-06-10', time: '11:45', gpsSrc: 'manual' },   // the NEW block, genuinely open
  ]);
  adopted.remarks = {};   // ruling 7: rem.sar cleared (buildRemarks drops the empty key)
  const adoptedNodes = sarNodes(generateElogXml(adopted, profile));
  expect(adoptedNodes).toHaveLength(3);

  // Identical bytes for the blocks that now own their copies…
  expect(adoptedNodes[0]).toBe(legacyNodes[0]);
  expect(adoptedNodes[1]).toBe(legacyNodes[1]);
  // …and the new block inherits NOTHING: no close stamp, no note (rem.sar fallback is gone).
  expect(adoptedNodes[2]).not.toContain('<DG_CLOSE_DT>');
  expect(adoptedNodes[2]).not.toContain('<REM>');
  // The add left the group open, so the send guard refuses until the new block is closed.
  expect(unclosedUsedGroupKeys(adopted)).toEqual(['dgCloseSar']);
});
