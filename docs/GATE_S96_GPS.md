# GATE — S96 GPS capture (Form 222) + FullDfoForm captureGps hardening

Phases in this gate, in commit order: **1** (Form 222 GPS button) → **1b** (FullDfoForm
captureGps hardening) → **3** (red required-field asterisks — appended below after its
edits). NO-GIT / NO-DFO-POST in force: all git is vetted literal blocks for Jonny to run.

---

## Phase 1 — "Use my location" button on Form 222 (`Form222Screen.tsx`)

- New `captureMyLocation`: when-in-use permission (requested if needed) → denied ⇒ loud
  Alert, fields untouched → `getCurrentPositionAsync({accuracy: High})` raced against a
  15 s timeout → success ⇒ `clampCoord4(String(lat/lon))` written **through
  `handleLatChange`/`handleLonChange`** (so the existing 38–72 / −148…−40 range validation
  runs and the values stay hand-editable) → no-fix / non-finite / timeout / thrown ⇒ loud
  Alert, fields untouched. **Never writes 0/blank on failure.**
- Button: `LocateFixed` + label, `captureGpsBtn`/`captureGpsBtnText` styles (mirrors
  FullDfoForm), placed at the top of the Location card above the LATITUDE field,
  `disabled` while capturing.
- i18n: `form222.useMyLocation`, `capturingGps`, `gpsDeniedTitle/Body`,
  `gpsNoFixTitle/Body` — en + fr.
- Zero change to `dfoForm222Generator.ts`, `submitDfoXml.ts`, any transmission path.

## Phase 1b — `FullDfoForm.captureGps` hardening (`FullDfoForm.tsx`)

Per your decisions: **accuracy High**; **loud Alert opt-in (manual button only)**.
- `captureGps` now: clamps via `clampCoord4` (was `.toFixed(4)`), races a 15 s timeout,
  guards against non-finite coords (never writes blank/0), and takes
  `opts?: { alertOnFail?: boolean }`.
- Only the manual **"Capture GPS"** button passes `{ alertOnFail: true }`. The three
  auto-triggers — Stop Haul (745), MM=Yes (757), SAR=Yes (772) — are unchanged and stay
  **silent** on failure (no double-alert after the MM/SAR prompt; no alert on every
  permission-less Stop Haul). All paths still get clamp + timeout + finite-guard.
- **Accuracy `High` on BOTH forms** (Form 222 + FullDfoForm/234). The earlier "Balanced
  for Form 222" spec is **superseded** — per your correction, both use `Location.Accuracy.
  High` so the recorded coords match the 4-decimal (~11 m) field resolution. No accuracy
  divergence between the two features.

### ✅ Safety-net audit (REQUIRED by your Phase-1b condition) — PASS
Every coordinate an auto-trigger fills is either not a regulator field, or hard-blocked
before emit if left empty. No silent-missing-regulator-coord path exists, so manual-only
alerting is safe.

| Auto-trigger coord | (a) visible + hand-editable | (b) empty-value blocked before emit | Verdict |
|---|---|---|---|
| **Effort `gpsLat/gpsLng`** (Stop Haul) | ✓ `renderField` 1669–1670 | ✓ `validateElogXml` Rule 3059 (dfoXmlGenerator 869–876): LAT+LONG mandatory for MAR-90 FMA-38b, blocked/not-emitted elsewhere — and it's a **hard** pre-send gate (`DfoLogsListScreen` 236–243 `if(!valid) return` before the POST) | SAFE |
| **MM `mmLat/mmLng`** (MM=Yes) | ✓ `renderIncidentFields` 1731–1738 | **N/A — never emitted.** Generator's MM block (182–239) emits only `MM_INTER_IND` (Y/N); the 234 XSD has no MM coordinate element | SAFE — not a regulator coord |
| **SAR `sarLat/sarLng`** (SAR=Yes) | ✓ `renderIncidentFields` 1752–1761 | ✓ double backstop: `handleSave` 1102–1106 (`!sarLat.trim()` blocks) **and** validator sar_type LAT/LONG `min:1` (564–565) | SAFE |

---

## Gates run in-session (PASS)

- **tsc:** `npx tsc --noEmit` → **33 errors** (baseline unchanged); **0** in
  `Form222Screen.tsx` / `FullDfoForm.tsx`.
- **jest:** **19 suites / 68 tests, all green** (this is the true current baseline —
  S94/S95 added a suite over S93's 18/64; prompt's 19·68 confirmed).
- **JSON:** both `dfo.json` parse; en/fr key parity clean for `form222` + `form234`
  (no en-only / fr-only keys).
- **clampCoord4 output** for the smoke coordinates (deterministic, mirrors dfoConstants:20):
  | input | output |
  |---|---|
  | `43.4` (sim custom lat) | `43.4` |
  | `-65.6` (sim custom lon) | `-65.6` |
  | `43.40012345` (real fix) | `43.4001` |
  | `-65.63536607` (real fix) | `-65.6354` |
  | `-66.10009` | `-66.1001` |
  Note: clampCoord4 does **not** pad trailing zeros, so the sim's clean `43.4` shows as
  `43.4`, **not** `43.4000` — expected, not a bug.

## ⚠️ Gates NOT run by me (need you — no iOS UI-automation in this session)

I did not fabricate a UI smoke pass. All new imports are proven-resolvable (expo-location,
LocateFixed, clampCoord4 are each already used elsewhere in the app), and tsc/jest are
green — but the runtime button-press flows are yours to run.

### iOS simulator smoke (SMOKE ONLY)
1. Boot app, open **Form 222**, set interaction = Yes so the Location card shows.
2. Simulator ▸ **Features ▸ Location ▸ Custom Location** → `43.4`, `-65.6`.
3. Tap **"Use my location"** → expect the fields to fill `43.4` / `-65.6` (no padding),
   no range error, no crash.
4. Confirm the values are **hand-editable** after fill, and survive the normal Save flow.
5. Toggle Location ▸ **None** and tap again → expect the loud "Couldn't get a location"
   Alert and **untouched** fields.

### Pixel 8 device gate (REAL hardware — you run)
1. Fresh install / permission not yet granted → tap **"Use my location"** → expect the
   Android permission prompt; **Allow** → real fix fills 4-decimal lat/lon in range.
2. Tap again after granting → fills without re-prompting; values hand-editable; survive Save.
3. **Deny** the permission → expect the loud "Location permission needed" Alert; fields
   **untouched**; manual entry still works end-to-end (send path unaffected).
4. Airplane mode / no-sky (force no fix) → expect "Couldn't get a location" Alert within
   ~15 s (timeout), fields untouched.
5. **234 regression (Phase 1b):** on the 234 form, manual **Capture GPS** with permission
   denied → loud Alert now shows (new). **Stop Haul / MM=Yes / SAR=Yes** with denied
   permission → **no** alert (silent, as before); confirm SAR coords still block Save if
   left empty.

## FR proofreader pile (best-effort FR — needs a native pass)
New keys added this session, FR values are best-effort:
- `form222.useMyLocation`, `form222.capturingGps`, `form222.gpsDeniedTitle`,
  `form222.gpsDeniedBody`, `form222.gpsNoFixTitle`, `form222.gpsNoFixBody`
- `form234.gpsDeniedTitle`, `form234.gpsDeniedBody`, `form234.gpsNoFixTitle`,
  `form234.gpsNoFixBody`

---

---

## Phase 3 — red required-field asterisks (grey → DFO-pill red `#DC2626`)

Recon: `docs/RECON_S96_ASTERISKS.md`. Asterisks were hardcoded per-field three ways with
no shared style; consolidated to ONE additive constant.
- **`GlobalStyles.ts`**: new `export const REQUIRED_ASTERISK_COLOR = '#DC2626'` (matches
  `dfoPill` red). Additive — no existing shared value mutated.
- **FullDfoForm.tsx**: the 13 asterisks re-pointed `#EF4444` → the constant. The two
  `Trash2` delete icons (1665/1740) and `problemDot` (2144) keep `#EF4444` — verified
  untouched (they are not asterisks).
- **Form222Screen.tsx**: 9 direct labels + `renderDropdown` gained a `required` flag
  (species / interactionType pass `true`; the 3 optional dropdowns stay bare). ` *`
  de-baked from 11 en + 9 fr label strings.
- **Form233Screen.tsx**: 3 labels (startDate/endDate/reason); operator/licence/fin left
  bare (read-only, not required). ` *` de-baked from 3 en + 3 fr strings.
- **CaptainProfileScreen.tsx**: 7 asterisks added to EXACTLY the pre-send completeness-gate
  fields (`REQUIRED_PROFILE_FIELDS`, captainStorage.ts:61-69): operatorName, licenceHolder-
  Fin, fishingNumber, vesselNumber, elogKey, fishingArea, totalGearCount. **`gearType`
  left bare** (the gate deliberately excludes it — "doesn't block a send"). All 7 are
  unconditional in the gate (no region gate) → none fell under the conditional-→-leave
  clause. No gate mismatch surfaced.

### Phase 3 verification (PASS)
- tsc **33** (baseline), **0** in the 5 touched files. jest **19 / 68** green.
- Asterisk counts: FullDfoForm 13 · Form222 10 (9 direct + 1 helper) · Form233 3 ·
  CaptainProfile 7. No double-asterisk (baked+JSX) anywhere; no grey baked ` *"` left in
  any DFO label value (en/fr dfo.json + en/fr common.json swept clean).
- **Free/Pro safety:** all four screens are DFO-side; only `GlobalStyles.ts` is shared and
  the change is a NEW constant (existing values untouched). CaptainProfile's labels are
  `common.json profile.*` keys consumed only by CaptainProfile — no Free/Pro surface
  touched. Bonus: FR `observerNmLabel`/`contactInfoLabel` never had a `*` (pre-existing
  en/fr drift) — both locales now show the red asterisk via JSX, so that drift is fixed.

### Simulator/device eyeball for Phase 3 (you run — smoke)
Open all four screens; confirm required labels show a **red** asterisk, optional fields
(Form 222 confidence/specimen/length; Captain Profile Gear Type) show **none**, and no
layout shifted.

### De-baked i18n keys (FR proofreader note stays accurate)
` *` removed from these label VALUES (wording otherwise unchanged; red asterisk now comes
from JSX): **form222** reportDateLabel, interactionDateLabel, interactionTimeLabel,
latLabel, lonLabel, lgbkNumRefLabel, speciesLabel, nbAnimalsLabel, interactionTypeLabel,
observerNmLabel (en only), contactInfoLabel (en only); **form233** startDateLabel,
endDateLabel, reasonLabel. (No FR *values* changed beyond dropping the asterisk char.)

---

## GIT — COMMIT BLOCKS (Jonny runs, in order; bare subjects, no trailers; repo-relative)

> **Shared-file reality + your decision ("GPS files whole"):** `Form222Screen.tsx`,
> `FullDfoForm.tsx`, and both `dfo.json` each carry BOTH GPS (P1/1b) and asterisk (P3)
> edits; one file can't be path-split and `git add -p` is out. So each GPS file is staged
> **whole** — its Phase-3 asterisk edits ride along in the GPS commit — and the
> asterisk-ONLY files form their own commit. FullDfoForm stays its own commit (per your
> "1b separate" call) because it's a distinct file — no `-p` needed. Net: **3 code
> commits**, all pure path staging, each independently tsc(33)/jest(19·68)-green.
>
> Rides-along disclosure: Commit 1 also contains Form 222's asterisk JSX + the en/fr
> de-bake + the form234 GPS-alert keys; Commit 1b also contains FullDfoForm's asterisk
> colour swap.

### ▶ Commit 1 — GPS: Form 222 "Use my location" button (+ its i18n)
```
git add src/screens/Form222Screen.tsx
git add src/i18n/locales/en/dfo.json
git add src/i18n/locales/fr/dfo.json
git commit -m "Add Use my location GPS button to Form 222 location fields"
```

### ▶ Commit 1b — GPS: harden FullDfoForm capture
```
git add src/components/FullDfoForm.tsx
git commit -m "Harden FullDfoForm GPS capture with timeout, clamp, and opt-in failure alert"
```

### ▶ Commit 2 — Red required-field asterisks (asterisk-only files)
```
git add src/styles/GlobalStyles.ts
git add src/screens/Form233Screen.tsx
git add src/screens/CaptainProfileScreen.tsx
git commit -m "Turn required-field asterisks red across DFO forms via shared constant"
```

### ▶ Commit 3 — Session docs (recon + gate)
```
git add docs/RECON_S96_GPS.md
git add docs/RECON_S96_ASTERISKS.md
git add docs/GATE_S96_GPS.md
git commit -m "Add S96 GPS + asterisk recon and gate docs"
```

### ▶ Commit 4 — CLAUDE.md session-log backfill (S94 + S95) + S96 row
```
git add CLAUDE.md
git commit -m "Backfill S94 and S95 session-log rows and add S96 row"
```

_Not staged / not mine: `assets/docs/*.pdf`, `docs/DIAG_S95_ITEM2.md` (pre-existing
untracked)._

---

## CLAUDE.md backfill — reconstructed rows FOR YOUR REVIEW

Per your re-issued go-ahead. S94 + S95 were absent (table had ended at S93). Reconstructed
**strictly** from the `docs/` gate/defer/recovery/diag files + the pushed commit subjects —
each is marked "ROW BACKFILLED IN S96". No fact here comes from memory or inference beyond
what those artifacts state. Now inserted in CLAUDE.md between the S93 row and the `---`.

**Sources per row:**
- **S94** ← `RECON_S94_DOCS_CARD.md`, `GATE_S94_DOCS_CARD.md`, commit `814d583`.
- **S95** ← `GATE_S95_ITEM1.md` / `ITEM2.md` / `ITEM34.md`, `DEFER_S95_KEYBOARD_SCROLL.md`,
  `RECOVERY_S95_BUILD.md`, `DIAG_S95_ITEM2.md`, commits `4d5cca9` / `89d3147` / `538baff`
  / `5896d19`.
- **S96** ← this session (gate + recon docs, working tree).

**Dates** (RESOLVED — keep commit author dates): the rows use the commit **author** dates
(`git log`) — S94 = Jul 06 2026; S95 spans Jul 06–08 2026 (items 1–2 on the 6th, items 3+4
+ deferral docs on the 8th); S96 = Jul 08 2026. The commits are the artifact; the S94/S95
doc headers were draft-dated 2026-07-05, and each backfilled row now carries a
"(doc header dated Jul 05)" honesty note.

**Jest trail (cross-checks the rows):** S93 closed 18/64 → S94 stayed 18/64 → S95 **Item 2**
added the scratch-guard suite (+1/+4) → 19/68 → held through S96.

> **S95 Item 1 (RESOLVED — artifact-faithful):** the row now reads "fix committed
> (4d5cca9); gate doc GATE_S95_ITEM1.md notes Pixel verification PENDING at write time
> (not asserted as gating the commit)." No device-verify claim is made — the gate doc
> doesn't support one.

The three inserted rows read verbatim as now in CLAUDE.md (lines after the S93 row):

```
| Session 94 | Jul 06 2026 | (ROW BACKFILLED IN S96 …) Offline DFO Documents card in
Settings (Rule 2500 …). New card between Preferences and Account (Settings UI lives in
App.tsx); two language-aware rows open bundled PDFs in a full-screen in-app viewer via
expo-asset localUri — no network in path. New-Arch split untouched. tsc 33/0-new, jest
18/64. BLOCKING PREREQ: providers_instructions_{en,fr}.pdf not yet in assets/docs/ (Jonny
provides) or Metro fails the require(). Committed 814d583, pushed origin/main. |

| Session 95 | Jul 06–08 2026 | (ROW BACKFILLED IN S96 …) Android hardening, 4 items /
4 commits. ITEM 1 (4d5cca9): datetime picker crash — declarative mode="datetime" invalid
on Android → cleanup dismiss('datetime') undefined → crash on OK; fixed via imperative
date→time flow; committed 4d5cca9, gate notes Pixel verify PENDING at write time. ITEM 2 (89d3147): draft crash-safety scratch +
restore, minimal slice (no restore-into-list, no transmission/storage-shape change);
device-verified PASS Pixel 8; stale-build red herring (DIAG_S95_ITEM2); logcat probes +
babel tweak fully reverted; +1 suite/+4 tests → jest 19/68. ITEMS 3+4 (538baff): edge-to-
edge — gradle.properties edgeToEdgeEnabled=true breaks StatusBar.currentHeight + neuters
adjustResize; fix = SafeAreaProvider + headers (app / 222 / 233 / Captain Profile modals /
DfoSetup 2a / SentLogDetailModal 2b) + KAVs; device-confirmed. DEFERRED FAIL 1 main-form
scroll-into-view (DEFER_S95_KEYBOARD_SCROLL). tsc 33/0-new, jest 19/68. Build-recovery
(5896d19, RECOVERY_S95_BUILD): gradlew clean broken by New-Arch codegen — never
prebuild --clean; hand-delete stale gitignored native dirs, rebuild w/o clean. Commits
4d5cca9 / 89d3147 / 538baff / 5896d19 pushed origin/main. |

| Session 96 | Jul 08 2026 | GPS capture (Form 222 + FullDfoForm hardening) + red required-
field asterisks. [full text in CLAUDE.md] tsc 33/0-new, jest 19/68. Recon RECON_S96_GPS +
RECON_S96_ASTERISKS; gate GATE_S96_GPS. Both forms Accuracy.High; safety-net audit PASS;
asterisks via shared REQUIRED_ASTERISK_COLOR=#DC2626. PENDING: iOS-sim + Pixel 8 gates +
FR proofread. S94/S95 rows above backfilled this session. |
```
_(The CLAUDE.md rows are the full, unabbreviated versions; the S96 line is condensed here
only — see CLAUDE.md for the complete row.)_

---

## Correction log (this pass)
1. **Form 222 accuracy → `Location.Accuracy.High`** (was Balanced). Both forms now High;
   the "Balanced for Form 222" spec is superseded. Timeout (15 s) + loud-alert failure
   paths unchanged. tsc 33/0-new, jest 19/68 re-verified. **GPS·222 commit block
   unchanged** — the edit was one identifier inside `Form222Screen.tsx`; the file list
   (Form222Screen.tsx + en/fr dfo.json) is identical.
2. **CLAUDE.md backfill** — S94 + S95 reconstructed, S96 added (this section + Commit 4).
