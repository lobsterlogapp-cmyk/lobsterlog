// S150B guard — the Delete Account export must actually contain the harvester's record.
//
// Ruling C1 hands him a plain-text copy of the transmission register plus the sent XML, and then
// deletes everything. If the builder silently drops a record, a field or an XML document, the
// harvester loses a legal record he cannot get back — there is no second copy anywhere by design.
// These tests pin the parts that make the file worth having.
//
// buildTransmissionRecordExport is PURE (register + archive in, string out), so nothing is mocked
// except the two native modules the module imports for the separate write/share helper.
jest.mock('react-native-blob-util', () => ({
  fs: { dirs: { CacheDir: '/tmp/cache', DocumentDir: '/tmp/docs' }, writeFile: jest.fn() },
  android: { actionViewIntent: jest.fn() },
}));

import {
  buildTransmissionRecordExport,
  transmissionRecordExportFileName,
  formatExportTimestamp,
  EXPORT_FIELD_LABELS,
} from '../exportTransmissionRecord';
import type { TransmissionRecord, XmlArchiveEntry } from '../dfoLogStorage';

const GENERATED_AT = Date.UTC(2026, 7, 28, 21, 40, 12); // 2026-08-28 21:40:12 UTC
const UID = 'uidEXPORTTEST';

const accepted: TransmissionRecord = {
  id: 'LL-20260828-001',
  logId: 'LL-20260828-001',
  attemptedAt: Date.UTC(2026, 7, 28, 15, 51, 3),
  outcome: 'success',
  httpStatus: 200,
  fileName: '1004-104460-20260828155103.XML',
  confNumber: '164051',
  xmlSnapshot: '<ELOG><GENERAL_INFO><CIE_ID>44542</CIE_ID></GENERAL_INFO></ELOG>',
  soapSnapshot: '<soap:Envelope><p_elogkey>U0VDUkVUS0VZ</p_elogkey></soap:Envelope>',
  vrn: '104460',
  tripNum: 2,
  xsdValid: true,
  wsErrCode: 'WS0000',
  kind: 'logbook',
};

const failed: TransmissionRecord = {
  id: 'FORM222-OYTWTM',
  logId: 'FORM222-OYTWTM',
  attemptedAt: Date.UTC(2026, 7, 14, 12, 39, 0),
  outcome: 'failure',
  httpStatus: 500,
  errorMessage: 'Internal Server Error',
  fileName: '1004-104460-20260814123900.XML',
  xmlSnapshot: '<ELOG><MM_INTER><INTERACT_IND>N</INTERACT_IND></MM_INTER></ELOG>',
  soapSnapshot: '<soap:Envelope><p_elogkey>U0VDUkVUS0VZ</p_elogkey></soap:Envelope>',
  vrn: '104460',
  xsdValid: true,
  wsErrCode: 'WS1038',
  kind: 'form222',
  failureKind: 'refused',
};

const archive: XmlArchiveEntry[] = [
  {
    logId: 'LL-20260828-001',
    savedAt: Date.UTC(2026, 7, 28, 15, 51, 4),
    xml: '<ELOG><GENERAL_INFO><CIE_ID>44542</CIE_ID></GENERAL_INFO></ELOG>',
  },
];

const build = (records: TransmissionRecord[] = [accepted, failed], arc = archive) =>
  buildTransmissionRecordExport({ records, archive: arc, uid: UID, generatedAt: GENERATED_AT });

describe('transmission record export', () => {
  it('contains every record in the register', () => {
    const out = build();
    expect(out).toContain('RECORD 1 OF 2');
    expect(out).toContain('RECORD 2 OF 2');
    expect(out).toContain('LL-20260828-001');
    expect(out).toContain('FORM222-OYTWTM');
    expect(out).toContain('Records:                  2 (1 accepted, 1 failed)');
  });

  it('contains a label for every one of the 16 TransmissionRecord fields', () => {
    const out = build();
    // 16 fields — the count is asserted so a future field added to the interface without a
    // label here is caught rather than silently omitted from the harvester's copy.
    expect(Object.keys(EXPORT_FIELD_LABELS)).toHaveLength(16);
    for (const label of Object.values(EXPORT_FIELD_LABELS)) {
      expect(out).toContain(label);
    }
  });

  it('carries the values a fishery officer would look for', () => {
    const out = build();
    expect(out).toContain('164051');                          // DFO confirmation number
    expect(out).toContain('WS0000');                          // DFO response code
    expect(out).toContain('WS1038');                          // and the failed one
    expect(out).toContain('1004-104460-20260828155103.XML');  // sent file name
    expect(out).toContain('Accepted by DFO');
    expect(out).toContain('Failed');
    expect(out).toContain('2026-08-28 15:51:03 UTC');
  });

  it('includes the sent XML — from the archive AND from a failed send', () => {
    const out = build();
    expect(out).toContain('SENT XML DOCUMENTS');
    expect(out).toContain('XML 1 OF 1');
    expect(out).toContain('<CIE_ID>44542</CIE_ID>');
    // The archive is success-only, so a failed send's XML exists ONLY on its record.
    expect(out).toContain('<INTERACT_IND>N</INTERACT_IND>');
  });

  it('never prints the SOAP envelope, because it carries the ELOG key', () => {
    const out = build();
    expect(out).not.toContain('U0VDUkVUS0VZ');   // the base64 key from the fixtures
    expect(out).not.toContain('p_elogkey');
    // ...but the field is acknowledged, not silently dropped.
    expect(out).toContain('present, not included (contains your DFO ELOG key)');
  });

  it('is plain text — no markdown a fishery officer would have to read through', () => {
    const out = build();
    expect(out).not.toContain('*');
    expect(out).not.toContain('```');
    expect(out).not.toContain('# ');
  });

  it('says so plainly when there is nothing to export', () => {
    const out = build([], []);
    expect(out).toContain('No transmissions were recorded');
    expect(out).toContain('No sent XML documents were archived');
    expect(out).toContain('Records:                  0 (0 accepted, 0 failed)');
  });

  it('orders records newest first', () => {
    const out = build([failed, accepted]); // deliberately oldest-first on the way in
    expect(out.indexOf('LL-20260828-001')).toBeLessThan(out.indexOf('FORM222-OYTWTM'));
  });

  it('names the file with a UTC stamp and a .txt extension', () => {
    expect(transmissionRecordExportFileName(GENERATED_AT)).toBe(
      'LobsterLog-transmission-record-20260828214012.txt',
    );
  });

  it('renders a missing timestamp as an em dash rather than 1970', () => {
    expect(formatExportTimestamp(undefined)).toBe('—');
    expect(formatExportTimestamp(GENERATED_AT)).toBe('2026-08-28 21:40:12 UTC');
  });
});
