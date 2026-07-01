# RECON — write-through hook points for Phase 2 cloud backup (Session 85)

Recon only. No source changed. Goal: locate the exact save and successful-send
points for DFO logs and Forms 222/233, plus the consent gate and the existing
try/catch context at each, so a best-effort backup hook can sit after them.

- Repo: /Users/jonny/Desktop/LobsterLog (branch main)
- Date: 2026-06-29
- Read-only map. No changes proposed.

---

## 1. Save path — DFO logbook (@lobsterlog:dfo_logs)

Single choke point: every write to the dfo_logs blob goes through one function.

- saveLog(log) — src/utils/dfoLogStorage.ts:76
  - Writes AsyncStorage.setItem(STORAGE_KEY, …) at line 81.
  - Returns Promise<boolean> (true on write, false on caught error).
  - Has its OWN try/catch (lines 77–86); never throws.

saveDraft(log) — dfoLogStorage.ts:151 — just calls saveLog (line 152), so it is
NOT a separate write; it funnels through saveLog too.

Call sites that reach saveLog (all of them):
- FullDfoForm.tsx:1169 — handleSave, complete log (status 'complete')
- FullDfoForm.tsx:641 — imperative saveDraft() handle (status 'draft')
- FullDfoForm.tsx:661 — handleBack auto-save draft (status 'draft')
- DfoDemoScreen.tsx:23 — calls formRef.saveDraft() → FullDfoForm:641
- LobsterLogProposalForm.tsx:216 and :469 — legacy free-app form, SAME store

So saveLog() is the one choke point for the logbook store. Note it is shared:
the legacy proposal form also writes through it (see Notes).

---

## 2. Send path — DFO logbook (success point)

The logbook send is inline in doSubmit (it does NOT use submitDfoXml yet).

- doSubmit(log) — src/screens/DfoLogsListScreen.tsx:181
  - Wrapped in try (202) / catch (322) / finally (336).
  - Live POST at :254; HTTP parse at :282 (parseDfoSoapResponse).
  - SUCCESS branch begins at the `// Success` comment, line 298:
    - saveTransmissionRecord(record) — line 315  (outcome 'success')
    - saveXmlArchiveEntry(...)        — line 316
    - markSentToDfo(log.id)           — line 317
    - refresh()                       — line 320
  - The point where a send is KNOWN to have succeeded: after :282 returns
    result.success, i.e. lines 298–317. The transmission record lands at :315.

Failure writes go through a local helper saveFailureRecord (defined :187–200;
the saveTransmissionRecord at :199 is that helper, used at :271/:288/:325).

---

## 3. Forms 222 / 233 — persist + send

Both screens share the same shape: validate → submitDfoXml → on ok, persist entry.

Form 222 — src/screens/Form222Screen.tsx
- submitDfoXml({...kind:'form222'}) — line 271
- if (!result.ok) → return (line 281–288)
- SUCCESS: entry.sentToDfo=true / sentAt (291–292), then
  saveForm222Entry(entry) — line 293  (persists @form222_entries)
- Whole block in try / catch (:296) / finally (:298).

Form 233 — src/screens/Form233Screen.tsx
- submitDfoXml({...kind:'form233'}) — line 158
- if (!result.ok) → return (line 168–175)
- SUCCESS: entry.sentToDfo=true / sentAt (178–179), then
  saveForm233Entry(entry) — line 180  (persists @form233_entries)
- Whole block in try / catch (:183) / finally (:185).

Key fact: for the forms, the entry is persisted ONLY on a successful send (the
sole saveForm222Entry / saveForm233Entry call sites are :293 / :180). There is no
save-without-send for forms — so "save" and "successful send" are the same moment.

The shared send helper that both forms call:
- submitDfoXml(args) — src/utils/submitDfoXml.ts:104
  - Outer try (:140) / catch (:198).
  - SUCCESS at lines 180–197: saveTransmissionRecord(successRecord) :195,
    saveXmlArchiveEntry :196, returns { ok:true } :197.
  - Returns SubmitDfoXmlResult { ok, errCode?, confNumber?, … }; never throws
    (failures are caught and returned as ok:false).

Form-entry writers (no internal try/catch):
- saveForm222Entry — dfoForm222Generator.ts (await setItem, can throw)
- saveForm233Entry — dfoForm233Generator.ts (await setItem, can throw)
- Both are only ever called inside the screens' try/catch (above), so a throw is
  already contained at the call site.

---

## 4. Consent flag (@lobsterlog:dfo_backup_consent)

- loadBackupConsent() — src/utils/dfoBackup.ts
  - Reads AsyncStorage.getItem('@lobsterlog:dfo_backup_consent').
  - Returns true ONLY when the stored value === 'true'; default false (also false
    on error — own try/catch). Key constant BACKUP_CONSENT_KEY in dfoBackup.ts.
- saveBackupConsent(enabled) writes 'true' / 'false' (same module).
- Current importers (Phase 1 only):
  - src/screens/CaptainProfileScreen.tsx:25 (import) and :66 (load on mount).
- No other file imports dfoBackup yet — a write-through gate would be a new import
  in whichever save/send file(s) it lands in.

---

## 5. Existing error handling at each choke point (summary)

- saveLog (dfoLogStorage.ts:76) — own try/catch, returns boolean. Self-contained.
- doSubmit (DfoLogsListScreen.tsx:181) — try/catch/finally; success at 298–317.
- submitDfoXml (submitDfoXml.ts:104) — try/catch; success at 180–197; never throws.
- Form222Screen / Form233Screen submit — try/catch/finally; entry persisted at
  293 / 180 inside the try.
- saveForm222Entry / saveForm233Entry — no internal try/catch, but only called
  from inside the screens' try/catch.

Every identified save and successful-send point already sits inside (or is) a
try/catch. A best-effort call placed right after each persist would be inside an
existing guarded block at every site except saveLog (which guards internally and
returns a boolean rather than throwing).

---

## 6. Notes / observations (facts only, no change proposed)

- saveLog is SHARED: the legacy LobsterLogProposalForm (free-app advocacy form,
  :216/:469) writes through the same saveLog into @lobsterlog:dfo_logs. A hook
  placed inside saveLog fires for those saves too; hooks placed at the FullDfoForm
  call sites (641/661/1169) would not. (Stated for hook-placement planning only.)
- Two distinct send pipelines exist: the logbook has its OWN inline transport in
  doSubmit (DfoLogsListScreen), while Forms 222/233 go through submitDfoXml. They
  are not unified (logbook convergence onto submitDfoXml is a known, not-yet-done
  follow-up per CLAUDE.md). A send-side hook therefore has two landing zones:
  DfoLogsListScreen.tsx ~317 and submitDfoXml.ts ~197 (or the two form call sites).
- The logbook stores affected by a "successful send" are three: the transmission
  register (:315), the XML archive (:316), and the dfo_logs blob via markSentToDfo
  (:317, which flips sentToDfo). For forms it is the form-entry store plus the
  register/archive written inside submitDfoXml.

---

## 7. Unrelated, flagged not touched

- ios/Podfile.lock shows modified in the working tree (pre-existing, not mine).
- Untracked docs/* recon files remain uncommitted. Neither was altered.
