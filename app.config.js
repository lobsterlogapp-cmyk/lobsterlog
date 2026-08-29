module.exports = {
  expo: {
    name: "LobsterLog",
    slug: "lobsterlog",
    scheme: "lobsterlog",
    version: "1.9.1",
    icon: "./assets/icon.png",
    ios: {
      bundleIdentifier: "com.Nickerson.LobsterLog",
      googleServicesFile: "./GoogleService-Info.plist",
      supportsTablet: false,
      buildNumber: "88",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "LobsterLog uses your location to show your boat's position on the chart and log your catches.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "LobsterLog needs your location to track your trawls even when the app is in the background.",
        ITSAppUsesNonExemptEncryption: false,
        // S151, defect 99. These two together make the app's Documents folder browsable in the
        // Files app — where the Delete Account export lands (src/utils/exportTransmissionRecord.ts,
        // exportDir() → DocumentDir). Without BOTH, the file persists but cannot be reached.
        //
        // ⚠ THE SAME TWO KEYS ARE ALSO DECLARED IN ios/LobsterLog/Info.plist, which is the file the
        // ACTUAL BUILD READS (ios/ is committed; nothing regenerates it in this workflow). These
        // entries exist so a future `expo prebuild` does not silently drop them. That is the same
        // fact in two files and the two CAN DRIFT — knowingly accepted, not engineered around.
        // If you change one, change the other.
        UIFileSharingEnabled: true,
        LSSupportsOpeningDocumentsInPlace: true
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
      "@react-native-community/datetimepicker",
      "@react-native-firebase/app",
      "@react-native-firebase/app-check",
      // --- ADDED MAPBOX PLUGIN HERE ---
      [
        "@rnmapbox/maps",
        {
          "RNMapboxMapsImpl": "mapbox",
          "RNMAPBOX_MAPS_DOWNLOAD_TOKEN": process.env.MAPBOX_DOWNLOADS_TOKEN
        }
      ]
    ],
    android: {
      versionCode: 88,
      package: "com.lobsterlog",
      googleServicesFile: "./google-services.json",
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