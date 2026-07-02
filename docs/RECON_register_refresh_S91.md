# RECON — 222/233 register refresh (S91 Phase 1)

**Read-only recon. No edits.** Confirms the diagnosis: a LIST-STATE staleness in `DfoLogsListScreen`, not persistence. Persistence (`submitDfoXml` → `saveTransmissionRecord`) is untouched and confirmed working.

## The register list is driven entirely by one `register` state var, refreshed only by `refresh()`

`DfoLogsListScreen.tsx`:
- `register` state (`:138`) is the single source for the Sent-to-DFO form rows.
- `refresh()` (`:154–164`) is the ONLY writer of it: `loadTransmissionRegister()` (`:159`) → `setRegister(register)` (`:160`) → also rebuilds `successRecords`/`failureRecords`.
- Form rows are derived from that state: `formRecords = register.filter(r => transmissionKind(r) !== 'logbook')` (`:513`) → interleaved into the SENT/FAILED sections.

So a form row can only appear after `refresh()` runs.

## `refresh()` is called from exactly three places — none of them is "a form was sent"

| Site | Line | Trigger |
|------|------|---------|
| mount / `refreshKey` change | `:167` (useEffect `:166–168`) | screen mounts, or parent bumps `refreshKey` |
| `doSubmit` success tail | `:322` (right after `markSentToDfo` `:318`) | **logbook** send succeeds |
| `handleDeleteDraft` | `:367` | draft deleted |

## Why normal elogs "move automatically" but sent forms don't

- **Logbook send runs INSIDE this screen.** `doSubmit` persists the record (`:316`), marks sent (`:318`), then calls `refresh()` (`:322`) — the register + completed lists reload in place, so the row moves without leaving the screen.
- **Form 222/233 send runs INSIDE the child modal**, and the modal's `onClose` never refreshes:
  - `<Form222Screen onClose={() => setForm222Visible(false)} />` (`:722`)
  - `<Form233Screen onClose={() => setForm233Visible(false)} />` (`:731`)
  - Both handlers only flip the visibility flag. The child writes the `TransmissionRecord` via `submitDfoXml` (storage is correct), but the parent's `register` state is never reloaded, so `formRecords` (`:513`) stays stale and the new row is absent.
- **Backing out + re-entering** remounts the screen → useEffect `:167` fires `refresh()` → register reloads → the row finally appears. That is the "workaround" being observed.

## The timing is already perfect for a refresh-on-close

Both form screens invoke `onClose` precisely on the **successful-send** confirmation:
- Form222Screen `:312` — `Alert.alert('Submitted', …, [{ text: 'OK', onPress: onClose }])`
- Form233Screen `:184` — `Alert.alert('Submitted', …, [{ text: 'OK', onPress: onClose }])`

So a `refresh()` wired into the parent's `onClose` handlers runs exactly when the new record already exists on disk. (It also runs on a plain back-out with no send — harmless: `refresh()` is the same cheap AsyncStorage read that already runs on every mount.)

## Proposed fix (one paragraph — see terminal)

Mirror the `doSubmit` pattern for the two form modals: change the `onClose` handlers at `:722` and `:731` from `() => setForm222Visible(false)` / `() => setForm233Visible(false)` to also call `refresh()` after flipping the flag, e.g. `() => { setForm222Visible(false); refresh(); }`. Two lines, contained entirely within `DfoLogsListScreen`. Touches NO transmission path — `submitDfoXml.ts`, `doSubmit`, the form screens, and persistence are all left byte-untouched; this only re-reads storage into list state, which is exactly the diagnosed list-state gap.
