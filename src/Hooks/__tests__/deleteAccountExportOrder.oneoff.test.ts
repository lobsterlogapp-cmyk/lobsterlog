// S150C guard — the Delete Account export must run FIRST, and must never block the deletion.
//
// Ruling C1 hands the harvester a plain-text copy of his transmission record and then deletes
// everything. Two properties make that ruling real, and both are easy to break by accident:
//
//   1. ORDER. The export reads the register out of the deleted account's uid namespace. Once
//      deleteUser fires, that uid is gone and the register is unreadable — so an export that
//      slips below deleteUser produces an empty or failed file and the harvester silently loses
//      a legal record. S150's whole defect was a record that existed but could not be reached.
//   2. NON-BLOCKING (ruling R2). He is entitled to delete his account. An export that throws
//      must not fall through to the outer catch and abandon the sequence half-done — that would
//      leave the account alive but the harvester believing it was deleted.
//
// The hook is driven for real through react-test-renderer (a declared devDependency), so these
// assert observable behaviour rather than the shape of the source.
import * as React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const order: string[] = [];

type ExportOutcome =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false; fileName: string; path: string; records: number }
  | { ok: false; reason: 'read_failed' | 'write_failed' };

const OK_EXPORT: ExportOutcome = {
  ok: true,
  skipped: false,
  fileName: 'LobsterLog-transmission-record-20260828214012.txt',
  path: '/docs/f.txt',
  records: 3,
};

// S151B R6 — register and archive both empty, so nothing was written and nothing is announced.
const SKIPPED_EXPORT: ExportOutcome = { ok: true, skipped: true };

const mockExport = jest.fn(async (_uid: string, _at: number): Promise<ExportOutcome> => {
  order.push('export');
  return OK_EXPORT;
});
const mockWipe = jest.fn(async () => { order.push('wipeAllStores'); return { ok: true }; });
const mockClearLocal = jest.fn(async () => { order.push('clearLocalDfoStores'); });
const mockDeleteDoc = jest.fn(async () => { order.push('deleteDoc'); });
const mockDeleteUser = jest.fn(async () => { order.push('deleteUser'); });
const mockAlert = jest.fn();

jest.mock('react-native', () => ({ Alert: { alert: (...a: any[]) => mockAlert(...a) } }));
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { isConfigured: jest.fn(async () => false), logIn: jest.fn(), logOut: jest.fn(async () => {}) },
}));
jest.mock('i18next', () => ({ __esModule: true, default: { t: (k: string) => k, language: 'en' } }));
jest.mock('../../../firebaseConfig', () => ({
  auth: { currentUser: { uid: 'uidDELETE', email: 'test@example.com' } },
  db: {},
}));
jest.mock('@react-native-firebase/auth', () => ({
  onAuthStateChanged: (_a: any, cb: any) => { cb({ uid: 'uidDELETE', email: 'test@example.com' }); return () => {}; },
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  deleteUser: (...a: any[]) => mockDeleteUser(...(a as [])),
  reauthenticateWithCredential: jest.fn(async () => { order.push('reauth'); }),
  EmailAuthProvider: { credential: jest.fn(() => ({})) },
  setLanguageCode: jest.fn(),
}));
jest.mock('@react-native-firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  deleteDoc: (...a: any[]) => mockDeleteDoc(...(a as [])),
}));
jest.mock('../../utils/dfoBackup', () => ({
  wipeAllStores: (...a: any[]) => mockWipe(...(a as [])),
  clearLocalDfoStores: (...a: any[]) => mockClearLocal(...(a as [])),
}));
jest.mock('../../utils/dfoStorageKeys', () => ({ setActiveDfoUid: jest.fn() }));
jest.mock('../../utils/exportTransmissionRecord', () => ({
  exportTransmissionRecordForDeletion: (uid: string, at: number) => mockExport(uid, at),
}));

import { useAuth } from '../useAuth';

const DESTRUCTIVE = ['wipeAllStores', 'deleteDoc', 'deleteUser', 'clearLocalDfoStores'];

async function runDelete(): Promise<any> {
  let api: any;
  function Probe() { api = useAuth(); return null; }
  await act(async () => { TestRenderer.create(React.createElement(Probe)); });
  await act(async () => { await api.confirmReauthDelete('password'); });
  return api;
}

describe('Delete Account exports the transmission record first', () => {
  // The throwing-export case deliberately logs a warning — that IS the guard firing. Silence it
  // so a passing run stays readable.
  let warn: jest.SpyInstance;
  beforeAll(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterAll(() => { warn.mockRestore(); });

  beforeEach(() => {
    order.length = 0;
    jest.clearAllMocks();
    mockExport.mockImplementation(async () => {
      order.push('export');
      return OK_EXPORT;
    });
    mockWipe.mockImplementation(async () => { order.push('wipeAllStores'); return { ok: true }; });
  });

  it('runs the export before every destructive step', async () => {
    await runDelete();
    expect(mockExport).toHaveBeenCalledTimes(1);
    expect(order).toContain('export');
    const exportAt = order.indexOf('export');
    for (const step of DESTRUCTIVE) {
      expect(order).toContain(step);
      expect(exportAt).toBeLessThan(order.indexOf(step));
    }
  });

  it('runs the export before deleteUser — the point of no return', async () => {
    await runDelete();
    expect(order.indexOf('export')).toBeLessThan(order.indexOf('deleteUser'));
  });

  it('exports the account being deleted, by explicit uid', async () => {
    await runDelete();
    expect(mockExport.mock.calls[0][0]).toBe('uidDELETE');
  });

  it('completes the deletion even when the export THROWS', async () => {
    mockExport.mockImplementation(async (): Promise<ExportOutcome> => {
      order.push('export');
      throw new Error('disk full');
    });
    await runDelete();
    // Every destructive step still ran — the harvester is not trapped with an account he
    // asked to delete.
    for (const step of DESTRUCTIVE) expect(order).toContain(step);
    expect(order.indexOf('export')).toBeLessThan(order.indexOf('deleteUser'));
  });

  it('completes the deletion when the export reports failure', async () => {
    mockExport.mockImplementation(async (): Promise<ExportOutcome> => {
      order.push('export');
      return { ok: false, reason: 'write_failed' };
    });
    await runDelete();
    for (const step of DESTRUCTIVE) expect(order).toContain(step);
  });

  it('tells him where the file went, naming it', async () => {
    await runDelete();
    const [title, body] = mockAlert.mock.calls[0];
    expect(title).toBe('account.exportSavedTitle');
    expect(body).toBe('account.exportSavedBody');
  });

  it('tells him when the record could NOT be saved', async () => {
    mockExport.mockImplementation(async (): Promise<ExportOutcome> => ({ ok: false, reason: 'write_failed' }));
    await runDelete();
    expect(mockAlert.mock.calls[0][0]).toBe('account.exportFailedTitle');
  });

  // ── S151B R6 (defect 101) — nothing to export means nothing is said ──────────────────
  // Delete Account is not a DFO screen; it sits in ordinary Settings and every free/Pro user
  // reaches it. Announcing a saved "transmission record" to someone who never transmitted is a
  // false statement about a legal record.

  it('says NOTHING when there was nothing to export', async () => {
    mockExport.mockImplementation(async (): Promise<ExportOutcome> => {
      order.push('export');
      return SKIPPED_EXPORT;
    });
    await runDelete();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('still completes the whole deletion when the export was skipped', async () => {
    mockExport.mockImplementation(async (): Promise<ExportOutcome> => {
      order.push('export');
      return SKIPPED_EXPORT;
    });
    await runDelete();
    for (const step of DESTRUCTIVE) expect(order).toContain(step);
    expect(order.indexOf('export')).toBeLessThan(order.indexOf('deleteUser'));
  });

  it('still announces the file when there WAS something to export', async () => {
    await runDelete();
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockAlert.mock.calls[0][0]).toBe('account.exportSavedTitle');
  });

  it('destroys nothing — and exports nothing — when reauthentication fails', async () => {
    const auth = require('@react-native-firebase/auth');
    auth.reauthenticateWithCredential.mockImplementationOnce(async () => {
      throw new Error('wrong password');
    });
    await runDelete();
    expect(mockExport).not.toHaveBeenCalled();
    for (const step of DESTRUCTIVE) expect(order).not.toContain(step);
  });
});
