# GATE S112 — Form 233 section note → `REPORT_DTL.REM` (phased build)

Session 112 · 2026-07-22 · scoped from `docs/RECON_S112_233_NOTE_PATTERN.md`.
Build: add the logbook-style "Add a note" affordance to the Form 233 Reporting Period card,
emitting the optional `REPORT_DTL.REM` element (distinct from the S111 `REPORT.REM` Comments box).

## Standing rules (restated at every phase boundary)
1. NO state-changing git by Claude — commit blocks written here; Jonny runs each line from the file.
2. NO DFO POST by Claude.
3. Stage by exact repo-relative path, **never `git add -A`**. Untracked passengers (this gate doc
   until closeout, `assets/docs/` PDFs, `docs/RECON_*.md`, `docs/CC_PROMPT_*`, `docs/SWEEP_MASTER_PLAN_S112.md`)
   stay untracked.
4. Compile-is-not-proof; accepted-card-is-not-bytes — claims about the XML are backed by a byte grep
   or a static xmllint of the generator.

## Rulings carried in (from the build prompt; do not re-open)
- **R-A** — match the 234's interaction; no badge/count/filled-state styling. Auto-expand-on-load and
  survive-close/reopen are **N/A on the 233** (founder Option-1 ruling — the 233 screen is
  create-and-send-only, no hydrate path for *any* field, same as the existing Comments box). Not an
  oversight.
- **R-B** — do not touch Form 222 (`dfoForm222Generator.ts`, `Form222Screen.tsx`) in any way.
- **R-C** — note → `REPORT_DTL.REM`, Comments → `REPORT.REM`; the same text is never written to both.
- **R-D** — `LOGBOOK_UID_REFERED` stays omitted.
- **R-E** — additive; emit stays conditional on non-empty; the existing empty-omit test keeps passing.

## Founder decisions confirmed this session
- **i18n reuse** — reuse `form234.addNote` / `form234.notePlaceholder`; **no new keys**, no
  proofreader-pile additions. (Both already live in the `dfo` namespace this screen loads.)
- **Button placement** — below the End Date field, inside the Reporting Period card. Header-right
  rejected (it would re-chrome that one card's header and break consistency with the Reason/Comments
  cards, whose headers are full-width bordered titles).
- **Option 1** — build matches the 234 interaction; auto-expand and close/reopen persistence are N/A
  on the 233. Walk 1.8's "leave and re-enter" = collapse/scroll within the open form (supported;
  text lives in `form.reportDtlRemarks`).

---

## STEP 0 — READ-ONLY VERIFICATION of the two walk sends

Two sends fired from the dual-sim capture after the Phase-1 build:
- **CONF 163704** — EN (iPhone 17 Pro), Accepted WS0000, HTTP 200, `FORM233-MPMKQS`
- **CONF 163705** — FR (iPhone 17), Accepted WS0000, HTTP 200, `FORM233-PZJITI`

### 0.1 — Bytes: PASS
Read from the on-device success archive `@lobsterlog_xml_archive::AHfUKxuIPsOjrGaK0yujk1TpyFP2`
(the `.xml` field holds the full sent document). Both files carry **exactly two `<REM>`**:

```
<REPORT>
  <REPORT_UID>MPMKQS</REPORT_UID>            (PZJITI on the FR send)
  <DG_CLOSE_DT>20260722162144</DG_CLOSE_DT>
  <REM>Holiday</REM>                          ← REPORT.REM (Comments), before REPORT_DTL
  <REPORT_DTL>
    <START_DT>202607030000</START_DT>
    <END_DT>202607042359</END_DT>
    <LIC_NO>104460</LIC_NO>
    <REASON>Personal</REASON>
    <REM>Christmas</REM>                       ← REPORT_DTL.REM (note), LAST child after REASON
  </REPORT_DTL>
</REPORT>
```
- Two `<REM>`: yes · REPORT_DTL one last after REASON: yes · distinct text `Holiday` vs `Christmas`
  (**R-C**): yes.
- **Caveat:** the walk used ASCII values ("Holiday"/"Christmas") — accents and `'`→`&apos;` are NOT
  exercised by these live bytes; that handling is proven only by the unit test + xmllint sample
  (`Période d'inactivité…` → `&apos;`). Stated, not overclaimed.

### 0.2 — Filename collision: REAL (hypothesis a)
Both **stored transmission records** (`@lobsterlog_transmission_register::AHfUKx…`) hold the identical
`fileName` — not a stale card:

| CONF | sim | logId | stored `fileName` |
|---|---|---|---|
| 163704 (EN) | iPhone 17 Pro | FORM233-MPMKQS | `1004-104460-20260722162144.XML` |
| 163705 (FR) | iPhone 17 | FORM233-PZJITI | `1004-104460-20260722162144.XML` |

Both genuinely generated the same filename and DFO accepted both — contradicting the documented
WS1034. Root cause (code): `generateDfoXmlFileName` (`dfoXmlGenerator.ts:1063-1069`) stamps `ts` to the
**second** from `new Date()`; no call site passes `when` (`Form233Screen.tsx:193`,
`Form222Screen.tsx:375`, `DfoLogsListScreen.tsx:250`, `DfoTestHarnessScreen.tsx:186`). Two sends in the
same UTC second → identical filename. Shared by all four send paths.

**Founder ruling — C, sequenced:** fix (A) — make the filename unique — is its **own future change,
NOT Phase 2**; discipline (B) — never let two sends share a UTC second (stagger dual-sim EN/FR >1s or
run sequentially) — applies to the sweep starting now. Flag-don't-fix: pre-existing, outside the S112
note scope; not touched this session.

**Burned filenames (sweep record):** `1004-104460-20260722162144.XML` consumed by BOTH CONF 163704
and 163705 (the collision instance).

---

## PHASE 1 — the note: storage, UI, emit, test (BUILD DONE; device-verified; commit block READY)

### Files changed (3, all tracked, all `M`)
- `src/utils/dfoForm233Generator.ts` — `Form233Entry.reportDtlRemarks?: string` (additive); emit
  `tag('REM', entry.reportDtlRemarks ?? '', '      ')` as the last `REPORT_DTL` child after `REASON`
  (XSD `report_dtl_type` line 375), conditional on non-empty, same escaping/indent as siblings.
- `src/screens/Form233Screen.tsx` — `StickyNote` import; `FormState.reportDtlRemarks` + `EMPTY_FORM`;
  `noteOpen` state; local `renderNoteButton`/`renderNoteInput` closures mirroring `FullDfoForm`
  (no `readOnly` on this screen, no badge); affordance below End Date in the Reporting Period card;
  `reportDtlRemarks` threaded into the built entry; `addNoteBtn`/`addNoteBtnText`/`noteInput` styles
  copied verbatim from `FullDfoForm.tsx` (+ `noteBlock`/`noteButtonRow` local layout wrappers).
- `src/utils/__tests__/form233Rem.oneoff.test.ts` — 4 new tests (existing 4 untouched, R-E): DTL REM
  last-child-after-REASON; empty note omits DTL REM while REPORT.REM stays; both filled with different
  text stay separate (R-C); writes the xmllint sample.

### XSD position (proven)
`report_dtl_type` (233 XSD `…_20260108 000000.xsd` line 375): `REM` is the LAST element in the
sequence, after `REASON`; `minOccurs="0" maxOccurs="1" type="string_2000"`. Emit slot matches.

### i18n (reuse — no JSON edits)
Button `t('form234.addNote')`, placeholder `t('form234.notePlaceholder')` — both in the `dfo`
namespace the screen loads. No new keys, no `_todo`, no proofreader-pile additions.

### Gates (Phase 1) — all PASS
- `tsc --noEmit`: 33 total (baseline), **0 new** in any touched file.
- `jest`: **24 suites / 104 tests** pass (baseline 24/100; +4 in `form233Rem`).
- `xmllint` vs `~/Desktop/DFO/ELOG_F233/43792.233.…_20260108 000000.xsd`: full sample (both REMs)
  validates; empty-section-note sample validates with `REPORT_DTL.REM` cleanly absent.

### Device-verify — PASSED (founder dual-sim walk, 2026-07-22)
EN + FR. Note button renders on the Reporting Period card, matches the 234's look/behaviour; typing +
collapse preserves the note; blank note sends with `REPORT_DTL.REM` absent; existing Comments box
unaffected. Two live sends Accepted WS0000 (CONF 163704 EN / 163705 FR); bytes byte-verified in Step
0.1 (two distinct REMs, DTL REM last after REASON). N/A per Option 1: auto-expand-on-load,
survive-close/reopen.

### Phase 1 commit block — READY (Jonny runs, one line at a time)
Stage by exact path (never `-A`). Add-ladder diffed file-for-file vs `git status --short`:
staged = the 3 source files only. **NOT staged** (stay untracked): this gate doc (rides closeout),
`assets/docs/` PDFs, `docs/RECON_*.md`, `docs/CC_PROMPT_S112_*`, `docs/SWEEP_MASTER_PLAN_S112.md`,
and `CLAUDE.md` (rides closeout — no CLAUDE.md change in Phase 1).

```
git add src/utils/dfoForm233Generator.ts
git add src/screens/Form233Screen.tsx
git add src/utils/__tests__/form233Rem.oneoff.test.ts
git status --short
```
Verify `git status --short` shows **exactly** these 3 as staged (`M` in col 1):
```
M  src/screens/Form233Screen.tsx
M  src/utils/__tests__/form233Rem.oneoff.test.ts
M  src/utils/dfoForm233Generator.ts
```
and that this gate doc, the passenger PDFs, the recon/prompt/sweep docs, and CLAUDE.md remain `??`/` M`
(unstaged). Then:
```
git commit -m "Form 233 section note REPORT_DTL.REM: emit/UI/guard"
```
**COMMITTED — 18dda9d** (Jonny ran it; 3 files changed, 98 insertions, 2 deletions, all M; pushed).

---

## PHASE 2 — validator two-REM length check (BUILD DONE; confirmed; commit block READY)

`validateForm233Xml`'s `elem('REM')` matched only the first `<REM>` (`dfoForm233Generator.ts:122-125`),
so the `string_2000` backstop checked one element. With two REMs emitting, an over-length
`REPORT_DTL.REM` would pass locally and bounce at DFO. **Fix:** replaced the single check with a
`remIn(fragment)` helper that length-checks EACH level by name — `REPORT.REM` (from the XML with the
`REPORT_DTL` block stripped, so it's genuinely the report-level one even if the DTL REM is present) and
`REPORT_DTL.REM` (from inside the `REPORT_DTL` block). Errors:
`REPORT.REM exceeds string_2000: …` / `REPORT_DTL.REM exceeds string_2000: …` — same
`<name> exceeds string_2000: <value>` wording the file already uses, limit unchanged (2000), just
qualified by which element. No other code depended on the old `"REM exceeds"` string (grepped).

### Files changed (2, both tracked, both `M`)
- `src/utils/dfoForm233Generator.ts` — the two-level REM length check (validator only; emit unchanged).
- `src/utils/__tests__/form233Rem.oneoff.test.ts` — +2 tests: over-length `REPORT_DTL.REM` caught
  (the required case) + over-length `REPORT.REM` still caught under the new name (first-match regression).

### Gates (Phase 2) — all PASS
- `tsc --noEmit`: 33 total (baseline), **0 new** in touched files.
- `jest`: **24 suites / 106 tests** pass (was 24/104 after Phase 1; +2).
- `xmllint`: full + empty-section-note samples still validate (Phase 2 touched only the validator;
  the emit is byte-unchanged).

### No device walk for Phase 2 (stated honestly)
The note input is `maxLength={2000}`, so a 2001-char value cannot be typed — this length check is a
defense-in-depth backstop for values arriving by other means, and the emit path is unchanged (the
Phase-1 device walk still stands). The jest proof (both over-length cases caught by name) is the gate.

### Phase 2 commit block — READY (Jonny runs AFTER Phase 1 landed, one line at a time)
Stage by exact path (never `-A`). Add-ladder diffed vs `git status --short`: staged = the 2 files only.
NOT staged (ride closeout / stay untracked): `CLAUDE.md`, `docs/GATE_S112_233_NOTE.md`, the passenger
PDFs and recon/prompt/sweep docs.

```
git add src/utils/dfoForm233Generator.ts
git add src/utils/__tests__/form233Rem.oneoff.test.ts
git status --short
```
Verify `git status --short` shows **exactly** these 2 as staged (`M` in col 1):
```
M  src/utils/__tests__/form233Rem.oneoff.test.ts
M  src/utils/dfoForm233Generator.ts
```
and that CLAUDE.md + this gate doc + passengers remain unstaged. Then:
```
git commit -m "Form 233 validator: length-check both REPORT.REM and REPORT_DTL.REM"
```
**COMMITTED — fbb71a0.**

---

## Out of scope this session (flag-don't-fix)
- **Filename uniqueness fix (A)** — its own future change (founder ruling C, sequenced); NOT Phase 2.
  Logged to CLAUDE.md → Not yet built. Sweep discipline (B) applies now.
- Form 222 anything (R-B). Stray `~/Downloads/FullDfoForm.tsx` (not touched). §22 233 T3/T4 figure
  re-shoot + `.docx` (founder runs).

---

## CLOSEOUT — DONE (build side); commit block READY

- **CLAUDE.md updated:** header (Session 112 lead, 111 demoted to PRIOR), a ⭐ Session 112 What's-built
  entry, a Session Log row (records CONF 163704/163705 as burned filenames, the Step 0 findings, and
  this session's four rulings), Current-goals → "SESSION 112 — COMPLETE" + "SESSION 113 — TBD", and a
  new **Not yet built** bullet for the filename-uniqueness fix (A).
- **Burned filenames:** `1004-104460-20260722162144.XML` (CONF 163704 EN + 163705 FR — the collision).
- **Commit hashes:** Phase 1 = 18dda9d, Phase 2 = fbb71a0, closeout = 1236356.

### Closeout commit block — READY (Jonny runs AFTER the Phase 2 commit)
Stage by exact path (never `-A`). Staged = CLAUDE.md + this gate doc. NOT staged (stay untracked): the
4 `assets/docs/` PDFs, `docs/RECON_*.md`, `docs/CC_PROMPT_S112_*`, `docs/SWEEP_MASTER_PLAN_S112.md`.

```
git add CLAUDE.md
git add docs/GATE_S112_233_NOTE.md
git status --short
```
Verify `git status --short` shows **exactly**:
```
M  CLAUDE.md
A  docs/GATE_S112_233_NOTE.md
```
(and passengers/recon/prompt/sweep docs remain `??`). Then:
```
git commit -m "S112 closeout: 233 section note gate doc + CLAUDE.md"
```
**COMMITTED — 1236356.**

---

## FOLLOW-UP (post-closeout) — hash backfill + §22 User's Guide v1.4 doc references

Housekeeping after the three S112 commits landed + pushed (origin/main == HEAD == 1236356):
- **Hash backfill:** the `<hash PENDING VERIFICATION>` markers replaced with the real hashes —
  Phase 2 = fbb71a0, closeout = 1236356 (this doc + CLAUDE.md). Stale `(NOT pushed)` → `(pushed)`
  (all verified pushed).
- **§22 User's Guide → v1.4:** the on-disk `assets/docs` §22 pair swapped `…v1_2…` → `…v1_4…`
  (untracked passengers — NOT staged, unchanged policy). `CLAUDE.md` gained one current-state line
  (§22 now v1.4; history untouched). `docs/SWEEP_MASTER_PLAN_S112.md:230` reconcile-note rewritten
  to "unified at v1.4". §17 stays v1.2, §25 stays v1.0 — untouched.

### Commit block — READY (Jonny runs, one line at a time; do NOT push until ruled)
Stage by exact path (never `-A`, never `git add .`). Three files:
`CLAUDE.md` (M), `docs/GATE_S112_233_NOTE.md` (M), `docs/SWEEP_MASTER_PLAN_S112.md` (newly tracked).
**NOT staged (stay untracked):** the `assets/docs` v1_4 §22 PDFs + §25 v1.0 PDFs, and the
`docs/CC_PROMPT_S112_*` / `docs/RECON_S10[89]/S110/S112_*` / `docs/S113_22_FIGURE_SWAP_REPORT.md`.

```
git add CLAUDE.md
git add docs/GATE_S112_233_NOTE.md
git add docs/SWEEP_MASTER_PLAN_S112.md
git status --short
```
Verify `git status --short` shows **exactly** these three staged (col 1), everything else `??`:
```
M  CLAUDE.md
M  docs/GATE_S112_233_NOTE.md
A  docs/SWEEP_MASTER_PLAN_S112.md
```
Then commit (bare one-line subject, NO trailer):
```
git commit -m "S112 hash backfill; §22 doc refs + sweep plan to v1.4"
```
Do NOT push until Jonny says. After pushing, prove it: `git log origin/main..HEAD --oneline`
(empty output = pushed).
**COMMITTED — d96264b** (backfilled at S114).
