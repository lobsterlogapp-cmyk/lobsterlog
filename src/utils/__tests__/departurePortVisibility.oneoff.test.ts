// S128 Phase 4 — departure port (TRIP.PORT_ID, Rule 299) is Mandatory on QC(88)/NL(91) and
// BLOCKED on GLF(89)/MAR(90). FullDfoForm now gates the render on isVisible('departurePort'),
// which reads this config. Lock the config so a blocked field can never render again.
import { DFO_SUBFORM_FIELD_CONFIG } from '../dfoConstants';

const visible = (sub: number) => DFO_SUBFORM_FIELD_CONFIG[sub].visible.includes('departurePort');

test('departure port is visible on QC(88) and NL(91)', () => {
  expect(visible(88)).toBe(true);
  expect(visible(91)).toBe(true);
});

test('departure port is NOT visible (blocked) on GLF(89) and MAR(90)', () => {
  expect(visible(89)).toBe(false);
  expect(visible(90)).toBe(false);
});
