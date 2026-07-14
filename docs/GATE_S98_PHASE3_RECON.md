# S98 PHASE 3 RECON — chips code↔label split, stray date pill, History card (READ-ONLY)

Session 98, July 14 2026. Read-only recon at tip ea5f513 (Phase 2 pushed). No source
file touched. Prior recon: docs/GATE_S98_FRENCH_SIGNUP.md. Line numbers verified against
the CURRENT tree (Phase-2 edits were 1:1 line swaps — all prior line numbers still hold).

**Headline: no premise overturned.** A5 came back clean — outside `'No Fishing'` there is
NO code path that does logic on a chip value's English word, and the DFO side provably
never consumes these free-app chip values. The split's blast radius is exactly the 4
render sites + label maps listed below.

---

## A. CHIP CODE↔LABEL SPLIT

Prior recon re-confirmed at tip: wind array hardcoded at **App.tsx:823**
(`['N','NE','E','SE','S','SW','W','NW']`), conditions from `WEATHER_OPTIONS`
(**constants.ts:16-26**) mapped at **App.tsx:848**; both written verbatim to Firestore
(`users/{uid}/logs/{dateId}`) via useLogForm; `'No Fishing'` sentinel intact;
auto-fill writes 16-point EN compass via **helpers.ts:25-30**.

### A1 — every RENDER site (all need code→label lookup)

| Site | Lines | What renders |
|---|---|---|
| Wind chip row | App.tsx:831-835 (Text at 834 renders `dir`); selected-state compare at 824 (`formData.windDir === dir` — code vs code, stays correct untouched) | the 8 wind codes |
| Condition chip row | App.tsx:858-862 (Text at 861 renders `opt`); selected-state compare at 849-851 (`weather.includes(opt)` — code vs code, untouched) | the 9 condition codes |
| History card wind | App.tsx:962-966 (`log.windDir` interpolated at 964, inside the `kts` detail string) | stored code — **can be any of the 16 points** (auto-fill), not just the 8 chip values |
| History card conditions | App.tsx:976-978 (`log.weather.join(', ')`) | stored code array |

Other `windDir`/`weather` hits, checked and NOT part of this split:
- **ProDashboard.tsx:248-251 `getDirectionText`** — its OWN 8-point EN array rendering
  live NUMERIC degrees (sites :434, :462, :612, :647). Display-only, never stored;
  Pro-side (the separate un-i18n'd project). Could reuse the same wind label map when
  that project runs, but it is NOT required for the split's correctness.
- FishingMap.tsx — dead code (S97-confirmed, imported nowhere). Ignore.
- weatherService.ts / helpers.ts params strings — API field names, not UI.
- HistoryGraph / BaitStats / TrawlHistoryModal — zero hits; no chip values rendered.

### A2 — every WRITE site (all write the canonical EN code; refactor must not change them)

| Site | Lines | Writes |
|---|---|---|
| Wind chip onPress | App.tsx:828 | `windDir: dir` — code from the hardcoded array ✔ |
| Condition toggle | useLogForm.ts:51-63 `toggleWeather` | `opt` strings from WEATHER_OPTIONS ✔ |
| Skip-day | useLogForm.ts:135-146 `handleSkipDay` | `weather: ['No Fishing']` (:142) + appends the EN sentence `'Did not go out. '` into `notes` (:143) — see note below |
| Save passthrough | useLogForm.ts:79 (`windDir`), :82 (`weather`) → Firestore setDoc :124-125 | whatever formData holds = codes ✔ |
| Weather auto-fill | useLogForm.ts:105 `getWindDirection(...)` | 16-point EN compass code ✔ |
| Load | useLogForm.ts:25-33 / 39-48 | stored codes → formData (codes stay codes) ✔ |

**handleSkipDay notes:** (a) it is destructured at App.tsx:233 but rendered NOWHERE —
dormant path, no button currently calls it; (b) its `'Did not go out. '` string is
written into the user's freeform `notes` field. A Phase-3 decision, not a blocker:
translating it at WRITE time (t() when the button fires) stores localized text inside
user content — acceptable for notes — or leave EN until the path is resurrected.

### A3 — the `'No Fishing'` sentinel: every literal occurrence in the codebase

| File:line | Role |
|---|---|
| constants.ts:25 | array member (the canonical code) |
| useLogForm.ts:54 | `option === 'No Fishing'` — exclusivity gate on tap |
| useLogForm.ts:55 | writes `['No Fishing']` |
| useLogForm.ts:58 | `current.includes('No Fishing')` — clears it when another chip tapped |
| useLogForm.ts:142 | handleSkipDay writes `['No Fishing']` |

That is the complete list (whole-repo grep). All comparisons live in useLogForm and
compare the CODE — as long as chips keep iterating the code arrays and only the visible
`<Text>` is translated, every sentinel comparison keeps working untouched.

### A4 — full value sets + where the maps should live

**Wind: all 16 codes** (helpers.ts:27 — history data can hold any of them):
`N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW`
FR labels (O = Ouest): `N NNE NE ENE E ESE SE SSE S SSO SO OSO O ONO NO NNO`
(the 8 chip codes are a subset — one 16-entry map covers both chip row and history).

**Conditions: all 9 codes** (constants.ts:16-26):
`Sunny Cloudy Rain Fog Windy "Too Windy" Rough Snow "No Fishing"`
FR suggestions (proofreader's call at fix time): Soleil / Nuageux / Pluie / Brouillard /
Venteux / Trop venteux / Agité / Neige / Pas de pêche.

**RECOMMENDATION (not built):** t()-based, riding the existing i18n stack — two new
subsections in the EXISTING `log` section of en+fr common.json, keyed BY THE CODE
(i18next allows spaces in keys; dots are the only separator):
`log.windDirLabels.{code}` (16 entries) + `log.weatherLabels.{code}` (9 entries),
EN values byte-identical to the codes (English unchanged), FR values translated.
Look-ups go through a tiny new helper pair — e.g. `src/utils/chipLabels.ts` exporting
`windDirLabel(code, t)` / `weatherLabel(code, t)` — each calling
`t('log.windDirLabels.' + code, { defaultValue: code })`. The `defaultValue: code`
fallback is the safety net: any legacy/unexpected stored value renders as its raw code
instead of an i18next key path. Why t() over a static map file: hot-swaps with
`changeLanguage()` like every other string, keeps all translations in the locale JSONs
the proofreader already reviews, and needs no second translation infrastructure. The
helper (vs inline t() at 4 sites) exists to keep the key prefix + fallback in one place.

### A5 — PREMISE CHECK: ✅ CLEAN — no English-word logic beyond the sentinel

- **Stats math** (App.tsx:310-387 useMemo + :401-409 hasHistoryEvent): DAYS OUT /
  THIS WEEK / haul numbers / history matches key ONLY on `lbs` and `dateId` — a
  `'No Fishing'` day with lbs 0 is excluded by `Number(log.lbs) > 0`, never by the
  weather word. No windDir/weather comparison anywhere in stats.
- **No analytics, filters, or exports** touch the chip values (whole-repo grep for each
  of the 9 condition words + windDir usage: zero logic hits outside useLogForm's
  sentinel lines).
- **DFO side confirmed independent:** the free-app log lives in Firestore
  `users/{uid}/logs`; the DFO pipeline (dfoLogStorage / dfoXmlGenerator / 222 / 233)
  reads its own AsyncStorage stores and its own field set — zero grep hits for
  windDir/weather/any chip word in any dfo* file. A translated label can never reach a
  DFO emit or comparison.
- Only nuance to carry into the fix: the chip selected-state compares (App.tsx:824,
  :849-851) MUST keep comparing codes — i.e. keep `.map()` iterating the code arrays
  and translate only inside the `<Text>`. (This is the natural shape of the fix anyway.)

---

## B. THE STRAY DATE PILL — FOUND: the iOS DateTimePicker compact control

**App.tsx:727-735.** When the user taps the date header, `showDatePicker` (state at
App.tsx:216) turns true and renders:

```tsx
<DateTimePicker
  testID="dateTimePicker"
  value={currentDate}
  mode="date"
  display="default"
  onChange={handleCalendarChange}
/>
```

- It is `@react-native-community/datetimepicker` **v8.4.4** (App.tsx:29). On modern iOS,
  `display="default"` renders the native compact control — the grey **"Apr 15, 2026"**
  pill — which formats its text in the picker's `locale`, NOT via JavaScript.
- **No `locale` prop is passed**, so it falls back to the DEVICE language (English on
  the sim regardless of the app's FR setting). That's why the Phase-2 header fix at
  :711-715 (a `toLocaleDateString` JS call) didn't touch it — different rendering
  pipeline entirely.
- The prop exists and is honored on iOS in the installed version
  (node_modules/…/src/datetimepicker.ios.js:48, :99). Fix shape (Phase 3, not built):
  `locale={i18n.language.startsWith('fr') ? 'fr-CA' : 'en-CA'}` on the App.tsx:728
  element. Android note: the Android picker is a native dialog that follows the device
  locale and ignores this prop — expected platform behavior, nothing to do there.
- It disappears after a date change (`handleCalendarChange` at :417-422 sets
  `showDatePicker` false), so it's visible only mid-pick — still user-facing.

---

## C. HISTORY CARD INVENTORY (App.tsx:886-994)

| Line | String / site | Flag |
|---|---|---|
| 890-895 | `History (Week of {date})` — EN text wrapping a date | hardcoded EN string |
| 891-894 | `historyWeekDays[0].toLocaleDateString('en-US', { month:'numeric', day:'numeric' })` | hardcoded `'en-US'` date site |
| 916 | `dateObj.toLocaleDateString('en-US', { weekday:'narrow' })` — the S/M/T/W/T/F/S row | hardcoded `'en-US'`; NOT hand-typed letters — switching the locale auto-yields D/L/M/M/J/V/S |
| 932-933 | `Events for {selectedHistoryDate.toLocaleDateString()}:` | hardcoded EN string + LOCALE-DEFAULT date call (no locale arg — engine default, effectively en-US on Hermes) |
| 945-947 | `Haul {log.haulNumber}` | hardcoded EN string |
| 951-953 | `{lbs} lbs` | hardcoded EN suffix — UNITS-PREF FLAG (see below) |
| 955-957 | `${log.price \|\| '--'}/lb` | hardcoded EN suffix — UNITS-PREF FLAG |
| 961 | `` `${log.temp}°F` `` | hardcoded EN/imperial suffix — UNITS-PREF FLAG |
| 962-966 | `` ` • ${wind}${gust}kts ${log.windDir}` `` | `kts` suffix hardcoded EN + **windDir = stored chip code (part of A, not a plain string)** |
| 967 | `` ` • ${swell}m Swell` `` | hardcoded EN word (`Swell`; the `m` is metric — mixed-unit oddity, note only) |
| 976-978 | `log.weather.join(', ')` | **stored chip codes (part of A, not a plain string)** |
| 984 | `"{log.notes}"` | user content — not translatable |
| 991 | `No history recorded for this date.` | hardcoded EN empty state |

**Plain-string count: 8** (History (Week of…), Events for, Haul, lbs, /lb, °F, kts,
Swell, No history recorded — counting the two halves of the Week-of wrapper as one) +
**3 date-format sites** (891 / 916 / 933) + **2 stored-value render sites** that belong
to A (964, 976-978).

**UNITS-PREF FLAG (explicit):** translating the unit WORDS (`lbs` → `lb`, `/lb` →
`/lb`, `°F` → `°F`, `kts` → `nœuds`, `Swell` → `houle`) is plain string work and safe in
the strings commit. The lbs-vs-kg / °F-vs-°C BEHAVIOR bug (values not converted per the
Settings units preference) is a separate pre-existing bug and stays OUT of Phase 3 —
map only, fix neither the math nor the toggle here.

---

## PROPOSED PHASE-3 FIX ORDER (separate commits, by risk — NO commit steps yet)

**Commit 1 — plain strings + dates (safe; zero storage touched):**
- B: `locale` prop on the App.tsx:728 DateTimePicker (iOS pill).
- C: the 8 history-card strings → new `log.*` keys (en byte-for-byte + FR), and the
  3 date sites (891, 916, 933) → the same `fr-CA`/`en-CA` ternary as the Phase-2 header;
  the day-letter row localizes for free via 916's locale swap.
- Optional rider, same risk class: ProDashboard `getDirectionText` could adopt the wind
  label map — but it's Pro-side scope; recommend leaving it for the Pro i18n project.

**Commit 2 — chip code↔label refactor (data-model; own commit + device test):**
- New `log.windDirLabels` (16) + `log.weatherLabels` (9) key sets en+fr, helper
  `src/utils/chipLabels.ts` with `defaultValue: code` fallback.
- Wire exactly 4 render sites (chip Text ×2, history windDir :964, history weather
  :976-978). Writes, sentinel comparisons, selected-state compares, and the stored
  Firestore shape stay byte-untouched.
- Device gate: save a log with chips in FR → confirm Firestore stores EN codes; flip
  EN↔FR → same log renders both languages; history rows (incl. a legacy 16-point
  windDir like NNE) render; `'No Fishing'` exclusivity still works on tap. (Skip-day is
  dormant — no button — but its sentinel write is covered by code inspection.)
- Open decision for this commit: handleSkipDay's `'Did not go out. '` note string
  (translate-at-write vs leave-EN; path currently unreachable).
