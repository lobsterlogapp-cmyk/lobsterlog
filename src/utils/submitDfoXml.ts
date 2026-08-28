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
  SendFailureKind,
} from './dfoLogStorage';
import { DFO_UAT_ENDPOINT, DFO_SOAP_ACTION_SAVE } from './dfoXmlGenerator';

// Rule 528 (DFO) — on the Form 222 and Form 233 paths the VRN (GENERAL_INFO.Vrn) must be
// digits only, 4 to 6 digits. Source: FS-NAT-222-1-EN.pdf and FS-NAT-233-2-EN.pdf. This is
// FORM-ONLY: Rule 528 is ABSENT from the 234 logbook package, whose VRN is the broader
// string_12 (validated by isValidVrn in CaptainProfileScreen). Enforced as a hard send-time
// block in both form screens; deliberately NOT applied to the logbook send path.
export const isValidFormVrn = (s: string): boolean => /^\d{4,6}$/.test(s);

// Mirror of the logbook doSubmit timeout (DfoLogsListScreen's SEND_TIMEOUT_MS). Kept local
// here on purpose — the two copies are deduped in the later logbook-convergence follow-up.
const SEND_TIMEOUT_MS = 30000;

// S148 E2 — the raw technical sentence stored in TransmissionRecord.errorMessage when a send
// throws. That field is the sheet's "Error" / « Erreur » row: the evidence a boarding officer
// copies into his report. It stays RAW, COMPLETE and ENGLISH and is never translated (R-E) — the
// harvester's own words for a timeout are logs.sheetFailedTimeout, which sits ABOVE this row in
// both languages. Two rows, two readers, one event.
export const SEND_TIMEOUT_ERROR_MESSAGE = 'Request timed out';

// Both send paths — the logbook's doSubmit and this helper — call THIS, so they cannot store
// different sentences for the same event again. Before S148 they did: the logbook stored bare
// `e.message`, which on our own AbortController abort is the single word 'Aborted' (the polyfill
// throws `new DOMException('Aborted', 'AbortError')`), while this path already stored the readable
// sentence. One word that does not say what happened is not evidence.
export const failureDetailFor = (e: any): string =>
  e?.name === 'AbortError' ? SEND_TIMEOUT_ERROR_MESSAGE : (e?.message ?? 'Unknown error');

// Response contract — ELOG_Web_Service_3_6_Eng.pdf §3.1.3: the SaveIncomingFile result is
// a WS_RESP XML document (usually XML-escaped inside <SaveIncomingFileResult> in the SOAP
// response). <ERR> = WS0000 means success; any other code is a failure (messages in the
// Web Service Technical Guide). A missing response or null/0 <CONF> is also a failure.
// On success: <VRN>, <FIN>, and one <LGBK_UID> per logbook (Form 233: <REPORT_UID> instead).
export function parseDfoSoapResponse(text: string): {
  success: boolean;
  conf?: string;
  // S148 R-A: errCode is THE CODE DFO ACTUALLY SENT, and nothing else. It is set on every branch
  // where a <ERR> element was really read out of DFO's WS_RESP — success (WS0000), the
  // WS0000-with-no-confirmation branch (still WS0000: DFO genuinely answered it), and a real
  // rejection (WS1038 and family). It is deliberately ABSENT when DFO sent no code at all (SOAP
  // fault, no WS_RESP). This is the ONLY field allowed to reach TransmissionRecord.wsErrCode,
  // which the Transmission Result sheet labels "DFO response code" / « Code de réponse du MPO »
  // in a §13.3.1 record a boarding officer reads — a code we invented would be a false statement
  // there. The app's own markers live in errorCode below, never here.
  errCode?: string;
  // Our own classification of the failure, NOT necessarily a DFO code. Carries the real code on a
  // genuine rejection, but also the three app-invented markers SOAP_FAULT / NO_CONF / NO_WS_RESP.
  // MUST NOT be written to wsErrCode.
  errorCode?: string;
  // S148 R-D: which of the ruled failure conditions this is, as a language-neutral marker. The
  // classification lives HERE, in the one place that reads DFO's answer, so both send paths
  // (logbook doSubmit and submitDfoXml) cannot drift apart on it.
  failureKind?: SendFailureKind;
  errorMessage?: string;
  lgbkUids?: string[];
  reportUids?: string[];
} {
  // Transport-level SOAP fault from the .asmx service
  if (/<(soap:)?Fault[\s>]/i.test(text)) {
    const msg = text.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i)?.[1]?.trim();
    return { success: false, errorCode: 'SOAP_FAULT', failureKind: 'unclear', errorMessage: msg ?? 'SOAP fault' };
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
      // S148 R-A: DFO really did answer WS0000 here — recover it. The old code discarded the real
      // code and kept only our NO_CONF marker, which is why every stored failure record shows an
      // empty "DFO response code" row.
      return { success: false, conf, errCode: err, errorCode: 'NO_CONF', failureKind: 'unclear', errorMessage: 'WS0000 but confirmation number missing — treat as failed and retry' };
    }
    return { success: true, conf, errCode: err, lgbkUids: grabAll('LGBK_UID'), reportUids: grabAll('REPORT_UID') };
  }
  if (err) {
    // A real rejection: DFO sent this code, so it is safe for the "DFO response code" row.
    return { success: false, conf, errCode: err, errorCode: err, failureKind: 'refused', errorMessage: `DFO Web Service error ${err}` };
  }
  // No WS_RESP at all — per §3.1.3 the transmission must be considered failed
  return { success: false, errorCode: 'NO_WS_RESP', failureKind: 'unclear', errorMessage: 'No WS_RESP document in response' };
}

export interface SubmitDfoXmlArgs {
  soap: string;       // full SOAP envelope to POST (built by the caller's generateSoapXxxEnvelope)
  xml: string;        // the generated XML (archived on success, snapshotted on every record)
  fileName: string;   // [RegionalID]-[LicenceNumber]-[UTC].XML (Standard v6.1 §3.10)
  recordId: string;   // TransmissionRecord.id — FORM222-/FORM233- prefix + uid
  logId: string;      // TransmissionRecord.logId + XML archive key — same prefixed id
  endpoint?: string;
  actionHeader?: string;
  kind?: 'logbook' | 'form222' | 'form233';
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
  // S148 E3/R-D: the same language-neutral marker that goes onto the stored record, handed BACK to
  // the caller. The Form 222/233 failure popup decides its wording from this returned value and
  // never reads the register, so without it the screen cannot tell a 30-second timeout from a
  // no-signal throw. Absent on success.
  failureKind?: SendFailureKind;
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
  kind,
}: SubmitDfoXmlArgs): Promise<SubmitDfoXmlResult> {
  // §13.3.1 snapshot fields, undefined-safe — spread onto both success and failure records.
  const snapshotFields = {
    ...(snapshot?.vrn && { vrn: snapshot.vrn }),
    ...(snapshot?.tripNum !== undefined && { tripNum: snapshot.tripNum }),
    ...(snapshot?.xsdValid !== undefined && { xsdValid: snapshot.xsdValid }),
  };

  // Built ONCE, persisted on every failure path — mirrors doSubmit's saveFailureRecord closure.
  // S148 defect 87 / R-A: wsErrCode is written ONLY when DFO actually sent a code. The two callers
  // with no DFO code (HTTP 4xx/5xx, and the timeout/network catch) pass nothing and the field stays
  // absent, so the sheet's "DFO response code" row honestly renders a dash instead of a code the
  // app made up.
  const buildFailureRecord = (
    httpStatus: number | undefined,
    errorMessage: string,
    failureKind: SendFailureKind,
    wsErrCode?: string,
  ): TransmissionRecord => ({
    id: recordId,
    logId,
    attemptedAt: Date.now(),
    outcome: 'failure',
    ...(httpStatus !== undefined && { httpStatus }),
    errorMessage,
    failureKind,
    ...(wsErrCode && { wsErrCode }),
    ...(fileName && { fileName }),
    ...snapshotFields,
    ...(kind && { kind }),
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
      // R-D condition 1. Shares 'unclear' with condition 3 by ruling: the harvester's next move is
      // the same either way, and the HTTP number itself still shows in the raw technical row.
      await saveTransmissionRecord(buildFailureRecord(httpStatus, errorMessage, 'unclear'));
      return { ok: false, httpStatus, errorMessage, failureKind: 'unclear' };
    }

    // HTTP 200 — parse the DFO application response
    const result = parseDfoSoapResponse(responseBody);
    if (!result.success) {
      const errorMessage = [
        result.errorCode && `Error ${result.errorCode}`,
        result.errorMessage,
      ].filter(Boolean).join(': ');
      // result.errCode — DFO's own code only (R-A). result.errorCode may be an app marker and is
      // deliberately NOT passed here; it keeps living in errorMessage, the raw technical row.
      const failureKind = result.failureKind ?? 'unclear';
      await saveTransmissionRecord(buildFailureRecord(httpStatus, errorMessage, failureKind, result.errCode));
      return { ok: false, httpStatus, errCode: result.errorCode, errorMessage, failureKind };
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
      ...(kind && { kind }),
      xmlSnapshot: xml,
      soapSnapshot: soap,
    };
    await saveTransmissionRecord(successRecord);
    await saveXmlArchiveEntry({ logId, savedAt: Date.now(), xml });
    return { ok: true, httpStatus, errCode: result.errCode, confNumber: result.conf };
  } catch (e: any) {
    const isTimeout = e?.name === 'AbortError';
    const errorMessage: string = failureDetailFor(e);
    // R-D conditions 4 and 5. No DFO code exists on either path, so none is written (R-A).
    const failureKind: SendFailureKind = isTimeout ? 'timeout' : 'notSent';
    await saveTransmissionRecord(buildFailureRecord(undefined, errorMessage, failureKind));
    return { ok: false, errorMessage, failureKind };
  }
}
