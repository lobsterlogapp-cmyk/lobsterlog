/**
 * S160 — the delete gate (Standard v6.1, Appendix A.1.2).
 *
 * deleteLog refuses when the log is SENT or contains ANY closed data group — the refusal
 * lives in the function, not only in the hidden button. One test per closure home, so a
 * dropped arm of hasAnyClosedGroup fails its own named test and not a pile:
 *   flat card stamps · legacy card stamps · bait rows · bycatch rows · SAR block 1 (flat)
 *   · SAR blocks 2+ (extraSars) · legacy dgCloseSar · effort 1 (dgCloseEffort) · efforts 2+.
 * Plus: the register and xml_archive are untouched on every path (§13.4), delete of an
 * unknown id stays idempotent-ok, and unit tags are never mistaken for closures.
 *
 * Uses the official in-memory AsyncStorage mock (jest.config moduleNameMapper).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deleteLog,
  saveLog,
  loadAllLogs,
  hasAnyClosedGroup,
  rowsAnyClosed,
  saveTransmissionRecord,
  saveXmlArchiveEntry,
  loadTransmissionRegister,
  loadXmlArchive,
  DfoLog,
} from '../dfoLogStorage';

const STAMP = '2026-09-01T15:00:00.000Z';

const makeLog = (over: Partial<DfoLog> = {}, data: Record<string, string> = {}): DfoLog => ({
  id: 'LL-20260901-001',
  lgbkUid: 'ABCDEF',
  firstEntryDt: '2026-09-01T12:00:00.000Z',
  mode: 'full',
  status: 'draft',
  sentToDfo: false,
  dateFished: '2026-09-01',
  createdAt: 1756738800000,
  data: { timeSailed: '05:30', catchWeight: '120', fmaId: '38065', ...data },
  subformId: 90,
  regId: 1004,
  tripNum: 3,
  ...over,
});

// Seed one register record + one archive entry, and return the raw store snapshots so a
// test can prove delete moved neither byte (§13.4 / Standard §13.3).
const seedRegisterAndArchive = async (logId: string): Promise<{ reg: string; arc: string }> => {
  await saveTransmissionRecord({
    id: logId, logId, attemptedAt: Date.now(), outcome: 'failure',
    errorMessage: 'seed', xmlSnapshot: '<ELOG/>', soapSnapshot: '<soap/>',
  });
  await saveXmlArchiveEntry({ logId, savedAt: Date.now(), xml: '<ELOG/>' });
  const reg = JSON.stringify(await loadTransmissionRegister());
  const arc = JSON.stringify(await loadXmlArchive());
  return { reg, arc };
};

const expectRegisterAndArchiveUnmoved = async (before: { reg: string; arc: string }) => {
  expect(JSON.stringify(await loadTransmissionRegister())).toBe(before.reg);
  expect(JSON.stringify(await loadXmlArchive())).toBe(before.arc);
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

// --- allowed: nothing closed ---

test('a fully open draft deletes: ok, gone from the store, register and archive untouched', async () => {
  const log = makeLog();
  await saveLog(log);
  const before = await seedRegisterAndArchive(log.id);
  const res = await deleteLog(log.id);
  expect(res).toEqual({ ok: true });
  expect((await loadAllLogs()).find(l => l.id === log.id)).toBeUndefined();
  await expectRegisterAndArchiveUnmoved(before);
});

test('deleting an id that does not exist stays idempotent-ok and moves nothing', async () => {
  const log = makeLog();
  await saveLog(log);
  const res = await deleteLog('LL-20991231-999');
  expect(res).toEqual({ ok: true });
  expect((await loadAllLogs()).map(l => l.id)).toEqual([log.id]);
});

// --- refused: one test per closure home ---

const expectRefusedClosedGroup = async (data: Record<string, string>, over: Partial<DfoLog> = {}) => {
  const log = makeLog(over, data);
  await saveLog(log);
  const before = await seedRegisterAndArchive(log.id);
  const res = await deleteLog(log.id);
  expect(res).toEqual({ ok: false, reason: 'closedGroup' });
  expect((await loadAllLogs()).find(l => l.id === log.id)).toBeDefined();
  await expectRegisterAndArchiveUnmoved(before);
};

test('refused: a flat card stamp (dgCloseLanding) on a draft', async () => {
  await expectRefusedClosedGroup({ dgCloseLanding: STAMP });
});

test('refused: effort 1 closed (dgCloseEffort) — the efforts arm', async () => {
  await expectRefusedClosedGroup({ dgCloseEffort: STAMP });
});

test('refused: an effort 2+ closed by its own closeDt while effort 1 is open', async () => {
  await expectRefusedClosedGroup({
    extraEffortNodes: JSON.stringify([{ fmaId: '38065', closeDt: STAMP }]),
  });
});

test('refused: one closed bait row among open ones', async () => {
  await expectRefusedClosedGroup({
    baitEntries: JSON.stringify([
      { type: 'Mackerel', lbs: '40' },
      { type: 'Herring', lbs: '10', closeDt: STAMP },
    ]),
  });
});

test('refused: one closed bycatch row', async () => {
  await expectRefusedClosedGroup({
    bycatchEntries: JSON.stringify([{ species: 'Lobster', lbs: '5', closeDt: STAMP }]),
  });
});

test('refused: SAR block 1 closed via the flat sarCloseDt', async () => {
  await expectRefusedClosedGroup({ sarCloseDt: STAMP });
});

test('refused: a SAR block 2+ closed via its extraSars closeDt', async () => {
  await expectRefusedClosedGroup({
    extraSars: JSON.stringify([{ species: '10561', closeDt: STAMP }]),
  });
});

test('refused: the legacy card-level dgCloseSar', async () => {
  await expectRefusedClosedGroup({ dgCloseSar: STAMP });
});

test('refused: the legacy card-level bait stamp even with an unreadable rows array', async () => {
  await expectRefusedClosedGroup({ dgCloseBaitUsed: STAMP, baitEntries: 'not json' });
});

test('refused: a completed-unsent log (Close & Save All leaves stamps)', async () => {
  await expectRefusedClosedGroup(
    { dgCloseEffort: STAMP, dgCloseLanding: STAMP },
    { status: 'complete' },
  );
});

// --- refused: sent, and sent wins the reason ---

test('refused: a sent log names "sent" even though its groups are also closed', async () => {
  const log = makeLog({ status: 'complete', sentToDfo: true },
    { dgCloseEffort: STAMP, dgCloseLanding: STAMP });
  await saveLog(log);
  const before = await seedRegisterAndArchive(log.id);
  const res = await deleteLog(log.id);
  expect(res).toEqual({ ok: false, reason: 'sent' });
  expect((await loadAllLogs()).find(l => l.id === log.id)).toBeDefined();
  await expectRegisterAndArchiveUnmoved(before);
});

test('refused: a sent log with no stamps at all still refuses as "sent" (arm independence)', async () => {
  const log = makeLog({ sentToDfo: true });
  await saveLog(log);
  expect(await deleteLog(log.id)).toEqual({ ok: false, reason: 'sent' });
});

// --- the predicate itself ---

test('hasAnyClosedGroup is false when only unit tags ride the map (a unit is not a closure)', () => {
  expect(hasAnyClosedGroup({
    data: { dgCloseEffortUnit: 'kg', sarCloseUnit: 'lbs', draftWeightUnit: 'lbs' },
  })).toBe(false);
});

test('rowsAnyClosed: some-closed true, none-closed false, unparseable false, empty false', () => {
  expect(rowsAnyClosed(JSON.stringify([{ lbs: '1' }, { lbs: '2', closeDt: STAMP }]))).toBe(true);
  expect(rowsAnyClosed(JSON.stringify([{ lbs: '1' }]))).toBe(false);
  expect(rowsAnyClosed('not json')).toBe(false);
  expect(rowsAnyClosed(undefined)).toBe(false);
});
