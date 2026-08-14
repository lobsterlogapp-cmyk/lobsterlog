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
    ['bait', 'dgCloseBaitUsed'],
    ['sar', 'dgCloseSar'],
    ['transfer', 'dgCloseTransfer'],
    ['hlin', 'dgCloseHlin'],
    ['hlout', 'dgCloseHlout'],
  ];
  for (const [note, key] of cases) {
    expect(isNoteLocked(note, {})).toBe(false);            // nothing closed
    expect(isNoteLocked(note, closed(key))).toBe(true);    // own group closed → locked
  }
});

// pcons is ONE note transmitting into TWO independently-closeable PCONS groups.
test('pcons note locks when EITHER PCONS occurrence is closed', () => {
  expect(isNoteLocked('pcons', {})).toBe(false);
  expect(isNoteLocked('pcons', closed('dgClosePconsBycatch'))).toBe(true);   // bycatch only
  expect(isNoteLocked('pcons', closed('dgClosePconsPersonal'))).toBe(true);  // personal only
  expect(isNoteLocked('pcons', closed('dgClosePconsBycatch', 'dgClosePconsPersonal'))).toBe(true);
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
  expect(isNoteLocked('bait', closed('dgCloseLanding'))).toBe(false);
  expect(isNoteLocked('sar', closed('dgCloseHlin'))).toBe(false);
});

// The map covers exactly the closeable note sections (trip absent by design).
test('NOTE_CLOSE_KEYS covers the eight closeable note keys and not trip', () => {
  expect(Object.keys(NOTE_CLOSE_KEYS).sort()).toEqual(
    ['bait', 'catch', 'haul', 'hlin', 'hlout', 'landing', 'pcons', 'sar', 'transfer'].sort(),
  );
  expect(NOTE_CLOSE_KEYS.trip).toBeUndefined();
  expect(NOTE_CLOSE_KEYS.pcons).toEqual(['dgClosePconsBycatch', 'dgClosePconsPersonal']);
});
