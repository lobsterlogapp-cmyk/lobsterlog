# RECON — S96 Phase 3: red required-field asterisks

Read-only recon. NOTHING edited. Per your rule: asterisks ARE hardcoded per-field, in
THREE inconsistent ways, with NO shared style constant — SAYING SO before any edit.
Phase 3 is a separate commit gated behind the Phase 2 gate; Phase 1 (GPS) also not yet
started (still awaiting go-ahead).

---

## The red is confirmed
`GlobalStyles.ts:26` `dfoPill.backgroundColor = '#DC2626'` ✓ — so **#DC2626 is the DFO
pill red**, correct target. Note `#EF4444` (red-500) is a *different* red already used in
the app for `deleteButtonText` (GlobalStyles.ts:103) **and** for FullDfoForm's asterisks.

## How each of the four screens renders its asterisk TODAY

| Screen | Mechanism | Current colour | Shared? |
|---|---|---|---|
| **FullDfoForm.tsx** | separate `<Text style={{color:'#EF4444'}}> *</Text>` appended in JSX | **already red — but #EF4444, the WRONG red** | 2 helper lines (909, 928) + ~11 bespoke inline, all `#EF4444` |
| **Form222Screen.tsx** | `*` is a literal char **baked into the i18n label string** (`"... *"`), rendered by `styles.label` | **grey `#94A3B8`** | no — 14 labels, en + fr |
| **Form233Screen.tsx** | same — `*` baked into the i18n string | **grey `#94A3B8`** | no — same 14-ish labels, en + fr |
| **CaptainProfileScreen.tsx** | **no asterisks exist at all** (labels = `common.json profile.*`, none carry `*`) | n/a | labels come from shared `common.json` |

`styles.label` is a **local StyleSheet in each file** (FullDfoForm #64748B; the other
three #94A3B8) — there is no shared Label/Field component and **no `requiredAsterisk`/
`redStar` style anywhere** (grep for asterisk/required-star styles = zero hits).

### Evidence
- FullDfoForm inline reds: 909, 928 (shared field/label helpers) + 1291, 1308, 1344,
  1422, 1465, 1548, 1583, 1619, 1766, 1982, 2023 — all `#EF4444`.
- Form222 / Form233 baked-in `*`: en/dfo.json 272–329 (both blocks); fr/dfo.json has 12
  baked-in `*` too → **FR strings need splitting as well**, not just en.
- CaptainProfile labels: `common.json profile.operatorNameLabel` … = "OPERATOR NAME",
  "VESSEL NUMBER (VRN)", etc. — **no `*`**. Its only `#DC2626` today is `fieldError`
  text (line 548), unrelated to asterisks.

---

## ⚠️ Two things to decide BEFORE editing

**1. "Grey → red" is only half-true.** Only Form222/233 asterisks are grey. FullDfoForm's
are already red (just `#EF4444`, not the DFO `#DC2626`). And Form222/233 can't be
"recoloured" — a `*` inside a single `<Text>` string can't have its own colour, so the
job there is **structural**: de-bake `*` from ~14 en + ~14 fr strings per screen and
append a styled `<Text>` in JSX. So this is: (a) FullDfoForm `#EF4444→#DC2626`, (b)
Form222/233 de-bake-and-restyle.

**2. CaptainProfileScreen has NO asterisks.** "Recolour" is a no-op there. If you want red
`*` on its required fields, that's an **ADD** (new scope), and its labels are shared
`common.json profile.*` keys — though grep shows those keys are consumed **only by
CaptainProfileScreen** (not by any Free/Pro screen), so editing them is contained. Still,
appending `*` in the JSX (not in the common.json string) keeps common.json untouched and
is the safer route. **Need your call: add asterisks to CaptainProfile, or leave as-is?**

---

## Recommendation — consolidate to ONE constant first (matches your hint)

1. Add a shared token, e.g. `Colors.requiredAsterisk = '#DC2626'` (or a tiny
   `<RequiredMark/>`) to `GlobalStyles.ts`. **Additive only** — GlobalStyles.ts is shared
   app-wide (Free/Pro too), so I add a new constant and do **NOT** mutate any existing
   value (`dfoPill`, `deleteButtonText`, etc.).
2. FullDfoForm: point its ~13 inline `#EF4444` asterisks at the new constant.
3. Form222 / Form233: strip `*` from en+fr label strings, render `{label}<Text
   style={req}> *</Text>` using the constant.
4. CaptainProfile: per your decision above.

## Free/Pro safety
All four target screens are **DFO-side** (CaptainProfile is opened only from
TripStartConfirmScreen + DfoLogsListScreen — both DFO surfaces). No DFO form's
`styles.label` is shared. The only cross-cutting resources are (a) `common.json`
`profile.*` (consumed solely by CaptainProfile) and (b) `GlobalStyles.ts` (shared — new
constant is safe, mutating existing is not). **No Free/Pro-only surface is touched by
this plan.** Will flag before anything crosses that line.

## Gate note
tsc / jest baseline to be confirmed live in Phase 2 (prompt says 33 / 19·68; S93 recorded
18·64 — S94/S95 likely added a suite). Simulator eyeball of all four screens is part of
the Phase 3 verify.
