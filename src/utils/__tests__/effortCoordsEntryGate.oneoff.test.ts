// S136 UI round (Rule 3059 conformance) — pins effortCoordsEntryAllowed, the SINGLE
// definition behind both the trap-group GPS entry fields (all three UI sites) and the
// generator's LAT/LONG emit gate. Authority: Subforms_requirements_234.xlsx rows 82/83
// (QC/GLF Mandatory · MAR Optional-at-subform-level · NL Blocked) refined by Rule 3059
// (FS-NAT-234-12-FR.txt :1108–1130): on MAR-90, entry is mandatory on 38b and
// « la saisie … doivent être bloquées » — blocked — in every other MAR FMA.
import { effortCoordsEntryAllowed, DFO_FMA_38B } from '../dfoConstants';

test('QC-88: coordinates are enterable in every fishing area (rows 82/83 Mandatory)', () => {
  expect(effortCoordsEntryAllowed(88, 25640)).toBe(true); // an ordinary QC LFA
  expect(effortCoordsEntryAllowed(88, 1534)).toBe(true);  // LFA 22 (grid-mapped) — still true
});

test('GLF-89: coordinates are enterable in every fishing area (rows 82/83 Mandatory)', () => {
  expect(effortCoordsEntryAllowed(89, 1526)).toBe(true);
});

test('MAR-90 on 38b: coordinates are enterable (Rule 3059 mandatory branch)', () => {
  expect(effortCoordsEntryAllowed(90, DFO_FMA_38B)).toBe(true);
  expect(DFO_FMA_38B).toBe(28599); // the rule names Effort.Fma_id=28599 — pin the constant
});

test('MAR-90 off 38b: entry is BLOCKED (Rule 3059 « la saisie … doivent être bloquées »)', () => {
  expect(effortCoordsEntryAllowed(90, 38065)).toBe(false); // LFA 34 — the shipped breach case
  expect(effortCoordsEntryAllowed(90, 1595)).toBe(false);  // LFA 41 — offshore, still not 38b
});

test('NL-91: coordinates are never enterable (rows 82/83 Blocked)', () => {
  expect(effortCoordsEntryAllowed(91, 2071)).toBe(false);
  expect(effortCoordsEntryAllowed(91, DFO_FMA_38B)).toBe(false); // 38b is a MAR rule, not an NL one
});

test('a missing fishing area never unlocks the MAR/NL gates (null, undefined, NaN)', () => {
  expect(effortCoordsEntryAllowed(90, null)).toBe(false);
  expect(effortCoordsEntryAllowed(90, undefined)).toBe(false);
  expect(effortCoordsEntryAllowed(90, Number('not-a-number'))).toBe(false); // the generator's Number(ef.fmaId) path
  // …while QC/GLF stay enterable regardless (their mandate is subform-wide).
  expect(effortCoordsEntryAllowed(88, null)).toBe(true);
  expect(effortCoordsEntryAllowed(89, undefined)).toBe(true);
});
