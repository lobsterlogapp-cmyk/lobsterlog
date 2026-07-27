# GATE S116-P1 — 233 `LOGBOOK_UID_REFERED` BUILD

**Session date 2026-07-27 (plan label S116 Phase 1). NO-GIT (commit block at the bottom — Jonny runs). NO DFO POST. Untouched by rule: Comments box, section-note button, VRN send gate, Form 222, the 234.**
Spec authority: `docs/RECON_S116_LOGBOOK_UID_REFERED.md` (XSD :360 slot, string_6, Rule 953, CSV labels).

---

## §0 — PART A RECON (report-only; nothing changed)

### A1 — When a 234 log gets its `lgbkUid`

**At log creation.** `generateNewLogMeta()` returns `lgbkUid: generateLgbkUid()` (`src/utils/dfoLogStorage.ts:174`; helper imported from `./dfoUids`, `dfoLogStorage.ts:2`). FullDfoForm calls it when a new log is opened and stores the value in state (`FullDfoForm.tsx:527` and `:573`, `setLgbkUid(meta.lgbkUid)`), and it persists through every save object. A second assignment site is the **load-time backfill**: `loadAllLogs()` stamps `lgbkUid: l.lgbkUid ?? generateLgbkUid()` onto any stored log missing the field (`dfoLogStorage.ts:62`). The generator only **reads** it (`dfoXmlGenerator.ts:219`, `tag('LGBK_UID', log.lgbkUid, …)`) — nothing is assigned at send time.

**Plain answer: yes — an unsent log (draft or complete) already has a `lgbkUid` today.** Any log that somehow lacked one is backfilled the moment the list loads.

### A2 — Does the transmission register store `lgbkUid`?

**No.** `TransmissionRecord` (`src/utils/dfoLogStorage.ts:260–278`) carries exactly these fields:

`id`, `logId`, `attemptedAt`, `outcome`, `httpStatus?`, `errorMessage?`, `fileName?`, `confNumber?`, `xmlSnapshot`, `soapSnapshot`, `vrn?`, `tripNum?`, `xsdValid?`, `wsErrCode?`, `kind?`

There is **no `lgbkUid` field**. The value is recoverable only indirectly: `xmlSnapshot` contains the sent bytes, so a logbook record's `<LGBK_UID>` (and, after this build, a 233 record's `<LOGBOOK_UID_REFERED>`) lives inside that string, not as a queryable field. (`submitDfoXml.ts:72` parses `lgbkUids` out of the WS **response** for the return value, but that array is not persisted on the record either.)

### A3 — §22 v1_4 figures showing the logs list or the Transmission Result card

Method: `pdftotext -layout` caption extraction over both v1_4 PDFs in `assets/docs/` + `pdfimages -list` per caption page (each figure = one `image` row + one `smask` row; every relevant page carries exactly ONE picture — no lettered multi-frame figures on these pages).

| Surface | EN frames | FR frames | Where |
|---|---|---|---|
| **DFO Logs list screen** | **2** | **2** | EN p17 "DFO Logs list screen with the + button to add a new log" + p26 "DFO Logs screen with Send to DFO button on an entry"; FR p20 « Écran de la liste des Journaux du MPO avec le bouton + pour ajouter un journal » + p30 « Écran Journaux du MPO avec le bouton Transmettre au MPO sur une entrée » |
| **Transmission Result card** (SentLogDetailModal) | **0** | **0** | No caption in either PDF references the transmission result/register detail card |

**Net: adding a row to the logs list would re-open 4 frames (2 EN + 2 FR); adding a row to the Transmission Result card re-opens 0 frames.** (Independently of A3: this build's own field is on the Form 233 entry screen — EN p33 / FR p36 caption "Form 233 — Inactivity Report entry screen" — the already-known 233 T3/T4 + §22 re-shoot from the submission plan Phase 4.)

---

## §1 — FOUNDER RULINGS (taken mid-session, before any string was written)

1. **EN label: CORRECTED spelling — "REFERRED ELOG UID".** Deviates from the dictionary's "Refered ELOG UID" by one letter, overriding the S111 labels-verbatim precedent for this label only (harvester-readability ruling). On record: this is the first deliberate label-wording deviation from the CSV dictionary; if a strict reviewer flags it, the fallback is the dictionary spelling.
2. **FR label: « IDU JBE RÉFÉRÉ »** — dictionary wording and accents verbatim, trailing period dropped (typographic-deviation class, same as the S77/S111 casing-aside corollary), uppercased per app convention.
3. **Placement: own card between Reporting Period and Reason.** Card header = the ruled label, one TextInput, **no "(Optional)" marker** — founder cited the S113 ruling that the "(Optional)"/« (Facultatif) » class gets cleared in one later pass, not half-fixed here; unmarked-means-optional is already the screen's convention (required fields carry the red asterisk).

## §2 — BUILD RECORD

| Piece | File | What |
|---|---|---|
| B1 entry type | `src/utils/dfoForm233Generator.ts` (interface `Form233Entry`) | `logbookUidRefered?: string;` — additive optional, exactly like `remarks`/`reportDtlRemarks`; old stored entries parse unchanged. Field name mirrors DFO's schema spelling ("REFERED") for grepability |
| B3 generator | same file, REPORT block | `report += tag('LOGBOOK_UID_REFERED', entry.logbookUidRefered ?? '', '    ');` at the former comment line — between `REPORT_UID` and `DG_CLOSE_DT` (XSD report_type slot, line 360). `tag()` drops blank → element absent, never an empty tag |
| B5 validator | same file, `validateForm233Xml` | NO presence check; when present, `/^[A-Z]{6}$/` or the send blocks with `LOGBOOK_UID_REFERED must be six uppercase letters A-Z (Rule 953): <value>` |
| B2 screen | `src/screens/Form233Screen.tsx` | `FormState.logbookUidRefered` + `EMPTY_FORM` seed; **prefill** in the mount effect — `loadLastLog().then(last => { if (last?.lgbkUid) setForm(prev => prev.logbookUidRefered ? prev : { …, logbookUidRefered: last.lgbkUid }); })` — byte-mirror of the Form 222 guard (`Form222Screen.tsx:175–177`): fires once, never overwrites typed text, fully editable after. New card between Reporting Period and Reason: header `form233.logbookUidRefLabel`, plain `TextInput` (`styles.input`), `maxLength={6}`, `autoCapitalize="characters"`, `autoCorrect={false}`, `onChangeText` upper-cases (`v.toUpperCase()` — autoCapitalize alone doesn't force pasted/soft-key lowercase). Entry threading: `logbookUidRefered: form.logbookUidRefered.trim()` |
| B4 i18n | `src/i18n/locales/en/dfo.json` + `fr/dfo.json` (form233) | `"logbookUidRefLabel": "REFERRED ELOG UID"` / `« IDU JBE RÉFÉRÉ »`; `"logbookUidRefPlaceholder": "Logbook this report refers to"` / `« Journal auquel ce rapport se réfère »` (placeholder mirrors the shipped 222 pair). Key-sets symmetric (2 new keys each side) |
| B6 tests | `src/utils/__tests__/form233LogbookRef.oneoff.test.ts` (NEW) | 3 tests: emit-in-slot (index-ordered REPORT_UID < ref < DG_CLOSE_DT) + validator pass; blank/whitespace/absent → ZERO occurrences of the string; malformed (`ABC`, `abcdef`, `AB12EF`, 7-char injected past the UI cap) rejected citing "six uppercase letters", valid six pass. Writes both xmllint samples |

Untouched, verified by diff scope: Comments box, section-note button, VRN send gate, Form 222 files, 234 files.

## §3 — VERIFY GATE RESULTS

| # | Gate | Result |
|---|---|---|
| 1 | tsc baseline | **33 errors, 0 new** (`npx tsc --noEmit` → grep -c "error TS" = 33; same two known tail errors LoginScreen/ProDashboard) |
| 2 | jest | **25 suites / 109 tests, all green** (baseline 24/106 → +1 suite, +3 tests) |
| 3 | Sim render EN+FR | **PENDING-JONNY** — see walk script below. Headless tap not possible on this machine (no idb; osascript denied assistive access). The NEW BUNDLE boot was exercised as far as automation reaches: app relaunched against Metro (running, port 8081), dev-client deep link opened |
| 4 | Prefill carries a real lgbkUid | **PENDING-JONNY** (same walk; the sandbox has complete logs under the dev uid, so `loadLastLog()` will return one — its `lgbkUid` should appear in the field) |
| 5 | xmllint filled sample | **VALIDATES** vs `43792.233…_20260108 000000.xsd`; REPORT block reads `REPORT_UID → LOGBOOK_UID_REFERED(GHJKLM) → DG_CLOSE_DT` — correct slot |
| 6 | xmllint blank sample | **VALIDATES**; `grep -c LOGBOOK_UID_REFERED` = **0** — element fully absent, no empty tag |

Samples on disk (job tmp): `sample_233_logbook_ref.xml` (581 B) + `sample_233_logbook_ref_blank.xml` (527 B).

### Walk script for gates 3+4 (Jonny drives)

Sim state as left: sandbox (iPhone 17 Pro Max, `F9407C4A…`) is **booted, sitting on the home screen with an "Open in LobsterLog?" confirm** — that dialog is step 1, not a problem.

1. Tap **Open** → dev client loads the new bundle from Metro (already running on 8081).
2. DFO ELOG pill → attestation → logs list → **Form 233**.
3. EN check: card **"REFERRED ELOG UID"** sits between Reporting Period and Reason; field arrives prefilled with the newest complete log's 6-letter `lgbkUid`; typing overwrites it; input forces uppercase, caps at 6. Screenshot.
4. Switch app language to FR (Captain Profile) → reopen Form 233: « IDU JBE RÉFÉRÉ » / placeholder « Journal auquel ce rapport se réfère ». Screenshot.
5. Do NOT send — live byte proof is S1 in the sweep.

## §4 — FLAGGED, NOT ACTED ON

- **Stale sandbox archive record** (from Phase 0, still true): one Jul-21 success record `FORM222-OYTWTM` / `1004-104460-20260721230005.XML` / WS0000 CONF 163698 in the sandbox register+archive under uid `FwXYZ…`. Clearing before sweep screenshots is a founder call.
- **EN-label deviation is now precedent-bearing** — first deliberate wording deviation from the CSV dictionary (ruling §1.1). Recorded here so a future dictionary-verbatim audit doesn't read it as an error.
- **This build re-opens the 233 T3/T4 TRG figures and the §22 "Form 233 — Inactivity Report entry screen" figure (EN p33-area / FR p36-area)** — already scheduled as submission-plan Phase 4; no new exposure beyond it. Per §0-A3, the logs list and Transmission Result card figures are NOT touched by this build.
- The S116 recon report and this gate doc remain untracked (founder decides tracking).

---

## COMMIT BLOCK — Jonny runs, one line at a time (NOT run by Claude)

**✅ RUN 2026-07-27 — commit `fd5108f` (pushed, `5a2b6df..fd5108f`; verified from Jonny's pasted terminal output: subject matches, 6 files / 128+ / 4− — CLAUDE.md 15+3−, en+fr dfo.json 2+ each, Form233Screen.tsx 31+, form233LogbookRef.oneoff.test.ts 70+ new, dfoForm233Generator.ts 12+1−; `git status --short` shows only the 19 expected untracked passengers; `git log origin/main..HEAD --oneline` empty = pushed. Walk gates 3+4 PASSED before the commit: field renders EN+FR on the sandbox, prefill carried a real lgbkUid.)**

Ladder diffed against `git status --short` (5 modified tracked + 1 new test; everything else is pre-existing untracked passengers and stays untracked):

```bash
cd ~/Desktop/LobsterLog
git add src/utils/dfoForm233Generator.ts
git add src/screens/Form233Screen.tsx
git add src/i18n/locales/en/dfo.json
git add src/i18n/locales/fr/dfo.json
git add src/utils/__tests__/form233LogbookRef.oneoff.test.ts
git add CLAUDE.md
git commit -m "Add LOGBOOK_UID_REFERED field to Form 233"
git push
```

(CLAUDE.md carries the Phase 0 backfill + this phase's S117 record — rides this commit per the plan.)

Verify after:

```bash
git show -s
git show --stat --format= HEAD        # expect 6 files: the five src/i18n/CLAUDE paths + the new test
git status --short                    # only ?? untracked passengers remain
git log origin/main..HEAD --oneline   # empty = pushed
```

