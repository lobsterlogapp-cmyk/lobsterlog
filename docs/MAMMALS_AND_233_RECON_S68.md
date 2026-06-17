# Session 68 — Marine Mammals (Form 222) + Form 233 Recon

**Recon-only. No source edited.** Diagnostic read of the generators, screens, storage,
and config. Authority for behavioral claims = the cited `file:line`.

---

## SECTION 1 — MARINE MAMMALS (Form 222)

### 1a. Submit-path trace + the "Submitted but no record" bug — CONFIRMED

**The 222 path does NOT call the live send.** The popup fires *without any transmission.*

`Form222Screen.tsx` `handleSubmit` → confirm-dialog `onPress` (lines 154–206):

```
180  const xml = generateForm222Xml(entry, profile);
181  const validation = validateForm222Xml(xml);          // local XSD-shape check only
182  if (!validation.valid) { …return; }
191  // Simulate HTTP call — replace with real fetch() once DFO provides endpoint URL
192  generateSoap222Envelope(xml, profile.elogKey, generateDfoXmlFileName(...));  // ⚠ RESULT DISCARDED
198  entry.sentToDfo = true;                              // marked sent with no proof
199  entry.sentAt = Date.now();
200  await saveForm222Entry(entry);                       // → @form222_entries (private store)
201  await saveXmlArchiveEntry({ logId: `FORM222-…`, … }); // → XML archive only
203  Alert.alert('Submitted', t('form222.submitSuccess'), …); // popup → OK
```

- **Does it call the live send?** No. Line 192 builds the SOAP envelope and throws it away.
  There is **no `fetch`** anywhere in `Form222Screen.tsx`, and `DFO_UAT_ENDPOINT` /
  `DFO_SOAP_ACTION_SAVE` are **not imported** in the file. The line-191 comment is stale —
  it predates the UAT go-live (the logbook path went live S54; this screen was never rewired).
- **Does it parse WS_RESP / capture ERR?** No. `parseDfoSoapResponse` is never called here.
- **Does it write a `TransmissionRecord`?** No. `saveTransmissionRecord` is never called on the
  222 path. It writes only a `Form222Entry` (separate `@form222_entries` key) and an
  `XmlArchiveEntry`.

**Why it's invisible in "Sent to DFO" / Log History:** both lists are built from the
transmission register — `indexSuccessRecords()` / `indexFailureRecords()` over
`loadTransmissionRegister()` (`@lobsterlog_transmission_register`). Since the 222 path never
writes a register record, nothing shows up there, and there is no CONF / filename / WS0000 /
HTTP 200 to show. The "Submitted" popup is purely a local Alert.

#### Side-by-side vs the WORKING logbook pipeline (`DfoLogsListScreen.tsx` `doSubmit`, 230–388)

| Step | Logbook `doSubmit` (works) | Form 222 `handleSubmit` (broken) |
|---|---|---|
| Build XML | `generateElogXml` (281) | `generateForm222Xml` (180) ✔ |
| Validate | `validateElogXml` (283) | `validateForm222Xml` (181) ✔ |
| Filename | `generateDfoXmlFileName` (294) | `generateDfoXmlFileName` (195) ✔ |
| Build SOAP | `generateSoapEnvelope` (295) | `generateSoap222Envelope` (192) ✔ |
| **POST** | **`fetch(DFO_UAT_ENDPOINT, …)` (303)** | **— missing —** |
| Read HTTP | `httpStatus` / `responseBody` (312–313) | — missing — |
| **Parse resp** | **`parseDfoSoapResponse(responseBody)` (331)** | **— missing —** |
| **Record (success)** | **`saveTransmissionRecord({outcome:'success', httpStatus, fileName, confNumber, vrn, tripNum, xsdValid, wsErrCode, xml/soapSnapshot})` (348–364)** | **— missing —** |
| **Record (failure)** | **`saveFailureRecord` → `saveTransmissionRecord` (236–248, 320/337/374)** | **— missing —** |
| XML archive | `saveXmlArchiveEntry` (365) | `saveXmlArchiveEntry` (201) ✔ |
| Mark sent | `markSentToDfo(log.id)` (366) | `entry.sentToDfo = true` (local only, 198) |

**The divergence in one line:** the logbook path replaces the simulated call with a real
`fetch → parse → saveTransmissionRecord` block (DfoLogsListScreen.tsx:297–366); the 222 path
still stops at the discarded envelope build (Form222Screen.tsx:192) and fakes success.

**Missing calls to add on the 222 path (for the later build, not this session):**
1. `fetch(DFO_UAT_ENDPOINT, { method:'POST', headers, body: soap, signal })`
2. `parseDfoSoapResponse(responseBody)` + HTTP-status branch
3. `saveTransmissionRecord(...)` on **both** success and failure
4. import `DFO_UAT_ENDPOINT` + `DFO_SOAP_ACTION_SAVE` from `dfoXmlGenerator`

> ⚠ **Same bug, same lines, in Form 233.** `Form233Screen.tsx:96–108` is a verbatim copy of
> the pattern — builds `generateSoap233Envelope` (97), discards it, sets `sentToDfo=true`,
> shows "Form 233 has been sent to DFO." No fetch, no register record. Both forms share the
> fix. (Flagging, not fixing — recon only.)

### 1b. T1–T5 scored against `dfoForm222Generator.ts` (generator only, no live send)

| Test | Result | Notes (file:line) |
|---|---|---|
| **T1** Interact_ind=Y, ALL elements | **PASS** | When Y the generator emits the full set: INTERACT_DT (138), LAT/LONG w/ `MODE="M"` (140–141), NAME/ADDR (142–143), TGT_SPECIE_ID 1312 + GEAR_ID 925 (145–146), LGBK_NUM_REF (149), GEAR_DMG_IND/NOAA_SPECIE_COD/NB_SPCMN_BEST (153–155), DG_CLOSE_DT (158), REM (164), MM_INTER_INCDNT (174–176), plus GENERAL_INFO incl. mandatory FIN+VRN (127–128). |
| **T2** Interact_ind=Y, mandatory only | **PASS** | Same emit path; `tag()` (97–100) drops empty optionals (e.g. REM/ADDR), so a mandatory-only fill produces valid structure. |
| **T3** Interact_ind=N, all elements | **PASS** | When N only REP_DATE (134) + INTERACT_IND (135) + LGBK_NUM_REF (149) + DG_CLOSE_DT (158) emit; the `if (interactInd==='Y')` blocks are skipped (137/151/160). No detail elements exist for an N report — correct per XSD. |
| **T4** Interact_ind=N, mandatory only | **PASS** | Identical to T3 — an N report is inherently mandatory-only. |
| **T5** ONE report, THREE MM_INTER_INCDNT nodes | **PASS (generator emits multiple) — 1 caveat, live-confirm pending** | Multi-incident, NOT single-incident: a `Set<string>` is built (168) and the loop emits one `<MM_INTER_INCDNT><INCDNT_TYP_ID>` per distinct code (174–176); XSD allows 0..n. **Caveat:** the 3 distinct codes come from ONE selected interaction type + the injury/death/entangle Y/N indicators (39615/39609/39610 at 171–173). The UI's single `interactionTypeLabel` dropdown cannot pick 3 arbitrary *types*; three nodes are reached as `type + indicators`. Each node carries only `INCDNT_TYP_ID` (species/count/loc live once at MM_INTER level). DFO acceptance of 3 nodes is the one thing only a live send can confirm. |

**Species/incident codeId resolution — re-confirmed:**
- `MARINE_MAMMAL_SPECIES` maps label→`noaaCode` (generator 18–19); validator checks
  `NOAA_SPECIE_COD ∈ MV_NOAA_MM_SPECIES` (264–267). Table has **47** species
  (`mvNoaaMmSpecies.ts`). ✔
- Indicator-mapped incident codes **39609 / 39610 / 39615** all present in `MV_INCIDENT_TYPE`
  (`mvIncidentType.ts:12,13,18`); validator checks every `INCDNT_TYP_ID` against the table
  (270–273). ✔

---

## SECTION 2 — FORM 233 RULE AUDIT (`dfoForm233Generator.ts` + config)

| Rule | Result | Evidence |
|---|---|---|
| **528** — VRN must be 4/5/6 **digits only** (REAL on 233) | **FAIL** | Generator emits `tag('VRN', profile.vesselNumber)` **verbatim** (dfoForm233Generator.ts:87) — no digit/length check. `validateForm233Xml` does **not** check VRN at all (treats FIN/VRN optional, line 121). The app's only VRN guard, `isValidVrn` (CaptainProfileScreen.tsx:33), was deliberately **widened** from "exactly 4–6 digits" to `/^[A-Za-z0-9]{1,12}$/`; the comment (29–32) states the Rule 528 "4–6 digits" citation *"could not be verified … flagged for follow-up with Kane. Widened to match XSD pending clarification."* **Consequence:** a 7-digit test VRN passes profile validation and emits unchanged into the 233 XML. Mismatch confirmed — Rule 528 is **not enforced anywhere on the 233 path.** (Needs the Kane clarification noted in the code comment to settle 528-vs-string_12.) |
| **931** — FIN label must read exactly "Licence holder's FIN" | **FAIL** | `form233.finLabel` = **"DFO FIN"** (en/dfo.json:261) / "NIP MPO" (fr/dfo.json:262). Rendered at Form233Screen.tsx:156. Does not match the required string. (For reference, no namespace uses "Licence holder's FIN": setup="FIN (FISHER ID NUMBER)", tripConfirm="FIN".) |
| **961** — FIN mandatory except Arctic (regId 1008) | **FAIL** | No mandatory enforcement on the 233 path: generator drops empty FIN via `tag()` (line 86); validator marks FIN optional (121); `Form233Screen.handleSubmit` only checks dates+reason (59) and never calls the `isProfileComplete` gate (that gate lives only in the logbook `doSubmit`, DfoLogsListScreen.tsx:255). No regId-1008/Arctic carve-out exists in code — and the app has no Arctic region (regIds are 1006/1014/1004/1002), so FIN should be **unconditionally** mandatory here, but an empty FIN silently yields a FIN-less document. |
| **952/953** — UIDs six random uppercase A–Z | **PASS** | `generateForm233Uid()` (30–35) builds 6 chars from `'ABCDEFGHIJKLMNOPQRSTUVWXYZ'`; `REPORT_UID` = `entry.uid` (99). (Validator at 141 allows 1–6 chars, looser than the generator, but the generator always emits exactly 6 uppercase.) |
| **2500** — DFO instruction PDFs reachable in-app | **FAIL** | No in-app PDF: no `Linking.openURL`, no bundled instruction asset, no viewer. The only `.pdf` strings in `src/` are code comments citing `ELOG_Web_Service_3_6_Eng.pdf` (DfoLogsListScreen.tsx:109; dfoXmlGenerator.ts:933). Corroborated by CLAUDE.md "Not yet built": *Provider's instructions document (§17)* and *User's guide document.* |

---

## Summary for the qualification request

- **Form 222 (1a):** real defect — submit popup is a simulation; **no transmission, no
  register record.** Generator structure (1b) is sound: **T1–T4 PASS, T5 PASS** (multi-incident
  capable; only live-send acceptance of 3 nodes unconfirmed). Species/incident codes resolve.
- **Form 233:** **528 FAIL, 931 FAIL, 961 FAIL, 952/953 PASS, 2500 FAIL.**
- **Cross-cutting:** the discarded-envelope "fake send" is identical in Form 222 **and** Form 233
  — both need the `fetch → parse → saveTransmissionRecord` wiring the logbook path already has.

*All items above are diagnostic. No `.ts`/`.tsx` source was modified this session.*
