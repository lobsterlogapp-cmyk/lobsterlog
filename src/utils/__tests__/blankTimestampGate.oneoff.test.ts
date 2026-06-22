// Session 75 regression: the four EFFORT/TRIP/LANDING timestamps must be caught at the
// save-gate when blank. Before this fix a blank time was laundered to midnight by
// localToUtcIso(dateFished, '') and transmitted silently (validator could not see a
// present-but-defaulted element). The fix added sailTime/haulStartTime/haulEndTime/
// landingTime to FULL_DFO_REQUIRED_FIELDS (all four subforms) + fieldCheckMap/fieldLabels.
//
// handleSave lives inside the FullDfoForm component (not exported), so this test locks in
// (a) the data-layer half directly — getRequiredFields now contains the four keys — and
// (b) the behaviour by faithfully reproducing the handleSave missing-field loop
// (FullDfoForm.tsx ~1027-1030) against getRequiredFields.
import { getRequiredFields } from '../dfoLogStorage';

const SUBFORMS = [88, 89, 90, 91];
const TIMESTAMP_KEYS = ['sailTime', 'haulStartTime', 'haulEndTime', 'landingTime'];

// Faithful mirror of the handleSave loop: required-set key -> fieldCheckMap value -> flag if blank.
function computeMissing(subformId: number, fieldCheckMap: Record<string, string>): string[] {
  const required = getRequiredFields(subformId);
  const missing: string[] = [];
  for (const field of required) {
    const val = fieldCheckMap[field] ?? '';
    if (!val || val.trim() === '') missing.push(field);
  }
  return missing;
}

// A fieldCheckMap with every required field satisfied, then timestamp overrides applied.
function withTimestamps(subformId: number, timestamps: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of getRequiredFields(subformId)) map[f] = 'ok';
  return { ...map, ...timestamps };
}

const BLANK = { sailTime: '', haulStartTime: '', haulEndTime: '', landingTime: '' };
const FILLED = { sailTime: '05:30', haulStartTime: '06:00', haulEndTime: '13:30', landingTime: '14:45' };

describe('Session 75 — blank-timestamp save-gate', () => {
  test('all four subforms require the four timestamp keys', () => {
    for (const id of SUBFORMS) {
      for (const k of TIMESTAMP_KEYS) {
        expect(getRequiredFields(id)).toContain(k);
      }
    }
  });

  test('blank timestamps -> exactly the 4 timestamp keys flagged', () => {
    for (const id of SUBFORMS) {
      const missing = computeMissing(id, withTimestamps(id, BLANK));
      const flaggedTs = missing.filter((m) => TIMESTAMP_KEYS.includes(m));
      expect(flaggedTs.sort()).toEqual([...TIMESTAMP_KEYS].sort());
      // and nothing else is spuriously flagged by these overrides
      expect(missing).toHaveLength(4);
    }
  });

  test('filled timestamps -> 0 flagged', () => {
    for (const id of SUBFORMS) {
      const missing = computeMissing(id, withTimestamps(id, FILLED));
      expect(missing).toHaveLength(0);
    }
  });
});
