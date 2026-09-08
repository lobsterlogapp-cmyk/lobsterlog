# GATE S167-G — THREE NAVIONICS FIXES

**Opened 2026-09-08. Phased build, STOP at every gate. NO state-changing git by Claude — every
commit is a vetted literal block for Jonathon to run.**

Recon basis: `docs/RECON_S167_GARMIN_FULL.md` (read-only, same day, HEAD `4e2346f`).

⚠ No key material, token value, or `.env` value appears anywhere in this document.

---

## SCOPE

| Phase | Subject | Status |
|---|---|---|
| 1 | The restore tier guess — `usePurchases.ts` restore defaults to annual | **BUILT — awaiting his word** |
| 2 | Silent failures — four `return null` paths, three discarding call sites | NOT STARTED |
| 3 | The shared chart entitlement — un-namespaced `navionics_purchase` key | NOT STARTED |
| 4 | Cleanup — placeholder tile URL + debug console.log | NOT STARTED (gated on 1–3 accepted) |

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

*Not started. Gated on Phase 1.*

---

# PHASE 3 — THE SHARED CHART ENTITLEMENT

*Not started. Gated on Phase 2.*

---

# PHASE 4 — CLEANUP

*Not started. Gated on Phases 1–3 being accepted.*

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
| 15 | 2 | — | — | pending |
| 16 | 3 | — | — | pending |
| 17 | 4 | — | — | pending |
