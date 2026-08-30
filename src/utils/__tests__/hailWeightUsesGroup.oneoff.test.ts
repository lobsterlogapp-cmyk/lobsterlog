// S153 Phase 4 (R9) — a typed hail-in weight makes the HLIN group count as USED.
//
// THE HOLE THIS CLOSES
// Until S153 the "used" formula named only the hail company and the confirmation number. A 38b
// harvester who typed the total weight on board and nothing else therefore had NO close door:
// the close control never rendered, the send guard never asked for it, and the weight sat in
// storage with no way to be sealed. Under R1 every weight must pass a close to be converted and
// tagged, so a weight with no door is a weight that can never be either.
//
// ACCEPTED COST (founder ruling R9): a man who types a weight and changes his mind now has a
// group he must close before he can send. That is deliberate, and it is what the last test here
// pins — the door appears, so the obligation appears with it.
import { usedDataGroupKeys, dataGroupInputsFromLog, unclosedUsedGroupKeys } from '../dfoLogStorage';
import type { DataGroupInputs } from '../dfoLogStorage';

const base: DataGroupInputs = {
  subformId: 90,
  hailFma: true,          // 38b/41 — HLIN is only ever in play here (Rule 661)
  effortYes: true,
  baitCount: 0,
  bycatchYes: false,
  bycatchCount: 0,
  personalUse: '',
  sarYes: false,
  transferYes: false,
  hlinCompany: '', hlinConfirmNo: '', hlinTotalWeight: '',
  hloutCompany: '', hloutConfirmNo: '',
};

describe('S153 Phase 4 — HLIN counts as used when only the weight is typed', () => {
  test('weight alone marks the group used — this is the change', () => {
    expect(usedDataGroupKeys({ ...base, hlinTotalWeight: '450' })).toContain('dgCloseHlin');
  });

  test('company alone still marks it used (unchanged)', () => {
    expect(usedDataGroupKeys({ ...base, hlinCompany: 'Not on the list' })).toContain('dgCloseHlin');
  });

  test('confirmation number alone still marks it used (unchanged)', () => {
    expect(usedDataGroupKeys({ ...base, hlinConfirmNo: '12345' })).toContain('dgCloseHlin');
  });

  test('an empty hail card is still not used — the change does not over-count', () => {
    expect(usedDataGroupKeys(base)).not.toContain('dgCloseHlin');
  });

  test('outside a hail area the weight changes nothing (Rule 661 still gates it)', () => {
    expect(usedDataGroupKeys({ ...base, hailFma: false, hlinTotalWeight: '450' }))
      .not.toContain('dgCloseHlin');
  });

  test('HLOUT is untouched — it seals no weight and keeps its old formula', () => {
    expect(usedDataGroupKeys({ ...base, hlinTotalWeight: '450' })).not.toContain('dgCloseHlout');
    expect(usedDataGroupKeys({ ...base, hloutConfirmNo: '999' })).toContain('dgCloseHlout');
  });
});

describe('S153 Phase 4 — the obligation follows the door', () => {
  const log = (data: Record<string, string>) => ({ subformId: 90, data });

  test('a weight-only hail card must be closed before the log can be sent', () => {
    const unclosed = unclosedUsedGroupKeys(log({
      fmaId: '28599', effortYes: 'true', hlinTotalWeight: '450',
    }));
    expect(unclosed).toContain('dgCloseHlin');
  });

  test('once closed it stops being owed', () => {
    const unclosed = unclosedUsedGroupKeys(log({
      fmaId: '28599', effortYes: 'true', hlinTotalWeight: '450',
      dgCloseHlin: '2026-08-27T12:00:00.000Z',
    }));
    expect(unclosed).not.toContain('dgCloseHlin');
  });

  test('the data-side adapter carries the weight through', () => {
    const inputs = dataGroupInputsFromLog(log({ fmaId: '28599', hlinTotalWeight: '450' }));
    expect(inputs.hlinTotalWeight).toBe('450');
  });

  test('a log with no hail weight is unaffected', () => {
    const inputs = dataGroupInputsFromLog(log({ fmaId: '28599' }));
    expect(inputs.hlinTotalWeight).toBe('');
  });
});
