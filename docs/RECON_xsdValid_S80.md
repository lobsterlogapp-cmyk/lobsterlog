# RECON — transmission-register `xsdValid` wiring (Session 80)

Read-only investigation. No code changed. Goal: settle how `xsdValid` is
populated on LOGBOOK records (working reference) vs FORM 222/233 records
(currently blank — Mammals T9) before any build.

## VERDICT (one line)
Form 222/233 records show blank because both form screens COMPUTE validation
and use it only as a pre-submit guard, then OMIT `xsdValid` from the snapshot
passed to `submitDfoXml`; the logbook path threads `xsdValid: validation.valid`
onto its record, the forms do not. `submitDfoXml` already accepts the field.

## Every site (`grep -rn xsdValid src/`)
- src/utils/dfoLogStorage.ts:242 — type declaration on TransmissionRecord
- src/utils/submitDfoXml.ts:91,93,119 — snapshot param + undefined-safe write
- src/screens/DfoLogsListScreen.tsx:310 — logbook sets it (the reference)
- src/components/SentLogCard.tsx:105,106 — UI read (display)
Note: the UI read is in SentLogCard.tsx (SentLogDetailModal), NOT a
"FormSentCard.tsx"; and the logbook set is at :310, not the :181–234 range.

## 1. Type + default (dfoLogStorage.ts:242)
Inside `interface TransmissionRecord`:
  `xsdValid?: boolean;   // result of validateElogXml() run before the POST`
OPTIONAL, type boolean, NO default. When absent the record simply has no key.
Same block carries the §13.3.1 snapshot fields (vrn, tripNum) and a
`kind?: 'logbook' | 'form222' | 'form233'` discriminator.

## 2. LOGBOOK populate path (the reference) — DfoLogsListScreen.tsx
- :234  `const validation = validateElogXml(xml, log.subformId ?? 90);`
- :235  `if (!validation.valid) { ...alert...; return; }`   (hard guard)
- :299–313  success `record: TransmissionRecord = { ... }`
- :310  `xsdValid: validation.valid,`   ← value threaded directly onto record
- :315  `await saveTransmissionRecord(record);`
So the logbook records xsdValid inline on the success record. Because of the
:235 guard, in practice it is always `true` at the point it is written.

## 3. submitDfoXml — accepts, does NOT compute (submitDfoXml.ts)
- :81 `interface SubmitDfoXmlArgs` includes
  :93 `snapshot?: { vrn?: string; tripNum?: number; xsdValid?: boolean };`
- :114–120 builds `snapshotFields`, undefined-safe:
  :119 `...(snapshot?.xsdValid !== undefined && { xsdValid: snapshot.xsdValid }),`
- snapshotFields is spread onto BOTH the failure record (buildFailureRecord,
  :126/165/176/201) and the success record (:181–195).
The helper NEVER computes validation itself. `xsdValid` appears on a form
record ONLY if the caller puts it in `snapshot`. If omitted → key absent.

## 4. FORM callers — both omit xsdValid
Form222Screen.tsx:
- :188 `const validation = validateForm222Xml(xml);`
- :189–196 `if (!validation.valid) { Alert(...); return; }`  (guard only)
- :199 `await submitDfoXml({ ... :206 snapshot: { vrn: profile.vesselNumber } })`
Form233Screen.tsx:
- :92  `const validation = validateForm233Xml(xml);`
- :93–100 `if (!validation.valid) { Alert(...); return; }`  (guard only)
- :103 `await submitDfoXml({ ... :110 snapshot: { vrn: profile.vesselNumber } })`
Both screens compute `validation` and consume it purely as a hard pre-submit
guard, then pass a snapshot containing ONLY `vrn`. `validation.valid` is never
forwarded → form TransmissionRecords carry no `xsdValid` → blank.

## 5. THE KEY FORK — runtime validators DO exist
Callable in-app validators are present (not offline-only):
- src/utils/dfoForm222Generator.ts:201 `export function validateForm222Xml(...)`
- src/utils/dfoForm233Generator.ts:111 `export function validateForm233Xml(xml)`
Both are name-based heuristic checks. Header comments state xmllint against the
on-disk XSD "remains the authority" (222Gen:200, 233Gen:109–111). So: an
in-app validation function exists and is ALREADY being called by both form
screens — the gap is purely that its result is dropped, not that validation is
unavailable. (For logbook, validateElogXml in dfoXmlGenerator.ts is subform-
aware via `subformId` 88/89/90/91; it targets 234, not 222/233.)

## 6. UI read — SentLogCard.tsx (SentLogDetailModal)
- :104–107
  `const xsdLabel = record?.xsdValid === true  ? t('logs.detailXsdPass')`
  `               : record?.xsdValid === false ? t('logs.detailXsdFail')`
  `               : t('logs.detailXsdUnknown');`
Strict triple-equals on a boolean. With the key absent (forms), neither
true nor false matches → falls through to `detailXsdUnknown` (the blank/Unknown
state observed on 222/233).

## Single-line fix shape (for the build, NOT done here)
Add `xsdValid: validation.valid` to the `snapshot` object in each form screen's
`submitDfoXml({ ... })` call (Form222Screen.tsx:206, Form233Screen.tsx:110).
`submitDfoXml` already threads it onto success + failure records; no change
needed there, in the type, or in the card. Given the :189/:93 guards, the value
written would always be `true` at submit time — same behaviour as the logbook.
