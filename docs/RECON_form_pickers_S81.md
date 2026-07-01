# RECON — Date/Time picker pattern + Form 222/233 date fields (Session 81)

**Scope:** RECON ONLY. No code changed. Line numbers verified on disk 2026-06-24. Files:
`src/components/FullDfoForm.tsx`, `src/screens/Form222Screen.tsx`,
`src/screens/Form233Screen.tsx`, `src/utils/dfoForm222Generator.ts`,
`src/utils/dfoForm233Generator.ts`.

---

## A) The picker pattern to copy — `FullDfoForm.tsx`

**(1) Import + component name** (`:14`)
- `import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';`
- Component = `DateTimePicker` (community package, NOT the Expo one).

**(2) Show/hide state + how it's mounted**
- State: `pickerVisible` bool (`:278`), `pickerField: PickerField | null` (`:279`), `pickerDate: Date`
  (`:280`), plus `tempDate` (iOS staging value). `PickerField` union (`:122`) =
  `'sailed'|'startHaul'|'stopHaul'|'landing'|'mmTime'|'sarTime'|'lostGearTime'`.
- `openPicker(field)` (`:680`): seeds the working Date from the field's current strings via
  `parseDateTime(dateStr,timeStr)`, then `setPickerField(field)` + `setPickerVisible(true)`.
  A date-only entry point (`:1175`–`:1177`) sets `pickerField=null` ("null = date-only mode").
- Mounted TWO ways (platform split):
  - iOS — inside a `<Modal>`, `display="spinner"`, Cancel + Done buttons; Done calls
    `applyPickerValue(tempDate)` then closes (`:1690`, picker at `:1694`–`:1701`).
  - Android — inline conditional `{Platform.OS === 'android' && pickerVisible && (<DateTimePicker
    … display="default" onChange={handlePickerChange}/>)}` (`:1705`–`:1712`).
- `handlePickerChange` (`:697`): Android applies immediately (dismiss-aware); iOS stages into `tempDate`.

**(3) How the chosen value is written back into the stored string** — `applyPickerValue(d)` (`:708`)
- `pickerField === null` → `setDateFished(formatDate(d))` (date only).
- time-bearing fields write BOTH a date string AND a time string, separately, e.g.
  `case 'sailed': setDateFished(formatDate(d)); setTimeSailed(formatTime(d)); break;` (one picker →
  two stored strings). `mmTime`→mmDate+mmTime, `sarTime`→sarDate+sarTime, etc.
- Helpers: `formatDate` (`:98`) → `` `${yyyy}-${mm}-${dd}` `` (YYYY-MM-DD); `formatTime` (`:92`) →
  `` `${hh}:${mm}` `` (HH:MM). `parseDateTime` (`:105`) rebuilds a Date from those two strings.

**(4) `mode="date"` vs `mode="time"`**
- `mode="time"` is NEVER used. Both mounts use `mode={pickerField === null ? 'date' : 'datetime'}`
  (`:1696`, `:1708`). So: date-only fields → `'date'`; event date+time fields → `'datetime'`
  (combined), then split into separate date + time strings by formatDate/formatTime.

> Compatibility note for a migration: formatDate emits `YYYY-MM-DD` and formatTime emits `HH:MM`,
> which are EXACTLY what the 222/233 generators' regexes accept (see B/C) — the picker's output
> strings drop straight into the existing `reportDate`/`interactionDate`/`interactionTime`/
> `periodStartDate`/`periodEndDate` state with no generator change.

---

## B) Form 222 — the three date/time fields (`Form222Screen.tsx`)

All three are free-text `<TextInput keyboardType="numbers-and-punctuation">` — NO picker today.

- **Date of Report** | JSX `:364`–`:371` | value `form.reportDate` (state `reportDate`, init
  `todayISO()` `:62`) | placeholder `t('form222.datePlaceholder')`.
- **Date of Interaction** | JSX `:393`–`:400` | value `form.interactionDate` (state init `''` `:63`)
  | placeholder `t('form222.datePlaceholder')`.
- **Time of Interaction** | JSX `:405`–`:412` | value `form.interactionTime` (state init `''` `:64`)
  | placeholder `t('form222.timePlaceholder')`.

**(3) How the generator reads them** (`dfoForm222Generator.ts`)
- `reportDate` → `toDate8()` → `REP_DATE` (date_8 YYYYMMDD), emit `:148`.
- `interactionDate` + `interactionTime` → `toDate12(date,time)` → single `INTERACT_DT`, emit `:152`.

**(4) THE FORK — JOINED, not two elements.** The generator JOINS interaction date + time into ONE
date_12 element `INTERACT_DT`. There is NO `INTERACT_TM` element anywhere (grep: INTERACT_TM occurs
only in a comment). Proof:
- `toDate12` (`:109`–`:113`): `const d8 = toDate8(dateStr); if (!d8) return ''; const hhmm =
  /^\d{1,2}:\d{2}$/.test(timeStr) ? timeStr.replace(':','').padStart(4,'0') : '0000'; return d8 + hhmm;`
- emit (`:152`): `mm += tag('INTERACT_DT', toDate12(entry.interactionDate, entry.interactionTime), '    ');`
- Validator (Y-path only): `INTERACT_DT` is conditionally required when `INTERACT_IND==='Y'` (`:241`)
  and format-checked `must be date_12 YYYYMMDDHHMM` (`:245`–`:247`); REP_DATE checked as date_8 (`:231`).
  (When INTERACT_IND==='N', INTERACT_DT is neither emitted nor required.)

> Migration implication: the two interaction fields back ONE datetime value — a single
> `mode="datetime"` picker (writing both `interactionDate` via formatDate + `interactionTime` via
> formatTime, exactly like FullDfoForm's `mmTime` case) is the natural fit; Date of Report is
> date-only → `mode="date"`.

---

## C) Form 233 — the two date fields (`Form233Screen.tsx`)

Both are free-text `<TextInput keyboardType="numbers-and-punctuation">` — NO picker today.

- **Start Date** | JSX `:188`–`:196` | value `form.periodStartDate` (state init `''`).
- **End Date** | JSX `:201`–`:208` | value `form.periodEndDate` (state init `''`).

**Two independent date elements — confirmed** (`dfoForm233Generator.ts`)
- `toDate12FromCalendarDate(dateStr, hhmm)` (`:70`–`:73`) is called TWICE, independently:
  `startDt = toDate12FromCalendarDate(entry.periodStartDate, '0000')` (`:79`) and
  `endDt = toDate12FromCalendarDate(entry.periodEndDate, '2359')` (`:80`).
- Emitted as two separate elements: `tag('START_DT', startDt, …)` (`:92`) and
  `tag('END_DT', endDt, …)` (`:93`) inside `<REPORT_DTL>`.
- These are two DIFFERENT calendar dates (period start vs end) each given a synthetic fixed time
  (0000 / 2359) — NOT a date+time pair of one event. Each is date-only at the UI; both → date_12.
- Validator format-checks each as date_12 `/^\d{12}$/` (`:132`–`:133`) and cross-checks `END_DT <
  START_DT` (`:145`–`:146`). (Matches the S81 spinner/date recon doc.)

> Migration implication: both are date-only → two separate `mode="date"` pickers, each writing its
> own `periodStartDate` / `periodEndDate` string (YYYY-MM-DD); the generator already keeps them apart.

---

## Report metadata
- Path: `docs/RECON_form_pickers_S81.md`
- No files edited; no code written.
