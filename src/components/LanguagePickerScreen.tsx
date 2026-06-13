import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import LobsterIcon from '../../assets/lobster-icon.png';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeLanguage } from '../i18n';

const LANGUAGE_PICKER_KEY = 'language_picker_shown';

interface Props {
  onDone: () => void;
}

export default function LanguagePickerScreen({ onDone }: Props) {
  const handleSelect = async (lang: 'en' | 'fr') => {
    await changeLanguage(lang);
    await AsyncStorage.setItem(LANGUAGE_PICKER_KEY, 'true');
    onDone();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Image source={LobsterIcon} style={{ width: 100, height: 100, marginBottom: 16 }} resizeMode="contain" />
        <Text style={styles.appName}>LobsterLog</Text>
        <Text style={styles.tagline}>
          Choose your language / Choisissez votre langue
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.langButton}
            onPress={() => handleSelect('en')}
            activeOpacity={0.8}
          >
            <Text style={styles.langButtonText}>English</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.langButton}
            onPress={() => handleSelect('fr')}
            activeOpacity={0.8}
          >
            <Text style={styles.langButtonText}>Français</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  langButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 50,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
  },
  langButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
