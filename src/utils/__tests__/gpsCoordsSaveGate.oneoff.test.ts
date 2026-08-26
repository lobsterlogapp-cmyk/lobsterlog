// ONE-OFF (Session 110, repointed at the shared table in S141 P4 — R-5 ruling): the
// effort-coordinates requirement (Subforms rows 82/83 + Rule 3059) at the close-all door.
// The old pin read FULL_DFO_REQUIRED_FIELDS + the fieldCheckMap 'gpsCoords' entry (both
// retired); the door now asks dfoRequirements.ts, whose gpsCoords entry keys on the SAME
// effortCoordsEntryAllowed gate as the entry fields and the generator's emit — so this pin
// now also covers the P4 news: MAR(90) is mandatory ON 38b (the old list never checked it)
// and a typed value must sit inside the XSD ranges.
import { isFieldRequired, missingInContainer, RequirementContext } from '../dfoRequirements';
import { DFO_FMA_38B } from '../dfoConstants';

const MAR_NON_38B = 1589; // LFA 34

// Effort values satisfied except the coordinates under test.
const effortValues = (gpsLat: string, gpsLng: string, fma: number) => ({
  fmaId: String(fma), haulStartTime: '06:00', haulEndTime: '13:30',
  sarInd: 'N', mmInterInd: 'N', trapHauls: '200', catchWeight: '250', soakDuration: '2',
  gpsLat, gpsLng, lgridCodeId: '101', trapSize: '39682',
  gearSubtypeId: '39684', statSectId: '', nbSpcmnKept: '10',
});

const gpsMissing = (subformId: number, fma: number, gpsLat: string, gpsLng: string) =>
  missingInContainer('effort', { subformId, fmaId: fma }, effortValues(gpsLat, gpsLng, fma))
    .filter(m => m.fieldKey === 'gpsCoords');

describe('S110 G1 → S141 P4 — effort GPS requirement (rows 82/83 + Rule 3059)', () => {
  test('gpsCoords is MANDATORY for QC(88) and GLF(89), any FMA', () => {
    expect(isFieldRequired('gpsCoords', { subformId: 88, fmaId: 25661 })).toBe(true);
    expect(isFieldRequired('gpsCoords', { subformId: 89, fmaId: 19322 })).toBe(true);
  });

  test('MAR(90): mandatory ON 38b (the P4 news), blocked elsewhere; NL(91) blocked', () => {
    expect(isFieldRequired('gpsCoords', { subformId: 90, fmaId: DFO_FMA_38B })).toBe(true);
    expect(isFieldRequired('gpsCoords', { subformId: 90, fmaId: MAR_NON_38B })).toBe(false);
    expect(isFieldRequired('gpsCoords', { subformId: 91, fmaId: 21331 })).toBe(false);
  });

  test.each([88, 89])('subform %s: blank coords are flagged as gpsCoords', (sf) => {
    expect(gpsMissing(sf, 25661, '', '').map(m => m.reason)).toEqual(['blank']);
  });

  test.each([88, 89])('subform %s: one-sided coords still flag gpsCoords', (sf) => {
    expect(gpsMissing(sf, 25661, '48.4488', '')).toHaveLength(1);
    expect(gpsMissing(sf, 25661, '', '-68.5236')).toHaveLength(1);
  });

  test.each([88, 89])('subform %s: both coords present and in range -> nothing flagged', (sf) => {
    expect(gpsMissing(sf, 25661, '48.4488', '-68.5236')).toHaveLength(0);
  });

  test('MAR 38b: blank coords flagged; filled pass (the hole the old list left open)', () => {
    expect(gpsMissing(90, DFO_FMA_38B, '', '')).toHaveLength(1);
    expect(gpsMissing(90, DFO_FMA_38B, '44.2600', '-66.7400')).toHaveLength(0);
  });

  test('MAR non-38b / NL: blank coords flag nothing (entry itself is blocked)', () => {
    expect(gpsMissing(90, MAR_NON_38B, '', '')).toHaveLength(0);
    expect(gpsMissing(91, 21331, '', '')).toHaveLength(0);
  });

  test('a typed out-of-range coordinate is flagged invalid (P4 value checks)', () => {
    expect(gpsMissing(88, 25661, '20.0000', '-68.5236').map(m => m.reason)).toEqual(['invalid']);
    expect(gpsMissing(88, 25661, '48.4488', '-20.0000').map(m => m.reason)).toEqual(['invalid']);
  });
});
