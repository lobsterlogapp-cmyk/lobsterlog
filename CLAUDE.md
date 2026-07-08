# LobsterLog — CLAUDE.md
App version: 1.8.6 (versionCode 76)
Last updated: July 5, 2026 (Session 93 complete — 234.12 ABSORBED: LOST_GEAR_IND de-emitted from generator + UI all four subforms, validator max:0, 6 orphaned i18n keys removed EN+FR, save-gate message reworded; 9-test regression guard [jest 18/64]; trip-timestamp fields now show date+time locale-aware EN/FR; committed 748340e, pushed. Live recovery send LL-20260704-001 Trip #9 → WS0000 CONF 163081 [July 5]; archive-grep verified sent bytes carry ZERO LOST_GEAR_IND. Ticket #2126 CLOSED. Recovery was SAME-DAY — cross-midnight live send still banked (rides TRG sweep). Session 94 next — TBD)

## What this app is
React Native / Expo mobile app. DFO-qualified electronic logbook for lobster harvesters.
Built by Jonathon Nickerson, Cape Sable Island NS (LFA 34). Solo indie dev.

---

## Pending / waiting on
- Cross-midnight LIVE 234 send — still banked (Ticket #2126). The 07-02 WS1038 234 regression is
  RESOLVED: root cause was LOST_GEAR_IND Mandatory→Blocked in the 234.12 XSD, absorbed in S93
  (de-emit shipped; recovery send LL-20260704-001 → WS0000 CONF 163081, July 5 — see What's built).
  BUT that recovery was a SAME-DAY trip, so the S90 multi-day day-rollover (sail 23:30 D1 / haul
  02:00 D2) has still never been live-proven end-to-end. Rides the next TRG sweep. (History:
  docs/WS1038_S90.md, docs/RECON_234_12_xmllint_S92.md, docs/GATE_234_12_DEEMIT_S93.md.)
- DFO test endpoint URL (Ticket #2126) — confirm exact test URL from DFO email
- Garmin Box repo access (re-requested from Aldo cc Mauro, Session 47; still awaiting)
- Aldo's answers (Session 47): chart rendering via native view vs tile URL template; Navionics token via URL query param vs X-navionics-developer-token header
- App Store / Play store product identifiers for monthly/annual Pro (to map restore/renewal to the correct Navionics tier; Navionics product IDs themselves confirmed by Mauro Session 47)
- Invest NS intro from Ashley Sprague

## DFO test credentials — RECEIVED June 10 2026
- CIE_ID 44542 (now a constant in code)
- SOFT_VER 0 for testing
- ELOG key — ✅ IN .env as EXPO_PUBLIC_DFO_TEST_ELOG_KEY (confirmed Session 51; value
  matches Test_values_LobsterLog.pdf p.4, which also lists the reserved test
  FIN/VRN/LIC_NO triplets per region — use those for UAT submissions)
- UAT endpoint CONFIRMED LIVE (Session 50): https://inter-w01-uat.dfo-mpo.gc.ca/ws/
  ElogXMLFileTransfer/ElogXMLFileTransfer.asmx — HTTP 200, exposes SaveIncomingFile +
  ValidateElogKey. Production endpoint URL still pending from DFO

---

## ⛔ SESSION 48 CHECKPOINT — RESUME HERE (DFO ELOG XSD restructure)

Session 48 stopped mid-Phase-1 after a blocking structural discovery. **Read this before
touching the DFO XML generator.** Authority for all claims below: the on-file XSD
`Desktop/DFO/ELOG_F234_old_234-11/39673.234.…Homard_20260130 000000.xsd` (234.11 package relocated here in S92 — `ELOG_F234` now holds the NEW 234.12 XSD `…20260624`; disambiguate by XSD filename date, not folder name), validated with
`xmllint --noout --schema`.

📄 **FULL RESTRUCTURE PLAN: `docs/archive/ELOG_RESTRUCTURE_BLUEPRINT.md`** — complete target tree,
field-by-field mapping, homeless-attribute trace, format conversions, item sequencing,
open questions, and suggested refactor steps S1–S4. The summary below is the short form;
the doc is the source of truth for the rebuild.

### (a) DONE — Items 1 & 2 (applied + verified)
- `DFO_SOFT_VER = '0'` added to `dfoConstants.ts` (TEST value; MUST swap to DFO-assigned
  qualified version before production). Wired into `GENERAL_INFO.SOFT_VER` in
  `dfoXmlGenerator.ts` (replaced the old `APP_VERSION='1.8.6'`, which was deleted).
- `DFO_CIE_ID = '44542'` added to `dfoConstants.ts`. Wired into `GENERAL_INFO.CIE_ID`
  **and** the SOAP header `<elog:CieId>` (which was previously empty — `const CIE_ID=''`
  stub removed). `validateElogXml()` now has a `hasElem('CIE_ID')` check for symmetry.
- GENERAL_INFO member emission reordered to XSD sequence (FIN now before VRN).

### (b) CONFIRMED GENERAL_INFO order (XSD `general_info_type`, lines 190–199)
`CIE_ID → SOFT_VER → REG_ID → FIN → VRN → FORM_VER_ID → SUBFORM_ID`
(REG_ID/FORM_VER_ID/SUBFORM_ID are currently NOT emitted as elements — see (c).
FORM_VER_ID = `DFO_FORM_VER_ID` (234) is missing entirely and must be added.)

### (c) ⚠️ STRUCTURAL FINDING — generator output is schema-invalid (BLOCKS first transmission)
The generator emits a **FLAT** `<ELOG>` (all fields as direct children, plus 7 attributes
on `<ELOG>`). The XSD mandates a **NESTED** tree:
`ELOG → GENERAL_INFO + TRIP[] → (BAIT_USED/SAR/HLIN/HLOUT/PCONS/EFFORT/LANDING/TRANSFER)`,
and `EFFORT → TGT_SPECIES + EFFORT_BY_GEAR[] → EFFORT_DETAIL[] → CATCH[]`.
`<ELOG>` allows **only** the `NODE_ID` attribute (DFO-internal — never emit it).
xmllint fails at line 1: all 7 ELOG attributes "not allowed" + "Element 'CIE_ID': not
expected. Expected is ( GENERAL_INFO )". xmllint short-circuits there, so deeper element
errors are NOT yet surfaced — re-run after the skeleton exists to expose the next layer.
**A full generator refactor to the nested tree is REQUIRED before the Phase-2 "clean first
transmission" checkpoint can be met.** The in-app `validateElogXml()` is name-based and
never caught this; it needs a near-total rewrite to walk the nested structure.
Confirmed: NO downstream code adds wrappers — `generateSoapEnvelope()` escapes the whole
flat ELOG into `<elog:ElogData>` and POSTs it as-is. The flat output is what transmits.

### (d) LICENCE_NO → LIC_NO rename + relocate
`LICENCE_NO` does NOT exist anywhere in the XSD. The only licence element is **`LIC_NO`**
(`string_18`, mandatory). NOTE/correction: it lives in **`effort_type` (i.e. `<EFFORT>`,
XSD line 294)**, NOT in `EFFORT_DETAIL`. The generator currently emits BOTH a flat
`LICENCE_NO` and a flat `LIC_NO` (duplicate). Fix: drop `LICENCE_NO`; emit a single
`LIC_NO` inside `<EFFORT>` (value = `captainProfile.dfoLicenceNo`).

### (e) The five homeless `<ELOG>` attributes — TRACED & RESOLVED
- `LGBK_UID` — ✅ PLACEABLE: it's an element in `trip_type` (string_6, mandatory, line 214).
  Move from ELOG attr → `<TRIP>` child element.
- `REPORT_UID` / `LANG` / `CREATION_DT` / `REPORT_DT` — ❌ not in XSD anywhere.
  **RESOLVED: drop all four from the ELOG document entirely** (see decisions below).
- `MODE` (`"1"`/`"3"`) — **RESOLVED: removed entirely** (see decisions below). The only
  `MODE` in the XSD is a **required `M`|`G` attribute on every `LAT`/`LONG`** (base
  `AttType`) — those real `MODE="G"`/`"M"` attrs must still be ADDED to all LAT/LONG we emit.

### RESOLVED DESIGN DECISIONS (Session 48)
1. **NO correction/amendment mechanism.** The doc-level MODE attribute and all
   `mode = log.sentToDfo ? 3 : 1` logic are REMOVED entirely — not relocated, not
   conditional. Every transmission is a new completed log, read-only after sending.
2. **DROP REPORT_UID, LANG, CREATION_DT, REPORT_DT** from the ELOG document entirely —
   confirmed not in the XSD.

### Other refactor notes captured Session 48 (don't re-derive)
- Dates: XSD `date_12` = `YYYYMMDDHHMM`, `date_14` = `YYYYMMDDHHMMSS` (integer, no
  `-`/`T`/`:`/`Z`/ms). Current ISO-8601 output fails ALL date patterns. Need a date_12
  formatter (`toCloseTimestamp()` already gives date_14).
- Renames the rebuild forces: `TRAP_HAULS→NB_GEAR_HLD`, `SOAK_DUR→SOAKED_DUR`,
  `LGRID_CODE_ID→LGRID_ID`, `CATCH_WT→KEPT_WT`, `SAR_INC→SAR_IND`, `LOST_GEAR→LOST_GEAR_IND`,
  `MAMMAL_INC→MM_INTER_IND`, `HAUL_START_DT/HAUL_END_DT→EFFORT.START_DT/END_DT`,
  `LAND_DT→LANDING.START_DT`. Missing-and-must-add: `FORM_VER_ID`, `TRIP_NUM`,
  `TGT_SPECIES.SPECIE_ID`, `CATCH.SPECIE_ID/SPECIE_FRM_ID`.
- Data-model mismatches (not mechanical): ports stored as free-text names but XSD wants
  integer `PORT_ID` codes (QC/NL); HLIN/HLOUT emit `COMPANY_NM` strings but XSD wants
  integer `HLIN_CIE_ID`/`HLOUT_CIE_ID`; BAIT is attr-style `<BAIT/>` but XSD wants
  `BAIT_USED` with child elements (`BT_TYP_ID`/`BT_WT`/`BT_COND_ID`/`DG_CLOSE_DT`).
- Indicator tension: Item 8 wants indicators defaulting null, but EFFORT SAR_IND/MM_INTER_IND
  are MANDATORY Y/N → null in state, block send if unanswered, emit Y/N. (LOST_GEAR_IND was the
  third mandatory indicator under 234.11; OVERTURNED — it is BLOCKED [maxOccurs=0] in 234.12,
  de-emitted in S93. See What's built / Session log Session 92.)

### Sequencing — these Session 48 items must wait until AFTER the refactor
5, 6, 7-emit, 10, 11, 12, 13, 14 (all touch the restructured nodes; 5/6/12 partly become
free once nodes are built right). Independent / can run in parallel: 15, 16, 17, and the
UI half of 7 (USG_ID picker/i18n/isRequired). 18 stays deferred (QC).

### Open questions to resolve BEFORE coding the refactor
1. ~~MODE/amendments~~ — RESOLVED: no amendment mechanism; see decisions above.
2. ~~REPORT_UID / LANG / CREATION_DT / REPORT_DT~~ — RESOLVED: all four dropped.
3. ~~LAT/LONG MODE value~~ — RESOLVED (Session 50, Standard v6.1 §11.3): MODE is
   per-coordinate provenance, NOT per subform — `G` when the value came from a GPS read,
   `M` when typed/edited manually (a manual edit of a GPS-filled field flips it to M).
   Implementation: track a per-coordinate source flag (e.g. latSource: 'gps'|'manual')
   set by captureGps(), reset by onChangeText; same pattern for SAR coords.
4. Ports & HLIN/HLOUT companies: switch name→integer-code now, or stub and do MAR-90
   first? (Ports half now has a plan: docs/REFTABLE_INGESTION_PLAN.md, Session 51.)

### Refactor steps S1–S4 — ✅ ALL COMPLETE (June 11 2026)
Generator emits the nested GENERAL_INFO/TRIP/EFFORT tree; `validateElogXml()` rewritten
(mini parser + XSD-sequence spec + subform overlays). MAR-90 xmllint: only remaining
error is LANDING.PORT_ID (open Q4) — with a dummy PORT_ID inserted the document FULLY
VALIDATES. The validator enforces LANDING.PORT_ID for ALL subforms per the XSD (blocks
the send with a pointer to open Q4; never green-lights a doc xmllint rejects). SAR detail + LAT/LONG emission now BUILT (Session 66b — emits with NB_SPCMN/SPCMN_COND_ID + MODE provenance, node xmllint-valid; was held on open Q3 + missing SAR UI fields).
Fixture test: `src/utils/__tests__/genSampleMar90.oneoff.test.ts`.
Details in `docs/archive/ELOG_RESTRUCTURE_BLUEPRINT.md` (status header updated).

---

## Key files
| File | Purpose |
|---|---|
| `dfoXmlGenerator.ts` | generateElogXml(), generateSoapEnvelope() (SaveIncomingFile), buildSaveIncomingFileEnvelope(), generateDfoXmlFileName(), buildValidateElogKeyEnvelope(), parseValidateElogKeyResponse(), generateReportUid(), validateElogXml(), LGBK_UID |
| `__tests__/validateSpecieSzId.oneoff.test.ts` | S59 guard: 89-missing→mandatory, 89-with-value→emits, 88/90/91-injected→blocked (PCONS.SPECIE_SZ_ID, row 56) |
| `__tests__/validateLgridId.oneoff.test.ts` | S59 guard: 90-populated→emits, 88/89/91-injected→blocked (EFFORT_DETAIL.LGRID_ID, row 85) |
| `dfoForm222Generator.ts` | Form222Entry, generateForm222Xml(), validateForm222Xml(), generateSoap222Envelope(), save/load, constants |
| `dfoForm233Generator.ts` | Form233Entry, generateForm233Xml(), validateForm233Xml(), generateSoap233Envelope(), save/load, constants |
| `dfoConstants.ts` | DFO_SUBFORM_REGISTRY, DFO_SUBFORM_FIELD_CONFIG, all region data (FMA, bait, catch, PCONS lists), DFO_FMA_38B, DFO_FMA_NB_VNTCH(_YOU) rule sets |
| `scripts/generateReftables.js` | DFO reftable codegen: data/dfo-reftables/*.csv (cp1252) → src/data/reftables/*.ts (typed, committed); rerun on new DFO rel versions (§15) |
| `src/data/reftables/` | GENERATED — 11 MV_* tables (catch usage, specimens/bait condition, partnership, province, F222 cluster incl. MV_NOAA_MM_SPECIES) |
| `FullDfoForm` | Main DFO form UI, isVisible()/isRequired() guards, all 4 subforms |
| `DfoLogsListScreen` | Send to DFO handler (real fetch()), imports parseDfoSoapResponse from ../utils/submitDfoXml (relocated S69), retry UI, Form 222/233 entry points |
| `Form222Screen` | Marine mammal interaction entry form — date, species, nb animals, type, disposition, notes; submits via shared submitDfoXml() (S69 real transmission; S70 LIVE-SENT WS0000 CONF 162859/162861). Rule 528 4-6-digit VRN gate (isValidFormVrn) at top of handleSubmit; LAT/LON real-time validators on XSD ranges (38-72 / -148..-40) |
| `Form233Screen` | Inactivity report entry form — period start/end, reason; pre-populates from captainStorage; submits via shared submitDfoXml() (S69 real transmission; S70 LIVE-SENT WS0000 CONF 162860). Rule 528 4-6-digit VRN gate (isValidFormVrn) at top of handleSubmit |
| `submitDfoXml.ts` | NEW (S69) — shared, UI-free, store-agnostic DFO transmission helper. submitDfoXml() owns transport (fetch + 30s AbortController) + parseDfoSoapResponse (relocated here from DfoLogsListScreen — now defined in exactly ONE place) + TransmissionRecord write on success AND every failure path + saveXmlArchiveEntry on success; snapshot param carries vrn/tripNum/xsdValid for later logbook convergence. Does NOT touch entry stores, does NOT call markSentToDfo. |
| `captainStorage` | CaptainProfile — subformId, regId, language, units, dfoActivated, dfoLicenceNo, dfoFin, elogKey; loadPrivacyAccepted() / savePrivacyAccepted() |
| `dfoBackup` | NEW (S84/85) — DFO cloud backup. DFO_BACKUP_STORES (the 7 DFO AsyncStorage stores), per-UID path `backups/{uid}/stores/{storeId}` on the **dfo-elog** named DB (NOT (default)); backupAllStores(uid) writes each store's raw blob VERBATIM via setDoc; triggerBackup() fire-and-forget consent+uid-gated write-through hook; backupNow(alreadyConsented?) manual awaited path returning {ok,reason}; loadBackupConsent/saveBackupConsent (key `@lobsterlog:dfo_backup_consent`, default OFF). Best-effort: every cloud write swallows its own errors, never throws into a save/send |
| `BackupExplainerModal` | NEW (S84) — one-screen plain-language cloud-backup explainer (what / where / it's yours to control), opened from the Captain Profile "Cloud Backup" card |
| `firestore.rules` + `firebase.json` | NEW (S84) — dfo-elog security rules: `backups/{uid}/**` read/write only when `request.auth.uid == uid`; firebase.json scopes the deploy to the dfo-elog database so (default) is untouched. Jonathon deploys |
| `navionicsStorage` | NavionicsPurchase interface; saveNavionicsPurchase/loadNavionicsPurchase/clearNavionicsPurchase (AsyncStorage key `navionics_purchase`), isNavionicsPurchaseActive() |
| `navionicsPurchase` | generateUUID(), generateGarminEncryptedTransaction() (raw PKCS#1 v1.5 block-type-1, NO SHA1/hashing/digest), runNavionicsPurchase(productId, userId) — full UUID→encrypt→POST→save flow; NAVIONICS_PRODUCT_MONTHLY/ANNUAL constants |
| `PrivacyNoticeModal` | One-time first-launch privacy notice; Accept → AsyncStorage flag; Decline → exit (Android) / Alert (iOS) |
| `AttestationModal` | Every-launch Fisheries Act attestation; single I Agree button; session state only |
| `DfoSetupScreen` | Region selector, licence/FIN inputs, RevenueCat purchase flow, admin DEV toggle |

---

## Subform reference
| subformId | Region | regId |
|---|---|---|
| 88 | QC | — |
| 89 | GLF | — |
| 90 | MAR (Maritimes) | 1004 |
| 91 | NL | — |

---

## What's built (as of Session 39)
- XML generator — generateElogXml() all 4 subforms, UTC ISO 8601, lbs→kg, XML escaping, MODE 1/3
- SOAP envelope — SOAP 1.1, DFO auth header, elogKey param, CIE_ID stub (all 3 generators)
- generateReportUid() and LGBK_UID helpers
- validateElogXml(xml, subformId) — structural XSD validation; checks required ELOG attributes, required elements per subform, ISO 8601 format on all DT fields, numeric validity, Y/N flags; blocks send and surfaces errors to user on failure
- XSD received (39673.234...xsd) — validation wired and active before transmission
- DFO_SUBFORM_REGISTRY — all 4 subforms with regId
- DFO_SUBFORM_FIELD_CONFIG — visible/required arrays per subform
- isVisible()/isRequired() guards in FullDfoForm
- SOAKED_DUR blocked for MAR
- All FMA lists — QC (40 LFAs), Gulf (14), Maritimes, NL (19)
- Bait type lists — QC/GLF/NL separate from MAR
- Catch species lists — QC/NL (36), GLF (4), MAR existing
- PCONS species lists — QC/NL, GLF, MAR
- Helper functions — getDfoFmaList(), getDfoBaitTypeList(), getDfoCatchSpeciesList(), getDfoPconsSpeciesList()
- DfoLog interface — subformId, regId fields
- generateNewLogMeta() — accepts subformId, returns regId
- loadAllLogs() backfill — defaults subformId=90, regId=1004 for old logs
- FULL_DFO_REQUIRED_FIELDS per-subform map (88/89/90/91)
- getRequiredFields(subformId) helper
- TransmissionRecord interface — save/load, 3-year retention
- XmlArchiveEntry interface — save/load, 3-year retention
- Send to DFO handler — validateElogXml → XML → SOAP → fetch() → parseDfoSoapResponse() → TransmissionRecord + XmlArchiveEntry → markSentToDfo; retry UI on failure (see Session 28 entries below)
- CaptainProfile DFO fields — subformId, regId, language, units, dfoActivated, dfoLicenceNo, dfoFin, elogKey
- DfoSetupScreen — region selector, licence/FIN, RevenueCat flow, admin DEV toggle
- DEV: Back to Setup floating button
- Settings — Language EN/FR and Weight Units lbs/kg toggles
- NB_SPCMN_BRD — rendered in FullDfoForm Catch section, MAR only via isVisible()
- HLIN section — rendered in FullDfoForm: company (req), confirmation no. (req), ETA (opt), total weight (opt), MAR only via isVisible()
- HLOUT section — rendered in FullDfoForm: company (req), confirmation no. (req), MAR only via isVisible()
- DG_CLOSE_DT section-close flow — REMOVED (Session 65). The Close/Unlock buttons, section lock (pointerEvents/opacity), and dgClose* form writes are gone; DG_CLOSE_DT now relies ENTIRELY on the generator's toCloseTimestamp(undefined) auto-stamp (generation time), and the XSD min:1 is always satisfied. The header-right slot is now the per-section "add a note" affordance (see Session 65 / What's built)
- KEPT_WT mandatory for MAR — in field config
- LGRID_ID optional for MAR(90) ONLY — in field config; (S59 I1 CLOSED) generator now subform-gated to emit only on 90 (value-gate AND-ed in) + validator rejects present-for-88/89/91 ("blocked") per Subforms_requirements_234.xlsx row 85
- OBS_TRIP_NUM optional for MAR — in TRIP section
- Form 222 generator — dfoForm222Generator.ts: Form222Entry (full field set per FS-NAT-222-1-EN), saveForm222Entry, loadForm222Entries (3-yr retention), generateForm222Xml (INTERACT_IND Y/N — when N only outputs indicator; when Y outputs all 15 fields in YYYYMMDD/HHMM format), validateForm222Xml (structural + date cross-validation Rules 566/589/590/591/592 + LAT/LON bounds + Y/N flag checks + RELEASE_IND conditional on ENTANGLE_IND=Y), generateSoap222Envelope; MARINE_MAMMAL_SPECIES (label+codeId pairs, TODO: confirm DFO code IDs), INTERACTION_TYPES (label+codeId pairs E/V/O); DISPOSITION_OPTIONS removed (replaced by individual Y/N indicator fields)
- Form 222 UI — Form222Screen.tsx: INTERACT_IND master Y/N toggle collapses/expands all fields; REP_DATE + INTERACT_DT + INTERACT_TM date/time inputs; LAT/LON numeric inputs with real-time bounds validation (Rules 172/173); species dropdown (MARINE_MAMMAL_SPECIES_LABELS → SPECIE_ID code); NB_ANIMAL; INTERACT_TYPE_ID dropdown; INJURY_IND/DEATH_IND/ENTANGLE_IND/RELEASE_IND(conditional)/GEAR_DAMAGE_IND Y/N toggles; OBSERVER_NM + CONTACT_INFO text inputs; REMARKS multiline; all strings through i18n dfo.form222.*; FR stubs as _todo; validates + (S69) submits via shared submitDfoXml() — real transmission, persists success+failure TransmissionRecord and archives the XML on success, drives the success/failure Alert off the typed result (no more unconditional "Submitted"); saves the Form222 entry only on ok; accessible via modal from DfoLogsListScreen. LIVE-SENT WS0000 (S70 — CONF 162859/162861) after the Rule 528 VRN gate + WS1038 coord clamp landed
- Form 233 generator — dfoForm233Generator.ts: Form233Entry, saveForm233Entry, loadForm233Entries (3-yr retention), generateForm233Xml, validateForm233Xml, generateSoap233Envelope; INACTIVITY_REASONS; reason codes W/M/P/O
- Form 233 UI — Form233Screen.tsx: pre-populates operator/licence/FIN from captainStorage (read-only); period start/end date inputs; reason dropdown; validates + (S69) submits via shared submitDfoXml() — real transmission, persists success+failure TransmissionRecord and archives the XML on success, drives the success/failure Alert off the typed result (no more unconditional "Submitted"); saves the Form233 entry only on ok; accessible via modal from DfoLogsListScreen. LIVE-SENT WS0000 (S70 — CONF 162860) after the Rule 528 VRN gate landed
- DfoLogsListScreen — Form 222 + Form 233 secondary buttons below main ELOG button; two new modal states; two new Modal blocks
- elogKey UI — CaptainProfileScreen: new "DFO Submission Settings" card with password-masked TextInput + Eye/EyeOff show/hide toggle; saves via existing saveCaptainProfile flow
- DFO response handling — DfoLogsListScreen: real fetch() with 30s AbortController timeout; parseDfoSoapResponse() handles SOAP fault / DFO error elements / HTTP 4xx–5xx / success; four distinct error paths each save TransmissionRecord and surface appropriate Alert; DFO_ELOG_ENDPOINT stub constant ready for URL swap
- Retry button — DfoLogsListScreen: failedSends state tracks per-logId error label; sendingLogs Set shows ActivityIndicator during in-flight send; completed cards show red "Last send failed · … · Tap Retry" badge + RotateCcw Retry button on failure; card border turns red; clears on success
- Privacy notice — PrivacyNoticeModal.tsx: one-time full-screen modal on first launch; content covers data collection, local storage, DFO transmission, no third-party sharing, contact email; Accept sets @lobsterlog:privacy_accepted in AsyncStorage; Decline exits app on Android / shows required Alert on iOS
- Harvester attestation — AttestationModal.tsx: full-screen modal shown every launch after privacy accepted; Fisheries Act attestation text; single "I Agree" button; no persistence (session state only)
- App.tsx modal sequence — loadPrivacyAccepted() loaded in parallel with captainProfile in useEffect; privacyChecked/privacyAccepted/attestationDone state gates both modals; modals rendered as React Native Modal over full app; BackHandler.exitApp() on Android decline
- captainStorage — loadPrivacyAccepted() / savePrivacyAccepted() using @lobsterlog:privacy_accepted key
- DfoTestHarnessScreen — DEV-only full-screen modal; 4 cards (88 QC / 89 GLF / 90 MAR / 91 NL); each card: Fire button, loading indicator, dark monospace results area; runs validateElogXml → generateElogXml → generateSoapEnvelope → fetch (or shows SOAP text when endpoint unset); loads OPER_NAME/VRN/licence/FIN/elogKey from captainProfile; fixture fallbacks for empty profile fields
- DfoSetupScreen DEV section — "XML Test Harness" button visible when DEV pill active + isAdmin; opens DfoTestHarnessScreen as fullScreen Modal
- elogKey field — CaptainProfileScreen "DFO Submission Settings" card confirmed present: secureTextEntry, Eye/EyeOff toggle, persists via saveCaptainProfile; captainStorage.ts elogKey on CaptainProfile type with empty-string default in EMPTY_PROFILE; DFO_FMA_LIST runtime crash on LFA selection fixed (import added)
- Region-specific FullDfoForm — all DFO field guards confirmed correct (soakDuration, nbSpcmnBrd, hlin, hlout, baitEntries, crewNb, portId all gated by isVisible()); bycatch species picker now uses getDfoCatchSpeciesList(subformId) instead of hardcoded BYCATCH_OPTIONS — QC/NL get 36 species, GLF gets 4, MAR gets MAR list; dead BAIT_OPTIONS constant removed; getDfoCatchSpeciesList added to FullDfoForm imports
- Firebase App Check — @react-native-firebase/app-check installed; firebaseConfig.js uses modular API (initializeAppCheck, ReactNativeFirebaseAppCheckProvider); App Check skipped entirely in DEV (__DEV__ guard) to avoid simulator DeviceCheck crash; prod only: Android playIntegrity, iOS deviceCheck; EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN env var; app-check plugin in app.config.js
- .env.example — created with all required env vars including EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN with explanation comment
- Google Play service account JSON — eas.json submit.production.android block added with serviceAccountKeyPath ./google-services-account.json and track "internal"; google-services-account.json added to .gitignore; GOOGLE_PLAY_SETUP.md created with step-by-step Google Play Console → API access → service account → JSON key → eas submit instructions; EAS secret alternative documented
- Form 234 XML audit v234.11 — audited generateElogXml() and validateElogXml() against DFO Subforms_requirements_234.xlsx and FS-NAT-234-11-EN fact sheet; fixed: SOFT_VER added (APP_VERSION constant, mandatory all subforms), LIC_NO added as separate EFFORT element (mandatory all subforms), SOAK_DUR blocked for MAR (subform 90) with generator guard + validator check, CREW_NB guarded to 88/90 only (blocked for 89/91), PORT_ID (DEPART_PORT/LAND_PORT) guarded to 88/91 only (blocked for 89/90), OBS_TRIP_NUM wired for MAR(90) only, GEAR_SBTYP_ID wired for NL(91) only; TODO comments added for PCONS/USG_ID, USE_CR_IND/PRTNSHP_ID, TRANSFER (all pending UI build); DfoTestHarnessScreen fixture updated with soakDuration, departurePort, obsTripNum, gearSubtypeId
- Form 222 and Form 233 confirmed active DFO qualification requirements (Kane Patterson, Ticket #2126, June 2); deprecation TODO comments removed from both generator files
- PCONS XML section implemented in generateElogXml() — repeating <PCONS> nodes (no wrapper), child-element style per XSD sequence: SPECIE_ID (label→codeId via getDfoPconsSpeciesList), SPECIE_FRM_ID (4691, hardcoded), SPECIE_SZ_ID (826 for lobster, 10670 unsized for all others — **CORRECTED S59 I2: emitted for GLF-89 ONLY; blocked for QC-88/MAR-90/NL-91 per Subforms_requirements_234.xlsx row 56; the original "emit for all subforms" behavior is obsolete**), WT (kg), USG_ID (37822 personal consumption, personalUse entry only), DG_CLOSE_DT (YYYYMMDDHH24MISS from d.dgClosePcons or current UTC); toCloseTimestamp() helper added; DFO_SPECIE_FRM_ID and DFO_PCONS_OTHER_SIZE_ID imported from dfoConstants
- react-i18next bilingual infrastructure — installed react-i18next, i18next, @os-team/i18next-react-native-language-detector (uses react-native-localize, already present); created src/i18n/ with en/fr locale files across common/dfo/map namespaces; seeded all English strings; fr locale files stubbed with _todo marker; i18n init with device language detection + AsyncStorage persistence (key: user_language); wired into App.tsx before screens render; EN/FR language toggle card added to CaptainProfileScreen; smoke tested with t('profile.vesselDetails') and t('profile.dfoSettings') on two card titles
- App.tsx TypeScript cleanup — fixed all pre-existing errors in App.tsx and root-cause hook files; changes: useAuth (useState<any> for user, catch :any annotations, currentUser! non-null assertion); useProfile (useState<any> for profile, Record<string,any> for logs, Record<string,any> for newLogs, (d:any) forEach annotation, snap.data()! non-null assertion, (prev:any) callbacks, (e as any).message catch casts); useLogForm (weather: [] as string[] ×2); usePurchases ((e as any).message ×3); App.tsx (Record<number,number> seasonHaulCounts, Record<string,number> haulByDateId, any[] historyMatches, : Date / : number / : any parameter annotations, (p:any)/(prev:any) setProfile callbacks); zero App.tsx errors after all fixes
- TypeScript error baseline (Session 52) — full-tree `tsc --noEmit` = 33 errors,
  none introduced by the Session 39-51 work. 18 are pre-existing in untouched
  files (LoginScreen.tsx ×11, FishingMap.tsx ×6, TrawlHistoryModal.tsx ×1 —
  mostly implicit-any). 15 are in touched files but predate this work
  (Garminmapbox.tsx ×6, LobsterLogProposalForm.tsx ×5 [missing DfoLog fields
  lgbkUid/firstEntryDt], BaitStats.tsx ×2, ProDashboard.tsx ×1 [lucide icon
  color prop], LanguagePickerScreen.tsx ×1). App.tsx + hook files remain clean
  (see above). Cleanup deferred — not a transmission blocker.
- PCONS USG_ID on bycatch entries — blocked on UI: BycatchEntry has no usage field; TODO comment added to generator with required values (37822/37814/37818/37820/37824); bycatch type pre-extended with usage?: string; UI work needed: add usage picker to bycatch bottom sheet in FullDfoForm.tsx
- i18n DfoSetupScreen — 16 new keys added to dfo.setup namespace (headerTitle, yourRegion, licenceDetails, licenceNoLabel, licenceNoPlaceholder, finLabel, finPlaceholder, infoText, priceLabel, priceAmount, priceSub, activateButton, processing, previewAs, restoreButton, harnessButton); useTranslation('dfo') wired; all user-facing strings replaced with t() calls including interpolated previewAs; FR stubs added with matching values
- i18n Form233Screen — 20 new keys added to dfo.form233 namespace (headerTitle, licenceDetailsCard, operatorNameLabel/Placeholder, licenceNoLabel/Placeholder, finLabel/Placeholder, reportingPeriodCard, startDateLabel, endDateLabel, datePlaceholder, reasonCard, reasonLabel, reasonPlaceholder, submitButton, confirmTitle, confirmBody, submitSuccess, validationFailed); useTranslation('dfo') wired; all user-facing strings replaced; FR stubs added
- Garmin RSA signing pipeline — RSA key pair generated (navDevKey.pem + navDevPublicKey.pem); public key shared with Garmin for developer account authorization; sandbox tokens (iOS + Android) located and wired into .env; private key loading implemented with PEM format-stripping + Platform.OS token selection; node-forge wired for RSA signing of transaction IDs (forge.pki.privateKeyFromPem → forge.md.sha1 → privateKey.sign → base64); TEST GARMIN button added to Garminmapbox.tsx; app successfully reaching Garmin sandbox server — receiving HTTP 500, root cause identified as encrypted_transaction_id payload format mismatch (padding scheme TBD, next session)
- DFO gap audit (Session 37) — Phase 1: 21 unclear items inspected against source; 2 confirmed (U1 offline storage ✅, U21 single effort per log ✅), 18 promoted to gaps, 1 partial (U6 FIN label i18n key exists but not wired); Phase 2 Batch 1: GEAR_ID (DFO_GEAR_ID=925, Rule 270) and GEAR_GRP_NUM (always 1 for single-effort log, Rule 609x) added to generateElogXml() body and validateElogXml() required-element checks; Phase 2 Batch 2: SAR/MM/LostGear indicator toggle labels replaced with DFO-exact wording (Rules 603/780/606), mandatory follow-up Alert.alert() prompts added on Y selection (Rules 604/781/607), all 6 strings wired through i18n (en/dfo.json form234 namespace, fr stubs as _todo); Phase 2 Batch 3: FIN format validation (Rule 260 — 9 digits | C/D+7 | 5–6 digits | DFOCC+9) added to DfoSetupScreen and CaptainProfileScreen; VRN format validation (Rule 528 — 4/5/6 digits) added to CaptainProfileScreen; real-time inline error text + save guard; isValidFin/isValidVrn module-level helpers
- react-native-localize native linking resolved — clean expo prebuild --clean regenerated ios/ with RNLocalize autolinking; CocoaPods reinstalled (RNLocalize 3.7.0 confirmed in Pods/Manifest.lock); derived data + Metro cache cleared; jsinspector_modern SIGABRT crash resolved; app booting clean on iPhone 17 Pro simulator
- Full French translation complete — fr/common.json (nav, settings, profile, log, bait, errors, common sections), fr/dfo.json (setup, form234, logs, form233, form222, attestation, privacy), fr/map.json — zero _todo values remaining across all three files
- CaptainProfileScreen — all 20 strings wired to i18n
- App.tsx (Settings screen) — all 31 strings wired; useTranslation added; useAuth.ts and useProfile.ts alert strings wired via i18next
- LobsterLogProposalForm.tsx — useTranslation added; all ~67 strings wired
- FullDfoForm.tsx — second useTranslation('common') hook added as tc; all ~72 strings wired
- DfoLogsListScreen.tsx — useTranslation + i18next added; all 35 strings wired including module-level getCountdownLabel
- BaitStats.tsx — useTranslation added; all 8 strings wired
- Garminmapbox.tsx — useTranslation added; all 21 strings wired (TEST GARMIN left hardcoded intentionally)
- Save Preferences button added to Settings screen with language/weight unit save flow
- AttestationModal.tsx — useTranslation('dfo') added; all 5 strings wired to dfo.attestation.*; title/headerSub/text/note/agree updated to match Fisheries Act §49 spec
- PrivacyNoticeModal.tsx — useTranslation('dfo') added; all 12 strings wired to dfo.privacy.* (title, subtitle, 4×section title+body, declineButton, acceptButton)
- LanguagePickerScreen.tsx — created at src/components/LanguagePickerScreen.tsx; app icon + bilingual tagline + EN/FR pill buttons; calls changeLanguage() + sets language_picker_shown in AsyncStorage + calls onDone; shown before auth on first launch via App.tsx
- ProDashboard.tsx — useTranslation('common') + i18next added; all ~38 strings wired to pro.* namespace (upgradeTitle/Body/Button, tideState, wind, gustLabel, seas, swell, windWave, temperature, air, feelsLike, water, first/last light, sunrise/sunset, next4Tides, highTide, lowTide, hourlyForecast, longRangeOutlook, morning, evening, swellLabel, flood, ebb, slack, building, peak, easing, rolling, mixed, choppy, followingSea, crossingSea, windAgainstSea, tideCountdown); tideCountdownRaw struct state replaces string state for render-site translation; seaCharacter/seaAlignment/tidePhase/tideStrength all translated at render site via ternary lookups
- Privacy Notice + Attestation moved to DFO entry — removed from App.tsx modal sequence; both now render inside DfoLogsListScreen.tsx; module-level attestationShownThisSession flag persists across unmount/remount; privacy loads via loadPrivacyAccepted() on DfoLogsListScreen mount
- HLIN/HLOUT FMA gate — FullDfoForm.tsx: both sections now gated by (fmaId === 28599 || fmaId === 1595) replacing isVisible('hlin'/'hlout'); hidden for all other FMAs including null; dfoXmlGenerator.ts: HLIN/HLOUT XML nodes emitted only when Number(d.fmaId) === 28599 || 1595 (Rules 2024/2025, Rule 1018); nodes absent entirely for all other FMAs
- Form 233 button hidden — UN-HIDDEN Session 51 (F233 generator rewritten to real XSD; xmllint validates)
- TripStartConfirmScreen (U3 §12.2) — src/screens/TripStartConfirmScreen.tsx created; sits between "Fill Out New ELOG" tap and FullDfoForm; shows read-only Operator Name, VRN, Licence Number, FIN, Region/Subform, and trip start timestamp (frozen at mount); Confirm & Continue passes ISO timestamp to App.tsx and navigates to dfo-demo; Edit Profile opens CaptainProfileScreen as modal and reloads profile on close; Back returns to dfo-list; AppView extended with 'dfo-trip'; all strings wired to dfo.tripConfirm.* namespace (14 keys, EN+FR, zero _todo)
- Session 42 UI polish (8 changes) — (1) Edit→View for sent logs: DfoLogsListScreen shows Eye+View button for sentToDfo===true logs calling onViewLog; FullDfoForm readOnly prop disables all inputs, date/FMA/LGRID pickers, yes/no toggles, add/delete buttons, save button, and quick capture when true; (2) LFA pre-fill on new log: priority order — last log fmaId, then captainProfile.fmaId; (3) LGRID gate changed from DFO_FMA_LGRID_REQUIRED.has() to (DFO_LGRID_BY_FMA[fmaId]??[]).length>0 — shows for any FMA with a grid list; (4) bait species dropdown wrapped in ScrollView maxHeight 220 for proper scrolling; (5) GPS Capture button added in GPS Coordinates section using existing captureGps() with gpsCapturing loading state; (6) yellow infoBanner removed; (7) ← Back to Logs header added above ScrollView calling onBack prop; (8) Transfers subsection gated with {subformId !== 90 && ...} for MAR
- Session 43 draft auto-save + progress — (1) handleBack() in FullDfoForm saves current state as draft before navigating (guards: !readOnly && isLoaded && !editingCompleted && hasMeaningfulData()); back button wired to handleBack; (2) DfoLogsListScreen: getCompletionDetails() added returning {filled,total,pct}; renderDraftCard updated — blue progress bar, "X of Y fields (Z%)" label (draftProgressDetail key), Edit+Delete buttons (no Resume, no countdown); section header changed from incompleteLogs to inProgress (new i18n key EN+FR); (3) handleSave confirmed status:'complete' — no change needed
- Garmin sandbox HTTP 500 RESOLVED (Session 44) — raw PKCS#1 v1.5 block-type-1, NO SHA1/hashing/digest encryption of the transaction id is the correct scheme; sandbox returned HTTP 201 with purchase_id + expiration_date on June 9 2026; padding/payload no longer blocked
- navionicsStorage.ts (Session 44 / Step 1) — NavionicsPurchase interface (purchase_id, expiration_date, plain_transaction_id [kept for refunds], product_id, stored_at); saveNavionicsPurchase/loadNavionicsPurchase/clearNavionicsPurchase over AsyncStorage key `navionics_purchase`; isNavionicsPurchaseActive(p) returns true only when expiration_date parses and is in the future (guards null/missing/NaN)
- navionicsPurchase.ts (Session 44 / Step 4) — shared service extracted from Garminmapbox; exports generateUUID(), generateGarminEncryptedTransaction() (raw PKCS#1 v1.5 block-type-1, NO SHA1/hashing/digest, moved out of the screen + node-forge import removed there), and runNavionicsPurchase(productId, userId): generates UUID pair → encrypts → POSTs to Navionics sandbox /3rdparty/api/v1/purchase → saveNavionicsPurchase() on 201; never throws (logs silently, returns null) so a Garmin failure can't block paid access; NAVIONICS_PRODUCT_MONTHLY (24d8a68d…) / NAVIONICS_PRODUCT_ANNUAL (24d6f56a…) constants; sole saveNavionicsPurchase() call site in the codebase
- Navionics tile gating (Session 44 / Step 3) — Garminmapbox: navionicsActive state set on mount via loadNavionicsPurchase() + isNavionicsPurchaseActive(); Navionics RasterSource/RasterLayer overlay conditionally rendered only when navionicsActive===true; silent fallback to the Mapbox satellite base when inactive (no error UI)
- Navionics tied to RevenueCat Pro (Session 44 / Step 4) — PaywallModal.handlePurchase: on Pro entitlement active, void runNavionicsPurchase() mapped by pack.packageType (ANNUAL→annual UUID else monthly), user_id = auth.currentUser?.email; usePurchases.restorePurchases: on restore, void runNavionicsPurchase() with Annual fallback (store product ids not yet in constants); both fire-and-forget. TEST GARMIN button wrapped in {false && (…)} (preserved, hidden); testGarminTrialAccess reduced to a thin wrapper calling runNavionicsPurchase
- Navionics renewal (Session 44 / Step 5) — usePurchases addCustomerInfoUpdateListener: maybeRenewNavionics(info) re-provisions when a stored purchase exists, is >1h old (avoids first-purchase race), and RevenueCat expirationDate has advanced past the stored Navionics expiration_date; reuses stored product_id for correct tier; fresh UUID pair; overwrites stored entry; try/catch so it never disrupts the listener
- Garmin/Navionics DEVICE TEST PASSED (Session 47) — full purchase chain proven end-to-end on a physical iPhone: private key loaded from .env → UUID generated → raw PKCS#1 block-type-1 encryption → POST to sandbox → HTTP 201 (purchase_id 210229, expiry 2027-06-10) → saved to AsyncStorage; after a full app restart the mount check confirmed navionicsActive=true with the correct stored purchase. Purchase + activation + persistence all validated on real hardware
- Navionics error handling proven graceful (Session 47) — repeat taps hit server duplicate guards (429 TOO_MANY_REQUESTS, 403 FORBIDDEN "too many days still left"); runNavionicsPurchase logged a warning and returned null without crashing or blocking the user
- navionicsPurchase.ts JSDoc hardened (Session 47) — generateGarminEncryptedTransaction comment rewritten to state the method is raw PKCS#1 v1.5 BLOCK TYPE 1 (NO SHA1 / hashing / digest) — the only scheme the Navionics server accepts (201, purchase_id 207724) — and to NOT convert it to an RSA-SHA1 signature; function body unchanged
- Garminmapbox.tsx TODO(Aldo) on placeholder tiles (Session 47) — comment added above the Navionics RasterSource flagging the tileUrlTemplate as a PLACEHOLDER: wrong host (purchase API, not a tile server) and EXPO_PUBLIC_NAVIONICS_TOKEN undefined (real vars _TOKEN_IOS/_TOKEN_ANDROID); tiles will not render until replaced
- Garminmapbox.tsx TEST GARMIN button visibility (Session 47) — wrapper changed {false && (…)} → {__DEV__ && (…)}: visible in development builds, hidden in production
- Garminmapbox.tsx mount-check debug log (Session 47) — Navionics gate useEffect now logs the loaded purchase and the resulting navionicsActive on mount
- Navionics sandbox product IDs confirmed (Session 47, Mauro) — Yearly 24d6f56a / Monthly 24d8a68d match constants.ts; US & Canada; 7-day trial available; 7-day refund window
- Navionics launch decisions (Session 47) — no free trial at launch (no Navionics TRIAL endpoint needed); free-month promo planned ~Nov 30 2026 as a RevenueCat/App Store introductory offer (dashboard config, not code); CLEAR NAVIONICS dev button considered and skipped (clearing local storage doesn't reset the server-side duplicate timer)
- SOAP envelope rewrite to real DFO contract (Session 50) — generateSoapEnvelope()/generateSoap222Envelope()/generateSoap233Envelope() all rebuilt as SOAP 1.1 SaveIncomingFile (namespace http://tempuri.org/) with three base64 params p_elogkey/p_filename/p_body via shared buildSaveIncomingFileEnvelope() in dfoXmlGenerator.ts (node-forge encode64); invented elog:SubmitElog/elog:Authentication header REMOVED from all three; CIE_ID/SOFT_VER confirmed XML-body-only (web service reads them from GENERAL_INFO per guide §3.1.1); dead CIE_ID='' stubs deleted from 222/233 generators; SOAPAction now "http://tempuri.org/SaveIncomingFile" in DfoLogsListScreen + DfoTestHarnessScreen
- generateDfoXmlFileName(regId, licenceNo) (Session 50) — [RegionalID]-[LicenceNumber]-[YYYYMMDDHHMMSS].XML per Standard v6.1 §3.10, UTC, uncompressed (no 7z); wired into doSubmit, harness, and both form screens (log.regId ?? 1004 / profile.regId)
- parseDfoSoapResponse() rewritten for real WS_RESP contract (Session 50) — handles SOAP faults, WS_RESP arriving XML-escaped inside SaveIncomingFileResult (.asmx behavior), success iff ERR=WS0000 AND CONF present/nonzero (guide §3.1.3 note), collects LGBK_UID[]/REPORT_UID[]; old "unparseable 200 = success" default now a failure; 7/7 behavioral tests against spec sample responses pass; exported from DfoLogsListScreen
- TransmissionRecord gains fileName + confNumber (Session 50) — optional fields (old records still parse); closes part of the Standard §13.3.1 register gap (file name + confirmation number now recorded on both success and failure)
- ValidateElogKey UAT integration (Session 50) — buildValidateElogKeyEnvelope() (trims + UPPERCASES key before base64 per guide §3.2.1 warning) + parseValidateElogKeyResponse() (valid iff ERR=WS1000; WS1001/WS1003/WS1031/WS1036 mapped to spec messages) in dfoXmlGenerator.ts; "Validate ELOG Key (UAT)" card added to DfoTestHarnessScreen (DEV-only) hitting the live UAT .asmx directly — key from EXPO_PUBLIC_DFO_TEST_ELOG_KEY with captainProfile.elogKey fallback; success/failure/error (timeout/network) paths all surfaced in the result box; UAT endpoint reachability verified HTTP 200 from dev machine
- dfoXmlGenerator.ts header bumped v6.0 → v6.1 (Session 50) — v6.1 delta review confirmed only Lost Gear removal (matches existing resolution; required forms now exactly 222 + 233)
- MV_PORT ingestion (Session 53) — MV_PORT_rel7 ingested (3,970 ports) via the extended scripts/generateReftables.js (nullable PROV_CODE_ID, MV_PORT-specific DESC_*→nameEn/nameFr mapping, derived PORTS_BY_PROVINCE); vendored data/dfo-reftables/MV_PORT_rel7.csv (cp1252) → src/data/reftables/mvPort.ts. DFO_MAR_PORT_LIST rebuilt as a FILTERED VIEW of MV_PORT (NS 180 + NB 176 + PEI 188), proven row-for-row identical to the old hand-typed 2,229-row literal three ways (static parse, independent line diff, runtime exec) → ~11k lines removed from dfoConstants.ts; shape { codeId, name, province } preserved (zero behavior change for MAR). MV_PROVINCE left as-is (already ingested Session 51)
- DfoPortSelector (Session 53) — new src/components/DfoPortSelector.tsx: typeahead over generated MV_PORT, province-defaulted per subform (QC→QC, MAR/GLF→NS/NB/PEI, NL→NL) with a search-all fallback, stores { name, codeId }. Shared PortSelector.tsx + LobsterLogProposalForm.tsx (legacy user-facing, 175 live users) left byte-untouched — change scoped to FullDfoForm only. No draft migration (no existing DFO ports to convert)
- PORT_ID integer emission (Session 53) — FullDfoForm carries departurePortCodeId / portLandedCodeId; dfoXmlGenerator emits TRIP.PORT_ID (QC/NL) + LANDING.PORT_ID (all 4 subforms) as integer MV_PORT codeIds. DFO_SUBFORM_FIELD_CONFIG: portId added to visible+required for GLF(89) & MAR(90) (LANDING.PORT_ID XSD-mandatory for all). ALL FOUR subforms now validate against the XSD with real PORT_IDs (no dummy) — Open Question 4 CLOSED. tsc = 33 (baseline, zero new); jest 3/3
- First real UAT transmission (Session 53) — MAR-90, reserved test triplet FIN 100400460 / VRN 1004460 / LIC_NO 1004460, ELOG key WPPBBCKEWTXZSFQBCWRSQVNX, SaveIncomingFile envelope POSTed to the UAT .asmx → HTTP 200, ERR=WS0000, CONF=162836, LGBK_UID ABCDEF. First DFO-accepted logbook. Payload built by the real app functions (generateElogXml→validateElogXml→generateDfoXmlFileName→generateSoapEnvelope); file name 1004-1004460-…​.XML; PORT_ID 20913 (Abbott's Harbour, NS)
- In-app DFO transmission LIVE (Session 54) — both send paths now POST to DFO's UAT server.
  DFO_UAT_ENDPOINT added to dfoXmlGenerator.ts as the SINGLE SOURCE OF TRUTH (beside
  DFO_SOAP_ACTION_SAVE); imported by DfoLogsListScreen (per-log doSubmit) and
  DfoTestHarnessScreen (harness handleFire). Both empty DFO_ELOG_ENDPOINT='' guards removed
  + the harness "no endpoint configured" dry-run branch deleted. FIRST IN-APP TRANSMISSIONS:
  harness MAR-90 → WS0000 / CONF 162838 & 162839; real per-log "Send to DFO" on a fresh
  MAR-90 log (LL-20260614-001) → Submitted. Both the harness path AND the real user-facing
  form path now confirmed end-to-end against UAT. (Resolves both Session 54 known follow-ups:
  harness Fire wiring + stale makeFixtureLog port.) Production endpoint URL still pending — see Not yet built
- XML Test Harness button relocated (Session 54) — moved from DfoSetupScreen to the
  DfoLogsListScreen header (blue pillButton styling, Play icon, __DEV__-gated, opened via a
  harnessVisible state + <DfoTestHarnessScreen onClose> modal, mirroring the old setup-screen
  pattern). Removed the harness button + its now-dead modal/state/import/styles from
  DfoSetupScreen (incl. the newly-unused Modal RN import). setup.harnessButton i18n key left
  in place (now orphaned)
- Inspect / QR inspection button PARKED (Session 54) — hidden behind {false && (…)} in
  DfoLogsListScreen, NOT deleted. InspectionModeScreen + its import, modal JSX, and state
  wiring left fully intact; flip false→true to re-enable. CORRECTION to a prior recon
  assumption: this is a deliberately-built feature (demoed to DFO, no current interest), NOT
  a side-project leftover to remove
- Harness fixtures synced to real ports (Session 54) — makeFixtureLog in DfoTestHarnessScreen
  now sets portLandedCodeId (LANDING.PORT_ID) for ALL four subforms via FIXTURE_LANDING_PORT
  (88 Rimouski 22648 / 89 Aboiteau 19322 / 90 Abbott's Harbour 20913 / 91 Port aux Basques
  21331) + departurePortCodeId (TRIP.PORT_ID) for 88/91; all four xmllint-valid vs the on-disk XSD
- Transfers validation bug fixed (Session 54) — FullDfoForm.tsx:897 transferYes null-check
  gated to subformId===88 (was unconditional, blocking MAR/GLF/NL save/send with "answer Yes
  or No for Transfers" though the UI gate at 1394 + generator at dfoXmlGenerator.ts:310 are
  QC-88-only). Audit confirmed Transfers was the ONLY render-gated-but-validation-ungated
  question; the getRequiredFields(subformId) loop + isRequired('baitEntries') check are
  already subform-aware. tsc=33 baseline, jest 3/3
- Block PCONS SPECIE_SZ_ID for MAR-90 (generator gate at both PCONS sites; value logic untouched; defensive validator guard). **SUPERSEDED by S59 I2:** the field is now emit-89-ONLY / blocked-88-90-91 (row 56), not merely MAR-90-blocked — the S56 MAR-90 block remains in place and is now joined by the 88/91 block + 89-mandatory check (see What's built S59).
- Block CATCH NB_SPCMN_KEPT + NB_SPCMN_DISC for MAR-90 (defensive validator guards; generator never emitted them).
- EFFORT_DETAIL.TRP_SZ_ID for NL-91 (Session 57) — Mandatory for NL(91), Blocked for 88/89/90
  (Subforms_requirements_234.xlsx row 79; values 39682=Standard / 39683=Large, Rule 611, the
  existing DFO_TRAP_SIZE_LIST — no reftable ingestion). Generator emits TRP_SZ_ID gated to
  subformId===91, placed after LAT/LONG before CATCH per XSD sequence (mirrors GEAR_SBTYP_ID);
  validator overlay rejects absent-for-91 ("mandatory for NL(91)") and present-for-88/89/90
  ("blocked"). FullDfoForm: trapSize state + load/buildLogData wiring + FMA-style Standard/Large
  dropdown gated isVisible('trapSize') + handleSave block when empty on NL-91; config
  trapSize added to DFO_SUBFORM_FIELD_CONFIG[91] visible+required and FULL_DFO_REQUIRED_FIELDS[91];
  i18n form234.trapSizeLabel/selectTrapSize (en+fr). Value persists via the data map like every
  other form field (NO top-level DfoLog field — approved). Gate green: tsc=33 baseline (0 new),
  jest 5 suites / 10 tests (new validateTrpSzId guard test 5/5), xmllint all four valid,
  TRP_SZ_ID present NL-91 / absent 88/89/90.
- Confirm + close I1/I2 subform-gating leaks (Session 59) — Phase-1 recon GATE PASSED:
  read Subforms_requirements_234.xlsx (stdlib zipfile+xml.etree) and confirmed both fields
  verbatim. **I2 SPECIE_SZ_ID (row 56): Mandatory GLF-89 ONLY; Blocked QC-88/MAR-90/NL-91**
  (the sheet is STRICTER than the XSD, which lists it optional — overturns the earlier
  88/89/91-emit ruling). **I1 LGRID_ID (row 85): Optional MAR-90 ONLY; Blocked 88/89/91.**
  Generator: I2 both PCONS sites changed `subformId!==90` → `subformId===89` (826/10670 value
  logic for 89 unchanged); I1 LGRID_ID emit wrapped in `if (subformId===90)` (value-gate
  AND-ed in via tag()). Validator: existing S56 MAR-90 SPECIE_SZ_ID block left untouched
  (keeps its "blocked for MAR(90)" message → no S56 regression) + new complementary overlay
  rejects 88/91-present ("blocked for subform N") and 89-missing ("mandatory for GLF(89)");
  new LGRID_ID guard rejects 88/89/91-present ("blocked for subform N"). Two new guard tests
  (validateSpecieSzId, validateLgridId) mirroring the S56/S57 pattern. Full oneoff suite
  7 suites / 19 tests green — S56 (validateMar90Blocks) + S57 (validateTrpSzId) still pass,
  NO regression. Four-subform harness: validateElogXml all four VALID + xmllint all four
  valid. Grep across the four emitted samples: SPECIE_SZ_ID present ONLY in 89; LGRID_ID
  present ONLY in 90 (its fixture sets lgridCodeId=101). tsc=33 baseline (0 new).
- Captain Profile as send source-of-truth + setup→profile seed + pre-send completeness
  gate (Session 61) — **SEED:** DfoSetupScreen's three activate handlers (dev/purchase/restore)
  now also write the profile's real fields on activation — `fishingNumber` ← Licence,
  `licenceHolderFin` ← FIN (one-way, one-time; profile stays freely editable after). The
  `dfo*` copies (dfoLicenceNo/dfoFin) are STILL written too — not retired this session (see
  Not yet built). **REWIRE:** every PRODUCTION reader repointed off the stale `dfo*` copies
  onto the profile — generateElogXml FIN→`licenceHolderFin` / LIC_NO→`fishingNumber`
  (dfoXmlGenerator.ts), DfoLogsListScreen filename arg→`fishingNumber` (XML LIC_NO + filename
  now read the SAME field, closing the 1004460/1004461 filename-vs-XML drift), Form 222
  generator FIN + LGBK_NUM_REF fallback, Form222Screen filename, Form233Screen payload +
  filename + read-only display, TripStartConfirmScreen display rows. VRN untouched (already
  read `vesselNumber`). **GATE:** new `isProfileComplete(profile)` in captainStorage.ts returns
  `{ complete, missing: string[] }` over operatorName/licenceHolderFin/fishingNumber/
  vesselNumber/elogKey/fishingArea/totalGearCount (gearType/language/units do NOT block);
  returns i18n LABEL KEYS (reusing existing common `profile.*` labels — storage stays
  i18n-free). doSubmit calls it right after loadCaptainProfile, before generateElogXml — on
  incomplete: bilingual Alert (new `sendGate.*` keys en+fr dfo.json) listing the missing
  fields, Cancel + "Open Profile" (routes via setCaptainProfileVisible), then return — no POST.
  **VERIFIED:** tsc 33/0-new, jest 7 suites/19 green (7 oneoff fixtures backfilled with
  fishingNumber/licenceHolderFin so they emit real FIN/LIC_NO), xmllint all four logbooks +
  F222(Y/N) + F233 validate with populated identifiers; live GLF-89 UAT send → WS0000, filename
  middle segment = VRN, drift closed; gate blocks an incomplete profile and releases when filled.
- REM (note) emission backend — TRG Logbook test T1 (Session 62). **BACKEND ONLY, no UI yet.**
  STORAGE: new `LogRemarks` type + optional `remarks` field on `DfoLog` (dfoLogStorage.ts) —
  9 human-section keys (trip/bait/haul/catch/landing/hlin/hlout/pcons/transfer), all optional,
  rides along on the existing object (no save/load change, no migration; all 175 users' data +
  existing drafts stay valid). GENERATOR: `generateElogXml` emits `<REM>` at all **13 buildable
  emit sites** via the existing `tag()` (which drops empty/blank → absent note emits nothing),
  grouped at the human-section level — `haul` fans across EFFORT/EFFORT_BY_GEAR/EFFORT_DETAIL,
  `transfer` across TRANSFER/TRANSFER_DTL (QC-88 only), `pcons` into both PCONS nodes (bycatch +
  personal-use). The 13th REM node (SAR) was deferred at S62; **now BUILT in Session 66b — 13/13
  REM nodes closed** (sar key added → LogRemarks = 10 keys). EMPTY-NOTES PROOF: no-remarks XML is byte-identical
  to pre-change output (modulo the pre-existing now()-fallback DG_CLOSE_DT), so the mandatory-only
  T2 path is untouched. TEST: new `genSampleRemT1.oneoff.test.ts` — two fixtures (MAR-90 covers
  11 sites incl. HLIN/HLOUT + both PCONS; QC-88 covers the leftover transfer×2), asserting exact
  REM counts + per-parent-node placement; a French-accented note ("Relâché près de l'île — pêche
  terminée") also exercises T4 (round-trips, `'`→`&apos;`, accents intact); both fixtures validate
  vs the real DFO XSD (REM = string_2000, optional). VERIFIED: tsc 33/0-new; jest 8 suites/21
  tests green; T2 (genSampleAllSubforms all four VALID) + S56/S57/S59 guards unregressed.
- FAIL-row display in transmission register + Log History (§13.3.3) — DONE (Session 64). New
  `indexFailureRecords()` (one row per failed attempt, newest-first) beside the byte-untouched
  `indexSuccessRecords()`; SentLogCard + SentLogDetailModal badge conditioned on `record.outcome`
  (green Accepted vs red Failed + `errorMessage` row on the fail path). DfoLogsListScreen renders a
  FAILED TRANSMISSIONS section sourced from the persisted register via `indexFailureRecords(loadTransmissionRegister())`
  — so failures SURVIVE an app restart (the in-memory `failedSends` retry state does not); LogHistoryScreen
  interleaves collapsed success rows + per-attempt fail rows, newest-first. §13.3.3 fail-row requirement
  satisfied. tsc 33/0-new, jest 21/21. Committed 8829a1f.
- Per-section "add a note" UI (REM) + Close/Unlock removal — DONE (Session 65). Deleted the Close/Unlock
  mechanism from FullDfoForm (button, sectionClosedAt state, lock, dgClose* writes/restore, styles, dead
  i18n keys). Added a header-right "Add a note" affordance (`renderNoteButton`/`renderNoteInput`,
  collapsed-by-default multiline) on Trip, Timestamps(landing), Catch&Effort(writes BOTH haul+catch),
  Bait, Interactions(pcons), Transfers(QC-88), HLIN, HLOUT — each writing `log.remarks[<key>]`, seeded
  on edit, persisted through ALL THREE save objects (draft/back-auto-save/complete) via `buildRemarks()`.
  SAR note added Session 66b (10th key). tsc 33/0-new, jest 21/21. Committed f71bcd2.
- MV_SAR_LIST generated reftable + SAR species repoint — DONE (Session 66a). MV_SAR_LIST_rel8.csv
  (16 official species-at-risk codes) staged to data/dfo-reftables/ + registered in generateReftables.js
  → src/data/reftables/mvSarList.ts (`DfoSarList`: codeId/descFr/descEn). SAR species dropdown repointed
  off the demo `SAR_OPTIONS` and the partial hand-written `DFO_SAR_SPECIES_LIST` (BOTH RETIRED from
  FullDfoForm.tsx + dfoConstants.ts) onto MV_SAR_LIST (displays descEn, stores codeId → real SPECIE_ID).
  `renderIncidentFields` parameterized (string[] | coded {codeId,descEn}[], normalized internally) so the
  Marine Mammal call site stays byte-identical. The independent legacy `SAR_OPTIONS` in
  LobsterLogProposalForm.tsx is NOT touched. Codegen re-stamps the date header on all generated modules
  (expected churn). tsc 33/0-new, jest 21/21. Committed c3353f7.
- SAR detail node (sar_type) — DONE (Session 66b). `generateElogXml` emits `<SAR>` gated on SAR_IND='Y'
  (ABSENT when N/null), children in XSD sequence: SAR_DT(date_12 from sarDate/sarTime), LAT/LONG (raw with
  required MODE=G/M via the new `sarGpsSrc` provenance flag, mirroring EFFORT_DETAIL), SPECIE_ID (MV_SAR_LIST
  codeId), NB_SPCMN, SPCMN_COND_ID (MV_SPECIMENS_CONDITION), DG_CLOSE_DT (auto-stamp), REM (rem.sar — closes
  13/13 REM nodes); WT omitted (optional). New capture UI: NB_SPCMN (numeric renderField) + SPCMN_COND_ID
  (coded dropdown) gated sarYes===true, rendered OUTSIDE the shared renderIncidentFields (MM untouched);
  handleSave gate blocks SAR=Y with any missing mandatory SAR field (`missingSarFields` i18n). Validator SAR
  spec needed NO change. New genSampleSarS66b.oneoff.test.ts (present-when-Y / absent-when-N); /tmp/sample_sar.xml
  XMLLINT-VALID against the real logbook XSD (manual gate). tsc 33/0-new, jest 9 suites/23 tests. Committed f0d1142.
- NL-91 GEAR_SBTYP_ID UI wiring — DONE (Session 67). Completes the mirror of the S57 TRP_SZ_ID pattern:
  the backend was already built in the v234.11 audit (generator emit gated subformId===91 at
  dfoXmlGenerator.ts:239 + NL-mandatory validator + DFO_GEAR_SUBTYPE_LIST), and the MISSING half was the UI.
  Added a "Gear Subtype" picker in FullDfoForm.tsx gear/effort section gated isVisible('gearSubtypeId')
  (→ NL-91 only; placed right after the trapSize picker), options from DFO_GEAR_SUBTYPE_LIST (39684 Wooden /
  39685 Wire mesh / 39686 Both — confirmed correct vs the qualified Jobel app), displays DESC_ENG,
  value=codeId, writes d.gearSubtypeId; gearSubtypeId state + load + buildLogData + fieldCheckMap wiring.
  Registered in DFO_SUBFORM_FIELD_CONFIG[91] visible+required AND FULL_DFO_REQUIRED_FIELDS[91] (mirrors
  trapSize) so handleSave shows the friendly in-form prompt instead of the raw "GEAR_SBTYP_ID is required for
  NL(91)" validator string; EN+FR picker keys gearSubtypeLabel/selectGearSubtype. Validator: ADDED the
  blocked-direction guard (present-on-88/89/90 → "blocked for subform N"), so GEAR_SBTYP_ID is now
  two-direction like TRP_SZ_ID/LGRID_ID/SPECIE_SZ_ID (previously NL-mandatory direction only). No note
  affordance / no new REM key (section-header note already exists; sibling trapSize has none). tsc 33/0-new,
  jest 9 suites/23 tests.
- Form 222 + 233 wired to real transmission via shared submitDfoXml() — DONE (Session 69, Scope A).
  New UI-free, store-agnostic src/utils/submitDfoXml.ts: submitDfoXml({soap,xml,fileName,recordId,logId,
  endpoint?,actionHeader?,snapshot?}) mirrors the logbook doSubmit transport EXACTLY (fetch + 30s
  AbortController, same headers/SOAPAction) → HTTP≥400 writes a failure TransmissionRecord → HTTP 200
  parseDfoSoapResponse → on !success writes a failure record → on success writes a success record + 
  saveXmlArchiveEntry; outer catch (timeout/network) writes a failure record. Failure record built ONCE
  (buildFailureRecord) and persisted via the exported saveTransmissionRecord — no divergent writes.
  Returns typed { ok, errCode?, confNumber?, errorMessage?, httpStatus? }. snapshot?:{vrn,tripNum,xsdValid}
  threaded undefined-safe onto BOTH records (the param the logbook will pass when it converges).
  parseDfoSoapResponse RELOCATED out of DfoLogsListScreen into this util (now defined in exactly one
  place; DfoLogsListScreen imports it — import-source only, zero doSubmit logic change). Both form screens
  drop the fake-send (build envelope → discard → unconditional "Submitted") and call submitDfoXml with the
  FORM222-/FORM233- prefixed record id + snapshot:{vrn:profile.vesselNumber}; success path marks
  sentToDfo/saves the entry, failure path surfaces errCode/httpStatus/errorMessage and does NOT mark sent;
  screens no longer call saveXmlArchiveEntry directly (the helper owns the archive on success). New
  submitDfoXml.oneoff.test.ts (mocks global.fetch + the storage writes): WS0000+valid CONF → ok, ONE
  success record, archive written, snapshot.vrn on the record; HTTP 500 → !ok, ONE failure record, NO
  archive; HTTP 200 + ERR≠WS0000 → !ok, ONE failure record, NO archive. tsc 33/0-new, jest 10 suites/26
  tests. (S70 UPDATE — both paths now LIVE-SENT WS0000 against UAT after the Rule 528 form-VRN gate +
  WS1038 coordinate clamp landed; see the Session 70 What's built entry.)
  Scope B (form rows rendering in the transmission register; TransmissionRecord `kind` field +
  register list-join) is now DONE — Session 71 (see the Scope B What's built entry). The
  logbook-convergence follow-up (point doSubmit at submitDfoXml, threading vrn/tripNum/xsdValid via
  snapshot; dedup the duplicated SEND_TIMEOUT_MS) remains deliberately NOT started.
- Form-path hardenings: WS1038 coord clamp + Rule 528 VRN gate — DONE (Session 70). Both 222 AND 233
  now LIVE-SENT WS0000 against UAT (222 CONF 162859/162861, 233 CONF 162860; VRN 104460 6-digit;
  confirmed in the on-device transmission register). Two form-path-only changes, logbook (234) UNTOUCHED:
  (A) **WS1038 root cause** (a hand-typed 14-decimal LAT / 13-decimal LONG — the live 222 failed because
  the XSD LAT/LONG types allow ≤4 decimals) fixed via new exported `clampCoord4()` in dfoForm222Generator.ts,
  applied at LAT/LONG emit (rounds to 4 dp WITHOUT padding trailing zeros — ≤4-dp values pass through
  unchanged, leading minus preserved; emit-only, stored/displayed value never mutated); first live 222
  WS0000 carried a raw 16-decimal coordinate auto-clamped. Coordinate validators TIGHTENED to the real XSD
  ranges (lat 38-72, lon -148..-40; were the wider 40-70 / -165..-35) in BOTH validateForm222Xml (generator,
  + a ≤4-decimal backstop) AND the screen real-time handleLatChange/handleLonChange; EN+FR latError/lonError
  strings updated to the new ranges. (B) **Rule 528** (VRN digits-only, 4-6 digits — FS-NAT-222-1-EN.pdf /
  FS-NAT-233-2-EN.pdf; ABSENT from the 234 package) enforced via new exported `isValidFormVrn` (`/^\d{4,6}$/`)
  in submitDfoXml.ts (one definition, both screens import), as a HARD send-time block at the top of each
  screen's handleSubmit (bilingual sendGate.vrnRule528 Alert, RETURN before envelope/submitDfoXml — no send,
  no mark-sent, no archive). The logbook CaptainProfileScreen `isValidVrn` LEFT permissive (1-12 alphanumeric,
  string_12) deliberately — its stale "could not be verified / flagged for Kane" comment corrected to state
  Rule 528 is form-only and enforced separately. New formVrnAndCoordClamp.oneoff.test.ts (isValidFormVrn
  accept 104460/10446/1044 reject 1004460/104/10446a/""; clampCoord4 43.36526203525844→"43.3653",
  -65.6353660736118→"-65.6354", ≤4-dp unchanged, minus preserved). tsc 33/0-new, jest 11 suites/32 tests.
- Scope B — render Form 222/233 rows in the transmission register — DONE (Session 71). Closes the
  S69-deferred Scope B register-display half. DATA LAYER: optional `kind?: 'logbook'|'form222'|'form233'`
  added to TransmissionRecord + exported `transmissionKind(record)` (dfoLogStorage.ts) — prefers the
  explicit kind, falls back to the FORM222-/FORM233- logId prefix so pre-existing records (the S70 live
  sends) classify with NO migration / NO re-send; submitDfoXml gained an optional `kind` arg threaded
  undefined-safe onto BOTH the success and failure records (alongside snapshotFields), and the two form
  screens now pass kind:'form222'/'form233'. CARD: new standalone src/components/FormSentCard.tsx (single
  `record` prop, NO backing DfoLog — title from transmissionKind, date/vrn/badge/conf/error styling
  MIRRORED from SentLogCard, which is NOT edited) + EN/FR i18n keys (logs.regForm222Title /
  regForm233Title / regErrorLabel). WIRING: both list screens load the raw register into state and derive
  formRecords = register.filter(r => transmissionKind(r) !== 'logbook'); DfoLogsListScreen interleaves form
  successes into the SENT section + form failures into the FAILED section (by attemptedAt; logbook 30-cap
  unchanged, form rows uncapped on top — per decision); LogHistoryScreen merges form rows into its single
  chronological `rows` list via a kind-discriminated union + a matchesSelectionTs(attemptedAt) month/year
  filter (form-record years feed the YEAR dropdown). Logbook rows, doSubmit, and all send/submit logic
  UNTOUCHED; form records never route through logById (no double-count). Mammals T9 register-screenshot half
  UNBLOCKED — form records now render in BOTH register screens; verified on-device (S70 CONF
  162859/162861/162860 visible in SENT). New transmissionKind.oneoff.test.ts (prefix fallback ×3 +
  explicit-kind-beats-prefix). tsc 33/0-new, jest 12 suites/36 tests.
- QC-88 GRID_ID (EFFORT_DETAIL.GRID_ID) end-to-end — the "A2" build (Session 83). Rules
  1011/1012/613x/614x. P1 constants (dfoConstants.ts): DFO_GRID_BLOCKED_FMA (29 Rule-1011 QC
  FMAs — grid blocked) + DFO_FMA_GRID_MAP (11 required QC FMAs → map digit "4" = LFA 22 / "1" =
  the twelve 18-series); 29 + 11 = the 40 QC LFAs, zero overlap (recon docs/RECON_grid_id_S83.md
  + docs/RECON_grid_orphan_check_S83.md). P2 UI (FullDfoForm.tsx + dfoLogStorage.ts + en/fr
  dfo.json): FMA-gated GRID_ID picker — subform 88 && fmaId ∈ DFO_FMA_GRID_MAP (map-membership IS
  the required-&-not-blocked gate; the 29 blocked FMAs are absent from the map so the picker never
  shows, Rule 1011); options = MV_GRID rows whose DESC_FRE leadchar = the map digit ("1" ≈ 3259
  rows); search box + Modal overlay with a virtualized FlatList (resolves the nested-VirtualizedList
  warning the inline list threw); save-gate (gridId in FULL_DFO_REQUIRED_FIELDS[88] + fieldCheckMap
  + fieldLabels); i18n form234.gridLabel/selectQcGrid (FR pending proofread). ALSO: the LFA picker
  lists are now natural-sorted (compareFmaLabel + fmaOptions, all four regions, display-time only,
  reorder-safe — selection stores codeId) so "20a10" sorts after "20a9a", not after "20a1" (recon
  docs/RECON_lfa_picker_S83.md). P3 generator + validator (dfoXmlGenerator.ts): emit <GRID_ID> in
  the EFFORT_DETAIL slot after LGRID_ID, before GEAR_GRP_NUM, gated subform 88 && fmaId ∈ map;
  validator Rule 1011 (blocked → absent) / 1012 (required → present) / 613x/614x (present value's
  MV_GRID leadchar must equal the FMA map digit). Guard test gridId.oneoff.test.ts (5 cases:
  present-valid, blocked-absent, wrong-digit→613x, required-absent→1012, blocked-present→1011).
  tsc 33/0-new, jest 17 suites/55 tests. Committed 3c9a77d, pushed origin/main. LIVE: two WS0000
  vs UAT — CONF 163015 (grid present, LFA 22 / map "4") + CONF 163016 (grid absent, LFA 17b /
  blocked). Supersedes the S73 "QC GRID_ID diagnosed optional + data-blocked" note.
- DFO Cloud Backup — optional, opt-in, best-effort write-through (Sessions 84–85; all
  committed + pushed to origin/main). PURPOSE: a harvester who loses/replaces a phone can
  sign in on a new device and recover their DFO data (restore is Phase 3, not yet built).
  TARGET DB: the **dfo-elog** named Firestore database (northamerica-northeast1), under
  `backups/{uid}/stores/{storeId}` keyed to the Firebase auth UID (the SAME UID the free/Pro
  side uses). Free/Pro data on **(default)** is never touched. SCOPE: the 7 DFO-side stores
  (`@lobsterlog:dfo_logs`, `@lobsterlog_xml_archive`, `@lobsterlog_transmission_register`,
  `@lobsterlog:captain_profile`, `@form222_entries`, `@form233_entries`,
  `@lobsterlog:saved_crew`) — hardcoded set (three different key conventions, a prefix filter
  would miss the form stores); EXCLUDES `@lobsterlog:saved_ports` (legacy free-app) and
  `@lobsterlog:privacy_accepted` (device UX flag). Recon basis: docs/RECON_dfo_backup_S84.md +
  docs/RECON_writethrough_S85.md.
  • PHASE 1 (c761acb) — foundation: src/utils/dfoBackup.ts (store list, path shape, types,
    getDfoBackupDb(), loadBackupConsent/saveBackupConsent default OFF); consent toggle card +
    BackupExplainerModal on CaptainProfileScreen; firestore.rules + firebase.json (UID-scoped,
    dfo-elog only). No cloud I/O yet — console Writes stay flat.
  • PRIVACY (bfd8a1e) — reworded privacy.section2/3/4Body (en+fr dfo.json) to truthfully
    disclose optional Cloud Backup, name Google Firebase as the processor, and give a
    cloud-copy deletion contact (lobsterlog.app@gmail.com). FR uses curly U+2019 + «».
  • PHASE 2 STEP A (8a2fe00) — write-through: backupAllStores(uid) (raw VERBATIM, byte-exact
    round-trip), triggerBackup() (fire-and-forget, consent+uid gated, terminal .catch — can
    NOT throw/reject into a caller), backupNow() (manual, awaited, returns {ok,reason}). FOUR
    hooks fire triggerBackup() AFTER the local persist succeeds: FullDfoForm complete-save
    (after saveLog, in `if (ok)`), DfoLogsListScreen doSubmit (after markSentToDfo),
    Form222Screen (after saveForm222Entry), Form233Screen (after saveForm233Entry). The shared
    saveLog in dfoLogStorage.ts is deliberately NOT hooked (it's shared with the legacy
    proposal form). "Back up now" button on CaptainProfile (backup.* i18n keys). Force-failure
    tested with a temporary throw stub (added + removed, never committed): a backup failure was
    invisible to save and send.
  • ONE-OFF FROM OFF (61b71a3) — backupNow(alreadyConsented=false): the consent gate is now
    wrapped in `if (!alreadyConsented)`, so an explicitly-confirmed one-off can bypass standing
    consent (the auto path's gate + triggerBackup are untouched). "Back up now" is visible in
    BOTH toggle states; OFF-state tap shows a per-tap confirm (oneOff* i18n keys) → on confirm
    calls handleBackupNow(true) → backupNow(true). The consent toggle is NEVER flipped by the
    one-off; auto-backup stays off. tsc 33/0-new across all of S84–85.
  • PHASE 3 RESTORE (51e962e, S86) — restoreAllStores(uid) + isDfoLocalEmpty() in dfoBackup.ts.
    Auto-fires after sign-in (App.tsx effect, once-per-uid guard) ONLY when all 7 local DFO
    stores are empty. Two-phase: fetch all 7 cloud docs first, then write — ANY fetch error
    aborts with ZERO local writes (never a partial download); absent/empty cloud docs restore
    as empty. Phase B hardened to batched AsyncStorage.multiSet (data) + multiRemove (empties);
    the window BETWEEN the two batches is a documented residual non-atomic gap, bounded by the
    empty-local gate — NOT eliminated (AsyncStorage has no transaction). Quiet success banner on
    restoredCount>0, silent otherwise. Verbatim round-trip proven on real device data (5 MAR-90
    logs; sentToDfo + lgridCodeId/lgridDisplay survived byte-for-byte).
  • DELETE-WIPES-CLOUD + REAUTH (737ee5d, S86) — wipeAllStores(uid) enumerates + deletes all 7
    store docs (no Firestore cascade) then the parent backups/{uid} doc; block-and-retry —
    SURFACES failure (returns {ok:false}) rather than swallowing. Delete Account handler reworked:
    confirm → password prompt → reauthenticateWithCredential → ONLY on success → wipeAllStores →
    deleteDoc(users/{uid}) → deleteUser → clearLocalDfoStores(). Fixes a real torn-delete bug
    (deleteUser bounced on auth/requires-recent-login AFTER profile + cloud were already gone).
    Cross-platform: replaced the iOS-only Alert.prompt with a generic reusable
    src/screens/ReauthPasswordModal.tsx (props-driven, no feature copy inside, inline error +
    stays open on wrong password). Verified iOS sim AND physical Android: reauth-fail destroys
    nothing + retries clean; correct password sweeps account + cloud + profile + local. Gating
    re-verified line-by-line after every handler change.
- Multi-day (cross-midnight) trip timestamps — DONE (Session 90). Root cause (S89 recon,
  docs/RECON_multiday_S89.md): the four EFFORT/TRIP/LANDING timestamps shared ONE trip date
  (dateFished) at UI, storage, and generator layers, so a sail-late-Day-1 / haul-Day-2 trip
  was unrepresentable and the ordering validators (Rules 29/32/45/46) fired false "before"
  errors. FIX (Design A, per-field companion dates): FullDfoForm carries sailDate/haulStartDate/
  haulEndDate/landingDate as companion keys in the existing `data` map (NO DfoLog interface
  change — same pattern as trapSize/gridId/statSectId); the datetime picker's applyPickerValue
  writes each field's OWN date (sail-start additionally drives dateFished, the trip's nominal
  date); openPicker seeds each wheel from its own date `|| dateFished`. Generator combines
  `d.<field>Date || log.dateFished` per field (dfoXmlGenerator.ts:90–93) — the fallback makes
  same-day trips, quick-capture, and OLD pre-S90 logs emit byte-identically (proven via
  launderSweep/blankTimestampGate + a temp cross-midnight harness: sail 23:30 D1 / haul 02:00
  D2 → valid ordered date_12, validator passes). Phase 1b: Quick Capture handlers stamp each
  field's companion date from the same now() at button-press; the Rule 980 >24h-landing warning
  repointed to `landingDate || dateFished`. Blank-timestamp save-gate UNCHANGED (still keyed on
  the HH:MM time fields → a blank time still blocks). tsc 33/0-new, jest 55/55. Committed 6834bd8.
  CARRIED OPEN: cross-midnight LIVE 234 send banked until UAT recovers (see Pending). Reports:
  docs/GATE1b_S90.md.
- Shared coordinate clamp on the 234 path — DONE (Session 90, closes the S70 divergence). The
  222/233 path clamped LAT/LONG to the XSD's ≤4-decimal limit (clampCoord4) but the 234 logbook
  emitted them RAW, so a MAR FMA-38b log with a high-precision GPS read could draw WS1038. Moved
  the single clampCoord4 definition (body byte-identical) into dfoConstants.ts — cycle-safe
  (importing it into dfoXmlGenerator from dfoForm222Generator would have been circular, since the
  222 generator already imports from the 234 generator); both generators + the oneoff test now
  import from dfoConstants (no second copy). Applied to the 234 LAT/LONG emit
  (dfoXmlGenerator.ts:288–289), matching the form path exactly (43.8237491→43.8237, minus
  preserved, ≤4dp unchanged). Emit-only; only MAR FMA-38b logs emit LAT/LONG. tsc 33/0-new, jest
  formVrnAndCoordClamp 6/6. Committed 6834bd8. Report: docs/GATE_C_S90.md.
- Form 222 marine-mammal reference trio (ID_CNFDNCE_ID / SPCMN_COND_ID / BDY_LEN_ID) — DONE
  (Session 90; gates Mammals TRG T1/T3, wired per docs/RECON_222_reftables_S89.md). The three
  MV_* tables (MV_CONFIDENCE_LEVEL → ID_CNFDNCE_ID, MV_MM_SPECIMENS_CONDITION → SPCMN_COND_ID [the
  MM table, NOT the SAR-side MV_SPECIMENS_CONDITION], MV_MM_LENGTH_CATEGORY → BDY_LEN_ID) were
  generated-but-dead; now wired end-to-end. dfoForm222Generator: 3 label lists (CONFIDENCE_LEVELS/
  SPECIMEN_CONDITIONS/LENGTH_CATEGORIES + *_LABELS mirroring MARINE_MAMMAL_SPECIES), 3 OPTIONAL
  Form222Entry fields, emit label→codeId via tag() (omits when unset) in verified XSD sequence
  order (NOAA_SPECIE_COD → ID_CNFDNCE_ID → SPCMN_COND_ID → NB_SPCMN_BEST → BDY_LEN_ID, 39588.222
  lines 247–259). Form222Screen: 3 renderDropdown pickers in the Species card (only when
  INTERACT_IND=Y), own open-states wired into the mutual-exclusion close logic; option rows are
  bilingual free (reftable descFr). i18n: 6 EN keys (no `*`, optional); 6 FR _todo stubs.
  Verified: xmllint validates WITH trio set AND with it fully omitted; codeId resolution correct;
  tsc 33/0-new, jest 55/55. LIVE-PROVEN: set-trio 222 → WS0000 CONF 163057 (codeIds 39600/39622/
  39602 confirmed in the archived sent XML via on-device AsyncStorage grep); blank-trio 222 →
  WS0000 CONF 163060 with clean omission. Committed 6834bd8. Report: docs/GATE2_S90.md. CARRIED
  OPEN: confirm the confidence codeId (39600=Uncertain observed vs 39598=Probable) matched the
  actual on-device pick; 222 FR labels still stubs (see FR pile).
- DFO UAT 234 regression — DOCUMENTED (Session 90; recon/debug, no app fault). As of 2026-07-02
  every 234 logbook send returns WS1038. Proven server-side: a byte-identical re-send (fresh
  filename) of content DFO accepted 07-01 (CONF 163045) was rejected WS1038 (CONF 163055); the
  document validates against our on-disk XSD and is structurally identical to the 07-01 success;
  the S90 timestamp change emits byte-identical XML for these same-day trips; a 07-02 Form 233
  send returned WS0000 (DFO UAT is up). Conclusion: DFO deployed a stricter 234 XSD/validation on
  ~07-02. Reported to Kane (Ticket #2126), triage acknowledged. NEW ERROR CODE banked: WS1034 =
  "same file name already received by DFO" — checked BEFORE content validation, so a byte-exact
  resend never revalidates (always use a fresh filename to test content). NEW AUTHORITY
  TECHNIQUE banked: a FAILED send's XML lives in the register record's `xmlSnapshot`
  (@lobsterlog_xml_archive is success-only); read via `xcrun simctl get_app_container booted
  com.Nickerson.LobsterLog data` → Library/Application Support/<bundle>/RCTAsyncLocalStorage_V1/
  (manifest.json + md5(key) files, keys uid-namespaced <base>::<uid>). Full evidence:
  docs/WS1038_S90.md. See Pending for the blocker.
- Pre-ship UI batch — DONE (Session 91, July 2 evening). Four device-gated fixes shipped ahead
  of the 234.12 absorption. PHASE 1 (register refresh, commit 0aeff52): the transmission register
  now refreshes on the Form 222/233 modal's onClose, so a just-sent form row appears without a
  manual reload; device-gated live 233 → WS0000 CONF 163061. PHASES 2+3 (combined commit 2581e5e):
  removed the "22 fields" banner (the block + 2 i18n keys EN/FR + 3 orphaned styles) and added a
  bottom Cancel to the GRID_ID picker modal (sheet pattern); the STAT_SECT picker was confirmed
  correct as-is (no change). PHASE 4+4b (commit 1994bd2): the header clipboard control replaced
  with a labeled "DFO ELOG" pill (#DC2626, glyph toggles, routing preserved verbatim), identity
  block enlarged; three device-gated iterations; new key common.nav.dfoElog (FR _todo). Confidence-
  mapping check CLOSED — string-keyed lookup confirmed, CONF 163057 = Uncertain (settles the S90
  CARRIED-OPEN 39600-Uncertain-vs-39598-Probable question). Recon docs committed 869208c.
- 234.12 DFO package received from Kane — root cause of the S90 234 UAT regression NAMED
  (Session 91). LOST_GEAR_IND flipped Mandatory→Blocked (maxOccurs=0) in the 234.12 XSD, so every
  234 logbook send since 07-02 bounces WS1038. Production cutover 2026-08-27; UAT already enforcing
  since 07-02. Absorption (de-emit LOST_GEAR_IND + UI removal, xmllint-gated before any generator
  edit, then a live recovery 234 send) is the Session 92 work — see Current session goals. NEW HARD
  RULE established this session: Claude Code runs NO state-changing git (add/commit/amend/push/reset)
  and NO live DFO POST — it hands over vetted literal commands and Jonny runs them.
- 234.12 absorption — RECON + SETUP COMPLETE, de-emit deferred to S93 (Session 92; NO source
  file touched). Also landed the missing S91 CLAUDE.md closeout (commit 32c03ae) — it had been
  dictated at S91's close but never written; the clean-working-tree Step-0 check caught it.
  PACKAGE FILED: NEW 234.12 at `~/Desktop/DFO/ELOG_F234/` (XSD …20260624, instructions 234.7),
  OLD 234.11 preserved byte-for-byte at `~/Desktop/DFO/ELOG_F234_old_234-11/` (XSD …20260130,
  instructions 234.6) — folder names FLIPPED vs the original plan → DISAMBIGUATE BY XSD FILENAME
  DATE, never folder name. Stale CLAUDE.md XSD path refs fixed (commit ac482bb: Session-48
  checkpoint authority path + the S92 goals block). ARTIFACT-BEFORE-EDIT xmllint proof (commit
  ed86b15, docs/RECON_234_12_xmllint_S92.md): extracted read-only from on-device AsyncStorage a
  07-02 REJECTED 234 (LL-20260702-003, register xmlSnapshot) + the 07-01 ACCEPTED (LL-20260701-001,
  CONF 163045, xml_archive). Both FAIL the NEW XSD; the rejected doc still PASSES the OLD XSD (valid
  under 234.11 — server changed, not us); removing the single <LOST_GEAR_IND> line makes it validate
  clean against the NEW XSD. FULL XSD DIFF — the SOLE breaking change is LOST_GEAR_IND maxOccurs
  1→0; the SOAKED_DUR integer_5→integer_05 / NB_GEAR_HLD integer_4→integer_04 renames are
  NON-BREAKING (min 1→0 relaxation, no width change → NO code change). GOTCHA banked: libxml2
  blames MM_INTER_IND (the element AFTER the maxOccurs=0 one, a sequence-desync artifact) — the XSD
  diff is the authority, don't chase MM_INTER_IND. Raw docs/s92_*.xml artifacts gitignored; the
  recon .md is the committed evidence.
- 234.12 ABSORBED — LOST_GEAR_IND de-emit + timestamp display + regression guard (Session 93;
  committed 748340e, pushed origin/main). CLOSES the 07-02 WS1038 234 regression (root cause:
  LOST_GEAR_IND Mandatory→Blocked, maxOccurs 1→0 in the 234.12 XSD; S92-confirmed
  docs/RECON_234_12_xmllint_S92.md). GENERATOR (dfoXmlGenerator.ts): dropped the lostGear
  derivation + the unconditional <LOST_GEAR_IND> EFFORT emit (all four subforms); validator
  EFFORT_SPEC LOST_GEAR_IND min:1,max:1 → **min:0,max:0** (Blocked — passes when absent, rejects if
  ever present with "too many <LOST_GEAR_IND>"; no other field's emit moved). UI (FullDfoForm.tsx):
  removed the Lost/Found Gear question for ALL FOUR subforms — state (6 useState), load branch,
  buildLogData write-out, handleLostGearYes, both picker cases (openPicker/applyPickerValue),
  'lostGearTime' from the PickerField union, renderLostGearFields, the render <View> block, and
  lostGearYes from the mandatory-indicator save gate; SAR_IND/MM_INTER_IND untouched + still init
  null (modified Rule 602). i18n: 6 orphaned form234 keys removed EN+FR (lostGear [already-orphaned
  pre-S93] / lostGearIndLabel / lostGearIndPrompt / gearTypeLabel / gearTypePlaceholder /
  lostGearSubsection; shared dateTimeLabel/gpsLocationLabel/lat+lngPlaceholder KEPT), and
  missingIndicatorsAnswer reworded to drop "and Lost Gear" / "et les engins perdus ou trouvés" (the
  gate no longer checks it). GUARD: new src/utils/__tests__/deEmitLostGear.oneoff.test.ts — 8
  absence tests (4 subforms × lostGearYes 'true'|'false', proving stored input can't resurrect the
  element) + 1 blocked-direction (inject LOST_GEAR_IND → validateElogXml invalid, "too many"); jest
  17/55 → **18/64**. TIMESTAMP DISPLAY: display-only formatDateTimeDisplay helper — the four trip
  timestamps (Time Sailed / Started Hauling / Stopped Hauling / Landing) now render locale-aware
  date+time ("Jul 5, 12:33" EN / "5 juill., 12:33" FR via i18n.language→fr-CA/en-CA), combining each
  field's companion date (fallback dateFished) with its HH:MM; storage, companion-date keys, and the
  generator UNTOUCHED. GATES: xmllint all four subforms VALID vs the NEW XSD (…20260624),
  LOST_GEAR_IND absent; tsc 33/0-new; jest 18/64. LIVE RECOVERY SEND: LL-20260704-001, Trip #9,
  MAR-90 (VRN/LIC 104460), filename 1004-104460-20260705153219.XML → WS0000 CONF 163081 (July 5).
  ARCHIVE-GREP (read-only, docs/ARCHIVE_GREP_RECOVERY_S93.md): the recovery entry's actual sent bytes
  carry ZERO LOST_GEAR_IND (EFFORT seq FMA_ID→SAR_IND(N)→MM_INTER_IND(N)→DG_CLOSE_DT); whole-archive
  substring count 12, ALL from the six pre-fix logbook entries (idx 0–5), every post-fix entry clean.
  Ticket #2126 CLOSED (thank-you email to Kane citing CONF 163081; Change Management Document
  downloaded + filed). Q-LCSG CLOSED (MV_LCSG_VS_FMA_rel3.csv found in ~/Desktop/DFO/ELOG_reftables/
  — ingestion is a future item). Reports: docs/GATE_234_12_DEEMIT_S93.md +
  docs/ARCHIVE_GREP_RECOVERY_S93.md. CARRIED OPEN: the recovery was SAME-DAY, so the cross-midnight
  live send (sail 23:30 D1 / haul 02:00 D2) is still banked — rides the TRG sweep.

---

## Not yet built
- DFO storage NAMESPACING — uid-scope the 7 DFO store keys (CARRIED INTO S87, the big
  remaining isolation piece; NOT started). Today the 7 keys are fixed (@lobsterlog:dfo_logs
  etc.), so two accounts on one device would share one set of logs/settings. Goal: per-uid
  keys (@lobsterlog:{uid}:...) so accounts COEXIST on one device — each sees only its own data,
  free sign-in/out, NO data loss (coexistence, NOT clear-on-mismatch). Needs a READ-ONLY RECON
  FIRST: every DFO store read/write call site across the app (form save, logs list, 222/233,
  transmission register, captain profile), what's on-device under today's fixed keys (migration),
  and where sign-out lives. Heavy multi-call-site build — a missed call site is a silent
  isolation hole. Recon-only first; build is its own session.
- FR proofreader pile — _todo French stubs accumulated across S84–86 (and now S90), awaiting
  the reviewer: backup.* (oneOff* + restoredNotice), account.* (reauthTitle/reauthPrompt/
  reauthConfirm/reauthFailed) + the ReauthPasswordModal copy, the reworded privacy notice FR,
  and (S90) the 222 trio field labels form222.confidenceLabel/confidencePlaceholder/
  specimenCondLabel/specimenCondPlaceholder/lengthCatLabel/lengthCatPlaceholder in fr/dfo.json
  (English text + " _todo" marker; the picker OPTION rows are already FR from the reftables'
  descFr — only the labels need translating). (The S39 "zero _todo" record below predates these.)
- Real DFO PRODUCTION endpoint URL — still pending from DFO. In-app transmission to the UAT
  .asmx is now LIVE on BOTH paths (Session 54): DFO_UAT_ENDPOINT in dfoXmlGenerator.ts (single
  source of truth), wired into per-log doSubmit + harness handleFire; both empty
  DFO_ELOG_ENDPOINT='' guards removed. Real per-log "Send to DFO" + harness Fire both returned
  WS0000 vs UAT (Session 54; harness CONF 162838/162839, per-log LL-20260614-001 Submitted).
  SOAP envelope + response parsing DONE (Session 50); first UAT transmission Session 53
  (CONF 162836). REMAINING: swap UAT→production endpoint URL once DFO issues it
- Reftable ingestion — DONE (Session 53): MV_PORT_rel7 ingested (3,970 ports) closes the last
  table. Earlier infra (Session 51): scripts/generateReftables.js + data/dfo-reftables/ vendored
  CSVs + src/data/reftables/ typed modules: MV_CATCH_USAGE, MV_SPECIMENS_CONDITION,
  MV_BAIT_CONDITION, MV_PARTNERSHIP_TYPE, MV_PROVINCE + full F222 cluster (MV_NOAA_MM_SPECIES,
  MV_INCIDENT_TYPE, MV_MM_LENGTH_CATEGORY, MV_MM_SPECIMENS_CONDITION, MV_CONFIDENCE_LEVEL,
  MV_GEAR_DESCRIPTION). MV_PORT details + PortSelector codeId wiring → see What's built (Session 53).
  Open Question 4 CLOSED
- EFFORT_DETAIL LAT/LONG MODE emission — DONE (Session 51, MAR-90 FMA 38b per Rule
  3059; gpsSrc source flag in FullDfoForm). SAR node LAT/LONG MODE also DONE (Session 66b —
  sarGpsSrc provenance flag; NB_SPCMN + SPCMN_COND_ID now captured; node xmllint-valid)
- SOAKED_DUR wire unit — Session 51 finding: XML dictionary UNIT_OF_MEASURE_ID 11850
  = MINUTES (UI captures days per Rule 286; generator converts days→min). Worth a
  courtesy confirmation with Kane since Rule 165's "216 hours" phrasing is ambiguous
- Lost Gear — RESOLVED (Kane Patterson, June 2026; CONFIRMED Session 92): the DFO "August 2026 release" arrived early as 234.12 — LOST_GEAR_IND is now BLOCKED (maxOccurs=0), UAT enforcing since 07-02, prod cutover 2026-08-27. It was the SOLE root cause of the 07-02 WS1038 234 regression, xmllint-proven (docs/RECON_234_12_xmllint_S92.md). **De-emit SHIPPED Session 93** (generator + UI all four subforms; validator max:0; recovery send WS0000 CONF 163081 — see What's built). FGRS handles actual gear reporting; no app integration required; Form 223 not building
- MV_LCSG_VS_FMA reftable ingestion — MV_LCSG_VS_FMA_rel3.csv LOCATED in ~/Desktop/DFO/ELOG_reftables/ (Q-LCSG CLOSED — it was in the Desktop folder all along). NOT yet ingested into the repo (data/dfo-reftables/ + generateReftables.js → src/data/reftables/); future item, ingest when the LCSG field is wired
- Provider's instructions document (§17)
- User's guide document
- French translation — COMPLETE (Session 39); fr/common.json, fr/dfo.json, fr/map.json all wired; zero _todo values remaining
- RevenueCat dashboard update post-Apple approval
- Garmin/Navionics offline tile download, backend server
- Garmin sandbox HTTP 500 — RESOLVED (Session 44); PKCS#1 v1.5 block-type-1 confirmed; sandbox returned HTTP 201 June 9 2026
- Navionics restore/renewal tier mapping — restore defaults to Annual product_id; renewal reuses stored product_id; Navionics product IDs confirmed by Mauro (Session 47); still need App Store/Play monthly+annual product identifiers in constants.ts to refine restore
- Navionics production endpoint swap — runNavionicsPurchase currently targets developers-store-sandbox.navionics.com; swap to production URL before release
- Navionics chart rendering — SOLE REMAINING GARMIN BLOCKER; awaiting Aldo's answers (native view vs tile URL template; token via URL query param vs X-navionics-developer-token header; Box repo access). Then swap the real tile URL into the RasterSource (replaces the TODO(Aldo) placeholder)
- Navionics refund handler — not built; plain_transaction_id is stored on each NavionicsPurchase for this purpose
- Navionics purchase-confirmation UI — not built
- PCONS USG_ID on bycatch entries — blocked; needs usage picker UI in FullDfoForm.tsx bycatch bottom sheet before generator can be wired
- AttestationModal + PrivacyNoticeModal — DONE (Session 39/40); i18n wired; moved from app launch to DFO entry
- First-launch language picker screen — DONE (Session 39/40); LanguagePickerScreen.tsx created and wired into App.tsx
- ProDashboard.tsx — DONE (Session 39/40); all ~38 strings wired to pro.* namespace in common.json
- mmYes/sarYes/lostGearYes under-validation — RESOLVED (Session 55). Recon corrected the
  framing: when null the generator OMITS SAR_IND/LOST_GEAR_IND/MM_INTER_IND entirely (tag()
  returns '' on empty; buildLogData passes String(null)='null' which matches neither 'true'
  nor 'false') — not empty/coerced. All three are mandatory on ALL FOUR subforms (shared XSD
  effort_type minOccurs=1; no validator overlay relaxes them — unlike TRANSFER which is QC-88
  only). Crucially the SEND was already blocked: validateElogXml flags the missing elements at
  DfoLogsListScreen doSubmit:254 BEFORE the POST, so no blank-indicator doc reaches DFO — this
  was an early-validation/UX gap, not a transmission hole. FIX: unconditional handleSave gate
  (FullDfoForm.tsx, all 4 subforms, no subform condition) mirroring the transfer Alert
  signature + new form234.missingIndicatorsAnswer key in en/dfo.json + fr/dfo.json (FR informal
  'tu'). Parity-polish: clear message at save instead of cryptic "missing required <SAR_IND>"
  at send. Generator output UNCHANGED. tsc=33 baseline, jest 3/3. **S93 UPDATE:** lostGearYes is
  NO LONGER part of this gate — LOST_GEAR_IND went Blocked (maxOccurs=0) in the 234.12 XSD, so it
  is de-emitted (generator) and its UI question + i18n keys removed (S93); the handleSave gate now
  checks only mmYes/sarYes. SAR_IND/MM_INTER_IND remain mandatory on all four subforms; the "all
  three mandatory" framing above is historical (234.11)
- Old pre-Session-53 logs (e.g. LL-20260605-001) have no portLandedCodeId and fail
  LANDING.PORT_ID validation — expected old-data artifacts (harmless dev throwaways), NOT a
  code bug; no migration planned
- PCONS SPECIE_SZ_ID large/market gap — generator only ever emits 826 (Small/Canner)
  for lobster; 828 (Large/Market) in DFO_PCONS_LOBSTER_SIZE_LIST is never produced.
  **REWORDED S59:** now affects GLF-89 ONLY — 89 is the lone subform still emitting
  SPECIE_SZ_ID (I2 closed: 88/90/91 no longer emit it at all, so the gap is moot for
  them). Needs a size source or picker for the 89 case.
- Cross-region live UAT sends — DONE (Session 67). All four regions now live-proven against UAT:
  MAR-90 (S53/54), GLF-89 (S61), QC-88 (CONF 162849) and NL-91 (CONF 162850) — each sent via the
  reserved per-region test triplet (FIN/VRN/LIC_NO, Test_values_LobsterLog.pdf p.4), all WS0000 with
  correct filename. Closes the carried-open S61 item; all four subforms confirmed end-to-end.
- (P2) Bilingualize the handleSave missing-field prompt in FullDfoForm.tsx — the fieldLabels map
  (trapSize, gearSubtypeId, and ALL siblings: startDt/fmaId/lgridCodeId/catchWeight/trapHauls/crewNb/
  portId/etc.) is hardcoded English today; the picker labels are i18n but the missing-field Alert is not.
  Do as ONE locale-cleanup session (convert the whole map to i18n keys + FR stubs filled), not piecemeal.
- (P2) Retire the dfo* profile fields — repoint DfoTestHarnessScreen (DEV-only; reads
  profile.dfoLicenceNo/dfoFin at :99/:100/:186) to the profile fields
  (fishingNumber/licenceHolderFin), THEN delete dfoLicenceNo/dfoFin from CaptainProfile +
  EMPTY_PROFILE (captainStorage.ts) and the three DfoSetupScreen seed writes. Deferred from
  S61 by decision — all PRODUCTION paths already read the profile as source of truth; only the
  dev harness still reads dfo*, so retiring is safe cleanup, not behavior change.
- Per-section "add a note" UI (REM) — DONE (Session 65; Close/Unlock removed, header-right note
  affordance on all sections, remarks threaded through the save paths — see What's built). SAR note
  added Session 66b.
- SAR REM emission — DONE (Session 66b): the 13th REM node now emits (sar key added → LogRemarks
  = 10 keys); 13/13 REM nodes closed and xmllint-valid.
- November free-app relaunch / post-qualification UI overhaul — PLANNED (free-app side; handle
  carefully). The per-section note UI (S65) is an early piece; the broader overhaul lands around the
  November free-month promo window.
- Archive LobsterLogProposalForm.tsx — the advocacy demo prop is now effectively dead (its SAR path
  used the legacy free-app form). Own small session: grep importers, move/archive, fix paths, verify
  build. Free-app side. NOTE: it keeps its OWN independent demo `SAR_OPTIONS` (left untouched in S66a) —
  retire that together when the file is archived.
- SAR `sarSpeciesOther` state is now inert on the SAR path — MV_SAR_LIST has no "Other" option, so the
  free-text "Other" branch never triggers for SAR (still used by Marine Mammal). Cosmetic; note only.

---

## DFO qualification gates remaining
- [x] XSD validation passing on test XML — all four subforms validate with real PORT_IDs (Session 53); first UAT SaveIncomingFile returned WS0000 (CONF 162836)
- [x] All prerequisite forms built (222 ✅, 233 ✅, Lost Gear confirmed ✅ — FGRS external, no Form 223) — both 222 + 233 live-sent WS0000 vs UAT (S70)
- [ ] Confirmation of qualification from DFO
- [ ] Authorization to deploy from DFO

---

## Session log
| Session | Date | Summary |
|---|---|---|
| Session 39 | June 4 2026 | Full FR translation complete (zero _todo); all screens i18n wired; language picker, privacy/attestation moved to DFO entry |
| Session 40 | June 4 2026 | HLIN/HLOUT gated to FMA 28599/1595 in UI and XML generator; Form 233 button hidden pending DFO confirmation |
| Session 41 | June 5 2026 | TripStartConfirmScreen created (U3 §12.2); profile confirmation gate between Fill Out New ELOG and FullDfoForm; fully i18n wired EN+FR |
| Session 42 | June 5 2026 | 8 UI changes: Edit→View for sent logs, LFA pre-fill, LGRID gate fix, bait scroll, GPS capture button, banner removed, back button, Transfers hidden for MAR |
| Session 43 | June 5 2026 | Draft auto-save on Back; IN PROGRESS section with blue progress bar and X of Y fields label; Edit replaces Resume on draft cards |
| Session 44 | June 10 2026 | Navionics purchase integration: navionicsStorage.ts + navionicsPurchase.ts; sandbox 201 (HTTP 500 resolved); tile overlay gated on active purchase; runNavionicsPurchase wired to RevenueCat Pro purchase/restore/renewal; TEST GARMIN button hidden |
| Session 45–46 | — | No separate log recorded; work merged into the adjacent Session 44 / 47 entries (gap noted intentionally, not lost) |
| Session 47 | June 10 2026 | Garmin/Navionics device test PASSED on physical iPhone (purchase_id 210229, expiry 2027-06-10; persisted + navionicsActive=true after restart); graceful 429/403 handling; JSDoc hardened against RSA-SHA1, TODO(Aldo) tile placeholder flagged, TEST GARMIN button {__DEV__}, mount debug log; Mauro confirmed product IDs; emailed Aldo on tile/token questions + Box access |
| Session 48 | June 10 2026 | DFO ELOG Phase-1: Items 1 & 2 done (SOFT_VER='0', CIE_ID=44542 wired into GENERAL_INFO + SOAP header, GENERAL_INFO reordered to XSD sequence, hasElem('CIE_ID') validator). STOPPED on blocking STRUCTURAL FINDING: generator emits flat XML but XSD mandates nested GENERAL_INFO/TRIP/EFFORT/EFFORT_BY_GEAR/EFFORT_DETAIL/CATCH tree — confirmed invalid via xmllint, blocks first transmission, full refactor required before Phase-2 checkpoint. Full restructure blueprint + LICENCE_NO→LIC_NO + 5 homeless-attr trace recorded in the Session 48 checkpoint section above. Items 5/6/7e/10/11/12/13/14 deferred until after refactor. See open questions (MODE/amendments is load-bearing). |
| Session 49 | June 11 2026 | (Logged retroactively, Session 50) Refactor steps S1–S4 completed (nested tree emission + validator rewrite; MAR-90 validates fully with dummy PORT_ID); full DFO folder inventory (docs/archive/DFO_FOLDER_INVENTORY.md + docs/archive/DFO_REFTABLES_INVENTORY.md); discovered real web service contract is SaveIncomingFile (envelope was invented), UAT URL on disk, Form 222 element-set mismatch, F233 REPORT_UID legitimacy. |
| Session 51 | June 11-12 2026 | ALL 5 PLANNED PHASES COMPLETE. P1 Reftables: scripts/generateReftables.js (cp1252→UTF-8 codegen), 11 CSVs vendored to data/dfo-reftables/, 11 typed modules in src/data/reftables/; BYCATCH_USAGE_OPTIONS rebased on MV_CATCH_USAGE. P2 Form 233: generator+validator rewritten flat→nested ELOG/GENERAL_INFO/REPORT/REPORT_DTL (REASON is free text, not W/M/P/O; REPORT_UID kept), button un-hidden, xmllint VALIDATES; jest AsyncStorage mock added to jest.config.js. P3 Rules: 48 (DfoLog.tripNum sequential), 181 (validator), 165+286 (SOAKED_DUR wire unit = MINUTES per dictionary — days→min conversion added), 29/30/32/45/46 date cross-checks, 33 (findEffortOverlap wired into send), 980 warning, 3059 (MAR-38b LAT/LONG emission WITH MODE=G/M via gpsSrc flag — Q3 implementation done), 623-626 (NB_VNTCH/_YOU QC FMA sets + UI), 653/654/655 (NB_SPCMN_BRD 38b-only), 985 (REG_ID↔subform). P4 Form 222: restructured to ELOG/GENERAL_INFO(FIN+VRN mandatory)/MM_INTER/MM_INTER_INCDNT; NOAA_SPECIE_COD from MV_NOAA_MM_SPECIES (invented 10001-10099 codes gone); INCDNT_TYP_ID from MV_INCIDENT_TYPE (E/V/O gone; legacy Y/N indicators map to incident nodes 39609/39610/39615); LGBK_NUM_REF field added (prefill from last log lgbkUid); LAT/LON bounds 40-70/-165--35; xmllint VALIDATES (Y and N). P5 QC-88: USE_CR_IND (Rule 639 default N) + carrier VRN → LANDING.VRN (641/642), PRTNSHP_ID picker (MV_PARTNERSHIP_TYPE), structured TRANSFER/TRANSFER_DTL (248-252), validator overlays; xmllint VALIDATES. Test key confirmed in .env (Test_values PDF p.4 has key + reserved test FIN/VRN/LIC triplets). F234 xmllint: all four subforms validate with dummy PORT_ID — Q4 (MV_PORT) is now the SOLE transmission blocker. |
| Session 50 | June 11 2026 | Q3 RESOLVED (LAT/LONG MODE = per-coordinate provenance G/M, Standard v6.1 §11.3); v6.1 delta review (Lost Gear removal only — corroborates existing resolution); SOAP envelope rewrite to real SaveIncomingFile contract across all 3 generators (shared builder, base64 params, fake auth header removed); generateDfoXmlFileName() per §3.10; parseDfoSoapResponse() rewritten for WS_RESP contract (7/7 spec-sample tests); TransmissionRecord +fileName/confNumber; ValidateElogKey UAT card in test harness (endpoint verified live HTTP 200); docs/REFTABLE_INGESTION_PLAN.md written (plan only). OUTSTANDING: Jonny to add EXPO_PUBLIC_DFO_TEST_ELOG_KEY to .env before firing the UAT key test. |
| Session 53 | June 13 2026 | MV_PORT_rel7 ingested (3,970 ports; generateReftables.js extended: nullable PROV_CODE_ID, MV_PORT-specific DESC_*→name mapping, derived PORTS_BY_PROVINCE); DFO_MAR_PORT_LIST rebuilt as a filtered MV_PORT view (NS+NB+PEI), proven identical to the old 2,229-row literal 3 ways, ~11k lines removed. New DfoPortSelector ({name,codeId}); shared PortSelector + LobsterLogProposalForm left untouched (175 users safe). TRIP.PORT_ID (QC/NL) + LANDING.PORT_ID (all 4) emit integer codeIds; field config portId added to GLF/MAR. ALL FOUR subforms XSD-valid with real PORT_IDs — Open Question 4 CLOSED. First real UAT SaveIncomingFile transmission (MAR-90, reserved test triplet) → HTTP 200, ERR=WS0000, CONF=162836 — first DFO-accepted logbook. tsc=33 baseline, jest 3/3. |
| Session 54 | June 14 2026 | IN-APP DFO TRANSMISSION LIVE: DFO_UAT_ENDPOINT added to dfoXmlGenerator.ts (single source of truth), wired into BOTH send paths (per-log doSubmit + harness handleFire); both empty DFO_ELOG_ENDPOINT='' guards + the harness dry-run branch removed. First in-app transmissions → WS0000 (harness MAR-90 CONF 162838/162839; real per-log "Send to DFO" on fresh MAR-90 LL-20260614-001 → Submitted) — both the harness AND the real user-facing form paths confirmed end-to-end vs UAT. XML Test Harness button relocated DfoSetupScreen → DfoLogsListScreen header (__DEV__-gated, blue, modal pattern); harness button/modal/state/styles removed from setup. Inspect/QR button parked behind {false &&} (NOT deleted — deliberate feature, demoed to DFO). All four harness fixtures synced with real MV_PORT codeIds (xmllint-valid). Transfers validation bug fixed (FullDfoForm.tsx:897 gated to subformId===88 — was blocking MAR/GLF/NL save). tsc=33 baseline, jest 3/3. |
| Session 55 | June 14 2026 | P1 Harness terminal step-log: 7 logging-only [HARNESS] breadcrumbs added to DfoTestHarnessScreen handleFire (fixture→XML→validate PASS/FAIL→filename→SOAP→POSTing→HTTP response w/ status+elapsed ms+bodyLen); validation logs PASS strictly before POST, FAIL logs+halts at existing return; raw-response-only (harness path has no WS_RESP parse — doSubmit untouched). P2 mmYes/sarYes/lostGearYes under-validation RESOLVED: recon showed generator OMITS the 3 indicators when null + handleSave had no check, but validateElogXml already blocks the SEND at doSubmit:254 before POST (early-validation gap, not a transmission hole); added unconditional handleSave null-check (all 4 subforms, XSD effort_type minOccurs=1) + form234.missingIndicatorsAnswer in en/fr dfo.json. Generator output unchanged. P3 not started (no go given). tsc=33 baseline, jest 3/3. |
| Session 56 | June 15 2026 | Block SPECIE_SZ_ID + NB_SPCMN_KEPT/DISC for MAR-90 (generator gate + validator guards + guard test); gate green tsc 33 / jest 5/5 / xmllint all four valid. |
| Session 57 | June 15 2026 | Wire EFFORT_DETAIL.TRP_SZ_ID for NL-91: generator emit gated subformId===91 (after LAT/LONG, before CATCH) + validator guards (NL mandatory / 88-89-90 blocked) + FMA-style Standard/Large picker (DFO_TRAP_SIZE_LIST, Rule 611, no reftable ingestion) gated isVisible('trapSize') + handleSave block + config/required wiring + i18n en/fr + new validateTrpSzId guard test. Value persists via data map (no top-level DfoLog field — approved). Gate green tsc 33 baseline / jest 5 suites 10 tests / xmllint all four valid / TRP_SZ_ID present NL-91 absent 88-89-90. |
| Session 58 | June 15 2026 | Generator verification pass (recon) — T1 AT-RISK (REM unbuilt) / T2 PASS all four / T3 PASS 88+91, AT-RISK 89+90; flagged I1 LGRID_ID + I2 SPECIE_SZ_ID subform-gating leaks (both closed in S59). |
| Session 59 | June 15 2026 | Confirmed + closed I1/I2 subform-gating leaks — SPECIE_SZ_ID emit-89-only (overturns 88/89/91 ruling), LGRID_ID emit-90-only; generator gates + validator guards + 2 guard tests; harness + xmllint clean, no regression. |
| Session 60 | June 15 2026 | Transmission register + Log History archive — TransmissionRecord snapshots vrn/tripNum/xsdValid/wsErrCode at send (frozen §13.3.1); DfoLogsListScreen splits unsent (full) vs sent (30-cap) with SentLogCard tap-to-detail; new LogHistoryScreen (full 3-yr archive, month+year filters); parseDfoSoapResponse returns ERR code on success; clears logbook T6 + mammals T9 register dependency. Committed 425ff28. |
| Session 61 | June 16 2026 | Captain Profile as send source-of-truth. SEED: DfoSetupScreen's 3 activate handlers now also write fishingNumber←Licence / licenceHolderFin←FIN on activation (dfo* kept). REWIRE: all production readers repointed off dfo* onto the profile — generateElogXml FIN/LIC_NO, DfoLogsListScreen + Form222Screen + Form233Screen filenames (XML LIC_NO + filename now read the SAME fishingNumber → 1004460/1004461 drift closed), Form222 generator FIN+fallback, Form233 payload+display, TripStartConfirm rows (VRN untouched). GATE: new isProfileComplete() in captainStorage (returns i18n label keys, storage stays t()-free) wired into doSubmit before generateElogXml — bilingual sendGate popup blocks an incomplete profile, routes to Open Profile, no POST. 7 oneoff fixtures backfilled with the new fields. VERIFIED: tsc 33/0-new, jest 7/19 green, xmllint all four logbooks + 222 + 233 valid, live GLF-89 UAT → WS0000 (filename middle = VRN). dfo* NOT retired (P2 carried open: harness repoint then delete). |
| Session 62 | June 16 2026 | REM (note) emission backend for TRG Logbook test T1 (BACKEND ONLY, no UI). Added optional LogRemarks type + remarks field on DfoLog (9 section keys, no migration); generator emits <REM> at all 13 buildable sites via tag() (drops empty), grouped at human-section level (haul fans ×3 across effort nodes, transfer ×2, pcons into both PCONS) — SAR (13th) deferred. Empty-notes XML byte-identical to pre-change (T2 untouched). New genSampleRemT1.oneoff.test.ts: MAR-90 ×11 sites + QC-88 ×2 transfer prove all 13; accented note exercises T4; both validate vs real XSD. tsc 33/0-new, jest 8 suites/21 tests green, S56/S57/S59 + T2 unregressed. |
| Session 63 | June 17 2026 | Recon-only: DFO package deep-dive answering 5/7 open Kane questions; recon doc committed standalone (70ecef0). No code changes. |
| Session 64 | June 17 2026 | Surface failed transmissions in register + Log History (§13.3.3). indexFailureRecords() (one row per failed attempt, sourced from the persisted register so it survives app restart — unlike the in-memory failedSends retry state); SentLogCard/SentLogDetailModal badge conditioned on record.outcome (red fail badge + errorMessage row); DfoLogsListScreen FAILED TRANSMISSIONS section + LogHistoryScreen interleaves success/fail rows. indexSuccessRecords() untouched. tsc 33/0-new, jest 21/21. Committed 8829a1f. |
| Session 65 | June 17 2026 | Replace Close/Unlock with per-section note inputs. REMOVED the DG_CLOSE_DT close/unlock mechanism (button/state/lock/dgClose* form writes/styles/i18n keys) — DG_CLOSE_DT now relies on the generator's toCloseTimestamp(undefined) auto-stamp. ADDED header-right "Add a note" affordance to 8 sections (Catch&Effort writes haul+catch together) writing log.remarks[<key>], seeded on edit, threaded through all 3 save objects via buildRemarks(). tsc 33/0-new, jest 21/21. Committed f71bcd2. |
| Session 66a | June 17 2026 | Ingest MV_SAR_LIST reftable (16 official species-at-risk codes) via generateReftables.js → mvSarList.ts (DfoSarList); repoint SAR species dropdown to MV_SAR_LIST (descEn/codeId → real SPECIE_ID); parameterized renderIncidentFields (string[] | coded {codeId,descEn}[]) keeping Marine Mammal byte-identical; retired demo SAR_OPTIONS + partial DFO_SAR_SPECIES_LIST (FullDfoForm/dfoConstants; the independent legacy LobsterLogProposalForm copy untouched). Codegen date-stamp refresh across generated modules (expected churn). tsc 33/0-new, jest 21/21. Committed c3353f7. |
| Session 66b | June 17 2026 | Emit SAR detail node (sar_type): SAR_DT / LAT-LONG (MODE=G/M via new sarGpsSrc provenance flag) / SPECIE_ID / NB_SPCMN / SPCMN_COND_ID / DG_CLOSE_DT / REM, gated SAR_IND='Y' (absent when N/null), WT omitted. New NB_SPCMN (numeric) + SPCMN_COND_ID (MV_SPECIMENS_CONDITION dropdown) capture UI outside the shared renderIncidentFields (MM untouched); sar REM key added → LogRemarks 10 keys, 13/13 REM nodes closed; handleSave SAR-mandatory gate (missingSarFields); validator SAR spec unchanged. New genSampleSarS66b.oneoff.test.ts; /tmp/sample_sar.xml xmllint-valid against the real XSD. tsc 33/0-new, jest 9 suites/23 tests. Committed f0d1142. |
| Session 67 | June 17 2026 | NL-91 gear-subtype UI wiring (mirror/completion of the S57 TRP_SZ_ID pattern — backend was already done in the v234.11 audit; the UI half was missing): "Gear Subtype" picker in FullDfoForm.tsx gated isVisible('gearSubtypeId') (NL-91 only, after the trapSize picker), DFO_GEAR_SUBTYPE_LIST options (39684/39685/39686, DESC_ENG → codeId, confirmed vs Jobel), writes d.gearSubtypeId; registered in DFO_SUBFORM_FIELD_CONFIG[91] + FULL_DFO_REQUIRED_FIELDS[91] for the friendly save-gate prompt; EN+FR picker keys; ADDED blocked-direction validator guard (now two-direction like TRP_SZ_ID/LGRID_ID/SPECIE_SZ_ID). All-four-region live UAT sends confirmed: MAR-90 / GLF-89 / QC-88 (CONF 162849) / NL-91 (CONF 162850), all WS0000 — closes the carried-open S61 cross-region item. tsc 33/0-new, jest 9 suites/23 tests. |
| Session 68 | June 17 2026 | Recon-only: marine-mammal (Form 222) + Form 233 send-path findings; standalone recon doc docs/MAMMALS_AND_233_RECON_S68.md committed (0a59e5f). No code changes (CLAUDE.md not touched — findings live in the recon doc). Flagged the 222/233 fake-send (build SOAP envelope → discard → flip sentToDfo=true → unconditional "Submitted", no fetch/parse/TransmissionRecord) for the S69 wiring. |
| Session 69 | June 18 2026 | Wire Form 222 + 233 to real transmission (Scope A). New UI-free, store-agnostic src/utils/submitDfoXml.ts: submitDfoXml() owns transport (fetch + 30s AbortController) + parseDfoSoapResponse (RELOCATED out of DfoLogsListScreen → now defined in exactly ONE place; DfoLogsListScreen repointed to import it, zero doSubmit logic change) + TransmissionRecord write on success AND every failure path (built once, persisted via saveTransmissionRecord) + saveXmlArchiveEntry on success; returns typed { ok, errCode?, confNumber?, errorMessage?, httpStatus? }; snapshot:{vrn,tripNum,xsdValid} threaded undefined-safe onto both records for later logbook convergence; no entry-store writes, no markSentToDfo. Both form screens drop the fake-send and call submitDfoXml (FORM222-/FORM233- record id, snapshot:{vrn:profile.vesselNumber}), marking sent/saving the entry only on ok and surfacing errCode/httpStatus/errorMessage on failure; screens no longer archive directly. New submitDfoXml.oneoff.test.ts (mocks fetch + storage): WS0000+CONF→ok/one success record/archive/snapshot.vrn; HTTP 500→!ok/one failure record/no archive; ERR≠WS0000→!ok/one failure record/no archive. Grep proof: no "Simulate" comment left, neither screen imports saveXmlArchiveEntry, submitDfoXml imported in both, parseDfoSoapResponse in one place. ⚠️ NOT live-sent — held pending Rule 528 VRN 4–6-digit fix on the 222/233 path. Scope B (register rows / `kind` field / list-join) + logbook-convergence follow-up NOT started. tsc 33/0-new, jest 10 suites/26 tests. |
| Session 70 | June 18 2026 | Form-path hardenings (222/233 only, logbook 234 UNTOUCHED) — both forms now LIVE-SENT WS0000 vs UAT (222 CONF 162859/162861, 233 CONF 162860; VRN 104460; confirmed in on-device register). (A) WS1038 root cause = hand-typed >4-decimal LAT/LONG (XSD allows ≤4); new clampCoord4() rounds LAT/LONG to 4dp at emit (no trailing-zero pad, minus preserved, emit-only); coordinate validators tightened to real XSD ranges (lat 38-72 / lon -148..-40, was 40-70 / -165..-35) in BOTH generator validateForm222Xml (+≤4dp backstop) AND screen handleLatChange/handleLonChange; EN+FR lat/lon error strings updated; first live 222 carried a raw 16-decimal coord auto-clamped. (B) Rule 528 VRN 4-6-digit gate: new isValidFormVrn (/^\d{4,6}$/) in submitDfoXml.ts (one def, both screens import), hard send-time block at top of each handleSubmit (bilingual Alert, no send/mark/archive on fail); logbook isValidVrn left permissive (1-12 alphanum), stale comment corrected. New formVrnAndCoordClamp.oneoff.test.ts. tsc 33/0-new, jest 11 suites/32 tests. |
| Session 71 | June 18 2026 | Scope B — render Form 222/233 rows in the transmission register (closes the S69-deferred display half). DATA: optional `kind` discriminator on TransmissionRecord + exported `transmissionKind(record)` (explicit kind, else FORM222-/FORM233- logId-prefix fallback → pre-existing S70 records classify with no migration); submitDfoXml gained an optional `kind` arg threaded onto both records, both form screens pass kind:'form222'/'form233'. CARD: new standalone FormSentCard.tsx (single `record` prop, no backing DfoLog; styling mirrored from the untouched SentLogCard) + EN/FR i18n (regForm222Title/regForm233Title/regErrorLabel). WIRING: both screens load the raw register + derive formRecords; DfoLogsListScreen interleaves form successes/failures into the existing SENT/FAILED sections by attemptedAt (logbook 30-cap unchanged, form rows uncapped); LogHistoryScreen merges into its single chronological rows list (kind union + matchesSelectionTs month/year filter, form years feed the dropdown). Logbook rows + doSubmit + send/submit logic untouched; no double-count (form ids never resolve via logById). Mammals T9 register-screenshot half UNBLOCKED — verified on-device (S70 CONF 162859/162861/162860 visible in SENT). New transmissionKind.oneoff.test.ts. tsc 33/0-new, jest 12 suites/36 tests. |
| Session 72 | June 19 2026 | Build bait CONDITION (BT_COND_ID), rule-gated per region; LGBK_UID confirmed generating + transmitting |
| Session 73 | June 19 2026 | Ingest MV_GRID + MV_STAT_DISTRICT_SECTION; QC GRID_ID + NL STAT_SECT_ID diagnosed optional + data-blocked |
| Session 74 | June 19 2026 | Widen bait ENTRY UI to all four regions; Kane confirms bait mandatory all subforms |
| Session 75 | June 22 2026 | Find + fix timestamp-launder bug at save-gate; device-confirmed + regression-tested |
| Session 76 | June 22 2026 | Sweep launderer class; root-fix transfer-launder (localToUtcIso) + LANDING backstop + QC-88 transfer gate + stale-prefill fix |
| Session 77 | June 22 2026 | Harmonize the three identity labels (FIN / Licence / VRN) across DfoSetupScreen, CaptainProfileScreen, TripStartConfirmScreen, Form233Screen — DISPLAY STRINGS ONLY (no storage-key / data-binding / generator change). The earlier device test had already proven no data swap; this was label-wording drift. RECON: Rule 931 (GENERAL_INFO.FIN, marked `(label)`, present IDENTICALLY in BOTH the 234 + 233 fact sheets → app-wide, NOT 233-scoped) MANDATES the FIN label = EN "Licence holder’s FIN" / FR "NIP du détenteur de permis"; LIC_NO + VRN have NO label mandate (provider's call — XML_dictionary.csv only fixes the XML element names, not screen labels). The Standard's §2.2 Innovation / §2.3 Flexibility leave UI presentation to the provider; the only Standard screen clauses are element AVAILABILITY, not wording. EDIT (locale JSON VALUES only, EN+FR): FIN → "LICENCE HOLDER’S FIN" / "NIP DU DÉTENTEUR DE PERMIS" on all 4 finLabel keys (setup/profile/tripConfirm/form233); Licence → "FISHING LICENCE NUMBER" / "NUMÉRO DE PERMIS DE PÊCHE" (setup + tripConfirm + form233 licenceNoLabel; profile.fishingLicenceLabel already held it); VRN → "VESSEL NUMBER (VRN)" / "NUMÉRO DU NAVIRE (NMV)" (tripConfirm.vrnLabel; profile.vesselNumberLabel already held it). Stored ALL-CAPS per app convention — there is NO CSS textTransform, the caps live in the stored string — so FIN renders all-caps: a DELIBERATE casing deviation from 931's literal mixed-case "Licence holder’s FIN" (wording + curly U+2019 apostrophe match exactly; only case differs — revisit if a strict 931 reviewer flags casing). InspectionModeScreen (hardcoded "FIN" / "Vessel (VRN)") and the unused common.profile.licenceNo/.fin keys left UNTOUCHED. 16 value-only changes across en/dfo, fr/dfo, en/common, fr/common; zero .tsx, zero key renames, zero t() re-points; storage keys licenceHolderFin / fishingNumber / vesselNumber confirmed unchanged on all 4 screens. tsc 33/0-new (baseline; none in touched files). Committed 3ff3187, pushed to origin/main. NOTE: sessions 72–76 are not recorded in this table (pre-existing gap; not reconstructed here). |
| Session 79 | June 22 2026 | Fix departurePort + lgridCodeId region gating in DFO_SUBFORM_FIELD_CONFIG (dfoConstants.ts) to match Subforms_requirements_234.xlsx. Spec: TRIP departure port Mandatory QC(88)+NL(91) / Blocked GLF(89)+MAR(90); LGRID (EFFORT_DETAIL.LGRID_ID) MAR(90)-only. EDITS (6 lines, CONFIG-ONLY — no .tsx / generator change): departurePort ADDED to required[88]+required[91], REMOVED from visible[89]+visible[90]; lgridCodeId REMOVED from visible[88/89/91] (kept in visible[90]). Aligns the UI field config with the generator's already-correct per-region emission (TRIP.PORT_ID gated 88/91 @ dfoXmlGenerator.ts:205; LGRID_ID emit-90-only) — no XML-output change. soakDuration MAR-blocking verified untouched (regression). Driven by a read-only audit: docs/PORT_AND_FIELD_SCOPE_AUDIT_S79.md (per-field/per-region verdicts MATCH 53 / OVER-COLLECTING 5 / UNDER-REQUIRING 14 / MISSING 0); the 3 indicator UNDER-REQUIRING rows (LOST_GEAR_IND/MM_INTER_IND/SAR_IND) confirmed double-enforced (handleSave null-gate + validateElogXml min:1) and deliberately left as-is. Committed b67db23, pushed origin/main. On-device test: new log per region — departure port shows+required ONLY in QC+NL; LGRID shows ONLY in MAR; soak still absent in MAR. |
| Session 80 | June 23 2026 | Forward xsdValid into the Form 222/233 transmission snapshot — closes the Mammals T9 "XSD: Unknown" gap on the form register detail cards. RECON (docs/RECON_xsdValid_S80.md): TransmissionRecord.xsdValid is optional boolean / no default (dfoLogStorage.ts); the logbook path sets it inline at DfoLogsListScreen (xsdValid: validation.valid) after a hard pre-send guard; submitDfoXml ACCEPTS snapshot.xsdValid and spreads it undefined-safe onto BOTH the success and failure records but never computes it; both form screens already computed validation = validateForm222Xml/validateForm233Xml(xml) and used it ONLY as a pre-submit guard (if !valid → Alert+return), then passed snapshot:{vrn} — OMITTING xsdValid, so form records carried no xsdValid and SentLogDetailModal's strict ===true/===false ternary fell through to detailXsdUnknown (the blank). Runtime form validators DO exist in-app (validateForm222Xml/validateForm233Xml, name-based; xmllint-vs-XSD remains the authority) and were already being called. BUILD: one-key addition xsdValid: validation.valid on the snapshot object in Form222Screen.tsx (:206) + Form233Screen.tsx (:110), alongside the existing vrn; the TransmissionRecord type, submitDfoXml, and the card needed NO change. Because each screen hard-guards if(!validation.valid)return before submit, the recorded value is always true at send (mirrors the logbook). git diff = the two one-line snapshot changes only. Committed 4672076, pushed origin/main (bare subject, no Co-Authored-By). Also committed earlier this session: launderSweep.oneoff.test.ts kept as a permanent regression guard + the session-log scratch dropped (30b71e7). DEVICE VERIFY PENDING (xsdValid): send a 222 and a 233, confirm the form register card detail reads XSD pass instead of Unknown. ——— PART 2 — give the Form 222/233 sent-cards the shared Transmission Result detail modal (the form cards opened NOTHING; logbook sent-cards already open SentLogDetailModal). RECON (docs/RECON_form_detail_modal_S80.md): the modal already reads record.* for 8 of its 9 rows but HARD-REQUIRED a backing DfoLog — the !log||!record guard, the header's log.id/log.dateFished, and the Trip row's log.tripNum; FormSentCard was a static View with NO tap handler. DESIGN (settled in chat): ONE shared modal made record-first (record primary, log optional); log present → render exactly as today (no logbook regression); log absent (form) → header = kind label + sent-date subtitle, Trip row hidden, all other rows read record.* as they already do. BUILD (4 files): (1) SentLogCard.tsx — SentLogDetailModal made record-first: guard !log||!record → !record (record-missing fallback kept); header branches on log-presence (logbook → log.id/log.dateFished UNCHANGED; form → formTitle via transmissionKind→regForm222Title/regForm233Title, subtitle = formatSentDate(record.attemptedAt)); Trip row gated {log && …} (hidden for forms); reused the existing transmissionKind helper + regForm22xTitle i18n keys (no new map). (2) FormSentCard.tsx — added required onPress prop + root wrapped in TouchableOpacity (activeOpacity 0.7), mirroring SentLogCard's contract; surfaces the press only, opens no modal itself. (3) DfoLogsListScreen.tsx — both form sites (SENT row.record / FAILED row.rec) pass onPress = setDetailRecord(rec)+setDetailLog(null); modal visible relaxed detailLog!==null → (|| detailRecord!==undefined); record fallback (detailRecord ?? successRecords[detailLog.id]) unchanged → logbook path identical. CAUGHT BY tsc (NOT in recon scope): making onPress REQUIRED broke a 2nd FormSentCard consumer — LogHistoryScreen:214 (33→34, TS2741 onPress missing); STOPPED and asked rather than touch a file outside the stated diff. Per decision (4) LogHistoryScreen.tsx wired identically (onPress on its FormSentCard + relaxed its shared-modal visible); it already imported SentLogDetailModal + held detailLog/detailRecord state, so its logbook cards were already tappable — only the form card was the gap. tsc back to 33/0-new (none in the 4 touched files). git diff = 4 code files (SentLogCard, FormSentCard, DfoLogsListScreen, LogHistoryScreen). Committed 99e7956, pushed origin/main (bare subject, no Co-Authored-By). DEVICE VERIFY PENDING (modal, BOTH screens): logbook card opens the modal IDENTICAL to before (id/date header + Trip row present); 222/233 card opens the SAME modal with XSD validation: Passed + NO Trip row + kind-label/sent-date header; same form-card behavior in Log History. |
| Session 82 | June 25 2026 | NL-91 STAT_SECT_ID (Statistical Section) end-to-end on the newly-ingested MV_STAT_SECTION_VS_FMA reftable — UI picker + Rule 621/622 emit & validate. RECON FIRST: docs/REFTABLE_USAGE_AUDIT_S82.md (which data/dfo-reftables CSVs are referenced in src/ — 9 of 15 wired; MV_GRID/MV_STAT_DISTRICT_SECTION + 4 others generated-but-unconsumed; MV_STAT_SECTION_VS_FMA absent at audit time) + docs/RECON_stat_sect_id_S82.md (STAT_SECT_ID had ZERO wiring — only the validator sequence slot at dfoXmlGenerator.ts:492; lgrid is the template but a SPLIT pattern — UI gates on FMA, emit/validate on subform). INGEST: MV_STAT_SECTION_VS_FMA_rel6.csv (64 rows, section↔FMA cross-ref) staged + registered in generateReftables.js → src/data/reftables/mvStatSectionVsFma.ts (DfoStatSectionVsFma: statSectCodeId/DescFr/DescEn + fmaCodeId/DescFr/DescEn). PHASE 1 (derived constants, dfoConstants.ts beside the lgrid pair): DFO_STAT_SECT_BY_FMA (Record<number, DfoStatSectionVsFma[]>, grouped by fmaCodeId — the 19-FMA Rule 622 VALIDITY map) + DFO_FMA_STAT_SECT_REQUIRED (Set — the Rule 621 mandatory GATE). VERIFICATION CAUGHT a divergence: deriving the Set from distinct fmaCodeId gave 19 FMAs (incl. LFA 01/2071 + LFA 02/1652) but Rule 621's gate is 17 — the table spans the broader 622 map by design; STOPPED + flagged, then per decision hardcoded DFO_FMA_STAT_SECT_REQUIRED to the explicit 17 (1653/2073/1654/1655/2075/2077/2079/39674/39675/2083/2085/2087/2089/2091/2093/2095/2097), mirroring DFO_FMA_LGRID_REQUIRED's hardcoded style; DFO_STAT_SECT_BY_FMA left at all 19. PHASE 2 (FullDfoForm UI, mirroring lgrid; NO DfoLog interface change — step-1 SKIPPED after recon showed lgrid has no interface field either, both ride data: Record<string,string>): statSectId/statSectDisplay/statSectPickerOpen state trio; FMA-change reset clears both; load from d.statSectId/d.statSectDisplay; buildLogData write-out; picker JSX after the lgrid block, gated subformId===91 && fmaId!==null && DFO_FMA_STAT_SECT_REQUIRED.has(fmaId) (the deliberate FMA-gate deviation + fmaId!==null type-narrow), always-required '*', locale-aware row text (i18n.language fr→statSectDescFr); save-gate: 'statSectId' added to FULL_DFO_REQUIRED_FIELDS[91] + fieldCheckMap (DFO_FMA_STAT_SECT_REQUIRED.has(fmaId??0) ? statSectDisplay : 'ok') + fieldLabels hardcoded 'Statistical Section'; i18n statSectLabel/selectStatSect en+fr (FR pending proofread). PHASE 3 (dfoXmlGenerator.ts, mirroring lgrid emit/validator but FMA-gated): emit <STAT_SECT_ID> when DFO_FMA_STAT_SECT_REQUIRED.has(Number(d.fmaId)), placed after TRP_SZ_ID before REM (XSD slot :492); validator Rule 621 (mandatory when in the set / blocked when not) + Rule 622 (present value must be in DFO_STAT_SECT_BY_FMA[efFma]); imports added. GUARD TEST: statSectId.oneoff.test.ts — 4 cases (LFA03+38065→pass; LFA03 omitted→Rule 621; LFA03+38119[an LFA01 section]→Rule 622; LFA01 no section→pass), all green; each recon-verified in-process first (samples 1–4, temp tests deleted). tsc 33/0-new throughout. Committed d07e309 (bare subject, no Co-Authored-By), pushed origin/main — 26 files (CSV + mvStatSectionVsFma.ts + regenerated reftable date-churn + dfoConstants/FullDfoForm/dfoXmlGenerator/dfoLogStorage + en/fr dfo.json + the oneoff). LIVE SENDS: relied on Jonny's confirmation (not run/verified in-session). NOTE: Session 81 is not recorded in this table (recon-only; docs RECON_form_pickers_S81 + RECON_form_spinner_and_date_S81 exist — gap noted, not reconstructed). |
| Session 83 | June 29 2026 | QC-88 GRID_ID ("A2") end-to-end — Rules 1011/1012/613x/614x. P1 constants (dfoConstants.ts): DFO_GRID_BLOCKED_FMA (29 Rule-1011 blocked QC FMAs) + DFO_FMA_GRID_MAP (11 required QC FMAs → map "4" = LFA 22 / "1" = the twelve 18-series); 29 + 11 = 40 QC LFAs, zero overlap (recon docs/RECON_grid_id_S83.md + docs/RECON_grid_orphan_check_S83.md). P2 UI (FullDfoForm.tsx / dfoLogStorage.ts / en+fr dfo.json): FMA-gated GRID_ID picker (subform 88 && fmaId ∈ DFO_FMA_GRID_MAP — map-membership = required-&-not-blocked, so the 29 blocked FMAs never show it, Rule 1011); options = MV_GRID rows whose DESC_FRE leadchar = the map digit ("1" ≈ 3259); search box + Modal overlay w/ virtualized FlatList (kills the nested-VirtualizedList warning); save-gate (gridId in FULL_DFO_REQUIRED_FIELDS[88] + fieldCheckMap + fieldLabels); i18n gridLabel/selectQcGrid (FR pending proofread). ALSO folded in: LFA picker natural-sort (compareFmaLabel + fmaOptions, all four region lists, display-time, reorder-safe — selection stores codeId) so "20a10" sorts after "20a9a"; recon docs/RECON_lfa_picker_S83.md. P3 generator + validator (dfoXmlGenerator.ts): emit <GRID_ID> in EFFORT_DETAIL after LGRID_ID before GEAR_GRP_NUM (gated subform 88 && fmaId ∈ map); validator Rule 1011 (blocked → absent) / 1012 (required → present) / 613x/614x (present value's MV_GRID leadchar must = FMA map digit). Guard test gridId.oneoff.test.ts (5 cases: present-valid, blocked-absent, wrong-digit→613x, required-absent→1012, blocked-present→1011 [injected]). tsc 33/0-new, jest 17 suites/55 tests. Committed 3c9a77d (bare subject, no Co-Authored-By), pushed origin/main — 7 files (dfoConstants/FullDfoForm/dfoLogStorage/dfoXmlGenerator/en+fr dfo.json/gridId.oneoff). LIVE: two WS0000 vs UAT — CONF 163015 (grid present, LFA 22 map "4") + CONF 163016 (grid absent, LFA 17b blocked). Recon docs left untracked (separate housekeeping). NOTE: the S73 "QC GRID_ID diagnosed optional + data-blocked" conclusion is SUPERSEDED — S83 recon found GRID_ID mandatory (Rule 1012) for non-blocked QC FMAs, blocked (Rule 1011) for the 29-FMA cluster. |
| Session 84 | June 29–30 2026 | DFO Cloud Backup — RECON (docs/RECON_dfo_backup_S84.md: DFO side is local-only AsyncStorage + SOAP, no Firebase; the 7 DFO stores + their key conventions; identity = Firebase auth UID but DFO data is unkeyed to it) + PHASE 1 foundation. NEW src/utils/dfoBackup.ts (DFO_BACKUP_STORES, backups/{uid}/stores/{storeId} path on the dfo-elog DB, types, getDfoBackupDb, loadBackupConsent/saveBackupConsent key @lobsterlog:dfo_backup_consent default OFF) — NO cloud I/O wired. Consent toggle card + NEW BackupExplainerModal on CaptainProfileScreen; backup.* i18n (en+fr common.json). NEW firestore.rules + firebase.json (backups/{uid}/** read/write only when request.auth.uid==uid; scoped to dfo-elog so (default) untouched — Jonathon deploys). Committed c761acb. Then PRIVACY reword (bfd8a1e): privacy.section2/3/4Body (en+fr dfo.json) updated to disclose optional Cloud Backup + name Google Firebase as processor + cloud-copy deletion contact; FR curly U+2019 + «» preserved. tsc 33/0-new. Both pushed origin/main. |
| Session 85 | June 30 2026 | DFO Cloud Backup PHASE 2 Step A — write-through + manual button. RECON docs/RECON_writethrough_S85.md (save choke point = saveLog dfoLogStorage.ts:76; logbook send success = DfoLogsListScreen doSubmit after markSentToDfo; forms persist+send via submitDfoXml; every site already in try/catch). dfoBackup.ts gained backupAllStores(uid) (raw VERBATIM via setDoc), triggerBackup() (fire-and-forget, consent+uid gated, terminal .catch — never throws/rejects into a caller), backupNow() (manual, awaited, {ok,reason}). FOUR triggerBackup() hooks AFTER local persist: FullDfoForm complete-save (in `if (ok)`), DfoLogsListScreen doSubmit (after markSentToDfo), Form222/Form233 (after saveForm22x/23x Entry); saveLog itself NOT hooked (shared w/ legacy proposal form). "Back up now" button on CaptainProfile + backup.* keys. Verified best-effort via a temp throw stub (added+removed, never committed) — save/send unaffected. Committed 8a2fe00. Then ONE-OFF-FROM-OFF (61b71a3): backupNow(alreadyConsented=false) wraps the consent gate in `if (!alreadyConsented)`; "Back up now" now visible in both toggle states; OFF-state tap → per-tap confirm (oneOff* i18n) → handleBackupNow(true) → bypass; toggle NEVER flipped, auto path untouched. tsc 33/0-new. Both pushed origin/main. RESTORE = Phase 3, not started. |
| Session 86 | June 30 2026 | DFO Cloud Backup PHASE 3 (restore) + Delete Account hardening. RESTORE (51e962e): restoreAllStores(uid) + isDfoLocalEmpty() in dfoBackup.ts; auto-fires after sign-in (App.tsx effect, once-per-uid ref guard) ONLY when all 7 local DFO stores are empty; two-phase (fetch-all-then-write — any fetch error aborts with ZERO local writes; absent/empty cloud docs restore as empty); Phase B hardened to batched multiSet/multiRemove (residual non-atomic window BETWEEN the two batches documented + bounded by the empty-local gate, NOT eliminated — AsyncStorage has no transaction); quiet success banner on restoredCount>0, silent otherwise; verbatim round-trip proven on real device data (5 MAR-90 logs, sentToDfo + lgridCodeId/lgridDisplay survived). DELETE-WIPES-CLOUD + REAUTH (737ee5d): wipeAllStores(uid) enumerates+deletes all 7 store docs (no Firestore cascade) then the parent backups/{uid} doc, block-and-retry (surfaces failure, not swallowed). Delete handler reworked: confirm → password prompt → reauthenticateWithCredential → ONLY on success → wipeAllStores → deleteDoc(users/{uid}) → deleteUser → clearLocalDfoStores(). Closes a real torn-delete bug (deleteUser bounced on auth/requires-recent-login AFTER profile/cloud already destroyed). Cross-platform: replaced iOS-only Alert.prompt with generic reusable src/screens/ReauthPasswordModal.tsx (props-driven, no feature copy inside, inline error + stays open on wrong password). Verified iOS sim AND physical Android: reauth-fail destroys nothing + retries clean; correct password sweeps account/cloud/profile/local. Gating re-verified line-by-line after each handler change. tsc 33/0-new. Both pushed origin/main. GOTCHAS banked: useAuth.ts is at src/Hooks/ (capital H) — stage by full path or git add aborts the stage (same class as FullDfoForm-in-components); when git commit opens vim the message is pre-filled — :wq, don't type git into the buffer. CARRIED INTO S87: DFO storage namespacing (uid-scope the 7 keys for multi-account coexistence; recon-only first — see Not yet built). |
| Session 87 | July 1 2026 | DFO storage uid-namespacing RECON (recon-only, no code; the doc was later committed in S88's bbd5b11). docs/RECON_namespacing_S87.md: inventoried the 7 DFO AsyncStorage stores (all FIXED device-level keys today → account A's data is visible to account B on one phone) + every read/write call site (captainStorage / crewStorage / dfoLogStorage / dfoBackup / dfoForm222Generator / dfoForm233Generator / transmission register) + the migration + sign-out surface, for the eventual per-uid coexistence build (COEXISTENCE, not clear-on-mismatch). Authority = grep of the working tree at b036bf2 (S86). Tree-not-clean (untracked recon docs + ios/Podfile.lock) flagged, not touched. |
| Session 88 | July 1–2 2026 | DFO storage uid-namespacing SHIPPED (Phase 1 + Phase 2) — four commits pushed origin/main. Phase 1 (bde42db — uid-namespace DFO storage keys, plumbing + routing re-sync): new src/utils/dfoStorageKeys.ts as the ONE source of truth — dfoKey(base,uid?) = `${base}::${uid}` (ambient activeDfoUid via setActiveDfoUid, fail-closed `::__anon__` when signed out) + DFO_STORE_BASES (the 7 bases); all store accessors repointed through it (captainStorage / crewStorage / dfoLogStorage / dfoBackup / dfoForm222Generator / dfoForm233Generator). Phase 2 (ce36f28 — migration adopt-on-sign-in, empty-slot guard): migrateBareKeysToUid(uid) copy-verify-clear, EMPTY-SLOT-ONLY per-key (skips any store whose ::uid target already holds data → never overwrites), wired into App.tsx post-sign-in. Docs committed bbd5b11 (RECON_namespacing_S87 + prior recon/audit backlog, 16 files); ios/Podfile.lock synced 9b344a4 (ExpoClipboard 8.0.8). iOS multi-account coexistence device-verified. |
| Session 89 | July 2 2026 | RECON-only — two investigations for the S90 build (no code; both docs later committed in S90's 7fdbac3). docs/RECON_multiday_S89.md — the cross-midnight timestamp bug: the four EFFORT/TRIP/LANDING timestamps share ONE trip date (dateFished) across the UI (FullDfoForm), storage (DfoLog), and generator (dfoXmlGenerator:86–89) layers, so a sail-late-D1 / haul-D2 trip is unrepresentable and the ordering validators (Rules 29/32/45/46) fire false "before" errors — the validators are themselves confirmed chronologically correct (would PASS if the underlying dates were right); root cause + every file:line + 3 candidate fix designs (per-field companion dates / +1-day toggle / full datetime), chose none. docs/RECON_222_reftables_S89.md — the 3 marine-mammal reftables (MV_CONFIDENCE_LEVEL / MV_MM_LENGTH_CATEGORY / MV_MM_SPECIMENS_CONDITION) are generated but wired NOWHERE; the matching 222 fields are ABSENT (not free-text, not hardcoded); XSD elements ID_CNFDNCE_ID / SPCMN_COND_ID / BDY_LEN_ID all minOccurs=0; sized small. Both landed as S90 builds. |
| Session 90 | July 2 2026 | Multi-day trip timestamps + shared 234 coord clamp + 222 reftable trio; DFO UAT 234 regression documented. Built on S89 recon (docs/RECON_multiday_S89.md + RECON_222_reftables_S89.md). MULTI-DAY (Phase 1/1b, 6834bd8): per-field companion dates sailDate/haulStartDate/haulEndDate/landingDate ride the existing `data` map (NO DfoLog interface change — same pattern as trapSize/gridId/statSectId); applyPickerValue writes each field's OWN date (sail-start also drives dateFished, the trip's nominal date); generator combines `d.<field>Date || log.dateFished` (fallback → same-day + quick-capture + OLD pre-S90 logs emit byte-identically, proven via launderSweep/blankTimestampGate + a temp cross-midnight harness); Quick Capture handlers stamp companion dates from the same now() at press; Rule 980 >24h-landing warning repointed to landingDate||dateFished; blank-time save-gate UNCHANGED (still keyed on HH:MM). COORD CLAMP (Phase C, 6834bd8): moved clampCoord4 → dfoConstants.ts (cycle-safe single def — importing 222→234 would cycle) + both generators + oneoff import it; applied to the 234 LAT/LONG emit (dfoXmlGenerator.ts:288–289) — closes the S70 divergence; emit-only, MAR FMA-38b only. 222 TRIO (Phase 2, 6834bd8): wired ID_CNFDNCE_ID/SPCMN_COND_ID/BDY_LEN_ID from MV_CONFIDENCE_LEVEL/MV_MM_SPECIMENS_CONDITION/MV_MM_LENGTH_CATEGORY (the MM tables, NOT the SAR-side MV_SPECIMENS_CONDITION) — 3 optional Form222Entry fields + 3 label lists + 3 Species-card pickers + emit label→codeId in verified XSD sequence order (247–259); xmllint validates WITH trio set AND fully omitted; LIVE WS0000 CONF 163057 (trio, codeIds 39600/39622/39602 confirmed in archived sent XML via on-device AsyncStorage grep) + CONF 163060 (blank, clean omission). 234 UAT REGRESSION: all 234 sends WS1038 as of 07-02 — PROVEN server-side, NOT the app: byte-identical re-send (fresh filename) of content DFO accepted 07-01 (CONF 163045) rejected WS1038 (CONF 163055); doc validates vs our on-disk XSD + is structurally identical to the 07-01 success; a 07-02 Form 233 send returned WS0000 (UAT up); 222/233 unaffected; reported to Kane (Ticket #2126), triage acknowledged; full evidence docs/WS1038_S90.md. BANKED: WS1034 = "same file name already received by DFO" (checked BEFORE content validation → byte-exact resends never revalidate; always fresh filename to test content); a FAILED send's XML lives in the register record's xmlSnapshot (@lobsterlog_xml_archive is success-only) — read via xcrun simctl get_app_container booted → Library/Application Support/<bundle>/RCTAsyncLocalStorage_V1 (manifest.json + md5(key) files; keys uid-namespaced <base>::<uid>). tsc 33/0-new, jest 17 suites/55 tests. Reports: docs/GATE1b_S90.md / GATE_C_S90.md / GATE2_S90.md. Commits 6834bd8 (code) / 7fdbac3 (recon+gate docs) / 5bf6275 (coord-clamp test repoint) — all pushed origin/main; this CLAUDE.md closeout is its own separate commit. CARRIED OPEN: cross-midnight LIVE 234 send banked until UAT recovers; confidence codeId 39600(Uncertain)-vs-39598(Probable) check if Probable was the actual on-device pick; 222 FR labels still _todo stubs; Android coexistence test; S91 UI batch (222/233 register refresh, 22-fields banner removal, picker exit button, header DFO ELOG button); NO live DFO POST by Claude Code ever — steps only. |
| Session 91 | July 2 2026 | Pre-ship UI batch (four device-gated fixes) + 234.12 package absorbed as intel; no generator/source change to the 234 emit yet. PHASE 1 (0aeff52): transmission register refreshes on the Form 222/233 modal onClose (a just-sent row appears without a manual reload); device-gated live 233 → WS0000 CONF 163061. PHASES 2+3 (2581e5e): "22 fields" banner removed (block + 2 i18n keys EN/FR + 3 orphaned styles); GRID_ID picker modal given a bottom Cancel (sheet pattern); STAT_SECT picker confirmed correct as-is. PHASE 4+4b (1994bd2): header clipboard → labeled "DFO ELOG" pill (#DC2626, glyph toggles, routing verbatim), identity block enlarged, three device-gated iterations; new key common.nav.dfoElog (FR _todo). Confidence-mapping check CLOSED (string-keyed lookup, CONF 163057 = Uncertain — settles the S90 39600-vs-39598 carried-open). Recon docs committed 869208c. 234.12 PACKAGE received from Kane — root cause of the S90 234 UAT regression NAMED: LOST_GEAR_IND Mandatory→Blocked (maxOccurs=0) in the 234.12 XSD → every 234 send since 07-02 bounces WS1038; prod cutover 2026-08-27; UAT enforcing since 07-02. NEW HARD RULE: Claude Code runs NO state-changing git (add/commit/amend/push/reset) + NO live DFO POST — steps only, Jonny runs them. Absorption (de-emit LOST_GEAR_IND + UI removal, xmllint-gated, then live recovery send) deferred to S92. This CLAUDE.md closeout is its own commit, authored at the top of S92 — S91's context closed before the dictated entry landed in the file. CARRIED OPEN: cross-midnight LIVE 234 send still banked until UAT/absorption clears; 222 FR labels still _todo stubs; Android coexistence test; DFO storage namespacing (carried since S87). |
| Session 92 | July 4 2026 | 234.12 absorption — RECON + setup only; NO source file touched (de-emit is S93). Opened by authoring the missing S91 CLAUDE.md closeout (commit 32c03ae — dictated at S91 close but never written; the clean-tree Step-0 check caught it). PACKAGE FILED: NEW 234.12 at ~/Desktop/DFO/ELOG_F234/ (XSD …20260624, instr 234.7), OLD 234.11 preserved byte-for-byte at ELOG_F234_old_234-11/ (XSD …20260130, instr 234.6) — folder names FLIPPED vs the original plan; DISAMBIGUATE BY XSD FILENAME DATE, never folder name. Stale CLAUDE.md XSD path refs fixed (ac482bb: Session-48-checkpoint authority path + S92 goals block). XMLLINT RECON (ed86b15, docs/RECON_234_12_xmllint_S92.md): extracted read-only from on-device AsyncStorage (uid FwXYZ…, register blob fcdb4703…, archive blob 2616f875…) a 07-02 REJECTED 234 (LL-20260702-003 xmlSnapshot; 6 retries differ only by regenerated timestamps) + the 07-01 ACCEPTED (LL-20260701-001, CONF 163045, xml_archive == register snapshot). Three lints keyed on XSD filename date: rejected vs NEW → FAIL, accepted vs NEW → FAIL, rejected vs OLD → PASS (valid under 234.11, server changed not us); CONFIRMATION: rejected minus the <LOST_GEAR_IND> line → validates clean vs NEW. FULL XSD DIFF (complete): SOLE breaking change = LOST_GEAR_IND maxOccurs 1→0 (Mandatory→Blocked); SOAKED_DUR integer_5→integer_05 + NB_GEAR_HLD integer_4→integer_04 renames NON-BREAKING (min 1→0 relaxation, no width change → no code change); plus an xsd_start_date comment + trailing newline. GOTCHA banked: libxml2 reports the failure at MM_INTER_IND (the element AFTER the maxOccurs=0 one) — a sequence-desync artifact; the XSD diff is the authority, not the error line. Raw docs/s92_*.xml gitignored (carry LIC_NO/VRN, reproducible), recon .md is the evidence. VERDICT: LOST_GEAR_IND theory CONFIRMED by artifacts; S93 de-emits it. CARRIED OPEN: cross-midnight LIVE 234 recovery send still banked (becomes the S93 recovery trip); 222 FR labels _todo; Android coexistence test; DFO storage namespacing (since S87). |
| Session 93 | July 4–5 2026 | 234.12 ABSORBED — LOST_GEAR_IND de-emit (generator + UI all four subforms) + trip-timestamp date+time display + regression guard; live recovery send accepted; Ticket #2126 CLOSED. Commit 748340e (de-emit + UI + i18n + guard test + timestamp display + gate doc + CLAUDE.md), pushed origin/main. GENERATOR (dfoXmlGenerator.ts): dropped the lostGear derivation + the unconditional <LOST_GEAR_IND> EFFORT emit; validator EFFORT_SPEC LOST_GEAR_IND min:1,max:1 → min:0,max:0 (Blocked — "too many <LOST_GEAR_IND>" if present); no other field's emit moved. UI (FullDfoForm.tsx): removed the Lost/Found Gear question for all four subforms (state/load/buildLogData/handleLostGearYes/both picker cases/'lostGearTime' PickerField/renderLostGearFields/render block/save-gate), SAR_IND/MM_INTER_IND untouched + still init null (modified Rule 602). i18n: 6 orphaned form234 keys removed EN+FR (lostGear [already-orphaned] / lostGearIndLabel / lostGearIndPrompt / gearTypeLabel / gearTypePlaceholder / lostGearSubsection; shared date/gps/lat/lng KEPT) + missingIndicatorsAnswer reworded (dropped "and Lost Gear" / "et les engins perdus ou trouvés"). GUARD: new deEmitLostGear.oneoff.test.ts — 8 absence (4 subforms × lostGearYes 'true'|'false') + 1 blocked-direction injection; jest 17/55 → 18/64. TIMESTAMP DISPLAY: display-only formatDateTimeDisplay — the four trip timestamps (Time Sailed/Started Hauling/Stopped Hauling/Landing) now render locale-aware date+time ("Jul 5, 12:33" EN / "5 juill., 12:33" FR via i18n.language); storage/companion-date keys/generator UNTOUCHED. GATES: xmllint all four VALID vs the NEW XSD …20260624 (LOST_GEAR_IND absent), tsc 33/0-new, jest 18/64. LIVE RECOVERY: LL-20260704-001 Trip #9 MAR-90 (VRN/LIC 104460) → WS0000 CONF 163081 (July 5), filename 1004-104460-20260705153219.XML. ARCHIVE-GREP (read-only, docs/ARCHIVE_GREP_RECOVERY_S93.md): the recovery entry's actual sent bytes carry ZERO LOST_GEAR_IND (EFFORT seq FMA_ID→SAR_IND→MM_INTER_IND→DG_CLOSE_DT); whole-blob substring count 12, ALL from pre-fix logbook entries idx 0–5, every post-fix entry clean. Reports docs/GATE_234_12_DEEMIT_S93.md + docs/ARCHIVE_GREP_RECOVERY_S93.md. Q-LCSG CLOSED (MV_LCSG_VS_FMA_rel3.csv found in ~/Desktop/DFO/ELOG_reftables/ — ingestion is a future item); Change Management Document filed; thank-you email to Kane closing #2126 (CONF 163081 cited). CARRIED OPEN: recovery was SAME-DAY → cross-midnight live send still banked (rides TRG sweep); 222 FR labels _todo; Android coexistence; DFO storage namespacing (since S87). |
| Session 94 | Jul 06 2026 | (ROW BACKFILLED IN S96 from docs/RECON_S94_DOCS_CARD.md + docs/GATE_S94_DOCS_CARD.md + commit subject — not written at S94 close; date = commit author date, doc header dated Jul 05.) Offline DFO Documents card in Settings (Rule 2500 — DFO instructions accessible offline). New "DFO Documents" card inserted between the Preferences and Account cards (Settings UI lives in App.tsx, not a separate screen); two language-aware rows open bundled PDFs in a full-screen in-app viewer via expo-asset `localUri` — no network in the path. expo-asset approach; New-Architecture split left untouched. tsc 33/0-new, jest 18/64. BLOCKING PREREQUISITE noted at gate: the two `providers_instructions_{en,fr}.pdf` were NOT yet in `assets/docs/` (Jonny provides) — Metro fails the `require()` bundle until they are dropped in. Committed 814d583, pushed origin/main. |
| Session 95 | Jul 06–08 2026 | (ROW BACKFILLED IN S96 from docs/GATE_S95_ITEM1/2/34.md + docs/DEFER_S95_KEYBOARD_SCROLL.md + docs/RECOVERY_S95_BUILD.md + docs/DIAG_S95_ITEM2.md + commit subjects — not written at S95 close; dates = commit author dates, doc headers dated Jul 05.) Android hardening in four items across four commits. ITEM 1 (4d5cca9): datetime picker crash fix — declarative `<DateTimePicker mode="datetime">` is invalid on Android (`datetime` is not an Android mode → the unmount-cleanup effect calls `DateTimePickerAndroid.dismiss('datetime')` → `pickers['datetime']` undefined → "Cannot read property 'dismiss' of undefined" on OK); fixed via an imperative date-then-time flow; fix committed (4d5cca9), gate doc GATE_S95_ITEM1.md notes Pixel verification PENDING at write time (not asserted as gating the commit). ITEM 2 (89d3147): draft crash-safety — scratch draft + restore prompt; minimal slice (NO restore-into-list, NO transmission-path / saved-log-shape change); device-verified PASS on Pixel 8 (restore/discard/clear-on-save-back-send/edit); a "no restore prompt" failure was a STALE BUILD red herring, not a code fault (DIAG_S95_ITEM2.md); temp logcat probes + a babel console-keep tweak added to diagnose it and FULLY REVERTED (babel.config.js back to committed state); this is the +1 suite/+4 tests moving jest 18/64 → 19/68. ITEMS 3+4 (538baff): Android edge-to-edge — root cause `android/gradle.properties` `edgeToEdgeEnabled=true` (Expo SDK 54 / RN 0.81 default) makes `StatusBar.currentHeight`/opaque backgroundColor unreliable (header clips) and neuters `windowSoftInputMode="adjustResize"` (keyboard covers inputs); fix = SafeAreaProvider (index.js) + app header + Form 222/233/Captain Profile modal headers + DfoSetup header (2a: paddingTop 14) + transmission-result modal SentLogDetailModal header (2b: insets.top+12) + keyboard-avoidance KAVs (bait/bycatch sheet, Form 222, Captain Profile, DfoSetup); device-confirmed. DEFERRED: FAIL 1 main-form scroll-into-view in FullDfoForm (4 attempts failed at Fabric boundaries) → hand-off docs/DEFER_S95_KEYBOARD_SCROLL.md; `[S95KB]` probes + temp babel change reverted. tsc 33/0-new, jest 19/68. DEFERRAL + BUILD-RECOVERY docs (5896d19): docs/RECOVERY_S95_BUILD.md — the release build fails because the flow runs `gradlew clean`, which is broken on this project (New-Architecture codegen bug); NEVER `prebuild --clean` (it overwrites the committed `android/` + `ios/`); recover by hand-deleting the stale gitignored native build dirs and rebuilding WITHOUT `gradlew clean`. Commits 4d5cca9 / 89d3147 / 538baff / 5896d19, all pushed origin/main. |
| Session 96 | Jul 08 2026 | GPS capture for DFO location fields + red required-field asterisks. GPS PHASE 1 (Form222Screen.tsx): "Use my location" button on the Form 222 lat/long card — when-in-use permission (requested if needed) → `getCurrentPositionAsync` Accuracy.High raced against a 15 s timeout → `clampCoord4(String(coord))` written THROUGH the existing `handleLatChange`/`handleLonChange` (so the 38–72 / −148…−40 range validation runs and values stay hand-editable); on denied / no-fix / non-finite / timeout → loud Alert, fields UNTOUCHED, never 0/blank; new i18n en+fr (FR best-effort, proofreader pile). PHASE 1b (FullDfoForm.captureGps hardening, separate commit): clamp via clampCoord4 (was toFixed(4)) + 15 s timeout race + non-finite guard on ALL paths + opt-in loud alert via `opts.alertOnFail` — only the manual "Capture GPS" button alerts; the Stop Haul / MM=Yes / SAR=Yes auto-triggers stay SILENT (no double-alert, no Stop-Haul spam). Accuracy.High kept — BOTH forms High (the earlier Form 222 "Balanced" spec was SUPERSEDED mid-session per Jonny). SAFETY-NET AUDIT (required before manual-only alerting) = PASS: every auto-filled coord is either not emitted (MM coords: generator emits only MM_INTER_IND Y/N — the 234 XSD has no MM coordinate element) or hard-blocked before emit if empty (effort LAT/LONG via validateElogXml Rule 3059, a HARD pre-send gate at DfoLogsListScreen `if(!valid)return`; SAR LAT/LONG via handleSave check + sar_type LAT/LONG min:1). No native change needed — NSLocationWhenInUseUsageDescription (iOS) + ACCESS_FINE_LOCATION (Android) already present; no prebuild. ASTERISKS PHASE 3 (separate commit): grey → DFO-pill red via ONE additive `REQUIRED_ASTERISK_COLOR = '#DC2626'` in GlobalStyles.ts (matches dfoPill; existing shared values untouched). FullDfoForm 13 asterisks `#EF4444` → constant (Trash2 delete icons + problemDot reds preserved); Form 222 (9 direct labels + `renderDropdown` gained a `required` flag; species/interactionType pass true, optional trio bare) + Form 233 (3 labels; operator/licence/fin left bare) DE-BAKED ` *` out of the en+fr i18n label strings into a styled `<Text>`; CaptainProfile 7 asterisks added to EXACTLY the pre-send completeness gate (`REQUIRED_PROFILE_FIELDS`, captainStorage.ts) — gearType left bare (gate excludes it). tsc 33/0-new, jest 19/68 throughout. Recon docs/RECON_S96_GPS.md + docs/RECON_S96_ASTERISKS.md; gate docs/GATE_S96_GPS.md. NO-GIT: commit blocks handed to Jonny (GPS·222 / GPS·234 / asterisks / docs + this CLAUDE.md). PENDING (Jonny runs): iOS-sim smoke + Pixel 8 device gate + FR proofread. Rows for S94 + S95 above were backfilled this session (were absent — table had ended at S93). |

---

## Current session goals
> Update this section at the start of each session.

SESSION 94 — TBD