/**
 * S95 Item 2 — crash-safety scratch draft round-trip guard.
 *
 * Verifies the three scratch helpers in dfoLogStorage:
 *   saveActiveDraft → loadActiveDraft round-trips a DfoLog verbatim, clearActiveDraft removes it,
 *   and the scratch write never touches the main `dfo_logs` store (no saved-log storage change).
 * Uses the official in-memory AsyncStorage mock (jest.config moduleNameMapper).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveActiveDraft,
  loadActiveDraft,
  clearActiveDraft,
  loadAllLogs,
  DfoLog,
} from '../dfoLogStorage';

const makeLog = (): DfoLog => ({
  id: 'LL-20260706-001',
  lgbkUid: 'ABCDEF',
  firstEntryDt: '2026-07-06T12:00:00.000Z',
  mode: 'full',
  status: 'draft',
  dateFished: '2026-07-06',
  createdAt: 1751800000000,
  data: { timeSailed: '05:30', catchWeight: '120', fmaId: '38065' },
  remarks: { trip: 'in-progress note' },
  subformId: 90,
  regId: 1004,
  tripNum: 9,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('loadActiveDraft returns null when no scratch has been written', async () => {
  expect(await loadActiveDraft()).toBeNull();
});

test('saveActiveDraft → loadActiveDraft round-trips the DfoLog verbatim', async () => {
  const log = makeLog();
  await saveActiveDraft(log);
  expect(await loadActiveDraft()).toEqual(log);
});

test('clearActiveDraft removes the scratch (loadActiveDraft → null)', async () => {
  await saveActiveDraft(makeLog());
  expect(await loadActiveDraft()).not.toBeNull();
  await clearActiveDraft();
  expect(await loadActiveDraft()).toBeNull();
});

test('the scratch write never touches the main dfo_logs store', async () => {
  await saveActiveDraft(makeLog());
  expect(await loadAllLogs()).toEqual([]); // saved-log store untouched
  expect(await loadActiveDraft()).not.toBeNull(); // scratch lives in its own key
});
