// ONE-OFF (Session 72 — T1 bait-condition Phase A1): proves baitConditionState()
// resolves BT_COND_ID visibility per region + bait-type codeId, wiring the existing
// (previously-unwired) rule sets DFO_BAIT_NO_CONDITION (Rule 3060, MAR),
// DFO_BAIT_COND_REQUIRED_QC_GLF (Rule 984, QC/GLF) and DFO_BAIT_COND_BLOCKED_NL (NL).
// Keyed strictly off codeId, never the label.
import { baitConditionState } from '../dfoConstants';

// codeIds: 19014 Squids, 39795 Synthetic bait, 3392 Herring Atlantic,
//          1359 Squid Illex, 1315 Mackerel Atlantic.
describe('baitConditionState', () => {
  test('MAR-90 Squids (non-blocklist) → mandatory (Rule 3060 "otherwise")', () => {
    expect(baitConditionState(90, 19014)).toBe('mandatory');
  });

  test('MAR-90 Synthetic bait 39795 → blocked (Rule 3060 blocklist)', () => {
    expect(baitConditionState(90, 39795)).toBe('blocked');
  });

  test('QC-88 Herring 3392 → mandatory (Rule 984 required set)', () => {
    expect(baitConditionState(88, 3392)).toBe('mandatory');
  });

  test('QC-88 Squid Illex 1359 (not in required set) → blocked (Rule 984 "otherwise")', () => {
    expect(baitConditionState(88, 1359)).toBe('blocked');
  });

  test('GLF-89 Mackerel 1315 → mandatory; GLF-89 other → blocked (Rule 984 shared with QC)', () => {
    expect(baitConditionState(89, 1315)).toBe('mandatory');
    expect(baitConditionState(89, 19014)).toBe('blocked');
  });

  test('NL-91 anything → blocked (overrides even the QC/GLF required set)', () => {
    expect(baitConditionState(91, 3392)).toBe('blocked');
    expect(baitConditionState(91, 19014)).toBe('blocked');
  });
});
