# LobsterLog — CLAUDE.md
App version: 1.8.6 (versionCode 76)
Last updated: June 14, 2026 (Session 55 complete; Session 56 next)

## What this app is
React Native / Expo mobile app. DFO-qualified electronic logbook for lobster harvesters.
Built by Jonathon Nickerson, Cape Sable Island NS (LFA 34). Solo indie dev.

---

## Pending / waiting on
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
`Desktop/DFO/ELOGS_F234/39673.234.…Homard_20260130 000000.xsd`, validated with
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
- Indicator tension: Item 8 wants indicators defaulting null, but EFFORT
  SAR_IND/LOST_GEAR_IND/MM_INTER_IND are MANDATORY Y/N → null in state, block send if
  unanswered, emit Y/N.

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
the send with a pointer to open Q4; never green-lights a doc xmllint rejects). SAR detail + LAT/LONG emission held on open Q3 + missing SAR UI fields
(NB_SPCMN, SPCMN_COND_ID). Fixture test: `src/utils/__tests__/genSampleMar90.oneoff.test.ts`.
Details in `docs/archive/ELOG_RESTRUCTURE_BLUEPRINT.md` (status header updated).

---

## Key files
| File | Purpose |
|---|---|
| `dfoXmlGenerator.ts` | generateElogXml(), generateSoapEnvelope() (SaveIncomingFile), buildSaveIncomingFileEnvelope(), generateDfoXmlFileName(), buildValidateElogKeyEnvelope(), parseValidateElogKeyResponse(), generateReportUid(), validateElogXml(), LGBK_UID |
| `dfoForm222Generator.ts` | Form222Entry, generateForm222Xml(), validateForm222Xml(), generateSoap222Envelope(), save/load, constants |
| `dfoForm233Generator.ts` | Form233Entry, generateForm233Xml(), validateForm233Xml(), generateSoap233Envelope(), save/load, constants |
| `dfoConstants.ts` | DFO_SUBFORM_REGISTRY, DFO_SUBFORM_FIELD_CONFIG, all region data (FMA, bait, catch, PCONS lists), DFO_FMA_38B, DFO_FMA_NB_VNTCH(_YOU) rule sets |
| `scripts/generateReftables.js` | DFO reftable codegen: data/dfo-reftables/*.csv (cp1252) → src/data/reftables/*.ts (typed, committed); rerun on new DFO rel versions (§15) |
| `src/data/reftables/` | GENERATED — 11 MV_* tables (catch usage, specimens/bait condition, partnership, province, F222 cluster incl. MV_NOAA_MM_SPECIES) |
| `FullDfoForm` | Main DFO form UI, isVisible()/isRequired() guards, all 4 subforms |
| `DfoLogsListScreen` | Send to DFO handler, real fetch() + parseDfoSoapResponse(), retry UI, Form 222/233 entry points |
| `Form222Screen` | Marine mammal interaction entry form — date, species, nb animals, type, disposition, notes |
| `Form233Screen` | Inactivity report entry form — period start/end, reason; pre-populates from captainStorage |
| `captainStorage` | CaptainProfile — subformId, regId, language, units, dfoActivated, dfoLicenceNo, dfoFin, elogKey; loadPrivacyAccepted() / savePrivacyAccepted() |
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
- DG_CLOSE_DT section-close flow — Close/Unlock buttons on LANDING, EFFORT, BAIT_USED, SAR, PCONS, HLIN, HLOUT sections; stamps UTC ISO 8601 on close; locked sections use pointerEvents="none" + opacity: 0.45; timestamps persisted in buildLogData and restored on edit
- KEPT_WT mandatory for MAR — in field config
- LGRID_ID optional for MAR — in field config
- OBS_TRIP_NUM optional for MAR — in TRIP section
- Form 222 generator — dfoForm222Generator.ts: Form222Entry (full field set per FS-NAT-222-1-EN), saveForm222Entry, loadForm222Entries (3-yr retention), generateForm222Xml (INTERACT_IND Y/N — when N only outputs indicator; when Y outputs all 15 fields in YYYYMMDD/HHMM format), validateForm222Xml (structural + date cross-validation Rules 566/589/590/591/592 + LAT/LON bounds + Y/N flag checks + RELEASE_IND conditional on ENTANGLE_IND=Y), generateSoap222Envelope; MARINE_MAMMAL_SPECIES (label+codeId pairs, TODO: confirm DFO code IDs), INTERACTION_TYPES (label+codeId pairs E/V/O); DISPOSITION_OPTIONS removed (replaced by individual Y/N indicator fields)
- Form 222 UI — Form222Screen.tsx: INTERACT_IND master Y/N toggle collapses/expands all fields; REP_DATE + INTERACT_DT + INTERACT_TM date/time inputs; LAT/LON numeric inputs with real-time bounds validation (Rules 172/173); species dropdown (MARINE_MAMMAL_SPECIES_LABELS → SPECIE_ID code); NB_ANIMAL; INTERACT_TYPE_ID dropdown; INJURY_IND/DEATH_IND/ENTANGLE_IND/RELEASE_IND(conditional)/GEAR_DAMAGE_IND Y/N toggles; OBSERVER_NM + CONTACT_INFO text inputs; REMARKS multiline; all strings through i18n dfo.form222.*; FR stubs as _todo; validates + simulated submit + saves to AsyncStorage + XmlArchive; accessible via modal from DfoLogsListScreen
- Form 233 generator — dfoForm233Generator.ts: Form233Entry, saveForm233Entry, loadForm233Entries (3-yr retention), generateForm233Xml, validateForm233Xml, generateSoap233Envelope; INACTIVITY_REASONS; reason codes W/M/P/O
- Form 233 UI — Form233Screen.tsx: pre-populates operator/licence/FIN from captainStorage (read-only); period start/end date inputs; reason dropdown; validates + simulated submit + saves to AsyncStorage + XmlArchive; accessible via modal from DfoLogsListScreen
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
- PCONS XML section implemented in generateElogXml() — repeating <PCONS> nodes (no wrapper), child-element style per XSD sequence: SPECIE_ID (label→codeId via getDfoPconsSpeciesList), SPECIE_FRM_ID (4691, hardcoded), SPECIE_SZ_ID (826 for lobster, 10670 unsized for all others), WT (kg), USG_ID (37822 personal consumption, personalUse entry only), DG_CLOSE_DT (YYYYMMDDHH24MISS from d.dgClosePcons or current UTC); toCloseTimestamp() helper added; DFO_SPECIE_FRM_ID and DFO_PCONS_OTHER_SIZE_ID imported from dfoConstants
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

---

## Not yet built
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
  3059; gpsSrc source flag in FullDfoForm). SAR node emission still held on missing
  SAR UI fields (NB_SPCMN, SPCMN_COND_ID — reftable now generated, UI not built)
- SOAKED_DUR wire unit — Session 51 finding: XML dictionary UNIT_OF_MEASURE_ID 11850
  = MINUTES (UI captures days per Rule 286; generator converts days→min). Worth a
  courtesy confirmation with Kane since Rule 165's "216 hours" phrasing is ambiguous
- Lost Gear — RESOLVED (Kane Patterson, June 2026): LOST_GEAR_IND stays on EFFORT node until DFO August 2026 release removes it; FGRS handles actual gear reporting; no app integration required; Form 223 not building
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
  at send. Generator output UNCHANGED. tsc=33 baseline, jest 3/3
- Old pre-Session-53 logs (e.g. LL-20260605-001) have no portLandedCodeId and fail
  LANDING.PORT_ID validation — expected old-data artifacts (harmless dev throwaways), NOT a
  code bug; no migration planned

---

## DFO qualification gates remaining
- [x] XSD validation passing on test XML — all four subforms validate with real PORT_IDs (Session 53); first UAT SaveIncomingFile returned WS0000 (CONF 162836)
- [ ] All prerequisite forms built (222 ✅, 233 ✅, Lost Gear confirmed ✅ — FGRS external, no Form 223)
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

---

## Current session goals
> Update this section at the start of each session.

SESSION 56 — TBD. Carried from Session 55 (Phase 3 not started, no go given): pick ONE
subform-field item as a recon-first mini-phase — PCONS SPECIE_SZ_ID block/hide for MAR-90
(UI+XML), CATCH NB_SPCMN_KEPT+NB_SPCMN_DISC block for MAR-90, or EFFORT_DETAIL.TRP_SZ_ID wire
for NL-91 (mandatory).