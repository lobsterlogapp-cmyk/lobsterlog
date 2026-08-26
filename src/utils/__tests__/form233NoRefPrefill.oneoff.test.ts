// S142 (defect 58) — the 233's Referred ELOG UID must come up EMPTY.
//
// WHAT WENT WRONG, in plain words: the field arrived pre-filled with the most recently
// CREATED complete logbook on the device — nothing to do with the period the report covers.
// A 233 covering Aug 23–25 was sent carrying an Aug-14 UID. The element is optional, and
// DFO's own dictionary says: "If this inactivity is not related to any particular logbook,
// leave this field blank." A prefilled optional field is opt-out, and only if the harvester
// notices. It also made the box arrive full against a 6-character cap, so typing into it was
// a silent no-op — which is how a working Rule 953 check read as broken during the S141 walk.
//
// ⚠ ON WHAT THESE TESTS CAN AND CANNOT PROVE. The behaviour that changed lives inside a
// React component's mount effect, and this repo has NO component-render harness (no
// @testing-library, no react-test-renderer). So "a fresh form comes up empty" cannot be
// asserted by rendering the screen. Asserting EMPTY_FORM.logbookUidRefered === '' would be
// green and meaningless — it was ALWAYS '', and the prefill overwrote it in the effect.
//
// What is asserted instead:
//   1. a STRUCTURAL invariant — the 233 screen must not read the logbook store at all.
//      That is the real rule behind the ruling, it is rename-proof, and it fails loudly if a
//      future session restores the prefill;
//   2. the EMIT half — a report with no reference chosen carries no element, so an unrelated
//      logbook UID cannot reach DFO.
//
// The on-glass proof (fresh form empty, typing works, Rule 953 fires) is a walk, recorded in
// docs/GATE_S142_FORM_REMARKS_AND_233_REF.md §2.6.

import * as fs from 'fs';
import * as path from 'path';
import {
  Form233Entry,
  generateForm233Xml,
  validateForm233Xml,
} from '../dfoForm233Generator';

const SCREEN = path.join(__dirname, '..', '..', 'screens', 'Form233Screen.tsx');

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '104460',
  fishingNumber: '104460',
  licenceHolderFin: '100400460',
  regId: 1004,
  units: 'lbs',
  language: 'en',
};

// A report built exactly as an untouched fresh form builds one: every field the harvester
// filled in, and NO logbook reference — because he was never handed one.
const freshFormEntry: Form233Entry = {
  uid: 'ABCDEF',
  savedAt: 0,
  periodStartDate: '2026-08-23',
  periodEndDate: '2026-08-25',
  reason: 'Weather',
  licenceNo: '104460',
  fin: '100400460',
  sentToDfo: false,
};

// ── 1. STRUCTURAL: the 233 screen must not read the logbook store ─────────────────────────
// This is the invariant the ruling actually creates. Written against the import rather than
// the helper name so renaming loadLastLog cannot make it pass vacuously.
test('Form233Screen does not read the logbook store — no import from dfoLogStorage', () => {
  const src = fs.readFileSync(SCREEN, 'utf8');
  const imports = src
    .split('\n')
    .filter(l => /^\s*import\b/.test(l) && l.includes('dfoLogStorage'));
  expect(imports).toEqual([]);
});

test('Form233Screen has no live prefill wiring for the logbook reference', () => {
  const src = fs.readFileSync(SCREEN, 'utf8');
  // Strip comments first — the mount effect deliberately NAMES the removed prefill in prose
  // so no future session restores it, and that prose must not trip this guard.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  expect(code).not.toContain('loadLastLog');
  expect(code).not.toContain('lgbkUid');
  // The one assignment that caused the defect: seeding the field from anything on mount.
  expect(code).not.toMatch(/logbookUidRefered:\s*prefill/);
});

// ── 2. EMIT: no reference chosen ⇒ no element, so nothing unrelated can reach DFO ──────────
test('a report with no reference chosen emits NO LOGBOOK_UID_REFERED at all', () => {
  const xml = generateForm233Xml(freshFormEntry, profile);
  expect(xml).not.toContain('LOGBOOK_UID_REFERED');   // not even an empty tag
  expect(xml).toContain('<REPORT_UID>ABCDEF</REPORT_UID>');
  expect(validateForm233Xml(xml).valid).toBe(true);
});

test('an unrelated logbook UID cannot appear in a report the harvester left blank', () => {
  // The exact shape the defect produced: the harvester filled in an Aug 23–25 period and
  // never touched the reference field, while an Aug-14 log sat on the device.
  const xml = generateForm233Xml(freshFormEntry, profile);
  expect(xml).not.toContain('RXAJBV');     // the real UID from the reported case
  expect(xml).not.toMatch(/<LOGBOOK_UID_REFERED>[A-Z]{6}<\/LOGBOOK_UID_REFERED>/);
});

// ── 3. The field still WORKS when the harvester does choose one ────────────────────────────
test('a reference the harvester types is still emitted, and still Rule-953 checked', () => {
  const xml = generateForm233Xml({ ...freshFormEntry, logbookUidRefered: 'GHJKLM' }, profile);
  expect(xml).toContain('<LOGBOOK_UID_REFERED>GHJKLM</LOGBOOK_UID_REFERED>');
  expect(validateForm233Xml(xml).valid).toBe(true);

  // Rule 953 — the check the prefill was hiding during the S141 walk.
  const bad = generateForm233Xml({ ...freshFormEntry, logbookUidRefered: 'ab12' }, profile);
  const res = validateForm233Xml(bad);
  expect(res.valid).toBe(false);
  expect(res.errors.some(e => e.includes('LOGBOOK_UID_REFERED'))).toBe(true);
});
