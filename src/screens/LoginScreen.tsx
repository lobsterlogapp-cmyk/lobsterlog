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
import { sendPasswordResetEmail } from '@react-native-firebase/auth';
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

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Missing Email", "Please enter your email address in the box above so we know where to send the link.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Email Sent", "Check your inbox for a link to reset your password.");
    } catch (error) {
      Alert.alert("Error", error.message);
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
          <Text style={[styles.loginTitle, { marginTop: 20 }]}>Check Your Inbox</Text>
          <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 10, marginBottom: 30, lineHeight: 22 }}>
            We sent a verification link to your email address.{'\n\n'}
            Click the link in that email, then come back here and log in.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={onDismissVerification}>
            <Text style={styles.primaryButtonText}>Back to Log In</Text>
          </TouchableOpacity>
          <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 20, textAlign: 'center' }}>
            Wrong email address? Tap above and sign up again with the correct one.
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
              <Text style={styles.loginSubtitle}>Digital Logbook</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{isRegistering ? 'Create Account' : 'Welcome Back'}</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { paddingLeft: 45 }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PASSWORD</Text>
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
                    Forgot Password?
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
                      {isRegistering ? 'Sign Up' : 'Log In'}
                    </Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsRegistering(!isRegistering)}
                style={styles.switchButton}
              >
                <Text style={styles.switchButtonText}>
                  {isRegistering ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
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