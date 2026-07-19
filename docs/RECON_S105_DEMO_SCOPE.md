# RECON — S105 Phase 0b · What must the DFO demo account demonstrate?

**Date:** 2026-07-18 · **Type:** read-only recon (no code edits; NO-GIT — this file rides the S105 closeout commit)
**Question:** what is the demo account *required* to show DFO reviewers — and does the June 24 "whole-package" outcome imply the demo account itself must reach all four subforms?
**Cross-session boundary:** this recon session owns THIS file only; the account-setup record lives in `docs/GATE_S105_DEMO_ACCOUNT.md` (Phase 1 session). Ruling delivered to that session same-day.

---

## §1 — Rule text: access is DISCRETIONARY; no content spec (prior knowledge CONFIRMED, quoted)

**`~/Desktop/DFO/ELOG_qualifications/Qualification_Process_e v7.pdf` — the string "demo account" appears NOWHERE in the document** (sole "demo" hit is the word "demonstrate"). The only app-access clauses, all discretionary:

> §5 (technical assistance): "DFO will provide technical assistance to developers if required on a limited basis. If technical assistance is requested, DFO **may require** one or more of the following: • Access to the developer's test environment; • Web-ex sessions for onscreen review and walk-through; and/or • Copy of test version of mobile client application."

> §8 (review process): "During this period, DFO **may request** additional information and/or materials **at its discretion** to help facilitate the review and approval process."

> §9 (post-qualification QA): "DFO **reserves the right** to carry out quality assurance reviews which may include one or more of the following: • Testing of the client application on various platforms; • Access to production copy of the client application; • Access to the developer's test environment; …"

**`ELOG_Client_Application_Standard_v6.1.pdf` §16:**

> "A copy of or access to the ELOG client application shall be available free of charge **upon request of DFO**, in order to verify the application." … "If the ELOG client application is partially or totally centralized on an external server, a test environment shall be configured and available to DFO."

⚠ Do NOT conflate with the Standard §14 **"Demo (trial module)"** paragraph ("The ELOG client application should have a trial component enabling the **user** to try the application…") — that is a user-facing trial-mode recommendation, unrelated to reviewer access.

**Net: the rule text makes app access on-request/discretionary and specifies nothing about what a demo account must show.**

## §2 — June 24 meeting record — ⚠ PROVENANCE CORRECTION

**The June 24 2026 meeting record does NOT live in an S82 gate doc — no such doc exists** (S82's docs are `REFTABLE_USAGE_AUDIT_S82.md` + `RECON_stat_sect_id_S82.md`, unrelated). **The record lives in GMAIL**, two emails:

1. **Kane's written follow-up** — thread "ELOG Overview and Questions - LobsterLog", 2026-06-24 20:16 UTC. The all-subforms point (demo account NOT mentioned in the written summary):
   > "All subforms must be developed for as ELOGs is a national program. The subform requirements document displays all data elements that must be included and indicates which subform they apply to."
2. **Otter transcript** ("Note" email from jonathon.n.14@gmail.com, 2026-06-24). Kane @1:24, verbatim:
   > "you'll be submitting the full package with the technical revision grids … The XML … gets submitted to our back end, and our tech team does their review. **Additionally, we do ask for the demo account to be provided up front as well, so that we can test the front end.** So, while the back end sees what the back end is doing, we also need to view to that front end, right, **to ensure that other rules that aren't necessarily expressed through the XML formats or anything else coming in are followed** … I know one of your questions had to do about submitting sub form by sub form, but like I said, **it's the entire package that has to be developed for**"

   and @~29:00 (describing a future second-package submission): "you would submit a package, just as you would this first time … you can include your user documents, the technical revision grid, **access to the demo account**, it'll be all those things again".

**Reading:** "entire package" = *development* scope (all four subforms built + TRG'd); the demo account's stated purpose = *front-end verification of rules not expressed in XML*. **Neither record says the demo account itself must reach all four subforms** — nor excludes it. That interpretive gap is what the §5 ruling settles.

➡ **Carry-forward:** the CLAUDE.md closeout (S105 row) must carry this provenance correction — any prior "June 24 outcomes (S82 gate doc)" framing in master-context material is wrong; cite Gmail (the two emails above) instead.

## §3 — Code facts (confirmed by grep, 2026-07-18 working tree)

- Exactly **two** routes into `'dfo-setup'` in the whole of `src/` + `App.tsx`:
  1. `App.tsx:602` — DFO ELOG pill: `setView(dfoActivated ? 'dfo-list' : 'dfo-setup')` — once activated, the pill only ever routes to dfo-list;
  2. `App.tsx:1299` — "⚙ DEV: Back to Setup" float, gated `isAdmin && …` at `App.tsx:1293` → **hidden** for role `'dfo'`.
  No Settings row navigates there; no other `setView('dfo-setup')` exists. Post-activation a `'dfo'` account **can** reach: dfo-list, Trip Confirm, FullDfoForm (fields gated by the profile's region), dfo-history/register, Form 222/233, Captain Profile, Settings (+DFO Documents card). It **cannot** reach: the region picker (dfo-setup) or the XML harness (`__DEV__ && isAdmin`).
- **⚡ Activation is PER-DEVICE, not per-account.** `dfoActivated` lives in the *local* uid-namespaced AsyncStorage captain profile (`App.tsx:312` reads `p.dfoActivated` via `loadCaptainProfile()`; `captainStorage.ts:44`). It reaches a second device ONLY via the S86 cloud-backup restore, which requires (i) an empty local namespace on the new device and (ii) a backup previously written under consent (**default OFF**). Consent OFF ⇒ a DFO reviewer signing in on their own device starts blank → pill visible (role `'dfo'`) → routes to **dfo-setup** → they pick any region and activate free — regardless of the capture sim's state.

## §4 — S103 shot-list constraints (GATE_S103_SHOTLIST.md §2.1–§2.5)

- Every in-app shot (F02–F16) + every TRG shot runs on the **dfoelog demo** account (F01 = external store listing).
- **F06/F07 require the PRE-activation state**; **F08–F16 require ACTIVATED + seed trip, MAR pinned** (F11's Settlement Grid renders MAR-only; seed spec = MAR-90 / LFA 34).
- **Group C TRG sends require the activated MAR-90 identity** on the demo account.
- The §2.5 sequencing (activate exactly once, between Groups A and B) stands — on the **capture sim**; per §3 this does not constrain reviewer devices.

## §5 — Options table + ⚖ RULING (Jonny, dated July 18 2026)

| Option | Reviewer experience | Region evidence | Cost / risk |
|---|---|---|---|
| (a) Activate MAR-90 + backup consent ON (activation follows the account) | Land post-activation in MAR; never see setup; QC/NL/GLF unreachable | TRG XML + §22 figures only | Reviewers can't probe per-region front-end gating |
| **(b) Activate MAR-90 on capture sim only + consent OFF** | Fresh device → blank → **dfo-setup** → self-serve any region, free activation | Reviewer can self-serve all four regions; TRG XML the guaranteed evidence | Reviewer walks setup themselves (needs triplet + key out-of-band) |
| (c) Build role-gated "back to setup" for `'dfo'` | Region-switch on one device | Full reachability one device | Code change; setup re-entry re-writes `subformId`/`regId` + profile seed → silent re-region risk mid-review; out of S105 scope |

**⚖ RULING, dated July 18 2026 — Option (b).**
- Demo account activates **MAR-90 on the capture sim only**; **backup consent stays OFF** (default) so reviewer devices start blank and **self-serve setup in any region**.
- **TRG XML remains the guaranteed four-region evidence.**
- **Credentials hand-off at submission time** will include the **out-of-band triplet + ELOG key** and **point reviewers at the §22 User's Guide setup section**.
- **Option (c) REJECTED for this session** (code change, silent re-region risk) — **may be revisited Aug/Sept if DFO requests it**.
- Operational consequence for Phase 1 (GATE_S105_DEMO_ACCOUNT.md): **never enable backup consent** on the demo account during setup or capture — the consent toggle stays untouched at its default OFF.
