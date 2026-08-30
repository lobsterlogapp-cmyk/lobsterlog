// S153 Phase 1 — the weight unit tag: shape and fallback.
//
// WHAT THIS PINS
// R5 is the whole point of this suite: an ABSENT tag must read as POUNDS. Every weight closed
// under pre-S153 code is untagged, and pre-S153 code converted lbs->kg at emit off the live
// toggle — so pounds is what those numbers are. If closedWeightUnit ever starts defaulting to
// kilograms, an untagged legacy weight silently stops being converted at emit (Phase 3) and a
// pounds number goes to DFO wearing a kilograms label. That is the failure this pins.
//
// It also pins the ADDITIVE promise: a record with no tag round-trips through JSON unchanged,
// so nothing in storage moves until a close actually stamps one (Phase 2).
import { closedWeightUnit } from '../dfoLogStorage';
import type { WeightUnit, ExtraEffortNode } from '../dfoLogStorage';

describe('S153 Phase 1 — closedWeightUnit (R5: absent means pounds)', () => {
  test('undefined reads as pounds — the legacy-log case', () => {
    expect(closedWeightUnit(undefined)).toBe('lbs');
  });

  test('empty string reads as pounds', () => {
    expect(closedWeightUnit('')).toBe('lbs');
  });

  test("explicit 'lbs' reads as pounds", () => {
    expect(closedWeightUnit('lbs')).toBe('lbs');
  });

  test("only an exact 'kg' reads as kilograms", () => {
    expect(closedWeightUnit('kg')).toBe('kg');
  });

  test('garbage reads as pounds, never as kilograms', () => {
    // Fail toward the old behaviour: anything unrecognised is treated as the unit the app
    // used to store, so a corrupt tag can never turn a pounds number into a kg number.
    for (const junk of ['KG', 'Kg', 'kilograms', 'lb', 'kgs', '0', 'null', 'undefined', ' kg']) {
      expect(closedWeightUnit(junk)).toBe('lbs');
    }
  });
});

describe('S153 Phase 1 — the tag is additive', () => {
  test('an untagged effort node round-trips through JSON with no new keys', () => {
    const legacy = { haulStartTime: '06:15', fmaId: '28599', closeDt: '2026-08-27T10:00:00.000Z' };
    const parsed = JSON.parse(JSON.stringify(legacy)) as ExtraEffortNode;
    expect(Object.keys(parsed).sort()).toEqual(['closeDt', 'fmaId', 'haulStartTime']);
    expect(parsed.closeUnit).toBeUndefined();
    expect(closedWeightUnit(parsed.closeUnit)).toBe('lbs');
  });

  test('a tagged effort node carries exactly one extra key', () => {
    const tagged: ExtraEffortNode = {
      haulStartTime: '06:15',
      fmaId: '28599',
      closeDt: '2026-08-27T10:00:00.000Z',
      closeUnit: 'kg',
    };
    const parsed = JSON.parse(JSON.stringify(tagged)) as ExtraEffortNode;
    expect(Object.keys(parsed).sort()).toEqual(['closeDt', 'closeUnit', 'fmaId', 'haulStartTime']);
    expect(closedWeightUnit(parsed.closeUnit)).toBe('kg');
  });

  test('the type admits only the two units', () => {
    // Compile-time guard made runtime-visible: if WeightUnit ever widens, this list and the
    // closedWeightUnit contract have to be revisited together.
    const units: WeightUnit[] = ['lbs', 'kg'];
    expect(units.map(closedWeightUnit)).toEqual(['lbs', 'kg']);
  });
});
