# GATE — Session 105 · dfoelog demo account setup

**Date:** 2026-07-18 · **Type:** account setup + verification (NO code edits, NO-GIT state-changing, NO-DFO-POST)
**Scope:** stand up the `dfoelog@lobsterlog.com` demo account — signup → `role:'dfo'` → demo vessel profile → free DFO activation — so the §22 / TRG in-app capture (S103 shot list) is unblocked. Nothing transmits to DFO this session.

---

## PHASE 0 — RECON (read-only) — for GATE 0 sign-off

### 0.1 Role field schema — QUOTED from `docs/GATE_S99_REMAINDER.md §5.1`

> Stored in **Firestore `users/{uid}/settings/profile`** as a plain **string field `role`** —
> there is NO stored isAdmin boolean anywhere. Read path: `useProfile.ts:47 role: data.role || 'user'`
> … **No code path writes `role`** — it is assigned manually in the Firebase console … Therefore
> adding a `'dfo'` role = set `role: 'dfo'` in the console; **string-compare in code; migration-free
> by construction** (absent → `'user'`).

**Net for setup:** Firebase console → project **lobster-log** → **(default)** database → document
**`users/{uid}/settings/profile`** → string field **`role`** = **`dfo`** (lowercase, exact). Consumers
lowercase-compare (`App.tsx:236`), so casing is tolerated, but store it lowercase to match every other role.

### 0.2 Approved seed spec — QUOTED from `docs/GATE_S103_SHOTLIST.md §2.3 / §2.6`

> **Identity (reserved MAR-90 test triplet):** VRN `1004460` · Fishing Licence No `1004460` ·
> Licence Holder's FIN `100400460` · ELOG Key from `.env`. Demo profile display name "LobsterLog Demo" /
> vessel "Demo Vessel" (rename … cosmetic only).
> **Region / subform:** **Maritimes (MAR, region id 90).**
> **LFA + Settlement Grid:** **LFA 34.** Grid = whatever the app's grid picker offers for LFA 34 …
> **Traps hauled:** 200. **Set/Haul coords:** 43.83 N, 66.12 W. **Targeted species:** Lobster.
> **Catch weight:** 250 lbs. **Bait:** Mackerel · Frozen · 40 lbs. **Weather: OUT OF SCOPE.**

§2.6 ruling 2: *"Seed-trip spec APPROVED … MAR (region 90) · reserved MAR-90 triplet · LFA 34 + any grid the picker offers …"*

> ✅ **FLAG A — RESOLVED (Jonny ruling, 2026-07-18), corrected against `Test_values_LobsterLog.pdf` p.1
> read directly:** each row is a valid FIN-VRN-LIC combination and **VRN = LIC on every row**. The demo
> profile takes the **6-digit MAR row WHOLE: FIN `100400460` · VRN `104460` · Fishing Licence `104460`.**
> **NOT** licence `1004460` — that belongs to a different row. Supersedes the §2.3 "VRN 1004460 / Licence
> 1004460" pairing (dated correction appended to `GATE_S103_SHOTLIST.md §2.3`). Rule-528-safe (6-digit VRN
> passes the 222/233 gate); matches the S93 live send (WS0000 CONF 163081).
>
> ⚠ **(historical) VRN DISCREPANCY — FLAG A as originally raised.** The **task prompt** for this session
> lists **VRN `104460`** (6-digit); the **approved §2.3 spec** lists **VRN `1004460`** (7-digit). This is
> not cosmetic. The demo profile carries ONE `vesselNumber`, and Group C of the capture plan requires
> **Form 222 (222-T7/T8) and Form 233 (233-T3/T4)** sends. Those form paths have a HARD **Rule 528** gate
> — `isValidFormVrn = /^\d{4,6}$/` (submitDfoXml.ts) — that **blocks any VRN with more than 6 digits**.
> So **VRN `1004460` (7 digits) would make the 222/233 demo sends impossible** from this profile; **VRN
> `104460` (6 digits) passes both the form gate and the permissive logbook `isValidVrn`.** History
> corroborates: the S93 **live** MAR-90 recovery send used **VRN/LIC 104460** → WS0000 CONF 163081.
> **Recommendation: use VRN `104460`** (the task-prompt value; Rule-528-safe). Confirm at Gate 0.

> **Licence variance — FLAG A′ (minor).** Task + §2.3 both say Fishing Licence `1004460` (7-digit; no
> Rule-528 gate on licence, feeds LIC_NO in the 234 XML). S93's live send happened to use LIC `104460`.
> Proposing **licence `1004460`** per both docs; note only.

> **Gear count/type not pinned — FLAG B.** §2.3 gives "Traps hauled: **200**" (a *trip* field), but does
> **not** specify the *profile* `totalGearCount` / `gearType`. `totalGearCount` IS in the send-time
> completeness gate (`REQUIRED_PROFILE_FIELDS`), so it must be non-empty. **Proposing `totalGearCount`
> = 200, `gearType` = "Traps".** Confirm at Gate 0.

> **"Demo Vessel" has no home — note.** `CaptainProfile` has NO vessel-*name* field (only `vesselNumber`
> = the VRN). So the cosmetic "Demo Vessel" maps nowhere; only `operatorName` = **"LobsterLog Demo"**
> applies.

### 0.3 `canActivateDfoFree` coverage + what a `'dfo'` role sees — CONFIRMED from code

| Memo (App.tsx) | Rule | `'dfo'` role result |
|---|---|---|
| `canActivateDfoFree` (`:235–237`) | `role==='admin' \|\| role==='dfo'` | **TRUE** → DFO ELOG pill renders (`:594`), free activation |
| `isPro` (`:222–223`) | `admin \|\| tester \|\| subscription==='pro'` | **FALSE** |
| `isAdmin` (`:228–230`) | `role==='admin'` | **FALSE** |

**Free activation:** `DfoSetupScreen.tsx:66` wraps ONLY the RevenueCat calls in `if (!canActivateDfoFree)`
and falls through to the SAME `saveCaptainProfile({…, dfoActivated:true}) + onActivated()` a paid
activation runs (S99 96a5b72). RevenueCat is skipped; nothing is purchased or transmitted.

**ZERO dev chrome for a `'dfo'` role (isAdmin=false):**
- DEV "⚙ Back to Setup" float — `App.tsx:1293` gated `isAdmin && …` → **hidden**.
- XML Test Harness pill — `DfoLogsListScreen.tsx:575` gated `__DEV__ && isAdmin` → **hidden** (S101b F1).
- No admin-only surfaces reachable; the DFO ELOG pill is the only DFO entry point (S99 §5.6 side-door sweep).

**Exact expectations for the walk (dfo role, activated):** DFO ELOG pill **visible**; Setup screen with
region picker + Licence + FIN + ELOG-Key; Activate works with **no purchase**; after activation routes to
**dfo-list**; `dfoActivated:true` persists; **no** DEV float, **no** harness pill, anywhere.

### 0.4 STEP LIST (for Gate 0 approval — I verify each as you drive it in Phase 1)

**A. Sign out of admin (fresh state)** — Settings → Account → Sign Out. Sign-out clears the ambient uid to
`::__anon__` (fail-closed); it does NOT mutate any cloud data.

**B. In-app signup** — Login screen → **Create Account** → email `dfoelog@lobsterlog.com` + password
(*you handle the password; I never see or record it*) → submit. `sendEmailVerification` fires with
`languageCode` set; the verification email lands at **lobsterlog.app@gmail.com** (forwarded) — you click
the link. A new Firebase auth **uid** is created; note it (needed for the console step + storage read).
*(On first sign-in `migrateBareKeysToUid` runs empty-slot-only; a fresh account adopts nothing.)*

**C. Console — set the role** — Firebase console → project **lobster-log** → **(default)** database →
create/open doc **`users/{uid}/settings/profile`** → set string field **`role` = `dfo`** (exact, lowercase).

**D. Relaunch → verify render** — app re-reads `role` via onSnapshot; confirm the **DFO ELOG pill**
appears and **no dev chrome** shows.

**E. Captain Profile** (in-app, per seed spec — pending Gate-0 rulings on VRN / gear):

| Field | Value |
|---|---|
| `operatorName` | LobsterLog Demo  ✅ confirmed |
| `licenceHolderFin` (FIN) | 100400460 |
| `fishingNumber` (Fishing Licence No) | **104460**  ✅ FLAG A (6-digit MAR row, VRN=LIC) |
| `vesselNumber` (VRN) | **104460**  ✅ FLAG A |
| `fishingArea` (LFA) | 34 |
| `elogKey` | `EXPO_PUBLIC_DFO_TEST_ELOG_KEY` from `.env` (*you enter*) |
| `totalGearCount` | 200  ✅ FLAG B |
| `gearType` | Traps  ✅ FLAG B — `gearType` is **display-only** (no generator/validator/filename/send join; 234 uses hardcoded `GEAR_ID=925`), so per ruling use `Traps` |
| region / subform | Maritimes → subformId 90 / regId 1004 (default) |

Save.

**F. Activate DFO ELOG (free path)** — DFO ELOG pill → DfoSetupScreen → region **Maritimes**, Licence
`104460`, FIN `100400460` → **Activate**. `canActivateDfoFree` skips RevenueCat → `dfoActivated:true`
written → routes to **dfo-list**. *(No DFO POST — activation is local only.)*

**Storage read I'll do (read-only, my side):** `@lobsterlog:captain_profile::<uid>` (base
`@lobsterlog:captain_profile`, `dfoKey` suffix `::<uid>`) — confirm the saved profile matches the spec
byte-for-byte and `dfoActivated:true`.

---

## PHASE 1 — Jonny drives, Claude verifies  *(in progress)*

| Step | Action | Verification | Status |
|---|---|---|---|
| 1 | Sign out of admin | local clear (`::__anon__`), no cloud mutation | ✅ done (Jonny) |
| 2 | In-app signup `dfoelog@lobsterlog.com` | new uid **`AHfUKxuIPsOjrGaK0yujk1TpyFP2`** created 2026-07-18 **23:45Z**; confirmed on Auth tab; **distinct** from `G6lxWh…` throwaway | ✅ done (Jonny) |
| 3 | Console → set `role:'dfo'` on `(default)` `users/{uid}/settings/profile` | doc `updateTime` **23:53Z** | ✅ done (Jonny) |
| 4 | **Firestore read (Claude, direct)** | `users/AHfUKxuIPsOjrGaK0yujk1TpyFP2/settings/profile` → **`role = "dfo"` EXACT** (Firestore REST, authed CLI token). Fields also present: `boatName="New Boat"`, `captainName="John Doe"` (**stock signup defaults** — identical wording to the throwaway's own doc but a **different uid**; Jonny renames in-app before capture per the identity ruling → `operatorName "LobsterLog Demo"`), `lat/lng` null, `seasons {}` | ✅ **PASS** |
| 5 | App relaunch → render check | **PASS** — screenshot: red **DFO ELOG pill visible** (✕ glyph, in dfo-list) ⇒ `canActivateDfoFree` read `role:'dfo'`; **zero dev chrome** (no "⚙ DEV: Back to Setup" float, no XML Test Harness pill) — both `isAdmin`-gated, correctly absent for a `dfo` role in a dev build; free-app header renamed "Demo Vessel / Capt. LobsterLog Demo" | ✅ **PASS** |
| — | (storage check, Claude) | `captain_profile::AHfUKx…` shows **`dfoActivated:true`** already — the free activation path succeeded (no purchase; `canActivateDfoFree`). subformId 90 / regId 1004 (MAR). Activation (Step 8) effectively landed ahead of the profile fill. | ✅ activation confirmed |
| 6 | Captain Profile fill | FIN/Licence swap **caught + corrected** (was `FIN=104460`/`LIC=100400460` → fixed to `FIN=100400460`/`LIC=104460`; VRN `104460`). Rest set: Operator "LobsterLog Demo", LFA 34, Gear 200/Traps, ELOG Key (24 ch), Cloud Backup **OFF** (Option b), EN. Saved. | ✅ **PASS** |
| 7 | Storage read (Claude) | `@lobsterlog:captain_profile::AHfUKx…` matches spec **byte-for-byte**: operatorName/licenceHolderFin `100400460`/vesselNumber `104460`/fishingNumber `104460`/fishingArea "LFA 34"/totalGearCount "200"/gearType "Traps"/subformId 90/regId 1004/dfoActivated **true**/elogKey set. **Residual (harmless):** legacy `dfoLicenceNo`/`dfoFin` still swapped (`100400460`/`104460`) — read only by the `__DEV__ && isAdmin` harness (hidden for `dfo` role); no production/capture/send path reads them. | ✅ **PASS** |
| 8 | Activate DFO ELOG (free path) | **PASS** — `dfoActivated:true` in storage, no purchase (`canActivateDfoFree`), routed to dfo-list. (Landed during the setup-screen flow ahead of Step 6.) | ✅ **PASS** |
| 9 | Force-quit + relaunch persistence | **PASS (re-confirmed post-rebuild 2026-07-19)** — force-quit + reopen lands directly on the **activated DFO ELOGs list** (not the setup screen), profile intact on-screen, **zero dev chrome** (no DEV float, no harness pill). Storage re-read confirms `dfoActivated:true` + full byte-correct profile (FIN `100400460`/VRN `104460`/LIC `104460`/elogKey 24ch) survived the force-quit. Force-quit (unlike the app-delete) does not wipe AsyncStorage. | ✅ **PASS** |

**First-launch gates — VERIFY-FIRST (code-confirmed, read-only):**
- **Privacy consent** `@lobsterlog:privacy_accepted` — **DEVICE-GLOBAL**. `captainStorage.ts:83–97` uses the key **raw** (not `dfoKey()`-namespaced, unlike captain_profile at :44/:53). One flag per device.
- **Language picker** `language_picker_shown` — **DEVICE-GLOBAL**. `LanguagePickerScreen.tsx:16` + `App.tsx:284`, plain key, no uid.
- **Harvester Attestation** — **session-only**, `DfoLogsListScreen.tsx:33` module-level `attestationShownThisSession` (no persistence); resets on app restart → **fires every DFO session** (re-fired on Jonny's relaunch ✓).

→ Both first-launch gates are device-global, so the admin/prior session already consumed them on this sim and the new demo account skips both (Language + Privacy). Expected; not a setup fault.

**⚠️ CAPTURE-PREP FLAG (carry to capture session):** **F02 (Privacy notice)** — and the first-launch **Language picker** — **will NOT render for the demo account** unless `@lobsterlog:privacy_accepted` (and `language_picker_shown`) are **cleared on the capture device** first (each re-shows once, then re-sets). F03 Attestation captures every time.

**🅰️ Aug/Sept pile — FLAG-NOT-ACT (consent model):** first-launch/privacy consent is **device-global, not per-uid** — two accounts on one device share one consent state. Add **"per-uid consent flag"** to the Aug/Sept consent-model backlog (read-only finding this session; no code change).

**✅ PHASE 1 verification PASSED (pre-wipe)** — demo account `dfoelog@lobsterlog.com` (uid `AHfUKxuIPsOjrGaK0yujk1TpyFP2`) signed up, `role:'dfo'`, profile byte-correct (MAR-90, 6-digit triplet), free-activated, persistent across force-quit. Zero dev chrome throughout. Full flow proven end-to-end and documented above.

**⚠️ INCIDENT — app-delete wiped local AsyncStorage (dev-env, not a fault).** To get the app to launch, the app was deleted off the sim + Metro re-run → **new container, all AsyncStorage wiped** (profile, activation, consent flags, all accounts' local DFO data). This **LIVE-VALIDATED Option (b):** Cloud Backup was OFF ⇒ nothing in the dfo-elog cloud to restore ⇒ the "new device" came up blank and self-serves — exactly the reviewer-device model. **Durable layer survived:** Firebase Auth + Firestore `role:'dfo'` (cloud) → pill still works. Also confirmed: the **Language picker + Privacy Notice both render on a clean install** (validates the F02/Language capture-prep flag — a fresh install shows them; no manual flag-clear needed if capturing on a clean install).

**Post-wipe rebuild (current sim state):** re-onboarded (language/privacy accepted); **re-activated with FIN/Licence correct this time** (`licenceHolderFin=100400460`, `fishingNumber=104460`, `dfoActivated=true`); Captain Profile re-entered + saved.

**✅ REBUILD RE-VERIFIED BYTE-CORRECT (2026-07-19):** `captain_profile::AHfUKx…` = operatorName `LobsterLog Demo` · licenceHolderFin `100400460` · vesselNumber `104460` · fishingNumber `104460` · fishingArea `LFA 34` · totalGearCount `200` · gearType `Traps` · subformId 90 · regId 1004 · dfoActivated `true` · elogKey (24 ch) · EN/lbs. FIN/Licence unswapped.

**✅ PHASE 1 COMPLETE** — demo account `dfoelog@lobsterlog.com` (uid `AHfUKxuIPsOjrGaK0yujk1TpyFP2`) is stood up: signup + `role:'dfo'` (durable, cloud) + byte-correct MAR-90 profile + free activation + persistence, all verified; the mid-session wipe was rebuilt and re-verified, and incidentally live-proved the Option (b) reviewer-device model. Zero dev chrome throughout.

**Note:** `boatName`/`captainName` are the **free-app** Firestore profile display fields (`users/{uid}/settings/profile`); the **DFO** identity (`operatorName`, FIN, VRN, licence, elogKey) lives separately in AsyncStorage `@lobsterlog:captain_profile::<uid>` (written at Step 6). Renaming the free-app display names and setting the DFO `operatorName` are two different surfaces — both land before capture.

## PHASE 2 — DECISIONS RECORDED

1. **`New Boat` throwaway (uid `G6lxWhv9DQQmeNXZYJ6PQMO0vZM2`, role `'dfo'`) — DELETED (Jonny, 2026-07-19).** Removed off Firebase. Verified: Firestore `users/G6lxWh…/settings/profile` returns **NOT_FOUND** (no orphaned `role:'dfo'` doc left behind), and its local AsyncStorage was already wiped by the app-delete. Fully gone — no second DFO identity remains on the sim or in the project. The demo account `dfoelog@…` (uid `AHfUKx…`) is now the sole `dfo`-role account.
2. **Demo-account credentials handling — POLICY RECORDED.** The demo-account credentials (email + password + the reserved MAR-90 triplet + ELOG key) are handed to DFO **out-of-band at submission time**, and are **never** written to a repo, doc, gate file, or commit. (Access is discretionary per Standard v7; this gate doc deliberately records only the non-secret identity values — FIN/VRN/Licence, which are DFO's own reserved test triplet — and never the password or the ELOG key value.)

## Phase 0b region ruling + cross-session note

- **RULING — Phase 0b, dated 2026-07-18: Option (b).** The demo account activates **MAR-90 on the capture sim only**; **backup consent stays OFF (default)** so reviewer devices start blank and self-serve setup in any region. **TRG XML remains the guaranteed four-region evidence.** Credentials hand-off at submission includes the **triplet + ELOG key out-of-band**, pointing reviewers at the **§22 setup section**. **Option (c) rejected** (code change + silent re-region risk; revisit Aug/Sept only if DFO asks). → Confirms this session proceeds MAR-90 exactly as specced; no region branch.
- **PAUSE LIFTED (2026-07-18):** full **Steps 1–9 are GO**, each on Jonny's per-step report.
- **Recon-doc landing — FLAG:** `docs/RECON_S105_DEMO_SCOPE.md` **does not exist** at ruling time and is owned by the parallel Phase 0b session, so this session did **not** create/write it. The dated Option (b) ruling is recorded **here** (this session's record); the recon-doc copy is the parallel session's to land (or reassign — Jonny's call).
- **Step 4 verification = BOTH** render-proof (DFO ELOG pill ⇒ `role:'dfo'` was read) **and** a direct Firestore doc read (`firebase` CLI authed; token refreshed, `lobster-log`/`(default)` reachable).

## CLOSEOUT  *(done — commit is Jonny's to run)*

- **CLAUDE.md updated** ✅ — header (line 3) → S105; "Pending / waiting on" submission-package TO-DO → **DONE** + provenance line; **session-log row** for S105; **Current session goals** → S105 COMPLETE + SESSION 106 TBD. Provenance correction carried: the **June 24 2026 meeting record lives in Gmail (Kane's follow-up) + the Otter transcript — NOT an S82 gate doc** (the two S82 docs are `RECON_stat_sect_id_S82.md` + `REFTABLE_USAGE_AUDIT_S82.md`).
- **Commit block (Jonny runs): ONE commit, FOUR files**, bare subject, no trailer, staged by exact path (never `-A` — leaves the 4 untracked `assets/docs/*.pdf` §22/§25 passenger PDFs out, per the S102 Aug/Sept carry-forward):

```
git add CLAUDE.md
git add docs/GATE_S105_DEMO_ACCOUNT.md
git add docs/GATE_S103_SHOTLIST.md
git add docs/RECON_S105_DEMO_SCOPE.md
git commit -m "S105: dfoelog demo account setup — role dfo, MAR-90 profile, free-activated; §22/TRG capture unblocked"
```
