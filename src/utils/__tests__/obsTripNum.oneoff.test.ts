// S162 defect 141 guard — TRIP.OBS_TRIP_NUM: the emit and THE CLEAR RULE.
//
// WHY THIS EXISTS
// Founder ruling 3: toggling the at-sea-observer field OFF must ERASE the code, because a
// hidden value that still emits is the failure being designed out — "what is on the screen
// is what is in the file." FullDfoForm cannot render under jest in this repo (all suites are
// utils — the S154D mutation lesson), so this suite proves the rule in two halves:
//
//   PART A — EXECUTABLE. The generator is run on real fixtures: the element is present with
//   the value on MAR-90 when filled, absent when empty/erased, and absent on 88/89/91 even
//   when a value is injected into storage (the emit gate).
//
//   PART B — SOURCE-READ (the S154B weightRenderWiring pattern). FullDfoForm.tsx is read AS
//   TEXT and the clear path is pinned: the toggle-off branch erases; the storage write is
//   conditional (an erased code leaves NO key behind — which is what makes save-and-reopen
//   safe); hydration derives visibility from the value; the render and the cap are gated.
//
// HOW THE PROMPT'S SCENARIOS MAP (they cannot be executed as UI, so they compose):
//   "type, toggle off → gone from state/storage/XML":  B1 (erase) + B2 (no key) + A2/A3 (no emit)
//   "toggle off, toggle on → box empty":               B1 — the reopened field renders the same
//                                                       state var the erase just blanked
//   "save-and-reopen after toggle-off → not back":     B2 (erased ⇒ no stored key) + B3 (absent
//                                                       key hydrates empty AND closed) + A3
//   "absent from XML when empty":                      A2 (empty string), A3 (key absent),
//                                                       A4 (whitespace) — pins tag()'s behaviour
//   "present with value on MAR-90":                    A1 (+ A6: the validator ACCEPTS it —
//                                                       ruling 6, never required, never refused)
//
// ⚠ WHAT THIS GUARD CANNOT SEE — read before trusting it (S154B/S154C blind-spot class):
//   Part B is GREP-SHAPED. It proves the erase statement exists in the one toggle handler and
//   that the wiring text is as ruled; it cannot prove the button is reachable or that the tap
//   fires it on glass. That proof is the Phase 5 walk, and only the walk.

import * as fs from 'fs';
import * as path from 'path';
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';
import { closeAllGroups } from './support/closeAllGroups';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  dfoLicenceNo: '300123',
  dfoFin: '123456789',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  units: 'lbs',
  language: 'en',
};

function baseLog(subformId: number, regId: number): any {
  return {
    id: `test-log-${subformId}`,
    dateFished: '2026-06-10',
    lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z',
    sentToDfo: false,
    subformId,
    regId,
    data: {
      timeSailed: '05:30',
      timeStartedHauling: '06:00',
      timeStoppedHauling: '13:30',
      timeOfLanding: '14:45',
      crewRegistry: '[]',
      catchWeight: '500',
      trapHauls: '250',
      bycatchEntries: '[]',
      personalUse: '10',
      dgClosePcons: '2026-06-10T15:00:00.000Z',
      mmYes: 'false',
      sarYes: 'false',
      lostGearYes: 'false',
      hlinCompany: '',
      hlinConfirmNo: '',
      hloutCompany: '',
      hloutConfirmNo: '',
    },
  };
}

// Full valid MAR-90 fixture — same shape as validateMar90Blocks.oneoff (S142/S154D/S161
// fixture rules baked in: 38b hail groups with ETA + weight).
function makeMar90Log(): any {
  const log = baseLog(90, 1004);
  log.data.fmaId = '28599'; // 38b
  log.data.portLanded = "ABBOTT'S HARBOUR";
  log.data.portLandedCodeId = '20913';
  log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
  log.data.lgridCodeId = '101';
  log.data.gpsLat = '44.1234';
  log.data.gpsLng = '-66.5432';
  log.data.gpsSrc = 'gps';
  log.data.nbSpcmnBrd = '3';
  log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
  log.data.hlinCompany = 'Atlantic Catch Data Ltd.';
  log.data.hlinConfirmNo = 'HI-1001';
  log.data.hlinEta = '12:00';
  log.data.hlinTotalWeight = '111';
  log.data.dgCloseHlin = '2026-06-10T15:00:00.000Z';
  log.data.hloutCompany = 'Atlantic Catch Data Ltd.';
  log.data.hloutConfirmNo = 'HO-1001';
  log.data.dgCloseHlout = '2026-06-10T15:00:00.000Z';
  return log;
}

const CODE = 'G12-001A01'; // DFO's own example format (dictionary row 855)

// ---------------------------------------------------------------------------
// PART A — the emit, executed
// ---------------------------------------------------------------------------

test('A1: MAR-90 with a code emits OBS_TRIP_NUM once, in the TRIP slot before FIRST_ENTRY_DT', () => {
  const log = makeMar90Log();
  log.data.obsTripNum = CODE;
  const xml = generateElogXml(log, profile);
  const matches = xml.match(/<OBS_TRIP_NUM>/g) ?? [];
  expect(matches.length).toBe(1);
  expect(xml).toContain(`<OBS_TRIP_NUM>${CODE}</OBS_TRIP_NUM>`);
  // XSD sequence: after TRIP_NUM, before FIRST_ENTRY_DT (trip_type, XSD :217)
  const idx = xml.indexOf('<OBS_TRIP_NUM>');
  expect(idx).toBeGreaterThan(xml.indexOf('<TRIP_NUM>'));
  expect(idx).toBeLessThan(xml.indexOf('<FIRST_ENTRY_DT>'));
});

test('A2: empty string emits NOTHING — pins tag()-drops-empty, do not assume it', () => {
  const log = makeMar90Log();
  log.data.obsTripNum = '';
  const xml = generateElogXml(log, profile);
  expect(xml).not.toContain('OBS_TRIP_NUM');
});

test('A3: key absent entirely (the erased-storage shape) emits NOTHING', () => {
  const log = makeMar90Log();
  delete log.data.obsTripNum;
  const xml = generateElogXml(log, profile);
  expect(xml).not.toContain('OBS_TRIP_NUM');
});

test('A4: whitespace-only value emits NOTHING (tag() trims)', () => {
  const log = makeMar90Log();
  log.data.obsTripNum = '   ';
  const xml = generateElogXml(log, profile);
  expect(xml).not.toContain('OBS_TRIP_NUM');
});

test('A5: a value injected into storage on 88/89/91 NEVER reaches the wire (the emit gate)', () => {
  for (const [subformId, regId] of [[88, 1006], [89, 1014], [91, 1002]] as const) {
    const log = baseLog(subformId, regId);
    log.data.obsTripNum = 'OBS-X';
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('OBS_TRIP_NUM');
  }
});

test('A6: the validator ACCEPTS a filled code on a valid MAR-90 log (never required, never refused)', () => {
  const log = closeAllGroups(makeMar90Log());
  log.data.obsTripNum = CODE;
  const xml = generateElogXml(log, profile);
  const { valid, errors } = validateElogXml(xml, 90);
  expect(valid).toBe(true);
  expect(errors.filter(e => e.includes('OBS_TRIP_NUM'))).toEqual([]);
});

test('A6b: the validator ACCEPTS an absent code on a valid MAR-90 log (optional stays optional)', () => {
  const log = closeAllGroups(makeMar90Log());
  const xml = generateElogXml(log, profile);
  expect(xml).not.toContain('OBS_TRIP_NUM');
  const { valid, errors } = validateElogXml(xml, 90);
  expect(valid).toBe(true);
  expect(errors.filter(e => e.includes('OBS_TRIP_NUM'))).toEqual([]);
});

// ---------------------------------------------------------------------------
// PART B — the clear path, read from source (S154B pattern)
// ---------------------------------------------------------------------------

const SRC = fs.readFileSync(
  path.join(__dirname, '../../components/FullDfoForm.tsx'), 'utf8');

test('B1: the toggle-off branch ERASES the code and closes the field, in one statement block', () => {
  // Founder ruling 3, verbatim intent: "the field disappears and the code gets erased".
  // A toggle-off that merely hides would leave a value that still emits — the exact failure.
  expect(SRC).toMatch(
    /if\s*\(obsTripOpen\)\s*\{\s*setObsTripNum\(''\);\s*setObsTripOpen\(false\);\s*\}/,
  );
});

test('B2: the storage write is CONDITIONAL — an erased code leaves no key behind', () => {
  // buildLogData writes the key only when non-empty. This is what makes save-and-reopen
  // safe: an erased code stores nothing, so hydration has nothing to resurrect.
  expect(SRC).toMatch(
    /\.\.\.\(obsTripNum\.trim\(\)\s*\?\s*\{\s*obsTripNum:\s*obsTripNum\.trim\(\)\s*\}\s*:\s*\{\}\)/,
  );
  // And no SECOND, unconditional writer may exist anywhere in the file: a bare
  // `obsTripNum,` shorthand in any object literal would defeat the clear.
  const bareShorthand = SRC.match(/^\s*obsTripNum,\s*$/m);
  expect(bareShorthand).toBeNull();
});

test('B3: hydration derives visibility from the value — a stored code reopens VISIBLE, an absent one reopens CLOSED and EMPTY', () => {
  expect(SRC).toMatch(/setObsTripNum\(d\.obsTripNum\s*\|\|\s*''\)/);
  expect(SRC).toMatch(/setObsTripOpen\(!!\(d\.obsTripNum\s*\|\|\s*''\)\.trim\(\)\)/);
});

test('B4: the field render is gated MAR-90 AND open, and carries the 20-char cap', () => {
  // One render site, gated on both; the renderField call passes maxLength 20 (string_20)
  // as its final argument — the match runs through the call's closing `20)`.
  const renderSite = SRC.match(
    /subformId === 90 && obsTripOpen &&\s*\n\s*renderField\(t\('form234\.obsTripNumLabel'\)[\s\S]{0,300}?'default',\s*false,\s*20\)/,
  );
  expect(renderSite).not.toBeNull();
});

// ---------------------------------------------------------------------------
// PART C — the validator arms (S162 Phase 4): blocked direction + the 20-cap.
// The generator never produces these documents (A5 proves the emit gate), so the
// blocked test INJECTS the element — the validateMar90Blocks injection pattern.
// ---------------------------------------------------------------------------

test('C1: OBS_TRIP_NUM injected into an 88/89/91 document trips the blocked guard', () => {
  for (const [subformId, regId] of [[88, 1006], [89, 1014], [91, 1002]] as const) {
    const clean = generateElogXml(baseLog(subformId, regId), profile);
    expect(clean).not.toContain('OBS_TRIP_NUM'); // sanity: injection target is clean
    const injected = clean.replace(
      /(<TRIP_NUM>[^<]*<\/TRIP_NUM>)/,
      '$1\n    <OBS_TRIP_NUM>OBS-X</OBS_TRIP_NUM>',
    );
    expect(injected).toContain('<OBS_TRIP_NUM>OBS-X</OBS_TRIP_NUM>');
    const { errors } = validateElogXml(injected, subformId);
    expect(errors.some(e => e.includes(`OBS_TRIP_NUM is blocked for subform ${subformId}`))).toBe(true);
  }
});

test('C2: a 21-character code trips the string_20 cap; exactly 20 passes', () => {
  const over = makeMar90Log();
  over.data.obsTripNum = 'A'.repeat(21);
  const overXml = generateElogXml(closeAllGroups(over), profile);
  const overResult = validateElogXml(overXml, 90);
  expect(overResult.errors.some(e => e.includes('OBS_TRIP_NUM') && e.includes('exceeds 20 characters'))).toBe(true);

  const atCap = makeMar90Log();
  atCap.data.obsTripNum = 'B'.repeat(20);
  const atCapXml = generateElogXml(closeAllGroups(atCap), profile);
  const atCapResult = validateElogXml(atCapXml, 90);
  expect(atCapResult.valid).toBe(true);
  expect(atCapResult.errors.filter(e => e.includes('OBS_TRIP_NUM'))).toEqual([]);
});

test('C3: & and < in the box produce a VALID file — escaped on the wire, and the 20-cap measures the DECODED value', () => {
  // Founder instruction (Gate 5): close the escaping hole before it exists. A code
  // containing XML metacharacters must escape cleanly and still validate.
  const log = closeAllGroups(makeMar90Log());
  log.data.obsTripNum = 'A&B<C';
  const xml = generateElogXml(log, profile);
  expect(xml).toContain('<OBS_TRIP_NUM>A&amp;B&lt;C</OBS_TRIP_NUM>');
  const { valid, errors } = validateElogXml(xml, 90);
  expect(valid).toBe(true);
  expect(errors.filter(e => e.includes('OBS_TRIP_NUM'))).toEqual([]);

  // The S154D D4 twist: '&' is 5 characters on the wire (&amp;). A code of exactly
  // 20 DECODED characters that is 24 on the wire must still pass — the cap measures
  // what the harvester typed, not the escaped bytes.
  const atCap = closeAllGroups(makeMar90Log());
  atCap.data.obsTripNum = '&' + 'D'.repeat(19); // 20 decoded, 24 on the wire
  const atCapXml = generateElogXml(atCap, profile);
  expect(atCapXml).toContain('<OBS_TRIP_NUM>&amp;' + 'D'.repeat(19) + '</OBS_TRIP_NUM>');
  const atCapResult = validateElogXml(atCapXml, 90);
  expect(atCapResult.valid).toBe(true);
  expect(atCapResult.errors.filter(e => e.includes('OBS_TRIP_NUM'))).toEqual([]);
});

test('B5: the button is gated MAR-90 only and guards readOnly', () => {
  // The button block: subform gate wraps it; the handler no-ops on a read-only (sent) log.
  const btn = SRC.match(/\{subformId === 90 && \(\s*\n\s*<TouchableOpacity[\s\S]{0,600}?obsTripBtn/);
  expect(btn).not.toBeNull();
  expect(btn![0]).toMatch(/if \(readOnly\) return;/);
});
