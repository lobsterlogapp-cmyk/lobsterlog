// S153 Phase 5 — what the harvester sees.
//
// WHAT THIS PINS
// R2 + founder ruling Option 2: a CLOSED section shows its value in the unit it was closed in,
//   and the number does not move when the toggle later changes.
// R3/R8: an OPEN section follows the toggle, and a flip re-expresses its value once.
// The ruling behind full-precision storage: a typed 40 must read back as exactly '40'.
// Rule 789: a flip must never turn a blank box into a declared 0 — that would be a real
//   quantity the harvester never entered.
import {
  weightFromKg,
  formatWeight,
  convertOpenWeight,
  weightToKg,
  reunitOpenWeights,
  DRAFT_WEIGHT_UNIT_KEY,
} from '../dfoLogStorage';

describe('S153 Phase 5 — formatWeight', () => {
  test('strips trailing zeros only after a decimal point', () => {
    expect(formatWeight('100.00')).toBe('100');
    expect(formatWeight('45.360')).toBe('45.36');
    expect(formatWeight('100.50')).toBe('100.5');
    expect(formatWeight('0.00')).toBe('0');
  });

  test('never eats zeros from a whole number — 100 must not become 1', () => {
    expect(formatWeight('100')).toBe('100');
    expect(formatWeight('1200')).toBe('1200');
    expect(formatWeight('0')).toBe('0');
  });
});

describe('S153 Phase 5 — a closed weight reads back in its own unit, with no drift', () => {
  // The whole reason storage keeps more places than the wire.
  test.each(['100', '250', '450', '40', '55', '22', '12', '99', '1', '2', '0.5', '100.5', '12.3', '7.25', '1234'])(
    'a card closed on lbs with %s typed reads back as %s',
    (typed) => {
      const stored = weightToKg(typed, 'lbs');       // what the close actually writes
      expect(weightFromKg(stored, 'lbs')).toBe(formatWeight(typed));
    },
  );

  test('a card closed on kg shows the kilograms it stored', () => {
    const stored = weightToKg('45.36', 'kg');        // kg closes store the typed value
    expect(weightFromKg(stored, 'kg')).toBe('45.36');
  });

  test('a pre-S153 2dp value still displays sensibly', () => {
    // Sealed under the old rule; R2 says it keeps its number, so it may drift by a cent of a
    // pound. That is history, not a regression — it must not throw or render blank.
    expect(weightFromKg('45.36', 'lbs')).toBe('100');
    expect(weightFromKg('18.14', 'lbs')).toBe('39.99');
  });

  test('a blank or non-numeric stored value is shown as-is, never as 0', () => {
    for (const junk of ['', '   ', 'abc']) expect(weightFromKg(junk, 'lbs')).toBe(junk);
  });
});

describe('S153 Phase 5 — R8: an open weight converts on the flip', () => {
  test('lbs to kg', () => {
    expect(convertOpenWeight('100', 'lbs', 'kg')).toBe('45.36');
  });

  test('kg to lbs', () => {
    expect(convertOpenWeight('45.36', 'kg', 'lbs')).toBe('100');
  });

  test('no flip, no change', () => {
    expect(convertOpenWeight('100', 'lbs', 'lbs')).toBe('100');
  });

  test('Rule 789: a blank box stays blank — a flip never declares a zero', () => {
    for (const empty of ['', '   ']) {
      expect(convertOpenWeight(empty, 'lbs', 'kg')).toBe(empty);
      expect(convertOpenWeight(empty, 'kg', 'lbs')).toBe(empty);
    }
  });

  test('a typed zero IS a quantity and survives the flip', () => {
    expect(convertOpenWeight('0', 'lbs', 'kg')).toBe('0');
  });

  test('non-numeric passes through untouched', () => {
    expect(convertOpenWeight('abc', 'lbs', 'kg')).toBe('abc');
  });
});

describe('S153 Phase 5 — R8 across a remount: reunitOpenWeights', () => {
  const draft = (extra: Record<string, string> = {}) => ({
    [DRAFT_WEIGHT_UNIT_KEY]: 'lbs',
    catchWeight: '100',
    personalUse: '2',
    transferWt: '50',
    hlinTotalWeight: '450',
    ...extra,
  });

  test('same unit: nothing moves, and it says so by returning null', () => {
    expect(reunitOpenWeights(draft(), 'lbs')).toBeNull();
  });

  test('a draft with no recorded unit is assumed already in the live unit', () => {
    const d = { catchWeight: '100' };               // pre-S153 / brand-new draft
    expect(reunitOpenWeights(d, 'kg')).toBeNull();
  });

  test('flip converts every OPEN scalar weight and records the new unit', () => {
    const out = reunitOpenWeights(draft(), 'kg')!;
    expect(out[DRAFT_WEIGHT_UNIT_KEY]).toBe('kg');
    expect(out.catchWeight).toBe('45.36');
    expect(out.personalUse).toBe('0.91');
    expect(out.transferWt).toBe('22.68');
    expect(out.hlinTotalWeight).toBe('204.12');
  });

  test('R2: a CLOSED group is left alone even though the toggle moved', () => {
    const out = reunitOpenWeights(draft({
      dgCloseEffort: 'T', dgCloseHlin: 'T',
    }), 'kg')!;
    expect(out.catchWeight).toBeUndefined();        // sealed — not re-expressed
    expect(out.hlinTotalWeight).toBeUndefined();    // sealed
    expect(out.personalUse).toBe('0.91');           // still open — converted
    expect(out.transferWt).toBe('22.68');           // still open — converted
  });

  test('bait and bycatch rows convert per row, and closed rows do not', () => {
    const out = reunitOpenWeights(draft({
      baitEntries: JSON.stringify([
        { type: 'A', lbs: '100' },                        // open
        { type: 'B', lbs: '45.36', closeDt: 'T', closeUnit: 'lbs' }, // sealed
      ]),
      bycatchEntries: JSON.stringify([{ species: 'X', lbs: '22' }]),
    }), 'kg')!;
    const bait = JSON.parse(out.baitEntries);
    expect(bait[0].lbs).toBe('45.36');
    expect(bait[1].lbs).toBe('45.36');               // untouched: it was already sealed
    expect(bait[1].closeUnit).toBe('lbs');
    expect(JSON.parse(out.bycatchEntries)[0].lbs).toBe('9.98');
  });

  test('effort 1 trap groups convert; a closed effort node does not', () => {
    const out = reunitOpenWeights(draft({
      extraEffortDetails: JSON.stringify([{ catchWeight: '250' }]),
      extraEffortNodes: JSON.stringify([
        { fmaId: '1', details: [{ catchWeight: '100' }] },                    // open
        { fmaId: '2', closeDt: 'T', details: [{ catchWeight: '45.36' }] },    // sealed
      ]),
    }), 'kg')!;
    expect(JSON.parse(out.extraEffortDetails)[0].catchWeight).toBe('113.4');
    const nodes = JSON.parse(out.extraEffortNodes);
    expect(nodes[0].details[0].catchWeight).toBe('45.36');
    expect(nodes[1].details[0].catchWeight).toBe('45.36');   // untouched
  });

  test('a flip does not manufacture values for boxes the harvester left empty', () => {
    const out = reunitOpenWeights({
      [DRAFT_WEIGHT_UNIT_KEY]: 'lbs', catchWeight: '100',
    }, 'kg')!;
    expect(out.personalUse).toBeUndefined();
    expect(out.transferWt).toBeUndefined();
    expect(out.hlinTotalWeight).toBeUndefined();
  });
});
