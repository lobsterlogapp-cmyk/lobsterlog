# RECON — give Form 222/233 sent-cards the "Transmission Result" detail modal (Session 80)

Read-only investigation. No code changed (the report file itself is the deliverable).
Goal: map what exists before wiring the form register cards to the same detail modal the
logbook sent-cards open.

## VERDICT (one line)
The modal (`SentLogDetailModal`) is reusable and ALREADY reads only `record.*` for 8 of its
9 data rows — BUT it hard-requires a backing `DfoLog` (`!log` guard + the header's log.id /
log.dateFished + the Trip row's `log.tripNum` fallback). Form records have NO DfoLog, so the
build's real work is making the modal render from a record alone (logless), plus giving
`FormSentCard` a tap handler (it has none today).

## 1. The modal component
- `SentLogDetailModal` — an EXPORTED standalone component in
  `src/components/SentLogCard.tsx:101` (same file as `SentLogCard`, but a separate export;
  NOT inlined into the card). Props: `{ visible, log?, record?, onClose }` (`SentLogDetailModalProps`, :94).
- Rendered ONCE in `src/screens/DfoLogsListScreen.tsx:766` (single instance at screen bottom),
  imported at :19. Title "Transmission Result" comes from `t('logs.detailTitle')` (en/dfo.json:251).

## 2. Per-row field mapping (modal body, SentLogCard.tsx:120–143)
Render guard (:120): `{!log || !record ? <detailNoRecord> : ...}` — BOTH log AND record required.
Header (:124–129): `log.id` + `log.dateFished` + `OutcomeBadge(record.outcome)`.
Data rows (DetailRow):
- Trip (`regTripLabel`)        ← `record.tripNum ?? log.tripNum` (:103,133)  [LOGBOOK-ONLY*]
- Vessel (`regVesselLabel`)    ← `record.vrn`                                 [all records]
- Confirmation # (`regConfLabel`) ← `record.confNumber`                       [all, success]
- Sent (`regSentLabel`)        ← `record.attemptedAt`                         [all records]
- Error (`detailErr`, failure-only) ← `record.errorMessage`                   [all, failure]
- XSD validation (`detailXsd`) ← `record.xsdValid` (true/false/undef ternary) [all — forms now S80]
- DFO response code (`detailWsCode`) ← `record.wsErrCode`                     [all records]
- File name (`detailFileName`) ← `record.fileName`                           [all records]
- HTTP status (`detailHttp`)   ← `record.httpStatus`                         [all records]
*Trip: no `record.tripNum` on forms AND no `log` → would render "—". Plus the header (log.id/
log.dateFished) and the `!log` guard are the only genuinely logbook-coupled pieces.

## 3. How the logbook card opens it
- `SentLogCard` (SentLogCard.tsx:70) root is a `<TouchableOpacity onPress={onPress} ...>` (:75)
  — `onPress` is a required prop (`SentLogCardProps`, :64–68).
- `DfoLogsListScreen` holds `detailLog` + `detailRecord` state (:138–139). Sent rows pass
  `onPress={() => { setDetailLog(row.log); setDetailRecord(row.rec); }}` (:662; a simpler
  `setDetailLog(row.log)` variant at :639). The single `SentLogDetailModal` (:766) then renders
  with `visible` derived from detailLog, `record={detailRecord ?? successRecords[detailLog.id]}`,
  and `onClose` clearing both (:770). So a tap just sets the log/record state → the one modal opens.

## 4. Does FormSentCard have a tap handler?
NO. `FormSentCard` (`src/components/FormSentCard.tsx:50`) root is a STATIC `<View style={styles.card}>`
(:61) — no `TouchableOpacity`, no `onPress`, no `Modal`. Its props are `{ record: TransmissionRecord }`
ONLY (`FormSentCardProps`, :46–48) — there is not even an `onPress` prop to wire. It renders
title (from `transmissionKind(record)`), date, `OutcomeBadge`, and Fields for `record.vrn`,
`record.confNumber` / `record.errorMessage|wsErrCode` (failure), and Sent. Purely presentational.

## 5. Which modal fields a form record HAS vs LACKS
Form record built in `submitDfoXml.ts` — success at :181–195 (failure record mirrors the same
shape via buildFailureRecord). A form222/form233 record carries:
- id (FORM222-/FORM233- prefixed), logId, attemptedAt → Sent ✓
- outcome, httpStatus ✓, fileName ✓
- confNumber (on success, result.conf) ✓
- wsErrCode → DFO response code (result.errCode) ✓
- snapshotFields = vrn ✓ + xsdValid ✓ (NOW set, S80) — but NOT tripNum (forms pass only
  `snapshot:{vrn, xsdValid}`)
- kind ('form222'|'form233') ✓, xmlSnapshot/soapSnapshot ✓
- errorMessage (failure path) ✓
LACKS: `tripNum` (→ Trip row would show "—"), and there is NO backing `DfoLog` at all, so
`log.id` / `log.dateFished` (header) and the `log.tripNum` fallback are unavailable.

## Build implication (NOT done here — recon only)
To reuse the modal for forms, the modal must tolerate a record-only / logless open:
(a) relax the `!log` guard to `!record`; (b) source the header from the record (e.g.
`transmissionKind(record)` + `formatSentDate(record.attemptedAt)`, or record.id) when `log` is
absent; (c) hide or "—" the Trip row for forms. Then `FormSentCard` needs an `onPress` prop and
`DfoLogsListScreen` must wire the form rows to set `detailRecord` (with `detailLog` left null) —
or a small parallel form-detail modal. Everything else (Vessel/Conf/Sent/Error/XSD/response
code/File name/HTTP) already maps to fields a form record has.
