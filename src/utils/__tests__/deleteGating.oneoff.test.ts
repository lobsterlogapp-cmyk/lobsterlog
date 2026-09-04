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
  deleteOffered,
  DEV_ALLOW_DELETE_CLOSED,
  saveActiveDraft,
  loadActiveDraft,
  saveTransmissionRecord,
  saveXmlArchiveEntry,
  loadTransmissionRegister,
  loadXmlArchive,
  DfoLog,
} from '../dfoLogStorage';
import { formEntryDeleteOffered, closedRowActionRefused } from '../dfoLogStorage';
import { Form222Entry, saveForm222Entry, loadForm222Entries, deleteForm222Entry } from '../dfoForm222Generator';
import { Form233Entry, saveForm233Entry, loadForm233Entries, deleteForm233Entry } from '../dfoForm233Generator';

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

test('deleting an id that does not exist is ok BUT flagged notFound, and moves nothing', async () => {
  const log = makeLog();
  await saveLog(log);
  const res = await deleteLog('LL-20991231-999');
  expect(res).toEqual({ ok: true, notFound: true });
  expect((await loadAllLogs()).map(l => l.id)).toEqual([log.id]);
});

test('a real delete never carries the notFound flag', async () => {
  const log = makeLog();
  await saveLog(log);
  const res = await deleteLog(log.id);
  expect(res).toEqual({ ok: true });
  expect('notFound' in res).toBe(false);
});

// --- the S95 crash-scratch (@lobsterlog:dfo_active_draft) ---

test('deleting a log clears a crash-scratch carrying the SAME id (no resurrection orphan)', async () => {
  const log = makeLog();
  await saveLog(log);
  await saveActiveDraft(log);
  expect(await deleteLog(log.id)).toEqual({ ok: true });
  expect(await loadActiveDraft()).toBeNull();
});

test('deleting a log leaves a crash-scratch for a DIFFERENT id alone', async () => {
  const log = makeLog();
  const otherScratch = makeLog({ id: 'LL-20260902-001', lgbkUid: 'GHIJKL' });
  await saveLog(log);
  await saveActiveDraft(otherScratch);
  expect(await deleteLog(log.id)).toEqual({ ok: true });
  expect((await loadActiveDraft())?.id).toBe(otherScratch.id);
});

test('a REFUSED delete leaves the matching scratch alone (the crash snapshot survives a refusal)', async () => {
  const log = makeLog({}, { dgCloseEffort: STAMP });
  await saveLog(log);
  await saveActiveDraft(log);
  expect(await deleteLog(log.id)).toEqual({ ok: false, reason: 'closedGroup' });
  expect((await loadActiveDraft())?.id).toBe(log.id);
});

test('a notFound delete leaves the scratch alone', async () => {
  const scratch = makeLog();
  await saveActiveDraft(scratch);
  expect(await deleteLog('LL-20991231-999')).toEqual({ ok: true, notFound: true });
  expect((await loadActiveDraft())?.id).toBe(scratch.id);
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

// --- the dev flag (S160 Phase 2) ---

test('⚠ SHIP BLOCKER PIN: DEV_ALLOW_DELETE_CLOSED is OFF — a red here means someone left the dev flag flipped', () => {
  // The flag is flipped to `__DEV__ && true` only for a capture-sim cleanup session and must
  // be flipped straight back. This pin (plus the ten refusal tests, which the override makes
  // fail loudly) is what catches a forgotten flip before it reaches a commit.
  expect(DEV_ALLOW_DELETE_CLOSED).toBe(false);
});

// --- the door rule (S160 Phase 3) ---
// deleteOffered is what all three Delete doors render off. With the flag off (the pinned
// state) it must equal !hasAnyClosedGroup exactly — Ruling A's one sentence. The flag-on
// half of its behaviour is proven by mutation M12 (see GATE 2), not here.

test('deleteOffered: true on a fully open draft, false the moment anything is closed', () => {
  expect(deleteOffered(makeLog())).toBe(true);
  expect(deleteOffered(makeLog({}, { dgCloseLanding: STAMP }))).toBe(false);
  expect(deleteOffered(makeLog({}, {
    baitEntries: JSON.stringify([{ type: 'Herring', lbs: '10', closeDt: STAMP }]),
  }))).toBe(false);
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


// --- S160 Phase 3B: the 222/233 form-entry guards (one rule, per-store census = one closeDt) ---

const make222 = (over: Partial<Form222Entry> = {}): Form222Entry => ({
  uid: 'AAAAAA', savedAt: Date.now(), interactInd: 'Y',
  reportDate: '2026-09-01', interactionDate: '2026-09-01', interactionTime: '06:00',
  lat: '43.8237', lon: '-66.1200', speciesLabel: '', nbAnimals: '1',
  interactionTypeLabel: '', injuryInd: 'N', deathInd: 'N', entangleInd: 'N',
  gearDamageInd: 'N', observerNm: '', contactInfo: '', remarks: '',
  status: 'draft', sentToDfo: false, ...over,
});

const make233 = (over: Partial<Form233Entry> = {}): Form233Entry => ({
  uid: 'BBBBBB', savedAt: Date.now(), periodStartDate: '2026-08-01',
  periodEndDate: '2026-08-15', reason: 'Weather', licenceNo: '104460',
  fin: '100400460', status: 'draft', sentToDfo: false, ...over,
});

test('formEntryDeleteOffered: open draft yes; closeDt no; sent no', () => {
  expect(formEntryDeleteOffered(make222())).toBe(true);
  expect(formEntryDeleteOffered(make222({ closeDt: STAMP, status: 'complete' }))).toBe(false);
  expect(formEntryDeleteOffered(make222({ sentToDfo: true }))).toBe(false);
});

test('deleteForm222Entry: draft deletes; closed-unsent refused; sent refused; unknown uid flagged', async () => {
  await saveForm222Entry(make222());
  expect(await deleteForm222Entry('AAAAAA')).toEqual({ ok: true });
  expect(await loadForm222Entries()).toHaveLength(0);

  await saveForm222Entry(make222({ closeDt: STAMP, status: 'complete' }));
  expect(await deleteForm222Entry('AAAAAA')).toEqual({ ok: false, reason: 'closedGroup' });
  expect(await loadForm222Entries()).toHaveLength(1);

  await saveForm222Entry(make222({ closeDt: STAMP, status: 'complete', sentToDfo: true }));
  expect(await deleteForm222Entry('AAAAAA')).toEqual({ ok: false, reason: 'sent' });
  expect(await loadForm222Entries()).toHaveLength(1);

  expect(await deleteForm222Entry('ZZZZZZ')).toEqual({ ok: true, notFound: true });
  expect(await loadForm222Entries()).toHaveLength(1);
});

test('deleteForm233Entry: draft deletes; closed-unsent refused; sent refused; unknown uid flagged', async () => {
  await saveForm233Entry(make233());
  expect(await deleteForm233Entry('BBBBBB')).toEqual({ ok: true });
  expect(await loadForm233Entries()).toHaveLength(0);

  await saveForm233Entry(make233({ closeDt: STAMP, status: 'complete' }));
  expect(await deleteForm233Entry('BBBBBB')).toEqual({ ok: false, reason: 'closedGroup' });
  expect(await loadForm233Entries()).toHaveLength(1);

  await saveForm233Entry(make233({ closeDt: STAMP, status: 'complete', sentToDfo: true }));
  expect(await deleteForm233Entry('BBBBBB')).toEqual({ ok: false, reason: 'sent' });
  expect(await loadForm233Entries()).toHaveLength(1);

  expect(await deleteForm233Entry('YYYYYY')).toEqual({ ok: true, notFound: true });
  expect(await loadForm233Entries()).toHaveLength(1);
});


// --- S160 Phase 4: the row/block-level action refusal (the effortDeleteRefused pattern) ---
// These tests are the ONLY automated evidence for the five FullDfoForm call sites
// (deleteBait / deleteBycatch / openBaitEdit / openBycatchEdit / removeSarBlock) — the
// component cannot render under jest and the guarded buttons are hidden on closed rows,
// so no walk can reach them either. Deliberately NO dev-flag arm (defect-140 territory).

test('closedRowActionRefused: open row acts; own closeDt refuses; card stamp refuses; missing row refuses', () => {
  expect(closedRowActionRefused({ closeDt: undefined }, undefined)).toBe(false);
  expect(closedRowActionRefused({}, undefined)).toBe(false);
  expect(closedRowActionRefused({ closeDt: STAMP }, undefined)).toBe(true);
  expect(closedRowActionRefused({}, STAMP)).toBe(true);          // legacy card stamp, open row
  expect(closedRowActionRefused(undefined, undefined)).toBe(true); // missing target never acts
});
