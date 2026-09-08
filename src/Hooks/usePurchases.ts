import { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { REVENUECAT_KEYS, ENTITLEMENT_ID } from '../config/constants';
import {
  runNavionicsPurchase,
  NAVIONICS_PRODUCT_MONTHLY,
  NAVIONICS_PRODUCT_ANNUAL,
} from '../utils/navionicsPurchase';
import { loadNavionicsPurchase } from '../utils/navionicsStorage';
import { auth } from '../../firebaseConfig';

// A restored RevenueCat entitlement names the store product that unlocked it
// (entitlement.productIdentifier) but carries NO duration — periodType is NORMAL/INTRO/TRIAL/
// PREPAID, not monthly-vs-annual. The duration has to come from the product itself, so the tier
// is resolved at runtime from RevenueCat, in this order:
//   1. the store product's own subscriptionPeriod (ISO-8601), which still resolves for a product
//      that has been retired from the current offering (grandfathered/legacy price);
//   2. the current offering's packageType — the same join PaywallModal already uses to pick a tier.
// Anything not recognised returns null. A null MUST NOT be turned into a tier by the caller: the
// defect this replaces was exactly that, a silent default to annual that granted a monthly
// subscriber a year of charts.
const baseProductId = (id: string) => String(id).split(':')[0];

function navionicsProductForPeriod(period: string | null | undefined): string | null {
  if (!period) return null;
  const p = String(period).toUpperCase().trim();
  if (p === 'P1Y' || p === 'P12M') return NAVIONICS_PRODUCT_ANNUAL;
  if (p === 'P1M') return NAVIONICS_PRODUCT_MONTHLY;
  return null; // P1W / P3M / P6M / lifetime / anything else — not a tier Garmin sells. No guess.
}

async function resolveRestoredNavionicsProduct(info: any): Promise<string | null> {
  const productId: string = info?.entitlements?.active?.[ENTITLEMENT_ID]?.productIdentifier || '';
  if (!productId) return null;
  const wanted = baseProductId(productId);

  try {
    const products = await Purchases.getProducts([productId]);
    const match =
      products?.find((p: any) => baseProductId(p?.identifier) === wanted) ?? products?.[0];
    const byPeriod = navionicsProductForPeriod((match as any)?.subscriptionPeriod);
    if (byPeriod) return byPeriod;
  } catch {}

  try {
    const offerings = await Purchases.getOfferings();
    const packs: any[] = offerings?.current?.availablePackages ?? [];
    const pack = packs.find((p: any) => baseProductId(p?.product?.identifier) === wanted);
    if (pack?.packageType === 'ANNUAL') return NAVIONICS_PRODUCT_ANNUAL;
    if (pack?.packageType === 'MONTHLY') return NAVIONICS_PRODUCT_MONTHLY;
  } catch {}

  return null;
}

// A RevenueCat renewal isn't surfaced as an explicit event — the customer-info
// listener fires for logins, purchases, restores and renewals alike. We treat it as
// a renewal only when: a Navionics purchase already exists (so it's not a first buy,
// which PaywallModal handles), it was stored over an hour ago (avoids racing the
// first-purchase listener fire), and RevenueCat's expiry has advanced past the
// Navionics expiry (the actual signal that the subscription period rolled over).
// On renewal we re-provision with a fresh UUID pair, reusing the stored product_id
// (which tells us the monthly/annual tier), overwriting the old stored entry.
async function maybeRenewNavionics(info: any) {
  try {
    const existing = await loadNavionicsPurchase();
    if (!existing) return;
    const storedAgeMs = Date.now() - new Date(existing.stored_at).getTime();
    if (storedAgeMs < 60 * 60 * 1000) return; // < 1h old → first-purchase fire, not a renewal
    const entitlement = info?.entitlements?.active?.[ENTITLEMENT_ID];
    const rcExpiry = entitlement?.expirationDate ? new Date(entitlement.expirationDate).getTime() : 0;
    const navExpiry = new Date(existing.expiration_date).getTime();
    if (rcExpiry > navExpiry) {
      await runNavionicsPurchase(existing.product_id, auth.currentUser?.email || '');
    }
  } catch {}
}

export function usePurchases(user: any) {
  const [isProStatus, setIsProStatus] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initPurchases = async () => {
      try {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        const apiKey = Platform.OS === 'ios' ? REVENUECAT_KEYS.apple : REVENUECAT_KEYS.google;

        if (!apiKey) {
          setIsReady(true);
          return;
        }

        await Purchases.configure({ apiKey });
        setIsReady(true);

        const customerInfo = await Purchases.getCustomerInfo();
        const isActive = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
        setIsProStatus(isActive);

        Purchases.addCustomerInfoUpdateListener((info) => {
          const listenerActive = !!info?.entitlements?.active?.[ENTITLEMENT_ID];
          setIsProStatus(listenerActive);
          if (listenerActive) {
            setPaywallVisible(false);
            void maybeRenewNavionics(info);
          }
        });

      } catch (e) {
        console.log('RevenueCat Init Error:', (e as any).message);
        setIsReady(true);
      }
    };

    initPurchases();
  }, []);

  useEffect(() => {
    if (!user) {
      Purchases.logOut().catch(() => {});
      setIsProStatus(false);
      return;
    }

    const syncPurchases = async () => {
      setTimeout(async () => {
        try {
          const isConfigured = await Purchases.isConfigured();
          if (isConfigured) {
            await Purchases.logIn(user.uid);
            const customerInfo = await Purchases.getCustomerInfo();
            setIsProStatus(!!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]);
          }
        } catch (e) {
          console.log('Purchase Sync Error:', (e as any).message);
        }
      }, 500);
    };

    syncPurchases();
  }, [user]);

  const restorePurchases = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        setIsProStatus(true);
        Alert.alert('Success', 'Your Pro subscription has been restored.');
        setPaywallVisible(false);
        // Re-provision Navionics at the tier the user actually holds. Resolved from RevenueCat at
        // runtime (see resolveRestoredNavionicsProduct); when it cannot be resolved we provision
        // NOTHING rather than guess a tier.
        const navionicsProductId = await resolveRestoredNavionicsProduct(customerInfo);
        if (navionicsProductId) {
          void runNavionicsPurchase(navionicsProductId, user?.email || '');
        } else {
          console.log(
            'Navionics restore: subscription tier could not be resolved — no purchase attempted.'
          );
        }
      } else {
        Alert.alert('Notice', 'No active subscription found to restore.');
      }
    } catch (e) {
      Alert.alert('Error', (e as any).message);
    }
  };

  return {
    isProStatus,
    setIsProStatus,
    isReady,
    paywallVisible,
    setPaywallVisible,
    restorePurchases
  };
}