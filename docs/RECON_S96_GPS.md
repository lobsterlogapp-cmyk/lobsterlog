# RECON — S96 GPS Capture button for Form 222 location fields

Phase 0 recon only. No source file touched. Awaiting go-ahead before Phase 1.

---

## Step 1 — Git state + CLAUDE.md check

- `git fetch` clean; `git log origin/main..HEAD --oneline` = **empty**. Tip = **5896d19** ✓
  ("Add S95 deferral and build-recovery docs").
- Working tree NOT clean (pre-existing, none mine — will not touch/stage):
  - `?? assets/docs/Enonce_Prerequis_FR.pdf`
  - `?? assets/docs/Presrsquisites_Statement_en.pdf`
  - `?? docs/DIAG_S95_ITEM2.md`

### ⚠️ DISCREPANCY — CLAUDE.md does NOT have its S95 rows

The prompt said "confirm CLAUDE.md has its S95 rows." **It does not.** The session-log
table ends at **Session 93** (CLAUDE.md:884). There is **no S94 and no S95 row.**

Yet both sessions shipped and are pushed:
```
5896d19 Add S95 deferral and build-recovery docs
538baff Adopt SafeAreaProvider insets + keyboard avoidance (S95 items 3+4)
89d3147 Add crash-safety scratch draft for in-progress DFO logs (S95 item 2)
4d5cca9 Fix Android datetime picker crash (S95 item 1)
814d583 Session 94: offline DFO Documents card in Settings
21079e6 Session 93 closeout: CLAUDE.md 234.12-absorption-complete   ← last CLAUDE.md write
```
So CLAUDE.md was last updated at the S93 closeout; the S94 and S95 closeout rows were
never written into the table (same "closeout deferred to next session" pattern already
noted for S72–76 / S81). Supporting S94/S95 gate + recon docs DO exist in `docs/`
(GATE_S94_DOCS_CARD, GATE_S95_ITEM1/2/34, DEFER_S95_KEYBOARD_SCROLL, RECOVERY_S95_BUILD,
RECON_S95_ANDROID, DIAG_S95_BUILD/ITEM2).

**This is a recon finding, not a blocker for the GPS task** — it touches nothing in the
Form 222 path. Flagging per your rule. Reconstructing the S94/S95 table rows is out of
scope for this task and is a state-changing edit; I will not do it unless you tell me to.

---

## Step 2 — Form222Screen lat/long state model  (`src/screens/Form222Screen.tsx`)

- Fields are plain strings on `FormState`: `lat: string` / `lon: string` (52–53),
  init `''` (78–79).
- **User types decimal degrees directly**, numeric keyboard. Placeholders `e.g. 43.5000`
  / `e.g. -66.1000`. Change handlers validate range and set an inline error:
  - `handleLatChange` (198–207): lat must be 38–72 else `latError`.
  - `handleLonChange` (209–218): lon must be −148…−40 else `lonError`.
- `set` helper (147) + `latError`/`lonError` state (135–136); `sending` guard (137).
- **clampCoord4 is applied at EMIT time only** — `dfoForm222Generator.ts:162–163`
  (`clampCoord4(entry.lat)` / `(entry.lon)`), **not** at entry. Stored + displayed value
  is the raw user string. `clampCoord4` (dfoConstants.ts:20–25) rounds to ≤4 dp WITHOUT
  padding trailing zeros, keeps a leading minus, passes empty/non-numeric through trimmed;
  emit-only + idempotent.
- Location card JSX 527–556: header `t('form222.locationCard')`, two `inputGroup`/
  `lastInputGroup` blocks, each `styles.label` + `TextInput` (`value={form.lat/lon}`,
  `onChangeText={handleLatChange/handleLonChange}`, inline error text).
- Save-gate requires `form.lat`/`form.lon` and blocks on `latError||lonError`
  (229–244); entry built from `form.lat`/`form.lon` verbatim (265–266).

**Premise NOT overturned.** A fill-button is a good fit: the fields are simple string
state with dedicated validating change handlers. Writing a clamped GPS value *through*
`handleLatChange`/`handleLonChange` sets state, re-runs range validation, and leaves the
value hand-editable — exactly the requested behaviour.

---

## Step 3 — expo-location permission plumbing

- `expo-location` **~19.0.8** installed; already imported in 5 files, including
  **`FullDfoForm.tsx`** (the 234 DFO form) — direct in-repo precedent.
- **iOS** `ios/LobsterLog/Info.plist`: `NSLocationWhenInUseUsageDescription` **present** ✓
  (plus Always / AlwaysAndWhenInUse variants). (Also mirrored in app.json:17.)
- **Android** `android/app/src/main/AndroidManifest.xml`: `ACCESS_FINE_LOCATION` **present**
  ✓ and `ACCESS_COARSE_LOCATION` ✓.
- ⇒ **No native change needed → no prebuild needed.** Build hazard avoided entirely.

### Precedent: `FullDfoForm.captureGps` (705–716) + button (1651–1667)
```
requestForegroundPermissionsAsync() → if status!=='granted' return   // SILENT
getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
setLat(loc.coords.latitude.toFixed(4)); setLng(...toFixed(4));
catch (_) {}                                                          // SILENT
```
Button: `TouchableOpacity style=captureGpsBtn` + `LocateFixed` icon + `gpsCapturing`
state; label `captureGpsButton` "Capture GPS" / `capturingGps` "Locating…".
Styles: `captureGpsBtn` (row/center, gap6, py10, radius8, #EEF2FF bg, #C7D2FE border) +
`captureGpsBtnText` (13/700/#4338CA) — FullDfoForm.tsx:2067–2072.

### S96 spec DIFFERS from that precedent in 3 ways (all deliberate hardening)
| aspect | FullDfoForm precedent | S96 requirement |
|---|---|---|
| accuracy | `Accuracy.High` | **Balanced** + sensible timeout |
| clamp | `.toFixed(4)` (pads zeros) | **`clampCoord4`** |
| failure (denied / no-fix / timeout) | silent `return` / `catch {}` | **loud Alert, fields untouched** |

⇒ Plan is a **new local `captureMyLocation` in Form222Screen**, not a call into
FullDfoForm's helper. NEVER write 0/blank on failure; leave manual entry as the path.

> Note: expo-location 19 `getCurrentPositionAsync` has no first-class `timeout` option —
> planned mechanism is `Promise.race` against a rejecting timer so a hang surfaces the
> loud "no fix" Alert. Final detail settled in Phase 1.

---

## Step 4 — Premise check

Not overturned (see Step 2). Proceed as specced.

---

## Planned Phase-1 diff (single file `Form222Screen.tsx` + 2 locale files)

1. Imports: add `import * as Location from 'expo-location';`,
   `import { clampCoord4 } from '../utils/dfoConstants';`, add `LocateFixed` to the
   lucide import.
2. State: `const [gpsCapturing, setGpsCapturing] = useState(false);`
3. Handler `captureMyLocation`: when-in-use permission (request if needed) → denied →
   Alert + return untouched; `getCurrentPositionAsync({accuracy: Balanced})` raced against
   a timeout → success → `handleLatChange(clampCoord4(String(lat)))` +
   `handleLonChange(clampCoord4(String(lon)))` (sets + validates + editable) → failure/
   timeout → Alert + return untouched.
4. Button: `TouchableOpacity` (captureGpsBtn style + `LocateFixed`) inside the Location
   card, above the LATITUDE field (mirrors FullDfoForm ordering); label toggles
   Capture / Locating…, `disabled={gpsCapturing}`.
5. Styles: add `captureGpsBtn` + `captureGpsBtnText` (mirror FullDfoForm values).
6. i18n (BOTH en+fr `dfo.json`, form222 block — en:284 / fr:285): new keys —
   button label + capturing label + Alert (denied title/body, no-fix/timeout title/body).
   **FR = best-effort; keys flagged for the proofreader pile in the gate doc.**

Untouched (confirmed): `dfoForm222Generator.ts`, `submitDfoXml.ts`, any transmission
path; TimerContext, Weather, babel.config.js, android/gradle.properties.

## Baseline note for Phase 2
Prompt's stated gate baseline = tsc 33-error / jest 19 suites·68 tests. S93 closeout
recorded jest **18 suites / 64 tests** — S94/S95 likely added a suite. Will confirm the
*current* actual baseline when running the gates (Phase 2), not assume the number.
