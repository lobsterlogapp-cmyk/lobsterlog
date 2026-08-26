// Session 75 regression, repointed at the shared table in S141 P4 (R-5 ruling: repoint,
// don't delete — the pin outlives the mechanism): the four EFFORT/TRIP/LANDING timestamps
// must be caught at the close-all door when blank. Before the S75 fix a blank time was
// laundered to midnight by localToUtcIso(dateFished, '') and transmitted silently.
// The old pin read FULL_DFO_REQUIRED_FIELDS (retired in P4); the door now asks
// dfoRequirements.ts through missingInContainer, so the pin asks the same question there:
// on every subform, each of the four timestamp fields is MANDATORY, a blank one is flagged
// by its container, and a filled one is not.
import { isFieldRequired, missingInContainer } from '../dfoRequirements';

const SUBFORMS = [88, 89, 90, 91];

// container + the values the footer passes, satisfied except for the field under test.
const TRIP_FULL = { startDt: '2026-08-01', sailTime: '05:30', departurePort: 'Rimouski',
  crewNb: '2', bycatchAnswered: 'N' };
const EFFORT_FULL = { fmaId: '1589', haulStartTime: '06:00', haulEndTime: '13:30',
  sarInd: 'N', mmInterInd: 'N', trapHauls: '200', catchWeight: '250', soakDuration: '2',
  gpsLat: '48.4488', gpsLng: '-68.5236', lgridCodeId: '101', trapSize: '39682',
  gearSubtypeId: '39684', statSectId: '38065', nbSpcmnKept: '10' };
const LANDING_FULL = { portId: 'Abbott’s Harbour', landingTime: '14:45' };

describe('Session 75 — blank-timestamp gate (table-backed since S141 P4)', () => {
  test('all four subforms hold the four timestamp fields MANDATORY in the table', () => {
    for (const id of SUBFORMS) {
      const ctx = { subformId: id, fmaId: 1589 };
      expect(isFieldRequired('sailTime', ctx, {}, 'trip')).toBe(true);
      expect(isFieldRequired('haulStartTime', ctx, {}, 'effort')).toBe(true);
      expect(isFieldRequired('haulEndTime', ctx, {}, 'effort')).toBe(true);
      expect(isFieldRequired('landingTime', ctx, {}, 'landing')).toBe(true);
    }
  });

  test.each(SUBFORMS)('subform %s: a blank timestamp is flagged by its container', (id) => {
    const ctx = { subformId: id, fmaId: 1589 };
    expect(missingInContainer('trip', ctx, { ...TRIP_FULL, sailTime: '' })
      .map(m => m.fieldKey)).toContain('sailTime');
    expect(missingInContainer('effort', ctx, { ...EFFORT_FULL, haulStartTime: '' })
      .map(m => m.fieldKey)).toContain('haulStartTime');
    expect(missingInContainer('effort', ctx, { ...EFFORT_FULL, haulEndTime: '' })
      .map(m => m.fieldKey)).toContain('haulEndTime');
    expect(missingInContainer('landing', ctx, { ...LANDING_FULL, landingTime: '' })
      .map(m => m.fieldKey)).toContain('landingTime');
  });

  test.each(SUBFORMS)('subform %s: filled timestamps flag none of the four', (id) => {
    const ctx = { subformId: id, fmaId: 1589 };
    const keys = [
      ...missingInContainer('trip', ctx, TRIP_FULL),
      ...missingInContainer('effort', ctx, EFFORT_FULL),
      ...missingInContainer('landing', ctx, LANDING_FULL),
    ].map(m => m.fieldKey);
    for (const k of ['sailTime', 'haulStartTime', 'haulEndTime', 'landingTime']) {
      expect(keys).not.toContain(k);
    }
  });
});
