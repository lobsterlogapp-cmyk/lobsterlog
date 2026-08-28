// S148 Phase 2 guard — the language-neutral failure marker (ruling R-F, mapping R-D).
//
// R-F: never store a translated sentence. A stored sentence is frozen in whatever language it was
// written in for the three years the record is retained — there are already 18 records on disk
// proving it. So the record stores a marker and the SCREEN translates it, which is also what makes
// a mid-session language change re-render correctly.
//
// R-D maps the five ways a send can fail onto four markers. Conditions 1 (HTTP 4xx/5xx) and 3
// (SOAP_FAULT / NO_CONF / NO_WS_RESP) deliberately SHARE 'unclear'.
//
// The marker must land in two places, and this guard checks both: on the stored TransmissionRecord
// (which the badge and the sheet read) AND on the value submitDfoXml RETURNS (which the Form
// 222/233 failure popup reads instead of the register — see PROMPT ERRORS E3).
import { submitDfoXml } from '../submitDfoXml';
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
  recordId: 'FORM233-s148',
  logId: 'FORM233-s148',
};

const mockFetch = (status: number, body: string) => {
  (global as any).fetch = jest.fn().mockResolvedValue({ status, text: async () => body });
};
const mockFetchThrows = (err: Error) => {
  (global as any).fetch = jest.fn().mockRejectedValue(err);
};
const abortError = () => {
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
};

const lastRecord = () =>
  saveTransmissionRecord.mock.calls[saveTransmissionRecord.mock.calls.length - 1][0];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the five R-D conditions each store their ruled marker', () => {
  it('K1 — condition 1, HTTP 4xx/5xx → unclear', async () => {
    mockFetch(500, 'Internal Server Error');
    const r = await submitDfoXml(baseArgs);
    expect(lastRecord().failureKind).toBe('unclear');
    expect(r.failureKind).toBe('unclear');
  });

  it('K2 — condition 2, a real DFO rejection → refused', async () => {
    mockFetch(200, '<WS_RESP><ERR>WS1038</ERR></WS_RESP>');
    const r = await submitDfoXml(baseArgs);
    expect(lastRecord().failureKind).toBe('refused');
    expect(r.failureKind).toBe('refused');
  });

  it('K3a — condition 3, SOAP_FAULT → unclear', async () => {
    mockFetch(200, '<soap:Fault><faultstring>boom</faultstring></soap:Fault>');
    const r = await submitDfoXml(baseArgs);
    expect(lastRecord().failureKind).toBe('unclear');
    expect(r.failureKind).toBe('unclear');
  });

  it('K3b — condition 3, NO_CONF → unclear', async () => {
    mockFetch(200, '<WS_RESP><ERR>WS0000</ERR><CONF>0</CONF></WS_RESP>');
    const r = await submitDfoXml(baseArgs);
    expect(lastRecord().failureKind).toBe('unclear');
    expect(r.failureKind).toBe('unclear');
  });

  it('K3c — condition 3, NO_WS_RESP → unclear', async () => {
    mockFetch(200, '<html>gateway</html>');
    const r = await submitDfoXml(baseArgs);
    expect(lastRecord().failureKind).toBe('unclear');
    expect(r.failureKind).toBe('unclear');
  });

  it('K4 — condition 4, our 30-second AbortController → timeout', async () => {
    mockFetchThrows(abortError());
    const r = await submitDfoXml(baseArgs);
    expect(lastRecord().failureKind).toBe('timeout');
    expect(r.failureKind).toBe('timeout');
  });

  it('K5 — condition 5, network throw → notSent', async () => {
    mockFetchThrows(new TypeError('Network request failed'));
    const r = await submitDfoXml(baseArgs);
    expect(lastRecord().failureKind).toBe('notSent');
    expect(r.failureKind).toBe('notSent');
  });
});

describe('R-D1 — refused and notSent must stay distinguishable end to end', () => {
  it('K6 — a rejection and a no-signal failure never carry the same marker', async () => {
    mockFetch(200, '<WS_RESP><ERR>WS1038</ERR></WS_RESP>');
    await submitDfoXml(baseArgs);
    const refused = lastRecord().failureKind;

    mockFetchThrows(new TypeError('Network request failed'));
    await submitDfoXml(baseArgs);
    const notSent = lastRecord().failureKind;

    expect(refused).toBe('refused');
    expect(notSent).toBe('notSent');
    expect(refused).not.toBe(notSent);
  });
});

describe('R-F — the marker is a marker, never a sentence', () => {
  it('K7 — every stored marker is one of the four ruled values, and no marker is prose', async () => {
    const allowed = ['refused', 'unclear', 'timeout', 'notSent'];
    const cases: Array<() => void> = [
      () => mockFetch(500, 'Internal Server Error'),
      () => mockFetch(200, '<WS_RESP><ERR>WS1038</ERR></WS_RESP>'),
      () => mockFetch(200, '<soap:Fault><faultstring>boom</faultstring></soap:Fault>'),
      () => mockFetch(200, '<WS_RESP><ERR>WS0000</ERR><CONF>0</CONF></WS_RESP>'),
      () => mockFetch(200, '<html>gateway</html>'),
      () => mockFetchThrows(abortError()),
      () => mockFetchThrows(new TypeError('Network request failed')),
    ];
    for (const setup of cases) {
      setup();
      await submitDfoXml(baseArgs);
      const kind = lastRecord().failureKind;
      expect(allowed).toContain(kind);
      expect(kind).not.toMatch(/\s/); // a sentence would contain a space
    }
  });

  it('K8 — a success record carries no marker at all', async () => {
    mockFetch(200, '<WS_RESP><ERR>WS0000</ERR><CONF>163900</CONF></WS_RESP>');
    const r = await submitDfoXml(baseArgs);
    expect(r.ok).toBe(true);
    expect(lastRecord().outcome).toBe('success');
    expect(lastRecord().failureKind).toBeUndefined();
    expect(r.failureKind).toBeUndefined();
  });
});
