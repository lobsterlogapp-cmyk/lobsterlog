# GATE S104 — L5: DfoSetupScreen region labels FR + L5-adjacent JBE strings

Display-only. Stored values byte-identical (region selection = `subformId`, untouched).
Tree opened clean at `ee6b282` (4 ruled-untracked PDFs in `assets/docs/` ignored).

Hard rules in force: NO-GIT (commands written here, Jonny runs), NO-DFO-POST, PRINT-BEFORE-EDIT,
DON'T-INVENT-ON-COMPLIANCE (every FR term must cite an MPO answer key). Diagnostic scaffolding
fully reverted before any commit; `git diff src/utils/` expected 0 lines.

---

## PHASE 0 — GLOSSARY-FIRST RECON (read-only; complete, awaiting Gate-0 OK)

### 0.1 Region labels — location, source, storage

`DfoSetupScreen.tsx:30–35` — hardcoded EN `REGIONS` array:

```
const REGIONS = [
  { label: 'Maritimes', subformId: 90 },
  { label: 'Gulf',      subformId: 89 },
  { label: 'Quebec',    subformId: 88 },
  { label: 'Nfld & Lab', subformId: 91 },
] as const;
```

- Rendered at `DfoSetupScreen.tsx:164` as `{r.label}` (plain hardcoded string, NOT i18n).
- **STORED value = `subformId`** (90/89/88/91) via `setSelectedSubformId(r.subformId)` →
  `saveCaptainProfile({ subformId: selectedSubformId, regId, ... })` (:74, :110). The label is
  never stored; only `subformId` (and derived `regId`) persist. **INVARIANT holds trivially** —
  translating the display label cannot move `subformId`. `regId` is derived from
  `DFO_SUBFORM_REGISTRY[subformId].regId`, also label-independent.

### 0.2 JBE-terminology strings — rendered vs orphaned, which screen

| # | String (key) | File:line | Current EN | Current FR | Rendered? |
|---|---|---|---|---|---|
| J1 | `setup.headerTitle` | en/dfo.json:16 · fr/dfo.json:17 | `Set Up Your DFO ELOG` | `Configure ton journal électronique MPO` | **YES** — DfoSetupScreen.tsx:136 (screen title) |
| J2 | `setup.activateButton` | en/dfo.json:27 · fr/dfo.json:28 | `Activate DFO ELOG` | `Activer le journal MPO` | **YES** — DfoSetupScreen.tsx:225 |
| J3 | `setup.priceLabel` | en/dfo.json:24 · fr/dfo.json:25 | `DFO ELOG SEASON PASS` | `LAISSEZ-PASSER DE SAISON JOURNAL MPO` | **YES** — DfoSetupScreen.tsx:209 |
| J4 | `setup.title` | en/dfo.json:10 · fr/dfo.json:11 | `DFO Setup` | `Configuration MPO` | **NO — ORPHANED** (no render site; grep-confirmed) |
| J5 | `common.elogKey` | en/common.json:96 · fr/common.json:97 | `ELOG Key` | `Clé ELOG` | rendered — but on **CaptainProfileScreen** (not DfoSetup); this key label surface |
| J6 | `common.elogKeyLabel` | en/common.json:97 · fr/common.json:98 | `ELOG KEY` | `CLÉ ELOG` | **YES but on CaptainProfileScreen.tsx:276** (DFO Submission Settings card), NOT DfoSetupScreen |

**⚠ FLAG A — the literal « Configuration MPO » is the ORPHANED `setup.title`, not what renders.**
The visible screen title is `setup.headerTitle` = « Configure ton journal électronique MPO ».
The S102 D4 alignment table (docs/GATE_S102_DOCS.md §2.4, line 85) mapped the §17 doc's
« Configuration du JBE du MPO » against `setup.title` — i.e. against the orphaned key, not the
rendered `headerTitle`. To make the **F07 FR screenshot** match its §22 caption
(« Configuration du JBE du MPO »), the **rendered** `headerTitle` is what must change.

**⚠ FLAG B — « Clé ELOG » lives on CaptainProfileScreen, a DIFFERENT screen from DfoSetupScreen.**
DfoSetupScreen has no ELOG-key field (it has Licence Number + FIN). The elogKey label
(`common.elogKeyLabel`, CaptainProfileScreen.tsx:276) is L5-adjacent per ruling (b), but is NOT
on the F06/F07 capture surface. Included in the plan below, flagged for your explicit
include/defer at Gate 0.

### 0.3 Purchase-alert strings on DfoSetupScreen (siblings inventory)

All hardcoded **English**, un-i18n'd `Alert.alert(...)`:

- `:47` `'Missing'` / `'Please enter your Licence Number.'`
- `:51` `'Missing'` / `'Please enter your FIN (Fisher ID Number).'`
- `:67` `'Unavailable'` / `'The DFO ELOG purchase is not available right now. Please try again later.'`
- `:87` `'Purchase Error'` / `e.message ?? 'Something went wrong. Please try again.'`
- `:96` `'Missing'` / `'Please enter your FIN (Fisher ID Number).'`
- `:122` `'Not Found'` / `'No previous DFO ELOG purchase was found for this account.'`
- `:125` `'Error'` / `e.message ?? 'Could not restore purchases.'`

**RULED PARKED (S97):** DfoSetupScreen purchase/restore alerts belong to the Aug/Sept paywall
i18n work. They are English (no FR to correct), never on-screen during the F07 capture (they only
fire on a validation miss / store error), and i18n-wiring them is a separate task.
**Proposed action: LEAVE. Out of scope for S104.**

---

## 0.4 ANSWER KEY TABLE  (string | current FR | proposed FR | source)

### Region labels (L5) — EN unchanged, FR from MPO reftable

Subform→region confirmed two ways: `DFO_SUBFORM_REGISTRY` `regId` == `MV_DFO_REGION` `CODE_ID`.

| subformId | regId / CODE_ID | Current EN pill (KEEP) | Proposed FR | Source |
|---|---|---|---|---|
| 90 | 1004 | `Maritimes` | **Maritimes** | `MV_DFO_REGION_rel3.csv` DESC_FRE (1004); §17 §2.4 L100 |
| 89 | 1014 | `Gulf` | **Golfe** | `MV_DFO_REGION_rel3.csv` DESC_FRE (1014); §17 §2.4 L100 |
| 88 | 1006 | `Quebec` | **Québec** | `MV_DFO_REGION_rel3.csv` DESC_FRE (1006); §17 §2.4 L100 |
| 91 | 1002 | `Nfld & Lab` | **Terre-Neuve-et-Labrador** | `MV_DFO_REGION_rel3.csv` DESC_FRE (1002); §17 §2.4 L100 |

Two concordant MPO sources: the reftable `~/Desktop/DFO/ELOG_reftables/MV_DFO_REGION_rel3.csv`
(DESC_FRE column) AND the §17 provider's-instructions FR §2.4 line 100–101 (as transcribed in
docs/GATE_S102_DOCS.md:88): « Québec (QC), Golfe (GLF), Maritimes (MAR) ou
Terre-Neuve-et-Labrador (NL) ». HIGH confidence — no invention.

- EN stays verbatim (Gate-2 stop (c): EN mode unchanged). `Nfld & Lab` kept as the pill EN.
- LAYOUT NOTE: « Terre-Neuve-et-Labrador » is long; the pill row is `flexWrap` so it wraps to a
  new line rather than clipping — verify at Gate-2 walk, not a blocker.

### JBE-terminology strings

| # | Key | Current FR | Proposed FR | Source / confidence |
|---|---|---|---|---|
| J2 | `setup.activateButton` | `Activer le journal MPO` | **`Activer le JBE du MPO`** | §17 §2.4 L98 verbatim (GATE_S102_DOCS.md:85). **EXACT answer-key match — HIGH** |
| J5 | `common.elogKey` | `Clé ELOG` | **`Clé JBE`** | §17 §2.4 L104 « Saisis ta clé JBE » (GATE_S102_DOCS.md:86); S102_EDIT_REPORT.md:34 « clé JBE » retained. HIGH |
| J6 | `common.elogKeyLabel` | `CLÉ ELOG` | **`CLÉ JBE`** | same as J5, uppercased per app ALL-CAPS label convention. HIGH |
| J1 | `setup.headerTitle` | `Configure ton journal électronique MPO` | **`Configure ton JBE du MPO`** (term swap; keeps app imperative voice) | Term JBE = journal de bord électronique (S100 L118, "all FR docs"); doc noun form « Configuration du JBE du MPO » §17 §2.4 L97. **MED — phrasing choice, see FLAG C** |
| J3 | `setup.priceLabel` | `LAISSEZ-PASSER DE SAISON JOURNAL MPO` | **`LAISSEZ-PASSER DE SAISON JBE DU MPO`** (term swap; keeps app wording) | Doc form « laissez-passer saisonnier JBE du MPO » §17 §2.4 L107 (GATE_S102_DOCS.md:87). **MED — see FLAG C** |
| J4 | `setup.title` (orphaned) | `Configuration MPO` | **`Configuration du JBE du MPO`** (optional hygiene) | §17 §2.4 L97 verbatim. Not rendered — cosmetic consistency only |

**⚠ FLAG C — J1 & J3 involve app phrasing, not just the answer-keyed term.** The MPO answer key
fixes the TERM (« JBE » / « JBE du MPO »); it does not dictate the app's surrounding voice
(imperative « Configure ton… », « LAISSEZ-PASSER DE SAISON… »). Proposed edits swap **only the
term** inside the existing app string:
- J1: `journal électronique MPO` → `JBE du MPO`
- J3: `JOURNAL MPO` → `JBE DU MPO`
The doc's own noun forms (« Configuration du JBE du MPO », « laissez-passer saisonnier JBE du
MPO ») differ in voice/wording from the app strings. **I did not pick between "swap term only"
vs "adopt doc phrasing verbatim" — your call at Gate 0.** EN unchanged throughout (EN keeps
"ELOG" per S100 T2 scope; GATE_S102_DOCS.md:90 confirms no EN §2.4 mismatch).

### 0.5 PROOFREADER-FLAGGED (no answer key → leave as-is)

- None of the S104 strings lack an answer key: regions = reftable + §17; J1–J6 = §17 §2.4.
- Purchase alerts (0.3) — English, parked, not a FR proofreading item.
- Post-edit, the new FR region + JBE strings still ride the standing FR proofreader pile as a
  courtesy francophone read (not blocking), consistent with S101a/b handling.

---

## 0.6 EDIT PLAN (for Gate-0 approval — NO edits made yet)

**Files:** `src/screens/DfoSetupScreen.tsx`, `src/i18n/locales/en/dfo.json`,
`src/i18n/locales/fr/dfo.json`, and (pending FLAG-B ruling) `src/i18n/locales/en/common.json` +
`src/i18n/locales/fr/common.json`. **Zero `src/utils/` changes** (git diff src/utils/ = 0).

1. **Region labels (display-only i18n, S98 defaultValue pattern):**
   - Add a `labelKey` to each `REGIONS` entry and render
     `t(r.labelKey, { defaultValue: r.label })` at :164 (keeps EN pill as the fallback).
   - New keys in `setup` (BOTH en/dfo.json + fr/dfo.json, key-set symmetric):
     `regionMaritimes`, `regionGulf`, `regionQuebec`, `regionNL`.
     - EN values = current pill EN (`Maritimes` / `Gulf` / `Quebec` / `Nfld & Lab`).
     - FR values = `Maritimes` / `Golfe` / `Québec` / `Terre-Neuve-et-Labrador`.
   - `subformId` / stored region value UNTOUCHED. `DFO_SUBFORM_REGISTRY` UNTOUCHED.

2. **JBE strings (value-only edits, no key add/rename):**
   - J2 `setup.activateButton` FR → `Activer le JBE du MPO`.
   - J1 `setup.headerTitle` FR → `Configure ton JBE du MPO`  *(pending FLAG-C ruling)*.
   - J3 `setup.priceLabel` FR → `LAISSEZ-PASSER DE SAISON JBE DU MPO`  *(pending FLAG-C ruling)*.
   - J4 `setup.title` FR → `Configuration du JBE du MPO`  *(optional; orphaned)*.
   - J5/J6 `common.elogKey`/`elogKeyLabel` FR → `Clé JBE` / `CLÉ JBE`  *(pending FLAG-B ruling —
     CaptainProfileScreen, not DfoSetup)*.
   - All EN values unchanged.

3. **Key-set symmetry impact:** setup namespace today 22/22 (en/fr symmetric). Adding 4 region
   keys → 26/26. common.json elogKey/elogKeyLabel already symmetric (value-only edits).

4. **Gates (Phase 1):** tsc 33 baseline / 0 new; jest 19 suites / 68 tests; git diff src/utils/
   = 0; babel.config.js clean; zero probe strings; locale key-sets symmetric.

---

## GATE 0 — SUMMARY (WAITING FOR YOUR OK)

- Regions: HIGH-confidence, two concordant MPO sources. Ready.
- J2 activateButton: EXACT §17 answer-key match. Ready.
- J5/J6 elogKey: answer-keyed (« clé JBE ») — **but on CaptainProfileScreen** → FLAG B, decide include/defer.
- J1 headerTitle / J3 priceLabel: term is answer-keyed; phrasing is a choice → FLAG C, decide "swap term only" vs "doc phrasing verbatim".
- J4 setup.title: orphaned; optional hygiene edit.
- Purchase alerts: parked (S97), propose LEAVE.

Decisions needed before Phase 1:
- (B) Include J5/J6 elogKey (CaptainProfile) this session, or defer?
- (C) J1/J3 — swap-term-only (proposed) or adopt doc phrasing verbatim?
- (D) J4 orphaned setup.title — update for hygiene or leave?

### GATE 0 — APPROVED, rulings July 18 2026

- **FLAG A:** `setup.headerTitle` changes (capture-critical); ALSO fix orphaned `setup.title`
  as hygiene. → J1 + J4 both in.
- **FLAG B:** include J5/J6 (`common.elogKey`/`elogKeyLabel`) this session. Phase-2 walk gains a
  **CaptainProfileScreen stop** (FR « Clé JBE » renders, EN unchanged). Key-set symmetry check
  **extended to common.json**.
- **FLAG C:** **swap term only**, app voice retained (J1 `Configure ton JBE du MPO`,
  J3 `LAISSEZ-PASSER DE SAISON JBE DU MPO`).
- **Purchase alerts:** LEAVE — parked to Aug/Sept paywall work.

FINAL EDIT SET (7 items): regions ×4 keys (en+fr dfo) · J1 · J2 · J3 · J4 · J5 · J6 (FR only;
all EN unchanged). Files: DfoSetupScreen.tsx, en/fr dfo.json, en/fr common.json.

---

## PHASE 1 — EDITS APPLIED + GATES

**Edits (all display-only; EN values byte-unchanged):**
- `DfoSetupScreen.tsx:30–37` — REGIONS entries gained `labelKey`; render site `:166` now
  `t(r.labelKey, { defaultValue: r.label })`.
- `en/dfo.json` setup — +4 region keys (`Maritimes`/`Gulf`/`Quebec`/`Nfld & Lab`).
- `fr/dfo.json` setup — +4 region keys (`Maritimes`/`Golfe`/`Québec`/`Terre-Neuve-et-Labrador`);
  J1 headerTitle → `Configure ton JBE du MPO`; J2 activateButton → `Activer le JBE du MPO`;
  J3 priceLabel → `LAISSEZ-PASSER DE SAISON JBE DU MPO`; J4 title → `Configuration du JBE du MPO`.
- `fr/common.json` profile — J5 `elogKey` → `Clé JBE`; J6 `elogKeyLabel` → `CLÉ JBE`.
- `en/common.json` — UNCHANGED (EN keeps "ELOG").

**Gates:**
| Gate | Result |
|---|---|
| tsc | **33 / 0-new** (baseline; none in touched files) |
| jest | **19 suites / 68 tests** pass |
| git diff `src/utils/` | **0 lines** |
| babel.config.js | **clean (0-line diff)** |
| probe strings | **none** |
| locale key-set symmetry | `dfo.setup` **26/26** symmetric; `common` full-key diff = only the
  deliberate top-level `_todo` sentinel (pre-existing; value-only edits didn't touch key sets) |

GATE 1 — PASS. Awaiting OK before Phase 2 walk.

---

## PHASE 2 — WALK (in progress)

**Env:** iPhone 17 Pro (iOS 26.2) booted, app installed + running (current bundle live — logs
surface already renders S101a « Journaux JBE MPO »), Metro on 8081. **No idb / no simctl-ui tap
driver on this machine** → Jonny drives taps; Claude captures screenshots (`simctl io screenshot`)
+ reads AsyncStorage. Screens are JS-layer edits → Metro fast-refresh, no rebuild.

**Stop (d) baseline — stored `subformId` (S101b storage-read method):**
`…/RCTAsyncLocalStorage_V1/manifest.json`, two uid-namespaced captain_profile stores:
- `@lobsterlog:captain_profile::FwXYZ…Wx1` → `subformId 88`, `regId 1006`, `dfoActivated true`
- `@lobsterlog:captain_profile::G6lx…vZM2` → `subformId 90`, `regId 1004`, `dfoActivated true`

Region-pill selection sets React state only (`setSelectedSubformId`); persistence happens on
Activate/Restore (`saveCaptainProfile`). **Walk selects pills but does NOT press Activate** —
stored `subformId` must remain 88/90 byte-identical after.

### Stop results

- **(a) FR regions — PASS.** DfoSetupScreen FR, admin `Lots-0-Lobster`. All four pills render the
  approved FR: **Maritimes · Golfe · Québec · Terre-Neuve-et-Labrador**. « Terre-Neuve-et-Labrador »
  wraps to its own row (flexWrap) and fits — no clip. (2 screenshots on file, 6:24.)
- **(b) FR JBE strings — PASS.** Header **« Configure ton JBE du MPO »** (J1) · price label
  **« LAISSEZ-PASSER DE SAISON JBE DU MPO »** (J3) · activate button **« Activer le JBE du MPO »**
  (J2). Info text NEB-correct; « Déjà activé? Restaurer l'achat » unchanged. All three match the
  Phase-1 FR edits.
- **(c) EN mode — PASS (all unchanged).** DfoSetupScreen EN. Regions **Maritimes · Gulf · Quebec ·
  Nfld & Lab** (defaultValue fallback = original pills). Header **« Set Up Your DFO ELOG »**, price
  **« DFO ELOG SEASON PASS »**, button **« Activate DFO ELOG »**, « Already activated? Restore
  Purchase ». EN keeps "ELOG" throughout — zero EN drift. (2 screenshots on file, 6:27.)
- **(d) Stored-value byte-check — PASS.** After selecting region pills (no Activate), storage
  re-read identical to baseline: `::FwXYZ…` subformId **88** / regId 1006 · `::G6lx…` subformId
  **90** / regId 1004 · both dfoActivated true. Display-only selection did not mutate the stored
  value — INVARIANT confirmed empirically.
- **CaptainProfile stop (FLAG B) — PASS.** DFO Submission Settings / « Paramètres de soumission
  MPO » card, elogKey label (`profile.elogKeyLabel`, CaptainProfileScreen.tsx:276): EN
  **« ELOG KEY »** unchanged (J6 EN kept); FR **« CLÉ JBE »** (J6 edit, was « CLÉ ELOG »). Accent
  correct on-screen. (2 screenshots on file, 6:29.)
- **(e) Routing — PASS.** Backed out of profile + closed setup → landed clean on the DFO logs list
  (FR « Journaux JBE MPO » / « Remplir un nouveau journal JBE »), drafts + sent register intact, no
  glitch. (1 screenshot on file, 6:37.)

### GATE 2 — PASS (all 7 stops)

FR regions ✓ · FR JBE (header/price/activate) ✓ · EN unchanged ✓ · stored subformId 88/90
byte-identical ✓ · CaptainProfile « CLÉ JBE » FR / « ELOG KEY » EN ✓ · routing ✓. Display-only,
invariant held, no EN drift.

---

## CLOSEOUT — commit block (NO-GIT: Jonny runs; staged by exact path, never `-A`)

Working tree at closeout — modified: `CLAUDE.md`, `src/i18n/locales/en/dfo.json`,
`src/i18n/locales/fr/common.json`, `src/i18n/locales/fr/dfo.json`,
`src/screens/DfoSetupScreen.tsx`; untracked: `docs/GATE_S104_L5_REGIONS.md`.
(`src/i18n/locales/en/common.json` deliberately NOT touched — EN keeps "ELOG". The 4
`assets/docs/*.pdf` remain ruled-untracked; leave them.)

**C1 — code + locale (DfoSetupScreen + the 3 edited locale files):**

```
git add src/screens/DfoSetupScreen.tsx src/i18n/locales/en/dfo.json src/i18n/locales/fr/dfo.json src/i18n/locales/fr/common.json
git commit -m "S104: DfoSetupScreen region labels FR + L5-adjacent JBE strings (display-only)"
```

**C2 — gate doc + CLAUDE.md closeout:**

```
git add docs/GATE_S104_L5_REGIONS.md CLAUDE.md
git commit -m "S104: L5 region/JBE gate doc + CLAUDE.md closeout"
```

Bare one-line subjects, no body, no trailer (LobsterLog commit style). Push at your discretion.

### Fold-in (July 18) — lowercase `elogKey` render + accent verify

- **Render site of lowercase `common.profile.elogKey`:** NONE — grep-confirmed orphaned. Only
  `elogKeyLabel` renders (CaptainProfileScreen.tsx:276). `elogKey` (and `elogKeyPlaceholder`) have
  no `t()` call site.
- **Accent check:** the value is already « Clé JBE » / « CLÉ JBE » with correct accents
  (byte-verified: `elogKey` = `Cl\xc3\xa9 JBE` → é U+00E9; `elogKeyLabel` = `CL\xc3\x89 JBE`
  → É U+00C9). Repo-wide grep for bare `Cle JBE`/`CLE JBE`/`Cle ELOG` = **NONE in src/**. The
  Phase-1 edit inherited the accent from the original « Clé ELOG », so no separate fix was needed.
- **Gate re-check (no file changed):** `common` full key-set diff = only the deliberate `_todo`
  sentinel; both `profile.elogKey`/`elogKeyLabel` present in en+fr. tsc 33/0-new + jest 19/68
  carry over from GATE 1 (no code touched). `en/common.json` correctly absent from the diff.
