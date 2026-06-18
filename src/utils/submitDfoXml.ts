// Shared, UI-free DFO transmission helper.
//
// submitDfoXml() owns the transport + response-parse + transmission-register write that
// the logbook doSubmit() proved against UAT, so the Form 222 / Form 233 screens can reuse
// the SAME pipeline instead of faking the send. It is deliberately store-agnostic: it does
// NOT touch the Form222/Form233/DfoLog entry stores and does NOT call markSentToDfo — the
// caller owns its own entry persistence. It only writes the §13.3.1 TransmissionRecord (on
// success AND every failure path) and, on success, the XML archive entry.
import {
  saveTransmissionRecord,
  saveXmlArchiveEntry,
  TransmissionRecord,
} from './dfoLogStorage';
import { DFO_UAT_ENDPOINT, DFO_SOAP_ACTION_SAVE } from './dfoXmlGenerator';

// Mirror of the logbook doSubmit timeout (DfoLogsListScreen's SEND_TIMEOUT_MS). Kept local
// here on purpose — the two copies are deduped in the later logbook-convergence follow-up.
const SEND_TIMEOUT_MS = 30000;

// Response contract — ELOG_Web_Service_3_6_Eng.pdf §3.1.3: the SaveIncomingFile result is
// a WS_RESP XML document (usually XML-escaped inside <SaveIncomingFileResult> in the SOAP
// response). <ERR> = WS0000 means success; any other code is a failure (messages in the
// Web Service Technical Guide). A missing response or null/0 <CONF> is also a failure.
// On success: <VRN>, <FIN>, and one <LGBK_UID> per logbook (Form 233: <REPORT_UID> instead).
export function parseDfoSoapResponse(text: string): {
  success: boolean;
  conf?: string;
  errCode?: string;       // parsed WS_RESP <ERR> on success (e.g. 'WS0000') — register snapshot
  errorCode?: string;
  errorMessage?: string;
  lgbkUids?: string[];
  reportUids?: string[];
} {
  // Transport-level SOAP fault from the .asmx service
  if (/<(soap:)?Fault[\s>]/i.test(text)) {
    const msg = text.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i)?.[1]?.trim();
    return { success: false, errorCode: 'SOAP_FAULT', errorMessage: msg ?? 'SOAP fault' };
  }

  // The WS_RESP document arrives XML-escaped inside the SOAP result element — unescape once
  let body = text;
  if (!/<WS_RESP>/i.test(body) && /&lt;WS_RESP&gt;/i.test(body)) {
    body = body
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }

  const grab = (el: string) =>
    body.match(new RegExp(`<${el}\\s*>\\s*([^<]*)<\\/\\s*${el}\\s*>`, 'i'))?.[1]?.trim();
  const grabAll = (el: string) =>
    [...body.matchAll(new RegExp(`<${el}\\s*>\\s*([^<]*)<\\/\\s*${el}\\s*>`, 'gi'))]
      .map(m => m[1].trim())
      .filter(Boolean);

  const conf = grab('CONF');
  const err = grab('ERR');

  if (err === 'WS0000') {
    if (!conf || conf === '0') {
      return { success: false, conf, errorCode: 'NO_CONF', errorMessage: 'WS0000 but confirmation number missing — treat as failed and retry' };
    }
    return { success: true, conf, errCode: err, lgbkUids: grabAll('LGBK_UID'), reportUids: grabAll('REPORT_UID') };
  }
  if (err) {
    return { success: false, conf, errorCode: err, errorMessage: `DFO Web Service error ${err}` };
  }
  // No WS_RESP at all — per §3.1.3 the transmission must be considered failed
  return { success: false, errorCode: 'NO_WS_RESP', errorMessage: 'No WS_RESP document in response' };
}

export interface SubmitDfoXmlArgs {
  soap: string;       // full SOAP envelope to POST (built by the caller's generateSoapXxxEnvelope)
  xml: string;        // the generated XML (archived on success, snapshotted on every record)
  fileName: string;   // [RegionalID]-[LicenceNumber]-[UTC].XML (Standard v6.1 §3.10)
  recordId: string;   // TransmissionRecord.id — FORM222-/FORM233- prefix + uid
  logId: string;      // TransmissionRecord.logId + XML archive key — same prefixed id
  endpoint?: string;
  actionHeader?: string;
  // §13.3.1 register snapshot fields captured at send. Threaded onto BOTH the success and
  // failure records, undefined-safe. The logbook will pass its own vrn/tripNum/xsdValid here
  // when it converges onto this helper. (tripNum is number to match TransmissionRecord.)
  snapshot?: { vrn?: string; tripNum?: number; xsdValid?: boolean };
}

export interface SubmitDfoXmlResult {
  ok: boolean;
  errCode?: string;       // WS_RESP <ERR> — set on success (WS0000) and on a parsed DFO error
  confNumber?: string;    // <CONF> on success
  errorMessage?: string;  // human-readable failure detail
  httpStatus?: number;
}

export async function submitDfoXml({
  soap,
  xml,
  fileName,
  recordId,
  logId,
  endpoint = DFO_UAT_ENDPOINT,
  actionHeader = DFO_SOAP_ACTION_SAVE,
  snapshot,
}: SubmitDfoXmlArgs): Promise<SubmitDfoXmlResult> {
  // §13.3.1 snapshot fields, undefined-safe — spread onto both success and failure records.
  const snapshotFields = {
    ...(snapshot?.vrn && { vrn: snapshot.vrn }),
    ...(snapshot?.tripNum !== undefined && { tripNum: snapshot.tripNum }),
    ...(snapshot?.xsdValid !== undefined && { xsdValid: snapshot.xsdValid }),
  };

  // Built ONCE, persisted on every failure path — mirrors doSubmit's saveFailureRecord closure.
  const buildFailureRecord = (
    httpStatus: number | undefined,
    errorMessage: string,
  ): TransmissionRecord => ({
    id: recordId,
    logId,
    attemptedAt: Date.now(),
    outcome: 'failure',
    ...(httpStatus !== undefined && { httpStatus }),
    errorMessage,
    ...(fileName && { fileName }),
    ...snapshotFields,
    xmlSnapshot: xml,
    soapSnapshot: soap,
  });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    let httpStatus = 0;
    let responseBody = '';
    try {
      // ⚠️ LIVE TRANSMISSION — really POSTs to DFO's web service (UAT endpoint by default).
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': `"${actionHeader}"`,
        },
        body: soap,
        signal: controller.signal,
      });
      httpStatus = response.status;
      responseBody = await response.text();
    } finally {
      clearTimeout(timer);
    }

    // HTTP 4xx / 5xx
    if (httpStatus >= 400) {
      const errorMessage = `HTTP ${httpStatus}`;
      await saveTransmissionRecord(buildFailureRecord(httpStatus, errorMessage));
      return { ok: false, httpStatus, errorMessage };
    }

    // HTTP 200 — parse the DFO application response
    const result = parseDfoSoapResponse(responseBody);
    if (!result.success) {
      const errorMessage = [
        result.errorCode && `Error ${result.errorCode}`,
        result.errorMessage,
      ].filter(Boolean).join(': ');
      await saveTransmissionRecord(buildFailureRecord(httpStatus, errorMessage));
      return { ok: false, httpStatus, errCode: result.errorCode, errorMessage };
    }

    // Success
    const successRecord: TransmissionRecord = {
      id: recordId,
      logId,
      attemptedAt: Date.now(),
      outcome: 'success',
      httpStatus,
      fileName,
      ...(result.conf && { confNumber: result.conf }),
      ...(result.errCode && { wsErrCode: result.errCode }),
      ...snapshotFields,
      xmlSnapshot: xml,
      soapSnapshot: soap,
    };
    await saveTransmissionRecord(successRecord);
    await saveXmlArchiveEntry({ logId, savedAt: Date.now(), xml });
    return { ok: true, httpStatus, errCode: result.errCode, confNumber: result.conf };
  } catch (e: any) {
    const isTimeout = e?.name === 'AbortError';
    const errorMessage: string = isTimeout ? 'Request timed out' : (e?.message ?? 'Unknown error');
    await saveTransmissionRecord(buildFailureRecord(undefined, errorMessage));
    return { ok: false, errorMessage };
  }
}
