# GATE S116-P2 — 233 VRN GATE (Rule-528 scope conformance)

**Session date 2026-07-27 (submission plan Phase 2; same working session as GATE_S116_233_LOGBOOK_REF.md / commit fd5108f). NO-GIT (commit block below — Jonny runs). NO DFO POST. Untouched by rule and verified by diff: Form 222 (its VRN gate stays unconditional — VRN is CSV-MANDATORY there), `submitDfoXml.ts` / `isValidFormVrn` definition, the 234 path, everything else on the 233 screen.**

---

## §1 — THE CHANGE

Source basis (S116 recon + FS-NAT-233-2-EN): the 233 CSV marks `VRN` `REQUIRED?="N"` (optional), and Rule 528 is a **format** restriction under the §5.2.3 preamble "The following restrictions apply only if the node … is used." The old gate made a valid VRN a precondition of every 233 send — which is why every 233 the app could send carried a CSV-optional element (the S116 strictness-audit flag, fatal to S2/T2 under DFO's Jul-24 mandatory-only ruling).

**Before** (`Form233Screen.tsx`, printed pre-edit):

```ts
    // Rule 528 — VRN must be 4-6 digits on the Form 233 path (FS-NAT-233-2-EN.pdf).
    // Hard block before any envelope/submit: no send, no mark-sent, no archive.
    if (!isValidFormVrn(profile.vesselNumber.trim())) {
      Alert.alert(t('sendGate.vrnRule528Title'), t('sendGate.vrnRule528'));
      return;
    }
```

**After:**

```ts
    // Rule 528 — a format restriction that applies only when the VRN element is used
    // (FS-NAT-233-2-EN.pdf §5.2.3 note; VRN is CSV-optional on the 233). Conformant gate:
    // present → must be 4-6 digits; BLANK → allowed, the generator omits <VRN> entirely
    // (tag() drops empty). Hard block on malformed only: no send, no mark-sent, no archive.
    // (Form 222 keeps its unconditional gate — VRN is MANDATORY there, CSV REQUIRED?=Y.)
    const vrn = profile.vesselNumber.trim();
    if (vrn && !isValidFormVrn(vrn)) {
      Alert.alert(t('sendGate.vrnRule528Title'), t('sendGate.vrnRule528'));
      return;
    }
```

No generator change was needed — `tag('VRN', profile.vesselNumber, …)` already omits the element when blank (`dfoForm233Generator.ts`, GENERAL_INFO block). No i18n change — the alert wording ("The VRN must be 4 to 6 digits for this form") only ever fires on a present-but-malformed value now, which is exactly what it describes. Phase-0 recon A cleared the precondition: DfoSetupScreen never writes `vesselNumber` and the CaptainProfileScreen save-gate validates VRN only when non-empty (`CaptainProfileScreen.tsx:117`) — a blank-VRN profile is reachable through the normal profile screen, so no second change.

**New test** `src/utils/__tests__/form233VrnGate.oneoff.test.ts` (2 tests): blank/whitespace `vesselNumber` → the XML contains **zero occurrences of "VRN"** and validates; populated → `<VRN>104460</VRN>` emits and validates. (The malformed-block path is `isValidFormVrn`, already covered by `formVrnAndCoordClamp.oneoff.test.ts`, + the device walk below.)

## §2 — VERIFY GATE RESULTS

| # | Gate (from the plan) | Result |
|---|---|---|
| 1 | tsc baseline | **33 errors, 0 new** |
| 2 | jest | **26 suites / 111 tests, all green** (25/109 → +1 suite, +2 tests) |
| 3 | Blank-VRN 233 → XML with no VRN element (bytes) | **PASS (generator bytes)** — `sample_233_vrn_blank.xml`: grep "VRN" = **0 occurrences**; GENERAL_INFO reads `CIE_ID → SOFT_VER → REG_ID → FIN → FORM_VER_ID` (FIN still present — Rule-961-mandatory); **xmllint VALIDATES** vs the on-disk 233 XSD. Live-send byte proof = S2 in the sweep (grep the archive after the send Jonny fires) |
| 4 | Malformed VRN still blocked | Gate logic: `vrn && !isValidFormVrn(vrn)` → alert + return; `isValidFormVrn` rejects 3-digit/7-digit/non-digit (existing suite). **On-device confirm PENDING-JONNY** (walk below) |
| 5 | Normal VRN still emits | **PASS** — `sample_233_vrn_present.xml` carries `<VRN>104460</VRN>`, xmllint VALIDATES |
| 6 | No figure impact | VRN is not displayed anywhere on Form233Screen (the Licence Details card shows operator/licence/FIN only) — **confirm visually on the walk rather than assuming** |
| 7 | Scope | `git status` tracked modifications = `Form233Screen.tsx` + `CLAUDE.md` (ride-along) only; `git diff --stat` on `Form222Screen.tsx` + `submitDfoXml.ts` = **empty** |

### Walk script (Jonny drives; NO send)

1. Captain Profile → clear the VRN field → Save (saves fine — the save-gate only validates non-empty).
2. Form 233 → fill dates + reason → **Submit**: expect the **confirm dialog** (not the Rule-528 alert). **Cancel** — do not send.
3. Captain Profile → VRN `104` (3 digits) → Save is blocked? No — profile save allows any 1-12 alphanum; set `10a4x` if you want the profile to accept it, or just use `104`: profile save blocks nothing under 13 chars alphanumeric. Back on Form 233 → Submit: expect the **Rule-528 alert**, no confirm dialog.
4. Restore VRN `104460` → Save. Form 233 screen looks pixel-identical throughout (no VRN shown) → no figure impact confirmed.

## §3 — FLAGGED, NOT ACTED ON

- **S2 sweep-day discipline:** the blank-VRN T2 send requires blanking the profile VRN first and **restoring it after** — a blank VRN also (correctly) blocks Form 222 sends (validator requires VRN there) and the 234 path (isProfileComplete). Sequence S2 accordingly; the sweep plan's S2 row may want this noted at run time.
- The 233 T2 mandatory-only file is now producible: FIN (Rule-961-mandatory) stays, VRN omitted, both REMs and LOGBOOK_UID_REFERED left blank → the emitted set is exactly the CSV-mandatory + rule-mandatory elements.
- Stale sandbox archive record (`FORM222-OYTWTM`, Jul 21) still in place — unchanged from Phase 0/1 flags.

---

## COMMIT BLOCK — Jonny runs, one line at a time (NOT run by Claude)

Ladder diffed against `git status --short` (2 modified tracked + 1 new test; all other untracked stay untracked):

```bash
cd ~/Desktop/LobsterLog
git add src/screens/Form233Screen.tsx
git add src/utils/__tests__/form233VrnGate.oneoff.test.ts
git add CLAUDE.md
git commit -m "Allow blank VRN on the Form 233 send gate"
git push
```

Verify after:

```bash
git show -s
git show --stat --format= HEAD        # expect 3 files: Form233Screen.tsx, form233VrnGate.oneoff.test.ts, CLAUDE.md
git status --short                    # only ?? untracked passengers remain
git log origin/main..HEAD --oneline   # empty = pushed
```
