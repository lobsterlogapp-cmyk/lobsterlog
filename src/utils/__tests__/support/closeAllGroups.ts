// S125 Phase 9 TEST SCAFFOLDING (not app code, not a suite — excluded via jest testPathIgnorePatterns).
// Stamps every dgClose* data-group key on a fixture's data map, mirroring the app's Close & Save All,
// so a generator fixture represents a CLOSED, sendable log. ONE definition of "stamp everything".
//
// CLOSE_STAMP is the same ISO the fixtures already used for dgClosePcos/dgClose* (→ date_14
// 20260610150000), so applying this to a fixture that already carries exact-XML baselines
// (multiGrid, sarMulti) does not move a byte: the extra keys are for groups those fixtures don't
// emit, and the shared groups keep the identical stamp.
export const CLOSE_STAMP = '2026-06-10T15:00:00.000Z';

const DG_CLOSE_KEYS = [
  'dgCloseEffort', 'dgCloseLanding', 'dgCloseBaitUsed',
  'dgClosePconsBycatch', 'dgClosePconsPersonal', 'dgCloseSar',
  'dgCloseTransfer', 'dgCloseHlin', 'dgCloseHlout',
];

export function closeAllGroups<T extends { data: Record<string, string> }>(log: T, stamp: string = CLOSE_STAMP): T {
  for (const k of DG_CLOSE_KEYS) log.data[k] = stamp;
  return log;
}
