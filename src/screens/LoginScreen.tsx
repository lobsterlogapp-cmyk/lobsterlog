import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { Mail, Lock } from 'lucide-react-native';
import { sendPasswordResetEmail, setLanguageCode } from '@react-native-firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../../firebaseConfig';
import { styles } from '../styles/GlobalStyles';

const LoginScreen = ({
  isRegistering,
  setIsRegistering,
  email,
  setEmail,
  password,
  setPassword,
  loading,
  handleSubmit,
  verificationPending,
  onDismissVerification
}) => {
  const { t, i18n } = useTranslation();

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(t('login.missingEmailTitle'), t('login.missingEmailBody'));
      return;
    }
    try {
      // Reset email goes out in the app language (template localization is Firebase-console side)
      await setLanguageCode(auth, i18n.language);
      await sendPasswordResetEmail(auth, email);
      Alert.alert(t('login.emailSentTitle'), t('login.emailSentBody'));
    } catch (error) {
      Alert.alert(t('login.errorTitle'), error.message);
    }
  };

  if (verificationPending) {
    return (
      <View style={styles.loginContainer}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/lobster-icon.png')}
              style={{ width: 70, height: 70, resizeMode: 'contain' }}
            />
          </View>
          <Text style={[styles.loginTitle, { marginTop: 20 }]}>{t('login.inboxTitle')}</Text>
          <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 10, marginBottom: 30, lineHeight: 22 }}>
            {t('login.inboxBody')}
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={onDismissVerification}>
            <Text style={styles.primaryButtonText}>{t('login.backToLogIn')}</Text>
          </TouchableOpacity>
          <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 20, textAlign: 'center' }}>
            {t('login.wrongEmail')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.loginContainer}>
      <View style={{ height: Platform.OS === 'ios' ? 60 : 20 }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginContent}>
            <View style={styles.loginHeader}>
              <View style={styles.logoCircle}>
                <Image
                  source={require('../../assets/lobster-icon.png')}
                  style={{ width: 70, height: 70, resizeMode: 'contain' }}
                />
              </View>
              <Text style={styles.loginTitle}>LobsterLog</Text>
              <Text style={styles.loginSubtitle}>{t('login.subtitle')}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{isRegistering ? t('login.createAccount') : t('login.welcomeBack')}</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('login.emailLabel')}</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { paddingLeft: 45 }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('login.emailPlaceholder')}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('login.passwordLabel')}</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { paddingLeft: 45 }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry
                  />
                </View>
              </View>

              {!isRegistering && (
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  style={{ alignSelf: 'flex-end', marginBottom: 15, marginTop: -10 }}
                >
                  <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 13 }}>
                    {t('login.forgotPassword')}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.primaryButtonText}>
                      {isRegistering ? t('login.signUp') : t('login.logIn')}
                    </Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsRegistering(!isRegistering)}
                style={styles.switchButton}
              >
                <Text style={styles.switchButtonText}>
                  {isRegistering ? t('login.haveAccount') : t('login.needAccount')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;