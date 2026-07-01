# RECON — Form 222/233 send-spinner + Form 233 end-date path (Session 81)

**Scope:** RECON ONLY. No code changed. Line numbers verified against the files on disk
2026-06-24. Files: `src/screens/DfoLogsListScreen.tsx`, `src/screens/Form222Screen.tsx`,
`src/screens/Form233Screen.tsx`, `src/utils/dfoForm233Generator.ts`.

---

## A) Logbook sending-state — the reference pattern to mirror (`DfoLogsListScreen.tsx`)

**(1) State variable driving "Sending…" + spinner**
- `sendingLogs` — a `Set<string>` of in-flight log ids. Declared `DfoLogsListScreen.tsx:148`
  (`const [sendingLogs, setSendingLogs] = useState<Set<string>>(new Set())`).
- Per-card derived flag: `const isSending = sendingLogs.has(log.id);` at `:425`.

**(2) Where set true / false**
- TRUE: `:182`, first line of `doSubmit` — `setSendingLogs(prev => { const n = new Set(prev); n.add(log.id); return n; })`.
- FALSE: `:337`, inside the `finally` block (`:336`) of doSubmit — `n.delete(log.id)`.
  Single `try/…/finally`; the catch/error branches (`:325`–`:335`) do NOT clear it themselves —
  the `finally` is the sole clear point, so it clears on success, handled failure, and throw alike.

**(3) JSX rendering the spinner + label** (`:465`–`:469`)
- `) : isSending ? (`
- `  <View style={styles.sendingButton}>`
- `    <ActivityIndicator size="small" color="#FFFFFF" />`
- `    <Text style={styles.sendButtonText}>{t('logs.sending')}</Text>`
- `  </View>`
- i18n key for the label = `logs.sending`.

**(4) How "disabled" is wired**
- There is NO `disabled={…}` prop. Disabling is achieved two ways:
  - The card renders a 4-way ternary: `sent` → sentButton · `isSending` → sendingButton ·
    `failError` → retryButton · else → sendButton. While sending, the touchable is REPLACED
    by a plain `<View style={styles.sendingButton}>` (no `onPress`) — not tappable.
  - Belt-and-braces guard in `handleSendToDfo` (`:341`–`:342`):
    `if (log.sentToDfo || sendingLogs.has(log.id)) return;` — re-taps during a send are no-ops.

> Mirror target for the forms: a per-screen `sending` boolean, set true at the top of the
> confirm-dialog `onPress`, cleared in a `finally`; swap the submit button to a spinner+label
> view while true, and early-return / disable on re-entry.

---

## B) Current form submit handlers — what we're fixing

### Form222Screen.tsx
- Handler `handleSubmit` at `:127`. Flow: Rule-528 VRN gate (`:130`) → if `interactInd==='Y'`
  missing-field gate (`:147`–`:150`) → confirm `Alert.alert` (`:153`) → "Submit" button
  `onPress: async` (`:161`) → build `Form222Entry` → `generateForm222Xml` (`:187`) →
  `validateForm222Xml` (`:188`) → guard (`:189`) → `generateDfoXmlFileName` (`:198`) →
  `submitDfoXml({…})` (`:199`–`:207`) → on `!result.ok` Alert+return (`:209`–`:217`) → else mark
  sent + `saveForm222Entry` (`:219`–`:221`) → success Alert (`:223`). Outer `try/catch` (`:162`/`:224`),
  **no `finally`**.
- **(1) Existing loading/sending state:** NONE. No `useState` sending flag, no `ActivityIndicator`
  import/use anywhere in the file. The await at `:199` has zero in-flight UI.
- **(2) Submit button JSX** (`:543`–`:545`): `<TouchableOpacity style={styles.submitButton}
  onPress={handleSubmit} activeOpacity={0.8}>` → `<Text>{t('form222.submitButton')}</Text>`.
  Current `disabled` wiring: NONE — always enabled, no guard against double-tap of the outer button.
- **(3) `if(!validation.valid) return` guard:** `:189`–`:196` (inside the confirm-dialog onPress).

### Form233Screen.tsx
- Handler `handleSubmit` at `:58`. Flow: Rule-528 VRN gate (`:61`) → missing-field gate
  start/end/reason (`:65`–`:68`) → confirm `Alert.alert` (`:70`) → "Submit" button `onPress: async`
  (`:78`) → build `Form233Entry` → `generateForm233Xml` (`:91`) → `validateForm233Xml` (`:92`) →
  guard (`:93`) → `generateDfoXmlFileName` (`:102`) → `submitDfoXml({…})` (`:103`–`:111`) → on
  `!result.ok` Alert+return (`:113`–`:121`) → else mark sent + `saveForm233Entry` (`:123`–`:125`) →
  success Alert (`:127`). Outer `try/catch` (`:79`/`:128`), **no `finally`**.
- **(1) Existing loading/sending state:** NONE. No sending flag, no `ActivityIndicator`.
- **(2) Submit button JSX** (`:252`–`:254`): `<TouchableOpacity style={styles.submitButton}
  onPress={handleSubmit} activeOpacity={0.8}>` → `<Text>{t('form233.submitButton')}</Text>`.
  Current `disabled` wiring: NONE.
- **(3) `if(!validation.valid) return` guard:** `:93`–`:100` (inside the confirm-dialog onPress).

> Both forms confirm the expectation: no loading state, always-enabled submit button, validation
> guard nested inside the confirm dialog's async onPress. The spinner work = add the mirrored
> `sending` boolean around that onPress body and swap the button JSX while true.

---

## C) The 233 END DATE path — end-to-end

**Where it's entered** (`Form233Screen.tsx:199`–`:209`)
- A free-text `<TextInput>` (NOT a datetimepicker), `keyboardType="numbers-and-punctuation"`,
  `placeholder={t('form233.datePlaceholder')}`.
- Bound to state `form.periodEndDate` via `onChangeText={set('periodEndDate')}`.
- State shape: `periodEndDate: string` initial `''` (default form object); typed comment says
  `// YYYY-MM-DD` (`dfoForm233Generator.ts:22`). No mask, no pre-population.

**How it serializes into the XML END_DT** (`dfoForm233Generator.ts`)
- `generateForm233Xml:80`: `const endDt = toDate12FromCalendarDate(entry.periodEndDate, '2359');`
- The formatter (`:70`–`:73`):
  - `if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';`  ← strict gate
  - `return dateStr.replace(/-/g, '') + hhmm;`              ← GLOBAL hyphen strip
- Emitted via `tag('END_DT', endDt, '      ')` at `:93`. `tag` (`:63`–`:66`) returns `''` for an
  empty/blank value → the `<END_DT>` element is then **absent** from the document.
- So the formatter's only two possible outputs are: (a) a 12-DIGIT all-numeric string
  `YYYYMMDD2359` (every hyphen removed), or (b) `''` (input failed the strict regex).

**Does `validateForm233Xml` check the date's FORMAT?** (`:111`–`:148`) — YES, at three levels:
- Presence: `END_DT` is in the mandatory-element list (`:124`); absent → "Missing required element: END_DT" (`:125`).
- Shape: `intFields` row `['END_DT', /^\d{12}$/, 'date_12 (YYYYMMDDHHMM)']` (`:133`); present-but-not-12-digits → error (`:135`–`:137`).
- Cross-field: `END_DT < START_DT` → "END_DT is before START_DT" (`:145`–`:146`).
- GAP (not the hyphen issue): `/^\d{12}$/` validates digit-COUNT only, not calendar validity —
  12 digits of nonsense (e.g. month 99) would pass the shape check.

**THE FORK — verdict: NEITHER serialization-produced NOR passed-through. The 233 path is guarded both ends.**

- Can the formatting code PRODUCE `"2026-0623"`? **NO.** `.replace(/-/g, '')` at `:72` is a GLOBAL
  strip — a hyphen can never survive into the output. Output is digits-only or empty. A
  serialization bug cannot emit a hyphenated END_DT.
- Can `"2026-0623"` be ENTERED and PASSED THROUGH? **NO.** Fed to `toDate12FromCalendarDate`,
  `"2026-0623"` fails `/^\d{4}-\d{2}-\d{2}$/` (one hyphen; `"0623"` is `\d{4}`, not `\d{2}-\d{2}`)
  → returns `''` (`:71`) → `tag()` drops END_DT → `validateForm233Xml` flags "Missing required
  element: END_DT" (`:125`) → `validation.valid === false` → `Form233Screen.tsx:93` Alert
  "Validation Failed" + `return` → no `submitDfoXml`, no send.

**Conclusion for C:** In the 233 generator, the literal `"2026-0623"` can appear in NEITHER the
XML output NOR a transmission. A malformed end date is converted to empty by the strict input
regex in the formatter and then blocked as a missing element by the validator. If a `"2026-0623"`
artifact was actually observed, it did NOT originate in this 233 path — the most likely real
source is **Form 222's separate date handling** (`reportDate` / `interactionDate` / `interactionTime`,
which use a different YYYYMMDD/HHMM scheme), which was out of scope here and not traced. Recommend
re-pointing the date-bug investigation at Form 222 before any 233 change.

---

## Report metadata
- Path: `docs/RECON_form_spinner_and_date_S81.md`
- No files edited; no code written.
