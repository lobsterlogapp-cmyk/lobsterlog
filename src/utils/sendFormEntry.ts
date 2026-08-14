// S125 7b — UI-free send helpers for Forms 222 / 233.
//
// Extracted from Form222Screen/Form233Screen's handleSubmit so a CLOSED-unsent entry can be sent
// from its list card (7b moves Send off the form and onto the card). Mirrors the screen send path
// exactly — generate → validate → envelope → submitDfoXml → on ok flip sentToDfo + save + backup —
// minus the React Alerts/spinner, which the caller (the list card) owns. Same "helper, no UI"
// precedent as submitDfoXml.ts. submitDfoXml owns the transmission register on BOTH success and
// failure, so a failed send leaves the closed-unsent entry exactly as it was.

import { CaptainProfile } from './captainStorage';
import { generateUniqueDfoXmlFileName } from './dfoXmlGenerator';
import { loadTransmissionRegister } from './dfoLogStorage';
import { submitDfoXml, SubmitDfoXmlResult } from './submitDfoXml';
import { triggerBackup } from './dfoBackup';
import {
  Form222Entry, generateForm222Xml, validateForm222Xml, generateSoap222Envelope, saveForm222Entry,
} from './dfoForm222Generator';
import {
  Form233Entry, generateForm233Xml, validateForm233Xml, generateSoap233Envelope, saveForm233Entry,
} from './dfoForm233Generator';

export interface SendFormResult extends SubmitDfoXmlResult {
  // Non-empty → blocked BEFORE any POST because the generated XML failed the in-app validator.
  // (ok is false in that case; no transmission record is written.)
  validationErrors?: string[];
}

export async function sendForm222Entry(
  entry: Form222Entry,
  profile: CaptainProfile,
): Promise<SendFormResult> {
  const xml = generateForm222Xml(entry, profile);
  const validation = validateForm222Xml(xml);
  if (!validation.valid) return { ok: false, validationErrors: validation.errors };

  // S128 Phase 3: collision-free file name — never reuse a name in this account's register.
  const usedNames = (await loadTransmissionRegister()).map(r => r.fileName).filter(Boolean) as string[];
  const fileName = generateUniqueDfoXmlFileName(profile.regId ?? 1004, profile.fishingNumber, usedNames);
  const result = await submitDfoXml({
    soap: generateSoap222Envelope(xml, profile.elogKey, fileName),
    xml,
    fileName,
    recordId: `FORM222-${entry.uid}`,
    logId: `FORM222-${entry.uid}`,
    kind: 'form222',
    snapshot: { vrn: profile.vesselNumber, xsdValid: validation.valid },
  });
  if (result.ok) {
    // Upsert by uid: the closed-unsent row becomes the sent row (status stays 'complete',
    // closeDt preserved). The list's closed bucket then excludes it (sentToDfo true) and it
    // renders from the transmission register via FormSentCard.
    await saveForm222Entry({ ...entry, sentToDfo: true, sentAt: Date.now() });
    triggerBackup(); // best-effort cloud backup; fire-and-forget, never blocks
  }
  return result;
}

export async function sendForm233Entry(
  entry: Form233Entry,
  profile: CaptainProfile,
): Promise<SendFormResult> {
  const xml = generateForm233Xml(entry, profile);
  const validation = validateForm233Xml(xml);
  if (!validation.valid) return { ok: false, validationErrors: validation.errors };

  // S128 Phase 3: collision-free file name — never reuse a name in this account's register.
  const usedNames = (await loadTransmissionRegister()).map(r => r.fileName).filter(Boolean) as string[];
  const fileName = generateUniqueDfoXmlFileName(profile.regId ?? 1004, profile.fishingNumber, usedNames);
  const result = await submitDfoXml({
    soap: generateSoap233Envelope(xml, profile.elogKey, fileName),
    xml,
    fileName,
    recordId: `FORM233-${entry.uid}`,
    logId: `FORM233-${entry.uid}`,
    kind: 'form233',
    snapshot: { vrn: profile.vesselNumber, xsdValid: validation.valid },
  });
  if (result.ok) {
    await saveForm233Entry({ ...entry, sentToDfo: true, sentAt: Date.now() });
    triggerBackup();
  }
  return result;
}
