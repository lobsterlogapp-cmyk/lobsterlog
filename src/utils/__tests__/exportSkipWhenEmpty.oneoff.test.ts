// S151B guard — ruling R6 (defect 101): nothing to export means no export.
//
// Delete Account is NOT a DFO screen. It renders in ordinary Settings (App.tsx:1283, in the
// Account card beside Sign Out) with no dfoActivated gate, so every one of the ~175 free and Pro
// users reaches it. Before this gate they were each handed a file, and an alert announcing that
// "your transmission record is saved" — a legal record they had never had, for a Department they
// had never transmitted to. The file was real; its contents said "No transmissions were recorded".
//
// The gate is deliberately an AND of both stores, not one check. A harvester whose register was
// pruned but whose sent-XML archive survives still has something worth handing him, and the other
// way round. These tests pin both halves, because collapsing them is the obvious "tidy-up" a
// later reader would make.
const mockWrite = jest.fn(async (..._args: any[]) => {});
const mockShare = jest.fn(async (..._args: any[]) => ({ action: 'sharedAction' }));

jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: { CacheDir: '/tmp/cache', DocumentDir: '/tmp/docs' },
    writeFile: (...a: any[]) => mockWrite(...(a as [])),
  },
  android: { actionViewIntent: jest.fn(async () => {}) },
}));
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Share: { share: (...a: any[]) => mockShare(...(a as [])), dismissedAction: 'dismissedAction' },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportTransmissionRecordForDeletion } from '../exportTransmissionRecord';
import type { TransmissionRecord, XmlArchiveEntry } from '../dfoLogStorage';

const REGISTER_BASE = '@lobsterlog_transmission_register';
const ARCHIVE_BASE = '@lobsterlog_xml_archive';
const UID = 'uidSKIPTEST';
const AT = Date.UTC(2026, 7, 28, 21, 40, 12);

const oneRecord: TransmissionRecord[] = [
  {
    id: 'LL-1',
    logId: 'LL-1',
    attemptedAt: AT,
    outcome: 'success',
    xmlSnapshot: '<ELOG/>',
    soapSnapshot: '<s/>',
  },
];
const oneArchive: XmlArchiveEntry[] = [{ logId: 'LL-1', savedAt: AT, xml: '<ELOG/>' }];

/** Serve whatever the two stores are supposed to hold for this case. */
function seed(register: unknown | null, archive: unknown | null) {
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key.startsWith(REGISTER_BASE)) return register === null ? null : JSON.stringify(register);
    if (key.startsWith(ARCHIVE_BASE)) return archive === null ? null : JSON.stringify(archive);
    return null;
  });
}

describe('R6 — the export is skipped only when there is genuinely nothing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AsyncStorage, 'getItem').mockImplementation(async () => null);
  });

  it('writes NOTHING when both stores are absent', async () => {
    seed(null, null);
    const out = await exportTransmissionRecordForDeletion(UID, AT);
    expect(out).toEqual({ ok: true, skipped: true });
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('writes NOTHING when both stores are present but empty', async () => {
    seed([], []);
    const out = await exportTransmissionRecordForDeletion(UID, AT);
    expect(out).toEqual({ ok: true, skipped: true });
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('STILL EXPORTS when only the register has anything', async () => {
    seed(oneRecord, []);
    const out = await exportTransmissionRecordForDeletion(UID, AT);
    expect(out.ok).toBe(true);
    expect((out as any).skipped).toBe(false);
    expect((out as any).records).toBe(1);
    expect(mockWrite).toHaveBeenCalledTimes(1);
  });

  it('STILL EXPORTS when only the sent-XML archive has anything', async () => {
    seed([], oneArchive);
    const out = await exportTransmissionRecordForDeletion(UID, AT);
    expect(out.ok).toBe(true);
    expect((out as any).skipped).toBe(false);
    expect(mockWrite).toHaveBeenCalledTimes(1);
    // the archive's XML really is in the file that was written
    expect(String(mockWrite.mock.calls[0][1])).toContain('<ELOG/>');
  });

  it('exports when both have something', async () => {
    seed(oneRecord, oneArchive);
    const out = await exportTransmissionRecordForDeletion(UID, AT);
    expect((out as any).skipped).toBe(false);
    expect(mockWrite).toHaveBeenCalledTimes(1);
  });

  it('a corrupt store reads as empty, and does not fake a record into existence', async () => {
    // Guards the Array.isArray() coercion above the gate: garbage must not look like content.
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async () => '"not-an-array"');
    const out = await exportTransmissionRecordForDeletion(UID, AT);
    expect(out).toEqual({ ok: true, skipped: true });
    expect(mockWrite).not.toHaveBeenCalled();
  });
});
