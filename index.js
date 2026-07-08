import { registerRootComponent } from 'expo';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './App';

// S95: wrap the app in SafeAreaProvider so useSafeAreaInsets() works app-wide. Required for
// Android edge-to-edge (Expo SDK 54 / RN 0.81 default) — StatusBar.currentHeight is unreliable
// under edge-to-edge, so headers are driven off real safe-area insets instead.
const Root = () => (
  <SafeAreaProvider>
    <App />
  </SafeAreaProvider>
);

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
