// S162d guard — THE TRIP HEADER IS ALWAYS TWO ROWS. Plainly, unconditionally.
//
// HISTORY (three revisions in one day — the file name is kept for continuity):
//   S162b: pinned an `isFr && subformId === 90` stack — wrong in kind (the crunch
//     was width, not language; EN broke the same way on narrow glass).
//   S162c: pinned a flexWrap fit rule — honest mechanism, misleading wording: two
//     buttons + any title exceed any current iPhone's row (~417pt of natural
//     content vs ~346pt of row on the widest capture device), so it stacked on
//     every frame. Jonathon saw it and ruled: "I like it better this way."
//   S162d (this file): the header is a plain two-row layout and the tests say so.
// Deleted with the S162c rule, by name: old W1's composed-WRAP container pin, old
// W2's matcher anchored on that wrap container, old W3's counts of the deleted
// tripHeaderWrap/TitleGroup/BtnGroup keys, old W4's `flexWrap: 'wrap'` exact-def
// pin. Nothing left passing vacuously.
//
// ⚠ WHAT THIS SUITE CANNOT PROVE — read before trusting a green run OR a mutation
// kill-count. Every test here READS SOURCE (FullDfoForm cannot render under jest;
// every suite in this repo is utils). A mutation pass against these pins proves
// the guard NOTICES SOURCE EDITS — a deleted prop, a lost row, a smuggled
// condition. It proves NOTHING about what renders: no test in this repo can see
// a pixel, and a kill-count is not a screenshot. The walk is the render proof,
// every time this header changes.

import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '../../components/FullDfoForm.tsx'), 'utf8');

// The whole header block, matched once and shared by the tests below.
const HEADER_RE =
  /<View style=\{\[styles\.sectionHeader, styles\.tripHeaderStacked\]\}>[\s\S]{0,900}?<\/View>\s*\n\s*<\/View>/;

test('S1: the header is ALWAYS two rows — title row above, button row beneath, no conditional', () => {
  const header = SRC.match(HEADER_RE);
  expect(header).not.toBeNull();
  const block = header![0];
  // row 1: icon + the trip title
  expect(block).toMatch(/tripHeaderTitleRow[\s\S]{0,300}?form234\.tripInfoSection/);
  // row 2: BOTH buttons via the shared helpers
  expect(block).toMatch(/tripHeaderBtnRow[\s\S]{0,200}?renderNoteButton\('trip'\)[\s\S]{0,100}?renderObsTripButton\(\)/);
  // and the title row comes BEFORE the button row
  expect(block.indexOf('tripHeaderTitleRow')).toBeLessThan(block.indexOf('tripHeaderBtnRow'));
});

test('S2: ⭐ numberOfLines={1} guards the title — its removal is the mid-word break coming back', () => {
  // "Trip Informatio / n" was photographed twice before this pin existed. The
  // title must render on ONE unbroken line; removing numberOfLines re-opens the
  // break (and removing the flex:0 override re-opens the FR squeeze-crunch).
  const header = SRC.match(HEADER_RE);
  expect(header).not.toBeNull();
  expect(header![0]).toMatch(
    /<Text style=\{\[styles\.sectionTitle, styles\.tripHeaderTitleText\]\} numberOfLines=\{1\}>/,
  );
  expect(SRC).toContain(`tripHeaderTitleText: { flex: 0, flexShrink: 1 },`);
});

test('S3: no language term, no subform term, no fit test — two rows is the whole rule', () => {
  const header = SRC.match(HEADER_RE);
  expect(header).not.toBeNull();
  expect(header![0]).not.toMatch(/isFr/);
  expect(header![0]).not.toMatch(/subformId/); // the observer button's MAR-90 gate
  // lives inside renderObsTripButton (obsTripNum B5 pins it) — what renders,
  // never how the row lays out.
  expect(header![0]).not.toMatch(/flexWrap/);
  expect(SRC).not.toMatch(/isFr && subformId === 90 \? \(/); // the S162b shape stays dead
});

test('S4: containment — the new keys reach ONLY the Trip header; every sibling still uses sectionHeader; dead keys gone', () => {
  for (const key of ['tripHeaderStacked', 'tripHeaderTitleRow', 'tripHeaderTitleText', 'tripHeaderBtnRow']) {
    const uses = SRC.match(new RegExp(`styles\\.${key}`, 'g')) ?? [];
    const defs = SRC.match(new RegExp(`^\\s*${key}: \\{`, 'gm')) ?? [];
    expect({ key, uses: uses.length }).toEqual({ key, uses: 1 });
    expect({ key, defs: defs.length }).toEqual({ key, defs: 1 });
  }
  // 10 sibling card headers + the Trip composition = 11, the census since c03f08b.
  const headerUses = SRC.match(/styles\.sectionHeader\b/g) ?? [];
  expect(headerUses.length).toBe(11);
  // the S162b AND S162c generations of keys must be GONE, not lingering
  for (const dead of ['tripHeaderStackedFr', 'tripHeaderTitleRowFr', 'tripHeaderBtnRowFr',
                      'tripHeaderWrap', 'tripHeaderTitleGroup', 'tripHeaderBtnGroup']) {
    expect(SRC).not.toContain(dead);
  }
});

test('S5: shared keys byte-frozen; the load-bearing props stand', () => {
  // Frozen since 40d9908 — an edit to either shared key fails here (10 other
  // cards render from them; only this card changes, via its own keys).
  expect(SRC).toContain(
    `  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },`,
  );
  expect(SRC).toContain(
    `sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', flex: 1 },`,
  );
  // The column override must stay a pure-layout composition (no copied values —
  // if it grows sectionHeader's border/margin values, the freeze above stops
  // protecting the Trip card from shared-key drift).
  expect(SRC).toContain(`tripHeaderStacked: { flexDirection: 'column', alignItems: 'stretch' },`);
  // Buttons right-aligned — walked and approved; a silent re-alignment fails here.
  expect(SRC).toMatch(/tripHeaderBtnRow: \{[^}]*justifyContent: 'flex-end'[^}]*\},/);
});

test('T7: the French button string is intact — « Observateur en mer » (ruling 1: stacking, not shortening)', () => {
  // KEPT AS-IS through all three revisions: a future "simplification" back to
  // « Observateur » fails here.
  const fr = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../i18n/locales/fr/dfo.json'), 'utf8'));
  expect(fr.form234.obsTripBtn).toBe('Observateur en mer');
  expect(fr.form234.obsTripNumLabel).toBe('NUMÉRO DE SORTIE EN MER DE L’OBSERVATEUR');
});
