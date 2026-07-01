# RECON — DFO backup/restore groundwork (Session 84)

Read-only recon. Goal: establish the truth about what the DFO side stores today and
what identity exists, before designing backup/restore. No code changed.

- Repo: /Users/jonny/Desktop/LobsterLog
- Branch: main
- Date: 2026-06-29
- Method: grep + direct file reads. Claims below are quoted off the code, not assumed.

---

## Step 1 — Is the DFO side touching Firebase today?

Conclusion: the DFO side is **fully local today**. It uses AsyncStorage for all
storage and `fetch()` (SOAP) for transmission to DFO. It does NOT read or write
Firebase/Firestore anywhere.

The one Firebase hit inside the searched file set is a false positive:

- src/Hooks/useLogForm.ts:3 — `import { db } from '../../firebaseConfig';`
- src/Hooks/useLogForm.ts:4 — `import { doc, setDoc } from '@react-native-firebase/firestore';`
- src/Hooks/useLogForm.ts:123 — `const logDocRef = doc(db, 'users', user.uid, 'logs', safeDateId);`

useLogForm.ts is the **free/Pro logging hook**, not DFO. It has zero dfo/elog/captain
references. It only surfaced in the file search because "us**elog**Form" contains the
substring "elog". Its Firestore write is the free side saving to `users/{uid}/logs/...`.

Import lines that decide the DFO side is local:

- src/utils/dfoLogStorage.ts:1 — `import AsyncStorage from '@react-native-async-storage/async-storage';`
- src/utils/captainStorage.ts:1 — `import AsyncStorage from '@react-native-async-storage/async-storage';`
- src/utils/submitDfoXml.ts:14 — `import { DFO_UAT_ENDPOINT, DFO_SOAP_ACTION_SAVE } from './dfoXmlGenerator';`
- src/utils/submitDfoXml.ts:147 — `const response = await fetch(endpoint, { ... })` (the SOAP POST to DFO)

Searched (firestore / collection( / doc( / setDoc / addDoc / getDoc /
@react-native-firebase / dfo-elog / firebase) across: dfoLogStorage, dfoXmlGenerator,
submitDfoXml, FullDfoForm, DfoLogsListScreen, Form222Screen, Form233Screen,
captainStorage, dfoForm222Generator, dfoForm233Generator, dfoConstants, dfoUids,
CaptainProfileScreen, DfoSetupScreen, DfoDemoScreen, DfoTestHarnessScreen. Only the
useLogForm false positive came back.

---

## Step 2 — Local stores on the DFO side (keys + shapes)

Every DFO store is AsyncStorage, one JSON blob per key. No per-record keys; no user id
in any key (all keys are static string literals — see Step 3).

DfoLog store

- key: `@lobsterlog:dfo_logs`
- file: dfoLogStorage.ts — read getItem:55 (loadAllLogs), write setItem:81/100/113
- shape: array of DfoLog. Top-level: id, lgbkUid, firstEntryDt, mode, status?,
  sentToDfo?, dateFished, createdAt, subformId?, regId?, tripNum?, remarks?
- the dynamic form fields live in `data: Record<string,string>` — e.g. gridId,
  statSectId, lgridCodeId, departurePortCodeId, portLandedCodeId, baitEntries (a JSON
  string), coordinates, etc. all sit inside that blob, not as top-level fields
- remarks? is LogRemarks (10 optional per-section note keys)

Sent-XML archive

- key: `@lobsterlog_xml_archive`
- file: dfoLogStorage.ts — read getItem:306 (loadXmlArchive), write setItem:298
- shape: array of XmlArchiveEntry: logId, savedAt (number), xml (full XML string)
- pruned to 3-year retention on write

Transmission register

- key: `@lobsterlog_transmission_register`
- file: dfoLogStorage.ts — saveTransmissionRecord:247, loadTransmissionRegister:260
- shape: array of TransmissionRecord: id, logId, attemptedAt, outcome
  ('success'|'failure'), httpStatus?, errorMessage?, fileName?, confNumber?,
  xmlSnapshot (full XML), soapSnapshot (full SOAP envelope), vrn?, tripNum?, xsdValid?,
  wsErrCode?, kind? ('logbook'|'form222'|'form233')
- pruned to 3-year retention on write

Captain Profile

- key: `@lobsterlog:captain_profile`
- file: captainStorage.ts — loadCaptainProfile:43, saveCaptainProfile:52
- shape: single CaptainProfile object: operatorName, licenceHolderFin, vesselNumber,
  fishingNumber, fishingArea, fmaId (number|null), totalGearCount, gearType, subformId,
  regId, language, units, dfoActivated, dfoLicenceNo, dfoFin, elogKey

Others found on the DFO side:

Form 222 entries

- key: `@form222_entries`
- file: dfoForm222Generator.ts — write setItem:75 (saveForm222Entry), read getItem:80
- shape: array of Form222Entry: uid, savedAt, interactInd ('Y'|'N'), reportDate,
  interactionDate, interactionTime, lat, lon, speciesLabel, nbAnimals,
  interactionTypeLabel, injuryInd, deathInd, entangleInd, releaseInd, gearDamageInd,
  observerNm, contactInfo, remarks, lgbkNumRef?, sentToDfo, sentAt?
- 3-year retention

Form 233 entries

- key: `@form233_entries`
- file: dfoForm233Generator.ts — write setItem:41 (saveForm233Entry), read getItem:46
- shape: array of Form233Entry: uid, savedAt, periodStartDate, periodEndDate, reason,
  licenceNo, fin, sentToDfo, sentAt?
- 3-year retention

Saved crew

- key: `@lobsterlog:saved_crew`
- file: crewStorage.ts — loadCrew:11, saveCrew:20
- shape: array of CrewMember: id, name, fisherNumber?
- used by CrewSelector → FullDfoForm (DFO). Also imported by the legacy free-app form
  (LobsterLogProposalForm) — shared store, not DFO-exclusive

Privacy acceptance flag

- key: `@lobsterlog:privacy_accepted`
- file: captainStorage.ts — loadPrivacyAccepted:86, savePrivacyAccepted:95
- shape: the literal string 'true' (or absent). Not DFO data, but it gates DFO entry

Saved ports (named DFO-ish, but NOT wired to the current DFO form)

- key: `@lobsterlog:saved_ports`
- file: portStorage.ts — loadPorts:10, savePorts:19
- shape: array of Port: id, name (free text)
- The current DFO form does NOT use this. FullDfoForm uses DfoPortSelector
  (src/components/DfoPortSelector.tsx), which stores integer PORT_ID codeIds inside the
  DfoLog `data` blob (departurePortCodeId / portLandedCodeId). saved_ports is referenced
  only by the legacy PortSelector → LobsterLogProposalForm (free-app). Listed here so the
  backup design doesn't mistake it for DFO port data.

Non-DFO AsyncStorage keys seen but out of scope (not detailed): navionics_purchase
(Pro/Navionics), user_language + language_picker_shown (i18n), and the sail/haul timer
keys in activeTimers.ts (free-app).

---

## Step 3 — Where identity / sign-in lives

How a user authenticates:

- Entry screen: src/screens/LoginScreen.tsx → state + handlers live in src/Hooks/useAuth.ts
- Mechanism: Firebase Auth, email + password
  - useAuth.ts:8-9 — createUserWithEmailAndPassword / signInWithEmailAndPassword
  - useAuth.ts:27 — onAuthStateChanged(auth, ...) session listener
  - signup sends an email-verification link then signs the user out until verified
    (useAuth.ts:58-61); LoginScreen uses sendPasswordResetEmail
  - useAuth.ts:35 — Purchases.logIn(u.uid) ties RevenueCat to the same uid

What identifies a user across sessions:

- The Firebase Auth user — `uid` (u.uid) and `email`
- The free/Pro side is keyed to it: useLogForm.ts:123 writes
  `doc(db, 'users', user.uid, 'logs', safeDateId)`

Is the DFO/Captain data keyed to that identity? NO.

- Every DFO AsyncStorage key is a static string literal — there are zero
  template-string keys (no uid/email interpolation) anywhere in src
- The DFO storage functions take no user argument: loadCaptainProfile(), loadAllLogs(),
  loadCrew(), loadForm222Entries(), etc.
- The DFO-side files (dfoLogStorage, captainStorage, crewStorage, portStorage,
  FullDfoForm, DfoLogsListScreen, CaptainProfileScreen) contain zero references to
  user / uid / currentUser / useAuth / firebaseConfig

So DFO + Captain data sits on the device, unkeyed, fully decoupled from the signed-in
account. A cross-device identity DOES exist (the Firebase Auth uid, stable per account,
plus email) — but nothing today links any DFO data to it. A restore feature would have to
create that link from scratch.

---

## Plain-language summary

The DFO side is local-only today: AsyncStorage for storage, SOAP-over-fetch to DFO for
transmission, and no Firebase anywhere (the single Firebase hit in the searched files is
the free/Pro logging hook, which only matched on a substring). The DFO data lives in a
handful of AsyncStorage blobs — the DfoLog store (dynamic form fields nested inside a
`data` map), the sent-XML archive, the transmission register, the Captain Profile, the
Form 222 and Form 233 entry stores, and saved crew — none of them keyed to the user. The
app DOES have a real cross-device identity: Firebase email/password auth, with a stable
uid and email that the free/Pro logs already key off of. But the DFO stores are completely
decoupled from that identity — static keys, no user parameter, no auth imports — so today
a new phone signing into the same account would recover nothing on the DFO side. There is
no existing backup/export/restore of DFO data; "restore" in the codebase is only
RevenueCat purchase restore.

## Flags

- Inconsistent key namespacing. Three different conventions: `@lobsterlog:` (colon) for
  dfo_logs, captain_profile, privacy_accepted, saved_crew, saved_ports; `@lobsterlog_`
  (underscore) for transmission_register and xml_archive; and no lobsterlog prefix at all
  for `@form222_entries` / `@form233_entries`. Any backup that enumerates keys must
  hardcode this exact irregular set; a getAllKeys + "@lobsterlog" filter would silently
  miss the two form stores.
- No existing DFO backup/export/restore anywhere (verified). The only "restore" is
  RevenueCat restorePurchases.
- Heavy payloads in the register + archive. The transmission register stores the full XML
  AND full SOAP envelope per send; the XML archive stores the full XML per send. Both keep
  3 years. A naive full backup of these could get large and grows with every transmission
  — worth excluding or compressing relative to the source DfoLog they can be regenerated
  from.
- saved_ports looks DFO-related by name but is not wired to the current DFO form (legacy
  free-app only). Real DFO port values are codeIds inside the DfoLog `data` blob. Backing
  up saved_ports for DFO restore would be a no-op.
- saved_crew is shared between the DFO form and the legacy free-app form. Restoring or
  overwriting it touches both sides.
- dfo_logs is one static key holding ALL logs in a single JSON array (loadAllLogs parses
  the whole blob). No per-log keying — relevant to any restore-merge strategy.
- CaptainProfile carries duplicate identity fields: the live licenceHolderFin /
  fishingNumber AND legacy dfoLicenceNo / dfoFin (CLAUDE.md flags the dfo* pair as pending
  retirement). A profile snapshot captures both; a restore should avoid resurrecting the
  stale copies.
- privacy_accepted is a one-off device flag, not user data — it resets on a new device, so
  the first-run DFO privacy gate would reappear after a restore regardless.
