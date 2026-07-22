# GATE S111 — 222 T6 free-text fields + 233 REM box (phased build)

**Date:** 2026-07-21
**Spec (authoritative):** docs/RECON_S110_222_233_SCOPE.md (fields, types, official FR labels
pulled verbatim from the 222 CSV dictionary at ~/Desktop/DFO/ELOG_F222/).
**Repo tip at session start:** eac7f94 (S110 closeout). Working tree clean of tracked changes.

## Standing rules (restated at every phase boundary)
1. Complete ONLY the listed steps. Anything unrelated that looks wrong → STOP and flag, do not fix.
2. **NEVER POST to any DFO endpoint.**
3. **NEVER run state-changing git** (add/commit/amend/push/reset). Claude writes vetted literal
   commands here; Jonny runs them one line at a time. Read-only git (status/log/show/diff) is fine.
4. Bare one-line commit subjects, no body, no Co-Authored-By.
5. Untracked = 4 doc passengers + 7 recon docs → leave untracked, **never `git add -A`**. Stage by
   exact repo-relative path.
6. Additive-only: never mutate existing stored shapes; `form222_entries` stores LABELS not codeIds.
7. Prove XSD sequence with xmllint (it blames the FOLLOWING element on maxOccurs=0).

## Prior rulings carried in
- P3 (S110 NL GPS gate) hash = **8c7afac** — Step 0 backfilled the two CLAUDE.md PENDING
  VERIFICATION markers with it (verified read-only: 8c7afac subject "Hide GPS section on NL-91 via
  isVisible gate…", touches FullDfoForm.tsx + dfoConstants.ts = 2 files, matches the gate doc).
- REM (MM_INTER, string_2000) already exists end-to-end — **not touched** this session.

---

## STEP 0 — CLAUDE.md backfill (DONE, rides the Phase 1 commit)
Two `PENDING VERIFICATION` markers for the S110 Phase-3 hash edited to record `8c7afac`:
- Header (line 3): `…/ 2eda255 (NB_SPCMN_KEPT) / **P3 hash PENDING VERIFICATION** (NL GPS gate —
  Jonny fills after running the block);` → `…/ 2eda255 (NB_SPCMN_KEPT) / 8c7afac (NL GPS gate);`
- S110 session-log row (line 1069): `…2 files — hash PENDING VERIFICATION, Jonny fills)` →
  `…2 files, 8c7afac)`
- Edit-only; no git amend suggested.
- **Flagged (not edited — out of scope):** two OTHER references to the same hash use the phrase
  "hash pending" / "P3-hash-PENDING" (not the literal "PENDING VERIFICATION"), so they were outside
  the "two markers" instruction: What's-Built ⭐ S110 ("NL GPS gate (P3 commit, hash pending)") and
  the current-goals S110 line ("P3-hash-PENDING"). Same fact (= 8c7afac); closeout can square them.

---

## PHASE 1 — 222 T6 fields (BUILD DONE; device-verify PENDING; commit block held)

### Fields built (all XSD 39588.222, all `string_150`, all `minOccurs=0` / `REQUIRED?=N`)
| Element | XSD level | Label EN | Label FR (dictionary-verbatim) |
|---|---|---|---|
| SITE_DSC | MM_INTER (form) | LOCATION | EMPLACEMENT |
| GEAR_DMG_REM | MM_INTER (form) | REMARK (LOST GEAR) | REMARQUE (DOMMAGES) |
| DOC_REM | MM_INTER (form) | REMARK | REMARQUE |
| EVENT_DSC | MM_INTER (form) | EVENT DESCRIPTION | DESCRIPTION DE L'ÉVÈNEMENT |
| INCDNT_REM | MM_INTER_INCDNT (node) | REMARK (INCIDENT TYPE) | REMARQUE (TYPE D'INCIDENT) |

FR labels are the CSV `SHORT_DESC_FRE` verbatim (accents + **straight** ASCII apostrophes
byte-verified against the cp1252 CSV; straight matches the existing form222 FR block). Casing is
UPPERCASE to match the app's universal field-label convention (every other 222 label is uppercase;
same deliberate casing deviation ruling as S77's finLabel — wording/accents verbatim, case follows
the app). Placeholders are best-effort FR from the CSV `LONG_DESC_FRE` → **join the proofreader pile.**

### Files changed (Phase 1)
- `src/utils/dfoForm222Generator.ts` — 5 optional fields on `Form222Entry` (raw text, additive);
  emit at the proven XSD sequence slots; validator string_150 length backstops (mirror LGBK_NUM_REF).
- `src/screens/Form222Screen.tsx` — 5 `FormState` fields + EMPTY_FORM + entry-build wiring;
  `maxLength={150}` inputs. Placement: SITE_DSC in the **Location** card; GEAR_DMG_REM + INCDNT_REM
  in the **Outcome Indicators** card; EVENT_DSC + DOC_REM in the **Remarks** card (above the
  existing Comments/REM field, which is **untouched**).
- `src/i18n/locales/en/dfo.json` + `src/i18n/locales/fr/dfo.json` — 10 keys each (5 label + 5
  placeholder), key-sets symmetric.
- `src/utils/__tests__/form222T6Fields.oneoff.test.ts` — NEW guard suite (emit presence, XSD
  sequence, first-node-only INCDNT_REM, empty→omission, FR-accent round-trip).
- `CLAUDE.md` — Step 0 backfill (rides here).

### XSD sequence positions (proven)
SITE_DSC after INTERACT_DT / before LAT · GEAR_DMG_REM after GEAR_DMG_IND / before NOAA_SPECIE_COD ·
DOC_REM after NB_SPCMN_BEST / before BDY_LEN_ID · EVENT_DSC after BDY_LEN_ID / before DG_CLOSE_DT ·
INCDNT_REM inside MM_INTER_INCDNT after INCDNT_TYP_ID / before REM.

### DESIGN DECISION — needs founder confirmation on the device walk
- **INCDNT_REM attachment:** the form has ONE incdnt-remark input, but the generator can emit several
  MM_INTER_INCDNT nodes (selected interaction type + the injury/death/entanglement indicators). The
  single INCDNT_REM is emitted on the **FIRST node only** (the selected interaction type; `codes` is a
  Set with the selected code inserted first, so insertion order puts it first). Alternative (emit the
  same remark on every node) was rejected as semantically wrong ("remark about the incident type").
  → **Confirm this is the intended behavior, or say if you want it on every node / a per-node input.**

### NAMING NOTE (resolved, not a deviation)
The session prompt said "Emit wired into **dfoXmlGenerator.ts**". The 222 form XML is generated by
**dfoForm222Generator.ts** (`generateForm222Xml`) — `dfoXmlGenerator.ts` is the 234 logbook
generator. The authoritative recon (RECON_S110_222_233_SCOPE.md) names dfoForm222Generator.ts. Built
into dfoForm222Generator.ts (correct file). Flagging the prompt's filename slip for the record.

### Gates (Phase 1)
- tsc: **33 / 0-new** (baseline held; zero errors in any touched file).
- jest: **22 suites/91 tests → 23 suites/96 tests** (new suite +5 tests; only grew).
- xmllint vs on-disk 222 XSD (39588.222…20260108.xsd):
  - full-T6 sample → **validates**
  - empty-T6 Y sample → **validates**, zero T6 elements (clean omission)
  - N sample → **validates** (no regression)
- JSON: en/fr dfo.json valid; key-sets symmetric.
- `git status --short` = the 5 tracked files above (M) + the new test (??); passengers/recon docs
  still untracked, unchanged.

---

## DEVICE-VERIFY CHECKLIST — Phase 1 (Jonny walks; sandbox sim 17 Pro Max, admin account)
Walk EN **and** FR. Confirm each:
1. **Render** — open Form 222, set the master toggle to **Yes**. The 5 new inputs appear:
   - Location card → "LOCATION" / « EMPLACEMENT » (below Longitude)
   - Outcome Indicators card → "REMARK (LOST GEAR)" / « REMARQUE (DOMMAGES) » and
     "REMARK (INCIDENT TYPE)" / « REMARQUE (TYPE D'INCIDENT) » (below the Gear Damage toggle)
   - Remarks card → "EVENT DESCRIPTION" / « DESCRIPTION DE L'ÉVÈNEMENT » and "REMARK" / « REMARQUE »
     (above the existing Comments box)
2. **French accents** — type accented French into each (é, è, à, ê, apostrophe) — renders + accepts.
3. **maxLength** — each stops accepting at 150 characters.
4. **Persist through save/reload** — fill them, save + send a 222 (UAT), reopen a fresh 222 →
   (fields reset for a new entry is expected; the point is the SENT entry stored + emitted them).
5. **Appear in generated XML** — the sent 222's XML carries the 5 elements with your text
   (SITE_DSC/GEAR_DMG_REM/DOC_REM/EVENT_DSC + INCDNT_REM on the first incident node).
6. **INCDNT_REM policy** — confirm the design decision above (first-node-only) is what you want.
7. **Casing** — confirm UPPERCASE labels are fine (vs the dictionary's mixed-case « Emplacement »).
8. **Empty path unaffected** — a 222 with the new fields left blank emits none of them and still sends.

### Device-verify — PASSED (founder walk, 2026-07-21)
All 6 checklist items confirmed (render EN+FR, accents, maxLength 150, persist+send, XML carries all
5 elements, empty path unaffected). All 3 rulings confirmed:
- **INCDNT_REM = one box, first-node-only** (as built).
- **UPPERCASE labels** kept (app convention; dictionary wording/accents verbatim).
- Built in the **right file** (dfoForm222Generator.ts, the 222 generator).

### Phase 1 commit block — READY (Jonny runs, one line at a time)
Stage by exact path (never `-A`). Add-ladder diffed file-for-file vs `git status --short`:
staged = CLAUDE.md + dfoForm222Generator.ts + Form222Screen.tsx + en/dfo.json + fr/dfo.json +
form222T6Fields.oneoff.test.ts. **NOT staged** (stay untracked): docs/GATE_S111_222_233_BUILD.md
(rides closeout), the 4 assets/docs passenger PDFs, the 7 docs/RECON_S10[89]/S110 recon docs.

```
git add CLAUDE.md
git add src/utils/dfoForm222Generator.ts
git add src/screens/Form222Screen.tsx
git add src/i18n/locales/en/dfo.json
git add src/i18n/locales/fr/dfo.json
git add src/utils/__tests__/form222T6Fields.oneoff.test.ts
git status --short
```
Verify the `git status --short` output shows **exactly** these 6 as staged (`A`/`M` in col 1):
```
M  CLAUDE.md
M  src/i18n/locales/en/dfo.json
M  src/i18n/locales/fr/dfo.json
M  src/screens/Form222Screen.tsx
M  src/utils/dfoForm222Generator.ts
A  src/utils/__tests__/form222T6Fields.oneoff.test.ts
```
and that GATE_S111, the 4 passenger PDFs, and the 7 recon docs remain `??` (unstaged). Then:
```
git commit -m "Form 222 T6 fields SITE_DSC/GEAR_DMG_REM/DOC_REM/EVENT_DSC + INCDNT_REM first-node; emit/UI/i18n/guard"
```
**COMMITTED — 4a02ae9** (Jonny ran it; CLAUDE.md Step 0 rode along).

---

## PHASE 2 — 233 REM box (BUILD DONE; device-verify PENDING; commit block held)

### Field built
| Element | XSD level | Type | Label EN | Label FR (dictionary-verbatim) |
|---|---|---|---|---|
| REM | REPORT (report_type) | string_2000 | Comments | Commentaires |

### "(233.2)" resolved
The prompt's "emit at correct XSD position **(233.2)**" = the **233-2 form spec** (fact sheet
FS-NAT-233-2), mirroring Phase 1's "(222.1)" = FS-NAT-222-1 — a spec identifier, NOT a node
pointer. The 233 XSD has **two** REM elements, both labeled Comments/Commentaires:
`REPORT.REM` (NODE_ORDER 135.1, LONG "Comments on the inactivity") and `REPORT_DTL.REM`
(136.2, bare "Comments"). Built the single UI field to **REPORT.REM** (the report-level
"Comments on the inactivity" — natural home for one general comments box; one REPORT node, so
unambiguous). `REPORT_DTL.REM` left unused. → **founder-confirm on the walk** (see checklist).

### Files changed (Phase 2)
- `src/utils/dfoForm233Generator.ts` — optional `remarks` on `Form233Entry` (additive); emit
  `<REM>` in the report_type slot (after DG_CLOSE_DT, before REPORT_DTL); validator string_2000
  length backstop.
- `src/screens/Form233Screen.tsx` — `TextInput` import; `remarks` FormState + EMPTY_FORM +
  entry-build; new "Comments (Optional)" / « Commentaires » card with a multiline `maxLength={2000}`
  input; `remarksInput` style.
- `src/i18n/locales/en/dfo.json` + `src/i18n/locales/fr/dfo.json` — 2 keys each (remarksCard,
  remarksPlaceholder); key-sets symmetric. Placeholder = CSV LONG_DESC ("Comments on the
  inactivity" / « Commentaires au sujet de l'inactivité »).
- `src/utils/__tests__/form233Rem.oneoff.test.ts` — NEW guard suite.

### Scope note (deliberate omission)
This session's Phase 2 instruction = **the REM field only**. `LOGBOOK_UID_REFERED` (report_type
opt) is NOT in scope — the generator deliberately omits it ("inactivity not tied to a specific
logbook"); left untouched.

### Gates (Phase 2)
- tsc: **33 / 0-new** (0 in any touched file).
- jest: **23 suites/96 tests → 24 suites/100 tests** (new suite +4; only grew).
- xmllint vs on-disk 233 XSD (43792.233…20260108.xsd): REM sample → **validates** (REM at REPORT
  level, after DG_CLOSE_DT, before REPORT_DTL); existing empty-REM 233 sample → **validates**, zero
  REM (no regression).
- JSON valid; key-sets symmetric.
- `git status --short` = 4 tracked files (M) + the new test (??); CLAUDE.md clean (Phase 1 committed
  it); passengers/recon docs/GATE_S111 still untracked.

---

## DEVICE-VERIFY CHECKLIST — Phase 2 (Jonny walks; sandbox sim 17 Pro Max, admin account)
Walk EN **and** FR:
1. **Render** — open Form 233. Below the "Reason for Inactivity" card, a new
   "COMMENTS (OPTIONAL)" / « COMMENTAIRES » card with a multiline box.
2. **French accents** — type accented French (é, è, à, apostrophe) — renders + accepts.
3. **maxLength** — stops at 2000 characters.
4. **Persist through save/reload** — fill it, save + send a 233 (UAT) → the SENT entry stored it.
5. **Appear in generated XML** — the sent 233's XML carries `<REM>` at the REPORT level with your
   text (after DG_CLOSE_DT, before REPORT_DTL).
6. **REM target** — confirm REPORT.REM is what you want (vs REPORT_DTL.REM).
7. **Empty path unaffected** — a 233 with Comments left blank emits no REM and still sends.

### Device-verify — PASSED (founder walk, 2026-07-21)
All 7 checklist items confirmed (render EN+FR, accents, maxLength 2000, persist+send, XML carries
`<REM>` at REPORT level, empty path unaffected). **REPORT.REM confirmed** as the target.

### Phase 2 commit block — READY (Jonny runs, one line at a time)
Stage by exact path (never `-A`). Add-ladder diffed file-for-file vs `git status --short`:
staged = dfoForm233Generator.ts + Form233Screen.tsx + en/dfo.json + fr/dfo.json +
form233Rem.oneoff.test.ts. **NOT staged**: CLAUDE.md (clean; closeout edits it), the gate doc
(rides closeout), the 4 passenger PDFs, the 7 recon docs.

```
git add src/utils/dfoForm233Generator.ts
git add src/screens/Form233Screen.tsx
git add src/i18n/locales/en/dfo.json
git add src/i18n/locales/fr/dfo.json
git add src/utils/__tests__/form233Rem.oneoff.test.ts
git status --short
```
Verify `git status --short` shows **exactly** these 5 staged (`A`/`M` in col 1):
```
M  src/i18n/locales/en/dfo.json
M  src/i18n/locales/fr/dfo.json
M  src/screens/Form233Screen.tsx
M  src/utils/dfoForm233Generator.ts
A  src/utils/__tests__/form233Rem.oneoff.test.ts
```
and GATE_S111 + the 4 passenger PDFs + the 7 recon docs remain `??`. Then:
```
git commit -m "Form 233 REM box: REPORT.REM comments field, emit/UI/i18n/guard"
```

---

## CLOSEOUT

### Static EN/FR string audit — PASS
- New keys present in BOTH locales: form222 ×10 (5 label + 5 placeholder), form233 ×2.
- Full key-sets symmetric: **form222 75/75**, **form233 29/29** (EN == FR).
- 0 `_todo` stubs in any new value.
- 0 orphans: every new key referenced exactly once in the render path
  (Form222Screen.tsx / Form233Screen.tsx); no hardcoded-EN label literals in the render path.
- FR accents byte-checked: no curly apostrophe (U+2019), no C1 mojibake (U+0080–009F); straight
  ASCII apostrophes throughout (matches the CSV dictionaries + the existing form222/form233 FR
  blocks). Accents present + correct (É/È/é/à/ê/ù).

### CLAUDE.md updated
Header (S111 lead, S110 → PRIOR, "Next — SESSION 112 TBD"); new What's-Built ⭐ Session 111 entry;
new Session-log row; Current-goals "SESSION 111 — COMPLETE …" + "SESSION 112 — TBD". Phase-2 commit
hash carried as **PENDING VERIFICATION** (Jonny fills after running the Phase 2 block). The two
OTHER S110 "hash pending" phrasings (What's-Built + goals, not literal "PENDING VERIFICATION") were
LEFT as-is — out of closeout scope; flagged for a future squaring to 8c7afac.

### Closeout commit block — READY (Jonny runs AFTER the Phase 2 commit)
Stage by exact path. staged = CLAUDE.md (S111 closeout edits) + this gate doc. **NOT staged**: the 4
passenger PDFs, the 7 recon docs (stay untracked).
```
git add CLAUDE.md
git add docs/GATE_S111_222_233_BUILD.md
git status --short
```
Verify only these 2 are staged (`M`/`A`); the 4 passenger PDFs + 7 recon docs remain `??`. Then:
```
git commit -m "S111 closeout: 222 T6 + 233 REM gate doc + CLAUDE.md"
```
After this commit, **nothing is staged-uncommitted** — only the 4 passengers + 7 recon docs remain
untracked (by design). Then backfill the P2 hash into CLAUDE.md's four "PENDING VERIFICATION" slots
next session (or now, as a trivial follow-up edit) once the Phase 2 commit hash is known.

## Out of scope (do not touch this session)
The sweep itself, any 234 code, the DfoSetupScreen region-seed fix, MAR GPS visibility, any UI
change to a captured screen other than the deliberate 222/233 additions.
**Note:** these 222 builds re-open the 222 **T7/T8** figures (and Phase 2 re-opens 233 **T3/T4**) —
re-capture is Jonny's task on the capture sims after the commits land, before the §22 masters update.
