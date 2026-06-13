import { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { REVENUECAT_KEYS, ENTITLEMENT_ID } from '../config/constants';
import { runNavionicsPurchase, NAVIONICS_PRODUCT_ANNUAL } from '../utils/navionicsPurchase';
import { loadNavionicsPurchase } from '../utils/navionicsStorage';
import { auth } from '../../firebaseConfig';

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

  return {
    isProStatus,
    setIsProStatus,
    isReady,
    paywallVisible,
    setPaywallVisible,
    restorePurchases
  };
}