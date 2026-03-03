module.exports = {
  expo: {
    name: "LobsterLog",
    slug: "lobsterlog",
    scheme: "lobsterlog",
    version: "1.7.3",
    icon: "./assets/icon.png",
    ios: {
      bundleIdentifier: "com.Nickerson.LobsterLog",
      supportsTablet: false,
      buildNumber: "48",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "LobsterLog uses your location to show your boat's position on the chart and log your catches.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "LobsterLog needs your location to track your trawls even when the app is in the background.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    plugins: [
      "./revenuecat-plugin.js",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
            newArchEnabled: false
          }
        }
      ],
      "@react-native-community/datetimepicker"
    ],
    android: {
      versionCode: 48,
      package: "com.lobsterlog",
      permissions: [
        "com.android.vending.BILLING",
        "INTERNET"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    extra: {
      eas: {
        projectId: "adc079fa-372a-47de-b18b-8e0827ee7cd8"
      }
    }
  }
};