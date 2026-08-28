// S148 Phase 1 / defect 87 guard — what may and may not reach TransmissionRecord.wsErrCode.
//
// wsErrCode is the field behind the Transmission Result row labelled "DFO response code" /
// « Code de réponse du MPO ». That row sits in a §13.3.1 record retained three years and read by a
// boarding officer, so it may hold ONLY a code DFO actually sent (ruling R-A). The three markers
// this app invented — SOAP_FAULT, NO_CONF, NO_WS_RESP — must never appear there; they keep living
// in errorMessage, the raw technical row. Where DFO sent no code at all the field stays absent and
// the row honestly renders a dash.
//
// The guard is two-directional on purpose: half these tests prove a marker CANNOT get in, the other
// half prove a real code CANNOT be dropped.
import {
  submitDfoXml,
  parseDfoSoapResponse,
  failureDetailFor,
  SEND_TIMEOUT_ERROR_MESSAGE,
} from '../submitDfoXml';
import * as storage from '../dfoLogStorage';

jest.mock('../dfoLogStorage', () => ({
  saveTransmissionRecord: jest.fn(),
  saveXmlArchiveEntry: jest.fn(),
}));

const saveTransmissionRecord = storage.saveTransmissionRecord as jest.Mock;

const baseArgs = {
  soap: '<soap/>',
  xml: '<ELOG/>',
  fileName: '1004-104460-20260828000000.XML',
  recordId: 'FORM222-s148',
  logId: 'FORM222-s148',
};

const mockFetch = (status: number, body: string) => {
  (global as any).fetch = jest.fn().mockResolvedValue({ status, text: async () => body });
};

const mockFetchThrows = (err: Error) => {
  (global as any).fetch = jest.fn().mockRejectedValue(err);
};

const lastRecord = () =>
  saveTransmissionRecord.mock.calls[saveTransmissionRecord.mock.calls.length - 1][0];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('parseDfoSoapResponse — errCode carries DFO codes only', () => {
  it('P1: a real rejection puts the DFO code in errCode', () => {
    const r = parseDfoSoapResponse('<WS_RESP><ERR>WS1038</ERR></WS_RESP>');
    expect(r.success).toBe(false);
    expect(r.errCode).toBe('WS1038');
  });

  it('P2: WS0000 with no confirmation number RECOVERS WS0000 into errCode', () => {
    const r = parseDfoSoapResponse('<WS_RESP><ERR>WS0000</ERR><CONF>0</CONF></WS_RESP>');
    expect(r.success).toBe(false);
    expect(r.errCode).toBe('WS0000');      // DFO genuinely answered WS0000
    expect(r.errorCode).toBe('NO_CONF');   // our marker stays in its own field
  });

  it('P3: a SOAP fault leaves errCode absent — DFO sent no response code', () => {
    const r = parseDfoSoapResponse('<soap:Fault><faultstring>boom</faultstring></soap:Fault>');
    expect(r.errorCode).toBe('SOAP_FAULT');
    expect(r.errCode).toBeUndefined();
  });

  it('P4: no WS_RESP document leaves errCode absent', () => {
    const r = parseDfoSoapResponse('<html>gateway</html>');
    expect(r.errorCode).toBe('NO_WS_RESP');
    expect(r.errCode).toBeUndefined();
  });
});

describe('submitDfoXml — wsErrCode is written on a rejection', () => {
  it('W1: a DFO rejection stores the DFO code on the FAILURE record', async () => {
    mockFetch(200, '<WS_RESP><ERR>WS1038</ERR></WS_RESP>');
    await submitDfoXml(baseArgs);
    const record = lastRecord();
    expect(record.outcome).toBe('failure');
    expect(record.wsErrCode).toBe('WS1038');
  });

  it('W2: WS0000-with-no-confirmation stores WS0000, not the NO_CONF marker', async () => {
    mockFetch(200, '<WS_RESP><ERR>WS0000</ERR><CONF>0</CONF></WS_RESP>');
    await submitDfoXml(baseArgs);
    const record = lastRecord();
    expect(record.outcome).toBe('failure');
    expect(record.wsErrCode).toBe('WS0000');
  });
});

describe('submitDfoXml — no invented code ever reaches wsErrCode', () => {
  it('N1: an HTTP 4xx/5xx failure writes NO wsErrCode', async () => {
    mockFetch(500, 'Internal Server Error');
    await submitDfoXml(baseArgs);
    expect(lastRecord().wsErrCode).toBeUndefined();
  });

  it('N2: a network throw writes NO wsErrCode', async () => {
    mockFetchThrows(new TypeError('Network request failed'));
    await submitDfoXml(baseArgs);
    expect(lastRecord().wsErrCode).toBeUndefined();
  });

  it('N3: a timeout writes NO wsErrCode', async () => {
    const abort = new Error('Aborted');
    abort.name = 'AbortError';
    mockFetchThrows(abort);
    await submitDfoXml(baseArgs);
    expect(lastRecord().wsErrCode).toBeUndefined();
  });

  it('N4: SOAP_FAULT never reaches wsErrCode', async () => {
    mockFetch(200, '<soap:Fault><faultstring>boom</faultstring></soap:Fault>');
    await submitDfoXml(baseArgs);
    const record = lastRecord();
    expect(record.wsErrCode).toBeUndefined();
    expect(record.errorMessage).toContain('SOAP_FAULT'); // still visible in the raw technical row
  });

  it('N5: NO_WS_RESP never reaches wsErrCode', async () => {
    mockFetch(200, '<html>gateway</html>');
    await submitDfoXml(baseArgs);
    const record = lastRecord();
    expect(record.wsErrCode).toBeUndefined();
    expect(record.errorMessage).toContain('NO_WS_RESP');
  });

  it('N6: no stored wsErrCode is ever one of the three app markers', async () => {
    const markers = ['SOAP_FAULT', 'NO_CONF', 'NO_WS_RESP'];
    const responses = [
      '<soap:Fault><faultstring>boom</faultstring></soap:Fault>',
      '<WS_RESP><ERR>WS0000</ERR><CONF>0</CONF></WS_RESP>',
      '<html>gateway</html>',
      '<WS_RESP><ERR>WS1038</ERR></WS_RESP>',
    ];
    for (const body of responses) {
      mockFetch(200, body);
      await submitDfoXml(baseArgs);
      const code = lastRecord().wsErrCode;
      if (code !== undefined) expect(markers).not.toContain(code);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// S148 AMENDMENT (E2) — the raw technical sentence stored when a send throws.
//
// The row labelled "Error" / « Erreur » on the Transmission Result sheet is the evidence a boarding
// officer copies into his report. On a timed-out LOGBOOK send it used to hold the single word
// 'Aborted' — what the fetch polyfill throws (`new DOMException('Aborted','AbortError')`) — while
// the FORMS path stored the readable 'Request timed out' for the identical event. Two paths, one
// event, two different records.
//
// Both paths now call ONE helper, failureDetailFor, so the divergence cannot come back by editing
// a literal in one file and forgetting the other. The string stays RAW, ENGLISH and UNTRANSLATED:
// the harvester's words for a timeout are logs.sheetFailedTimeout, one row above it (R-E).
// ---------------------------------------------------------------------------------------------
describe('E2 — the stored timeout sentence', () => {
  const abortError = () => {
    const e = new Error('Aborted');
    e.name = 'AbortError';
    return e;
  };

  it('E2-1: a timeout stores "Request timed out", NOT the bare word "Aborted"', () => {
    const stored = failureDetailFor(abortError());
    expect(stored).toBe('Request timed out');
    expect(stored).not.toBe('Aborted');
  });

  it('E2-2: a non-timeout throw stores its own message unchanged — the timeout sentence must not leak', () => {
    expect(failureDetailFor(new TypeError('Network request failed'))).toBe('Network request failed');
    expect(failureDetailFor(new Error('something else broke'))).toBe('something else broke');
    expect(failureDetailFor(new TypeError('Network request failed'))).not.toBe(SEND_TIMEOUT_ERROR_MESSAGE);
  });

  it('E2-3: a non-timeout throw with NO message still falls back to "Unknown error", exactly as before', () => {
    // The fallback is `?? 'Unknown error'`, which is what BOTH paths carried at HEAD. `??` catches
    // null and undefined only. Pinned here so the amendment's "fallback shape preserved" is a
    // measured fact, not an assumption.
    expect(failureDetailFor({})).toBe('Unknown error');
    expect(failureDetailFor(undefined)).toBe('Unknown error');
    expect(failureDetailFor(null)).toBe('Unknown error');
  });

  it('E2-3b: an EMPTY message still passes through as an empty string — pre-existing, unchanged', () => {
    // Not a new behaviour and not fixed here: `new Error('')` has message '', and `'' ?? fallback`
    // is '', so the Error row would render blank. Verified identical at HEAD on BOTH paths, so this
    // fix neither introduces nor repairs it. Recorded in the gate doc as a finding, out of scope.
    expect(failureDetailFor(new Error(''))).toBe('');
  });

  it('E2-4: the logbook path and the forms path store the SAME string for a timeout', async () => {
    // Asserted against each other, never against a hardcoded literal, so the two cannot drift
    // apart again. The forms value is read from a real submitDfoXml run; the logbook value comes
    // from the same helper DfoLogsListScreen's catch block calls.
    mockFetchThrows(abortError());
    await submitDfoXml(baseArgs);
    const formsStored: string = lastRecord().errorMessage;
    const logbookStored: string = failureDetailFor(abortError());

    expect(logbookStored).toBe(formsStored);
    expect(formsStored).toBe(SEND_TIMEOUT_ERROR_MESSAGE);
    // byte-for-byte, not merely equal-looking
    expect(Buffer.from(logbookStored, 'utf8').toString('hex'))
      .toBe(Buffer.from(formsStored, 'utf8').toString('hex'));
  });

  it('E2-5: a timeout still writes no DFO response code (R-A holds — DFO answered nothing)', async () => {
    mockFetchThrows(abortError());
    await submitDfoXml(baseArgs);
    expect(lastRecord().wsErrCode).toBeUndefined();
    expect(lastRecord().errorMessage).toBe(SEND_TIMEOUT_ERROR_MESSAGE);
  });
});
