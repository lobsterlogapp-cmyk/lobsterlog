// S148 Phase 3 guard — what the harvester and the officer actually end up reading.
//
// The two rulings this file exists to hold:
//
//   R-D1  "Couldn't reach DFO" and "DFO didn't accept it" must NEVER read the same. To a boarding
//         officer those are different facts: one means he tried and had no signal, the other means
//         DFO holds a record and refused it. Ruled a verify-gate row, not a preference — so it is
//         tested against the REAL locale files, in BOTH languages, not against a mock.
//
//   R-E   Nothing may render blank on a historical record. The 18 failure records already on disk
//         were written before this change and carry no marker; they must fall back to their stored
//         string and still show something.
import {
  SEND_FAILURE_BADGE_KEY,
  SEND_FAILURE_SHEET_KEY,
  isSendFailureKind,
  SendFailureKind,
} from '../dfoLogStorage';

const en = require('../../i18n/locales/en/dfo.json');
const fr = require('../../i18n/locales/fr/dfo.json');

// Resolve a 'logs.xxx' key path the same way t() does inside the 'dfo' namespace.
const lookup = (bundle: any, keyPath: string): string =>
  keyPath.split('.').reduce((o: any, k: string) => o?.[k], bundle);

const KINDS: SendFailureKind[] = ['refused', 'unclear', 'timeout', 'notSent'];

describe('every marker resolves to real wording in both languages', () => {
  it('T1 — all four badge keys and all four sheet keys exist in EN and FR, non-empty', () => {
    for (const kind of KINDS) {
      for (const map of [SEND_FAILURE_BADGE_KEY, SEND_FAILURE_SHEET_KEY]) {
        for (const [lang, bundle] of [['en', en], ['fr', fr]] as const) {
          const value = lookup(bundle, map[kind]);
          expect(typeof value).toBe('string');
          expect((value as string).trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('T2 — no marker resolves to a missing key (which would render the key path on screen)', () => {
    for (const kind of KINDS) {
      for (const map of [SEND_FAILURE_BADGE_KEY, SEND_FAILURE_SHEET_KEY]) {
        expect(lookup(en, map[kind])).not.toBeUndefined();
        expect(lookup(fr, map[kind])).not.toBeUndefined();
      }
    }
  });
});

describe('R-D1 — refused and notSent never read the same', () => {
  it('T3 — the BADGE words differ, in English and in French', () => {
    for (const [lang, bundle] of [['en', en], ['fr', fr]] as const) {
      const refused = lookup(bundle, SEND_FAILURE_BADGE_KEY.refused);
      const notSent = lookup(bundle, SEND_FAILURE_BADGE_KEY.notSent);
      expect(refused).not.toBe(notSent);
    }
  });

  it('T4 — the SHEET sentences differ, in English and in French', () => {
    for (const [lang, bundle] of [['en', en], ['fr', fr]] as const) {
      const refused = lookup(bundle, SEND_FAILURE_SHEET_KEY.refused);
      const notSent = lookup(bundle, SEND_FAILURE_SHEET_KEY.notSent);
      expect(refused).not.toBe(notSent);
    }
  });

  it('T5 — the sheet sentences say DIFFERENT THINGS, not just different words: only the '
     + 'no-signal one tells him to wait for signal, only the refused one points at a code', () => {
    expect(lookup(en, SEND_FAILURE_SHEET_KEY.notSent)).toMatch(/signal/i);
    expect(lookup(fr, SEND_FAILURE_SHEET_KEY.notSent)).toMatch(/signal/i);
    expect(lookup(en, SEND_FAILURE_SHEET_KEY.refused)).not.toMatch(/signal/i);
    expect(lookup(fr, SEND_FAILURE_SHEET_KEY.refused)).not.toMatch(/signal/i);
  });

  it('T6 — all four badge words are distinct from each other, in both languages', () => {
    for (const [lang, bundle] of [['en', en], ['fr', fr]] as const) {
      const words = KINDS.map(k => lookup(bundle, SEND_FAILURE_BADGE_KEY[k]));
      expect(new Set(words).size).toBe(KINDS.length);
    }
  });

  it('T7 — conditions 1 and 3 DELIBERATELY share one message (the ruled exception)', () => {
    // Not an accident: HTTP 4xx/5xx and the unusable-answer trio both map to 'unclear' by ruling,
    // because the harvester's next move is identical. Pinned so a future edit cannot split them
    // silently.
    expect(SEND_FAILURE_BADGE_KEY.unclear).toBe('logs.sendFailedUnclear');
    expect(SEND_FAILURE_SHEET_KEY.unclear).toBe('logs.sheetFailedUnclear');
  });
});

describe('R-E — historical records, written before S148, never render blank', () => {
  it('T8 — a record with no marker is not treated as a marker', () => {
    expect(isSendFailureKind(undefined)).toBe(false);
    expect(isSendFailureKind('')).toBe(false);
  });

  it('T9 — the raw strings the 18 stored records actually hold are not mistaken for markers, '
     + 'so every one of them takes the fallback branch and shows its stored text', () => {
    const storedOnDisk = [
      'Network request failed',
      'Error WS1038: DFO Web Service error WS1038',
      'HTTP 500',
      'Aborted',
      'Request timed out',
      'Unknown error',
    ];
    for (const s of storedOnDisk) expect(isSendFailureKind(s)).toBe(false);
  });

  it('T10 — the fallback chain used by both cards yields something non-empty for a historical '
     + 'record, and a dash rather than a blank when even that is missing', () => {
    const render = (r: { failureKind?: unknown; errorMessage?: string; wsErrCode?: string }) =>
      isSendFailureKind(r.failureKind)
        ? SEND_FAILURE_BADGE_KEY[r.failureKind]
        : (r.errorMessage || r.wsErrCode || '—');

    expect(render({ errorMessage: 'Network request failed' })).toBe('Network request failed');
    expect(render({ wsErrCode: 'WS1038' })).toBe('WS1038');
    expect(render({})).toBe('—');
    expect(render({ failureKind: 'refused' })).toBe('logs.sendFailedRefused');
  });
});
