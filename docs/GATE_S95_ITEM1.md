# GATE — Session 95, Item 1: Android datetime picker crash fix

**Status:** code complete, automated gates green, **awaiting Pixel device verification** before the
git block below is run. Committable alone (no dependency on Items 2–4).

## What changed
Root cause (proven in `@react-native-community/datetimepicker@8.4.4`): the declarative
`<DateTimePicker mode="datetime">` is invalid on Android — `datetime` is not an Android mode, so the
unmount-cleanup effect calls `DateTimePickerAndroid.dismiss('datetime')` → `pickers['datetime']` is
`undefined` → `Cannot read property 'dismiss' of undefined` on OK. Full trace in
`docs/RECON_S95_ANDROID.md` §Item 1.

Fix — platform-split, Android runs an imperative two-step date→time flow; iOS unchanged:
- **NEW `src/utils/androidDateTimePicker.ts`** — `openAndroidDateTime(current, onPicked)` (date dialog
  → time dialog → one combined `Date`, fires only when both steps are confirmed; cancel = no write)
  and `openAndroidDate(current, onPicked)` (single date dialog). Uses the package's imperative
  `DateTimePickerAndroid.open()` API, so no declarative component mounts and the crashing cleanup
  never runs.
- **`src/components/FullDfoForm.tsx`** (Form 234) — `openPicker` and the Date-Fished onPress branch on
  `Platform.OS === 'android'` to the helpers; `applyPickerValue` refactored to
  `applyPickerValueForField(field, d)` (field passed explicitly → no stale-closure in the async
  Android callback) with a thin iOS wrapper; removed the Android inline `<DateTimePicker>` mount and
  the now-dead `handlePickerChange`. iOS Modal spinner (`mode="datetime"`) untouched.
- **`src/screens/Form222Screen.tsx`** (Marine Mammal / Form 222) — same treatment: `interaction`
  (date+time) → `openAndroidDateTime`, `report` (date-only) → `openAndroidDate`; same
  `applyPickerValueForField` refactor + inline-mount / `handlePickerChange` removal.

**Output format is unchanged and identical on both platforms:** every path still ends at
`applyPickerValueForField` → `formatDate` (`YYYY-MM-DD`) + `formatTime` (`HH:MM`), the exact strings
`localToUtcIso` and the timestamp-regression suite consume. No generator change.

**Left as-is:** `LobsterLogProposalForm.tsx:872` has the same crash but is the legacy free-app form —
deferred to the November free-app relaunch pile (per decision; noted in the recon doc).

## Automated gates
- `npx tsc --noEmit` → **33 errors (baseline), 0 new**, none in the touched files.
- `npx jest` → **18 suites / 64 tests pass**, including `blankTimestampGate.oneoff.test.ts` and
  `launderSweep.oneoff.test.ts` (timestamp regression).

> No jest test renders the native picker (jest can't), so the crash fix + format-invariance are
> **device-verified**; the regression suite protects the downstream `localToUtcIso` contract.

## Pixel device checklist (run before committing)
Release build on the Pixel 8. Every step must show NO crash.

**Form 234 (FullDfoForm) — the confirmed repro:**
1. Create a new ELOG → open the form.
2. Tap **Time Sailed** → a **date** dialog appears → pick a day → a **time** dialog appears → pick a
   time → **no crash**; the field shows date **and** time (e.g. `Jul 6, 05:30`).
3. Repeat for **Started Hauling**, **Stopped Hauling**, **Landing** — each is a two-step date→time, no
   crash, both parts stored.
4. Answer Marine Mammal = Yes → tap its **time** field → two-step, no crash. Same for **SAR** time.
5. Tap **Date Fished** (date-only) → single date dialog → no crash; date updates.
6. **Cancel** behaviour: reopen Time Sailed, cancel the date dialog → value unchanged; reopen, pass
   the date step then cancel the time dialog → value unchanged (no partial write).
7. Save the log (do NOT send) → completes; reopen → the timestamps read back correctly.

**Form 222 (Marine Mammal):**
8. Open Form 222 → tap **Date of Report** (date-only) → single dialog, no crash.
9. Tap **Date/Time of Interaction** → two-step date→time, no crash; both interaction date and time
   stored and shown.

**iOS regression (any iOS device/sim):**
10. On iOS the Modal spinner still opens for both date-only and date+time fields; **Done** writes the
    value exactly as before (no behaviour change on iOS).

## Literal git block — run after the checklist passes (Jonny runs; Claude does not)
```
git add src/utils/androidDateTimePicker.ts src/components/FullDfoForm.tsx src/screens/Form222Screen.tsx docs/RECON_S95_ANDROID.md docs/GATE_S95_ITEM1.md
git commit -m "Fix Android datetime picker crash with imperative date-to-time flow (S95 item 1)"
git push origin main
```
(Recon + gate docs are bundled here; if you'd rather hold the recon for a separate housekeeping
commit, drop `docs/RECON_S95_ANDROID.md` from the `git add` line.)
