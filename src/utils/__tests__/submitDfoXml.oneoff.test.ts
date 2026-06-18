// Unit test for the shared submitDfoXml() helper. Mocks global.fetch and the storage
// writes so we can assert exactly one TransmissionRecord is written per call, the archive
// is written ONLY on success, and the §13.3.1 snapshot.vrn lands on the success record.
import { submitDfoXml } from '../submitDfoXml';
import * as storage from '../dfoLogStorage';

jest.mock('../dfoLogStorage', () => ({
  saveTransmissionRecord: jest.fn(),
  saveXmlArchiveEntry: jest.fn(),
}));

const saveTransmissionRecord = storage.saveTransmissionRecord as jest.Mock;
const saveXmlArchiveEntry = storage.saveXmlArchiveEntry as jest.Mock;

const baseArgs = {
  soap: '<soap/>',
  xml: '<ELOG/>',
  fileName: '1004-1004460-20260618000000.XML',
  recordId: 'FORM222-abc',
  logId: 'FORM222-abc',
};

const mockFetch = (status: number, body: string) => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    status,
    text: async () => body,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('submitDfoXml', () => {
  it('(a) WS0000 + valid CONF → ok, one success record, archive written, snapshot.vrn recorded', async () => {
    mockFetch(200, '<WS_RESP><ERR>WS0000</ERR><CONF>162900</CONF></WS_RESP>');

    const result = await submitDfoXml({ ...baseArgs, snapshot: { vrn: 'VRN123' } });

    expect(result.ok).toBe(true);
    expect(result.confNumber).toBe('162900');
    expect(result.errCode).toBe('WS0000');

    expect(saveTransmissionRecord).toHaveBeenCalledTimes(1);
    expect(saveXmlArchiveEntry).toHaveBeenCalledTimes(1);

    const record = saveTransmissionRecord.mock.calls[0][0];
    expect(record.outcome).toBe('success');
    expect(record.confNumber).toBe('162900');
    expect(record.vrn).toBe('VRN123');

    const archive = saveXmlArchiveEntry.mock.calls[0][0];
    expect(archive.logId).toBe('FORM222-abc');
    expect(archive.xml).toBe('<ELOG/>');
  });

  it('(b) HTTP 500 → not ok, one failure record, NO archive', async () => {
    mockFetch(500, 'Internal Server Error');

    const result = await submitDfoXml(baseArgs);

    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(500);

    expect(saveTransmissionRecord).toHaveBeenCalledTimes(1);
    expect(saveXmlArchiveEntry).not.toHaveBeenCalled();

    const record = saveTransmissionRecord.mock.calls[0][0];
    expect(record.outcome).toBe('failure');
    expect(record.httpStatus).toBe(500);
  });

  it('(c) HTTP 200 but ERR != WS0000 → not ok, one failure record, NO archive', async () => {
    mockFetch(200, '<WS_RESP><ERR>WS1234</ERR></WS_RESP>');

    const result = await submitDfoXml(baseArgs);

    expect(result.ok).toBe(false);
    expect(result.errCode).toBe('WS1234');

    expect(saveTransmissionRecord).toHaveBeenCalledTimes(1);
    expect(saveXmlArchiveEntry).not.toHaveBeenCalled();

    const record = saveTransmissionRecord.mock.calls[0][0];
    expect(record.outcome).toBe('failure');
  });
});
