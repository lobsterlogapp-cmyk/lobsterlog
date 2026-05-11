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
  Image,
} from 'react-native';

import { Svg, Path, Rect, Line, Circle } from 'react-native-svg';
import MapView, { UrlTile, Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';

import { auth, db } from './firebaseConfig';
import { useAuth } from './src/Hooks/useAuth';
import { useLogForm } from './src/Hooks/useLogForm';
import { useProfile } from './src/Hooks/useProfile';
import { usePurchases } from './src/Hooks/usePurchases';

// --- ICONS ---
import {
  Layers,
  X,
  Plus,
  Minus,
  Play,
  Square,
  Trash2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Settings,
  ClipboardList,
  TrendingUp,
  Anchor,
  Crown,
  LogOut,
  Calendar as CalendarIcon,
  Scale,
  FileText,
  Save,
  History,
  MapPin,
  Mail,
  Ban,
  RotateCcw,
  LocateFixed,
  Wind,
  Waves,
  Thermometer,
  Navigation,
  Activity,
  Compass,

} from 'lucide-react-native';

import BaitStats from './src/components/BaitStats';
import HistoryGraph from './src/components/HistoryGraph';
import PaywallModal from './src/components/PaywallModal';
import TideArrow from './src/components/TideArrow';
import TutorialModal from './src/components/TutorialModal';

import ProDashboard from './src/screens/ProDashboard';
import LoginScreen from './src/screens/LoginScreen';
import FishingMap from './src/screens/FishingMap';
import DfoDemoScreen from './src/screens/DfoDemoScreen';
import DfoLogsListScreen from './src/screens/DfoLogsListScreen';

import { DEFAULT_LOCATION, WEATHER_OPTIONS, AppView } from './src/config/constants';

import {
  formatDateId,
  parseLocalDate,
  getWindDirection,
  getDefaultSeasonConfig,
  getAverageWeather,
  STORMGLASS_API_KEY,
} from './src/utils/helpers';

import { styles } from './src/styles/GlobalStyles';
import { TimerProvider } from './src/context/TimerContext';

// --- UPDATED MAIN APP COMPONENT ---
export default function App() {
  const {
    user,
    loading,
    isRegistering,
    setIsRegistering,
    email,
    setEmail,
    password,
    setPassword,
    authLoading,
    verificationPending,
    setVerificationPending,
    pendingEmail,
    handleLoginSubmit,
    handleSignOut,
    handleDeleteAccount,
  } = useAuth();

  const [view, setView] = useState<AppView>('log');
  const [tutorialVisible, setTutorialVisible] = useState(false);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const {
    isProStatus,
    setIsProStatus,
    isReady,
    paywallVisible,
    setPaywallVisible,
    restorePurchases,
  } = usePurchases(user);

  // --- EXISTING STATE ---
  const {
    logs,
    profile,
    setProfile,
    historyYear,
    setHistoryYear,
    manageYear,
    setManageYear,
    locationModalVisible,
    setLocationModalVisible,
    tempLat,
    setTempLat,
    tempLng,
    setTempLng,
    isFetchingLocation,
    handleGetCurrentLocation,
    handleSaveLocation,
    handleSaveProfile,
    handleResetSeason,
  } = useProfile(user);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateId = formatDateId(currentDate);

  const isPro = useMemo(() => {
    if (isProStatus === true) return true;
    const userRole = typeof profile?.role === 'string' ? profile.role.toLowerCase() : '';
    if (userRole === 'admin' || userRole === 'tester' || profile?.subscription === 'pro')
      return true;
    return false;
  }, [isProStatus, profile]);

const isAdmin = useMemo(() => {
    const userRole = typeof profile?.role === 'string' ? profile.role.toLowerCase() : '';
    return userRole === 'admin';
  }, [profile]);

  const { formData, setFormData, saving, loadFormData, toggleWeather, saveLogData, handleSkipDay } =
    useLogForm(user, profile, dateId, isPro);

  // --- 5. NATIVE FIRESTORE LISTENERS ---
  useEffect(() => {
    setSelectedHistoryDate(new Date(currentDate));
  }, [currentDate]);

  useEffect(() => {
    loadFormData(logs, dateId);
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

    Object.values(logs).forEach((log) => {
      if (log.dateId >= startId && log.dateId <= endId && Number(log.lbs) > 0) {
        daysFishedThisSeason++;
      }
      if (log.dateId >= weekStartId && log.dateId <= weekEndId) {
        lbsCaughtThisWeek += Number(log.lbs) || 0;
      }
    });

    // --- STEP 1: Pre-sort logs once by dateId (ascending) ---
    const sortedLogs = Object.values(logs).sort((a, b) => a.dateId.localeCompare(b.dateId));

    // --- STEP 2: Single pass to build running haul counts per season ---
    // Key = season start year, Value = running count of fishing days
    const seasonHaulCounts = {};
    // Key = dateId, Value = haul number on that date
    const haulByDateId = {};

    sortedLogs.forEach((log) => {
      const [y, m] = log.dateId.split('-').map(Number);
      const logSeasonStartYear = m - 1 < 6 ? y - 1 : y;
      const logSeasonConfig =
        (profile.seasons || {})[logSeasonStartYear] || getDefaultSeasonConfig(logSeasonStartYear);

      // Only count if this log falls within its season and has lbs > 0
      if (
        log.dateId >= logSeasonConfig.start &&
        log.dateId <= logSeasonConfig.end &&
        Number(log.lbs) > 0
      ) {
        seasonHaulCounts[logSeasonStartYear] = (seasonHaulCounts[logSeasonStartYear] || 0) + 1;
        haulByDateId[log.dateId] = seasonHaulCounts[logSeasonStartYear];
      }
    });

    // --- STEP 3: Find history matches (same month/day, different year) ---
    const historyMatches = [];
    const selMonth = selectedHistoryDate.getMonth() + 1;
    const selDay = selectedHistoryDate.getDate();
    const selYear = selectedHistoryDate.getFullYear();

    sortedLogs.forEach((log) => {
      const [y, m, d] = log.dateId.split('-').map(Number);
      if (m === selMonth && d === selDay && y !== selYear) {
        // Look up the pre-computed haul number instead of looping again
        historyMatches.push({ ...log, haulNumber: haulByDateId[log.dateId] || 0 });
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
    return Object.values(logs).some((log) => {
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

  const handleManageSubscription = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  if (!isReady || loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={{ marginTop: 10, color: '#1E3A8A' }}>Loading LobsterLog...</Text>
      </View>
    );
  }
  if (!user)
    return (
      <LoginScreen
        isRegistering={isRegistering}
        setIsRegistering={setIsRegistering}
        email={verificationPending ? pendingEmail : email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        loading={authLoading}
        handleSubmit={handleLoginSubmit}
        verificationPending={verificationPending}
        onDismissVerification={() => {
          setVerificationPending(false);
          setIsRegistering(false);
        }}
      />
    );

  const editSeasonConfig =
    (profile.seasons && profile.seasons[manageYear]) || getDefaultSeasonConfig(manageYear);

  return (
      <TimerProvider>
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
              {profile.captainName ? (
                <Text style={styles.headerSubtitle}>Capt. {profile.captainName}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.headerRight}>
                      <TouchableOpacity
                        onPress={() => setView(view === 'pro' ? 'log' : 'pro')}
                        style={[styles.navButton, view === 'pro' && styles.navButtonActive]}
                      >
                        {view === 'pro' ? (
                          <X size={24} color="#FBBF24" />
                        ) : (
                          <Crown size={24} color="#FBBF24" />
                        )}
                      </TouchableOpacity>

                      {isAdmin && (
                                              <TouchableOpacity
                                                onPress={() => {
                                                  const isInDfoArea = view === 'dfo-list' || view === 'dfo-demo';
                                                  setView(isInDfoArea ? 'log' : 'dfo-list');
                                                }}
                                                style={[
                                                  styles.navButton,
                                                  (view === 'dfo-list' || view === 'dfo-demo') && styles.navButtonActive,
                                                ]}
                                              >
                                                {view === 'dfo-list' || view === 'dfo-demo' ? (
                                                  <X size={24} color="#F87171" />
                                                ) : (
                                                  <ClipboardList size={24} color="#F87171" />
                                                )}
                                              </TouchableOpacity>
                                            )}

                      <TouchableOpacity
                        onPress={() => setView(view === 'history' ? 'log' : 'history')}
                        style={[styles.navButton, view === 'history' && styles.navButtonActive]}
                      >
                        {view === 'history' ? (
                          <X size={24} color="#BFDBFE" />
                        ) : (
                          <TrendingUp size={24} color="#BFDBFE" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setView(view === 'settings' ? 'log' : 'settings')}
                        style={[styles.navButton, view === 'settings' && styles.navButtonActive]}
                      >
                        {view === 'settings' ? (
                          <X size={24} color="#BFDBFE" />
                        ) : (
                          <Settings size={24} color="#BFDBFE" />
                        )}
                      </TouchableOpacity>
                    </View>
        </View>
      </View>

      <View style={styles.mainContentContainer}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                      />) : view === 'dfo-list' ? (
                                  <DfoLogsListScreen
                                    onNewLog={() => {
                                      setEditingLogId(null);
                                      setView('dfo-demo');
                                    }}
                                    onEditLog={(logId) => {
                                      setEditingLogId(logId);
                                      setView('dfo-demo');
                                    }}
                                  />
                                ) : view === 'dfo-demo' ? (
                                  <DfoDemoScreen
                                    onClose={() => setView('dfo-list')}
                                    editingLogId={editingLogId}
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

                  {/* RESET SEASON BUTTON */}
                  <TouchableOpacity onPress={handleResetSeason} style={styles.resetSeasonButton}>
                    <View style={styles.resetSeasonIconBox}>
                      <RotateCcw size={20} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resetSeasonTitle}>Start New Bait Season</Text>
                      <Text style={styles.resetSeasonSub}>Clear graph & start fresh</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
              {view === 'log' && (
                <View style={styles.logContainer}>
                  <View style={styles.dateNav}>
                    <TouchableOpacity
                      onPress={() => handleDateChange(-1)}
                      style={styles.arrowButton}
                    >
                      <ChevronLeft size={24} color="#475569" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      style={{ alignItems: 'center' }}
                    >
                      <Text style={styles.dateText}>
                        {currentDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      <Text style={styles.yearText}>{currentDate.getFullYear()} ▾</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDateChange(1)}
                      style={styles.arrowButton}
                    >
                      <ChevronRight size={24} color="#475569" />
                    </TouchableOpacity>
                  </View>

                  {showDatePicker && (
                    <DateTimePicker
                      testID="dateTimePicker"
                      value={currentDate}
                      mode="date"
                      display="default"
                      onChange={handleCalendarChange}
                    />
                  )}

                  <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}>
                      <View style={styles.statLabelRow}>
                        <CalendarIcon size={14} color="#94A3B8" />
                        <Text style={styles.statLabel}>DAYS OUT</Text>
                      </View>
                      <Text style={styles.statValue}>{stats.daysFishedThisSeason}</Text>
                      <Text style={styles.statSub}>This season</Text>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#EF4444' }]}>
                      <View style={styles.statLabelRow}>
                        <Scale size={14} color="#94A3B8" />
                        <Text style={styles.statLabel}>THIS WEEK</Text>
                      </View>
                      <Text style={styles.statValue}>
                        {stats.lbsCaughtThisWeek.toLocaleString()}
                      </Text>
                      <Text style={styles.statSub}>Sun - Sat</Text>
                    </View>
                  </View>

                  <View style={styles.formCard}>
                    <View style={styles.formHeader}>
                      <View style={styles.formTitleRow}>
                        <View style={styles.iconBox}>
                          <FileText size={16} color="#2563EB" />
                        </View>
                        <Text style={styles.formTitle}>Daily Log</Text>
                      </View>
                      {saving && <Text style={styles.savingText}>Saving...</Text>}
                    </View>
                    <View style={styles.formBody}>
                      <View style={styles.row}>
                        <View style={styles.col}>
                          <Text style={styles.label}>LBS CAUGHT</Text>
                          <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={formData.lbs}
                            onChangeText={(t) => setFormData({ ...formData, lbs: t })}
                            placeholder="0"
                          />
                        </View>
                        <View style={styles.col}>
                          <Text style={styles.label}>PRICE / LB</Text>
                          <View style={styles.inputWithIcon}>
                            <Text style={styles.prefix}>$</Text>
                            <TextInput
                              style={[styles.input, { paddingLeft: 20 }]}
                              keyboardType="numeric"
                              value={formData.price}
                              onChangeText={(t) => setFormData({ ...formData, price: t })}
                              placeholder="0.00"
                            />
                          </View>
                        </View>
                      </View>
                      <View style={styles.row}>
                        <View style={styles.col}>
                          <Text style={styles.label}>WATER TEMP</Text>
                          <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={formData.temp}
                            onChangeText={(t) => setFormData({ ...formData, temp: t })}
                            placeholder="--"
                          />
                        </View>
                        <View style={styles.col}>
                          <Text style={styles.label}>WIND (KTS)</Text>
                          <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={formData.wind}
                            onChangeText={(t) => setFormData({ ...formData, wind: t })}
                            placeholder="--"
                          />
                        </View>
                      </View>
                      <View style={{ marginTop: 10, marginBottom: 5 }}>
                        <Text style={styles.label}>WIND DIRECTION</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.pickerScroll}
                        >
                          {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map((dir) => {
                            const isSelected = formData.windDir === dir;
                            return (
                              <TouchableOpacity
                                key={dir}
                                onPress={() => setFormData({ ...formData, windDir: dir })}
                                style={[styles.chip, isSelected && styles.chipActive]}
                              >
                                <Text
                                  style={[styles.chipText, isSelected && styles.chipTextActive]}
                                >
                                  {dir}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                      <View>
                        <Text style={styles.label}>CONDITIONS</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.pickerScroll}
                        >
                          {WEATHER_OPTIONS.map((opt) => {
                            const isSelected = Array.isArray(formData.weather)
                              ? formData.weather.includes(opt)
                              : formData.weather === opt;
                            return (
                              <TouchableOpacity
                                key={opt}
                                onPress={() => toggleWeather(opt)}
                                style={[styles.chip, isSelected && styles.chipActive]}
                              >
                                <Text
                                  style={[styles.chipText, isSelected && styles.chipTextActive]}
                                >
                                  {opt}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                      <View>
                        <Text style={styles.label}>NOTES</Text>
                        <TextInput
                          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                          multiline
                          value={formData.notes}
                          onChangeText={(t) => setFormData({ ...formData, notes: t })}
                          placeholder="Crew, gear issues..."
                        />
                      </View>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.saveButton} onPress={() => saveLogData()}>
                          <Save size={20} color="#FFF" />
                          <Text style={styles.saveButtonText}>Save Log</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <View style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <History size={16} color="#92400E" />
                      <Text style={styles.historyTitle}>
                        History (Week of{' '}
                        {historyWeekDays[0].toLocaleDateString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                        })}
                        )
                      </Text>
                    </View>
                    <View style={styles.historyWeekContainer}>
                      {historyWeekDays.map((dateObj) => {
                        const isSelected =
                          dateObj.getDate() === selectedHistoryDate.getDate() &&
                          dateObj.getMonth() === selectedHistoryDate.getMonth();
                        const hasEvent = hasHistoryEvent(dateObj);
                        return (
                          <TouchableOpacity
                            key={dateObj.toISOString()}
                            style={[styles.historyDayBtn, isSelected && styles.historyDayBtnActive]}
                            onPress={() => setSelectedHistoryDate(dateObj)}
                          >
                            <Text
                              style={[
                                styles.historyDayText,
                                isSelected && styles.historyDayTextActive,
                              ]}
                            >
                              {dateObj.toLocaleDateString('en-US', { weekday: 'narrow' })}
                            </Text>
                            <Text
                              style={[
                                styles.historyDateText,
                                isSelected && styles.historyDayTextActive,
                              ]}
                            >
                              {dateObj.getDate()}
                            </Text>
                            {hasEvent && <View style={styles.historyDot} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={styles.historyListContainer}>
                      <Text style={styles.historySubHeader}>
                        Events for {selectedHistoryDate.toLocaleDateString()}:
                      </Text>
                      {stats.historyMatches.length > 0 ? (
                        stats.historyMatches.map((log) => (
                          <View key={log.dateId} style={styles.historyRow}>
                            <View style={{ flex: 1 }}>
                              <View style={styles.historyRowHeader}>
                                <View>
                                  <View style={styles.historyYearRow}>
                                    <Text style={styles.historyYear}>{log.year}</Text>
                                    {log.haulNumber > 0 && (
                                      <View style={styles.haulBadge}>
                                        <Text style={styles.haulBadgeText}>
                                          Haul {log.haulNumber}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text style={styles.historyLbsLarge}>
                                    {Number(log.lbs).toLocaleString()} lbs
                                  </Text>
                                </View>
                                <Text style={styles.historyPriceLarge}>
                                  ${log.price || '--'}/lb
                                </Text>
                              </View>
                              <View style={styles.historyDetailBox}>
                                <Text style={styles.historyDetailsLarge}>
                                  {log.temp ? `${log.temp}°F` : ''}
                                  {log.wind
                                    ? ` • ${log.wind}${log.gust ? `-${log.gust}` : ''}kts ${
                                        log.windDir || ''
                                      }`
                                    : ''}
                                  {log.swell ? ` • ${log.swell}m Swell` : ''}
                                </Text>
                                {log.weather && (
                                  <Text
                                    style={[
                                      styles.historyDetailsLarge,
                                      { marginTop: 4, fontStyle: 'italic' },
                                    ]}
                                  >
                                    {Array.isArray(log.weather)
                                      ? log.weather.join(', ')
                                      : log.weather}
                                  </Text>
                                )}
                              </View>
                              {log.notes ? (
                                <View style={styles.historyNoteContainer}>
                                  <Text style={styles.historyNoteText}>"{log.notes}"</Text>
                                </View>
                              ) : null}
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
                    <View style={styles.locationHeaderRow}>
                      <MapPin size={24} color="#FBBF24" />
                      <Text style={styles.cardHeader}>Fishing Location</Text>
                      {isPro && (
                        <View style={styles.proBadge}>
                          <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.settingsCoordBox}>
                      <Text style={styles.settingsCoordLabel}>CURRENT COORDINATES</Text>
                      <Text style={styles.settingsCoordValue}>
                        {parseFloat(profile.lat || 43.44).toFixed(4)},{' '}
                        {parseFloat(profile.lng || -65.62).toFixed(4)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.outlineButton]}
                      onPress={() => {
                        if (!isPro) {
                          setPaywallVisible(true);
                          return;
                        }
                        setTempLat(profile.lat || '');
                        setTempLng(profile.lng || '');
                        setLocationModalVisible(true);
                      }}
                    >
                      {isPro ? (
                        <Text style={styles.outlineButtonText}>Update Coordinates</Text>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Lock size={14} color="#475569" />
                          <Text style={styles.outlineButtonText}>Upgrade to Change Location</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeader}>Captain & Boat</Text>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>CAPTAIN NAME</Text>
                      <TextInput
                        style={styles.input}
                        value={profile.captainName}
                        onChangeText={(t) => setProfile((p) => ({ ...p, captainName: t }))}
                        placeholder="John Doe"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>BOAT NAME</Text>
                      <TextInput
                        style={styles.input}
                        value={profile.boatName}
                        onChangeText={(t) => setProfile((p) => ({ ...p, boatName: t }))}
                        placeholder="The Blue Fin"
                      />
                    </View>
                  </View>

                  <View style={styles.card}>
                    <View
                      style={[styles.row, { justifyContent: 'space-between', marginBottom: 15 }]}
                    >
                      <TouchableOpacity onPress={() => setManageYear(manageYear - 1)}>
                        <ChevronLeft size={20} color="#2563EB" />
                      </TouchableOpacity>
                      <Text style={{ fontWeight: 'bold', color: '#1E3A8A' }}>
                        {manageYear} Season Config
                      </Text>
                      <TouchableOpacity onPress={() => setManageYear(manageYear + 1)}>
                        <ChevronRight size={20} color="#2563EB" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.row}>
                      <View style={styles.col}>
                        <Text style={styles.label}>START DATE</Text>
                        <TextInput
                          style={styles.input}
                          value={editSeasonConfig.start}
                          onChangeText={(t) => {
                            const currentConfig =
                              (profile.seasons && profile.seasons[manageYear]) ||
                              getDefaultSeasonConfig(manageYear);
                            setProfile((prev) => ({
                              ...prev,
                              seasons: {
                                ...(prev.seasons || {}),
                                [manageYear]: { ...currentConfig, start: t },
                              },
                            }));
                          }}
                        />
                      </View>
                      <View style={styles.col}>
                        <Text style={styles.label}>END DATE</Text>
                        <TextInput
                          style={styles.input}
                          value={editSeasonConfig.end}
                          onChangeText={(t) => {
                            const currentConfig =
                              (profile.seasons && profile.seasons[manageYear]) ||
                              getDefaultSeasonConfig(manageYear);
                            setProfile((prev) => ({
                              ...prev,
                              seasons: {
                                ...(prev.seasons || {}),
                                [manageYear]: { ...currentConfig, end: t },
                              },
                            }));
                          }}
                        />
                      </View>
                    </View>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                      <Text style={styles.saveButtonText}>Save Settings</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardHeader}>Account</Text>
                    <Text style={styles.signedInText}>Signed in as: {user.email}</Text>

                    {/* 1. TUTORIAL BUTTON */}
                    <TouchableOpacity
                      onPress={() => {
                        if (isPro) {
                          setTutorialVisible(true);
                        } else {
                          setPaywallVisible(true);
                        }
                      }}
                      style={styles.tutorialButton}
                    >
                      <View style={styles.tutorialIconBox}>
                        {isPro ? (
                          <Navigation size={20} color="#0284C7" />
                        ) : (
                          <Lock size={20} color="#0284C7" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tutorialTitle}>How to Use LobsterLog</Text>
                        <Text style={styles.tutorialSub}>
                          {isPro
                            ? 'Learn the map cycles & heatmap'
                            : 'Upgrade to unlock User Guide'}
                        </Text>
                      </View>
                      <ChevronRight size={20} color="#94A3B8" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleManageSubscription}
                      style={styles.manageSubButton}
                    >
                      <Text style={styles.manageSubText}>Manage Subscription</Text>
                    </TouchableOpacity>

                    {/* 2. SIGN OUT */}
                    <TouchableOpacity style={styles.outlineButton} onPress={handleSignOut}>
                      <LogOut size={16} color="#475569" />
                      <Text style={styles.outlineButtonText}>Sign Out</Text>
                    </TouchableOpacity>

                    {/* 3. DELETE ACCOUNT */}
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={locationModalVisible}
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Fishing Location</Text>
            <Text style={styles.modalSubtitle}>
              Weather data will generate based on this point.
            </Text>
            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleGetCurrentLocation}
              disabled={isFetchingLocation}
            >
              {isFetchingLocation ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <>
                  <LocateFixed size={18} color="#2563EB" style={{ marginRight: 8 }} />
                  <Text style={styles.gpsButtonText}>Use Current GPS Location</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.inputLabel}>LATITUDE</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="43.4426"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={tempLat}
              onChangeText={setTempLat}
            />
            <Text style={styles.inputLabel}>LONGITUDE</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="-65.6290"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={tempLng}
              onChangeText={setTempLng}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setLocationModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={{ color: '#94A3B8' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveLocation} style={styles.modalSaveButton}>
                <Text style={{ color: '#1E293B', fontWeight: 'bold' }}>Save & Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TutorialModal visible={tutorialVisible} onClose={() => setTutorialVisible(false)} />

      {isReady && (
        <PaywallModal
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          onRestore={restorePurchases}
          onPurchaseSuccess={() => {
            setIsProStatus(true);
            setPaywallVisible(false);
            Alert.alert('Welcome to Pro!', 'You now have access to all charts and weather data.');
          }}
        />
      )}
    </View>
        </TimerProvider>
  );
}