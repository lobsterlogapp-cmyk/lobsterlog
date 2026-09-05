// S162b guard — THE FRENCH TRIP HEADER STACK: scope containment.
//
// The build puts the FR + MAR-90 Trip Information header on two lines (title above,
// buttons beneath). The risk is not the stack — it is LEAKAGE: the layout escaping
// into English, into another region, or into another card. That is what this suite
// pins. FullDfoForm cannot render under jest (every suite here is utils), so this
// follows the S154B source-read pattern (weightRenderWiring / obsTripNum PART B).
//
// ⚠ BLIND SPOT, recorded honestly: a source read cannot prove pixels. It proves the
// conditional exists, its terms, and that the new styles reach only this card — it
// cannot prove the stacked header LOOKS right or that the row branch is pixel-equal
// to 40d9908. The Phase 4 walk is that proof, and only the walk.

import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '../../components/FullDfoForm.tsx'), 'utf8');

test('T1: the stacked branch exists and is gated FR AND MAR-90 — title row above, button row beneath', () => {
  const stacked = SRC.match(
    /\{isFr && subformId === 90 \? \(\s*\n\s*<View style=\{styles\.tripHeaderStackedFr\}>[\s\S]{0,700}?<\/View>\s*\n\s*\) : \(/,
  );
  expect(stacked).not.toBeNull();
  const block = stacked![0];
  // title row: icon + the trip title, no buttons
  expect(block).toMatch(/tripHeaderTitleRowFr[\s\S]{0,300}?form234\.tripInfoSection/);
  // button row: BOTH buttons, rendered by the shared helpers (single definitions)
  expect(block).toMatch(/tripHeaderBtnRowFr[\s\S]{0,200}?renderNoteButton\('trip'\)[\s\S]{0,100}?renderObsTripButton\(\)/);
});

test('T2: the else branch is the ORIGINAL single row — sectionHeader, icon, title, both buttons', () => {
  const row = SRC.match(
    /\) : \(\s*\n\s*<View style=\{styles\.sectionHeader\}>[\s\S]{0,500}?renderNoteButton\('trip'\)[\s\S]{0,100}?renderObsTripButton\(\)[\s\S]{0,100}?<\/View>\s*\n\s*\)\}/,
  );
  expect(row).not.toBeNull();
  expect(row![0]).toMatch(/sectionIcon[\s\S]{0,200}?form234\.tripInfoSection/);
});

test('T3: the new style keys reach ONLY the Trip header — and every sibling header still uses sectionHeader', () => {
  // Each new key: exactly one JSX use + one StyleSheet definition. A second JSX use
  // is the leak this build must never spring.
  for (const key of ['tripHeaderStackedFr', 'tripHeaderTitleRowFr', 'tripHeaderBtnRowFr']) {
    const uses = SRC.match(new RegExp(`styles\\.${key}`, 'g')) ?? [];
    const defs = SRC.match(new RegExp(`^\\s*${key}: \\{`, 'gm')) ?? [];
    expect({ key, uses: uses.length }).toEqual({ key, uses: 1 });
    expect({ key, defs: defs.length }).toEqual({ key, defs: 1 });
  }
  // The pre-build count of styles.sectionHeader call sites was 11 (10 sibling cards
  // + the Trip header, which keeps it in the row branch). A change here means a
  // sibling header was restructured — ruling 4 forbids that.
  const headerUses = SRC.match(/styles\.sectionHeader\b/g) ?? [];
  expect(headerUses.length).toBe(11);
});

test('T4: the SHARED style keys are byte-unchanged, and the stacked container copies their rhythm values', () => {
  // Frozen from 40d9908 — an edit to either shared key fails here (10 other cards
  // render from them; ruling 4 says only this card changes, via NEW keys).
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
  // The stacked container must CARRY (copied values) the same border/margin/padding
  // so the card keeps the sibling rhythm.
  const stackedDef = SRC.match(/tripHeaderStackedFr: \{[\s\S]{0,220}?\},/);
  expect(stackedDef).not.toBeNull();
  for (const frag of ["marginBottom: 12", "paddingBottom: 10", "borderBottomWidth: 1", "borderBottomColor: '#F1F5F9'"]) {
    expect(stackedDef![0]).toContain(frag);
  }
});

test('T5: the language term is the house idiom, defined once', () => {
  expect(SRC).toMatch(/const isFr = i18n\.language\.startsWith\('fr'\);/);
});

test('T6: the stack condition and the observer button gate carry the IDENTICAL Maritimes term (the Gate-1 drift closure)', () => {
  // Ruling 5 was expressed as `isFr && subformId === 90` rather than a hoisted
  // const, on the promise that this suite would keep the two expressions identical.
  expect(SRC).toMatch(/\{isFr && subformId === 90 \? \(/);
  expect(SRC).toMatch(/const renderObsTripButton = \(\)\s*=>\s*\n?\s*subformId === 90 && \(/);
});

test('T7: the French button string is intact — « Observateur en mer », curly apostrophes only in the bundle', () => {
  // Executable, not a source grep: read the shipped bundle (ruling 1 — stacking,
  // not shortening; a future "simplification" back to « Observateur » fails here).
  const fr = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../i18n/locales/fr/dfo.json'), 'utf8'));
  expect(fr.form234.obsTripBtn).toBe('Observateur en mer');
  expect(fr.form234.obsTripNumLabel).toBe('NUMÉRO DE SORTIE EN MER DE L’OBSERVATEUR');
});
