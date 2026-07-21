// ONE-OFF (Session 110 — closes the GLF device-gate test hole): the S110 G1 save-gate
// requirement rides FULL_DFO_REQUIRED_FIELDS + the FullDfoForm fieldCheckMap entry
//   gpsCoords: gpsLat.trim() && gpsLng.trim() ? 'ok' : ''
// The jest suite previously exercised only the VALIDATOR (latLongPerRegion), so a
// save-gate config miss could pass CI while failing on device. This suite pins the
// gate map itself for 88 AND 89 (and its absence for 90/91), and mirrors the
// handleSave loop the way blankTimestampGate.oneoff.test.ts does.
import { getRequiredFields } from '../dfoLogStorage';

// Faithful mirror of the FullDfoForm handleSave check value for gpsCoords.
const gpsCoordsCheck = (gpsLat: string, gpsLng: string): string =>
  gpsLat.trim() && gpsLng.trim() ? 'ok' : '';

// Faithful mirror of the handleSave loop: required-set key -> check value -> flag if blank.
function computeMissing(subformId: number, fieldCheckMap: Record<string, string>): string[] {
  const required = getRequiredFields(subformId);
  const missing: string[] = [];
  for (const field of required) {
    const val = fieldCheckMap[field] ?? '';
    if (!val || val.trim() === '') missing.push(field);
  }
  return missing;
}

function withAllSatisfied(subformId: number, overrides: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of getRequiredFields(subformId)) map[f] = 'ok';
  return { ...map, ...overrides };
}

describe('S110 G1 — gpsCoords save-gate requirement map (Subforms rows 82/83)', () => {
  test('gpsCoords is REQUIRED for QC(88) and GLF(89)', () => {
    expect(getRequiredFields(88)).toContain('gpsCoords');
    expect(getRequiredFields(89)).toContain('gpsCoords');
  });

  test('gpsCoords is NOT required for MAR(90) or NL(91)', () => {
    expect(getRequiredFields(90)).not.toContain('gpsCoords');
    expect(getRequiredFields(91)).not.toContain('gpsCoords');
  });

  test.each([88, 89])('subform %s: blank coords flag exactly gpsCoords in the handleSave mirror', (sf) => {
    const missing = computeMissing(sf, withAllSatisfied(sf, { gpsCoords: gpsCoordsCheck('', '') }));
    expect(missing).toEqual(['gpsCoords']);
  });

  test.each([88, 89])('subform %s: one-sided coords still flag gpsCoords', (sf) => {
    const latOnly = computeMissing(sf, withAllSatisfied(sf, { gpsCoords: gpsCoordsCheck('48.4488', '') }));
    expect(latOnly).toEqual(['gpsCoords']);
    const lngOnly = computeMissing(sf, withAllSatisfied(sf, { gpsCoords: gpsCoordsCheck('', '-68.5236') }));
    expect(lngOnly).toEqual(['gpsCoords']);
  });

  test.each([88, 89])('subform %s: both coords present -> nothing flagged', (sf) => {
    const missing = computeMissing(sf, withAllSatisfied(sf, { gpsCoords: gpsCoordsCheck('48.4488', '-68.5236') }));
    expect(missing).toHaveLength(0);
  });

  test('MAR(90)/NL(91): blank coords flag nothing (gate keys off the runtime subformId)', () => {
    for (const sf of [90, 91]) {
      const missing = computeMissing(sf, withAllSatisfied(sf, { gpsCoords: gpsCoordsCheck('', '') }));
      expect(missing).toHaveLength(0);
    }
  });
});
