# RECON — Session 97 French Sweep (Phase 1, READ-ONLY)

**Date:** 2026-07-08 · **Scope:** entire app (free/Pro + DFO + dev). **Phase 1 = recon only; zero edits made.**
**i18n setup:** i18next, langs `['en','fr']`, namespaces `['common','dfo','map']`, `defaultNS='common'`, `fallbackLng='en'` (missing FR keys silently fall back to EN — see §1a).

Method: deterministic flatten+diff of all six locale files (`src/i18n/audit` script), plus targeted code reads and a full-`src/` hardcoded-string sweep. Line numbers are current as of this session.

---

## HEADLINE

- **Structural parity is clean:** 0 EN keys missing in FR, 0 empty strings, 0 orphan keys (bar a benign `_todo` sentinel), 0 mojibake, **0 asterisks in any translatable string** (S96 de-bake CONFIRMED, EN+FR, all namespaces). FR accents intact (209 dfo + 120 common + 16 map values carry proper accented chars).
- **All S94/S95/S96 additions are present in BOTH languages** and (except the known stubs) fully translated: GPS alert keys (Form 222 + 234), `settings.doc*` DFO-Documents card, `form234.restoreDraft*`, `common.nav.dfoElog`.
- **13 `_todo` English stubs remain** — and the leak is *exactly* these 13 (an English-function-word heuristic over all FR values surfaced nothing else). 6 are the known Form 222 trio; **7 in `common.json` were NOT on the known list**, of which **6 render to the 175 live free/Pro users** (account-deletion + backup notices). See §1b.
- **Two language pickers disagree** (§3): free Settings hardcodes endonyms ("English"/"Français") correctly; Captain Profile translates them (→ "Anglais"/"French" in the off-language).
- **FR leans MPO but 6 DFO-side strings still say "DFO"** (§4) — per-string decision list in Fix List A.
- **Hardcoded strings (§2):** DFO side is mostly `t()`-wired; gaps are the Form 222/233 submit/confirm/validate dialogs, DfoSetup purchase alerts, and a couple port-selector strings (Fix List A). The **free/Pro side (App.tsx Daily Log/Settings, Paywall, Tutorial, Login, Map) is largely un-internationalized** — big surface, flag-only, its own project (Fix List B).

---

## §1 — i18n KEY AUDIT (en vs fr, per namespace)

Key counts: `dfo` en=386/fr=387 · `common` en=250/fr=251 · `map` en=27/fr=28 (each FR file's +1 is the top-level `_todo` sentinel, see §1e).

### §1a — Keys in EN but MISSING in FR
**NONE** in any namespace (dfo/common/map). No silent EN fallbacks anywhere. ✅

### §1b — FR values flagged `_todo` / stub (13 total)
This is the whole of the French debt. An independent English-function-word scan over every FR value found **no untranslated leaks beyond these 13** — the tagging is complete and trustworthy.

**dfo.json — 6 (the known Form 222 marine-mammal trio; DFO-side):**
| line | key | FR (stub) | EN |
|---|---|---|---|
| 325 | `form222.confidenceLabel` | `IDENTIFICATION CONFIDENCE _todo` | IDENTIFICATION CONFIDENCE |
| 326 | `form222.confidencePlaceholder` | `Select confidence… _todo` | Select confidence… |
| 327 | `form222.specimenCondLabel` | `SPECIMEN CONDITION _todo` | SPECIMEN CONDITION |
| 328 | `form222.specimenCondPlaceholder` | `Select condition… _todo` | Select condition… |
| 329 | `form222.lengthCatLabel` | `BODY LENGTH _todo` | BODY LENGTH |
| 330 | `form222.lengthCatPlaceholder` | `Select length… _todo` | Select length… |

**common.json — 7 (only `nav.dfoElog` was on the known list):**
| line | key | FR (stub) | renders to normal users? |
|---|---|---|---|
| 15 | `nav.dfoElog` | `ELOG MPO _todo` | yes — header DFO-ELOG pill (already uses "MPO"; just drop ` _todo`) |
| 264 | `backup.restoredNotice` | `_todo Restored your logbook from backup` | **yes — free/Pro (cloud backup restore toast)** |
| 265 | `backup.wipeFailedRetry` | `_todo Couldn't reach the server to delete your backup — check your connection and try again.` | **yes — free/Pro (backup wipe error)** |
| 268 | `account.reauthTitle` | `_todo Confirm account deletion` | **yes — free/Pro (delete-account reauth)** |
| 269 | `account.reauthPrompt` | `_todo Enter your password to confirm account deletion.` | **yes — free/Pro** |
| 270 | `account.reauthConfirm` | `_todo Delete account` | **yes — free/Pro** |
| 271 | `account.reauthFailed` | `_todo Couldn't verify your password — nothing was deleted. Please try again.` | **yes — free/Pro** |

⚠️ **The 6 `account.reauth*` + `backup.*` stubs are outside the session brief's "known" list, but they ARE tracked in CLAUDE.md's "FR proofreader pile"** (Not-yet-built, S84–86: `backup.* (oneOff* + restoredNotice)`, `account.* (reauthTitle/Prompt/Confirm/Failed)` + ReauthPasswordModal copy + the reworded privacy FR). So they're known debt, not a new discovery — but they render raw English (prefixed `_todo`) to a francophone deleting their account or restoring a backup, and they belong in this FR decision. FLAG — see Fix List B.
*(Reconciling with the pile: the pile also lists `backup.oneOff*` and the privacy-notice FR reword — my `_todo` scan did NOT flag those, meaning they're already translated in FR and merely await proofread, not raw English stubs. The 13 raw stubs here = trio×6 + `nav.dfoElog` + `account.reauth*`×4 + `backup.restoredNotice`/`wipeFailedRetry`. That's the actual raw-English surface today.)*

### §1c — FR value IDENTICAL to EN (16 total; most legitimate)
Legitimate (French word is the same / brand / format token) — **no action:**
- `LATITUDE` / `LONGITUDE` (dfo `form234.*`, common `log.*`/`settings.*`) — identical in FR.
- `HH:MM` (`form222.timePlaceholder`), `OK` (`nav.ok`), `LobsterLog Pro` (`pro.upgradeTitle`).

Borderline — **flag only (free/Pro side):**
- `Lat` / `Lng` abbreviations (`form234.latPlaceholder`/`lngPlaceholder`, `log.latPlaceholder`/`lngPlaceholder`) — abbreviations; FR often uses "Lat"/"Long". Cosmetic.
- `{{lbs}} lbs` (`form234.lbsSuffix`, `log.lbsSuffix`) — units suffix; ties to §3 units question.
- `AIR` (`pro.air`) — Weather screen label (**DO NOT TOUCH**); flag only.

### §1d — Empty-string values
**NONE** either side, any namespace. ✅

### §1e — Keys in FR but not in EN (orphans)
Only `_todo: "TRANSLATION PENDING"` at the top level of each FR file (dfo/common/map). This is a **housekeeping sentinel, not a real orphan** — no code reads it. Harmless; leave as-is (or optionally remove once the debt in §1b is cleared).

### §1f — S94/S95/S96 additions present in BOTH languages
All ✅ present EN+FR:
- **GPS alerts — Form 222:** `useMyLocation`, `capturingGps`, `locationCard`, `gpsDeniedTitle`/`Body`, `gpsNoFixTitle`/`Body` — all real French.
- **GPS alerts — Form 234 (FullDfoForm):** `captureGpsButton`, `capturingGps`, `gpsCoordinatesSection`, `gpsLocationLabel`, `gpsDeniedTitle`/`Body`, `gpsNoFixTitle`/`Body` — all real French.
  - *Note:* there is no separate GPS-*timeout* key by design — per S96 recon the 15 s GPS timeout reuses the no-fix alert. (The `logs.timeoutTitle/Body` pair is the 30 s **transmission** timeout, unrelated, also present both langs.)
- **S94 DFO-Documents card:** `settings.dfoDocsCard`, `settings.docDfoInstructions(+Sub)`, `settings.docProvidersInstructions(+Sub)`, `settings.docViewerClose` — all present, fully translated (real FR).
- **S95 restore-draft:** `form234.restoreDraftTitle/Body/Restore/Discard` — all present, fully translated.
- **S91 `common.nav.dfoElog`** — present both langs (FR still `_todo`, see §1b).

### §1g — Asterisks & mojibake
- **Asterisks in translatable strings: ZERO** across dfo/common/map, EN and FR. S96 de-bake CONFIRMED. Code side verified too: Form 222/233 + FullDfoForm render the required `*` as a **separate** `<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>` node appended in JSX — the `t()` label string is clean (e.g. `Form233Screen.tsx:250`, `Form222Screen.tsx:390`, `FullDfoForm.tsx:942`).
- **Mojibake: ZERO.** No UTF-8-as-latin1 artifacts. FR files are clean UTF-8; accented chars (é è à ç ê î ô û ë ï œ …) render correctly across all FR values.

---

## §3 — LANGUAGE / UNITS UX (static read)

### Language buttons — INCONSISTENT between the two pickers ⚠️
There are **two** language selectors and they behave differently:

1. **Free Settings** (`App.tsx:1141`): `{lang === 'en' ? 'English' : 'Français'}` — hardcoded **endonyms**. Always shows "English" / "Français" regardless of UI language. ✅ This is the "each in its own language" convention.
2. **Captain Profile / DFO** (`CaptainProfileScreen.tsx:341,350`): `{t('settings.english')}` / `{t('settings.french')}` — **translated**. Shows "English"/"French" in EN mode, but **"Anglais"/"Français" in FR mode**. ✗ Does NOT follow "each in its own language" — in FR mode the English option reads "Anglais".

The keys behind #2: `settings.english` = EN "English" / FR "Anglais"; `settings.french` = EN "French" / FR "Français".
(They also use different mechanisms: Settings sets a `prefLanguage` state applied on Save; Captain Profile calls `changeLanguage()` immediately. Noted, not a string issue.)

### Units (lbs/kg) toggle
- Section label `settings.weightUnitsLabel` IS translated ("WEIGHT UNITS" / "UNITÉS DE POIDS").
- **The toggle option labels bypass `t()`** — `App.tsx:1164` renders the raw enum `{u}` → literal "lbs" / "kg" (lowercase). Units abbreviations, universally understood; low priority but strictly untranslated.
- Related hardcoded units strings on the free Daily Log / history (all bypass `t()`, all English — see Fix List B): `App.tsx:771` `LBS CAUGHT`, `App.tsx:952` `{...} lbs` history suffix (also ignores the kg/lbs pref), `App.tsx:766` `Saving...`.

---

## §4 — FR "DFO" vs "MPO" split

Occurrence counts (FR files): `dfo.json` DFO=6 / MPO=33 · `common.json` DFO=1 / MPO=8 · `map.json` 0/0. **FR leans MPO ~41:7.** (EN side is all "DFO", 0 "MPO" — expected.)

The 7 FR "DFO" occurrences:
| ns | line | key | FR string | verdict |
|---|---|---|---|---|
| dfo | 11 | `setup.title` | `Configuration DFO` | → MPO candidate |
| dfo | 12 | `setup.region` | `Région DFO` | → MPO candidate |
| dfo | 17 | `setup.headerTitle` | `Configure ton journal électronique DFO` | → MPO candidate |
| dfo | 25 | `setup.priceLabel` | `LAISSEZ-PASSER DE SAISON JOURNAL DFO` | → MPO candidate |
| dfo | 28 | `setup.activateButton` | `Activer le journal DFO` | → MPO candidate |
| dfo | 198 | `logs.title` | `Journaux DFO` | → MPO candidate |
| common | ~ | `profile.finError` | `…ou DFOCC + 9 chiffres.` | **KEEP — "DFOCC" is a FIN-prefix code, not the agency name** |

Note the split is already partial *within* the logs section: `logs.headerTitle` (dfo:235) is `Journaux ELOG MPO` while `logs.title` (dfo:198) is `Journaux DFO`. All 6 candidates are DFO-side (setup/logs screens).

---

## §2 — HARDCODED-STRING SWEEP (bypassing t())

*(The delegated sweep agent hit a session limit before returning findings; this section was produced by a direct grep+read sweep of all of `src/` + `App.tsx`.)*

**Big picture:** The **DFO side is mostly internationalized** — GPS/VRN/restore-draft alerts, most FullDfoForm/DfoLogsList dialogs, and all field labels go through `t()`. The gaps are concentrated in the **Form 222/233 submit-confirm-validate dialogs** and the **DfoSetup purchase/restore alerts** (older code, pre-i18n). The **free/Pro side is largely NOT internationalized** — the entire free Daily Log, Settings inputs, Map, Paywall, Login, and Tutorial render hardcoded English. That's a big surface but it's out of DFO scope, has 175 live users, and is flag-only per the brief.

### (A) DFO-SIDE hardcoded strings — renders to users unless noted
**Form 222 (`Form222Screen.tsx`):**
- `286` `Alert.alert('Missing Fields', 'Please complete all required fields before submitting.')`
- `291–295` confirm dialog — title/body via `t()` but button `{ text: 'Cancel' }` hardcoded
- `332–335` `'Validation Failed'` title + `'OK'` button hardcoded (body via `t()`)
- `357` `'Submission Failed', detail || 'Unknown error'`
- `366` `'Submitted'` title + `'OK'` button hardcoded (body via `t()`)
- `368` `'Submission Failed', e.message ?? 'Unknown error'`

**Form 233 (`Form233Screen.tsx`) — the most hardcoded DFO screen:**
- `124` `'Missing Fields', 'Please complete all required fields before submitting.'`
- `128–134` entire confirm dialog hardcoded: `'Submit to DFO?'` / `'This inactivity report will be submitted to DFO.'` / `'Cancel'` / `'Submit'`
- `153–156` `'Validation Failed'` / `'Form 233 failed schema validation and was not sent.\n\n…'` / `'OK'`
- `178` `'Submission Failed'` · `187` `'Submitted', 'Form 233 has been sent to DFO.'`, `'OK'` · `189` `'Submission Failed'`

**DFO Setup (`DfoSetupScreen.tsx`) — purchase/restore alerts, all hardcoded, all user-facing:**
- `50` `'Missing','Please enter your Licence Number.'` · `54`/`117` `'Missing','Please enter your FIN (Fisher ID Number).'`
- `89` `'Unavailable','The DFO ELOG purchase is not available right now. Please try again later.'`
- `108` `'Purchase Error', …` · `143` `'Not Found','No previous DFO ELOG purchase was found for this account.'` · `146` `'Error','Could not restore purchases.'`
- (`78` `'Dev Error'` and `162` `DEV` pill = dev-gated → category C)

**DFO Logs list (`DfoLogsListScreen.tsx`)** — mostly `t()`; gaps:
- `752` privacy-gate alert body hardcoded: `'You must accept the Privacy Notice to use DFO features.'` + `'OK'` (title via `t()`)
- `283–286` interpolated technical detail `Error ${result.errorCode}` / `'DFO error'` fallback (server-error detail line; low priority)
- `576` `XML Test Harness` button label (routes to dev harness → borderline C)

**FullDfoForm (`FullDfoForm.tsx`)** — nearly all `t()`; only:
- `786`, `801` `Alert.alert('', t(…), [{ text: 'OK' }])` — `'OK'` button hardcoded (title empty, body via `t()`)

**DFO port selector (`DfoPortSelector.tsx`):** `82` placeholder `Type to search ports…` · `93` `Clear` · `98` `No matching ports — toggle "All ports".`

### (B) FREE/PRO-SIDE — FLAG ONLY (175 live users; Weather = DO NOT TOUCH)
**`App.tsx` — the free Daily Log + Settings screen is almost entirely hardcoded English (~20 strings):**
- Labels: `741` `DAYS OUT`, `744` `This season`, `749` `THIS WEEK`, `754` `Sun - Sat`, `764` `Daily Log`, `766` `Saving...`, `771` `LBS CAUGHT`, `781` `PRICE / LB`, `796` `WATER TEMP`, `806` `WIND (KTS)`, `817` `WIND DIRECTION`, `842` `CONDITIONS`, `869` `NOTES`, `881` `Save Log`, `691` `Start New Bait Season`, `692` `Clear graph & start fresh`, `991` `No history recorded for this date.`, `1006` `PRO`, `473` `Loading LobsterLog...`, `545` `Capt.` prefix
- History suffix `952` `{…} lbs` (also ignores the kg/lbs pref); units toggle option labels render raw enum `{u}` (`1164`)
- Placeholders: `875` `Crew, gear issues...` (the rest — `0`/`0.00`/`--`/lat-lng examples — are language-neutral)

**Other free/Pro surfaces (hardcoded, flag only):**
- **The live map is `Garminmapbox.tsx`** (imported + rendered in `App.tsx:85/611`) and it IS `t()`-wired — only its `365` `TEST GARMIN` (`__DEV__`-gated) button is hardcoded. `FishingMap.tsx` (hardcoded: `410` `HEAT MAP`, `439` `DROP PIN & LOG`, `456` `TRAWL NUMBER`, `468` `LOBSTERS CAUGHT`, Alerts `204/281`, placeholders `463/475`) is **NOT imported anywhere — legacy/dead code, does NOT render.** So the map surface is effectively fine; FishingMap only matters if it's ever revived.
- `PaywallModal.tsx` (whole modal hardcoded): `85` `Upgrade to Pro`, `93` `Loading options...`, `112` `No subscription options found.`, `114` `Close`, `120` `Restore Purchases`, `124` `Not Now`, `130` `Terms of Use (EULA)`, `133` `Privacy Policy`; Alert `53` `'Purchase Error'`
- `TutorialModal.tsx` — entire tutorial hardcoded (lines `30–121`, ~12 strings)
- `LoginScreen.tsx`: `55` `Check Your Inbox`, `61` `Back to Log In`, `91` `Digital Logbook`, `96` `EMAIL`, `110` `PASSWORD`; Alerts `34/39/41`; placeholders `103`/`117`
- `ProDashboard.tsx`: `363` `LAT: …`, `364` `LNG: …`
- `TrawlHistoryModal.tsx` `53/58/144/172/182`; `HistoryGraph.tsx` `181` `No data recorded…`; `PortSelector.tsx` `83` `Delete`/`108` `Add & Save`/`102` placeholder `Port name`; `CrewSelector.tsx` `133` `Full name`/`140` `Fisher number (optional)`
- Auth/profile hooks: `useAuth.ts` `63/89`; `useProfile.ts` `70` `'Permission Denied'…`, `79` `'Location Error'…` (rest use `t()`)
- **Third language picker found:** `LanguagePickerScreen.tsx:44/51` hardcodes `English`/`Français` — **correct endonyms** (same convention as free Settings; no fix, noted for the §3 inconsistency).

### (C) DEV / ADMIN-ONLY — LIST, NO ACTION (known-hardcoded, parked)
- `DfoTestHarnessScreen.tsx`: `232` `DFO XML Test Harness`, `249` `Validate ELOG Key (UAT)`, `258/281` `Fire` (+ harness body strings)
- `InspectionModeScreen.tsx` (DFO-officer read-only view): `120` `INSPECTION MODE`, `121` `DFO Officer View — Read Only`, `131` `SCAN TO VERIFY`, `151` `VESSEL & LICENCE`, `154/160/166/172` `Operator`/`FIN`/`Vessel (VRN)`/`Active Trip`, `198` `No completed logs on this device`, `210` `Exit Inspection Mode`, plus exit Alert `103–108`
- `DfoSetupScreen.tsx:78` `'Dev Error'`, `:162` `DEV` pill · `DfoLogsListScreen.tsx:576` `XML Test Harness` entry button · `Garminmapbox.tsx:365` `TEST GARMIN`
- `DfoDemoScreen.tsx:33` `Back` (demo) · `LobsterLogProposalForm.tsx` (internal proposal/marketing form — hardcoded, e.g. `914` placeholder) — not a shipped end-user surface

---

## PROPOSED PHASE 2 FIX LIST

### (A) DFO-side FR fixes recommended NOW
1. **Retire the 6 Form 222 trio `_todo` stubs** (dfo.json 325–330) with best-effort FR, each tagged `PROOFREADER REVIEW`. Proposed drafts:
   - `confidenceLabel` → `CONFIANCE D'IDENTIFICATION` · `confidencePlaceholder` → `Sélectionner la confiance…`
   - `specimenCondLabel` → `ÉTAT DU SPÉCIMEN` · `specimenCondPlaceholder` → `Sélectionner l'état…`
   - `lengthCatLabel` → `LONGUEUR DU CORPS` · `lengthCatPlaceholder` → `Sélectionner la longueur…`
2. **`nav.dfoElog`** (common.json:15): `ELOG MPO _todo` → `ELOG MPO` (drop the tag; value already MPO).
3. **DFO→MPO flips (per-string, YOUR call §4)** — 6 candidates at dfo.json 11/12/17/25/28/198. New/edited FR uses "MPO" per session rule. **Do NOT touch `profile.finError`'s "DFOCC".** Awaiting your per-string yes/no.
4. Missing keys: none to add.

### (B) Free/Pro-side — RECOMMENDATIONS ONLY (approve individually)
1. **6 English `_todo` stubs that hit live users** (common.json): `account.reauthTitle/Prompt/Confirm/Failed` (268–271) + `backup.restoredNotice`/`wipeFailedRetry` (264–265). Already tracked in the CLAUDE.md FR proofreader pile (S84–86). Recommend clearing them with real FR now — they render raw English to live users. Your call whether to fold into this sweep or leave for the proofreader pass.
2. **Captain Profile language buttons** (`CaptainProfileScreen.tsx:341,350`): align to endonyms like free Settings (so FR mode shows "English"/"Français", not "Anglais"). String or small code change — your call. (This is a shared-component/code touch, so out of the strings-only Phase 2 unless you approve it specifically.)
3. Borderline identical values (§1c): `Lat`/`Lng`, `{{lbs}} lbs`, `AIR` (Weather = DO NOT TOUCH). Cosmetic.
4. **Whole free/Pro side is largely un-internationalized (§2-B).** Biggest cluster: the free **Daily Log + Settings** in `App.tsx` (~20 hardcoded strings) — a francophone switching to FR still sees the main screen in English. Also PaywallModal, TutorialModal, LoginScreen, FishingMap, Port/CrewSelector, ProDashboard, auth/profile hooks. This is a large, separate i18n project — recommend scoping on its own, NOT folding into the DFO FR sweep. Weather screen strings untouched.

### (C) Dev/admin-only — LIST, NO ACTION
Confirmed hardcoded and parked (see §2-C): `DfoTestHarnessScreen`, `InspectionModeScreen` (DFO-officer view), the `DEV`/`Dev Error`/`XML Test Harness`/`TEST GARMIN` dev entry points, `DfoDemoScreen`, and the internal `LobsterLogProposalForm`. No action.
