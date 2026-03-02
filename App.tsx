import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Linking,
  Image
} from 'react-native';

import { Svg, Path, Rect, Line, Circle } from 'react-native-svg';
import MapView, { UrlTile, Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';

// --- FIREBASE IMPORTS ---
import { auth, db } from './firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  deleteDoc,
  addDoc,
  query,
  where,
  getDocs,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  deleteUser
} from 'firebase/auth';

import * as Location from 'expo-location';

// --- REVENUECAT IMPORTS ---
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// --- ICONS ---
import {
  // --- Navigation & Core ---
  Layers, X, Plus, Minus, Play, Square, Trash2, Lock,
  ChevronLeft, ChevronRight, Settings, TrendingUp, Anchor,
  Crown, LogOut, Calendar as CalendarIcon, Scale, FileText,
  Save, History, MapPin, Mail, Ban, RotateCcw, LocateFixed,

  // --- Weather & Data ---
  Wind, Waves, Thermometer, Navigation, Activity, Compass
} from 'lucide-react-native';

import HistoryGraph from './src/components/HistoryGraph';
import BaitStats from './src/components/BaitStats';

import ProDashboard from './src/screens/ProDashboard';
import FishingMap from './src/screens/FishingMap';

import { REVENUECAT_KEYS, ENTITLEMENT_ID } from './src/config/constants';
import TideArrow from './src/components/TideArrow';
import PaywallModal from './src/components/PaywallModal';

import {
  formatDateId,
  parseLocalDate,
  getWindDirection,
  getDefaultSeasonConfig,
  getAverageWeather,
  STORMGLASS_API_KEY
} from './src/utils/helpers';

import { styles } from './src/styles/GlobalStyles';

// --- Login Component ---
const LoginScreen = ({ isRegistering, setIsRegistering, email, setEmail, password, setPassword, loading, handleSubmit }) => {

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
                  source={require('./assets/lobster-icon.png')}
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
                <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginBottom: 15, marginTop: -10 }}>
                  <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 13 }}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>{isRegistering ? 'Sign Up' : 'Log In'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)} style={styles.switchButton}>
                <Text style={styles.switchButtonText}>{isRegistering ? 'Already have an account? Log In' : 'Need an account? Sign Up'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// --- UPDATED MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState('log');
  const [tutorialVisible, setTutorialVisible] = useState(false);

  // --- NEW: REVENUECAT STATE ---
  const [isProStatus, setIsProStatus] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // --- EXISTING STATE ---
  const [logs, setLogs] = useState({});
  const [profile, setProfile] = useState({ captainName: '', boatName: '', seasons: {} });
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [tempLat, setTempLat] = useState('');
  const [tempLng, setTempLng] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [manageYear, setManageYear] = useState(new Date().getFullYear());
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ lbs: '', price: '', temp: '', wind: '', windDir: '', weather: ['Sunny'], notes: '' });

  // --- 1. INITIALIZE REVENUECAT ---
  useEffect(() => {
    const initPurchases = async () => {
      try {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        const apiKey = Platform.OS === 'ios' ? REVENUECAT_KEYS.apple : REVENUECAT_KEYS.google;

        // GUARD: Stop here if the key is missing.
        // We set loading to false so the app can show the login screen.
        if (!apiKey) {
          setIsReady(true);
          setLoading(false);
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
              console.log("RevenueCat Init Error:", e.message);
              setIsReady(true); // Set true so they can still use the free version
            } finally {
              setLoading(false);
            }
    };

    initPurchases();
  }, []);

  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (u) => {
        setUser(u);

        if (u) {
          // Wait just a beat to make sure RevenueCat finished configuring
          setTimeout(async () => {
            try {
              const isConfigured = await Purchases.isConfigured();
              if (isConfigured) {
                await Purchases.logIn(u.uid);
                const customerInfo = await Purchases.getCustomerInfo();
                setIsProStatus(!!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]);
              }
            } catch (e) {
              console.log("Auth Sync Error:", e.message);
            }
          }, 500); // 500ms delay
        } else {
          setIsProStatus(false);
          await Purchases.logOut().catch(() => { });
        }
        setLoading(false);
      });
      return unsubscribe;
    }, []);

  // --- 3. THE MASTER PRO CHECK ---
  const isPro = useMemo(() => {
    // 1. RevenueCat (Real Purchase)
    if (isProStatus === true) {
      return true;
    }

    // 2. Firestore Role Override (Admin/Tester)
    // We use optional chaining (?.) so it doesn't crash if profile is loading
    if (profile?.role === 'admin' || profile?.role === 'tester') {
      return true;
    }

    // 3. Default to Locked
    return false;
  }, [isProStatus, profile]);

  // --- 4. RESTORE PURCHASES HANDLER ---
  const restorePurchases = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        setIsProStatus(true);
        Alert.alert("Success", "Your Pro subscription has been restored.");
        setPaywallVisible(false);
      } else {
        Alert.alert("Notice", "No active subscription found to restore.");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

// --- 5. RESTORED FIRESTORE LISTENERS (Crash-Proof Version) ---
    useEffect(() => {
      setSelectedHistoryDate(new Date(currentDate));
    }, [currentDate]);

    useEffect(() => {
      if (!user) return;

      // 1. Listen to Logs
      const logsRef = collection(db, 'users', user.uid, 'logs');
      const unsubLogs = onSnapshot(logsRef, (snap) => {
        const newLogs = {};
        snap.forEach(d => newLogs[d.id] = d.data());
        setLogs(newLogs);
      }, (error) => console.log("Logs Error:", error));

      // 2. Listen to Profile (Replaced with Safer Logic)
      const profileRef = doc(db, 'users', user.uid, 'settings', 'profile');

      // Switch to onSnapshot for real-time updates & better stability
      const unsubProfile = onSnapshot(profileRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const now = new Date();
          const currentSeasonStartYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();

          // This 'fallback' logic prevents the app from reading "undefined" and crashing
          setProfile(prev => ({
              ...prev,
              captainName: data.captainName || prev.captainName || '',
              boatName: data.boatName || prev.boatName || 'New Boat',
              lat: data.lat || null,
              lng: data.lng || null,
              role: data.role || 'user',
              seasons: data.seasons || {},
              ...data
          }));

          // Sync years only if not set
          setHistoryYear(currentSeasonStartYear);
          setManageYear(currentSeasonStartYear);
        } else {
          // Fallback for brand new accounts
          setProfile({ captainName: '', boatName: 'New Boat', seasons: {}, role: 'user' });
        }
      }, (error) => {
         console.log("Profile Sync Error:", error.message);
      });

      return () => {
        unsubLogs();
        unsubProfile();
      };
    }, [user]);

  const dateId = formatDateId(currentDate);

  useEffect(() => {
    if (logs[dateId]) {
      let loadedWeather = logs[dateId].weather || [];
      if (typeof loadedWeather === 'string') {
        loadedWeather = [loadedWeather];
      }

      setFormData({
        lbs: logs[dateId].lbs || '',
        price: logs[dateId].price || '',
        temp: logs[dateId].temp || '',
        wind: logs[dateId].wind || '',
        windDir: logs[dateId].windDir || '',
        weather: loadedWeather,
        notes: logs[dateId].notes || ''
      });
    } else {
      const previousLogs = Object.values(logs)
        .filter(l => l.dateId < dateId && l.price && l.price !== '0')
        .sort((a, b) => b.dateId.localeCompare(a.dateId));

      const lastPrice = previousLogs.length > 0 ? previousLogs[0].price : '';

      setFormData({
        lbs: '',
        price: lastPrice,
        temp: '',
        wind: '',
        windDir: '',
        weather: [],
        notes: ''
      });
    }
  }, [dateId, logs]);

  const stats = useMemo(() => {
    if (!profile || !profile.seasons) {
      return { daysFishedThisSeason: 0, lbsCaughtThisWeek: 0, historyMatches: [] };
    }
    const currentYear = currentDate.getFullYear();
    let daysFishedThisSeason = 0;

    const seasonStartYear = currentDate.getMonth() < 6 ? currentYear - 1 : currentYear;
    const safeSeasons = profile.seasons || {};
    let seasonConfig = safeSeasons[seasonStartYear] || getDefaultSeasonConfig(seasonStartYear);

    const startId = seasonConfig.start;
    const endId = seasonConfig.end;

    const currentDayOfWeek = currentDate.getDay();
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDayOfWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekStartId = formatDateId(weekStart);
    const weekEndId = formatDateId(weekEnd);

    let lbsCaughtThisWeek = 0;

    Object.values(logs).forEach(log => {
      if (log.dateId >= startId && log.dateId <= endId && Number(log.lbs) > 0) {
        daysFishedThisSeason++;
      }
      if (log.dateId >= weekStartId && log.dateId <= weekEndId) {
        lbsCaughtThisWeek += Number(log.lbs) || 0;
      }
    });

    const historyMatches = [];
    const selMonth = selectedHistoryDate.getMonth() + 1;
    const selDay = selectedHistoryDate.getDate();
    const selYear = selectedHistoryDate.getFullYear();

    Object.values(logs).forEach(log => {
      const [y, m, d] = log.dateId.split('-').map(Number);
      if (m === selMonth && d === selDay && y !== selYear) {
        historyMatches.push(log);
      }
    });
    historyMatches.sort((a, b) => b.year - a.year);

    return { daysFishedThisSeason, lbsCaughtThisWeek, historyMatches };
  }, [logs, currentDate, profile, selectedHistoryDate]);

  const historyWeekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const hasHistoryEvent = (dateToCheck) => {
    const m = dateToCheck.getMonth() + 1;
    const d = dateToCheck.getDate();
    const y = dateToCheck.getFullYear();
    return Object.values(logs).some(log => {
      const [ly, lm, ld] = log.dateId.split('-').map(Number);
      return lm === m && ld === d && ly !== y;
    });
  };

  const handleDateChange = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const handleCalendarChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  };

  const toggleWeather = (option) => {
    let current = Array.isArray(formData.weather) ? formData.weather : (formData.weather ? [formData.weather] : []);
    if (option === 'No Fishing') {
      setFormData({ ...formData, weather: ['No Fishing'] });
      return;
    }
    if (current.includes('No Fishing')) current = [];
    if (current.includes(option)) {
      const newWeather = current.filter(w => w !== option);
      setFormData({ ...formData, weather: newWeather });
    } else {
      setFormData({ ...formData, weather: [...current, option] });
    }
  };

// --- 6. SAVE LOG DATA (Single, Crash-Proof Version) ---
  const saveLogData = async (data = formData) => {
      if (!user) return;
      setSaving(true);

      // SAFETY 1: Guarantee we have a string to split
      const safeDateId = dateId || formatDateId(new Date());
      const [year, month, day] = safeDateId.split('-').map(Number);

      try {
          // SAFETY 2: Use ?? to cleanly catch null/undefined
          let finalData = {
              lbs: String(data.lbs ?? '0'),
              price: String(data.price ?? '0'),
              temp: String(data.temp ?? ''),
              wind: String(data.wind ?? ''),
              windDir: String(data.windDir ?? ''),
              notes: String(data.notes ?? ''),
              swell: String(data.swell ?? '0.0'),
              gust: String(data.gust ?? '0.0'),
              weather: Array.isArray(data.weather) ? data.weather : []
          };

          if (isPro) {
              try {
                  const lat = profile?.lat || '43.4426';
                  const lng = profile?.lng || '-65.6290';

                  const weatherAvg = await getAverageWeather(lat, lng);

                  if (weatherAvg) {
                    finalData.wind = String((weatherAvg.avgWindKnots || 0).toFixed(1));
                    finalData.swell = String((weatherAvg.avgSwellMeters || 0).toFixed(1));
                    finalData.gust = String((weatherAvg.avgGustKnots || 0).toFixed(1));
                    // Wrap the direction in String() just in case
                    finalData.windDir = String(getWindDirection(weatherAvg.avgDirection) ?? '');
                  }
              } catch (weatherErr) {
                  console.log("Weather fetch failed, skipping auto-fill.");
              }
          }

          // SAFETY 3: Build a clean payload without relying on JSON.parse hacks
          const payload = {
              ...finalData,
              dateId: safeDateId,
              year: year || new Date().getFullYear(),
              month: month || new Date().getMonth() + 1,
              day: day || new Date().getDate(),
              updatedAt: new Date().toISOString()
          };

          const logRef = doc(db, 'users', user.uid, 'logs', safeDateId);
          await setDoc(logRef, payload, { merge: true });

          Alert.alert("Log Saved", isPro && finalData.wind ? "Weather updated automatically." : "Saved.");

      } catch (e) {
          Alert.alert("Save Error", e.message);
      } finally {
          setSaving(false);
      }
  };

  const handleGetCurrentLocation = async () => {
      setIsFetchingLocation(true);
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Allow location access in your device settings to use this feature.');
          setIsFetchingLocation(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({
           accuracy: Location.Accuracy.Balanced,
        });

        setTempLat(location.coords.latitude.toString());
        setTempLng(location.coords.longitude.toString());

      } catch (error) {
        Alert.alert('Location Error', 'Could not fetch your location. Make sure your GPS is enabled.');
      } finally {
        setIsFetchingLocation(false);
      }
    };

  const handleSaveLocation = async () => {
    if (!tempLat || !tempLng) {
      Alert.alert("Invalid Input", "Please enter both Latitude and Longitude.");
      return;
    }
    setProfile(prev => ({ ...prev, lat: tempLat, lng: tempLng }));
    setLocationModalVisible(false);
    if (user) {
      const profileRef = doc(db, 'users', user.uid, 'settings', 'profile');
      await setDoc(profileRef, {
        lat: tempLat,
        lng: tempLng
      }, { merge: true });
      Alert.alert("Location Saved", "Weather and charts will update automatically.");
    }
  };

  const handleManageSubscription = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  const handleSkipDay = () => {
    const skipped = {
      ...formData,
      lbs: '0',
      price: '0',
      windDir: '',
      weather: ['No Fishing'],
      notes: formData.notes ? formData.notes + '\nDid not go out. ' : 'Did not go out. '
    };
    setFormData(skipped);
    handleSave(skipped);
  };

  const handleLoginSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    setAuthLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      Alert.alert("Authentication Error", err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetSeason = async () => {
    Alert.alert(
      "Start New Bait Season?",
      "This will reset your bait performance stats to zero for the new season.\n\n(Your old fishing logs will NOT be deleted, just hidden from the current stats.)",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Fresh",
          style: "destructive",
          onPress: async () => {
            try {
              // Save the "Now" timestamp as the start of the new season
              await setDoc(doc(db, 'users', user.uid, 'settings', 'seasonConfig'), {
                baitSeasonStart: new Date().toISOString()
              }, { merge: true });
              Alert.alert("Season Reset", "Bait stats have been cleared for the new season!");
            } catch (e) {
              Alert.alert("Error", e.message);
            }
          }
        }
      ]
    );
  };

  if (!isReady || loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={{ marginTop: 10, color: '#1E3A8A' }}>Loading LobsterLog...</Text>
      </View>
    );
  }
  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#1E3A8A" /></View>;
  if (!user) return (
    <LoginScreen
      isRegistering={isRegistering}
      setIsRegistering={setIsRegistering}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      loading={authLoading}
      handleSubmit={handleLoginSubmit}
    />
  );

  const editSeasonConfig = (profile.seasons && profile.seasons[manageYear]) || getDefaultSeasonConfig(manageYear);

  if (!isReady || loading) {
      return (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={{ marginTop: 10, color: '#1E3A8A' }}>Loading LobsterLog...</Text>
        </View>
      );
    }
  return (
    <View style={styles.masterContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Image
                source={require('./assets/lobster-icon.png')}
                style={{ width: 45, height: 45, resizeMode: 'contain' }}
              />
            </View>
            <View>
              <Text style={styles.headerTitle}>{profile.boatName || 'LobsterLog'}</Text>
              {profile.captainName ? <Text style={styles.headerSubtitle}>Capt. {profile.captainName}</Text> : null}
            </View>
          </View>
          <View style={styles.headerRight}>

            <TouchableOpacity onPress={() => setView(view === 'pro' ? 'log' : 'pro')} style={[styles.navButton, view === 'pro' && styles.navButtonActive]}>
              {view === 'pro' ? <X size={24} color="#FBBF24" /> : <Crown size={24} color="#FBBF24" />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setView(view === 'history' ? 'log' : 'history')} style={[styles.navButton, view === 'history' && styles.navButtonActive]}>
              {view === 'history' ? <X size={24} color="#BFDBFE" /> : <TrendingUp size={24} color="#BFDBFE" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setView(view === 'settings' ? 'log' : 'settings')} style={[styles.navButton, view === 'settings' && styles.navButtonActive]}>
              {view === 'settings' ? <X size={24} color="#BFDBFE" /> : <Settings size={24} color="#BFDBFE" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.mainContentContainer}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {view === 'map' ? (
            <FishingMap
              savedLat={profile.lat}
              savedLng={profile.lng}
              user={user}
              dateId={dateId}
              onClose={() => setView('pro')}
            />
          ) : view === 'pro' ? (
            <ProDashboard
              isPro={isPro}
              onOpenMap={() => setView('map')}
              onUnlock={() => setPaywallVisible(true)}
              lat={profile.lat}
              lng={profile.lng}
            />
          ) : (
            <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingBottom: 60 }}
              keyboardShouldPersistTaps="handled"
            >
              {view === 'history' && (
                <View>
                  <HistoryGraph
                    logs={logs}
                    startYear={historyYear}
                    onYearChange={setHistoryYear}
                    profile={profile}
                  />

                  <BaitStats user={user} isPro={isPro} onUnlock={() => setPaywallVisible(true)} />

                  {/* RESET SEASON BUTTON (Now located below the graph) */}
                  <TouchableOpacity
                    onPress={handleResetSeason}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FEF2F2',
                      padding: 12,
                      borderRadius: 12,
                      marginTop: 20, // Space it out from the graph
                      marginBottom: 20,
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      width: '100%'
                    }}
                  >
                    <View style={{ backgroundColor: '#FFF1F2', padding: 8, borderRadius: 8, marginRight: 12 }}>
                      <RotateCcw size={20} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#991B1B' }}>Start New Bait Season</Text>
                      <Text style={{ fontSize: 12, color: '#B91C1C' }}>Clear graph & start fresh</Text>
                    </View>
                  </TouchableOpacity>
                </View>

              )}
              {view === 'log' && (
                <View style={styles.logContainer}>
                  <View style={styles.dateNav}>
                    <TouchableOpacity onPress={() => handleDateChange(-1)} style={styles.arrowButton}><ChevronLeft size={24} color="#475569" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ alignItems: 'center' }}>
                      <Text style={styles.dateText}>{currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                      <Text style={styles.yearText}>{currentDate.getFullYear()} ▾</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDateChange(1)} style={styles.arrowButton}><ChevronRight size={24} color="#475569" /></TouchableOpacity>
                  </View>

                  {showDatePicker && (
                    <DateTimePicker testID="dateTimePicker" value={currentDate} mode="date" display="default" onChange={handleCalendarChange} />
                  )}

                  <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}><View style={styles.statLabelRow}><CalendarIcon size={14} color="#94A3B8" /><Text style={styles.statLabel}>DAYS OUT</Text></View><Text style={styles.statValue}>{stats.daysFishedThisSeason}</Text><Text style={styles.statSub}>This season</Text></View>
                    <View style={[styles.statCard, { borderLeftColor: '#EF4444' }]}><View style={styles.statLabelRow}><Scale size={14} color="#94A3B8" /><Text style={styles.statLabel}>THIS WEEK</Text></View><Text style={styles.statValue}>{stats.lbsCaughtThisWeek.toLocaleString()}</Text><Text style={styles.statSub}>Sun - Sat</Text></View>
                  </View>

                  <View style={styles.formCard}>
                    <View style={styles.formHeader}><View style={styles.formTitleRow}><View style={styles.iconBox}><FileText size={16} color="#2563EB" /></View><Text style={styles.formTitle}>Daily Log</Text></View>{saving && <Text style={styles.savingText}>Saving...</Text>}</View>
                    <View style={styles.formBody}>
                      <View style={styles.row}>
                        <View style={styles.col}><Text style={styles.label}>LBS CAUGHT</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.lbs} onChangeText={(t) => setFormData({ ...formData, lbs: t })} placeholder="0" /></View>
                        <View style={styles.col}><Text style={styles.label}>PRICE / LB</Text><View style={styles.inputWithIcon}><Text style={styles.prefix}>$</Text><TextInput style={[styles.input, { paddingLeft: 20 }]} keyboardType="numeric" value={formData.price} onChangeText={(t) => setFormData({ ...formData, price: t })} placeholder="0.00" /></View></View>
                      </View>
                      <View style={styles.row}>
                        <View style={styles.col}><Text style={styles.label}>WATER TEMP</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.temp} onChangeText={(t) => setFormData({ ...formData, temp: t })} placeholder="--" /></View>
                        <View style={styles.col}><Text style={styles.label}>WIND (KTS)</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.wind} onChangeText={(t) => setFormData({ ...formData, wind: t })} placeholder="--" /></View>
                      </View>
                      <View style={{ marginTop: 10, marginBottom: 5 }}>
                        <Text style={styles.label}>WIND DIRECTION</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                          {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => {
                            const isSelected = formData.windDir === dir;
                            return (
                              <TouchableOpacity key={dir} onPress={() => setFormData({ ...formData, windDir: dir })} style={[styles.chip, isSelected && styles.chipActive]}>
                                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{dir}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                      <View><Text style={styles.label}>CONDITIONS</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                          {['Sunny', 'Cloudy', 'Rain', 'Fog', 'Windy', 'Too Windy', 'Rough', 'Snow', 'No Fishing'].map(opt => {
                            const isSelected = Array.isArray(formData.weather) ? formData.weather.includes(opt) : formData.weather === opt;
                            return (
                              <TouchableOpacity key={opt} onPress={() => toggleWeather(opt)} style={[styles.chip, isSelected && styles.chipActive]}>
                                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{opt}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                      <View><Text style={styles.label}>NOTES</Text><TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={formData.notes} onChangeText={(t) => setFormData({ ...formData, notes: t })} placeholder="Crew, gear issues..." /></View>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.saveButton} onPress={() => saveLogData()}>
                          <Save size={20} color="#FFF" />
                          <Text style={styles.saveButtonText}>Save Log</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <View style={styles.historyCard}>
                    <View style={styles.historyHeader}><History size={16} color="#92400E" /><Text style={styles.historyTitle}>History (Week of {historyWeekDays[0].toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })})</Text></View>
                    <View style={styles.historyWeekContainer}>
                      {historyWeekDays.map((dateObj) => {
                        const isSelected = dateObj.getDate() === selectedHistoryDate.getDate() && dateObj.getMonth() === selectedHistoryDate.getMonth();
                        const hasEvent = hasHistoryEvent(dateObj);
                        return (
                          <TouchableOpacity key={dateObj.toISOString()} style={[styles.historyDayBtn, isSelected && styles.historyDayBtnActive]} onPress={() => setSelectedHistoryDate(dateObj)}>
                            <Text style={[styles.historyDayText, isSelected && styles.historyDayTextActive]}>{dateObj.toLocaleDateString('en-US', { weekday: 'narrow' })}</Text>
                            <Text style={[styles.historyDateText, isSelected && styles.historyDayTextActive]}>{dateObj.getDate()}</Text>
                            {hasEvent && <View style={styles.historyDot} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={styles.historyListContainer}>
                      <Text style={styles.historySubHeader}>Events for {selectedHistoryDate.toLocaleDateString()}:</Text>
                      {stats.historyMatches.length > 0 ? (
                        stats.historyMatches.map(log => (
                          <View key={log.dateId} style={styles.historyRow}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                                <View>
                                  <Text style={styles.historyYear}>{log.year}</Text>
                                  <Text style={styles.historyLbsLarge}>{Number(log.lbs).toLocaleString()} lbs</Text>
                                </View>
                                <Text style={styles.historyPriceLarge}>${log.price || '--'}/lb</Text>
                              </View>
                              <View style={{ backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12 }}>
                                <Text style={styles.historyDetailsLarge}>
                                  {log.temp ? `${log.temp}°F` : ''}
                                  {log.wind ? ` • ${log.wind}${log.gust ? `-${log.gust}` : ''}kts ${log.windDir || ''}` : ''}
                                  {log.swell ? ` • ${log.swell}m Swell` : ''}
                                </Text>
                                {log.weather && <Text style={[styles.historyDetailsLarge, { marginTop: 4, fontStyle: 'italic' }]}>{Array.isArray(log.weather) ? log.weather.join(', ') : log.weather}</Text>}
                              </View>
                              {log.notes ? <View style={styles.historyNoteContainer}><Text style={styles.historyNoteText}>"{log.notes}"</Text></View> : null}
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noHistoryText}>No history recorded for this date.</Text>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {view === 'settings' && (
                <View style={styles.settingsContainer}>
                  <View style={styles.card}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                      <MapPin size={24} color="#FBBF24" />
                      <Text style={styles.cardHeader}>Fishing Location</Text>
                      {isPro && <View style={{ backgroundColor: '#FBBF24', paddingHorizontal: 6, borderRadius: 4 }}><Text style={{ fontSize: 10, fontWeight: 'bold' }}>PRO</Text></View>}
                    </View>
                    <View style={{ backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, marginBottom: 15 }}>
                      <Text style={{ color: '#64748B', fontSize: 12, fontWeight: 'bold' }}>CURRENT COORDINATES</Text>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#334155', marginTop: 4 }}>
                        {parseFloat(profile.lat || 43.44).toFixed(4)}, {parseFloat(profile.lng || -65.62).toFixed(4)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.outlineButton]} // Remove the opacity reduction so it looks clickable
                      onPress={() => {
                        if (!isPro) {
                          setPaywallVisible(true);
                          return;
                        }
                        setTempLat(profile.lat || '');
                        setTempLng(profile.lng || '');
                        setLocationModalVisible(true);
                      }}>
                      {isPro ? <Text style={styles.outlineButtonText}>Update Coordinates</Text> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Lock size={14} color="#475569" /><Text style={styles.outlineButtonText}>Upgrade to Change Location</Text></View>}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeader}>Captain & Boat</Text>
                    <View style={styles.inputGroup}><Text style={styles.label}>CAPTAIN NAME</Text><TextInput style={styles.input} value={profile.captainName} onChangeText={t => setProfile(p => ({ ...p, captainName: t }))} placeholder="John Doe" /></View>
                    <View style={styles.inputGroup}><Text style={styles.label}>BOAT NAME</Text><TextInput style={styles.input} value={profile.boatName} onChangeText={t => setProfile(p => ({ ...p, boatName: t }))} placeholder="The Blue Fin" /></View>
                  </View>

                  <View style={styles.card}>
                    <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 15 }]}>
                      <TouchableOpacity onPress={() => setManageYear(manageYear - 1)}><ChevronLeft size={20} color="#2563EB" /></TouchableOpacity><Text style={{ fontWeight: 'bold', color: '#1E3A8A' }}>{manageYear} Season Config</Text><TouchableOpacity onPress={() => setManageYear(manageYear + 1)}><ChevronRight size={20} color="#2563EB" /></TouchableOpacity>
                    </View>
                    <View style={styles.row}>
                      <View style={styles.col}><Text style={styles.label}>START DATE</Text><TextInput style={styles.input} value={editSeasonConfig.start} onChangeText={t => {
                        const currentConfig = (profile.seasons && profile.seasons[manageYear]) || getDefaultSeasonConfig(manageYear);
                        setProfile(prev => ({ ...prev, seasons: { ...(prev.seasons || {}), [manageYear]: { ...currentConfig, start: t } } }));
                      }} /></View>
                      <View style={styles.col}><Text style={styles.label}>END DATE</Text><TextInput style={styles.input} value={editSeasonConfig.end} onChangeText={t => {
                        const currentConfig = (profile.seasons && profile.seasons[manageYear]) || getDefaultSeasonConfig(manageYear);
                        setProfile(prev => ({ ...prev, seasons: { ...(prev.seasons || {}), [manageYear]: { ...currentConfig, end: t } } }));
                      }} /></View>
                    </View>
                    <TouchableOpacity style={styles.saveButton} onPress={async () => {
                      if (!user) return;
                      try {
                        const profileRef = doc(db, 'users', user.uid, 'settings', 'profile');
                        await setDoc(profileRef, profile);
                        Alert.alert("Success", "Settings saved!");
                      } catch (e) { Alert.alert("Error", e.message); }
                    }}><Text style={styles.saveButtonText}>Save Settings</Text></TouchableOpacity>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeader}>Account</Text>
                    <Text style={{ textAlign: 'center', color: '#64748B', marginBottom: 10 }}>Signed in as: {user.email}</Text>

                    {/* 1. TUTORIAL BUTTON */}
                    <TouchableOpacity
                      onPress={() => {
                        if (isPro) {
                          setTutorialVisible(true);
                        } else {
                          setPaywallVisible(true); // <--- This now opens the paywall!
                        }
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, marginBottom: 12 }}
                    >
                      <View style={{ backgroundColor: '#E0F2FE', padding: 8, borderRadius: 8, marginRight: 12 }}>
                        {profile?.subscription === 'pro' ? <Navigation size={20} color="#0284C7" /> : <Lock size={20} color="#0284C7" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#334155' }}>How to Use LobsterLog</Text>
                        <Text style={{ fontSize: 12, color: '#64748B' }}>{profile?.subscription === 'pro' ? 'Learn the map cycles & heatmap' : 'Upgrade to unlock User Guide'}</Text>
                      </View>
                      <ChevronRight size={20} color="#94A3B8" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleManageSubscription}
                      style={{
                        backgroundColor: '#e2e8f0', // Light Gray
                        padding: 16,
                        borderRadius: 12,
                        marginBottom: 12, // Space between this and Log Out
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center'
                      }}
                    >
                      <Text style={{ color: '#334155', fontWeight: '600', fontSize: 16 }}>
                        Manage Subscription
                      </Text>
                    </TouchableOpacity>

                    {/* 2. SIGN OUT (This should be next!) */}
                    <TouchableOpacity style={styles.outlineButton} onPress={() => signOut(auth)}>
                      <LogOut size={16} color="#475569" />
                      <Text style={styles.outlineButtonText}>Sign Out</Text>
                    </TouchableOpacity>

                    {/* 3. DELETE ACCOUNT */}
                    <TouchableOpacity style={styles.deleteButton} onPress={() => {
                      Alert.alert("Delete Account", "Are you sure? This cannot be undone.", [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete", style: "destructive", onPress: async () => {
                            try {
                              const userRef = doc(db, 'users', user.uid);
                              await deleteDoc(userRef);
                              await deleteUser(auth.currentUser);
                            } catch (error) { Alert.alert("Error", error.message); }
                          }
                        }
                      ]);
                    }}>
                      <Trash2 size={16} color="#EF4444" />
                      <Text style={styles.deleteButtonText}>Delete Account</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>

      <Modal animationType="slide" transparent={true} visible={locationModalVisible} onRequestClose={() => setLocationModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Fishing Location</Text>
            <Text style={styles.modalSubtitle}>Weather data will generate based on this point.</Text>
            <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#EFF6FF',
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 20,
                            borderWidth: 1,
                            borderColor: '#BFDBFE'
                          }}
                          onPress={handleGetCurrentLocation}
                          disabled={isFetchingLocation}
                        >
                          {isFetchingLocation ? (
                             <ActivityIndicator color="#2563EB" />
                          ) : (
                             <>
                               <LocateFixed size={18} color="#2563EB" style={{ marginRight: 8 }} />
                               <Text style={{ color: '#1E3A8A', fontWeight: 'bold' }}>Use Current GPS Location</Text>
                             </>
                          )}
                      </TouchableOpacity>
            <Text style={styles.inputLabel}>LATITUDE</Text>
            <TextInput style={styles.modalInput} placeholder="43.4426" placeholderTextColor="#64748B" keyboardType="numeric" value={tempLat} onChangeText={setTempLat} />
            <Text style={styles.inputLabel}>LONGITUDE</Text>
            <TextInput style={styles.modalInput} placeholder="-65.6290" placeholderTextColor="#64748B" keyboardType="numeric" value={tempLng} onChangeText={setTempLng} />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={styles.cancelButton}><Text style={{ color: '#94A3B8' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveLocation} style={styles.modalSaveButton}><Text style={{ color: '#1E293B', fontWeight: 'bold' }}>Save & Update</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* --- TUTORIAL MODAL (WITH WEATHER PANEL) --- */}
      <Modal animationType="slide" transparent={true} visible={tutorialVisible} onRequestClose={() => setTutorialVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)', justifyContent: 'center', alignItems: 'center' }}>

          {/* Fixed Width Container */}
          <View style={{ backgroundColor: 'white', borderRadius: 24, width: 340, paddingVertical: 24, height: '75%' }}>

            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A' }}>LobsterLog Guide</Text>
              <TouchableOpacity onPress={() => setTutorialVisible(false)} style={{ padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 }}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* ScrollView */}
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'center' }}
            >

              {/* SLIDE 1: THE LOG */}
              <View style={{ width: 340, paddingHorizontal: 20, alignItems: 'center' }}>
                <View style={{ height: 160, width: '100%', backgroundColor: '#EFF6FF', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <Scale size={64} color="#3B82F6" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>1. The Daily Log</Text>
                <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center' }}>
                  Start your day on the <Text style={{ fontWeight: 'bold' }}>Log Screen</Text>. Enter your total pounds and market price here.
                  {"\n\n"}
                  This keeps a historical log, so you can look back throught the years, and season totals automatically.
                </Text>
              </View>

              {/* SLIDE 2: AUTOMATIC WEATHER (NEW) */}
              <View style={{ width: 340, paddingHorizontal: 20, alignItems: 'center' }}>
                <View style={{ height: 160, width: '100%', backgroundColor: '#E0F2FE', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <Wind size={64} color="#0EA5E9" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>2. Automatic Weather</Text>
                <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center' }}>
                  Stop guessing the wind speed.
                  {"\n\n"}
                  The app automatically fetches the <Text style={{ fontWeight: 'bold' }}>Wind, Temp, and Direction</Text> for your specific location every time you save a log.
                </Text>
              </View>

              {/* SLIDE 3: MAP BASICS */}
              <View style={{ width: 340, paddingHorizontal: 20, alignItems: 'center' }}>
                <View style={{ height: 160, width: '100%', backgroundColor: '#F0FDF4', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <MapPin size={64} color="#22C55E" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>3. Active vs. History</Text>
                <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center' }}>
                  <Text style={{ fontWeight: 'bold' }}>White Lines</Text> are gear currently in the water (Active).
                  {"\n\n"}
                  <Text style={{ fontWeight: 'bold' }}>Colored Lines</Text> appear on the Heatmap after you haul them (History).
                </Text>
              </View>

              {/* SLIDE 4: THE SWAP CYCLE */}
              <View style={{ width: 340, paddingHorizontal: 20, alignItems: 'center' }}>
                <View style={{ height: 160, width: '100%', backgroundColor: '#FEF2F2', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <Layers size={64} color="#EF4444" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>4. The "Swap" Cycle</Text>
                <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center' }}>
                  When you log a trawl on the map, the app does two things instantly:
                  {"\n\n"}
                  1. It <Text style={{ fontWeight: 'bold', color: '#EF4444' }}>HAULS</Text> the old string (moves it to History).
                  {"\n"}
                  2. It <Text style={{ fontWeight: 'bold', color: '#22C55E' }}>SETS</Text> the new string at your current spot.
                </Text>
              </View>

              {/* SLIDE 5: DATA ENTRY */}
              <View style={{ width: 340, paddingHorizontal: 20, alignItems: 'center' }}>
                <View style={{ height: 160, width: '100%', backgroundColor: '#FFF7ED', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <Save size={64} color="#F97316" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>5. Entering Data</Text>
                <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center' }}>
                  Because of the swap logic, remember:
                  {"\n\n"}
                  <Text style={{ fontWeight: 'bold' }}>Catch:</Text> Enter what was in the trap you JUST hauled up.
                  {"\n"}
                  <Text style={{ fontWeight: 'bold' }}>Bait:</Text> Enter the bait for the trap you are setting RIGHT NOW.
                </Text>
              </View>

              {/* SLIDE 6: HEATMAP */}
              <View style={{ width: 340, paddingHorizontal: 20, alignItems: 'center' }}>
                <View style={{ height: 160, width: '100%', backgroundColor: '#F5F3FF', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <TrendingUp size={64} color="#8B5CF6" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center' }}>6. Pro Insights</Text>
                <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center' }}>
                  Toggle the <Text style={{ fontWeight: 'bold' }}>Heatmap</Text> to see your past performance.
                  {"\n\n"}
                  Red lines = High Catch.
                  {"\n"}
                  Use this to plan where to set your gear next season.
                </Text>
              </View>

            </ScrollView>

            {/* Pagination & Button */}
            <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginBottom: 15 }}>SWIPE FOR MORE →</Text>

              <TouchableOpacity onPress={() => setTutorialVisible(false)} style={{ backgroundColor: '#0F172A', paddingVertical: 16, width: '100%', borderRadius: 16, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Got it, Let's Fish</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
      {isReady && (
        <PaywallModal
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          onRestore={restorePurchases}
          onPurchaseSuccess={() => {
            setIsProStatus(true);
            setPaywallVisible(false);
            Alert.alert("Welcome to Pro!", "You now have access to all charts and weather data.");
          }}
        />
      )}
    </View>
  );
}
