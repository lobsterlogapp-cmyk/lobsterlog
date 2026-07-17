# GATE — Session 101b: dropdown code fixes (E1–E8) + F-item scope

Date: 2026-07-15. Source lists: `docs/GATE_S100_FR_CROSSCHECK.md` §3.3/§4 (E1–E8) +
`docs/GATE_S101A_FR_STRINGS.md` closeout part 2 (F1–F4).
INVARIANT (every edit): stored values byte-identical; generators/emit path ZERO-TOUCH;
locale-aware DISPLAY only; descEn as defaultValue fallback (S98 chip-split pattern).
NO state-changing git (commands written here, Jonny runs); NO DFO POST.

---

## PHASE 0 — RECON (read-only; report only, nothing edited)

### 0.1 ⚠ E1 EMIT-DEPENDENCY PROOF — the "display only" premise is FALSE (STOP condition met)

The five `descEn` lists at `dfoForm222Generator.ts:18–44` (MARINE_MAMMAL_SPECIES /
INTERACTION_TYPES / CONFIDENCE_LEVELS / SPECIMEN_CONDITIONS / LENGTH_CATEGORIES) do
**NOT** feed display only. Full consumer trace (grep across src, two files total):

- **STORED VALUES ARE THE EN LABELS.** `Form222Entry` persists the human-readable label
  strings themselves: `speciesLabel` / `interactionTypeLabel` / `confidenceLabel` /
  `specimenCondLabel` / `lengthCatLabel` (dfoForm222Generator.ts:62–77). These go into
  AsyncStorage via `saveForm222Entry` — the stored bytes ARE descEn strings.
- **THE EMIT PATH RESOLVES codeIds FROM THOSE LABELS.** `generateForm222Xml`:
  - :174 `MARINE_MAMMAL_SPECIES.find(s => s.label === entry.speciesLabel)` → NOAA_SPECIE_COD
  - :177 `CONFIDENCE_LEVELS.find(c => c.label === entry.confidenceLabel)` → ID_CNFDNCE_ID
  - :178 `SPECIMEN_CONDITIONS.find(c => c.label === entry.specimenCondLabel)` → SPCMN_COND_ID
  - :179 `LENGTH_CATEGORIES.find(c => c.label === entry.lengthCatLabel)` → BDY_LEN_ID
  - :199 `INTERACTION_TYPES.find(t => t.label === entry.interactionTypeLabel)` → INCDNT_TYP_ID
- **Form222Screen.tsx** displays AND stores those same labels (renderDropdown at :378 is
  string-in/string-out: `options: string[]`, `onSelect(opt)` writes the displayed string
  straight into form state; the five pickers at :619–682 pass the `*_LABELS` arrays).

**Consequence:** the naive fix implied by S100 E1 ("repoint the label lists to descFr in
FR") would (a) change stored bytes (FR labels persisted) and (b) BREAK the emit — the
label→codeId `.find()` would miss, `tag()` would omit NOAA_SPECIE_COD (a mandatory
element on the Y path) and the optional trio, silently producing schema-invalid /
data-dropping XML. The "Generator" filename red-flag was warranted.

**Invariant-preserving E1 design (proposed, awaiting confirm):** all changes in
`Form222Screen.tsx` ONLY; `dfoForm222Generator.ts` untouched.
- `renderDropdown` learns a display resolver: options stay the descEn label strings
  (stored value unchanged, `onSelect` still writes the EN label), but each row and the
  selected-value text render through a locale-aware `displayLabel(enLabel)` — FR looks up
  the paired reftable row's `descFr` (keyed off the descEn label via the existing
  `{label, codeId}` lists joined back to the MV_* modules), falling back to the EN label
  when no FR match (S98 defaultValue pattern).
- All 7 needed reftable modules carry `descFr` on every row (verified: mvNoaaMmSpecies 47,
  mvIncidentType 8, mvConfidenceLevel 5, mvMmSpecimensCondition 6, mvMmLengthCategory 10;
  plus mvSarList 17 / mvSpecimensCondition 5 / mvBaitCondition 4 for E2–E4).
- Stored Form222Entry bytes: byte-identical. Emit: zero-touch. Old saved entries: load and
  display FR correctly (lookup is by their stored EN label).

### 0.2 F4/E5 VERIFY-FIRST — S100's E5 finding is WRONG; E5 DROPPED from the fix list

`FullDfoForm.tsx:103` is the **construction** of `BYCATCH_USAGE_OPTIONS`
(`label: u.descEn` — built but never displayed; the file's own comment at :97–98 says
"Labels render via i18n usageOption_<codeId>; descEn here is the fallback"). Every
display site is already locale-aware:
- picker rows :2059–2066 → `t('form234.usageOption_${opt.value}')`
- saved-entry rows :1734 → `t('form234.usageOption_${entry.usage}')`
- `usageOption_*` keys exist in BOTH locales (5 each, en+fr dfo.json); stored value =
  codeId string (`sheetUsage` / `entry.usage`). No `.label` display consumer exists.

This matches the S101a device observation (FR options render French). The S100 E5 row
("bycatch usage picker … `u.descEn` … EN") described the dead constructed label, not the
render path. **E5 requires no fix.**

**Drafted corrective note for GATE_S100 (to APPEND in Phase 1, dated — never a rewrite):**
> S101b CORRECTION (2026-07-15): §3.3 row E5 is retracted. FullDfoForm.tsx:103 is the
> BYCATCH_USAGE_OPTIONS construction (`label: u.descEn`), but no display site renders that
> label — the picker and entry rows render `t('form234.usageOption_<codeId>')`
> (locale-aware, keys present in en+fr since the S51/S79 usage work) and store the codeId.
> The FR device walk (S101a F4) shows French options, confirming. E5 dropped from the
> S101b fix list; no code change needed or made for E5.

### 0.3 F1 — XML Test Harness render gate

`DfoLogsListScreen.tsx:570`: `{__DEV__ && (…)}` — **`__DEV__` alone, no role condition.**
S99-record tension explained as predicted: `__DEV__` is compile-time-stripped from
release builds (the S99 "retained __DEV__-only" decision was sound for release), but the
S101a walk ran a dev client, where `__DEV__` is true for ANY account — so the role-'dfo'
tester saw it. Report only; no S99 edit.

**Candidate gate change (awaiting confirm):** `{__DEV__ && isAdmin && (…)}`.
`DfoLogsListScreenProps` has no role prop today; App.tsx already computes an `isAdmin`
memo (App.tsx:228). Fix = 3 small edits, 2 files: add `isAdmin?: boolean` to the props
interface, pass `isAdmin={isAdmin}` at the App.tsx call site (:646), change the :570 gate.
Display/dev-chrome only; no storage or emit surface.

### 0.4 F2 — ZPH "Area 38b" source

- Source: `dfoConstants.ts:63` — `DFO_FMA_LIST` hardcoded `{ codeId: 28599, label: 'Area
  38b' }`. The label is **display-only**: the form stores `fmaId` = codeId (28599);
  render sites resolve label at display time (FullDfoForm :1383 selected value, :1389–1405
  option rows). Generator emits `FMA_ID` from the codeId. Display-only fix is clean.
- MPO FR form EXISTS: `~/Desktop/DFO/ELOG_reftables/MV_FMA_rel30.csv` row
  `28599,"38b","Zone 38b","38b","Area 38b"` → FR = **« Zone 38b »**.
- Noticed while there (flag, larger scope): the other rows' "LFA n" labels are also EN
  abbreviations; MV_FMA DESC_FRE is "Homard - Zone de pêche n" (app short form would be
  "ZPH n", consistent with the S100-passed `fishingAreaLabel` "ZONE DE PÊCHE (ZPH)").
  Minimal F2 = 38b-only locale display ("Area 38b" → "Zone 38b" in FR); the LFA→ZPH
  sweep is a separate decision. **Sized SMALL (fold candidate) for the 38b-only form.**

### 0.5 F3 — Confirm Trip Start date formatter

`TripStartConfirmScreen.tsx:44`: `d.toLocaleString('en-CA', { dateStyle: 'long',
timeStyle: 'short' })` — hardcoded locale. Fix = the established S93/S98 ternary
(`i18n.language.startsWith('fr') ? 'fr-CA' : 'en-CA'`) + destructure `i18n` from the
existing `useTranslation('dfo')` at :24. **One-liner (plus destructure) → FOLD into
Round B.** Display-only; the stored `tripStartTime` ISO string (:27) is untouched.

### 0.6 E6/E7 — the S100 "no MV rows for 39684–86" premise is WRONG (authority upgrade)

MV rows DO exist in the Desktop reftables (not ingested into the repo — repo grep for
39682–39686 across `src/data/reftables/` = zero, which is what S100 evidently checked):
- `MV_GEAR_SUBTYPE_rel7.csv` (+ twin `MV_TRAP_SUBTYPE_rel7.csv`): 39684 « Casiers en
  bois » / 39685 « Casiers en treillis métallique » / 39686 « Casiers en treillis
  métallique et en bois » — DESC_FRE identical to the FS234 Rule-611 block, so the
  planned FR strings are unchanged; their authority is now reftable-grade, not
  fact-sheet-only.
- `MV_TRAP_SIZE_rel2.csv`: 39682 Standard / 39683 **Grand** (confirms E7).

Both pickers confirmed display-only surfaces: `trapSize` / `gearSubtypeId` state store
codeId STRINGS in the `data` map (FullDfoForm :1153–54); render resolves the list label
(:1587 etc.). **Recommended fix stays the i18n-key route** (e.g.
`trapSizeOption_39682/39683`, `gearSubtypeOption_39684/85/86`, mirroring `usageOption_*`;
FR values copied from MV DESC_FRE) — ingesting a 3-row reftable + codegen churn for a
display string is heavier for no gain. Decision noted for the gate.

### 0.7 E8 — port selector: display-only confirmed

`DfoPortSelector.tsx`: `select()` at :60 stores `{ name: p.nameEn, codeId }` —
**unchanged by the fix**. Two display sites go locale-aware:
- result rows :107 `p.nameEn` → FR `p.nameFr` (fallback nameEn);
- trigger text :74–76 renders the stored `value` (nameEn) — FR display resolves
  `codeId → MV_PORT nameFr` (memoized lookup), falling back to `value` when codeId is
  null/unmatched. Search at :56 already matches nameEn AND nameFr (no change).
`mvPort.ts` nameFr is populated on all 3,970 rows (zero empties; many identical to EN —
fine). Stored log bytes (`departurePort*`/`portLanded*` name + codeId) untouched.

### 0.8 E2/E3/E4 — verified as S100 described; display-only fixes are clean

- **E2** SAR species: FullDfoForm :1018–1022 — coded rows store `String(codeId)`,
  display `o.descEn`. Fix = locale-aware label in the normalize map (descFr fallback
  descEn). MM species stay plain strings (untouched — see 0.9 flag).
- **E3** bait condition: :2020 selected + :2034 rows display `descEn`; stored
  `sheetCondition`/`entry.condition` = codeId number. Same fix shape.
- **E4** SAR condition: :1805 selected + :1818 rows display `descEn`; stored `sarCondId`
  = codeId string. Same fix shape.

### 0.9 Noticed, NOT acted on (flag-only)

- `FullDfoForm.tsx:94` `MARINE_MAMMAL_OPTIONS` — hardcoded EN string list for the 234
  Interactions MM species picker; stored value IS the EN string (plain-string branch of
  renderIncidentFields) and the 234 generator emits only MM_INTER_IND Y/N (no species
  element — S96 audit). FR users see EN species names here. NOT on the E-list (S100
  §3.3 covered the 222 pickers, not this one); a display-only fix would need the S98
  code↔label split since the stored value is the label. Queue candidate.
- `DfoPortSelector.tsx:40` default `placeholder = 'Select port…'` is EN, but both live
  call sites (FullDfoForm :1334/:1346) pass t() placeholders — dead default, cosmetic.
- E1's stored-EN-label architecture (0.1) also means the register/detail surfaces that
  echo entry fields keep showing EN labels for old entries in EN — unchanged behavior,
  just noting the FR display fix applies wherever the label is rendered via the new
  resolver, not to raw echoes elsewhere (none found in the 222 card surfaces — they
  render record metadata, not entry labels).

### 0.10 Phase-0 verdicts (for the gate)

| Item | Verdict | Size |
|---|---|---|
| E1 | REAL, but NOT display-only as premised — emit depends on stored EN labels; invariant-preserving design in 0.1 (Form222Screen-only, paired stored/display) | Round A, needs design confirm |
| E2 | REAL, clean display-only | Round A |
| E3 | REAL, clean display-only | Round A |
| E4 | REAL, clean display-only | Round A |
| E5 | **NOT REAL — dropped**; GATE_S100 corrective note drafted (0.2) | — |
| E6 | REAL; MV rows exist (premise correction, FR values identical) → i18n keys recommended | Round B |
| E7 | REAL; MV_TRAP_SIZE confirms « Grand » → i18n keys | Round B |
| E8 | REAL, display-only (rows + trigger resolver), stored name/codeId untouched | Round B |
| F1 | Gate is `__DEV__` alone; candidate `__DEV__ && isAdmin` (3 edits, 2 files) | On confirm |
| F2 | 'Area 38b' hardcoded in DFO_FMA_LIST; FR « Zone 38b » (MV_FMA); display-only | SMALL → fold Round B (38b-only) |
| F3 | Hardcoded 'en-CA' at TripStartConfirmScreen:44; ternary one-liner | SMALL → fold Round B |

**PHASE 0 GATE — awaiting Jonny's confirm on:** (1) the E1 paired stored/display design
(0.1); (2) E6/E7 i18n-key route vs reftable ingestion; (3) F1 `__DEV__ && isAdmin`; (4)
F2 scope: 38b-only now, LFA→ZPH sweep queued or dropped. Nothing edited; no git run.

---

## PHASE 1 — EDITS APPLIED (2026-07-16, per the Phase-0 rulings)

### Round A — reftable display wiring (E1–E4; E5 dropped per §0.2)

**E1 (`src/screens/Form222Screen.tsx` ONLY — `dfoForm222Generator.ts` untouched):**
- Imported the five MV_* tables; five module-level `Map<descEn, descFr>` maps (one per
  table — same descEn can recur across tables with different FR).
- `renderDropdown` gained an optional `frMap` param + a `show(v)` resolver:
  `(isFr && frMap?.get(v)) || v` applied to the selected text and every option row.
  `onSelect` UNCHANGED — the EN label is still what's written into form state, saved
  into `Form222Entry`, and resolved label→codeId at emit. Body converted expression→block
  arrow (added `return (…);`), no logic change.
- All five call sites pass their FR map (confidence/specimenCond/lengthCat fill the
  positional `isLast`/`required` defaults explicitly).
- `const isFr = i18n.language.startsWith('fr')` added beside the existing `t` destructure.

**E2/E3/E4 (`src/components/FullDfoForm.tsx` — display-only render sites):**
- New module-level helper `refDesc(row, isFr)` = `(isFr && descFr) || descEn` (S98
  fallback pattern); `const isFr` added beside the `t`/`tc` destructures.
- E2 SAR species: `renderIncidentFields` option type widened with `descFr?`; the coded-row
  normalize now builds `label: (isFr && o.descFr) || o.descEn` (MM plain-string branch
  byte-identical; stored value remains `String(codeId)`).
- E4 SAR condition (:~1810/1823): selected text + rows via `refDesc(…)`; stored
  `sarCondId` (codeId) untouched.
- E3 bait condition (:~2025/2040): selected text + rows via `refDesc(…)`; stored
  `sheetCondition`/`entry.condition` (codeId) untouched.

**GATE_S100 corrective note APPENDED** (dated 2026-07-16; E5 retraction + E6 "no MV row"
correction) — see the end of `docs/GATE_S100_FR_CROSSCHECK.md`.

### Round B — i18n-key items (E6/E7/E8) + F2/F3 folds

**E6/E7 (`FullDfoForm.tsx` + `en/dfo.json` + `fr/dfo.json`):** the trap-size and
gear-subtype pickers (selected text + rows) render
`t('form234.trapSizeOption_<codeId>' | 'form234.gearSubtypeOption_<codeId>',
{ defaultValue: list .label })`. 5 new key pairs, FR values = MV DESC_FRE (= FS234
Rule-611 block): 39682 Standard / 39683 « Grand » / 39684 « Casiers en bois » / 39685
« Casiers en treillis métallique » / 39686 « Casiers en treillis métallique et en bois ».
Stored codeId strings in the `data` map untouched; `DFO_TRAP_SIZE_LIST` /
`DFO_GEAR_SUBTYPE_LIST` in dfoConstants BYTE-UNTOUCHED (labels remain the defaultValue
fallback and the validator/generator inputs).

**F2 (`FullDfoForm.tsx` + both dfo.json):** FMA picker selected text + rows render
`t('form234.fmaOption_<codeId>', { defaultValue: label })`; ONE key pair added —
`fmaOption_28599` EN "Area 38b" / FR « Zone 38b » (MV_FMA_rel30 DESC_FRE). All other
FMAs fall through to their existing labels (38b-only per ruling). `DFO_FMA_LIST` untouched.

**E8 (`src/components/DfoPortSelector.tsx`):** module-level `FR_NAME_BY_ID`
(codeId→nameFr over MV_PORT); result rows render `rowName(p)` = `(isFr && nameFr) ||
nameEn`; the trigger renders `triggerName` — FR resolves the stored codeId→nameFr,
falling back to the stored `value` (nameEn). `select()`/`clear()` BYTE-UNTOUCHED (still
store nameEn + codeId); search already matched both names (no change).

**F3 (`src/screens/TripStartConfirmScreen.tsx`):** `formatTripStart` locale
`'en-CA'` → `i18n.language.startsWith('fr') ? 'fr-CA' : 'en-CA'` (S93/S98 pattern);
`i18n` added to the existing destructure. Stored `tripStartTime` ISO untouched.

### F1 — harness role gate (`src/screens/DfoLogsListScreen.tsx` + `App.tsx`)

`isAdmin?: boolean` (default false) added to `DfoLogsListScreenProps` + destructure;
the harness button gate `{__DEV__ && (` → `{__DEV__ && isAdmin && (`; App.tsx call site
passes the existing `isAdmin` memo (App.tsx:228). Release builds unchanged (`__DEV__`
still compile-time-strips); dev clients now hide the harness from non-admin roles
(the S101a role-'dfo' leak). S99 record NOT edited (its release-build reasoning holds).

### Noticed during Phase 1, NOT acted on (flag-only)

- `CaptainProfileScreen.tsx:214–241` — the profile LFA picker STORES the label string
  (`profile.fishingArea`) and derives `fmaId` by label match (`DFO_FMA_LIST.find(f =>
  f.label === option)`). A display-only FR fix there would need the S98 code↔label split
  (stored value IS the label). Out of F2's ruled scope; queue candidate.
- `DfoPortSelector` row province suffix still renders `descEn` (MV_PROVINCE carries
  descFr — e.g. « Nouvelle-Écosse »). Not on E8's letter; one-line follow-up if wanted.
- Bait entry rows show only `entry.type` (stored EN bait-type label) + lbs — the
  condition never renders in rows, so E3's surface is the sheet only. The bait TYPE
  label is another stored-EN-label surface (not on the E-list); queue candidate.

---

## PHASE 2 — GATES (all run 2026-07-16, BEFORE any commit block)

- tsc: **33 errors = baseline, 0 new** (zero in any touched file).
- jest: **19 suites / 68 tests, all green.**
- `git diff src/utils/ src/data/` = **EMPTY** — generators' emit logic, dfoConstants
  stored values, reftables all byte-untouched.
- Storage writes: FullDfoForm diff audited line-by-line — every hunk is a render-site
  or comment; no `buildLogData`/setter/save change. Form222Screen `onSelect` and
  DfoPortSelector `select()` unchanged (stored EN label / nameEn+codeId preserved).
- `git diff babel.config.js` = **EMPTY**. Zero probe strings in the diff.
- Locale files: valid JSON; key-set diff vs HEAD = exactly the 6 intended additions per
  file (symmetric EN/FR), ZERO removed, ZERO existing values changed; U+FFFD = 0, NFC ✓.
- Working tree touched files = exactly the 8 code/locale files above + the two gate docs.

### Commit-block note on rounds vs paths

`FullDfoForm.tsx` carries BOTH Round-A (E2/E3/E4) and Round-B (E6/E7/F2) edits; git
stages whole paths, so the file rides ONE commit. Split chosen: **commit 1 isolates E1**
(the stored-label architecture — the risky surface), **commit 2 carries all remaining
display wiring** (FullDfoForm E2–E4+E6/E7/F2, port selector E8, trip-start F3 + the 6
key pairs), **commit 3 is the F1 gate**. All display-only; risk separation preserved
where staging allows.

---

## PHASE 3 — COMMIT BLOCKS (written, never run — Jonny runs from the repo root,
ONLY AFTER the device walk below passes)

Pre-commit HEAD is `de394ec`. Stage by exact repo-relative path only — never a
directory, never -A. Gate docs are NOT in these blocks (they ride the closeout docs
commit with CLAUDE.md).

**Commit 1 — Round A / E1 (1 file):**
```
git add src/screens/Form222Screen.tsx
git commit -m "render Form 222 pickers locale-aware from reftable descFr"
git show -s --stat HEAD
```
- new hash ≠ `de394ec`; files changed = **1** (src/screens/Form222Screen.tsx);
  bare one-line subject, no body, no trailer.

**Commit 2 — Round B + FullDfoForm display wiring (5 files):**
```
git add src/components/FullDfoForm.tsx
git add src/components/DfoPortSelector.tsx
git add src/screens/TripStartConfirmScreen.tsx
git add src/i18n/locales/en/dfo.json
git add src/i18n/locales/fr/dfo.json
git commit -m "render 234 dropdowns and port selector locale-aware, FR trip-start date"
git show -s --stat HEAD
```
- files changed = **5** (the two components, one screen, two locale files).

**Commit 3 — F1 harness gate (2 files):**
```
git add src/screens/DfoLogsListScreen.tsx
git add App.tsx
git commit -m "gate XML test harness button to admin role"
git show -s --stat HEAD
```
- files changed = **2** (src/screens/DfoLogsListScreen.tsx, App.tsx).

**Push (after all three commits verify):**
```
git push origin main
```
- READ the printed range: must be `de394ec..<commit-3 hash>`.
```
git log origin/main..HEAD --oneline
```
- expect **EMPTY**. Then STOP — closeout (docs commit + CLAUDE.md backfill) is its own
  block after the walk record lands.

---

## DEVICE WALK CHECKLIST (Jonny runs BEFORE any commit block — VERIFY-THEN-COMMIT)

Device in **FRENCH** unless noted. Storage-proof stop (D) is mandatory.

**A. Form 222 (E1) — FR**
- [ ] Species picker rows read French (e.g. « Phoque gris », « Petit rorqual »); selected
  value renders French after pick.
- [ ] Incident type rows French (« Empêtrement », « Collision »…).
- [ ] Confidence rows French (« Certain », « Confiant », « Moyennement confiant »,
  « Incertain »).
- [ ] Condition rows French (« Mort », « Semble en bonne santé »…).
- [ ] Length rows French (« pi » units, e.g. « < 1 m (<3 pi) »).
- [ ] Flip device to EN mid-draft: the same picks render English off the same state.

**B. 234 form (E2/E3/E4/E6/E7/F2) — FR, MAR subform unless noted**
- [ ] SAR species dropdown French (« Baleine noire de l'Atlantique Nord », « Tortue
  luth »…); Marine Mammal picker (plain strings) unchanged EN — expected, out of scope.
- [ ] SAR condition picker French (« Vivant », « Mort », « La plupart sont vivants »…).
- [ ] Bait sheet condition French (« Frais », « Congelé », « Salé »).
- [ ] ZPH picker: « Zone 38b » in FR; "Area 38b" in EN; other rows unchanged (« LFA 34 »).
- [ ] NL-91 (region-switch or preview): trap size « Standard » / « Grand »; gear subtype
  « Casiers en bois » / « Casiers en treillis métallique » / « … et en bois ». EN walk
  shows Standard/Large + Wooden/Wire mesh — proving the defaultValue fallback intact.
- [ ] Port selector (LANDING, + TRIP on QC/NL): rows show FR names; picking stores and
  the trigger shows the FR name; flip to EN → same port shows the EN name.

**C. Confirm Trip Start (F3) — FR**
- [ ] DATE ET HEURE renders French format (e.g. « 16 juillet 2026 à 14 h 32 »), EN walk
  unchanged ("July 16, 2026 at 2:32 PM").

**D. STORAGE PROOF (read-storage-after-save) — mandatory**
- [ ] In FR, create/save one Form 222 entry with all five pickers set, then read
  @form222_entries::<uid> from AsyncStorage (simctl container route per WS1038_S90
  technique): `speciesLabel`/`interactionTypeLabel`/`confidenceLabel`/
  `specimenCondLabel`/`lengthCatLabel` must be the ENGLISH descEn strings —
  byte-identical to a pre-S101b save.
- [ ] In FR, save a 234 draft with SAR condition + bait condition + usage set: the data
  map must hold codeIds (no FR text anywhere in the stored blob).

**E. Harness gate (F1) — dev client**
- [ ] role-'dfo' account: XML Test Harness button ABSENT from the DFO logs header.
- [ ] admin account: button PRESENT and opens the harness.
- [ ] (Release/TestFlight build whenever next made: button absent everywhere — __DEV__.)

### Phase-2/3 gate — STOPPED. Awaiting "walk passed + storage verified" with per-stop
detail before the closeout (CLAUDE.md backfill incl. H1 S90 corrective note, session-log
rows, queue updates, docs commit block).

---

## S101B SCOPE-GAP NOTE (2026-07-16, appended after the device walk — nothing above rewritten)

### Walk result

PARTIAL PASS (full native rebuild, not stale bundle). Confirmed on-device: E2 (SAR
species FR — Requin bleu / Tortue luth / Baleine noire de l'Atlantique Nord), E3
(Frais/Congelé/Salé), F2 (« Zone 38b »), F3 (« 16 juillet 2026 à 10:06 »). THREE
FAILURES, all 234-form pickers rendering EN in FR mode — all render sites OUTSIDE the
S100 E1–E8 inventory (scope gap, not a regression of this session's edits):
L1 bait TYPE (Ajouter un appât), L2 marine-mammal species (Interactions), L3 bycatch
species (Ajouter une prise accessoire).

### Recon (read-only; no edits) — sites, storage model, emit coupling per list

**L1 — bait TYPE**
- Render sites (FullDfoForm.tsx): sheet option rows ~:1981–1999 (`opt.label` from
  `getSheetOptions()` → `getDfoBaitTypeList(subformId)`), sheet trigger (~:1970,
  `sheetSelectedType`), saved entry rows :1666 (`entry.type`).
- STORAGE: `BaitEntry.type` = the EN LABEL string (`finalType`; 'Other' → free text),
  persisted as JSON in `d.baitEntries` (:613). The codeId held during the sheet
  (`sheetSelectedCodeId`) is TRANSIENT — only the label is stored.
- EMIT: **E1-CLASS HAZARD.** dfoXmlGenerator.ts:111–112 `baitList.find(b => b.label ===
  e.type)` → BT_TYP_ID; a label miss emits **'0'** (worse than the 222 path's omission).
  The condition rule (:119) also keys on `match.codeId`. Stored label = emit key.
- FR source: `MV_BAIT_TYPE_rel8.csv` (Desktop; NOT vendored) — **100% codeId coverage**
  of both app bait lists (34-row MAR + 16-row QC/GLF/NL), DESC_ENG matches every app
  label byte-for-byte, 814 = « Autres ».

**L2 — bycatch species**
- Render sites: same sheet rows/trigger (options `getDfoCatchSpeciesList(subformId)`;
  NOTE `getSheetOptions()` :926 DROPS codeId for bycatch — the source lists carry it),
  saved entry rows :1732 (`entry.species`).
- STORAGE: `BycatchEntry.species` = the EN LABEL string, JSON in `d.bycatchEntries`
  (:615). No catch list has an 'Other' row → the custom-text branch is bait-only in
  practice.
- EMIT: **E1-CLASS HAZARD + a CROSS-LIST JOIN.** dfoXmlGenerator.ts:138 resolves the
  stored label against `getDfoPconsSpeciesList` (a DIFFERENT list) → SPECIE_ID; miss
  emits **'0'**. Flag (pre-existing, NOT this session's): off-MAR the join is lossy —
  QC/NL catch list has 36 species but the QC/NL pcons list has 2 rows, so 34 species
  would emit SPECIE_ID 0. Recorded as intel only.
- FR source: `MV_SPECIES_rel48.csv` (Desktop; NOT vendored) — **100% codeId coverage of
  all five catch/pcons lists** (MAR 6 / QC_NL 36 / GLF 4 / pcons 2+4). One DESC_ENG
  variance (16683 "Burbot (Mariah)") — irrelevant keyed by codeId. The Rule-272 comment
  already in dfoConstants (:1383) anticipates FR « Chabots (COTTIDAE) » display.

**L3 — marine-mammal species (234 Interactions)**
- Render site: `renderIncidentFields` plain-string branch (value === label), options
  `MARINE_MAMMAL_OPTIONS` (FullDfoForm.tsx:94, hardcoded EN strings), call :1770–1780.
- STORAGE: `d.mmSpecies` = the EN string (:624) + `mmSpeciesOther` free text; 'Other'
  is a LOGIC SENTINEL on the stored value (:1050/:1062 — S98 'No Fishing' class).
- EMIT: **NONE** — the 234 generator emits only MM_INTER_IND Y/N (grep-proof: no
  mmSpecies consumer in dfoXmlGenerator.ts). Display-only surface, but the stored value
  IS the label → needs the S98 code↔label split, not a list repoint.
- FR source: MV_NOAA_MM_SPECIES descFr matches only 5/9 options (misses: 'Harbour
  Porpoise'/'Grey Seal' spelling variants vs the table's Harbor/Gray, 'Atlantic
  White-sided Dolphin', 'Other') → reftable can't key this list; i18n map instead.

### Side-finding — U+0092 mojibake in a COMMITTED generated reftable

`src/data/reftables/mvNoaaMmSpecies.ts` carries **5 raw U+0092 control chars** (cp1252
’ mis-decoded; e.g. « Baleine noire de l␒Atlantique ») — the vendored
`data/dfo-reftables/MV_NOAA_MM_SPECIES_rel3.csv` has the 0x92 bytes and the module
predates the script's current `TextDecoder('windows-1252')` decode (:139–140), which
maps 0x92 → U+2019 correctly. Any codegen rerun regenerates this module FIXED (a real
5-char diff beyond date-stamp churn) — this also improves the E1 FR species display
shipped in Round A. Flagged; no rerun done.

### Invariant-preserving fix designs (proposed — awaiting confirm, NO edits made)

- **L1/L2 (emit-coupled → display keyed by codeId):** ingest `MV_BAIT_TYPE_rel8.csv` +
  `MV_SPECIES_rel48.csv` via the established scripts/generateReftables.js pattern
  (S51/S53/S66a/S82) → `mvBaitType.ts` / `mvSpecies.ts`; FullDfoForm builds
  codeId→descFr maps. Sheet option rows render FR by `opt.codeId` (getSheetOptions
  passes codeId through for bycatch too — display metadata only); the sheet trigger and
  saved entry rows resolve stored label → app-list row (the SAME in-list label match
  the generator does) → codeId → descFr, falling back to the stored label (covers
  custom 'Other' bait text). Stored JSON byte-identical; generator/dfoConstants
  byte-untouched; 'Other' sentinel compares untouched. Alternative rejected: ~90
  hand-typed i18n key pairs (copy risk, no authority trail). Known side effects to
  gate: codegen re-stamps dates on ALL generated modules (S66a "expected churn") and
  regenerates mvNoaaMmSpecies.ts with the U+0092 fix (real diff, called out above).
- **L3 (no emit → S98 chip pattern):** nested i18n map `form234.mmSpeciesLabels`
  (9 entries; FR from MV_NOAA_MM_SPECIES descFr where matched, S100 §2.E / FS-222 FR
  glossary for the variants, « Autre » for Other), rendered via
  `t('form234.mmSpeciesLabels.' + o, { defaultValue: o })` in the plain-string branch
  of the renderIncidentFields normalize (one line — the same line E2 touched; the coded
  SAR branch unaffected). Stored EN string + 'Other' sentinel untouched.

### Also logged (pre-existing, capture-visible — NOT S101b's; disposition TBD)

« Modifier le profil » overflows its button on Confirm Trip Start (present in the
July 15 walk shots too). Site: TripStartConfirmScreen.tsx :97–104, footer row splits
`editButton` flex:1 / `confirmButton` flex:2; the FR string at fontSize 14 overflows
the one-third slot. Micro-fix candidates (display-only): `numberOfLines={1}` +
`adjustsFontSizeToFit` on `editButtonText`, or a footer flex rebalance — either is a
2–3-line change; or carry as an S102 rider. Jonny's call.

### STOPPED for confirm — no edits this pass; commit blocks above remain valid for the
already-applied E1–E8/F1–F3 work (they do not cover L1–L3).

---

## PHASE 1C — ROUND C BUILD (2026-07-17, per the six rulings; appended — nothing above rewritten)

### Codegen / encoding (rulings 2 + 4)

- **ROOT CAUSE FOUND for the U+0092 mojibake:** Node on this machine (v22, no full ICU)
  resolves the `'windows-1252'` TextDecoder label with **latin1 semantics** — bytes
  0x80–0x9F decode to C1 controls (0x92 → U+0092) instead of cp1252 punctuation
  (’ U+2019). The script's decode line never handled the C1 range; the committed
  mvNoaaMmSpecies.ts carried the artifacts. FIX (scripts/generateReftables.js): explicit
  `CP1252_C1` map (full 0x80–0x9F table) applied post-decode; accents (0xA0+) unaffected.
- **VENDORED:** `MV_BAIT_TYPE_rel8.csv` (63 rows) + `MV_SPECIES_rel48.csv` (435 rows)
  byte-exact (`cmp`-verified) into data/dfo-reftables/, registered in the TABLES list
  (shared COLUMN_MAP — CODE_ID/DESC_FRE/DESC_ENG) → generated `mvBaitType.ts`
  (DfoBaitType) + `mvSpecies.ts` (DfoSpecies) + index exports.
- **ENCODING-DIFF GATE (ruling 4) — PASSED:** per-file changed-line counts excluding the
  date-stamp header line: mvNoaaMmSpecies.ts = 10 lines (5 rows × before/after = the
  FIVE U+0092 repairs), index.ts = 2 (the two new exports), every other regenerated
  module = **0**. Plus the two new modules. Nothing else moves.
- ⚠ **FLAG — 3 of the 5 repairs are in descEn** (not descFr): 'Brydes Whale' →
  'Bryde’s Whale', 'Grampus (Rissos) Dolphin' → 'Grampus (Risso’s) Dolphin', 'Dalls
  Porpoise' → 'Dall’s Porpoise'. descEn IS the E1 stored-label/emit-key set, so a
  pre-existing SAVED Form 222 entry holding one of those three OLD spellings would now
  miss the label→codeId find at emit — the send is then BLOCKED by validateForm222Xml
  (missing NOAA_SPECIE_COD), not silently wrong, and re-picking the species repairs the
  entry. All three are Pacific/rare species with near-zero likelihood in this app's test
  data; fresh picks store the corrected labels and resolve cleanly. On record here.

### L1 (bait type) + L3 (bycatch species) — display-only, E1/Round-A pattern (ruling 1)

`FullDfoForm.tsx`: module-level `BAIT_TYPE_FR` / `SPECIES_FR` Maps (codeId → descFr from
the vendored tables); component helpers `baitTypeDisplay(label)` /
`bycatchSpeciesDisplay(label)` — stored EN label → app-list row (the SAME in-list
find-by-label the generator uses at emit) → codeId → descFr, **fallback = the stored
label** (covers custom 'Other' bait text + unmatched legacy values); `sheetTypeDisplay`
dispatches by sheet mode. Wired at all four sites: sheet trigger (:~1997), sheet option
rows (:~2019), saved bait rows (`entry.type`), saved bycatch rows (`entry.species`).
`getSheetOptions()` now passes `codeId` through for bycatch — display metadata ONLY
(comment updated; `BycatchEntry` still persists just the label; the transient
`sheetSelectedCodeId` consumers are all `sheetMode === 'bait'`-gated — verified).
`handleSheetConfirm`, both entry writes, and dfoConstants label lists byte-untouched.

### L2 (MM species) — S98 code↔label split (ruling 3)

The stored value stays the EN string (= the stable code; ZERO migration, same as the
S98 chips). `renderIncidentFields` plain-string branch now renders
`t('form234.mmSpeciesLabels.' + o, { defaultValue: o })` while `value` stays `o`; the
coded SAR branch is untouched. New nested map `form234.mmSpeciesLabels` (9 keys, en =
identity / fr from MV_NOAA_MM_SPECIES descFr post-encoding-fix: Baleine noire de
l'Atlantique · Rorqual à bosse · Rorqual commun · Petit rorqual · Marsouin commun [MV's
own row is "Harbour Purpoise" — DFO typo, value matched manually] · Phoque gris ·
Phoque commun · Dauphin à flancs blancs de l'Atlantique · Autre; ASCII apostrophes per
the file's dominant convention). **Sentinel audit (ruling 3):** all four 'Other'
compares (:894, :1078, :1090, :2032) run against the STORED value
(`opt.value`/`species`/`sheetSelectedType`), never the translated label — the sentinel
is on the code. `selectedLabel` resolves value → translated label with `?? species`
fallback (custom text).

### « Modifier le profil » overflow (ruling 5)

`TripStartConfirmScreen.tsx` :104 — `numberOfLines={1} adjustsFontSizeToFit` on
`editButtonText`. No layout/flex change; EN unaffected (fits at full size).

### Ruling 6 — off-MAR bycatch/pcons 36-vs-2 mismatch: QUEUED, verify-first, rides the
TRG T1 sweep on GLF/QC/NL. No action taken (confirmed).

### PHASE 2C GATES (re-run 2026-07-17, full set — all PASSED)

- tsc **33 = baseline, 0 new** · jest **19 suites / 68 tests green**.
- `git diff src/utils/` = **0 lines** — generators' emit logic, dfoConstants stored-value
  lists, and BOTH find-by-label emit joins byte-untouched.
- babel.config.js diff **empty** · **zero** probe strings/console.log in the diff.
- Locale key-set diff vs HEAD: en/dfo **+15** / fr/dfo **+15**, SYMMETRIC (6 Round-B
  codeId keys + 9 mmSpeciesLabels), ZERO removed, ZERO existing values changed;
  U+FFFD = 0, NFC ✓ (both files).
- Encoding-diff gate: see above (5 repairs + 2 new tables only).

---

## PHASE 3C — CONSOLIDATED COMMIT RUN ORDER (supersedes the PHASE 3 blocks above —
those are NOT to be run as written; FullDfoForm/locale files now also carry Round C, and
the wiring commit must FOLLOW the codegen commit so every commit builds standalone)

Written, never run. Jonny runs from the repo root, ONLY AFTER the full device walk
below passes. Pre-commit HEAD is `de394ec`. Stage by exact repo-relative path only.
Gate docs (docs/GATE_S100_FR_CROSSCHECK.md, docs/GATE_S101B_DROPDOWNS.md) are NOT in
these blocks — they ride the closeout docs commit with CLAUDE.md.

**Block 1 — Round A / E1 (1 file):**
```
git add src/screens/Form222Screen.tsx
git commit -m "render Form 222 pickers locale-aware from reftable descFr"
git show -s --stat HEAD
```
- new hash ≠ `de394ec`; files changed = **1**; bare subject, no body, no trailer.

**Block 2 — codegen: cp1252 C1 decode fix + vendor bait/species tables (22 files):**
```
git add scripts/generateReftables.js
git add data/dfo-reftables/MV_BAIT_TYPE_rel8.csv
git add data/dfo-reftables/MV_SPECIES_rel48.csv
git add src/data/reftables/index.ts
git add src/data/reftables/mvBaitType.ts
git add src/data/reftables/mvSpecies.ts
git add src/data/reftables/mvBaitCondition.ts
git add src/data/reftables/mvCatchUsage.ts
git add src/data/reftables/mvConfidenceLevel.ts
git add src/data/reftables/mvGearDescription.ts
git add src/data/reftables/mvGrid.ts
git add src/data/reftables/mvIncidentType.ts
git add src/data/reftables/mvMmLengthCategory.ts
git add src/data/reftables/mvMmSpecimensCondition.ts
git add src/data/reftables/mvNoaaMmSpecies.ts
git add src/data/reftables/mvPartnershipType.ts
git add src/data/reftables/mvPort.ts
git add src/data/reftables/mvProvince.ts
git add src/data/reftables/mvSarList.ts
git add src/data/reftables/mvSpecimensCondition.ts
git add src/data/reftables/mvStatDistrictSection.ts
git add src/data/reftables/mvStatSectionVsFma.ts
git commit -m "fix cp1252 C1 decode in reftable codegen, vendor MV_BAIT_TYPE and MV_SPECIES"
git show -s --stat HEAD
```
- files changed = **22** (script + 2 CSVs + 19 under src/data/reftables/).

**Block 3 — Round B + Round C display wiring (4 files):**
```
git add src/components/FullDfoForm.tsx
git add src/components/DfoPortSelector.tsx
git add src/i18n/locales/en/dfo.json
git add src/i18n/locales/fr/dfo.json
git commit -m "render 234 dropdowns, bait and species lists, port selector locale-aware"
git show -s --stat HEAD
```
- files changed = **4**.

**Block 4 — Confirm Trip Start: FR date + edit-button fit (1 file):**
```
git add src/screens/TripStartConfirmScreen.tsx
git commit -m "locale-aware trip-start date, fit edit-profile button text"
git show -s --stat HEAD
```
- files changed = **1**.

**Block 5 — F1 harness gate (2 files):**
```
git add src/screens/DfoLogsListScreen.tsx
git add App.tsx
git commit -m "gate XML test harness button to admin role"
git show -s --stat HEAD
```
- files changed = **2**.

**Push (only after all five blocks verify — each new hash distinct):**
```
git push origin main
```
- READ the printed range: must be `de394ec..<block-5 hash>`.
```
git log origin/main..HEAD --oneline
```
- expect **EMPTY** (only after the push's real upload lines printed).
- Working-tree remainder at this point: ONLY the two gate docs (+ the untracked
  assets/docs PDFs) — anything else listed by `git status` is a stop-and-ask.

Then STOP. Closeout (CLAUDE.md backfill for S100/S101a/S101b incl. the H1 S90 note,
session-log rows, queue updates incl. the off-MAR bycatch/pcons row, docs commit block)
waits on "walk passed + storage verified + XML verified" with per-stop detail.

---

## FULL DEVICE WALK — SINGLE PASS (supersedes the earlier checklist; covers Round
A + B + C. Jonny runs BEFORE any commit block — VERIFY-THEN-COMMIT)

Device in **FRENCH** unless noted.

**A. Form 222 (E1)**
- [ ] Species rows French; the right-whale row reads « Baleine noire de l'Atlantique »
  with a CLEAN apostrophe (mojibake check — this surface has no "Nord"; the « …Nord »
  form belongs to the SAR list in stop B).
- [ ] Incident type / confidence / condition / length rows French (Empêtrement ·
  Confiant · Blessé · « pi » units).
- [ ] Selected values render French after pick.

**B. 234 form — MAR (E2/E3/E4 + L1/L2/L3)**
- [ ] SAR species French (« Baleine noire de l'Atlantique Nord », « Tortue luth ») —
  passed 07-16, re-confirm unregressed.
- [ ] SAR condition French (« Vivant », « Mort »…) — NEW since the 07-16 walk failures
  were logged; confirm.
- [ ] Bait sheet: TYPE rows now FRENCH (spot-checks: Alewife → « Gaspareau », Lobster →
  « Homard », Other → « Autres »); condition still Frais/Congelé/Salé; pick Other →
  free-text input still appears, custom text displays as typed.
- [ ] Saved bait entry row shows the FR name; flip to EN → EN name (same stored entry).
- [ ] MM species rows FRENCH (« Baleine noire de l'Atlantique », « Rorqual à bosse »,
  « Phoque gris », « Autre »); pick Autre → free-text branch still works.
- [ ] Bycatch sheet: species rows FRENCH (« Homard », « Crabe vert »,
  « Tanche-tautogue »); UTILISATION rows still French (E5-pass regression); saved
  bycatch row shows FR name.
- [ ] ZPH « Zone 38b » (passed 07-16, re-confirm) — other rows still « LFA 34 » etc.
- [ ] NL-91: trap size « Standard »/« Grand »; gear subtype « Casiers en bois »/« …en
  treillis métallique »/« …et en bois ».
- [ ] Port selector rows + trigger French; EN flip shows EN names.

**C. Confirm Trip Start**
- [ ] FR date format (passed 07-16, re-confirm).
- [ ] « Modifier le profil » now FITS its button (may render slightly smaller — that's
  the adjustsFontSizeToFit fix working). EN "Edit Profile" unchanged.

**D. EN regression pass (device to English)**
- [ ] 222 pickers, 234 bait/MM/bycatch/SAR lists, ports, ZPH ("Area 38b"), trap/gear
  subtype (Standard/Large, Wooden/Wire mesh — the defaultValue fallbacks), trip-start
  date — ALL read exactly as pre-S101b.

**E. STORAGE + EMIT PROOFS (mandatory; simctl container route per WS1038_S90)**
- [ ] Fresh FR-saved 234 draft with bait (a list pick + an Other/custom), a bycatch
  entry, MM=Oui with a species pick: the stored `d.baitEntries` JSON holds EN labels
  ("Alewife"…, custom text as typed), `BycatchEntry.species` EN ("Lobster"…),
  `d.mmSpecies` the EN string — ZERO French anywhere in the stored blob.
- [ ] Fresh FR-saved 222 entry, all five pickers set: `@form222_entries::<uid>` holds
  the EN descEn labels — byte-identical to a pre-S101b save.
- [ ] Generate (validate/preview or harness on the admin account — NO DFO POST) one 234
  XML from the FR-saved draft: grep shows `BT_TYP_ID` and PCONS `SPECIE_ID` carrying
  REAL codeIds — no `<BT_TYP_ID>0<` / `<SPECIE_ID>0<` from the walk's entries.

**F. Harness gate (F1, dev client)**
- [ ] role-'dfo' account: harness button ABSENT; admin: PRESENT + opens.

### Phase-3C gate — STOPPED (2026-07-17). All Round C edits applied + gated; commit
blocks written above, never run. Awaiting "walk passed + storage verified + XML
verified" with per-stop detail → then closeout.

---

## WALK STOP C AMENDMENT (2026-07-17, appended)

Re-shoot 13:53 (post-rebuild) showed « Modifier le profil » STILL overflowing — the
Round-C micro-fix (`numberOfLines={1} adjustsFontSizeToFit`) was present in the tree
but insufficient: RN Text defaults to `flexShrink: 0` inside the icon+text flex row, so
the Text kept its intrinsic width and overflowed the button's bounds — and
`adjustsFontSizeToFit` only scales a Text whose OWN bounds are constrained. FIX (one
style line, no layout redesign): `flexShrink: 1` added to `editButtonText`, giving the
Text shrinkable bounds inside the row so the single-line auto-scale engages. Gates
re-run: tsc 33/0-new · jest 19/68. Block 4's file set and count are UNCHANGED
(TripStartConfirmScreen.tsx, 1 file).

Walk checklist stop C, second bullet, is REOPENED pending re-shoot:
- [ ] « Modifier le profil » fits its button (may render slightly smaller); EN "Edit
  Profile" unchanged. All other stops: PASSED on-screen (Jonny, 2026-07-17) — storage/
  emit proofs (stop E) per Jonny's walk report.

---

## L4 + CODEBASE-WIDE PICKER SWEEP (2026-07-17, appended — nothing above rewritten)

### L4 — Form 233 RAISON dropdown (was NOT in any prior recon; new walk finding)

- Site: `Form233Screen.tsx` reason dropdown — selected value :288–290 + option rows
  :295–307, both rendered `opt` / `form.reason` verbatim from `INACTIVITY_REASONS`
  (`dfoForm233Generator.ts:16` = `['Weather','Mechanical','Personal','Other']`, plain EN
  strings, NOT reftable-backed → escaped the E1–E8 + L1–L3 reftable/descEn sweep).
- STORAGE + EMIT: `form.reason` stores the picked EN string; the generator emits it
  VERBATIM as free text — `tag('REASON', entry.reason)` (:95), XSD REASON = string_2000,
  no code table (:15 comment). So the stored value IS the emit value → **L2-class**: keep
  the English stored/emitted, translate at render only.
- FIX (applied): new nested i18n map `form233.reasonOptions` (4 keys; EN identity / FR
  Météo · Mécanique · Personnel · Autre — PROOFREADER REVIEW, free-text picker labels
  with no MPO code table so no answer-key mandate); both render sites now
  `t('form233.reasonOptions.' + <stored>, { defaultValue: <stored> })`. `set('reason')`
  still writes the EN string; the `form.reason === opt` compare (:296) and the emptiness
  required-check (:123) both run on the stored EN value — no sentinel touches the label.
  Generator + INACTIVITY_REASONS array byte-untouched.

### Codebase-wide sweep — hardcoded EN option lists on DFO screens (so this is the LAST)

Method: grepped every `= ['…'` string-array const and every `.map(` picker render across
all DFO screens/components (Form222/Form233/FullDfoForm/DfoSetupScreen/DfoPortSelector/
DfoTestHarnessScreen/DfoLogsListScreen/LogHistoryScreen/CaptainProfileScreen/
TripStartConfirmScreen). Full result:

**Already locale-aware (PASS — no action):** partnership picker (`partnershipOption_*`
i18n keys), stat-section picker (`i18n.language` descFr/descEn ternary), LGRID picker
(renders numeric `g.display`), usage picker (`usageOption_*`, E5-retracted), bait
condition (E3), SAR condition (E4), SAR species (E2), bait type / bycatch species (L1/L3),
MM species (L2), FMA/ZPH (F2), trap size / gear subtype (E6/E7), ports (E8).

**Fixed this pass:** INACTIVITY_REASONS (L4).

**Remaining hardcoded EN lists — FLAGGED, not acted on (per standing flag-not-act rule):**
- **REGIONS** (`DfoSetupScreen.tsx:30`, renders `r.label` = Maritimes / Gulf / Quebec /
  Nfld & Lab). User-facing activation screen; stored value = `subformId` (safe, display-
  only). NOT in the S100 answer-key inventory. Needs a RULING: (a) region proper-nouns
  are place-names, not reference-table coded values, and (b) MPO-standard FR region names
  (Golfe / Québec / T.-N.-L. or full forms) should be answer-key-checked before invention.
  DfoSetupScreen was "if visitable" in the S101a walk (role-gated). Disposition: micro-
  follow-up or S102 rider once FR region wording is confirmed — do NOT guess on a
  potential capture screen. **This is the one genuine remaining user-facing EN list.**
- **SUBFORMS** (`DfoTestHarnessScreen.tsx:24`). DEV + admin-gated (S101b F1) → never
  ships to a FR user in release. OUT OF SCOPE.
- **LFA_OPTIONS** (`CaptainProfileScreen.tsx:44`). Already flagged in the Round-B recon —
  stored-LABEL class (`profile.fishingArea` stores the label string, `fmaId` derived at
  pick), so it needs the S98 code↔label split, not a display repoint. Queue candidate
  (bundle with the CaptainProfile LFA note already in §0.1x flags).

Conclusion: after L4, the ONLY unresolved user-facing EN option list on the DFO capture
path is REGIONS, and it is a scope/answer-key decision, not a same-pattern display fix.

### Gates (re-run 2026-07-17 after L4)

tsc **33 = baseline, 0 new** · jest **19/68** · `git diff src/utils/` = **0 lines**
(REASON emit + INACTIVITY_REASONS untouched) · babel empty · zero probes · locale key-set
vs HEAD: en/dfo **+19** / fr/dfo **+19** SYMMETRIC (6 Round-B codeId + 9 mmSpeciesLabels +
4 reasonOptions), ZERO removed, ZERO existing values changed; U+FFFD = 0, NFC ✓.

---

## PHASE 3C COMMIT BLOCKS — REWRITTEN (2026-07-17; supersedes the earlier PHASE-3 AND
PHASE-3C blocks — the fix set grew by the codegen commit and the L4 file. Run THIS set.)

Written, never run. Jonny runs from repo root ONLY AFTER the 233-raison re-walk passes.
Pre-commit HEAD `de394ec`. Stage by exact repo-relative path only. Gate docs ride the
closeout commit, NOT these blocks.

**Block 1 — Round A / E1 (1 file):**
```
git add src/screens/Form222Screen.tsx
git commit -m "render Form 222 pickers locale-aware from reftable descFr"
git show -s --stat HEAD
```
- new hash ≠ `de394ec`; files changed = **1**; bare subject, no body/trailer.

**Block 2 — codegen: cp1252 C1 decode fix + vendor bait/species tables (22 files):**
```
git add scripts/generateReftables.js
git add data/dfo-reftables/MV_BAIT_TYPE_rel8.csv
git add data/dfo-reftables/MV_SPECIES_rel48.csv
git add src/data/reftables/index.ts
git add src/data/reftables/mvBaitType.ts
git add src/data/reftables/mvSpecies.ts
git add src/data/reftables/mvBaitCondition.ts
git add src/data/reftables/mvCatchUsage.ts
git add src/data/reftables/mvConfidenceLevel.ts
git add src/data/reftables/mvGearDescription.ts
git add src/data/reftables/mvGrid.ts
git add src/data/reftables/mvIncidentType.ts
git add src/data/reftables/mvMmLengthCategory.ts
git add src/data/reftables/mvMmSpecimensCondition.ts
git add src/data/reftables/mvNoaaMmSpecies.ts
git add src/data/reftables/mvPartnershipType.ts
git add src/data/reftables/mvPort.ts
git add src/data/reftables/mvProvince.ts
git add src/data/reftables/mvSarList.ts
git add src/data/reftables/mvSpecimensCondition.ts
git add src/data/reftables/mvStatDistrictSection.ts
git add src/data/reftables/mvStatSectionVsFma.ts
git commit -m "fix cp1252 C1 decode in reftable codegen, vendor MV_BAIT_TYPE and MV_SPECIES"
git show -s --stat HEAD
```
- files changed = **22** (script + 2 CSVs + 19 under src/data/reftables/).

**Block 3 — Round B + C display wiring incl. L4 (5 files):**
```
git add src/components/FullDfoForm.tsx
git add src/components/DfoPortSelector.tsx
git add src/screens/Form233Screen.tsx
git add src/i18n/locales/en/dfo.json
git add src/i18n/locales/fr/dfo.json
git commit -m "render 234 dropdowns, bait/species/reason lists, port selector locale-aware"
git show -s --stat HEAD
```
- files changed = **5** (adds Form233Screen.tsx for L4 vs the prior 4-file block).

**Block 4 — Confirm Trip Start: FR date + edit-button fit (1 file):**
```
git add src/screens/TripStartConfirmScreen.tsx
git commit -m "locale-aware trip-start date, fit edit-profile button text"
git show -s --stat HEAD
```
- files changed = **1** (carries F3 date + both micro-fix lines: adjustsFontSizeToFit + flexShrink).

**Block 5 — F1 harness gate (2 files):**
```
git add src/screens/DfoLogsListScreen.tsx
git add App.tsx
git commit -m "gate XML test harness button to admin role"
git show -s --stat HEAD
```
- files changed = **2**.

**Push (only after all five blocks verify, each new hash distinct):**
```
git push origin main
```
- READ the printed range: must be `de394ec..<block-5 hash>`.
```
git log origin/main..HEAD --oneline
```
- expect **EMPTY** (only after the push's real upload lines printed).
- Working-tree remainder = ONLY the two gate docs (+ untracked assets/docs PDFs).
  Anything else is stop-and-ask.

Total: 5 commits, 31 tracked files (1 + 22 + 5 + 1 + 2). Every earlier Phase-3 /
Phase-3C block list above is STALE — use only this rewritten set.

### Walk stop D (Form 233) — REOPENED pending re-walk
- [ ] Form 233 RAISON dropdown in FR: rows read « Météo » / « Mécanique » / « Personnel »
  / « Autre »; selected value renders FR; EN mode unchanged (Weather/Mechanical/Personal/
  Other). All other stops PASSED on-screen (Jonny, 2026-07-17), incl. QC QUADRILATÈRE FR
  (stop-F deferral cleared) and live storage/emit proof (CONF 163485, WS0000, real
  BT_TYP_ID/SPECIE_ID codeIds, stored labels English).

---

## CLOSEOUT SPEC — CLAUDE.md backfill + docs commit (READY TO APPLY after the ladder
verifies; written 2026-07-17, held pending the five block hashes). NOTHING applied to
CLAUDE.md this turn — the S101b session-log row + header + goals reference the ladder
hashes, and per VERIFY-THEN-COMMIT no hash is fabricated. When Jonny reports "ladder
verified + hashes", fill 1c16419..c0d866b and apply the edits below, then run the docs block.

Known hashes: S101a = `1258fee` (FR strings) + `de394ec` (S101a/S100 gate docs, current
HEAD). S100 was read-only (no code commits; its gate doc rode `de394ec`). PENDING:
`1c16419` Form222 · `b8377fc` codegen · `cb28ba4` display-wiring · `a41dd3a` TripStartConfirm ·
`c0d866b` harness gate.

### Edit 1 — header "Last updated" line (CLAUDE.md:3, REPLACE the whole line)

> Last updated: July 17, 2026 (Session 101b — DFO DROPDOWN LOCALE-AWARE DISPLAY (E1–E8),
> F-items F1–F3, device-walk scope gaps L1–L4, + a reftable codegen encoding fix. Five
> commits, Jonny ran all git per NO-GIT: `1c16419` Form 222 pickers · `b8377fc` cp1252-C1 decode
> fix + vendored MV_BAIT_TYPE/MV_SPECIES · `cb28ba4` 234 dropdowns/bait/species/reason + port
> selector · `a41dd3a` trip-start FR date + edit-button fit · `c0d866b` harness admin-gate.
> INVARIANT held throughout: stored values byte-identical, generators' emit path + every
> find-by-label join ZERO-TOUCH, descEn/label as defaultValue fallback (S98 pattern),
> `git diff src/utils/` = 0 lines. Walk PASSED — L4 RAISON FR on-device
> (Météo/Mécanique/Personnel/Autre), QC QUADRILATÈRE verified, storage+emit proven on a
> LIVE send CONF 163485 WS0000 (real BT_TYP_ID/SPECIE_ID codeIds, stored labels English).
> tsc 33/0-new + jest 19/68 every phase. S100 (read-only cross-check) + S101a (FR strings,
> 1258fee/de394ec) backfilled into the session log this session. Full record
> docs/GATE_S101B_DROPDOWNS.md. Next — L5 regions glossary-first recon; TBD.)

(The prior S99/S98 inline detail is dropped from the header — it lives in the session log.)

### Edit 2 — H1 S90 descFr corrective note (append AFTER CLAUDE.md:639, do NOT rewrite
639 — print-first/never-falsify). After the line ending "…6 EN keys (no `*`, optional);
6 FR _todo stubs." insert:

>   **S101b CORRECTION (2026-07-17):** the "option rows are bilingual free (reftable
>   descFr)" claim above was inaccurate at S90 write time — the trio (and the species/
>   incident-type) rows rendered reftable **descEn**, not descFr (confirmed S100 §3.3 E1,
>   fixed S101b Round A: Form222Screen now resolves descEn→descFr for DISPLAY while the
>   stored Form222Entry label + the generator's label→codeId emit stay on descEn). See
>   docs/GATE_S100_FR_CROSSCHECK.md E1 + docs/GATE_S101B_DROPDOWNS.md §0.1.

### Edit 3 — three session-log rows (INSERT after the Session 99 row, before "## Current
session goals"). Full text (S101b row: fill 1c16419..c0d866b):

`| Session 100 | Jul 15 2026 | DFO-FRENCH TERMINOLOGY CROSS-CHECK — read-only recon, single gate doc docs/GATE_S100_FR_CROSSCHECK.md, no code/git/DFO-POST. Audited every FR term in the app + §17/§22/§25 against MPO's own French answer-key docs (~/Desktop/DFO fact sheets, DFO instructions, XML-dictionary CSVs, MV_* reftables). 15 HIGH / 18 MED / 10 LOW / 3 cat-7 MPO-internal; accents/encoding cat-6 ZERO. Categories: M1–M6 rule-mandated verbatim (Rules 603/604/780/781/980, FR + EN twins), T1–T24 term mismatches (NMV→NEB, ELOG→JBE, sortie→voyage, GRILLE→QUADRILATÈRE, trempage→immersion, ÉTAT→CONDITION DE L'APPÂT…), E1–E8 EN-rendering coded dropdowns, D1–D6 docs (§17 stale v234.6 / §22 missing / §25 clean). §4 decision list marked by Jonny; sequencing strings → code dropdowns → §17/§22 docs before capture. PASSES on record: wind chip map exact MV match, finLabel Rule-931, partnership/usage verbatim, ZPH usage. No commits of its own; gate doc rode the S101a docs commit de394ec. SUPERSEDED IN PART by later appended corrections (S101a D2 submittedTitle; S101b E5 retraction + E6 MV-row correction + L1–L4 scope-gap). |`

`| Session 101a | Jul 15 2026 | FR STRING FIXES to MPO terminology (S100 §4 list) — VALUE-only edits, 3 locale files, NO key add/rename, no code/generator, no DFO POST. 84 changes (fr/dfo 76 · en/dfo 4 · fr/common 4): M1–M6 rule-verbatim + EN twins; T1–T22 terminology; rulings D2 (logs.submittedTitle Soumis→Transmis), D3 (keep « (LBS) »), D4 (emptySubtitle JBE+voyage); residuals R1–R6 (ELOG→JBE strays, Envoyer→Transmettre family, sortie→voyage strays, lowercase twins, placeholders, VRN strays); capture-visible N7 (privacy quoted-button + §1 sortie→voyage) + N4 regSentLabel. T17/T23/T24 accepted-no-edit. FR walk + EN M6 walk PASSED (walk-record corrected 2026-07-15: commit ran before stops C/F resolved; re-walked clean — stop C 8/8 incl. M4 on-device, stop F QC device-deferred, T19 passed-as-shipped). Flagged-not-acted: F1 harness on dfo-role, F2 'Area 38b' EN, F3 trip-start date EN, F4 E5-contradiction. Gates every phase tsc 33/0-new, jest 19/68; key-set symmetric, accents clean. Jonny ran: 1258fee (strings) + de394ec (S101a+S100 gate docs). 35+ FR strings flagged PROOFREADER REVIEW. Full record docs/GATE_S101A_FR_STRINGS.md. |`

`| Session 101b | Jul 16–17 2026 | DFO DROPDOWN LOCALE-AWARE DISPLAY (E1–E8) + F1–F3 + device-walk scope gaps L1–L4 + reftable codegen encoding fix — INVARIANT: stored values byte-identical, generators' emit path + ALL find-by-label joins ZERO-TOUCH (git diff src/utils/ = 0), descEn/label as defaultValue fallback (S98 pattern); no DFO POST; Jonny ran all git. PHASE-0 proved E1 NOT display-only as S100 premised — Form222Entry stores the EN descEn LABELS and generateForm222Xml resolves codeIds by label→find, so a naive descFr repoint would corrupt stored bytes AND drop mandatory NOAA_SPECIE_COD; fix keeps stored/emit English, translates render only. E5 RETRACTED (bycatch usage already renders usageOption_* keys / stores codeId — GATE_S100 note appended). ROUND A (1c16419): E1 Form 222 five pickers + E2 SAR species / E3 bait condition / E4 SAR condition (FullDfoForm refDesc + Form222Screen frMap resolver). ROUND B (cb28ba4/a41dd3a/c0d866b): E6/E7 trap-size + gear-subtype via new trapSizeOption_*/gearSubtypeOption_* i18n keys (FR = MV_GEAR_SUBTYPE/TRAP_SIZE = FS234 Rule-611, « Grand »), E8 port selector nameFr display (stored nameEn/codeId untouched), F2 fmaOption_28599 « Zone 38b », F3 trip-start date fr-CA/en-CA + « Modifier le profil » fit (numberOfLines/adjustsFontSizeToFit + flexShrink), F1 harness gated __DEV__ && isAdmin. ROUND C (234/233 non-reftable pickers that escaped the E-sweep): L1 bait type + L3 bycatch species (E1-class — stored EN label IS the BT_TYP_ID/SPECIE_ID emit key; display-only codeId→descFr from newly-vendored MV_BAIT_TYPE_rel8 + MV_SPECIES_rel48), L2 MM species (S98 code↔label split, mmSpeciesLabels map, 'Other' sentinel on the EN code), L4 Form 233 RAISON (free-text REASON emitted verbatim → reasonOptions map, English stored/emitted). CODEGEN (b8377fc): root-caused the U+0092 mojibake — Node-without-full-ICU decodes 'windows-1252' as latin1 (0x80–0x9F → C1 controls, 0x92→U+0092 not ’); added a CP1252 C1 map to generateReftables.js → 5 descEn '’' repairs in mvNoaaMmSpecies + vendored the 2 new tables; encoding-diff gate proved ONLY those 5 repairs + 2 new tables moved (all other regenerated modules 0 lines net of date-stamp). Codebase-wide picker sweep run (last same-pattern one): only REGIONS (DfoSetupScreen) remains user-facing EN → DEFERRED to L5 glossary-first recon (place-names need MPO answer-key FR). GATES every phase tsc 33/0-new, jest 19/68, babel clean, zero probes, locale key-set symmetric (+19/+19). WALK PASSED — L4 FR on-device (Météo/Mécanique/Personnel/Autre), QC QUADRILATÈRE verified (S101a stop-F cleared), storage+emit proven LIVE CONF 163485 WS0000 (BT_TYP_ID/SPECIE_ID real codeIds no 0; stored labels English "Cod, Atlantic"/"Lobster"). Commits: 1c16419 Form222 · b8377fc codegen(22 files) · cb28ba4 display-wiring(FullDfoForm/DfoPortSelector/Form233/en+fr dfo.json) · a41dd3a TripStartConfirm · c0d866b harness admin-gate. Full record docs/GATE_S101B_DROPDOWNS.md. FLAG on record: 3 of 5 mojibake repairs are in descEn (Bryde's/Risso's/Dall's) = E1 emit keys → a pre-existing saved 222 entry with an old spelling misses at emit (send BLOCKED by validator, re-pick repairs); Pacific/rare, near-zero exposure. |`

### Edit 4 — "## Current session goals" block (REPLACE the S99 content)

> SESSION 101b — complete (E1–E8 locale-aware display, F1–F3, L1–L4 scope-gap fixes,
> reftable codegen encoding fix; five commits 1c16419..c0d866b; see session log S101b +
> docs/GATE_S101B_DROPDOWNS.md). Walk passed, storage+emit proven live (CONF 163485).
> QUEUE / carry-forward: **L5 regions** (DfoSetupScreen EN region pills — glossary-first
> recon, MPO answer-key FR before any edit); **off-MAR bycatch/pcons 36-vs-2 mismatch**
> (QC/NL catch list 36 species vs 2-row pcons list → SPECIE_ID 0 off-MAR; verify-first on
> the TRG T1 GLF/QC/NL sweep); **units-label-vs-pref LBS/kg** (catchWeightLabel/
> weightLbsLabel/lbsSuffix hardcode LBS/lbs regardless of the Settings lbs/kg preference —
> S98 left the unit BEHAVIOR untouched; reconcile label with stored pref, verify-first,
> spans free-app + DFO); **LFA→ZPH** (FMA labels are EN "LFA n"; MV_FMA DESC_FRE is "Zone
> de pêche n" ≈ "ZPH n"; + CaptainProfileScreen LFA_OPTIONS is stored-LABEL class → needs
> the S98 code↔label split, not a display repoint); FR proofreader pile (now incl. S101b
> mmSpeciesLabels/reasonOptions FR + the Round-B/C option keys); §17 D1/D2 doc work. SESSION 102 — TBD.

### Edit 5 — "## Not yet built" additions (append these bullets to the section at ~line 822)

> - **L5 — DfoSetupScreen region labels (EN in FR mode)** — REGIONS (DfoSetupScreen.tsx:30)
>   renders Maritimes/Gulf/Quebec/Nfld & Lab hardcoded EN; stored value = subformId (safe,
>   display-only). Deferred from S101b as its OWN glossary-first recon: region proper-nouns
>   need MPO-standard FR from the answer key (Golfe / Québec / T.-N.-L. or full forms) —
>   do NOT invent on a role-gated setup screen. The only user-facing EN option list left
>   after the S101b sweep.
> - **Off-MAR bycatch/pcons 36-vs-2 SPECIE_ID gap** — the bycatch picker (getDfoCatchSpeciesList)
>   offers 36 species for QC/NL but the emit join (getDfoPconsSpeciesList) has 2 rows, so
>   34 off-MAR species would emit `<SPECIE_ID>0`. MAR path unaffected. Pre-existing (not
>   S101b's). VERIFY-FIRST on the TRG T1 GLF/QC/NL sweep before any fix.
> - **Unit LABEL vs unit PREFERENCE (LBS/kg)** — catchWeightLabel/weightLbsLabel/lbsSuffix
>   hardcode "LBS"/"lbs" in display text regardless of the Settings weight-unit preference
>   (a kg-pref user still sees LBS). S98 deliberately touched unit WORDS only and left the
>   lbs/kg conversion behavior alone; this is the label-vs-pref reconciliation. Spans
>   free-app + DFO; verify-first (confirm what the stored/emitted weight unit actually is
>   before changing any label).
> - **LFA→ZPH label sweep + CaptainProfile LFA split** — FMA picker rows are EN "LFA n";
>   MV_FMA DESC_FRE ≈ "Zone de pêche n" / app "ZPH n" (matches the S100-passed
>   fishingAreaLabel "ZONE DE PÊCHE (ZPH)"). Bundle with CaptainProfileScreen.tsx:44
>   LFA_OPTIONS, which is stored-LABEL class (profile.fishingArea stores the label, fmaId
>   derived at pick) → needs the S98 code↔label split, not a display repoint. Own session.

### Edit 6 — FR proofreader pile note (update the "pile now ~113" bullet, ~line 843) to
add the S101b FR additions: mmSpeciesLabels (9), reasonOptions (4 → Météo/Mécanique/
Personnel/Autre), trapSizeOption_*/gearSubtypeOption_* (5), fmaOption_28599 (« Zone 38b »)
— all flagged PROOFREADER REVIEW (free-text/place-name labels, no MPO code table to
answer-key).

### DOCS COMMIT BLOCK (written, never run — run AFTER the five-block ladder + after the
CLAUDE.md edits above are applied). Stage exact paths only:

```
git add CLAUDE.md
git add docs/GATE_S101B_DROPDOWNS.md
git add docs/GATE_S100_FR_CROSSCHECK.md
git commit -m "S101b closeout: CLAUDE.md backfill S100/S101a/S101b, gate docs"
git show -s --stat HEAD
```
- new hash ≠ `c0d866b`; files changed = **3** (CLAUDE.md + the two gate docs; GATE_S100
  carries this session's appended E5/E6/L-inventory corrections). Bare subject, no trailer.
```
git push origin main
```
- READ the printed range: `c0d866b..<new>`.
```
git log origin/main..HEAD --oneline
```
- expect EMPTY. Working tree then clean except untracked assets/docs PDFs.

(Note: docs/GATE_S101A_FR_STRINGS.md was already committed in de394ec — NOT re-staged
here. The four assets/docs PDFs stay untracked, as through the whole arc.)
