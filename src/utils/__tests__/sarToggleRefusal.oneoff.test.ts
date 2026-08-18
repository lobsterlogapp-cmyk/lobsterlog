// S135 Phase 3 — the SAR toggle-No refusal (ruling 5, the bycatch shape). handleSarYes
// refuses the flip-to-No whenever sarBlocksAnyClosed says a block is closed — its own
// stamp OR the legacy card-level dgCloseSar — because flipping to No wipes every block
// and closed occurrences are irreversible (§5.2.1). These pin the refusal rule at the
// data layer plus the alert's i18n keys in BOTH languages (the alert body is
// form234.sarClosedNoToggle, titled by form234.sarSubsection).
import { sarBlocksAnyClosed } from '../dfoLogStorage';
import en from '../../i18n/locales/en/dfo.json';
import fr from '../../i18n/locales/fr/dfo.json';

// The block-1 flat keys every case shares (an ordinary in-progress SAR entry).
const base = (): Record<string, string> => ({
  sarYes: 'true',
  sarSpecies: '35427', sarLat: '44.1500', sarLng: '-66.6000', sarGpsSrc: 'gps',
  sarDate: '2026-06-10', sarTime: '09:15', sarNbSpcmn: '1', sarCondId: '38996',
});

test('flip-to-No is refused for every closed shape: block-1 own stamp, a closed extra block, and the legacy card stamp', () => {
  const block1Closed = base();
  block1Closed.sarCloseDt = '2026-06-10T14:10:00.000Z';
  expect(sarBlocksAnyClosed(block1Closed)).toBe(true);

  const extraClosed = base();
  extraClosed.extraSars = JSON.stringify([
    { species: '10561', nbSpcmn: '2', condId: '11881', closeDt: '2026-06-10T16:25:00.000Z' },
  ]);
  expect(sarBlocksAnyClosed(extraClosed)).toBe(true);

  const legacyCardClosed = base();
  legacyCardClosed.dgCloseSar = '2026-06-10T15:00:00.000Z'; // pre-S135 card-level close
  expect(sarBlocksAnyClosed(legacyCardClosed)).toBe(true);
});

test('flip-to-No stays allowed while every block is open (the wipe behaves as before)', () => {
  const allOpen = base();
  expect(sarBlocksAnyClosed(allOpen)).toBe(false);

  const openWithExtras = base();
  openWithExtras.extraSars = JSON.stringify([
    { species: '10561', nbSpcmn: '2', condId: '11881' },           // open
    { date: '2026-06-10', time: '11:45', gpsSrc: 'manual' },       // open, just added
  ]);
  expect(sarBlocksAnyClosed(openWithExtras)).toBe(false);
});

test('the refusal alert strings exist in BOTH languages', () => {
  expect(en.form234.sarClosedNoToggle).toBe(
    "Species at risk entries that are already closed can't be removed, so this can't be switched to No.",
  );
  expect(fr.form234.sarClosedNoToggle).toBe(
    'Les entrées d’espèces en péril déjà fermées ne peuvent pas être retirées, donc ce choix ne peut pas passer à Non.',
  );
  // The alert's title key (the card's own name) exists in both languages too.
  expect(en.form234.sarSubsection.length).toBeGreaterThan(0);
  expect(fr.form234.sarSubsection.length).toBeGreaterThan(0);
});
