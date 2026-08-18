// S128 Phase 1 — a section's REM note is frozen (§5.2.1 irreversibility) once ANY data group
// it transmits into is closed. Covers the note→close-key mapping and the pcons two-group case
// (founder ruling S128: 'pcons' rides BOTH PCONS occurrences → either close freezes it).
import { isNoteLocked, NOTE_CLOSE_KEYS } from '../dfoLogStorage';

const STAMP = '2026-08-14T12:00:00.000Z';
const closed = (...keys: string[]): Record<string, string> =>
  Object.fromEntries(keys.map(k => [k, STAMP]));

// Each single-group note: closing its governing key locks it; no close → not locked.
test('single-group notes lock only when their own group is closed', () => {
  const cases: [string, string][] = [
    ['landing', 'dgCloseLanding'],
    ['catch', 'dgCloseEffort'],
    ['haul', 'dgCloseEffort'],
    ['personalUse', 'dgClosePconsPersonal'],
    ['transfer', 'dgCloseTransfer'],
    ['hlin', 'dgCloseHlin'],
    ['hlout', 'dgCloseHlout'],
  ];
  for (const [note, key] of cases) {
    expect(isNoteLocked(note, {})).toBe(false);            // nothing closed
    expect(isNoteLocked(note, closed(key))).toBe(true);    // own group closed → locked
  }
});

// S134 Phase 3: the shared pcons note left the map (bycatch notes are per row; the legacy
// rem.pcons has no edit surface). Personal Use has its own note, locked ONLY by its own close.
// S135 Phase 2: the shared sar note left the map the same way — SAR notes are per block.
test('personalUse note locks only on the Personal Use close; the legacy pcons key is gone', () => {
  expect(isNoteLocked('personalUse', {})).toBe(false);
  expect(isNoteLocked('personalUse', closed('dgClosePconsBycatch'))).toBe(false); // bycatch close does NOT lock it
  expect(isNoteLocked('personalUse', closed('dgClosePconsPersonal'))).toBe(true);
  expect(isNoteLocked('pcons', closed('dgClosePconsBycatch', 'dgClosePconsPersonal'))).toBe(false);
});

// trip has no close control — it is never lockable, even with everything else closed.
test('trip note is never locked', () => {
  expect(isNoteLocked('trip', {})).toBe(false);
  expect(isNoteLocked('trip', closed(
    'dgCloseLanding', 'dgCloseEffort', 'dgCloseBaitUsed',
    'dgClosePconsBycatch', 'dgClosePconsPersonal', 'dgCloseSar',
    'dgCloseTransfer', 'dgCloseHlin', 'dgCloseHlout',
  ))).toBe(false);
});

// An unrelated group's close must not leak into another section's note.
test('an unrelated close does not lock a note', () => {
  expect(isNoteLocked('landing', closed('dgCloseBaitUsed'))).toBe(false);
  expect(isNoteLocked('transfer', closed('dgCloseHlin'))).toBe(false);
});

// The map covers exactly the closeable note sections. trip is absent by design (no close
// control); bait and pcons are absent as of S134, and sar as of S135 — those notes are PER
// OCCURRENCE, locked by the occurrence's own closeDt, and the legacy card-level notes have
// no edit surface (so no lock entry). personalUse joined in S134 Phase 3.
test('NOTE_CLOSE_KEYS covers the seven closeable note keys — not trip, not bait, not pcons (S134), not sar (S135)', () => {
  expect(Object.keys(NOTE_CLOSE_KEYS).sort()).toEqual(
    ['catch', 'haul', 'hlin', 'hlout', 'landing', 'personalUse', 'transfer'].sort(),
  );
  expect(NOTE_CLOSE_KEYS.trip).toBeUndefined();
  expect(NOTE_CLOSE_KEYS.bait).toBeUndefined();
  expect(NOTE_CLOSE_KEYS.pcons).toBeUndefined();
  expect(NOTE_CLOSE_KEYS.sar).toBeUndefined();
  expect(NOTE_CLOSE_KEYS.personalUse).toEqual(['dgClosePconsPersonal']);
});
