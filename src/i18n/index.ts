import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import RNLanguageDetector from '@os-team/i18next-react-native-language-detector';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'user_language';

i18next
  .use(RNLanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    ns: ['common', 'dfo', 'map'],
    defaultNS: 'common',
    resources: {
      en: {
        common: require('./locales/en/common.json'),
        dfo: require('./locales/en/dfo.json'),
        map: require('./locales/en/map.json'),
      },
      fr: {
        common: require('./locales/fr/common.json'),
        dfo: require('./locales/fr/dfo.json'),
        map: require('./locales/fr/map.json'),
      },
    },
    interpolation: { escapeValue: false },
  });

// Override device-detected language with the user's saved preference if present
AsyncStorage.getItem(LANGUAGE_KEY).then(saved => {
  if (saved && saved !== i18next.language) {
    i18next.changeLanguage(saved);
  }
});

export async function changeLanguage(lang: 'en' | 'fr'): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18next.changeLanguage(lang);
}

export default i18next;
