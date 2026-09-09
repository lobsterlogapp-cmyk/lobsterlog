# GATE S167-G — THREE NAVIONICS FIXES

**Opened 2026-09-08. Phased build, STOP at every gate. NO state-changing git by Claude — every
commit is a vetted literal block for Jonathon to run.**

Recon basis: `docs/RECON_S167_GARMIN_FULL.md` (read-only, same day, HEAD `4e2346f`).

⚠ No key material, token value, or `.env` value appears anywhere in this document.

---

## SCOPE

| Phase | Subject | Status |
|---|---|---|
| 1 | The restore tier guess — `usePurchases.ts` restore defaults to annual | **DONE — commit `13f598a`, pushed** |
| 2 | Silent failures — four `return null` paths, three discarding call sites | **DONE — commit `ef7ae1e`, pushed** |
| 3 | The shared chart entitlement — un-namespaced `navionics_purchase` key | **DONE — commit `3193080`, pushed** |
| 4 | Cleanup — placeholder tile URL (+ debug log, done early at §3.6) | **DONE — commit `877869c`, pushed** |
| 5 | Mapbox attribution + telemetry opt-out | **DONE — commit `8b7e91d`, pushed** |
| 6 | iOS metrics key — closes the §5.4 block | **DONE — commit `d00ea51`, pushed** |
| 7 | Move the Mapbox logo above the drop-pin button | **BUILT — commit block at §7.5** |

Phases 1–4 closed in code at `877869c` (record commit `5863de0`). **Phase 5 was added afterwards**
and supersedes the "closed" line that stood here. ⚠ **Nothing has been walked** — see "WHERE IT
STANDS" at the foot of this document — and ⚠ **Phase 5 leaves the iOS telemetry opt-out unresolved
and blocked on a decision, §5.4.**

---

## ⚠ PATH CORRECTION

The build prompt names `src/hooks/usePurchases.ts`. The real path is **`src/Hooks/usePurchases.ts`**
— capital **H**. This is the S86-banked gotcha: *"useAuth.ts is at src/Hooks/ (capital H) — stage by
full path or git add aborts the stage."* Every command block in this document uses the real path.

---

# PHASE 1 — THE RESTORE TIER GUESS

## 1.1 The function as it stands (printed before any edit)

`src/Hooks/usePurchases.ts:99-115` — **unmodified**:

```ts
  const restorePurchases = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        setIsProStatus(true);
        Alert.alert('Success', 'Your Pro subscription has been restored.');
        setPaywallVisible(false);
        // Re-provision Navionics. Monthly vs annual can't be resolved from a restored
        // entitlement yet (no store product IDs in constants), so default to annual.
        void runNavionicsPurchase(NAVIONICS_PRODUCT_ANNUAL, user?.email || '');
      } else {
        Alert.alert('Notice', 'No active subscription found to restore.');
      }
    } catch (e) {
      Alert.alert('Error', (e as any).message);
    }
  };
```

The defect is `:108` plus the comment at `:106-107` that documents it: a monthly subscriber who
restores is provisioned the **annual** Navionics product.

## 1.2 Where the tier IS knowable — findings

**(a) The entitlement carries the store product identifier.** Verified in the installed typings,
`node_modules/react-native-purchases/dist/index.d.ts` (v9.7.6) → `PurchasesEntitlementInfo`:

| Field | Type | Use for tier? |
|---|---|---|
| `productIdentifier` | `string` | **YES — this is the store product ID of the subscription backing the entitlement** |
| `periodType` | `"NORMAL" \| "INTRO" \| "TRIAL"` | **NO** — trial/intro/normal, *not* duration. A common trap |
| `expirationDate` / `latestPurchaseDate` | `string \| null` | Only as a fallback inference (see 1.4) |
| `willRenew`, `store`, `isActive` | — | Irrelevant to tier |

`PurchasesStoreProduct` additionally exposes `subscriptionPeriod?: string \| null` (ISO-8601, e.g.
`P1M` / `P1Y`) and `productCategory` / `productType`, but a **`CustomerInfo` entitlement does not
carry a `StoreProduct`** — only the identifier string. So the tier is not readable straight off the
restored entitlement.

**(b) The offerings map identifier → tier, with no hardcoded IDs.** `PurchasesPackage` carries
`packageType: PACKAGE_TYPE` (`MONTHLY` / `ANNUAL` / `WEEKLY` / `LIFETIME` / …) **and**
`product: PurchasesStoreProduct` with `product.identifier`. This app already relies on exactly that
join — `src/components/PaywallModal.tsx:49` picks the Navionics product from `pack.packageType`, and
`:58-75 getButtonLabel()` switches on it. So `Purchases.getOfferings()` gives a live
`productIdentifier → packageType` map from RevenueCat itself, requiring nothing hardcoded.

**(c) `customerInfo.activeSubscriptions`** (`string[]` of active store product IDs) is a second
source of the same identifiers — useful only as a cross-check; it has no tier information either.

## 1.3 Are the store product IDs in the repo? — **NO**

Searched the whole tree (excluding `node_modules`, `.git`, `vendor`, `dist`):

- `src/config/constants.ts` holds `REVENUECAT_KEYS` (publishable), `ENTITLEMENT_ID`,
  `DEFAULT_LOCATION`, `WEATHER_OPTIONS`, `AppView`. **No product identifiers.**
- The only product IDs anywhere are the two **Navionics/Garmin** UUIDs at
  `src/utils/navionicsPurchase.ts:6-7` — those are the Garmin store's products, not Apple's or
  Google's.
- No `.storekit` file, no `app.config.js` entry, no `eas.json` entry, no i18n string, no doc under
  `docs/` names an App Store or Play product identifier.

CLAUDE.md has carried this as an open external item since S47: *"App Store / Play store product
identifiers for monthly/annual Pro (to map restore/renewal to the correct Navionics tier)"*.

**(d) A second, stronger route exists — the store product itself.**
`Purchases.getProducts(productIdentifiers: string[])` (`node_modules/react-native-purchases/dist/purchases.d.ts:199`)
returns `PurchasesStoreProduct[]`, and `PurchasesStoreProduct.subscriptionPeriod: string | null`
(`offerings.d.ts:166`) is the real ISO-8601 duration — `P1M`, `P1Y`. This resolves a product that
has been **retired from the current offering**, which the offerings join at (b) cannot.

## 1.4 Verdict

**The tier is resolvable — but only at runtime, from RevenueCat, and only when the offerings fetch
succeeds.** It is *not* resolvable from anything static in this repo, and there is no field on the
restored entitlement that states duration.

That gives three possible routes:

| Route | Mechanism | Hardcoded IDs needed? | Fails when |
|---|---|---|---|
| **A1** | `entitlement.productIdentifier` → `Purchases.getProducts([id])` → `subscriptionPeriod` | **No** | Store/network unreachable, or `subscriptionPeriod` null |
| **A2** | `entitlement.productIdentifier` → match `packageType` in `Purchases.getOfferings()` | **No** | Offerings fetch fails, **or the product has been retired from the current offering** |
| **B** | Hardcode the store product IDs in `constants.ts` and match | **Yes — we do not have them** | Blocked outright |
| **C** | Infer from `expirationDate − latestPurchaseDate` (≈30d vs ≈365d) | No | Renewals, trials, grace periods and billing-retry states all distort the window — an inference, not a fact |

**The tier IS resolvable from RevenueCat, with nothing hardcoded, so per the standing instruction it
has been fixed.** Built as **A1 with A2 as fallback** — A1 first because it survives a retired or
grandfathered product; A2 second because it is the exact join `PaywallModal.tsx:49` already relies
on. **Route C was rejected and not written**: it produces a number that looks like a fact and is not
one. Route B stays blocked and is unchanged as an external item.

## 1.5 What was built

`src/Hooks/usePurchases.ts` — three edits, no change to purchase logic, no change to
`maybeRenewNavionics` (renewal already reuses `existing.product_id`, which is correct and untouched):

1. **Import widened** to bring in `NAVIONICS_PRODUCT_MONTHLY` alongside `NAVIONICS_PRODUCT_ANNUAL`.
2. **New module-level resolver** `resolveRestoredNavionicsProduct(info)` plus two helpers
   (`baseProductId`, `navionicsProductForPeriod`), sitting above `maybeRenewNavionics` and matching
   that function's existing shape (module-level `async`, `info: any`, silent `try/catch`).
3. **`restorePurchases` rewritten at the provisioning line only** — awaits the resolver and
   provisions the resolved tier, or provisions **nothing**.

`navionicsProductForPeriod` maps **only** the two durations Garmin actually sells:

| Store `subscriptionPeriod` | Navionics product |
|---|---|
| `P1Y`, `P12M` | ANNUAL |
| `P1M` | MONTHLY |
| `P1W`, `P3M`, `P6M`, lifetime, null, anything else | **null — no guess** |

`baseProductId()` trims at `:` before comparing, because on Google Play a subscription product
identifier can arrive carrying its base-plan suffix (`sub_id:base_plan`) while
`getProducts`/offerings return the bare id. Exact match is tried first in both lookups.

**The un-resolvable branch does not guess.** It logs and attempts no purchase. This is the literal
reading of *"DO NOT GUESS THE OTHER WAY"* — the alternative options (default monthly; keep the
annual default confined to the rare branch) both re-introduce a silent wrong tier, just less often.
⚠ **This is the one judgment call in Phase 1 and it is a one-line change to overturn** if you would
rather under-grant monthly than provision nothing.

## 1.6 How the tier is now determined, and every restore case

| Case | Resolution | Navionics provisioned | User sees |
|---|---|---|---|
| Monthly subscriber restores, store reachable | A1 — `P1M` | **MONTHLY** *(was: annual — the defect)* | "Your Pro subscription has been restored." |
| Annual subscriber restores, store reachable | A1 — `P1Y` | **ANNUAL** | same |
| Product retired from current offering, store reachable | A1 still answers from the product | correct tier | same |
| `subscriptionPeriod` null, product still in current offering | A2 — `packageType` | correct tier | same |
| Store and offerings both unreachable (offline restore) | neither answers | **nothing** | same *(Phase 2 will surface this)* |
| Odd duration — weekly / 3-month / 6-month / lifetime tier added later | deliberately unmapped | **nothing** | same *(Phase 2 will surface this)* |
| No active Pro entitlement | resolver never called | nothing | "No active subscription found to restore." |
| `restorePurchases` throws | resolver never called | nothing | the RevenueCat error message |

**Nothing user-visible changes in Phase 1.** The provisioning call was, and remains,
fire-and-forget behind the same success alert; only *which* product it asks for has changed. Making
the last two rows visible to the user is exactly Phase 2's job.

⚠ **Residual, named not fixed:** an existing monthly subscriber who restored **before** this change
already has an annual Navionics receipt stored on their device. This does not correct it. No chart
data exists today, so nothing is being given away in practice — but note it, because
`maybeRenewNavionics` reuses `existing.product_id` and will therefore keep renewing that wrong tier
until the receipt is replaced. Phase 3's uid-namespacing will orphan those receipts anyway; the
interaction is recorded there.

## 1.7 Files touched, and the backup

| File | Before | After |
|---|---|---|
| `src/Hooks/usePurchases.ts` | `1493b02005d25a53058263d91c69d0f7feae68c484925c09c7c73d5a60ec1d28` | `c43fd81485fca73bb28b204e323e4f4fa5c370af022e29d399fd3f0fe0f5354f` |

Backup taken **before** the edit, checksum-verified identical to the original at the time of copy:
`~/Desktop/S167_G_backup_20260908/usePurchases.ts.pre_S167G`

`git diff --stat`: **1 file changed, 60 insertions(+), 4 deletions(-)**.

## 1.8 Phase 1 commit block — Jonathon runs

Expected staged count: **2 files** — the source file and this gate doc.

```
cd ~/Desktop/LobsterLog
git add src/Hooks/usePurchases.ts
git add docs/GATE_S167_GARMIN_FIXES.md
git diff --cached --stat
```

```
git commit -m "Resolve the real subscription tier on restore instead of defaulting to annual"
```

```
git push
```

```
git log --oneline -1
git status --short
```

---

# PHASE 2 — SILENT FAILURES

Phase 1 landed as commit **`13f598a`** (pushed `4e2346f..13f598a`, empty-range verified).

## ⚠⚠ STANDING RULE ADDED MID-PHASE — THE DFO SIDE IS OFF LIMITS

Founder ruling, issued during this phase and binding on **S167-G and every Garmin phase after**:

> Do not edit, refactor, tidy, move, rename or "apply the repo pattern to" any DFO-side file, for
> any reason, ever, as part of Garmin work. Not for consistency. Not for a shared constant. Not
> because it is one line and harmless.
>
> DFO-side means: any DFO form screen, the logbook screens, the register, the Help & Support
> screen, the Privacy Notice, the Attestation modal, any bundled DFO document, any §22 figure
> surface, and every existing i18n key those surfaces use.
>
> If Garmin work appears to need something that lives on the DFO side: DUPLICATE IT ON THE GARMIN
> SIDE, or STOP AND ASK. Never reach across. **If you find yourself reasoning that a DFO-side edit
> is safe, small, or better practice — that reasoning is the signal to stop, not a reason to
> proceed.** The blast-radius call is Jonathon's.

Files Garmin work may touch: the Navionics utils, the purchase hook, the paywall modal, the Pro
map screen, and NEW i18n keys only.

**WHY THE RULE EXISTS — recorded because it was earned, not theoretical.** Mid-phase I put the
support address into the failure notice, then moved `SUPPORT_EMAIL` out of `HelpSupportScreen.tsx`
into `src/config/constants.ts` and imported it back, to satisfy the repo's one-definition rule.
`HelpSupportScreen` is DFO-side and appears in §22 figures. The rendered string was byte-identical
and every gate was green — and it was still wrong, because the scope call was not mine to make. I
had explicitly considered leaving it alone and talked myself out of the safer option. **Both files
were reverted from the verified backups to byte-identical committed state before this phase
proceeded** (proof in the verify table, rows 22–23). **The DFO side shows no Garmin-era change.**

**RULED: two copies of the support address is the accepted cost.** The notice module carries its
own `SUPPORT_EMAIL`, with a comment naming the other copy and forbidding the "fix".

## 2.1 The four return-null paths, printed before any edit

All four were in `src/utils/navionicsPurchase.ts`, all returning the same bare `null`:

| # | Line (pre-edit) | Guard | Was |
|---|---|---|---|
| 1 | `:66-69` | signing credential absent from the build | `console.log(…); return null;` |
| 2 | `:78-81` | `generateGarminEncryptedTransaction` returned null | `console.log('Aborting…'); return null;` |
| 3 | `:99-102` | `!response.ok` from the Garmin store | `console.log(…status…); return null;` |
| 4 | `:114-117` | outer `catch` — offline, DNS, timeout, bad JSON | `console.log(…); return null;` |

**That single `null` is the whole defect.** Four different causes arrived at every caller as the
same value, so no caller could have told them apart even if it had looked. None did.

## 2.2 The call sites, printed before any edit

| # | Site | Shape (pre-edit) | Result |
|---|---|---|---|
| 1 | `PaywallModal.tsx:50` — after a successful purchase | `void runNavionicsPurchase(…)` | discarded |
| 2 | `usePurchases.ts` — `restorePurchases` | `void runNavionicsPurchase(…)` | discarded |
| 3 | `usePurchases.ts:27` — `maybeRenewNavionics` (renewal) | `await runNavionicsPurchase(…)` | discarded |
| 4 | `Garminmapbox.tsx:121` — DEV `TEST GARMIN` | `await runNavionicsPurchase(…)` | discarded |

Two `void`, two `await`, **four discards**. A harvester could pay and be told nothing.

## 2.3 What was built

**Purchase logic unchanged** — same order, same payload, same guards, same never-throws contract.
Only the *outcome* became legible.

1. **`navionicsPurchase.ts` — typed result.** New exported `NavionicsFailureReason` union and
   `NavionicsProvisionResult`. The five return sites were replaced one-for-one (each match asserted
   unique before replacement). The one remaining bare `return null` in the file is
   `generateGarminEncryptedTransaction` at `:49`, which is not a provisioning path and is untouched.

2. **`navionicsNotice.ts` — NEW, the visible half.** One definition, imported by both interactive
   call sites so they can never drift into describing the same event differently. Imports only
   `react-native`, `i18next`, and a type from `navionicsPurchase` — **it reaches into nothing.**

3. **Three call sites wired**; renewal deliberately not alerted (§2.6).

## 2.4 The reason codes, and what the user is asked to quote

The user reads a **reference code**, never our internal reason string. The reason still goes to the
console. **This table is the decode key for support.**

| User quotes | Internal reason | Cause | Body shown |
|---|---|---|---|
| **LL-CHART-01** | `missing-credential` | Garmin signing credential absent from the build | our end |
| **LL-CHART-02** | `encryption-failed` | credential present but unusable | our end |
| **LL-CHART-03-**`nnn` | `store-rejected` | Garmin answered non-2xx — **the HTTP status is appended** (`LL-CHART-03-403` refused, `LL-CHART-03-429` rate-limited, `LL-CHART-03-500` their side) | connection |
| **LL-CHART-04** | `network-error` | request threw — offline, DNS, timeout, bad JSON | connection |
| **LL-CHART-05** | `tier-unresolved` | tier could not be resolved, so nothing was sent | unresolved |

**The status rides in the code the user quotes** (founder ruling, S167-G Phase 2). Only
`store-rejected` ever carries one, because it is the only failure where Garmin actually answered;
every other code stays bare. Support can therefore separate a refusal from a rate-limit from a
Garmin outage **from the harvester's message alone** — no device console, no reproduction.

Both the code map and the body map are `Record<NavionicsFailureReason, …>`, so **adding a reason to
the union without giving it a code AND a body fails to compile.** A new failure cannot go silent by
omission — the compiler is the guard here, since this repo has no component tests.

~~⚠ The HTTP status is no longer visible to support through the user.~~ **RESOLVED before commit,
founder ruling: append the status.** The user now quotes `LL-CHART-03-403`; the status reaches
support in the harvester's own message. Codes without a status are unchanged.

## 2.5 Three bodies, and why it is three and not two

Founder ruling this phase: **`tier-unresolved` must not tell the user it is usually their
connection.** It is not a connection fault — nothing was ever sent. Blaming the connection would
send a harvester to the wheelhouse to check his signal for a problem that is not there.

| Body | Reasons | Claim it makes |
|---|---|---|
| `charts.notActiveOurSide` | 01, 02 | on our end, **not your phone and not your connection** |
| `charts.notActiveConnection` | 03, 04 | usually the connection, or the chart store not answering |
| `charts.notActiveUnresolved` | 05 | **no cause claimed at all** — could not be switched on, get in touch |

## 2.6 What a user now sees, in every case

| Event | Reason | User sees |
|---|---|---|
| Buys Pro, credential missing | 01 | Pro granted, then **LL-CHART-01**, our-end body |
| Buys Pro, credential unusable | 02 | Pro granted, then **LL-CHART-02**, our-end body |
| Buys Pro, Garmin refuses | 03 | Pro granted, then **LL-CHART-03-403** (status appended), connection body |
| Buys Pro, offline / times out | 04 | Pro granted, then **LL-CHART-04**, connection body |
| Restores, provisioning fails | 01–04 | restore-success alert, then the matching notice |
| **Restores, tier unresolvable** | 05 | restore-success alert, then **LL-CHART-05**, unresolved body |
| Renewal fails in the background | any | **nothing** — console only. See below |
| DEV `TEST GARMIN` fails | any | **nothing** — console only. See below |
| Everything succeeds | — | nothing, as before |

⚠ **RENEWAL IS DELIBERATELY SILENT, and this is a decision you can overturn.** It fires from the
customer-info listener, at a moment the user did not choose — a modal could land mid-logbook or
mid-send. Making it visible needs a surface that can wait (a banner on the chart screen), which is
its own build. Today it logs the reason.

⚠ **The DEV button does not show the notice**, because the notice says *"your payment went
through"* and no payment happens on a test tap. It logs the reason instead.

## 2.7 The wording — three things you are agreeing to

1. **It says "email us", not "try again", because nothing in the app retries.** Verified: a Pro
   user cannot reopen the paywall (`ProDashboard.tsx:313` hides the unlock route; every
   `setPaywallVisible(true)` site is `!isPro`-gated), so **Restore Purchases is unreachable to
   them** — and `maybeRenewNavionics` needs an existing stored receipt, so it never retries a
   *first-purchase* failure. **There is no self-service recovery path.** Telling a harvester to
   retry would be sending him somewhere that does not exist. ⚠ Building a retry is the largest
   named residual out of this phase.
2. **It claims the rest of Pro works** — true: weather, tides and the Mapbox base map are unaffected.
   Only the Navionics overlay is not switched on (and it has never rendered — see the S167 recon).
3. **The FR is best-effort and joins the proofreader pile.** `code :` keeps the space before the
   colon per the S131 free/Pro-side ruling; the DFO no-space rule does not reach these keys.

## 2.8 Final wording, verbatim

**Title** — EN `Charts not switched on yet` · FR `Cartes pas encore activées`

**LL-CHART-01 / 02 — our end**

> Your payment went through and your Pro subscription is active. The rest of Pro — weather, tides
> and the map — is working now.
>
> The Navionics charts could not be switched on. This one is on our end, not your phone and not
> your connection.
>
> Email support@lobsterlog.com and we will get it sorted. Quote this code: LL-CHART-01

> Votre paiement a été accepté et votre abonnement Pro est actif. Le reste de Pro — la météo, les
> marées et la carte — fonctionne dès maintenant.
>
> Les cartes Navionics n’ont pas pu être activées. Le problème vient de chez nous, pas de votre
> téléphone ni de votre connexion.
>
> Écrivez à support@lobsterlog.com et nous réglerons cela. Mentionnez ce code : LL-CHART-01

**LL-CHART-03 / 04 — connection**

> Your payment went through and your Pro subscription is active. The rest of Pro — weather, tides
> and the map — is working now.
>
> The Navionics charts could not be switched on this time. That is usually the connection, or the
> chart store not answering.
>
> Email support@lobsterlog.com and we will get them switched on for you. Quote this code: LL-CHART-03-403

> Votre paiement a été accepté et votre abonnement Pro est actif. Le reste de Pro — la météo, les
> marées et la carte — fonctionne dès maintenant.
>
> Les cartes Navionics n’ont pas pu être activées cette fois-ci. C’est habituellement la connexion,
> ou la boutique de cartes qui ne répond pas.
>
> Écrivez à support@lobsterlog.com et nous les activerons pour vous. Mentionnez ce code : LL-CHART-03-403

*(shown with a 403 as the example; `LL-CHART-04` carries no status and reads bare.)*

**LL-CHART-05 — unresolved, no cause claimed**

> Your payment went through and your Pro subscription is active. The rest of Pro — weather, tides
> and the map — is working now.
>
> The Navionics charts could not be switched on.
>
> Email support@lobsterlog.com and we will get them switched on for you. Quote this code: LL-CHART-05

> Votre paiement a été accepté et votre abonnement Pro est actif. Le reste de Pro — la météo, les
> marées et la carte — fonctionne dès maintenant.
>
> Les cartes Navionics n’ont pas pu être activées.
>
> Écrivez à support@lobsterlog.com et nous les activerons pour vous. Mentionnez ce code : LL-CHART-05

## 2.9 Files touched, and the backups

Every file below was backed up **before** edit, checksum-verified, into
`~/Desktop/S167_G_backup_20260908/`.

| File | Change |
|---|---|
| `src/utils/navionicsPurchase.ts` | typed result union, five return sites |
| `src/utils/navionicsNotice.ts` | **NEW** — the notice, code map, body map |
| `src/components/PaywallModal.tsx` | await result, notify on failure |
| `src/Hooks/usePurchases.ts` | notify on restore failure **and** on `tier-unresolved`; renewal logs |
| `src/screens/Garminmapbox.tsx` | DEV button logs the reason instead of nothing |
| `src/i18n/locales/en/common.json` | **new `charts` section only** |
| `src/i18n/locales/fr/common.json` | **new `charts` section only** |

REVERTED to committed state, no longer part of this phase: `src/screens/HelpSupportScreen.tsx`,
`src/config/constants.ts`.

⚠ **A backup fault was caught by the checksum gate and is recorded rather than buried:** the first
backup pass copied both locale files by `basename`, so `en/common.json` and `fr/common.json`
collided on one filename and the EN backup was overwritten by the FR copy. The mismatch surfaced
immediately, and the backups were re-taken under distinct names. A second check in the same pass
printed a **vacuous "OK"** — a zsh word-splitting fault compared two empty strings — and was
re-run explicitly rather than counted. Neither green was accepted on its face.

## 2.10 Phase 2 commit block — RUN AND PUSHED

**Landed as commit `ef7ae1e`**, pushed `13f598a..ef7ae1e`, 8 files 435+/21−,
`src/utils/navionicsNotice.ts` entering as `create mode 100644`. Empty-range verified
(`git log origin/main..HEAD` blank). **The fence check printed nothing** — `HelpSupportScreen.tsx`
and `config/constants.ts` were confirmed unmodified at commit time, on the terminal, by the block
itself.

Expected staged count: **8 files** — six modified, one new source file, one gate doc.

```
cd ~/Desktop/LobsterLog
git add src/utils/navionicsPurchase.ts
git add src/utils/navionicsNotice.ts
git add src/components/PaywallModal.tsx
git add src/Hooks/usePurchases.ts
git add src/screens/Garminmapbox.tsx
git add src/i18n/locales/en/common.json
git add src/i18n/locales/fr/common.json
git add docs/GATE_S167_GARMIN_FIXES.md
git diff --cached --stat
```

```
git status --short src/screens/HelpSupportScreen.tsx src/config/constants.ts
```

```
git commit -m "Tell the user when Navionics charts fail to switch on after a successful payment"
```

```
git push
```

```
git log --oneline -1
git log origin/main..HEAD --oneline
```

---

# PHASE 3 — THE SHARED CHART ENTITLEMENT

Phase 2 landed as **`ef7ae1e`**; the status-code amendment as **`45529f3`**. Both pushed.

**Files permitted this phase:** `navionicsStorage.ts`, `Garminmapbox.tsx`, and the sign-out /
delete-account call sites **only to add a `clearNavionicsPurchase` call**.
`src/utils/dfoStorageKeys.ts` was **READ for the pattern and never edited** — `git diff` on it is
empty, proven in the verify table.

## 3.1 The defect, printed before any edit

`navionicsStorage.ts:3` — **one fixed, device-level key:**

```ts
const NAVIONICS_PURCHASE_KEY = 'navionics_purchase';
```

All four accessors used it verbatim. No uid anywhere in the file. Account A buys Pro; account B
signs in on the same handset; `loadNavionicsPurchase()` returns **A's receipt** and the overlay
gates true for B. The seven DFO stores were fixed for exactly this at S88; this one was missed.

## 3.2 The pattern, copied not invented

From `dfoStorageKeys.ts` (read-only), three things were taken verbatim in shape:

| DFO (S88) | Navionics (here) |
|---|---|
| `dfoKey(base, uid?)` → `` `${base}::${uid}` `` | `navionicsKey(uid?)` → `` `${base}::${uid}` `` |
| fail-closed `` `${base}::__anon__` `` when no identity | identical |
| **never** returns the bare base — a signed-out read must not touch legacy data | identical, same reasoning |

⚠ **ONE DELIBERATE DIVERGENCE, and the file list forced it.** The DFO side holds an **ambient**
uid that `useAuth`'s `onAuthStateChanged` assigns via `setActiveDfoUid`. Reproducing that here
would have required (a) editing the DFO sign-in path, which Garmin work may not touch, and (b)
changing `saveNavionicsPurchase`'s signature — and its caller is inside
`runNavionicsPurchase` (`navionicsPurchase.ts`), a file outside this phase's scope. Instead
`navionicsKey()` reads `auth.currentUser?.uid` directly. Same key shape, same fail-closed
behaviour, whole change contained on the Garmin side, **every existing caller's signature
unchanged.**

**The teardown escape hatch was copied too.** Each accessor takes an OPTIONAL explicit uid, for
the identical reason `clearLocalDfoStores(uid)` does: `deleteUser()` fires
`onAuthStateChanged(null)`, so after it `auth.currentUser` is null and an ambient read would
resolve to `::__anon__` and clear an empty namespace while the real receipt survived.

## 3.3 The legacy bare receipt — **DISCARDED, not migrated**

The DFO stores were **migrated** (adopt-on-first-sign-in, S88). This one is **discarded**, and the
difference is the point, not an inconsistency:

1. **A DFO store holds the user's own records.** A Navionics receipt is a **paid entitlement with
   no owner recorded inside it**. Adopting it to whoever signs in first would hand one account's
   purchase to another — *precisely the defect this phase exists to close*. Migration here would
   re-commit the bug under a new name.
2. **A legacy receipt may carry the wrong tier.** Until Phase 1 (`13f598a`) every restore
   provisioned ANNUAL regardless of what was bought, so a monthly subscriber's stored receipt can
   claim a year. Adopting it would preserve that error and `maybeRenewNavionics` would keep
   renewing the wrong tier off it.
3. **It costs the user nothing visible.** The Navionics overlay has never rendered — wrong host,
   non-existent token variable (S167 recon §A1) — so discarding removes nothing anyone has seen.
   **Pro access is untouched:** RevenueCat is the source of truth and is not involved.

**Mechanism:** `discardLegacyBareReceipt()` removes the bare key once per app process, on first
access from save / load / clear. The bare key is never read again and never written again. If the
removal throws, the swept flag stays false so the next call retries.

⚠ **The honest cost:** a user whose legacy receipt is discarded gets no automatic re-provision —
renewal needs an existing receipt, and there is no retry path (Phase 2 §2.7). Today that is
invisible because no chart has ever drawn. **The day tiles actually work, this needs a
re-provision-on-demand path** — logged as a residual below, not built.

## 3.4 What was built

| File | Change |
|---|---|
| `navionicsStorage.ts` | uid-namespaced key + exported `navionicsKey(uid?)`; optional uid on save/load/clear; legacy bare receipt discarded; `isNavionicsPurchaseActive` byte-unchanged (pure) |
| `useAuth.ts` | **two lines of behaviour** — `clearNavionicsPurchase()` before `signOut()`, and `clearNavionicsPurchase(deletedUid)` after `clearLocalDfoStores(deletedUid)`. Plus the import. Nothing else |
| `Garminmapbox.tsx` | mount-only check → mount **plus foreground**, via an `AppState` listener with a cancel guard and `sub.remove()` cleanup |

**Call order is load-bearing and is why sign-out reads the way it does.** `handleSignOut` was
`() => signOut(auth)`; it is now `async`, clearing **before** `signOut`. Clearing afterwards would
resolve to `::__anon__` and leave the real receipt on the device — the fix would have looked
right and done nothing.

## 3.5 Verify — the three things you asked to be true

| Claim | Why it now holds |
|---|---|
| **Two accounts on one device do not share an entitlement** | Every read and write goes through `navionicsKey()`, which resolves to `navionics_purchase::${uid}`. B's `loadNavionicsPurchase()` reads B's key; A's receipt is at A's key and is unreachable from B. The legacy shared key is deleted on first access, so there is no bare receipt left for anyone to inherit |
| **Sign-out clears it** | `handleSignOut` awaits `clearNavionicsPurchase()` **before** `signOut(auth)`, while `auth.currentUser` still resolves the right namespace |
| **Delete-account clears it** | `clearNavionicsPurchase(deletedUid)` runs beside `clearLocalDfoStores(deletedUid)`, using the uid captured **before** the destructive ladder — order-independent by construction |

⚠ **These are proven by construction and by the compiler, NOT by a test.** All 83 suites are
`utils`; this repo has no component tests and none of these three paths is covered by one. **They
need the walk** — §3.7.

## 3.6 ⚠ ONE THING I DID THAT BELONGS TO PHASE 4 — declared, not buried

The mount-check rewrite replaced this line:

```ts
console.log('🧭 Navionics check on mount — purchase:', purchase, '| navionicsActive =', active);
```

with one that logs **only the boolean**. That is Phase 4's second item ("remove the debug
console.log that prints the entire stored purchase record on every map mount"), done early.

I judged that keeping it was worse than the overreach: the effect now fires on **every
foreground**, so preserving it would have multiplied a full receipt dump — purchase id,
transaction id, expiry — across the log rather than leaving it as it was. **It is a strict
reduction, inside a permitted file, in the block I was already rewriting.** Flagging it because
the scope call is yours: say the word and I will restore the original line and let Phase 4 remove
it properly.

## 3.7 The walk — what only a device can prove

Nothing here is covered by a test. On one device:

1. Sign in as A → buy or restore Pro → confirm a receipt exists for A.
2. Sign out → sign in as B → open the chart screen. **B must not inherit A's entitlement.**
3. Sign back in as A. (⚠ Expect A's receipt to be **gone** — sign-out cleared it. That is the
   designed behaviour, not a fault. It is invisible today because tiles never draw.)
4. Delete-account on a signed-in user → confirm the receipt is gone and a coexisting account's is
   untouched.
5. Background the app on the chart screen, return to it, confirm the re-check fires
   (`🧭 Navionics check (foreground)`).

## 3.8 Residuals from Phase 3

1. ⚠ **No re-provision-on-demand path.** A cleared or discarded receipt is never rebuilt —
   renewal needs an existing receipt and nothing retries. Harmless while tiles do not render;
   **required before they do.** This is the same gap Phase 2 §2.7 names from the other side.
2. `navionicsKey()` is exported for future testability; nothing imports it yet.
3. A signed-out write lands in `::__anon__` and is never read back. Fail-closed by design,
   matching `dfoKey()`; it is dead storage, not a leak.
4. The receipt is not covered by DFO Cloud Backup, and should not be — it is Pro-side data on the
   `(default)` side. Noted so nobody later "fixes" it by reaching across.

## 3.9 Phase 3 commit block — Jonathon runs

Expected staged count: **4 files** — three modified, one gate doc.

```
cd ~/Desktop/LobsterLog
git add src/utils/navionicsStorage.ts
git add src/Hooks/useAuth.ts
git add src/screens/Garminmapbox.tsx
git add docs/GATE_S167_GARMIN_FIXES.md
git diff --cached --stat
```

```
git status --short src/utils/dfoStorageKeys.ts src/utils/dfoBackup.ts src/screens/HelpSupportScreen.tsx src/config/constants.ts
```

```
git commit -m "Namespace the Navionics receipt per user and clear it on sign-out and delete"
```

```
git push
```

```
git log --oneline -1
git log origin/main..HEAD --oneline
```

---

# PHASE 4 — CLEANUP

Phase 3 landed as **`3193080`**, pushed. One file this phase: `src/screens/Garminmapbox.tsx`.

**Item 2 of this phase — the debug `console.log` that dumped the whole purchase record — was
already done in Phase 3 and declared at §3.6.** It was accepted with that commit. Phase 4 is
therefore the tile URL alone.

## 4.1 What was there, printed before the edit

`Garminmapbox.tsx:323-331`, unmodified:

```tsx
{/* TODO(Aldo): replace with REAL Navionics tile URL + correct token placement.
    Current URL is a PLACEHOLDER — wrong host (this is the purchase API host, not a
    tile server) AND EXPO_PUBLIC_NAVIONICS_TOKEN is undefined (real vars are
    _TOKEN_IOS / _TOKEN_ANDROID). Tiles will NOT render until this is replaced. */}
{navionicsActive && (
    <Mapbox.RasterSource id="navionics-sandbox" tileUrlTemplates={[`https://developers-store-sandbox.navionics.com/tile/{z}/{x}/{y}?token=${process.env.EXPO_PUBLIC_NAVIONICS_TOKEN}`]}>
        <Mapbox.RasterLayer id="navionics-layer" sourceID="navionics-sandbox" style={{ rasterOpacity: 0.8 }} />
    </Mapbox.RasterSource>
)}
```

**On any device with a stored active receipt, that shipped a live request template reading
literally:**

```
https://developers-store-sandbox.navionics.com/tile/{z}/{x}/{y}?token=undefined
```

Two independent faults, both named in its own TODO since S47 and neither ever fixed: the host is
the **purchase API**, not a tile server; and `EXPO_PUBLIC_NAVIONICS_TOKEN` (unsuffixed) **is
defined nowhere and never has been**, so `${undefined}` was interpolated into the query string.
The overlay has never rendered on any build.

## 4.2 The route chosen — a marked disabled source, not deletion

Both were offered. **Kept as a disabled source**, because deleting the JSX would throw away the
one thing here that is genuinely correct: the raster-source/raster-layer wiring and its place in
the Mapbox child order. Rebuilding that from nothing, later, on someone else's Tuesday, is how the
next wrong URL gets invented.

```ts
const NAVIONICS_TILE_URL_TEMPLATE: string | null = null;
```

- **`null` is the single switch.** The overlay renders only when it is non-null; nothing else
  needs changing to turn charts on.
- **A broken URL cannot exist.** There is no string to be wrong, and no `process.env` read to
  interpolate `undefined` into anything.
- The dead URL survives **only inside the comment**, as the record of what was wrong with it —
  not as a value any code can reach.
- Source id renamed `navionics-sandbox` → `navionics-tiles`; "sandbox" described the purchase host
  that is no longer referenced. Inert — the source does not render.

⚠ **The comment states plainly that this constant may be the wrong SHAPE.** If Garmin's answer is
that the token goes in an HTTP **header**, a `tileUrlTemplate` cannot express it at all and this
becomes different wiring, not a filled-in string. Written down so nobody reads `null` as "just
paste the URL here".

## 4.3 What must come from Garmin before this can be switched on

Copied into the code comment so it is in front of whoever opens the file, not only in a doc:

1. the real tile endpoint and its `{z}/{x}/{y}` template;
2. whether the token goes in the query string or a header;
3. **which** credential authorises tiles — the developer token, or something in the purchase
   response this app does not currently capture.

Open with Aldo (cc Mauro) since S47. Full findings: `docs/RECON_S167_GARMIN_FULL.md` §A1 / §C2.

## 4.4 What was deliberately NOT touched

- **`EXPO_PUBLIC_NAVIONICS_TOKEN_IOS` / `_ANDROID`** — the real, defined purchase tokens, sent as
  `X-navionics-developer-token` by `navionicsPurchase.ts:99-102`. Untouched. Only the phantom
  unsuffixed name is gone.
- **`NAVIONICS_PURCHASE_URL`** (`navionicsPurchase.ts:9-10`) — a real, working endpoint that has
  returned HTTP 201. Untouched. It shares a hostname with the deleted placeholder, which is how
  the placeholder came to exist; deleting it would have broken the purchase path.
- `navionicsActive` and its foreground re-check — Phase 3's work, unchanged.

## 4.5 Phase 4 commit block — Jonathon runs

Expected staged count: **2 files** — one source file, one gate doc.

```
cd ~/Desktop/LobsterLog
git add src/screens/Garminmapbox.tsx
git add docs/GATE_S167_GARMIN_FIXES.md
git diff --cached --stat
```

```
git status --short src/utils/dfoStorageKeys.ts src/utils/dfoBackup.ts src/screens/HelpSupportScreen.tsx src/config/constants.ts
```

```
git commit -m "Remove the placeholder Navionics tile URL and disable the chart overlay explicitly"
```

```
git push
```

```
git log --oneline -1
git log origin/main..HEAD --oneline
```

---

# PHASE 5 — MAPBOX ATTRIBUTION AND THE TELEMETRY OPT-OUT

One file: `src/screens/Garminmapbox.tsx`. Opened after `5863de0`.

**The point of this phase is the telemetry opt-out, not the logo.** The Mapbox SDK sends location
and usage telemetry **by default**, and Mapbox's terms require an individual opt-out for end users.
That opt-out lives *inside* the attribution control. So `attributionEnabled={false}` was not hiding
a credit — **it removed the only way a harvester could turn telemetry off.**

## 5.1 As it stood (printed before the edit)

The map component is now at `:340-350` (Phase 4 added ~30 lines above it, so the `:294-295` in the
brief has shifted — the props themselves were at `:348-349`):

```tsx
<Mapbox.MapView
    ref={mapRef}
    style={{ flex: 1 }}
    styleURL={Mapbox.StyleURL.Satellite}
    onCameraChanged={(e) => { … }}
    logoEnabled={false}
    attributionEnabled={false}
>
```

## 5.2 What changed

```tsx
logoEnabled={true}
logoPosition={{ bottom: 8, left: 8 }}
attributionEnabled={true}
attributionPosition={{ bottom: 8, right: 8 }}
```

Both position props verified against the INSTALLED SDK, not assumed —
`@rnmapbox/maps` v10.2.10, `MapView.d.ts:169-185`, type `OrnamentPositonProp` (a corner offset pair,
`utils/index.d.ts:20-26`). **Nothing else about the map, the layers, the camera or the pins was
touched** — the diff is those two lines out, four lines plus a comment in.

## 5.3 Where they land, and what they overlap — nothing

Every absolutely-positioned control on this screen, measured from the source:

| Control | Position | Occupies |
|---|---|---|
| Tide card + heat-map card (+ DEV button) | `top: 50, left: 20`, width 140 | top-left, y ≈ 50→260 |
| Close (X) | `top: 50, right: 20` | top-right, y ≈ 50→102 |
| Zoom + / − / locate column | `top: 110, right: 20` | right, y ≈ 110→280 |
| **Drop Pin & Log** | `bottom: 40`, `alignSelf: 'center'` | **bottom-CENTRE**, from 40 up to ≈ 96 |

**Bottom-left and bottom-right are the only unoccupied corners**, which is where they went.

- **Logo → bottom-left**, occupying roughly y = 8→29 from the bottom edge.
- **Attribution (i) → bottom-right**, same band.
- **Clearance to the drop-pin button: ≈ 11 pt vertical.** The button's lower edge is at 40; the
  ornaments top out near 29. They are also horizontally in the corners while the button is centred,
  so the two never share screen space in either axis.
- **Nothing overlaps.** Not the pin button, not the tide stack, not the zoom column, not the close
  button — all four of those are in the top half or dead centre.

⚠ **One thing only a device settles:** `bottom: 8` sits near the iOS home-indicator gesture strip.
The indicator is horizontally centred (≈ 140 pt wide), so both corners fall outside it and taps
should land — but bottom-edge gesture areas are the classic place for a tap to be eaten. **Confirm
the (i) is tappable on a real iPhone**; if it fights the gesture, raising both to `bottom: 20` still
clears the pin button horizontally.

## 5.4 ⚠⚠ THE OPT-OUT IS REACHABLE ON ANDROID. ON iOS IT IS NOT — AND THE FIX IS OUT OF SCOPE

The SDK's own documentation on `attributionEnabled` (`MapView.d.ts:167-169`) states:

> *"Enable/Disable attribution on map. **For iOS you need to add
> `MGLMapboxMetricsEnabledSettingShownInApp=YES` to your Info.plist**"*

**That key is ABSENT from this project** — verified in both places it could live:

| File | `MGLMapboxMetricsEnabledSettingShownInApp` |
|---|---|
| `ios/LobsterLog/Info.plist` (the file the build actually reads) | **absent** |
| `app.config.js` → `ios.infoPlist` | **absent** |

So today:

| Platform | Attribution control | Telemetry opt-out |
|---|---|---|
| **Android** | (i) button, bottom-right | ✅ **Reachable — 2 taps.** Tap (i) → the native attribution dialog lists *Telemetry Settings* → opt out from there |
| **iOS** | (i) button, bottom-right | ❌ **NOT reachable.** Without the Info.plist key the attribution sheet shows attribution links only; the in-app metrics toggle is not offered |

**This phase makes the opt-out reachable on Android and satisfies the visible-logo/attribution
requirement on both. It does NOT deliver the iOS opt-out.** Closing that needs one key added to
`ios/LobsterLog/Info.plist` **and** to `app.config.js`'s `infoPlist` block — ⚠ note those two are
already documented in `app.config.js` as a knowingly-accepted drift pair (S151, defect 99), so both
must move together or the next prebuild silently drops it.

**Both files are outside this phase's permitted list, so nothing was touched. STOPPING AND ASKING,
per the standing rule.** This is not a judgment call I get to make quietly — it is a native-config
change on the iOS build, and the blast-radius call is Jonathon's.

`Mapbox.setTelemetryEnabled(false)` also exists in this SDK and was **deliberately not used**: it
would decide for the harvester instead of offering him the choice Mapbox's terms require, and the
brief said restore the opt-out, not force the setting.

## 5.5 Verification note — tsc is not the bundler

The explanatory comment sits **inside the JSX opening tag**, between attributes. That is legal but
unusual, and `tsc` accepting it does not prove Metro will. **Proven separately** by running the
file through `@babel/core` with this project's own `babel.config.js`: parse and transform OK,
25,567 bytes emitted, and all four ornament props confirmed present in the output.

## 5.6 Phase 5 commit block — Jonathon runs

Expected staged count: **2 files** — one source file, one gate doc.

```
cd ~/Desktop/LobsterLog
git add src/screens/Garminmapbox.tsx
git add docs/GATE_S167_GARMIN_FIXES.md
git diff --cached --stat
```

```
git status --short src/utils/dfoStorageKeys.ts src/utils/dfoBackup.ts src/screens/HelpSupportScreen.tsx src/config/constants.ts ios/LobsterLog/Info.plist app.config.js
```

```
git commit -m "Show the Mapbox logo and attribution control so the telemetry opt-out is reachable"
```

```
git push
```

```
git log --oneline -1
git log origin/main..HEAD --oneline
```

---

# PHASE 6 — THE iOS METRICS KEY (closes §5.4)

Phase 5 landed as **`8b7e91d`**. This phase answers the question §5.4 stopped on. Founder ruling:
**add the key, both files, they move together.**

Two files, both native config, both outside every earlier phase's scope:
`ios/LobsterLog/Info.plist` and `app.config.js` (**`infoPlist` block only**).

## 6.1 Printed before the edit

**`app.config.js` version block (`:1-12`)** — the thing that must not move. Captured as
`sha256 ce94ab8c2d5b5868484c090b7cbac7030798b6695f5822e945b6fd84af3e3313` **before** any edit,
including `version: "1.10.0"` and the two comments recording that `buildNumber` and `versionCode`
are deliberately absent under `appVersionSource: "remote"`.

**`app.config.js` infoPlist block** — five keys, ending
`UIFileSharingEnabled: true, LSSupportsOpeningDocumentsInPlace: true` with **no trailing comma**.

**`ios/LobsterLog/Info.plist`** — tab-indented, keys in alphabetical order, booleans as `<true/>`.
34 `<key>` entries. `MGLMapboxMetricsEnabledSettingShownInApp` sorts between
`LSSupportsOpeningDocumentsInPlace` and `NSAppTransportSecurity`, which is exactly where it went —
**the file's existing shape, not a new convention.**

## 6.2 What changed

Each file gained the key plus a comment in that file's own idiom (XML comment / JS comment),
pointing at its twin and repeating the S151 drift rule already written there: *if you change one,
change the other.*

- `ios/LobsterLog/Info.plist` — +9 lines, `<key>` count **34 → 35**.
- `app.config.js` — +7 lines / −1 (the comma), infoPlist keys **5 → 6**.

`setTelemetryEnabled` remains **unused** — confirmed by grep. Forcing the setting would replace the
harvester's choice; the key restores the choice, which is what Mapbox's terms require.

## 6.3 ⚠ The version block is byte-identical — proven three ways

1. **Hash of `:1-12` after the edit:** `ce94ab8c…af3e3313` — **identical to the pre-edit capture.**
2. **Direct `diff` of the block, backup vs working file:** no output.
3. **`diff` of every version-related line in the whole file, content-only:** identical.
   *(A first run of check 3 compared `grep -n` output and showed one delta — a line NUMBER moving
   58 → 64, because six lines were inserted above it. That is displacement, not modification.
   Re-run without line numbers to confirm the content is untouched. Recorded because a green that
   needed re-reading should be on the record, not quietly replaced.)*

**Runtime confirmation** — `node -e "require('./app.config.js')"` resolves:

| Value | Result |
|---|---|
| `expo.version` | `"1.10.0"` — unchanged |
| `expo.ios.buildNumber` | `undefined` — still deliberately absent |
| `expo.android.versionCode` | `undefined` — still deliberately absent |
| `infoPlist.MGLMapboxMetricsEnabledSettingShownInApp` | `true` |

## 6.4 Gates

| Gate | Result |
|---|---|
| `plutil -lint ios/LobsterLog/Info.plist` | **OK** — still a valid plist |
| `plutil -extract MGLMapboxMetricsEnabledSettingShownInApp raw` | `true` |
| S151 pair still intact (`UIFileSharingEnabled`, `LSSupportsOpeningDocumentsInPlace`) | `true` / `true` |
| `app.config.js` evaluates in node | ✅ |
| tsc | **33 (baseline)** |
| jest | **83 suites / 902 tests** |
| Modified files | exactly the two config files; **nothing under `src/`** |

## 6.5 Where this leaves the telemetry opt-out

| Platform | Attribution control | Telemetry opt-out |
|---|---|---|
| Android | (i), bottom-right | ✅ 2 taps — (i) → *Telemetry Settings* |
| **iOS** | (i), bottom-right | ✅ **now offered** — (i) → the attribution sheet carries the metrics toggle |

⚠ **This is config, and config is only proven on a build.** The key changes what the iOS
attribution sheet renders; nothing in this repo can demonstrate that. **It needs an iOS build and a
tap on the (i).** Until then this is "correct per Mapbox's documented requirement", not "seen
working" — and it joins the S167-G walk list, which nothing has yet been through.

⚠ **The drift pair is now three keys wide.** `UIFileSharingEnabled`,
`LSSupportsOpeningDocumentsInPlace` and now `MGLMapboxMetricsEnabledSettingShownInApp` are each
declared twice — in the plist the build reads, and in the `app.config.js` a future `expo prebuild`
would read. That duplication was knowingly accepted at S151 and is unchanged in kind, only wider.

## 6.6 Phase 6 commit block — Jonathon runs

Expected staged count: **3 files** — two config files, one gate doc.

```
cd ~/Desktop/LobsterLog
git add ios/LobsterLog/Info.plist
git add app.config.js
git add docs/GATE_S167_GARMIN_FIXES.md
git diff --cached --stat
```

```
git diff --cached app.config.js
```

```
git commit -m "Add the iOS Mapbox metrics key so the attribution sheet offers the telemetry opt-out"
```

```
git push
```

```
git log --oneline -1
git log origin/main..HEAD --oneline
```

The second block prints the whole `app.config.js` staged diff — read it before committing and
confirm the only changes are inside `infoPlist`.

---

# PHASE 7 — MOVE THE LOGO ABOVE THE DROP-PIN BUTTON

Phase 6 landed as **`d00ea51`**. One file, one prop: `logoPosition`. The (i) is untouched.

## 7.1 The measurement, from source not from guesswork

`Garminmapbox.tsx:459-464` — the wrapper is `position:'absolute', bottom: 40, alignSelf:'center'`;
the button is `paddingVertical: 16`, `paddingHorizontal: 32`, with a row of
`<MapPin size={24}>` + `<Text fontSize:18 bold>`.

| Quantity | Value | Where it comes from |
|---|---|---|
| Vertical padding | 16 + 16 = **32** | `paddingVertical: 16` |
| Content row | **24** | `max(MapPin 24, 18 pt text ≈ 22)` — the icon is the taller of the two |
| **Button height** | **56** | 32 + 24 |
| Button box | **40 → 96** from the bottom edge | `bottom: 40` + 56 |
| Visible shadow halo | to ≈ **106** | `shadowRadius: 10`, `shadowOpacity: 0.3`, **no offset** → spreads evenly |

**⚠ This is why the suggested `bottom: 100` was not taken.** It clears the button *box* by 4 pt but
lands **inside the shadow halo**. Adjusted to **`bottom: 112`**, using the brief's own allowance.

## 7.2 Measured clearances at `{ bottom: 112, left: 8 }`

The Mapbox wordmark ornament is ≈ 23 pt tall and ≈ 85–88 pt wide.

| Clearance | Value |
|---|---|
| **Logo → button top edge** | **16 pt** (112 − 96) |
| Logo → button's shadow envelope | ≈ 6 pt (112 − 106) |
| **Logo → bottom of screen** | **112 pt** |
| Logo occupies | ≈ 112 → 135 from the bottom edge |
| Logo horizontal | x ≈ 8 → 96 |

**Nothing can occlude it.** The button is bottom-**centre** and now in a different vertical band
entirely, so the two never share space in either axis. The tide/heat-map stack and the
close/zoom/locate controls are all top-anchored — on the shortest supported screen (320×568) they
end ≈ 300 pt from the top, i.e. ≈ 268 from the bottom, still far above the logo's 135. The
attribution (i) stays at `{ bottom: 8, right: 8 }` — opposite corner, different band.

Moving the logo up also takes it clear of the iOS home-indicator gesture strip, which was the one
caveat recorded at §5.3 for the old `bottom: 8`.

## 7.3 Full wordmark unclipped — what is proven, and what is not

**Proven from geometry:** the wordmark needs ≈ 88 pt of width from `left: 8`, ending at x ≈ 96. The
narrowest device this app supports is 320 pt wide, so there is ≈ 224 pt of spare width; and there
is no sibling control anywhere in that band to overlap it. Vertically it sits 112 pt off the bottom
inside a `flex: 1` MapView, nowhere near an edge.

⚠ **NOT proven: that it renders unclipped.** That is a device observation and nothing in this repo
can make it. Geometry says there is nothing to clip it against and ample room — **confirm on glass**
that the full "mapbox" wordmark is drawn, not truncated, on both platforms. It joins the S167-G walk
list.

## 7.4 Gates

| Gate | Result |
|---|---|
| tsc | **33 (baseline)**; `Garminmapbox.tsx` still exactly its pre-existing **6** |
| Babel (bundler truth, not just tsc) | transform OK, 25,569 bytes; `bottom: 112` and `attributionPosition` both present in output |
| jest | **83 suites / 902 tests** |
| Scope | **1 file modified**, `src/screens/Garminmapbox.tsx` |
| (i) untouched | `attributionPosition={{ bottom: 8, right: 8 }}` unchanged |

## 7.5 Phase 7 commit block — Jonathon runs

Expected staged count: **2 files** — one source file, one gate doc.

```
cd ~/Desktop/LobsterLog
git add src/screens/Garminmapbox.tsx
git add docs/GATE_S167_GARMIN_FIXES.md
git diff --cached --stat
```

```
git commit -m "Move the Mapbox logo above the drop-pin button"
```

```
git push
```

```
git log --oneline -1
git log origin/main..HEAD --oneline
```

---

# S167-G — WHERE IT STANDS

| Phase | Commit | State |
|---|---|---|
| 1 — restore tier | `13f598a` | pushed |
| 2 — silent failures | `ef7ae1e` | pushed |
| 2b — status in the ref code | `45529f3` | pushed |
| 3 — per-user receipt | `3193080` | pushed |
| 4 — tile URL | `877869c` | pushed |

Full range **`4e2346f..877869c`**, five commits, working tree clean, `origin/main..HEAD` empty.

**FINAL FENCE PROOF, whole run:** `git diff --stat 4e2346f..877869c` over `HelpSupportScreen.tsx`,
`config/constants.ts`, `dfoStorageKeys.ts`, `dfoBackup.ts`, `FullDfoForm.tsx`, `DfoDemoScreen.tsx`,
`PrivacyNoticeModal.tsx`, `AttestationModal.tsx`, `en/dfo.json`, `fr/dfo.json` and `assets/docs/`
returns **EMPTY**. The DFO side carries no Garmin-era change. The nine files S167-G touched are the
Navionics utils, the purchase hook, the paywall modal, the Pro map screen, `useAuth` (two clear
calls), and new keys in `common.json` only.

**⚠ NOT WALKED.** Nothing in S167-G has been exercised on a device. All 83 jest suites are
`utils`; not one of these paths — restore, purchase failure, sign-out, delete-account, the map
effect — is covered by a test, and this repo has no component tests. **The §3.7 walk is the only
evidence that will ever exist for Phase 3, and Phase 2's wording has never been seen on glass.**
With the signing credential absent from `.env`, any sandbox purchase or restore on a test build
now produces **LL-CHART-01** — which is the cheapest way to see the notice.

**Residuals carried out of S167-G, none of them built:**

1. ⚠ **No retry / re-provision-on-demand path anywhere.** A failed first purchase is permanent:
   renewal needs an existing receipt, and a Pro user cannot reach Restore Purchases. This is why
   the Phase-2 notice says *email us* rather than *try again*, and why a Phase-3 discarded receipt
   is never rebuilt. **Required before tiles ever render; harmless until then.**
2. Renewal failures are silent by design (Phase 2 §2.6) — visible only in the console.
3. The Phase-1 unresolvable-tier branch provisions nothing; a monthly subscriber who restored
   before `13f598a` still holds a wrong-tier receipt, which Phase 3 now discards on first access.
4. Two copies of the support address (Garmin side + DFO side), by founder ruling. Never reconcile
   them by reaching across the fence.
5. The FR strings added in Phase 2 are best-effort and belong on the proofreader pile.
6. The Navionics integration remains, as the recon found it, blocked on Garmin: no SDK, no tile
   endpoint, no token-placement answer, no Box access.

---

# VERIFY TABLE

| # | Phase | Check | Method | Result |
|---|---|---|---|---|
| 1 | 1 | Function printed verbatim before any change | `Read src/Hooks/usePurchases.ts` | ✅ `:99-115` reproduced at §1.1, byte-for-byte |
| 2 | 1 | Real file path confirmed (prompt said lowercase `hooks/`) | `find`/`ls` on `src/` | ✅ Actual path is `src/Hooks/usePurchases.ts` — capital H, S86 gotcha. Recorded at the top of this doc |
| 3 | 1 | Tier fields on the restored entitlement enumerated from the INSTALLED SDK, not from memory | read `node_modules/react-native-purchases/dist/index.d.ts` (v9.7.6) | ✅ `productIdentifier` present; `periodType` is NORMAL/INTRO/TRIAL and carries **no** duration; entitlement carries no `StoreProduct` |
| 4 | 1 | `packageType` + `product.identifier` exist on `PurchasesPackage` | same typings + existing use at `PaywallModal.tsx:49,58-75` | ✅ Both present and already relied on in shipped code |
| 5 | 1 | Store product IDs searched for across the whole repo | grep excluding node_modules/.git/vendor/dist; `constants.ts` read in full | ✅ **Not present anywhere.** Only Garmin's two product UUIDs exist (`navionicsPurchase.ts:6-7`) |
| 6 | 1 | `Purchases.getProducts` exists in the installed SDK and returns products carrying a period | read `react-native-purchases/dist/purchases.d.ts:199` + `offerings.d.ts:166` | ✅ `getProducts(string[]) => Promise<PurchasesStoreProduct[]>`; `subscriptionPeriod: string \| null` |
| 7 | 1 | Backup taken BEFORE the edit and proven identical | `cp` then `shasum -a 256` on both | ✅ Both `1493b020…ec1d28` at time of copy |
| 8 | 1 | tsc gate — no new errors, none in the touched file | `npx tsc --noEmit` | ✅ **33 total (baseline), 0 in `usePurchases.ts`** |
| 9 | 1 | jest gate | `npx jest` | ✅ **83 suites / 902 tests, all passed** |
| 10 | 1 | jest baseline provably unmoved by this edit | grep every test dir for any reference to `usePurchases` / `Hooks/` | ✅ Zero references. The one file in `src/Hooks/__tests__/` (`deleteAccountExportOrder`) does not touch it — the suite cannot have been shifted by this change |
| 11 | 1 | Only the intended file changed | `git diff --stat` | ✅ 1 file, 60+/4− |
| 12 | 1 | No guess left anywhere in the new path | read `navionicsProductForPeriod` + both lookups | ✅ Every unrecognised duration and every unmatched package returns `null`; the caller provisions nothing on `null` |
| 13 | 1 | Purchase logic untouched | `git diff src/utils/navionicsPurchase.ts` | ✅ Empty — Phase 1 changed no purchase logic and no call site other than restore |
| 14 | 1 | No key material or `.env` value printed in this document | manual re-read of every quoted block | ✅ The only quoted code is the restore function; it contains no secrets |
| 15 | 2 | All four return-null paths printed before any edit | `sed` on `navionicsPurchase.ts` | ✅ Reproduced at §2.1 with guards and line numbers |
| 16 | 2 | All call sites printed before any edit | `sed` on all four files | ✅ Reproduced at §2.2 — 2 `void`, 2 `await`, **4 discards** |
| 17 | 2 | Every failure has a DISTINCT reason | read the union + the five return sites | ✅ 5 reasons, one per cause; each return site replaced with an asserted-unique match |
| 18 | 2 | The one remaining `return null` is not a provisioning path | `grep -n "return null"` | ✅ Single hit, `:49` `generateGarminEncryptedTransaction` — untouched |
| 19 | 2 | A new reason cannot go unmapped and silent | both maps typed `Record<NavionicsFailureReason, …>` | ✅ Compiler-enforced exhaustiveness on code AND body |
| 20 | 2 | No hardcoded user-facing strings | read `navionicsNotice.ts` | ✅ Every user string is `i18next.t(...)`; only the email and the ref codes are literals |
| 21 | 2 | EN/FR key sets symmetric | JSON parse both files | ✅ 4 keys each, identical sets |
| 22 | 2 | **HelpSupportScreen reverted to committed state** | `git status --short` + `git diff` on the file | ✅ **Both EMPTY.** Byte-identical to `13f598a` |
| 23 | 2 | **`config/constants.ts` reverted to committed state** | `git status --short` + `git diff` on the file | ✅ **Both EMPTY**; `grep -c SUPPORT_EMAIL` = **0** |
| 24 | 2 | The notice module reaches into nothing DFO-side | `grep "^import\|require(" navionicsNotice.ts` | ✅ Only `react-native`, `i18next`, and a type from `navionicsPurchase` |
| 25 | 2 | No pre-existing i18n key touched | machine diff of every top-level section vs `HEAD` | ✅ EN 11→12, FR 12→13; **added `['charts']`, removed `[]`, pre-existing sections modified: `[]`** |
| 26 | 2 | Locale diffs are pure addition | count `-` lines in the locale diff | ✅ **0** |
| 27 | 2 | FR typographic invariants held | grep + codepoint scan | ✅ straight apostrophes across `fr/` still **0**; narrow/nbsp **0** in the new block |
| 28 | 2 | Fence: only allowed files changed | `git diff --stat` | ✅ 6 files — Navionics utils, purchase hook, paywall, Pro map, 2 locale files. Zero DFO-side |
| 29 | 2 | tsc gate | `npx tsc --noEmit` | ✅ **33 total (baseline)**; per-file counts identical to baseline; **0 in any Navionics file** |
| 30 | 2 | jest gate | `npx jest` | ✅ **83 suites / 902 tests, all passed** |
| 31 | 2 | Backup fault + vacuous green disclosed, not buried | §2.9 | ✅ `basename` collision caught by the checksum gate; zsh word-split "OK" re-run explicitly |
| 32 | 3 | `navionicsStorage.ts` printed in full before edit | `cat -n` | ✅ 39 lines, one fixed key at `:3`, no uid anywhere — reproduced at §3.1 |
| 33 | 3 | Sign-out and delete-account call sites printed before edit | `grep` + `sed` on `useAuth.ts` | ✅ `handleSignOut` `:102` a one-line arrow; delete ladder `:138-220` with `deleteUser` at `:208` |
| 34 | 3 | **`dfoStorageKeys.ts` READ, never edited** | `git diff --stat src/utils/dfoStorageKeys.ts` | ✅ **empty** |
| 35 | 3 | Key shape matches the S88 pattern | side-by-side at §3.2 | ✅ `` `${base}::${uid}` `` + fail-closed `::__anon__`, never the bare base |
| 36 | 3 | Every accessor routes through the namespaced key | read all four functions | ✅ save / load / clear all call `navionicsKey(uid)`; no literal key survives except the legacy base, used only for deletion |
| 37 | 3 | No existing caller signature broken | tsc + read call sites | ✅ uid arg is optional everywhere; `navionicsPurchase.ts` untouched and still compiles — `git diff` on it is empty |
| 38 | 3 | Clear runs BEFORE identity is destroyed, both paths | read the diff | ✅ sign-out: clear then `signOut`. delete: `clearNavionicsPurchase(deletedUid)` with the pre-capture uid |
| 39 | 3 | `useAuth.ts` diff is ONLY the clear calls + import | `git diff src/Hooks/useAuth.ts` | ✅ 3 hunks: one import line, `handleSignOut`, one call after `clearLocalDfoStores`. No other line touched |
| 40 | 3 | Foreground re-check registered and cleaned up | read the effect | ✅ `AppState.addEventListener('change')`, fires on `'active'`; `sub.remove()` + `cancelled` guard in cleanup |
| 41 | 3 | Legacy receipt decision recorded with reasoning | §3.3 | ✅ DISCARD, three reasons, mechanism, and the honest cost stated |
| 42 | 3 | Fence — no DFO-side file touched | `git status --short` on 4 DFO files | ✅ **blank** (dfoStorageKeys, dfoBackup, HelpSupportScreen, constants) |
| 43 | 3 | Scope — only permitted files changed | `git diff --stat` | ✅ 3 files: `navionicsStorage.ts`, `useAuth.ts`, `Garminmapbox.tsx` |
| 44 | 3 | tsc gate | `npx tsc --noEmit` | ✅ **33 total (baseline)**, per-file counts identical to baseline, **0 in `navionicsStorage`/`useAuth`** |
| 45 | 3 | jest gate | `npx jest` | ✅ **83 suites / 902 tests, all passed** |
| 46 | 3 | ⚠ Phase-4 overreach declared, not buried | §3.6 | ✅ The mount-log now prints only the boolean. Strict reduction, permitted file, declared for your ruling |
| 47 | 3 | ⚠ The three claims are NOT test-proven | §3.5 / §3.7 | ⚠ **By construction and compiler only.** All 83 suites are `utils`; no component test covers sign-out, delete, or the map effect. **The walk at §3.7 is the only evidence** |
| 48 | 4 | Placeholder block printed before edit | `grep -n -A 12` | ✅ Reproduced verbatim at §4.1, including the `${undefined}` interpolation |
| 49 | 4 | **No code reference to the phantom variable remains** | `grep -rn "process\.env\.EXPO_PUBLIC_NAVIONICS_TOKEN\b" src/` | ✅ **blank.** The name survives only inside an explanatory comment |
| 50 | 4 | **No broken URL remains in code** | `grep -rn "navionics.com" src/`, comments excluded | ✅ The only code hit is `NAVIONICS_PURCHASE_URL` — the real, working purchase endpoint |
| 51 | 4 | The real purchase tokens still wired | `grep` for `_TOKEN_IOS` / `_TOKEN_ANDROID` | ✅ Both intact at `navionicsPurchase.ts:101-102` |
| 52 | 4 | Purchase path untouched | `git diff --stat src/utils/navionicsPurchase.ts` | ✅ empty |
| 53 | 4 | Overlay cannot render, and cannot build a request | read the guard | ✅ `NAVIONICS_TILE_URL_TEMPLATE !== null` with the constant `null`; no string exists to be wrong |
| 54 | 4 | tsc gate | `npx tsc --noEmit` | ✅ **33 total (baseline)**; `Garminmapbox.tsx` still **6**, its pre-existing S52 count — no new error from the constant or the guard |
| 55 | 4 | jest gate | `npx jest` | ✅ **83 suites / 902 tests, all passed** |
| 56 | 4 | Scope + fence | `git diff --stat`, `git status --short` on 4 DFO files | ✅ **1 file changed** (`Garminmapbox.tsx`); DFO fence **blank** |
| 57 | all | ⚠ Nothing in S167-G has been walked on a device | — | ⚠ **Open.** No test covers any of these paths; see "WHERE IT STANDS" |
| 58 | 5 | Map component + props printed before edit | `Read` / `grep -n` | ✅ §5.1. Props were at `:348-349`, not the brief's `:294-295` — Phase 4 shifted them ~30 lines |
| 59 | 5 | Position props verified in the INSTALLED SDK, not assumed | read `@rnmapbox/maps` v10.2.10 `MapView.d.ts:169-185`, `utils/index.d.ts:20-26` | ✅ `logoPosition` / `attributionPosition` exist; `OrnamentPositonProp` is a corner offset pair |
| 60 | 5 | Placement clears every control | enumerated all 4 absolute controls from source | ✅ §5.3 — ornaments in the two free corners; ≈11 pt below the bottom-centre pin button, no overlap in either axis |
| 61 | 5 | ⚠ iOS telemetry key checked, not assumed | `grep` on `ios/LobsterLog/Info.plist` **and** `app.config.js` | ⚠ **ABSENT from both.** iOS opt-out NOT delivered — §5.4, stopped and asked |
| 62 | 5 | `setTelemetryEnabled` not used | `grep -rn setTelemetryEnabled src/ App.tsx` | ✅ none. Forcing the setting would replace the user's choice, not restore it |
| 63 | 5 | Nothing else about the map changed | `git diff` | ✅ Two lines out, four props + comment in. Camera, layers, pins, overlay guard untouched |
| 64 | 5 | **Babel — not just tsc** — parses the JSX-internal comment | `@babel/core` transform with this project's `babel.config.js` | ✅ OK, 25,567 bytes, all four ornament props present in output |
| 65 | 5 | tsc gate | `npx tsc --noEmit` | ✅ **33 (baseline)**; `Garminmapbox.tsx` still exactly its pre-existing 6, none new |
| 66 | 5 | jest gate | `npx jest` | ✅ **83 suites / 902 tests, all passed** |
| 67 | 5 | Scope + fence | `git diff --stat`, `git status --short` on 6 files | ✅ 1 file changed; DFO fence blank; `Info.plist` and `app.config.js` **untouched** |
| 68 | 6 | Version block + infoPlist block printed before edit | `sed -n '1,12p'` / `sed -n '13,33p'` | ✅ §6.1; version block hashed **before** any edit |
| 69 | 6 | **Version block byte-identical after** | hash compare + direct `diff` vs backup | ✅ `ce94ab8c…af3e3313` both sides; `diff` silent |
| 70 | 6 | `version` / `buildNumber` / `versionCode` untouched | content-only `diff` + `node` evaluation | ✅ `1.10.0`; both counters still `undefined` (deliberately absent). ⚠ A first line-numbered check showed a 58→64 shift — displacement from inserted lines, not modification; re-run without line numbers. Disclosed at §6.3 |
| 71 | 6 | Key placed in each file's EXISTING shape | read both files | ✅ plist: tab-indented, alphabetical between `LSSupports…` and `NSAppTransportSecurity`, `<true/>`. config: JS boolean, after the S151 pair, comma added |
| 72 | 6 | plist still valid | `plutil -lint` | ✅ **OK**; `<key>` count 34 → 35 |
| 73 | 6 | The key resolves in both files | `plutil -extract` + `node -e require` | ✅ `true` in the plist; `true` in the resolved Expo config (infoPlist keys 5 → 6) |
| 74 | 6 | S151 pair not disturbed | `plutil -extract` ×2 | ✅ `true` / `true` |
| 75 | 6 | `setTelemetryEnabled` still unused | `grep -rn src/ App.tsx` | ✅ blank — the choice is offered, never forced |
| 76 | 6 | Scope | `git status --porcelain`, modified only | ✅ exactly `app.config.js` + `ios/LobsterLog/Info.plist`; **nothing under `src/`** |
| 77 | 6 | tsc / jest | `npx tsc --noEmit`, `npx jest` | ✅ **33 (baseline)** / **83 suites, 902 tests** |
| 78 | 6 | ⚠ Config is only proven on a build | — | ⚠ **Open.** Needs an iOS build + a tap on the (i) to confirm the toggle renders |
| 79 | 7 | Button height MEASURED from source, not assumed | read `Garminmapbox.tsx:459-464` | ✅ 16+16 padding + `max(icon 24, 18pt text ≈22)` = **56**; box occupies 40→96 |
| 80 | 7 | The suggested value was checked, not just accepted | shadow maths | ⚠ `bottom: 100` clears the box by 4 but sits **inside** the `shadowRadius: 10` halo (≈106) → adjusted to **112** per the brief's allowance |
| 81 | 7 | Clearances stated | §7.2 | ✅ **16 pt** logo→button, ≈6 pt to the shadow envelope, **112 pt** to the bottom edge |
| 82 | 7 | Nothing can occlude the logo | enumerated every control | ✅ button is bottom-centre in a different band; all other controls top-anchored (end ≈268 from bottom even on a 568-tall screen); (i) is the opposite corner |
| 83 | 7 | One position, both platforms | single `logoPosition` prop | ✅ no platform branch |
| 84 | 7 | (i) left where it was | `grep` | ✅ `attributionPosition={{ bottom: 8, right: 8 }}` unchanged |
| 85 | 7 | Full wordmark unclipped | geometry only | ⚠ **Room proven** (needs ≈88 pt from left:8; narrowest device 320 pt wide; nothing in the band). **Rendering NOT proven — device observation, on the walk list** |
| 86 | 7 | Babel, not just tsc | `@babel/core` with project config | ✅ OK, 25,569 bytes, `bottom: 112` present in output |
| 87 | 7 | tsc / jest / scope | gates | ✅ **33 (baseline)**, Garminmapbox still its 6; **83 suites / 902 tests**; **1 file modified** |
