// S136 Phase 4 (extraction ruling) — the effort-level toggle refusals, pinned at the data
// layer the way sarToggleRefusal pinned S135's. Three single-sourced predicates:
// (1) effortsAnyClosed — the "Did you haul gear?" No-refusal (§4.2 ruling): refused
//     whenever ANY effort carries a close stamp, because the wipe would destroy closed,
//     irreversible occurrences (§5.2.1).
// (2) sarYesOnAnotherEffort — while another effort answers SAR = Yes, the trip-level SAR
//     pool stays emitted, so this effort's flag may flip to No freely.
// (3) sarNoToggleRefused — the SAR flip-to-No refusal: last remaining Yes + any closed
//     SAR block (own stamp or the legacy card stamp) → refused (the S128 hole).
// Plus the refusal alert's i18n keys in BOTH languages.
import {
  effortsAnyClosed, sarYesOnAnotherEffort, sarNoToggleRefused,
} from '../dfoLogStorage';
import en from '../../i18n/locales/en/dfo.json';
import fr from '../../i18n/locales/fr/dfo.json';

const STAMP = '2026-06-10T15:00:00.000Z';

// An ordinary in-progress two-effort data map (effort 1 = the flat keys).
const base = (): Record<string, string> => ({
  fmaId: '38065', catchWeight: '500', trapHauls: '250',
  timeStartedHauling: '06:00', timeStoppedHauling: '13:30',
  sarYes: 'false', mmYes: 'false',
  extraEffortNodes: JSON.stringify([
    { haulStartDate: '2026-06-11', haulStartTime: '07:15', fmaId: '38066',
      sarYes: 'false', mmYes: 'false', details: [{ catchWeight: '300', trapHauls: '120' }] },
  ]),
});

// ── (1) effortsAnyClosed — the "Did you haul gear?" refusal condition ───────────────────

test('the No toggle is refused for every closed shape: effort 1 stamped, an extra effort stamped', () => {
  const effort1Closed = base();
  effort1Closed.dgCloseEffort = STAMP;
  expect(effortsAnyClosed(effort1Closed)).toBe(true);

  const extraClosed = base();
  extraClosed.extraEffortNodes = JSON.stringify([
    { fmaId: '38066', sarYes: 'false', mmYes: 'false', closeDt: STAMP, details: [{}] },
  ]);
  expect(effortsAnyClosed(extraClosed)).toBe(true);
});

test('the No toggle stays allowed while every effort is open (the wipe behaves as before)', () => {
  expect(effortsAnyClosed(base())).toBe(false);
  // A legacy single-effort log with no stamp is open too.
  const legacy: Record<string, string> = { fmaId: '38065', catchWeight: '500' };
  expect(effortsAnyClosed(legacy)).toBe(false);
});

test('anyClosed is not the negation of anyOpen — one closed and one open effort is BOTH', () => {
  const mixed = base();
  mixed.dgCloseEffort = STAMP; // effort 1 closed, effort 2 open
  expect(effortsAnyClosed(mixed)).toBe(true);
});

// ── (2) sarYesOnAnotherEffort ────────────────────────────────────────────────────────────

test('another effort answering SAR = Yes is seen from either side, and an effort never counts itself', () => {
  const effort2Yes = base();
  effort2Yes.extraEffortNodes = JSON.stringify([{ sarYes: 'true', details: [{}] }]);
  expect(sarYesOnAnotherEffort(effort2Yes, 0)).toBe(true);  // asked for effort 1: effort 2 says Yes
  expect(sarYesOnAnotherEffort(effort2Yes, 1)).toBe(false); // asked for effort 2: only ITSELF says Yes

  const effort1Yes = base();
  effort1Yes.sarYes = 'true';
  expect(sarYesOnAnotherEffort(effort1Yes, 1)).toBe(true);  // asked for effort 2: effort 1 says Yes
  expect(sarYesOnAnotherEffort(effort1Yes, 0)).toBe(false); // asked for effort 1: only ITSELF says Yes
});

// ── (3) sarNoToggleRefused ───────────────────────────────────────────────────────────────

test('flipping the LAST remaining SAR Yes to No is refused while any SAR block is closed', () => {
  // Effort 2 is the only Yes; block 1 carries its own stamp — effort 2's No is refused.
  const d = base();
  d.extraEffortNodes = JSON.stringify([{ sarYes: 'true', details: [{}] }]);
  d.sarSpecies = '35427'; d.sarNbSpcmn = '1'; d.sarCondId = '38996';
  d.sarCloseDt = STAMP;
  expect(sarNoToggleRefused(d, 1)).toBe(true);

  // The legacy card-level stamp refuses the same way.
  const legacyCard = base();
  legacyCard.sarYes = 'true';
  legacyCard.dgCloseSar = STAMP;
  expect(sarNoToggleRefused(legacyCard, 0)).toBe(true);
});

test('the flip is free when another effort still answers Yes, or when every block is open', () => {
  // Closed block, but effort 1 ALSO says Yes → effort 2's No flips freely (the pool stands).
  const otherYes = base();
  otherYes.sarYes = 'true';
  otherYes.sarCloseDt = STAMP;
  otherYes.extraEffortNodes = JSON.stringify([{ sarYes: 'true', details: [{}] }]);
  expect(sarNoToggleRefused(otherYes, 1)).toBe(false);

  // Only open blocks → no refusal (the wipe behaves as before).
  const openBlocks = base();
  openBlocks.sarYes = 'true';
  openBlocks.sarSpecies = '35427';
  expect(sarNoToggleRefused(openBlocks, 0)).toBe(false);
});

// ── the refusal alert strings exist in BOTH languages ───────────────────────────────────

test('the refusal alert strings exist in BOTH languages', () => {
  expect(en.form234.effortClosedNoToggle).toBe(
    "Fishing efforts that are already closed can't be removed, so this can't be switched to No.",
  );
  expect(fr.form234.effortClosedNoToggle).toBe(
    'Les efforts de pêche déjà fermés ne peuvent pas être retirés, donc ce choix ne peut pas passer à Non.',
  );
  // The alert's title key (the card's own name) exists in both languages too.
  expect(en.form234.catchEffortSection.length).toBeGreaterThan(0);
  expect(fr.form234.catchEffortSection.length).toBeGreaterThan(0);
});
