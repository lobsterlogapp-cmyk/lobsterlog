// S162c guard — THE TRIP HEADER FITS OR WRAPS: width-driven, unconditional.
//
// HISTORY: the S162b version of this suite pinned a LANGUAGE+REGION rule
// (`isFr && subformId === 90` stacking). Jonathon then found the same crunch in
// ENGLISH on a narrower device — the cause is width, not language — and ruled
// "stack when it doesn't fit". This suite was REWRITTEN to the new rule (the
// S154D lineage: rewritten, not weakened). Deleted with the old rule, by name:
//   old T1/T2 (the two-branch conditional), old T5 (the isFr idiom pin that
//   existed only to support the language term), old T6 (the identical-Maritimes-
//   term drift closure — no header term remains to compare).
//
// ⚠ WHAT THIS SUITE CANNOT PROVE — read before trusting a green run, and before
// trusting the mutation count. The "condition" is now flexbox doing its job.
// A source read cannot render, and A MUTATION CANNOT BREAK THE LAYOUT ENGINE:
// every mutation below is a SOURCE drift the guard notices (a deleted property,
// a lost grouping), chosen because each mirrors a plausible real regression —
// but killing all of them proves guard sensitivity, NOT that the header wraps
// correctly on glass. This change is ABOUT pixels; the walk carries the proof
// here more than on any other build today.

import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '../../components/FullDfoForm.tsx'), 'utf8');

test('W1: the header is ONE unconditional block — composed wrap container, title group, button group', () => {
  const header = SRC.match(
    /<View style=\{\[styles\.sectionHeader, styles\.tripHeaderWrap\]\}>[\s\S]{0,800}?<\/View>\s*\n\s*<\/View>/,
  );
  expect(header).not.toBeNull();
  const block = header![0];
  // title group: icon + the trip title, natural width, ONE unbroken line
  expect(block).toMatch(/tripHeaderTitleGroup[\s\S]{0,300}?tripHeaderTitleText\]\} numberOfLines=\{1\}[\s\S]{0,60}?form234\.tripInfoSection/);
  // button group: BOTH buttons, via the shared helpers, grouped so they wrap WHOLE
  expect(block).toMatch(/tripHeaderBtnGroup[\s\S]{0,200}?renderNoteButton\('trip'\)[\s\S]{0,100}?renderObsTripButton\(\)/);
});

test('W2: the layout carries NO language term and NO subform term — width decides, nothing else', () => {
  const header = SRC.match(
    /<View style=\{\[styles\.sectionHeader, styles\.tripHeaderWrap\]\}>[\s\S]{0,800}?<\/View>\s*\n\s*<\/View>/,
  );
  expect(header).not.toBeNull();
  expect(header![0]).not.toMatch(/isFr/);
  expect(header![0]).not.toMatch(/subformId/); // the observer button's own MAR-90
  // gate lives inside renderObsTripButton (obsTripNum B5 pins it) — a what-renders
  // gate, not a layout gate; it must NOT reappear here.
  // And no ternary wraps the container: the block above matched an unconditional
  // <View, not a `? (` branch — assert the old conditional is gone entirely.
  expect(SRC).not.toMatch(/isFr && subformId === 90 \? \(/);
});

test('W3: containment — the four new keys reach ONLY the Trip header; every sibling still uses sectionHeader', () => {
  for (const key of ['tripHeaderWrap', 'tripHeaderTitleGroup', 'tripHeaderTitleText', 'tripHeaderBtnGroup']) {
    const uses = SRC.match(new RegExp(`styles\\.${key}`, 'g')) ?? [];
    const defs = SRC.match(new RegExp(`^\\s*${key}: \\{`, 'gm')) ?? [];
    expect({ key, uses: uses.length }).toEqual({ key, uses: 1 });
    expect({ key, defs: defs.length }).toEqual({ key, defs: 1 });
  }
  // 10 sibling card headers + the Trip header (which now COMPOSES sectionHeader
  // rather than abandoning it) = 11, same census as c03f08b. A change here means
  // a sibling was restructured or the composition was dropped.
  const headerUses = SRC.match(/styles\.sectionHeader\b/g) ?? [];
  expect(headerUses.length).toBe(11);
  // the old S162b keys must be GONE, not lingering unused
  for (const dead of ['tripHeaderStackedFr', 'tripHeaderTitleRowFr', 'tripHeaderBtnRowFr']) {
    expect(SRC).not.toContain(dead);
  }
});

test('W4: shared keys byte-frozen; the wrap override is EXACTLY one property; the groups carry their load-bearing props', () => {
  // Frozen from 40d9908/c03f08b — an edit to either shared key fails here
  // (10 other cards render from them).
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
  // The override must stay a SINGLE property — composition, not a value copy. If
  // it ever grows sectionHeader's values, the freeze above stops protecting the
  // Trip card from shared-key drift.
  expect(SRC).toContain(`tripHeaderWrap: { flexWrap: 'wrap' },`);
  // Load-bearing group props: the title must be shrinkable-not-greedy (flex:0 kills
  // the inherited flex:1 that caused the three-line crunch); the buttons right-align
  // in both states via the auto margin.
  expect(SRC).toContain(`tripHeaderTitleText: { flex: 0, flexShrink: 1 },`);
  expect(SRC).toMatch(/tripHeaderBtnGroup: \{[^}]*marginLeft: 'auto'[^}]*\},/);
});

test('T7: the French button string is intact — « Observateur en mer » (ruling 1: stacking, not shortening)', () => {
  // KEPT AS-IS from the S162b suite, untouched by the width rework: a future
  // "simplification" back to « Observateur » fails here.
  const fr = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../i18n/locales/fr/dfo.json'), 'utf8'));
  expect(fr.form234.obsTripBtn).toBe('Observateur en mer');
  expect(fr.form234.obsTripNumLabel).toBe('NUMÉRO DE SORTIE EN MER DE L’OBSERVATEUR');
});
