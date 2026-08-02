# GATE S120 — KEPT_WT zero-catch emission (Test Case 3 unblock)

**Date:** 2026-08-01 (Session 120). **Scope ruling (founder):** zero-allowance scoped to
the CATCH.KEPT_WT call site ONLY — a global kgStr change would let a typed 0 in the
Personal-use field emit its PCONS node carrying hardcoded USG_ID 37822, which is Blocked
on subforms 88/89/91 (Subforms_requirements_234.xlsx row 58) — a worse defect than the
one fixed.

## What changed and why

The DFO Test Case 3 file (zero-catch logbook) requires KEPT_WT to carry a literal zero.
`kgStr()` treated a typed 0 as absent (`n <= 0 → ''`), so the element was silently
dropped; the save gate accepts "0" (non-empty) and the send-time validator passes the
document (`KEPT_WT min: 0`), so the file transmitted with the element missing.

**Rule citations (FS-NAT-234-12-EN.pdf):**
- **Rule 2020** (5.2.3, p.7): "When there has been no catch during the fishing effort,
  the fisher must enter 0 in the quantity kept (Catch.Kept_wt)."
- **Rule 630** (p.37): "In each occurrence of the CATCH node, at least one of the kept
  weight (Catch.Kept_wt) or the number of specimen discarded (Catch.Nb_spcmn_disc) must
  contain a value greater than or equal to 0."
- **Rule 631** (p.37): "If the species caught (Catch.Specie_id) is one of: 1312 Lobster —
  then the capture of the kept weight (Catch.Kept_wt) is mandatory." (The app's CATCH is
  always the lobster target per Rule 2020.)
- **Rule 789** (p.8–9) separately treats 0 as a declarable quantity for BT_WT, PCONS.WT
  and TRANSFER_DTL.WT — those call sites are deliberately UNCHANGED here; booked for the
  Aug/Sept pile alongside gating the Personal-use field off subforms where USG_ID is
  Blocked (88/89/91).

## Before / after — kgStr (src/utils/dfoXmlGenerator.ts)

Before (lines 46–50):
```ts
function kgStr(lbs: string, inLbs: boolean): string {
  const n = parseFloat(lbs);
  if (isNaN(n) || n <= 0) return '';
  return (inLbs ? n / 2.20462 : n).toFixed(2);
}
```

After:
```ts
// allowZero: a typed 0 is a declarable quantity ONLY where a rule says so — currently
// just CATCH.KEPT_WT (Rule 2020 zero-catch + Rules 630/631). Every other caller keeps
// the default, so 0 still suppresses the element/node there (e.g. the personal-use
// PCONS node whose hardcoded USG_ID is Blocked on 88/89/91).
function kgStr(lbs: string, inLbs: boolean, allowZero: boolean = false): string {
  const n = parseFloat(lbs);
  if (isNaN(n) || (allowZero ? n < 0 : n <= 0)) return '';
  return (inLbs ? n / 2.20462 : n).toFixed(2);
}
```

Call site (the ONLY one passing the flag) — before: `const catchWtKg = kgStr(d.catchWeight, inLbs);`
After:
```ts
  // KEPT_WT: a typed 0 must emit as 0.00 (Rule 2020 — "the fisher must enter 0 in the
  // quantity kept" — with Rules 630/631 making KEPT_WT mandatory on the lobster CATCH).
  const catchWtKg = kgStr(d.catchWeight, inLbs, true);
```

Emitted value for a typed "0": **`<KEPT_WT>0.00</KEPT_WT>`** (both lbs and kg unit
modes; passes the validator weight pattern `/^\d{1,6}(\.\d{1,3})?$/`).

The five other call sites (BAIT_USED.BT_WT :113, bycatch PCONS.WT :140, personal-use
PCONS.WT :162, HLIN.TOT_WT_ONBRD :365, TRANSFER_DTL.WT :401) call with the default —
behaviour byte-identical to before: blank / non-numeric / negative / **zero** all omit.

## Test added

`src/utils/__tests__/keptWtZero.oneoff.test.ts` — 7 tests (MAR-90 fixture, generator
output greps, mirroring nbSpcmnKept.oneoff.test.ts style):
1. catchWeight "0" → `<KEPT_WT>0.00</KEPT_WT>` emitted
2. catchWeight "" → KEPT_WT omitted
3. catchWeight "abc" → omitted
4. catchWeight "-5" → omitted
5. catchWeight "500" (lbs) → `<KEPT_WT>226.80</KEPT_WT>` (unchanged conversion)
6. Personal use "0" → NO PCONS node, NO USG_ID (default-path guarantee)
7. 0-lb bait entry → NO BAIT_USED node (default-path guarantee)

## Verify gate

| Gate | Baseline | Result |
|---|---|---|
| `npx tsc --noEmit` | 33 pre-existing errors | **33** (0 new) |
| `npx jest` | 26 suites / 111 tests | **27 suites / 118 tests, all passing** (+1 suite, +7 tests — exactly the tests added) |

`git status --short` (tracked modifications): ` M src/utils/dfoXmlGenerator.ts` only.
New untracked files this session: `src/utils/__tests__/keptWtZero.oneoff.test.ts` and
this gate doc. No file outside src/utils/dfoXmlGenerator.ts and src/utils/__tests__/
was modified; version files (ios/LobsterLog/Info.plist, android/app/build.gradle,
app.config.js, eas.json) untouched; no prebuild/clean run; no DFO POST.

## Commit commands (Jonny runs, one line at a time — NO-GIT rule)

```
git add src/utils/dfoXmlGenerator.ts
git add src/utils/__tests__/keptWtZero.oneoff.test.ts
git add docs/GATE_S120_KEPT_WT_ZERO.md
git commit -m "Emit KEPT_WT 0.00 for a typed zero catch weight (KEPT_WT call site only)"
```
