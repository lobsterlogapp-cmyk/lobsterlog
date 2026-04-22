import { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { REVENUECAT_KEYS, ENTITLEMENT_ID } from '../config/constants';

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
          if (listenerActive) setPaywallVisible(false);
        });

      } catch (e) {
        console.log('RevenueCat Init Error:', e.message);
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
          console.log('Purchase Sync Error:', e.message);
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
      } else {
        Alert.alert('Notice', 'No active subscription found to restore.');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
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