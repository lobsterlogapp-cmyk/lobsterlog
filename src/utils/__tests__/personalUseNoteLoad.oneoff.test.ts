// S142 (defect 44) — the Personal Use note load hole, and the shared-note fallbacks that
// hid it.
//
// WHAT WENT WRONG, in plain words: a harvester typed a Personal Use note, closed the card
// (sealing it), left the log and came back. The note was gone from the screen, and the next
// Save deleted it from storage — so DFO received the log without it, or, on a log carrying
// the retired Interactions note, received THAT text in the Personal Use slot instead.
//
// The cause was a hand-written list of note names inside FullDfoForm's loader that had
// drifted from the LogRemarks type: eleven fields, ten names. `personalUse` (added S134
// Phase 3) was never added to the list.
//
// This suite guards BOTH halves:
//   1. the LOAD path — seedRemarksFromLog, the extracted helper the loader now calls, which
//      derives its keys from LOG_REMARK_KEYS so it cannot drift from the type again;
//   2. the EMIT path — an empty Personal Use note emits NOTHING, never a substitute.
//
// Note on scope: there is no component-render harness in this repo, so the load path is
// tested through the pure helper rather than by rendering FullDfoForm. That is exactly why
// the helper was extracted — see docs/GATE_S142_PERSONAL_USE_NOTE.md §2.6(c).

import { generateElogXml } from '../dfoXmlGenerator';
import {
  seedRemarksFromLog,
  LOG_REMARK_KEYS,
  DfoLog,
  LogRemarks,
} from '../dfoLogStorage';
import { EMPTY_PROFILE, CaptainProfile } from '../captainStorage';

const profile: CaptainProfile = {
  ...EMPTY_PROFILE, regId: 1004, subformId: 90, vesselNumber: '104460',
  licenceHolderFin: '100400460', fishingNumber: '104460', dfoLicenceNo: '104460', elogKey: 'x',
};

// Minimal MAR-90 log with a Personal Use declaration (the bycatchPerRowClose fixture shape).
const mar90 = (): DfoLog => ({
  id: 's142', lgbkUid: 'ABCDEF', firstEntryDt: '2026-06-10T08:55:00.000Z', mode: 'full',
  status: 'complete', dateFished: '2026-06-10', createdAt: 1, subformId: 90, regId: 1004,
  sentToDfo: false,
  data: {
    timeSailed: '05:30', timeStartedHauling: '06:00', timeStoppedHauling: '13:30', timeOfLanding: '14:45',
    crewRegistry: JSON.stringify(['Crew One']), catchWeight: '500', trapHauls: '250',
    fmaId: '38065', lgridCodeId: '101', portLanded: "Abbott's Harbour", portLandedCodeId: '20913',
    baitEntries: '[]', bycatchEntries: '[]',
    personalUse: '10',
    dgClosePconsPersonal: '2026-06-10T15:30:00.000Z',
    mmYes: 'false', sarYes: 'false',
    hlinCompany: '', hlinConfirmNo: '', hloutCompany: '', hloutConfirmNo: '',
    dgCloseEffort: '2026-06-10T15:00:00.000Z',
    dgCloseLanding: '2026-06-10T15:00:00.000Z',
  },
});

const pconsBlocks = (xml: string) => xml.match(/<PCONS>[\s\S]*?<\/PCONS>/g) ?? [];

// ── 1. THE DEFECT ITSELF: a saved Personal Use note must come back on reopen ──────────────
test('the Personal Use note survives the load path — the exact note that used to vanish', () => {
  const log = mar90();
  log.remarks = { personalUse: '4 keepers for the house' };
  const seeded = seedRemarksFromLog(log);
  expect(seeded.personalUse).toBe('4 keepers for the house');
});

// ── 2. THE CLASS OF DEFECT: the key list cannot drift from the type ───────────────────────
test('LOG_REMARK_KEYS carries every LogRemarks field — all eleven, personalUse included', () => {
  expect([...LOG_REMARK_KEYS].sort()).toEqual(
    ['bait', 'catch', 'haul', 'hlin', 'hlout', 'landing',
     'pcons', 'personalUse', 'sar', 'transfer', 'trip'].sort(),
  );
  expect(LOG_REMARK_KEYS).toHaveLength(11);
});

test('every stored note round-trips through the load path, one key at a time', () => {
  // Each key seeded alone, so a single missing name in the helper fails on its own row
  // rather than hiding inside a bulk comparison.
  for (const k of LOG_REMARK_KEYS) {
    const log = mar90();
    log.remarks = { [k]: `note for ${k}` } as LogRemarks;
    const seeded = seedRemarksFromLog(log);
    if (k === 'haul' || k === 'catch') continue; // the paired carve-out, asserted below
    expect(seeded[k]).toBe(`note for ${k}`);
  }
});

test('a log with no remarks at all seeds every key to empty, never undefined', () => {
  const seeded = seedRemarksFromLog(mar90());
  for (const k of LOG_REMARK_KEYS) expect(seeded[k]).toBe('');
});

// ── 3. THE CARVE-OUT: catch/haul are one box writing two keys ─────────────────────────────
test('the Catch & Effort pair seeds together — one note box, two keys, same text', () => {
  const fromCatch = seedRemarksFromLog({ ...mar90(), remarks: { catch: 'hauled steady' } });
  expect(fromCatch.catch).toBe('hauled steady');
  expect(fromCatch.haul).toBe('hauled steady');

  // A log saved by a version that wrote only `haul` still comes back with the pair agreeing.
  const fromHaul = seedRemarksFromLog({ ...mar90(), remarks: { haul: 'hauled steady' } });
  expect(fromHaul.catch).toBe('hauled steady');
  expect(fromHaul.haul).toBe('hauled steady');
});

// ── 4. THE EMIT HALF: an empty Personal Use note emits NOTHING, not a substitute ──────────
test('an empty Personal Use note emits no REM at all — the retired shared note cannot stand in', () => {
  const log = mar90();
  // The exact shape that produced the two already-sent files: a legacy log carrying the
  // retired Interactions note, with the Personal Use note absent.
  log.remarks = { pcons: 'Quiet trip; no bycatch, no marine mammal contact' };
  const xml = generateElogXml(log, profile);
  const blocks = pconsBlocks(xml);
  expect(blocks).toHaveLength(1);                       // the personal-use node only
  expect(blocks[0]).toContain('<USG_ID>37822</USG_ID>');
  expect(blocks[0]).not.toContain('<REM>');             // absent, not empty
  expect(xml).not.toContain('Quiet trip');              // the substitution is gone
});

test('a written Personal Use note still emits, on its own node, as itself', () => {
  const log = mar90();
  log.remarks = { personalUse: '4 keepers for the house' };
  const blocks = pconsBlocks(generateElogXml(log, profile));
  expect(blocks).toHaveLength(1);
  expect(blocks[0]).toContain('<USG_ID>37822</USG_ID>');
  expect(blocks[0]).toContain('<REM>4 keepers for the house</REM>');
});

// ── 5. THE ROUND TRIP END TO END: save → load → save must not lose the note ───────────────
test('save → reopen → save keeps the note, and the reopened log emits the same bytes', () => {
  const stored = mar90();
  stored.remarks = { personalUse: '4 keepers for the house' };
  const before = generateElogXml(stored, profile);

  // What the form holds after a reopen, and what it writes back on the next save.
  // buildRemarks() drops blanks and trims, so this mirrors it exactly.
  const seeded = seedRemarksFromLog(stored);
  const written: LogRemarks = {};
  (Object.keys(seeded) as (keyof LogRemarks)[]).forEach(k => {
    const v = seeded[k];
    if (v && v.trim() !== '') written[k] = v.trim();
  });

  expect(written.personalUse).toBe('4 keepers for the house');
  expect(generateElogXml({ ...stored, remarks: written }, profile)).toBe(before);
});
