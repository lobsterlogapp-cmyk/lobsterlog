// S135 — per-occurrence closure on SAR (§5: "close each occurrence of a data group
// independently"; DFO ruling Aug 17 2026, the bait/bycatch S134 pattern). SAR's occurrences
// are NOT one uniform array: block 1 lives as flat d.sar* keys, with its OWN stamp/note in
// the new flat d.sarCloseDt / d.sarNote keys (ruling 1 — block 1 does not move into
// extraSars); blocks 2+ ride d.extraSars, whose items now carry closeDt AND note. The
// card-level dgCloseSar / rem.sar are the FALLBACK, so a pre-S135 log emits byte-identically
// (proven by cmp in docs/GATE_S135_SAR_PER_BLOCK.md §1.2 and pinned per-node here).
import { generateElogXml } from '../dfoXmlGenerator';
import { unclosedUsedGroupKeys, sarBlocksFromData, sarBlocksAllClosed, DfoLog } from '../dfoLogStorage';
import { EMPTY_PROFILE, CaptainProfile } from '../captainStorage';

const profile: CaptainProfile = {
  ...EMPTY_PROFILE, regId: 1004, subformId: 90, vesselNumber: '104460',
  licenceHolderFin: '100400460', fishingNumber: '104460', dfoLicenceNo: '104460', elogKey: 'x',
};

// Minimal MAR-90 log (the baitPerRowClose fixture) with block-1 SAR fields; per-block
// stamps/notes injected per test. Effort + Landing carry fixed stamps so the only open
// group a test can see is SAR itself.
const mar90Sar = (): DfoLog => ({
  id: 's135', lgbkUid: 'ABCDEF', firstEntryDt: '2026-06-10T08:55:00.000Z', mode: 'full',
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

const sarNodes = (xml: string) => xml.match(/<SAR>[\s\S]*?<\/SAR>/g) ?? [];

// ── Case 1: three blocks closed at DIFFERENT times carry DIFFERENT stamps and notes;
//    block 1's flat keys land on the FIRST node only; the guard is satisfied ──
test('per-block stamps and notes emit per node; block-1 flat keys ride the first node; all-closed satisfies the send guard', () => {
  const log = mar90Sar();
  log.data.sarCloseDt = '2026-06-10T14:10:00.000Z'; // block 1's OWN stamp (new flat key)
  log.data.sarNote = 'First encounter';             // block 1's OWN note (new flat key)
  log.data.extraSars = JSON.stringify([
    { species: '10561', lat: '44.2000', lng: '-66.7000', gpsSrc: 'manual', date: '2026-06-10',
      time: '10:30', nbSpcmn: '2', condId: '11881', closeDt: '2026-06-10T16:25:00.000Z', note: 'Second encounter' },
    { species: '35427', lat: '44.2100', lng: '-66.7100', gpsSrc: 'gps', date: '2026-06-10',
      time: '11:45', nbSpcmn: '1', condId: '38996', closeDt: '2026-06-10T17:40:00.000Z' }, // closed, NO note
  ]);
  // No card-level dgCloseSar and no rem.sar — every stamp/note is the block's own.
  const xml = generateElogXml(log, profile);
  const nodes = sarNodes(xml);
  expect(nodes).toHaveLength(3);

  expect(nodes[0]).toContain('<DG_CLOSE_DT>20260610141000</DG_CLOSE_DT>');
  expect(nodes[1]).toContain('<DG_CLOSE_DT>20260610162500</DG_CLOSE_DT>');
  expect(nodes[2]).toContain('<DG_CLOSE_DT>20260610174000</DG_CLOSE_DT>');

  expect(nodes[0]).toContain('<REM>First encounter</REM>');
  expect(nodes[1]).toContain('<REM>Second encounter</REM>');
  expect(nodes[2]).not.toContain('<REM>'); // no note, no rem.sar → REM omitted

  // block 1 first: its species/coords are the flat-key values
  expect(nodes[0]).toContain('<SPECIE_ID>35427</SPECIE_ID>');
  expect(nodes[0]).toContain('<LAT MODE="G">44.1500</LAT>');

  // All blocks individually closed → the send guard does NOT demand the card-level key
  expect(sarBlocksAllClosed(log.data)).toBe(true);
  expect(unclosedUsedGroupKeys(log)).toEqual([]);
});

// ── Case 2: a block's own stamp/note WIN over the legacy card stamp / shared note;
//    blocks without their own still fall back (both fallbacks survive) ──
test('own stamp and note beat the legacy card stamp and shared rem.sar; unstamped blocks fall back to them', () => {
  const log = mar90Sar();
  log.data.dgCloseSar = '2026-06-10T18:00:00.000Z'; // legacy card stamp, later
  log.data.sarCloseDt = '2026-06-10T14:10:00.000Z'; // block 1 closed earlier, own note
  log.data.sarNote = 'Block one note';
  log.data.extraSars = JSON.stringify([
    { species: '10561', date: '2026-06-10', time: '10:30', nbSpcmn: '2', condId: '11881' }, // legacy-shaped
  ]);
  log.remarks = { sar: 'Shared legacy note' };
  const nodes = sarNodes(generateElogXml(log, profile));
  expect(nodes).toHaveLength(2);
  expect(nodes[0]).toContain('<DG_CLOSE_DT>20260610141000</DG_CLOSE_DT>'); // own beats card
  expect(nodes[0]).toContain('<REM>Block one note</REM>');                 // own beats shared
  expect(nodes[1]).toContain('<DG_CLOSE_DT>20260610180000</DG_CLOSE_DT>'); // card fallback
  expect(nodes[1]).toContain('<REM>Shared legacy note</REM>');             // rem.sar fallback
});

// ── Case 3: a LEGACY log (card stamp + shared note, zero per-block fields) emits the card
//    stamp and the shared note into EVERY node — the pre-S135 behavior, pinned ──
test('legacy log: every SAR node emits the card stamp and the shared note (fallback path pinned)', () => {
  const log = mar90Sar();
  log.data.dgCloseSar = '2026-06-10T15:00:00.000Z';
  log.data.extraSars = JSON.stringify([
    { species: '10561', date: '2026-06-10', time: '10:30', nbSpcmn: '2', condId: '11881' },
  ]);
  log.remarks = { sar: 'Shared legacy note' };
  const nodes = sarNodes(generateElogXml(log, profile));
  expect(nodes).toHaveLength(2);
  for (const n of nodes) {
    expect(n).toContain('<DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>');
    expect(n).toContain('<REM>Shared legacy note</REM>');
  }
});

// ── Case 4: send guard — any unstamped block keeps SAR open; the legacy card key alone
//    still closes it (unchanged path) ──
test('send guard: one open block refuses; all-blocks-stamped or the legacy card key passes', () => {
  const open = mar90Sar();
  open.data.sarCloseDt = '2026-06-10T14:10:00.000Z';
  open.data.extraSars = JSON.stringify([
    { species: '10561', date: '2026-06-10', time: '10:30', nbSpcmn: '2', condId: '11881' }, // OPEN
  ]);
  expect(sarBlocksAllClosed(open.data)).toBe(false);
  expect(unclosedUsedGroupKeys(open)).toEqual(['dgCloseSar']);

  const legacyClosed = mar90Sar();
  legacyClosed.data.dgCloseSar = '2026-06-10T15:00:00.000Z'; // card key only, no per-block
  expect(unclosedUsedGroupKeys(legacyClosed)).toEqual([]);
});

// ── Case 5: an unstamped BLOCK 1 keeps SAR open even when every extra block is closed
//    (the reader always includes block 1 — never vacuously closed) ──
test('send guard: block 1 without its own stamp keeps SAR open even with all extras closed', () => {
  const log = mar90Sar(); // no sarCloseDt, no dgCloseSar
  log.data.extraSars = JSON.stringify([
    { species: '10561', date: '2026-06-10', time: '10:30', nbSpcmn: '2', condId: '11881',
      closeDt: '2026-06-10T16:25:00.000Z' },
  ]);
  expect(sarBlocksAllClosed(log.data)).toBe(false);
  expect(unclosedUsedGroupKeys(log)).toEqual(['dgCloseSar']);
});

// ── Case 6: the reader's shape — block 1 first from the flat keys (stamp/note included),
//    extras in order; garbage extraSars JSON degrades to block 1 alone ──
test('sarBlocksFromData: block 1 synthesized from the flat keys, extras follow; tolerant JSON parse', () => {
  const log = mar90Sar();
  log.data.sarCloseDt = '2026-06-10T14:10:00.000Z';
  log.data.sarNote = 'B1';
  log.data.extraSars = JSON.stringify([{ species: '10561', nbSpcmn: '2' }]);
  const blocks = sarBlocksFromData(log.data);
  expect(blocks).toHaveLength(2);
  expect(blocks[0]).toMatchObject({
    species: '35427', lat: '44.1500', lng: '-66.6000', gpsSrc: 'gps',
    date: '2026-06-10', time: '09:15', nbSpcmn: '1', condId: '38996',
    closeDt: '2026-06-10T14:10:00.000Z', note: 'B1',
  });
  expect(blocks[1]).toMatchObject({ species: '10561', nbSpcmn: '2' });
  expect(blocks[1].closeDt).toBeUndefined();

  const garbage = mar90Sar();
  garbage.data.extraSars = '{not json';
  expect(sarBlocksFromData(garbage.data)).toHaveLength(1);
});
