const { withDangerousMod, AndroidConfig, createRunOncePlugin } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withRevenueCat = (config) => {
  // 1. Android: Add Billing Permission (The Safe Way)
  // We use AndroidConfig.Permissions instead of the direct import
  config = AndroidConfig.Permissions.withPermissions(config, [
    "com.android.vending.BILLING"
  ]);

  // 2. iOS: Manually Link the Pods
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (fs.existsSync(podfilePath)) {
        let contents = fs.readFileSync(podfilePath, 'utf-8');

        // Check if we've already added it to avoid duplicates
        if (!contents.includes("Manual Linking for RevenueCat")) {
          const manualLink = `
  # Manual Linking for RevenueCat (Bypassing Autolinking)

  # 1. Core SDK (Matches node_modules/react-native-purchases/RNPurchases.podspec)
  pod 'RNPurchases', :path => '../node_modules/react-native-purchases'

  # 2. UI SDK (Matches node_modules/react-native-purchases-ui/RNPaywalls.podspec)
  pod 'RNPaywalls', :path => '../node_modules/react-native-purchases-ui'
          `;

          // Inject these lines right after the "use_expo_modules!" line
          if (contents.includes('use_expo_modules!')) {
            contents = contents.replace(
              'use_expo_modules!',
              `use_expo_modules!\n${manualLink}`
            );
            fs.writeFileSync(podfilePath, contents);
          }
        }
      }
      return config;
    },
  ]);

  return config;
};

module.exports = createRunOncePlugin(withRevenueCat, 'revenuecat-plugin', '1.0.0');