/**
 * Android-only imperative date/time picker helpers (Session 95).
 *
 * WHY THIS EXISTS — the crash it fixes:
 * The declarative `<DateTimePicker mode="datetime">` CRASHES on Android. `datetime`
 * is not a valid Android mode (`ANDROID_MODE = { date, time }`); on open the native
 * module silently degrades to a date-only dialog, but on unmount the component's
 * cleanup effect calls `DateTimePickerAndroid.dismiss('datetime')`, which runs
 * `pickers['datetime'].dismiss()` where `pickers` only has `date`/`time` keys →
 * `undefined.dismiss()` → "Cannot read property 'dismiss' of undefined".
 * (@react-native-community/datetimepicker 8.4.4.)
 *
 * THE FIX — imperative two-step flow:
 * These helpers use the package's imperative `DateTimePickerAndroid.open()` API with
 * two valid single-mode dialogs (date, then time). No declarative component is
 * mounted, so the crashing unmount-cleanup never runs. The result is a single
 * combined `Date` — callers format it with the SAME formatDate/formatTime helpers
 * they use on iOS, so the stored `YYYY-MM-DD` + `HH:MM` strings are byte-identical
 * across platforms (the localToUtcIso / timestamp-regression contract is unchanged).
 *
 * iOS keeps its own `<Modal>` + `mode="datetime"` spinner; these helpers are only
 * ever invoked behind `Platform.OS === 'android'` guards.
 */
import {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

/**
 * Two-step Android date → time flow. `onPicked` fires ONLY when BOTH steps are
 * confirmed (`event.type === 'set'`). Cancelling either dialog aborts silently with
 * no write — matching the old dismiss-aware `handlePickerChange` behaviour.
 */
export function openAndroidDateTime(current: Date, onPicked: (d: Date) => void): void {
  DateTimePickerAndroid.open({
    value: current,
    mode: 'date',
    onChange: (dateEvent: DateTimePickerEvent, pickedDate?: Date) => {
      if (dateEvent.type !== 'set' || !pickedDate) return; // cancelled at the date step
      DateTimePickerAndroid.open({
        value: pickedDate,
        mode: 'time',
        onChange: (timeEvent: DateTimePickerEvent, pickedTime?: Date) => {
          if (timeEvent.type !== 'set' || !pickedTime) return; // cancelled at the time step
          onPicked(
            new Date(
              pickedDate.getFullYear(),
              pickedDate.getMonth(),
              pickedDate.getDate(),
              pickedTime.getHours(),
              pickedTime.getMinutes(),
              0,
              0,
            ),
          );
        },
      });
    },
  });
}

/**
 * Single Android date dialog (date-only fields, e.g. Date Fished / period dates).
 * `onPicked` fires ONLY on `event.type === 'set'`.
 */
export function openAndroidDate(current: Date, onPicked: (d: Date) => void): void {
  DateTimePickerAndroid.open({
    value: current,
    mode: 'date',
    onChange: (event: DateTimePickerEvent, picked?: Date) => {
      if (event.type !== 'set' || !picked) return;
      onPicked(picked);
    },
  });
}
