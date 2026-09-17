# LobsterLog Cloud Functions — `provisionNavionics`

**S170 Phase 2. Local only. Nothing here has been deployed.**

Authorises a **Navionics chart entitlement** after a purchase that already completed
at the App Store / Google Play through RevenueCat. **It does not take money** — no
payment handling, no card data, no refund path.

Design: `SECURITY_AUDIT_S115.md` §4 (as corrected by its S168 status block).
Plan and phase order: `GATE_S170_PURCHASE_FUNCTION.md`.

---

## What is built (Phase 2)

1. Callable `provisionNavionics`, pinned to `northamerica-northeast1`.
2. **Firebase auth required.**
3. **App Check required** (`enforceAppCheck: true`).
4. ⭐ **Server-side RevenueCat entitlement check** — the security win. The caller's
   claim is never trusted; the server asks RevenueCat directly.

## What is deliberately NOT built yet

- **Phase 3** — the RSA signer (raw PKCS#1 v1.5 block-type-1, **no hash**).
- **Phase 4** — the Navionics POST.

⚠ Neither the Garmin private key nor the Navionics developer tokens are declared or
read here. Only `REVENUECAT_SECRET_KEY` is declared, so this function **cannot touch
the Garmin key even by accident.**

## Secrets

Never in code, never in the repo, never in the app bundle. Values are placed by
Jonathon; the code only ever reads them **by name**.

```bash
firebase functions:secrets:set REVENUECAT_SECRET_KEY     # Phase 2 — the only one needed now
# Phase 3/4 will add:
# firebase functions:secrets:set GARMIN_PURCHASE_PRIVATE_KEY
# firebase functions:secrets:set NAVIONICS_TOKEN_IOS
# firebase functions:secrets:set NAVIONICS_TOKEN_ANDROID
```

Each command prompts on stdin — the value never appears in a shell argument, a file,
a log, or this repo. `.gitignore` here also blocks `.env*`, `.secret.local` and `*.pem`.

## Run the tests (no network, no credentials, no emulator)

```bash
cd functions
npm install
npm test
```

12 tests covering the entitlement rule, including the two that matter most:

- **A different entitlement does not grant ours.**
- ⚠ **A bad key (401) or a RevenueCat outage (500) THROWS** — it must never read as
  "not entitled", which would be a silent downgrade to no-charts.

## Run it locally (emulator)

```bash
cd functions
echo "REVENUECAT_SECRET_KEY=<paste>" > .secret.local   # gitignored
firebase emulators:start --only functions
```

⚠ The emulator does **not** enforce App Check. Auth and the entitlement check do run.

## Why `app_user_id` is the Firebase uid

The app already calls `Purchases.logIn(uid)` (`src/Hooks/useAuth.ts:52`,
`src/Hooks/usePurchases.ts:142`), so RevenueCat is keyed on the same uid the callable
receives as `request.auth.uid`. **No mapping table is needed.**

## `user_id` sent to Garmin — RULED

⚠ **Jonathon's S170 ruling: the Firebase uid, not the email.** The app currently sends
`auth.currentUser?.email`; Phase 4 sends `request.auth.uid` instead.

Safe to change: the app has only ever talked to
`developers-store-sandbox.navionics.com`, so **no production Garmin record keyed to an
email exists** (see `GATE_S170_PURCHASE_FUNCTION.md` §6).

## Dependencies

`firebase-functions` 6.6.0 · `firebase-admin` 13.10.0 · Node 22.

⚠ Note for reviewers: `enforceAppCheck` does not appear in the deploy manifest
(`callableTrigger` is `{}`). That is expected — it is enforced **at runtime** by
`firebase-functions/lib/common/providers/https.js:464,471`, not at deploy time.
