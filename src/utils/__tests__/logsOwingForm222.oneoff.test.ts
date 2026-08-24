// S137 Phase 6 guard — the marine-mammal red-button condition (defect 45).
// Pins mmYesOnAnyEffort (the sarYes twin) and logsOwingForm222 (rulings R-D/R-E/R-F/R-H):
// a log owes when any effort answered MM Yes AND it is closed AND no qualifying 222
// (a CLOSED Yes-declaration naming its lgbkUid) exists. Drafts never owe; a draft 222,
// or an N-declaration, never discharges; sent logs still owe.

import { mmYesOnAnyEffort, logsOwingForm222, Form222LinkView } from '../dfoLogStorage';

type D = Record<string, string | undefined>;

const node = (mmYes?: string) => ({ mmYes });

const mkLog = (over: Partial<{ status: 'draft' | 'complete'; lgbkUid: string; data: D }> = {}) => ({
  status: 'complete' as const,
  lgbkUid: 'AAAAAA',
  data: { mmYes: 'true' } as D,
  ...over,
});

const mkEntry = (over: Partial<Form222LinkView> = {}): Form222LinkView => ({
  interactInd: 'Y',
  status: 'complete',
  closeDt: '2026-08-24T10:00:00.000Z',
  sentToDfo: false,
  lgbkNumRef: 'AAAAAA',
  ...over,
});

describe('mmYesOnAnyEffort', () => {
  it('true when effort 1 (flat mmYes) answered Yes', () => {
    expect(mmYesOnAnyEffort({ mmYes: 'true' })).toBe(true);
  });

  it('true when only an extra effort answered Yes', () => {
    expect(mmYesOnAnyEffort({
      mmYes: 'false',
      extraEffortNodes: JSON.stringify([node('false'), node('true')]),
    })).toBe(true);
  });

  it('true when both effort 1 and an extra effort answered Yes', () => {
    expect(mmYesOnAnyEffort({
      mmYes: 'true',
      extraEffortNodes: JSON.stringify([node('true')]),
    })).toBe(true);
  });

  it('false when no effort answered Yes (No, unanswered, and no extras)', () => {
    expect(mmYesOnAnyEffort({ mmYes: 'false' })).toBe(false);
    expect(mmYesOnAnyEffort({})).toBe(false);
    expect(mmYesOnAnyEffort({
      mmYes: 'false',
      extraEffortNodes: JSON.stringify([node('false'), node(undefined)]),
    })).toBe(false);
  });
});

describe('logsOwingForm222', () => {
  it('complete + MM-Yes + no 222 at all → owed', () => {
    expect(logsOwingForm222([mkLog()], [])).toHaveLength(1);
  });

  it('draft + MM-Yes → NOT owed (R-D(b): drafts never light the button)', () => {
    expect(logsOwingForm222([mkLog({ status: 'draft' })], [])).toHaveLength(0);
  });

  it('complete + MM-No → not owed', () => {
    expect(logsOwingForm222([mkLog({ data: { mmYes: 'false' } })], [])).toHaveLength(0);
  });

  it('a DRAFT 222 does not discharge (R-E: closed clears, drafts do not)', () => {
    const draft222 = mkEntry({ status: 'draft', closeDt: undefined });
    expect(logsOwingForm222([mkLog()], [draft222])).toHaveLength(1);
  });

  it('a closed N-declaration does not discharge (R-F)', () => {
    expect(logsOwingForm222([mkLog()], [mkEntry({ interactInd: 'N' })])).toHaveLength(1);
  });

  it('a closed Y-declaration naming the lgbkUid discharges', () => {
    expect(logsOwingForm222([mkLog()], [mkEntry()])).toHaveLength(0);
  });

  it("a closed Y-declaration naming a DIFFERENT log's UID leaves the log owed", () => {
    expect(logsOwingForm222([mkLog()], [mkEntry({ lgbkNumRef: 'ZZZZZZ' })])).toHaveLength(1);
  });

  it('a SENT 222 without a closeDt (pre-S125 record) still discharges', () => {
    const oldSent = mkEntry({ sentToDfo: true, closeDt: undefined });
    expect(logsOwingForm222([mkLog()], [oldSent])).toHaveLength(0);
  });

  it('the "complete but never Close & Saved" anomaly renders as a draft and does not discharge', () => {
    const anomaly = mkEntry({ closeDt: undefined });
    expect(logsOwingForm222([mkLog()], [anomaly])).toHaveLength(1);
  });

  it('two owing logs → both returned (the R-H count is the length)', () => {
    const logs = [mkLog({ lgbkUid: 'AAAAAA' }), mkLog({ lgbkUid: 'BBBBBB' })];
    const owed = logsOwingForm222(logs, []);
    expect(owed).toHaveLength(2);
    expect(owed.map(l => l.lgbkUid)).toEqual(['AAAAAA', 'BBBBBB']);
    // Clearing one leaves the other owed.
    expect(logsOwingForm222(logs, [mkEntry({ lgbkNumRef: 'AAAAAA' })]).map(l => l.lgbkUid)).toEqual(['BBBBBB']);
  });

  it('a SENT log that owes still owes (sent logs are complete; R-D(b))', () => {
    const sentLog = { ...mkLog(), sentToDfo: true };
    expect(logsOwingForm222([sentLog], [])).toHaveLength(1);
  });

  it('an owing log with MM-Yes only on an extra effort is owed (the reader unifies efforts)', () => {
    const log = mkLog({ data: { mmYes: 'false', extraEffortNodes: JSON.stringify([node('true')]) } });
    expect(logsOwingForm222([log], [])).toHaveLength(1);
  });

  it('deleting the qualifying 222 re-opens the debt (R-G: computed live)', () => {
    const logs = [mkLog()];
    const entries = [mkEntry()];
    expect(logsOwingForm222(logs, entries)).toHaveLength(0);
    expect(logsOwingForm222(logs, [])).toHaveLength(1);
  });
});
