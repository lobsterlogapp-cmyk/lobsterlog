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
  TouchableWithoutFeedback
} from 'react-native';

import { Svg, Path, Rect, Line, Circle } from 'react-native-svg';
import MapView, { UrlTile, Polyline, Marker } from 'react-native-maps';
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

// --- REVENUECAT IMPORTS ---
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// ⚠️ REPLACE WITH YOUR REAL KEYS FROM REVENUECAT DASHBOARD ⚠️
const API_KEYS = {
  apple: 'appl_AowyslcahlREELrBvDwiZCNGoet',
  google: 'goog_SfShqGNnKyMOcmJZpTrKEUXoYeR'
};
// The identifier you set in RevenueCat for your entitlement
const ENTITLEMENT_ID = 'Lobster Log Pro';

// --- ICONS ---
import {
  Layers, X, Plus, Minus, Play, Square, Trash2, Lock,
  ChevronLeft, ChevronRight, Settings, TrendingUp, Anchor,
  Crown, LogOut, Calendar as CalendarIcon, Scale, FileText,
  Save, History, MapPin, Mail, Ban, Wind, Waves, Thermometer, Navigation, RotateCcw, LocateFixed
} from 'lucide-react-native';

// --- CONFIGURATION ---
// ⚠️ REPLACE THIS WITH YOUR REAL STORMGLASS API KEY ⚠️
const STORMGLASS_API_KEY = '39f9eb1e-e694-11f0-a8f4-0242ac130003-39f9eb8c-e694-11f0-a8f4-0242ac130003';

// --- SIMPLIFIED PRO DASHBOARD (Weather Display Only) ---
const ProDashboard = ({ isPro, onOpenMap, lat, lng }) => {
    // Weather Data State
    const [current, setCurrent] = useState(null);
    const [forecast, setForecast] = useState([]);
    const [longRange, setLongRange] = useState([]);
    const [tides, setTides] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch Data when lat/lng changes
    useEffect(() => {
        if (isPro && lat && lng) {
            setLoading(true);
            fetchAllData(lat, lng);
        }
    }, [isPro, lat, lng]);

    const fetchAllData = async (lat, lng) => {
        try {
            setLoading(true);
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const weatherParams = 'airTemperature,waterTemperature,waveHeight,windSpeed,windDirection,gust';
            const weatherUrl = `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=${weatherParams}`;
            const tideUrl = `https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lng}&start=${now.toISOString()}&end=${tomorrow.toISOString()}`;

            const [weatherRes, tideRes] = await Promise.all([
                fetch(weatherUrl, { headers: { 'Authorization': STORMGLASS_API_KEY } }),
                fetch(tideUrl, { headers: { 'Authorization': STORMGLASS_API_KEY } })
            ]);

            const weatherData = await weatherRes.json();
            const tideData = await tideRes.json();

            if (weatherData.errors) throw new Error(JSON.stringify(weatherData.errors));

            if (weatherData.hours && weatherData.hours.length > 0) {
                setCurrent(weatherData.hours[0]);
                const allFutureHours = weatherData.hours.filter(h => new Date(h.time) > now);
                setForecast(allFutureHours.slice(0, 72));
                const distantData = allFutureHours.slice(72).filter(h => {
                    const hour = new Date(h.time).getHours();
                    return hour === 6 || hour === 18;
                });
                setLongRange(distantData);
            }
            if (tideData.data) setTides(tideData.data);

        } catch (err) {
            console.log(err);
            setError("Limit reached or API Error.");
        } finally {
            setLoading(false);
        }
    };

    // Formatters
    const formatTime = (isoString) => new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const formatDate = (isoString) => new Date(isoString).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    if (!isPro) {
        return (
            <View style={styles.proContainer}>
                <View style={styles.proBanner}>
                    <Lock size={60} color="#FBBF24" />
                    <Text style={styles.proTitle}>LobsterLog Pro</Text>
                    <Text style={{color: '#94A3B8', textAlign: 'center', marginTop: 10, paddingHorizontal: 40, lineHeight: 22}}>
                        Upgrade to unlock live marine weather, tides, and advanced charts.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.proContainer}>
            <ScrollView>
                <View style={styles.proHeader}>
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                        <View>
                            <Text style={styles.proLocation}>LAT: {parseFloat(lat || 0).toFixed(4)}</Text>
                            <Text style={styles.proLocation}>LNG: {parseFloat(lng || 0).toFixed(4)}</Text>
                            <Text style={styles.proTime}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                        </View>

                        <TouchableOpacity onPress={onOpenMap} style={{backgroundColor: '#334155', padding: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6}}>
                            <Text style={{color: '#FBBF24', fontWeight: 'bold', fontSize: 12}}>OPEN CHART</Text>
                            <Navigation size={18} color="#FBBF24" />
                        </TouchableOpacity>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FBBF24" style={{marginTop: 50}} />
                ) : error ? (
                    <Text style={{color: '#F87171', textAlign: 'center', marginTop: 20}}>{error}</Text>
                ) : current ? (
                    <View>
                        <View style={styles.weatherGrid}>
                            <View style={styles.weatherCard}>
                                <View style={styles.weatherIconBox}><Waves size={24} color="#3B82F6" /></View>
                                <Text style={styles.weatherLabel}>SWELL</Text>
                                <Text style={styles.weatherValue}>{current.waveHeight?.noaa?.toFixed(1) || '--'} m</Text>
                            </View>
                            <View style={styles.weatherCard}>
                                <View style={styles.weatherIconBox}><Wind size={24} color="#10B981" /></View>
                                <Text style={styles.weatherLabel}>WIND</Text>
                                <Text style={styles.weatherValue}>{((current.windSpeed?.noaa || 0) * 1.94384).toFixed(1)} kts</Text>
                                {current.gust?.noaa && <Text style={{ color: '#F87171', fontSize: 13, fontWeight: 'bold', marginTop: 2 }}>Gust: {((current.gust.noaa) * 1.94384).toFixed(1)} kts</Text>}
                                <Text style={styles.weatherSub}>{getWindDirection(current.windDirection?.noaa)} ({current.windDirection?.noaa?.toFixed(0)}°)</Text>
                            </View>
                            <View style={styles.weatherCard}>
                                <View style={styles.weatherIconBox}><Thermometer size={24} color="#EF4444" /></View>
                                <Text style={styles.weatherLabel}>WATER</Text>
                                <Text style={styles.weatherValue}>{((current.waterTemperature?.noaa || 0) * 9/5 + 32).toFixed(1)}°F</Text>
                            </View>
                            <View style={styles.weatherCard}>
                                <View style={styles.weatherIconBox}><Crown size={24} color="#F59E0B" /></View>
                                <Text style={styles.weatherLabel}>AIR</Text>
                                <Text style={styles.weatherValue}>{((current.airTemperature?.noaa || 0) * 9/5 + 32).toFixed(1)}°F</Text>
                            </View>
                        </View>

                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Tides (Today)</Text>
                            {tides.length > 0 ? (
                                tides.map((tide, index) => (
                                    <View key={index} style={styles.tideRow}>
                                        <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                                            {tide.type === 'high' ? <TrendingUp size={16} color="#10B981"/> : <TrendingUp size={16} color="#F87171" style={{transform: [{rotate: '180deg'}]}} />}
                                            <Text style={styles.tideType}>{tide.type === 'high' ? 'High Tide' : 'Low Tide'}</Text>
                                        </View>
                                        <View style={{flexDirection:'row', alignItems:'center', gap: 15}}>
                                            <Text style={styles.tideTime}>{formatTime(tide.time)}</Text>
                                            <Text style={styles.tideHeight}>{tide.height.toFixed(1)}m</Text>
                                        </View>
                                    </View>
                                ))
                            ) : (<Text style={{color: '#94A3B8', fontStyle: 'italic'}}>No tide data available.</Text>)}
                        </View>

                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>3 Day Forecast (Hourly)</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {forecast.map((hour, i) => (
                                    <View key={i} style={[styles.forecastCard, { padding: 16, minWidth: 110 }]}>
                                        <Text style={[styles.forecastTime, { fontSize: 14 }]}>{formatTime(hour.time)}</Text>
                                        <Text style={[styles.forecastTime, { fontSize: 12, marginTop: -2, marginBottom: 8, opacity: 0.8 }]}>
                                            {formatDate(hour.time).split(',')[0]}
                                        </Text>

                                        <View style={[styles.forecastDivider, { marginBottom: 10 }]} />

                                        <View style={styles.forecastRow}>
                                            <Wind size={18} color="#94A3B8"/>
                                            <Text style={[styles.forecastValue, { fontSize: 16 }]}>{((hour.windSpeed?.noaa || 0) * 1.94384).toFixed(0)} kts</Text>
                                        </View>

                                        {hour.gust?.noaa && (
                                            <Text style={{ color: '#F87171', fontSize: 13, fontWeight: 'bold' }}>
                                                G: {((hour.gust.noaa) * 1.94384).toFixed(0)}
                                            </Text>
                                        )}

                                        <Text style={[styles.forecastUnit, { fontSize: 12, marginTop: 4 }]}>{getWindDirection(hour.windDirection?.noaa)}</Text>

                                        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Waves size={18} color="#3B82F6"/>
                                            <Text style={[styles.forecastValue, { fontSize: 16 }]}>{hour.waveHeight?.noaa?.toFixed(1)} m</Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Long Range Outlook (Days 4-10)</Text>
                            {longRange.map((hour, index) => (
                                <View key={index} style={styles.longRangeRow}>
                                    <View style={{width: 90}}>
                                        <Text style={{color: 'white', fontWeight: 'bold', fontSize: 15}}>{formatDate(hour.time)}</Text>
                                        <Text style={{color: '#94A3B8', fontSize: 13}}>{new Date(hour.time).getHours() < 12 ? 'Morning' : 'Evening'}</Text>
                                    </View>
                                    <View style={{flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'}}>
                                        <View style={{alignItems: 'center'}}>
                                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                                                <Wind size={18} color="#10B981" />
                                                <Text style={{color: 'white', fontWeight: 'bold', fontSize: 18}}>{((hour.windSpeed?.noaa || 0) * 1.94384).toFixed(0)} kts</Text>
                                            </View>
                                             {hour.gust?.noaa && (
                                                <Text style={{ color: '#F87171', fontSize: 13, fontWeight: 'bold' }}>
                                                    G: {((hour.gust.noaa) * 1.94384).toFixed(0)}
                                                </Text>
                                            )}
                                            <Text style={{color: '#64748B', fontSize: 13}}>{getWindDirection(hour.windDirection?.noaa)}</Text>
                                        </View>
                                        <View style={{alignItems: 'center'}}>
                                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                                                <Waves size={18} color="#3B82F6" />
                                                <Text style={{color: 'white', fontWeight: 'bold', fontSize: 18}}>{hour.waveHeight?.noaa?.toFixed(1)} m</Text>
                                            </View>
                                            <Text style={{color: '#64748B', fontSize: 13}}>Swell</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}
                <View style={{height: 40}} />
            </ScrollView>
        </View>
    );
};

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
            <View style={{height: Platform.OS === 'ios' ? 60 : 20}} />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{flex: 1}}
            >
                <ScrollView
                    contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.loginContent}>
                        <View style={styles.loginHeader}>
                            <View style={styles.logoCircle}><Anchor size={40} color="#F87171" /></View>
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
                                <TouchableOpacity onPress={handleForgotPassword} style={{alignSelf: 'flex-end', marginBottom: 15, marginTop: -10}}>
                                    <Text style={{color: '#3B82F6', fontWeight: '600', fontSize: 13}}>Forgot Password?</Text>
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

// --- Graph Component ---
const HistoryGraph = ({ logs, startYear, onYearChange, profile }) => {
    if (!profile || !profile.seasons) return null;

    const range = useMemo(() => {
        const conf = profile.seasons[startYear] || getDefaultSeasonConfig(startYear);
        return {
            start: parseLocalDate(conf.start),
            end: parseLocalDate(conf.end),
            label: `${startYear}/${(startYear + 1).toString().slice(-2)} Season`
        };
    }, [profile, startYear]);

    const dataPoints = useMemo(() => {
        return Object.values(logs).filter(log => {
            const logDate = parseLocalDate(log.dateId);
            const hasWeight = Number(log.lbs) > 0;
            return logDate >= range.start && logDate <= range.end && hasWeight;
        }).sort((a, b) => a.dateId.localeCompare(b.dateId)).map(log => ({
            date: parseLocalDate(log.dateId),
            lbs: Number(log.lbs) || 0,
            temp: Number(log.temp) || 0
        }));
    }, [logs, range]);

    const totals = useMemo(() => {
        const totalLbs = dataPoints.reduce((acc, curr) => acc + curr.lbs, 0);
        const validTemps = dataPoints.filter(d => d.temp > 0);
        const avgTemp = validTemps.length > 0 ? (validTemps.reduce((acc, curr) => acc + curr.temp, 0) / validTemps.length).toFixed(1) : 0;
        return { totalLbs, avgTemp };
    }, [dataPoints]);

    const width = 350; const height = 200; const padding = 20;
    const maxLbs = Math.max(...dataPoints.map(d => d.lbs), 100);
    const minTemp = Math.min(...dataPoints.filter(d => d.temp > 0).map(d => d.temp), 30);
    const maxTemp = Math.max(...dataPoints.map(d => d.temp), minTemp + 10);

    const getX = (index) => padding + (index / (dataPoints.length - 1 || 1)) * (width - 2 * padding);
    const getY_Lbs = (lbs) => height - padding - (lbs / maxLbs) * (height - 2 * padding);
    const getY_Temp = (temp) => height - padding - ((temp - minTemp) / (maxTemp - minTemp)) * (height - 2 * padding);

    const tempPath = dataPoints.map((d, i) => {
        if (d.temp === 0) return null;
        const x = getX(i); const y = getY_Temp(d.temp);
        return `${i === 0 || dataPoints[i-1].temp === 0 ? 'M' : 'L'} ${x},${y}`;
    }).filter(p => p !== null).join(' ');

    return (
        <View style={styles.card}>
            <View style={styles.graphHeader}>
                <View style={styles.yearNav}>
                    <TouchableOpacity onPress={() => onYearChange(startYear - 1)} style={styles.iconButton}><ChevronLeft size={24} color="#475569" /></TouchableOpacity>
                    <Text style={styles.graphTitle}>{range.label}</Text>
                    <TouchableOpacity onPress={() => onYearChange(startYear + 1)} style={styles.iconButton}><ChevronRight size={24} color="#475569" /></TouchableOpacity>
                </View>
                <View style={styles.statsRow}>
                    <View style={styles.statBadge}><View style={[styles.dot, { backgroundColor: '#60A5FA' }]} /><Text style={styles.statText}>{totals.totalLbs.toLocaleString()} lbs</Text></View>
                    <View style={styles.statBadge}><View style={[styles.dot, { backgroundColor: '#EF4444' }]} /><Text style={styles.statText}>Avg {totals.avgTemp}°F</Text></View>
                </View>
            </View>
            {dataPoints.length > 0 ? (
                <View style={{ alignItems: 'center' }}>
                    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E2E8F0" strokeWidth="1" />
                        <Line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#E2E8F0" strokeWidth="1" />
                        {dataPoints.map((d, i) => (<Rect key={`bar-${i}`} x={getX(i) - 2} y={getY_Lbs(d.lbs)} width={4} height={height - padding - getY_Lbs(d.lbs)} fill="#60A5FA" opacity={0.6} />))}
                        <Path d={tempPath} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {dataPoints.map((d, i) => d.temp > 0 && (<Circle key={`dot-${i}`} cx={getX(i)} cy={getY_Temp(d.temp)} r="2" fill="#EF4444" />))}
                    </Svg>
                </View>
            ) : (<View style={styles.emptyGraph}><Text style={styles.emptyGraphText}>No data recorded for this period.</Text></View>)}
        </View>
    );
};

/// --- BAIT STATS COMPONENT (Season Aware) ---
 const BaitStats = ({ user, isPro, onUnlock }) => {
     // 1. HOOKS ALWAYS GO FIRST
     const [averages, setAverages] = useState([]);
     const [loading, setLoading] = useState(true);
     const [seasonStart, setSeasonStart] = useState(null);

     // 2. THEN THE EFFECTS
     useEffect(() => {
         if (!user) return;
         const unsubConfig = onSnapshot(doc(db, 'users', user.uid, 'settings', 'seasonConfig'), (snap) => {
             if (snap.exists() && snap.data().baitSeasonStart) {
                 setSeasonStart(new Date(snap.data().baitSeasonStart));
             } else {
                 setSeasonStart(null);
             }
         });
         return () => unsubConfig();
     }, [user]);

     useEffect(() => {
         if (!user) return;
         const q = query(collection(db, 'users', user.uid, 'trawls'), where("status", "==", "history"));
         const unsubscribe = onSnapshot(q, (snapshot) => {
             const baitMap = {};
             snapshot.forEach((doc) => {
                 const data = doc.data();
                 if (seasonStart) {
                     const trawlDate = data.timestamp ? new Date(data.timestamp) : new Date(data.haulDate);
                     if (trawlDate < seasonStart) return;
                 }
                 const bait = data.bait || 'Unknown';
                 const count = data.count || 0;
                 if (!baitMap[bait]) baitMap[bait] = { totalCatch: 0, strings: 0 };
                 baitMap[bait].totalCatch += count;
                 baitMap[bait].strings += 1;
             });
             const stats = Object.keys(baitMap).map(bait => ({
                 bait,
                 avg: (baitMap[bait].totalCatch / baitMap[bait].strings).toFixed(1),
                 strings: baitMap[bait].strings
             })).sort((a, b) => b.avg - a.avg);
             setAverages(stats);
             setLoading(false);
         });
         return () => unsubscribe();
     }, [user, seasonStart]);

     // 3. FINALLY, THE CONDITIONAL RENDER (The Lock Screen)
     if (!isPro) {
         return (
             <TouchableOpacity onPress={onUnlock} activeOpacity={0.8}>
                 <View style={{backgroundColor: '#F1F5F9', margin: 20, padding: 20, borderRadius: 16, alignItems: 'center'}}>
                     <Lock size={32} color="#94A3B8" style={{marginBottom: 10}}/>
                     <Text style={{fontWeight: 'bold', fontSize: 16, color: '#334155'}}>Bait Performance</Text>
                     <Text style={{textAlign: 'center', color: '#64748B', marginTop: 5}}>Upgrade to Pro to track which bait catches the most lobsters.</Text>
                 </View>
             </TouchableOpacity>
         );
     }

     // 4. THE REAL CONTENT
     if (loading) return <ActivityIndicator color="#2563EB" style={{margin: 20}} />;

     if (averages.length === 0) {
         return (
             <View style={{margin: 20, padding: 20, backgroundColor: 'white', borderRadius: 16, alignItems: 'center'}}>
                 <Text style={{color: '#64748B'}}>No bait data for this season yet.</Text>
                 <Text style={{fontSize: 12, color: '#94A3B8', marginTop: 5}}>Log some trawls to see stats!</Text>
             </View>
         );
     }

     return (
         <View style={{margin: 20, padding: 20, backgroundColor: 'white', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10}}>
             <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15}}>
                 <Text style={{fontSize: 18, fontWeight: '900', color: '#0F172A'}}>Bait Performance</Text>
                 <View style={{backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6}}>
                     <Text style={{fontSize: 10, fontWeight: 'bold', color: '#2563EB'}}>AVG LOBSTERS / TRAWL</Text>
                 </View>
             </View>

             {averages.map((item, index) => (
                 <View key={index} style={{marginBottom: 16}}>
                     <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                         <Text style={{fontWeight: 'bold', color: '#334155'}}>{item.bait}</Text>
                         <Text style={{fontWeight: '900', color: '#0F172A'}}>{item.avg} <Text style={{fontSize: 10, color: '#94A3B8', fontWeight: 'normal'}}>avg</Text></Text>
                     </View>
                     <View style={{height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden'}}>
                         <View style={{
                             height: '100%',
                             width: `${Math.min((item.avg / (averages[0].avg * 1.2)) * 100, 100)}%`,
                             backgroundColor: index === 0 ? '#10B981' : '#3B82F6',
                             borderRadius: 4
                         }} />
                     </View>
                     <Text style={{fontSize: 10, color: '#94A3B8', marginTop: 4}}>{item.strings} strings logged</Text>
                 </View>
             ))}
         </View>
     );
 };

// --- FISHING MAP COMPONENT (With Year Tags & Tighter Filters) ---
const FishingMap = ({ savedLat, savedLng, onClose, user, dateId }) => {
    // 1. Setup State
    const mapRef = useRef(null);
    const regionRef = useRef(null);
    const [currentUser, setCurrentUser] = useState(user || auth.currentUser);

    // 2. Tracking State
    const [isRecording, setIsRecording] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [myLocation, setMyLocation] = useState(null);

    // Follow Mode State
    const [followUser, setFollowUser] = useState(true);

    // 3. Data State
    const [todaysTrawls, setTodaysTrawls] = useState([]);
    const [historicalTrawls, setHistoricalTrawls] = useState([]);

    // 4. UI State
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedTrawl, setSelectedTrawl] = useState(null);

    // 5. Form & Bait State
    const [trawlNumber, setTrawlNumber] = useState('');
    const [catchCount, setCatchCount] = useState('');
    const [selectedBait, setSelectedBait] = useState('Herring');
    const [baitList, setBaitList] = useState(['Herring', 'Mackerel', 'Redfish', 'Flounder', 'Artificial', 'Mix']);
    const [isAddingBait, setIsAddingBait] = useState(false);
    const [newBaitName, setNewBaitName] = useState('');

    const initialRegion = {
        latitude: parseFloat(savedLat) || 43.44,
        longitude: parseFloat(savedLng) || -65.62,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    // --- FORCE USER DETECTION ---
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            if (u) setCurrentUser(u);
        });
        return () => unsubscribe();
    }, []);

    // --- LOAD CUSTOM BAITS ---
    useEffect(() => {
        const loadCustomBaits = async () => {
            if (!currentUser) return;
            try {
                const docRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
                const snap = await getDoc(docRef);
                if (snap.exists() && snap.data().customBaits) {
                    setBaitList(prev => [...prev, ...snap.data().customBaits]);
                }
            } catch (e) { console.log("No custom baits found yet"); }
        };
        loadCustomBaits();
    }, [currentUser]);

    // --- DATA LISTENERS ---
    useEffect(() => {
        if (!currentUser) return;
        // Listen for ACTIVE gear (White Lines)
        const q = query(collection(db, 'users', currentUser.uid, 'trawls'), where("status", "==", "active"));
        const unsubscribe = onSnapshot(q, (snap) => {
            const data = [];
            snap.forEach(d => data.push({ id: d.id, ...d.data() }));
            setTodaysTrawls(data);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // --- HEATMAP LOGIC (Updated for Strict Date Window) ---
    // --- HEATMAP LOGIC (Strict 4-Week Window: +/- 14 Days) ---
        useEffect(() => {
            if (!showHeatmap || !currentUser) return;

            const fetchHistory = async () => {
                const snap = await getDocs(collection(db, 'users', currentUser.uid, 'trawls'));

                // 1. Get our Target Day/Month (ignore the current year)
                // We set the target to the year 2000 so we can do math easily
                const targetDate = new Date(dateId);
                const normTarget = new Date(2000, targetDate.getMonth(), targetDate.getDate());

                const matches = [];
                const WINDOW_DAYS = 14; // 2 Weeks
                const YEAR_DAYS = 366;  // Year 2000 was a leap year

                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'active') return;

                    // Use haulDate if available, otherwise setDate
                    const relevantDateString = data.haulDate || data.dateId;
                    if (!relevantDateString) return;

                    const d = new Date(relevantDateString);

                    // 2. Normalize the history log to the same year (2000)
                    const normHistory = new Date(2000, d.getMonth(), d.getDate());

                    // 3. Calculate the difference in Days
                    const diffTime = Math.abs(normTarget - normHistory);
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);

                    // 4. THE FILTER
                    // Check if it's within 14 days OR if it wraps around the New Year
                    // (e.g. comparing Dec 28 to Jan 4 is a small gap, even though math says 360 days)
                    const isRelevant = diffDays <= WINDOW_DAYS || diffDays >= (YEAR_DAYS - WINDOW_DAYS);

                    if (isRelevant) {
                         matches.push({
                             id: doc.id,
                             ...data,
                             displayYear: d.getFullYear().toString().slice(-2) // '23, '24
                         });
                    }
                });
                setHistoricalTrawls(matches);
            };
            fetchHistory();
        }, [showHeatmap, currentUser, dateId]);

    // --- HANDLERS ---
    const handleStartRecording = () => {
        setIsRecording(true);
        setFollowUser(true);
        setCurrentPath([]);
        setSelectedTrawl(null);
    };

    const onUserLocationChange = (e) => {
        if (e.nativeEvent.coordinate) {
            setMyLocation(e.nativeEvent.coordinate);
            if (followUser && mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: e.nativeEvent.coordinate.latitude,
                    longitude: e.nativeEvent.coordinate.longitude,
                    latitudeDelta: regionRef.current?.latitudeDelta || 0.05,
                    longitudeDelta: regionRef.current?.longitudeDelta || 0.05,
                }, 500);
            }
        }
        if (isRecording && e.nativeEvent.coordinate) {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setCurrentPath(prev => [...prev, { latitude, longitude }]);
        }
    };

    const handleStopRecording = () => {
        setIsRecording(false);
        setSelectedTrawl(null);
        setCatchCount('');
        setTrawlNumber('');
        setSelectedBait('Herring');
        setModalVisible(true);
    };

    const handleTrawlPress = (trawl) => {
        if (isRecording) return;
        setSelectedTrawl(trawl);
        setTrawlNumber(trawl.trawlNumber ? trawl.trawlNumber.toString() : '');
        setCatchCount(trawl.count.toString());
        setSelectedBait(trawl.bait || 'Herring');
        setModalVisible(true);
    };

    const handleAddCustomBait = async () => {
        if (!newBaitName.trim() || !currentUser) {
            setIsAddingBait(false);
            return;
        }
        const cleanName = newBaitName.trim();
        setBaitList(prev => [...prev, cleanName]);
        setSelectedBait(cleanName);
        try {
            await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'preferences'), {
                customBaits: arrayUnion(cleanName)
            }, { merge: true });
        } catch (e) { Alert.alert("Error saving bait", e.message); }
        setNewBaitName('');
        setIsAddingBait(false);
    };

    const handleDeleteTrawl = async () => {
        if (!selectedTrawl || !currentUser) return;
        Alert.alert("Delete Trawl?", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                setSaving(true);
                try {
                    await deleteDoc(doc(db, 'users', currentUser.uid, 'trawls', selectedTrawl.id));
                    setModalVisible(false);
                    setSelectedTrawl(null);
                } catch (error) { Alert.alert("Error", "Could not delete trawl."); } finally { setSaving(false); }
            }}
        ]);
    };

    // --- SAVE LOGIC ---
    const saveTrawl = async () => {
        const targetUser = currentUser || auth.currentUser;
        if (!targetUser) return;
        if (!trawlNumber) {
            Alert.alert("Missing Info", "Please enter a Trawl Number.");
            return;
        }

        setSaving(true);
        try {
            const batch = writeBatch(db);
            const trawlsRef = collection(db, 'users', targetUser.uid, 'trawls');

            if (selectedTrawl) {
                 // EDIT MODE
                 const trawlRef = doc(db, 'users', targetUser.uid, 'trawls', selectedTrawl.id);
                 batch.update(trawlRef, {
                     trawlNumber: parseInt(trawlNumber),
                     count: parseInt(catchCount) || 0,
                     bait: selectedBait
                 });
            } else {
                // CYCLE LOGIC
                let centerPoint = currentPath.length > 0 ? currentPath[Math.floor(currentPath.length / 2)] : (myLocation || initialRegion);

                // 1. Find and archive the OLD trawl
                const oldTrawlQuery = query(trawlsRef, where("trawlNumber", "==", parseInt(trawlNumber)), where("status", "==", "active"));
                const oldSnap = await getDocs(oldTrawlQuery);
                oldSnap.forEach((docSnap) => {
                    const docRef = doc(db, 'users', targetUser.uid, 'trawls', docSnap.id);
                    batch.update(docRef, {
                        status: 'history',
                        count: parseInt(catchCount) || 0,
                        haulDate: dateId // Crucial: This marks WHEN it was caught
                    });
                });

                // 2. Create the NEW active trawl
                const newDocRef = doc(collection(db, 'users', targetUser.uid, 'trawls'));
                batch.set(newDocRef, {
                    trawlNumber: parseInt(trawlNumber),
                    status: 'active',
                    dateId: dateId, // When it was set
                    path: currentPath,
                    center: { lat: centerPoint.latitude || centerPoint.lat, lng: centerPoint.longitude || centerPoint.lng },
                    bait: selectedBait,
                    count: 0,
                    lastCatch: parseInt(catchCount) || 0,
                    timestamp: new Date().toISOString()
                });
            }

            await batch.commit();
            setModalVisible(false);
            setCatchCount('');
            setTrawlNumber('');
            setCurrentPath([]);
            setSelectedTrawl(null);
        } catch (error) {
            Alert.alert("Error", error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={{flex: 1, backgroundColor: '#1E293B'}}>
            <MapView
                ref={mapRef}
                style={{flex: 1}}
                initialRegion={initialRegion}
                showsUserLocation={true}
                showsCompass={false}
                mapType="satellite"
                onPanDrag={() => setFollowUser(false)}
                onUserLocationChange={onUserLocationChange}
                onRegionChangeComplete={(r) => regionRef.current = r}
            >
                <UrlTile urlTemplate="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" maximumZ={19} zIndex={1} />

                {/* RECORDING LINE */}
                {currentPath.length >= 2 && <Polyline coordinates={currentPath} strokeColor="#FBBF24" strokeWidth={4} />}

                {/* --- 1. HISTORY LAYER (HEATMAP) --- */}
                {showHeatmap && historicalTrawls.map((trawl) => (
                    <React.Fragment key={trawl.id}>
                         {trawl.path && trawl.path.length >= 2 && (
                             <Polyline coordinates={trawl.path} strokeColor="#EF4444" strokeWidth={6} zIndex={0} />
                         )}
                         {/* YEAR TAG MARKER */}
                         {trawl.center && (
                            <Marker coordinate={{latitude: trawl.center.lat, longitude: trawl.center.lng}} anchor={{x: 0.5, y: 0.5}}>
                                <View style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: 'white'
                                }}>
                                    <Text style={{color: 'white', fontWeight: '900', fontSize: 10}}>
                                        {trawl.count}🦞 <Text style={{fontSize: 8, color: '#FECACA'}}>'{trawl.displayYear}</Text>
                                    </Text>
                                </View>
                            </Marker>
                         )}
                    </React.Fragment>
                ))}

                {/* --- 2. ACTIVE LAYER (Current Gear) --- */}
                {todaysTrawls.map((trawl) => (
                    <React.Fragment key={trawl.id}>
                        {trawl.path && trawl.path.length >= 2 && (
                            <Polyline
                                coordinates={trawl.path}
                                strokeColor={selectedTrawl?.id === trawl.id ? "#FBBF24" : "#FFFFFF"}
                                strokeWidth={selectedTrawl?.id === trawl.id ? 5 : 3}
                                tappable={true}
                                onPress={() => handleTrawlPress(trawl)}
                                zIndex={10}
                            />
                        )}
                        {/* ACTIVE TAG */}
                        {trawl.center && (
                            <Marker coordinate={{latitude: trawl.center.lat, longitude: trawl.center.lng}} onPress={() => handleTrawlPress(trawl)} zIndex={11}>
                                <View style={{backgroundColor: selectedTrawl?.id === trawl.id ? '#FBBF24' : 'white', padding: 4, borderRadius: 8}}>
                                    <Text style={{fontWeight: 'bold', fontSize: 10, color: 'black'}}>
                                        #{trawl.trawlNumber}
                                    </Text>
                                </View>
                            </Marker>
                        )}
                    </React.Fragment>
                ))}
            </MapView>

            {/* --- CONTROLS --- */}
            <View style={{position: 'absolute', top: 50, left: 20}}>
                <View style={{backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 10, borderRadius: 12, alignItems: 'center'}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5}}>
                        <Layers size={16} color="#FBBF24" />
                        <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>HISTORY</Text>
                    </View>
                    <Switch value={showHeatmap} onValueChange={setShowHeatmap} trackColor={{false: '#334155', true: '#FBBF24'}} thumbColor={showHeatmap ? '#FFF' : '#94A3B8'} />
                    {showHeatmap && (
                            <Text style={{color: '#94A3B8', fontSize: 9, marginTop: 4, textAlign: 'center', fontWeight: 'bold'}}>+/- 2 Weeks</Text>)}
                           </View>
            </View>

            <View style={{position: 'absolute', top: 50, right: 20, alignItems: 'center', gap: 20}}>
                <TouchableOpacity onPress={onClose} style={{backgroundColor: '#EF4444', padding: 12, borderRadius: 30, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.3, zIndex: 999}}>
                    <X size={32} color="white" />
                </TouchableOpacity>

                <View style={{backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: 20, padding: 6, gap: 10, alignItems: 'center'}}>
                    <TouchableOpacity onPress={() => mapRef.current?.animateToRegion({...regionRef.current, latitudeDelta: regionRef.current.latitudeDelta * 0.5, longitudeDelta: regionRef.current.longitudeDelta * 0.5}, 400)} style={{padding: 8, backgroundColor: '#334155', borderRadius: 15}}>
                        <Plus size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => mapRef.current?.animateToRegion({...regionRef.current, latitudeDelta: regionRef.current.latitudeDelta * 2, longitudeDelta: regionRef.current.longitudeDelta * 2}, 400)} style={{padding: 8, backgroundColor: '#334155', borderRadius: 15}}>
                        <Minus size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            setFollowUser(true);
                            if (myLocation && mapRef.current) {
                                mapRef.current.animateToRegion({ ...myLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 500);
                            }
                        }}
                        style={{padding: 8, backgroundColor: followUser ? '#2563EB' : '#334155', borderRadius: 15}}
                    >
                        <LocateFixed size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{position: 'absolute', bottom: 40, alignSelf: 'center'}}>
                {!isRecording ? (
                    <TouchableOpacity onPress={handleStartRecording} style={{backgroundColor: '#22C55E', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 40, flexDirection: 'row', gap: 12}}>
                        <Play size={24} color="white" fill="white"/>
                        <Text style={{color: 'white', fontWeight: 'bold', fontSize: 18}}>START TRAWL</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={handleStopRecording} style={{backgroundColor: '#EF4444', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 40, flexDirection: 'row', gap: 12, borderWidth: 4, borderColor: 'white'}}>
                        <Square size={24} color="white" fill="white"/>
                        <Text style={{color: 'white', fontWeight: 'bold', fontSize: 18}}>STOP & LOG</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Log Modal (SAME AS BEFORE) */}
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={{flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <View style={{backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24}}>
                        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
                            <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1E293B'}}>
                                {selectedTrawl ? 'Edit Trawl Details' : 'Log Trawl Cycle'}
                            </Text>
                            {selectedTrawl && (
                                <TouchableOpacity onPress={handleDeleteTrawl} style={{backgroundColor:'#FEF2F2', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA'}}>
                                    <Trash2 size={20} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={{fontSize: 10, fontWeight:'bold', color:'#94A3B8'}}>TRAWL NUMBER</Text>
                        <TextInput
                            keyboardType="numeric"
                            style={{backgroundColor:'#F1F5F9', fontSize: 18, fontWeight: 'bold', padding: 15, borderRadius: 10, marginTop:5, marginBottom: 15, color:'#1E293B'}}
                            placeholder="e.g. 15"
                            value={trawlNumber}
                            onChangeText={setTrawlNumber}
                        />

                        <Text style={{fontSize: 10, fontWeight:'bold', color:'#94A3B8'}}>LOBSTERS CAUGHT (From Haul)</Text>
                        <TextInput
                            keyboardType="numeric"
                            style={{backgroundColor:'#F1F5F9', fontSize: 24, fontWeight: 'bold', padding: 15, borderRadius: 10, marginTop:5, color:'#1E40AF'}}
                            placeholder="0"
                            value={catchCount}
                            onChangeText={setCatchCount}
                        />

                        <Text style={{fontSize: 10, fontWeight:'bold', color:'#94A3B8', marginTop: 15}}>BAIT USED (For Set)</Text>

                        {isAddingBait ? (
                            <View style={{flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 10}}>
                                <TextInput
                                    style={{flex: 1, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, fontWeight: 'bold', color: '#1E40AF', borderWidth: 1, borderColor: '#3B82F6'}}
                                    placeholder="Type new bait name..."
                                    value={newBaitName}
                                    onChangeText={setNewBaitName}
                                    autoFocus={true}
                                />
                                <TouchableOpacity onPress={handleAddCustomBait} style={{backgroundColor: '#22C55E', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 12}}>
                                    <Text style={{color: 'white', fontWeight: 'bold'}}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row', marginVertical: 10}}>
                                {baitList.map((bait, index) => (
                                    <TouchableOpacity key={index} onPress={() => setSelectedBait(bait)} style={{paddingHorizontal: 16, paddingVertical: 8, backgroundColor: selectedBait === bait ? '#EFF6FF' : '#F1F5F9', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: selectedBait === bait ? '#3B82F6' : '#E2E8F0'}}>
                                        <Text style={{color: selectedBait === bait ? '#2563EB' : '#64748B'}}>{bait}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity onPress={() => setIsAddingBait(true)} style={{width: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed'}}>
                                    <Plus size={20} color="#64748B" />
                                </TouchableOpacity>
                            </ScrollView>
                        )}

                        <TouchableOpacity onPress={saveTrawl} disabled={saving} style={{padding: 16, backgroundColor: '#1E40AF', borderRadius: 12, alignItems: 'center', marginTop: 10}}>
                            {saving ? <ActivityIndicator color="white"/> : <Text style={{fontWeight: 'bold', color: 'white'}}>{selectedTrawl ? 'Update Changes' : 'Save & Cycle Trawl'}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// --- PAYWALL COMPONENT ---
const PaywallModal = ({ visible, onClose, onPurchaseSuccess, onRestore }) => {
    const [offerings, setOfferings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOfferings = async () => {
            try {
                const offerings = await Purchases.getOfferings();
                if (offerings.current && offerings.current.availablePackages.length !== 0) {
                    setOfferings(offerings.current);
                }
            } catch (e) {
                Alert.alert("Error", e.message);
            } finally {
                setLoading(false);
            }
        };
        if (visible) fetchOfferings();
    }, [visible]);

    const handlePurchase = async (pack) => {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pack);
            if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
                onPurchaseSuccess();
            }
        } catch (e) {
            if (!e.userCancelled) {
                Alert.alert("Purchase Error", e.message);
            }
        }
    };

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={{flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)', justifyContent: 'center', alignItems: 'center'}}>
                <View style={{backgroundColor: 'white', borderRadius: 24, width: '90%', padding: 24, alignItems: 'center'}}>
                    <View style={{backgroundColor: '#EFF6FF', padding: 16, borderRadius: 50, marginBottom: 20}}>
                        <Crown size={40} color="#2563EB" />
                    </View>
                    <Text style={{fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 10}}>Upgrade to Pro</Text>
                    <Text style={{textAlign: 'center', color: '#64748B', marginBottom: 30, lineHeight: 22}}>
                        Unlock live marine weather, wind forecasts, tide charts, and advanced bait analytics.
                    </Text>

                    {loading ? (
                        <ActivityIndicator color="#2563EB" />
                    ) : offerings ? (
                        offerings.availablePackages.map((pack) => (
                            <TouchableOpacity
                                key={pack.identifier}
                                onPress={() => handlePurchase(pack)}
                                style={{backgroundColor: '#2563EB', width: '100%', padding: 16, borderRadius: 12, marginBottom: 10, alignItems: 'center'}}
                            >
                                <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>
                                    {pack.product.title} - {pack.product.priceString}
                                </Text>
                                <Text style={{color: '#BFDBFE', fontSize: 12}}>{pack.product.description}</Text>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={{color: '#EF4444'}}>No offerings configured in RevenueCat.</Text>
                    )}

                    <TouchableOpacity onPress={onRestore} style={{marginTop: 10, padding: 10}}>
                        <Text style={{color: '#64748B', fontSize: 12, fontWeight: 'bold'}}>Restore Purchases</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onClose} style={{marginTop: 20}}>
                        <Text style={{color: '#94A3B8', fontWeight: 'bold'}}>Not Now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// --- UPDATED MAIN APP COMPONENT ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('log');
    const [tutorialVisible, setTutorialVisible] = useState(false);

    // --- NEW: REVENUECAT STATE ---
    const [isProStatus, setIsProStatus] = useState(false);
    const [paywallVisible, setPaywallVisible] = useState(false);

    // --- EXISTING STATE ---
    const [logs, setLogs] = useState({});
    const [profile, setProfile] = useState({ captainName: '', boatName: '', seasons: {} });
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
           Purchases.setLogLevel(LOG_LEVEL.DEBUG);

           if (Platform.OS === 'ios') {
               await Purchases.configure({ apiKey: API_KEYS.apple });
           } else if (Platform.OS === 'android') {
               await Purchases.configure({ apiKey: API_KEYS.google });
           }

           // 1. Check initial status
           try {
               const customerInfo = await Purchases.getCustomerInfo();
               setIsProStatus(!!customerInfo.entitlements.active[ENTITLEMENT_ID]);
           } catch (e) {
               console.log("RevenueCat Init Error", e);
           }

           // 2. Set up the Real-Time Listener
           Purchases.addCustomerInfoUpdateListener((info) => {
               const isActive = !!info.entitlements.active[ENTITLEMENT_ID];
               setIsProStatus(isActive);
               // Optionally close paywall if it's open and they just became pro
               if (isActive) setPaywallVisible(false);
           });
       };

       initPurchases();
   }, []);
    // --- 2. LISTEN FOR AUTH CHANGES & LINK USER ID ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            setLoading(false);
            if (u) {
                // Link Firebase UID to RevenueCat so purchases sync across devices
                await Purchases.logIn(u.uid);

                // Re-check entitlement after login
                const customerInfo = await Purchases.getCustomerInfo();
                setIsProStatus(!!customerInfo.entitlements.active[ENTITLEMENT_ID]);
            } else {
                await Purchases.logOut();
                setIsProStatus(false);
            }
        });
        return unsubscribe;
    }, []);

    // --- 3. THE MASTER PRO CHECK (DEBUG VERSION) ---
        const isPro = useMemo(() => {
            console.log("\n🕵️‍♂️ --- PRO STATUS INSPECTION ---");
            console.log("1. Firestore Role:", profile?.role);
            console.log("2. RevenueCat Status:", isProStatus);

            // 1. Check Admin/Tester roles (Free Access)
            if (profile?.role === 'admin' || profile?.role === 'tester') {
                console.log("👉 RESULT: UNLOCKED via Admin Role");
                return true;
            }

            // 2. Check RevenueCat Status (Paid Access)
            if (isProStatus) {
                console.log("👉 RESULT: UNLOCKED via RevenueCat Subscription");
                return true;
            }

            console.log("👉 RESULT: LOCKED (Free User)");
            return false;
        }, [profile, isProStatus]);

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

    // --- 5. RESTORED FIRESTORE LISTENERS ---
    useEffect(() => {
        setSelectedHistoryDate(new Date(currentDate));
    }, [currentDate]);

    useEffect(() => {
        if (!user) return;

        // Listen to logs
        const logsRef = collection(db, 'users', user.uid, 'logs');
        const unsubscribeLogs = onSnapshot(logsRef, (snapshot) => {
            const newLogs = {};
            snapshot.forEach((doc) => { newLogs[doc.id] = doc.data(); });
            setLogs(newLogs);
        }, (error) => console.log("Logs Error:", error));

        // Fetch Profile
        const profileRef = doc(db, 'users', user.uid, 'settings', 'profile');
        getDoc(profileRef).then((snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    if (data) {
                        const now = new Date();
                        const currentSeasonStartYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
                        setHistoryYear(currentSeasonStartYear);
                        setManageYear(currentSeasonStartYear);
                        setProfile(prev => ({ ...prev, ...data, seasons: data.seasons || {} }));
                    }
                }
            }).catch(e => console.log("Error fetching profile", e));

        return () => unsubscribeLogs();
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

    // --- 6. HANDLE SAVE ---
    const handleSave = async (data = formData) => {
        if (!user) return;
        setSaving(true);
        const [year, month, day] = dateId.split('-').map(Number);

        try {
            let finalData = { ...data };

            // --- PRO AUTOMATION START ---
            if (isPro) {
                const profileRef = doc(db, 'users', user.uid, 'settings', 'profile');
                const profileSnap = await getDoc(profileRef);
                const settings = profileSnap.data() || {};
                const lat = settings.lat || '43.4426';
                const lng = settings.lng || '-65.6290';

                const weatherAvg = await getAverageWeather(lat, lng);

                if (weatherAvg) {
                    finalData.wind = weatherAvg.avgWindKnots.toFixed(1);
                    finalData.swell = weatherAvg.avgSwellMeters.toFixed(1);
                    finalData.gust = weatherAvg.avgGustKnots.toFixed(1);
                    finalData.windDir = getWindDirection(weatherAvg.avgDirection);
                }
            }
            // --- PRO AUTOMATION END ---

            const logRef = doc(db, 'users', user.uid, 'logs', dateId);
            await setDoc(logRef, {
                ...finalData, dateId, year, month, day, updatedAt: new Date().toISOString()
            });

            if (isPro) {
                Alert.alert("Log Saved", "Weather data was automatically updated from satellite averages.");
            }

        } catch (e) {
            Alert.alert("Error", e.message);
        } finally {
            setSaving(false);
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

        return (
            <View style={styles.masterContainer}>
                <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <View style={styles.headerLeft}>
                            <View style={styles.headerIcon}><Anchor size={20} color="#F87171" /></View>
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
                                           <View style={{backgroundColor: '#FFF1F2', padding: 8, borderRadius: 8, marginRight: 12}}>
                                               <RotateCcw size={20} color="#EF4444" />
                                           </View>
                                           <View style={{flex: 1}}>
                                               <Text style={{fontSize: 16, fontWeight: 'bold', color: '#991B1B'}}>Start New Bait Season</Text>
                                               <Text style={{fontSize: 12, color: '#B91C1C'}}>Clear graph & start fresh</Text>
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
                                                <View style={styles.col}><Text style={styles.label}>LBS CAUGHT</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.lbs} onChangeText={(t) => setFormData({...formData, lbs: t})} placeholder="0" /></View>
                                                <View style={styles.col}><Text style={styles.label}>PRICE / LB</Text><View style={styles.inputWithIcon}><Text style={styles.prefix}>$</Text><TextInput style={[styles.input, { paddingLeft: 20 }]} keyboardType="numeric" value={formData.price} onChangeText={(t) => setFormData({...formData, price: t})} placeholder="0.00" /></View></View>
                                            </View>
                                            <View style={styles.row}>
                                                <View style={styles.col}><Text style={styles.label}>WATER TEMP</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.temp} onChangeText={(t) => setFormData({...formData, temp: t})} placeholder="--" /></View>
                                                <View style={styles.col}><Text style={styles.label}>WIND (KTS)</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.wind} onChangeText={(t) => setFormData({...formData, wind: t})} placeholder="--" /></View>
                                            </View>
                                            <View style={{ marginTop: 10, marginBottom: 5 }}>
                                                <Text style={styles.label}>WIND DIRECTION</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                                                    {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => {
                                                        const isSelected = formData.windDir === dir;
                                                        return (
                                                            <TouchableOpacity key={dir} onPress={() => setFormData({...formData, windDir: dir})} style={[styles.chip, isSelected && styles.chipActive]}>
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
                                            <View><Text style={styles.label}>NOTES</Text><TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={formData.notes} onChangeText={(t) => setFormData({...formData, notes: t})} placeholder="Crew, gear issues..." /></View>
                                            <View style={styles.actionButtons}>
                                                <TouchableOpacity style={styles.saveButton} onPress={() => handleSave()}>
                                                    <Save size={20} color="#FFF" />
                                                    <Text style={styles.saveButtonText}>Save Log</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.historyCard}>
                                        <View style={styles.historyHeader}><History size={16} color="#92400E" /><Text style={styles.historyTitle}>History (Week of {historyWeekDays[0].toLocaleDateString('en-US', {month: 'numeric', day: 'numeric'})})</Text></View>
                                        <View style={styles.historyWeekContainer}>
                                            {historyWeekDays.map((dateObj) => {
                                                const isSelected = dateObj.getDate() === selectedHistoryDate.getDate() && dateObj.getMonth() === selectedHistoryDate.getMonth();
                                                const hasEvent = hasHistoryEvent(dateObj);
                                                return (
                                                    <TouchableOpacity key={dateObj.toISOString()} style={[styles.historyDayBtn, isSelected && styles.historyDayBtnActive]} onPress={() => setSelectedHistoryDate(dateObj)}>
                                                        <Text style={[styles.historyDayText, isSelected && styles.historyDayTextActive]}>{dateObj.toLocaleDateString('en-US', {weekday: 'narrow'})}</Text>
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
                                                        <View style={{flex: 1}}>
                                                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12}}>
                                                                <View>
                                                                    <Text style={styles.historyYear}>{log.year}</Text>
                                                                    <Text style={styles.historyLbsLarge}>{Number(log.lbs).toLocaleString()} lbs</Text>
                                                                </View>
                                                                <Text style={styles.historyPriceLarge}>${log.price || '--'}/lb</Text>
                                                            </View>
                                                            <View style={{ backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12}}>
                                                                <Text style={styles.historyDetailsLarge}>
                                                                    {log.temp ? `${log.temp}°F` : ''}
                                                                    {log.wind ? ` • ${log.wind}${log.gust ? `-${log.gust}` : ''}kts ${log.windDir || ''}` : ''}
                                                                    {log.swell ? ` • ${log.swell}m Swell` : ''}
                                                                </Text>
                                                                {log.weather && <Text style={[styles.historyDetailsLarge, {marginTop: 4, fontStyle: 'italic'}]}>{Array.isArray(log.weather) ? log.weather.join(', ') : log.weather}</Text>}
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
                                        <View style={{flexDirection:'row', alignItems:'center', gap: 10, marginBottom: 15}}>
                                            <MapPin size={24} color="#FBBF24" />
                                            <Text style={styles.cardHeader}>Fishing Location</Text>
                                            {isPro && <View style={{backgroundColor:'#FBBF24', paddingHorizontal:6, borderRadius:4}}><Text style={{fontSize:10, fontWeight:'bold'}}>PRO</Text></View>}
                                        </View>
                                        <View style={{backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, marginBottom: 15}}>
                                            <Text style={{color:'#64748B', fontSize: 12, fontWeight:'bold'}}>CURRENT COORDINATES</Text>
                                            <Text style={{fontSize: 16, fontWeight:'bold', color: '#334155', marginTop: 4}}>
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
                                            {isPro ? <Text style={styles.outlineButtonText}>Update Coordinates</Text> : <View style={{flexDirection:'row', alignItems:'center', gap: 5}}><Lock size={14} color="#475569" /><Text style={styles.outlineButtonText}>Upgrade to Change Location</Text></View>}
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.card}>
                                        <Text style={styles.cardHeader}>Captain & Boat</Text>
                                        <View style={styles.inputGroup}><Text style={styles.label}>CAPTAIN NAME</Text><TextInput style={styles.input} value={profile.captainName} onChangeText={t => setProfile(p => ({...p, captainName: t}))} placeholder="John Doe" /></View>
                                        <View style={styles.inputGroup}><Text style={styles.label}>BOAT NAME</Text><TextInput style={styles.input} value={profile.boatName} onChangeText={t => setProfile(p => ({...p, boatName: t}))} placeholder="The Blue Fin" /></View>
                                    </View>

                                    <View style={styles.card}>
                                        <View style={[styles.row, {justifyContent: 'space-between', marginBottom: 15}]}>
                                            <TouchableOpacity onPress={() => setManageYear(manageYear - 1)}><ChevronLeft size={20} color="#2563EB"/></TouchableOpacity><Text style={{fontWeight: 'bold', color:'#1E3A8A'}}>{manageYear} Season Config</Text><TouchableOpacity onPress={() => setManageYear(manageYear + 1)}><ChevronRight size={20} color="#2563EB"/></TouchableOpacity>
                                        </View>
                                        <View style={styles.row}>
                                            <View style={styles.col}><Text style={styles.label}>START DATE</Text><TextInput style={styles.input} value={editSeasonConfig.start} onChangeText={t => {
                                                const currentConfig = (profile.seasons && profile.seasons[manageYear]) || getDefaultSeasonConfig(manageYear);
                                                setProfile(prev => ({...prev, seasons: {...(prev.seasons || {}), [manageYear]: {...currentConfig, start: t}}}));
                                            }} /></View>
                                            <View style={styles.col}><Text style={styles.label}>END DATE</Text><TextInput style={styles.input} value={editSeasonConfig.end} onChangeText={t => {
                                                const currentConfig = (profile.seasons && profile.seasons[manageYear]) || getDefaultSeasonConfig(manageYear);
                                                setProfile(prev => ({...prev, seasons: {...(prev.seasons || {}), [manageYear]: {...currentConfig, end: t}}}));
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
                                                            <Text style={{textAlign:'center', color: '#64748B', marginBottom: 10}}>Signed in as: {user.email}</Text>

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
                                                                                        <View style={{backgroundColor: '#E0F2FE', padding: 8, borderRadius: 8, marginRight: 12}}>
                                                                                            {profile?.subscription === 'pro' ? <Navigation size={20} color="#0284C7" /> : <Lock size={20} color="#0284C7" />}
                                                                                        </View>
                                                                                        <View style={{flex: 1}}>
                                                                                            <Text style={{fontSize: 16, fontWeight: 'bold', color: '#334155'}}>How to Use LobsterLog</Text>
                                                                                            <Text style={{fontSize: 12, color: '#64748B'}}>{profile?.subscription === 'pro' ? 'Learn the map cycles & heatmap' : 'Upgrade to unlock User Guide'}</Text>
                                                                                        </View>
                                                                                        <ChevronRight size={20} color="#94A3B8" />
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
                                                                                            { text: "Delete", style: "destructive", onPress: async () => {
                                                                                                try {
                                                                                                    const userRef = doc(db, 'users', user.uid);
                                                                                                    await deleteDoc(userRef);
                                                                                                    await deleteUser(auth.currentUser);
                                                                                                } catch (error) { Alert.alert("Error", error.message); }
                                                                                            }}
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
                            <Text style={styles.inputLabel}>LATITUDE</Text>
                            <TextInput style={styles.modalInput} placeholder="43.4426" placeholderTextColor="#64748B" keyboardType="numeric" value={tempLat} onChangeText={setTempLat} />
                            <Text style={styles.inputLabel}>LONGITUDE</Text>
                            <TextInput style={styles.modalInput} placeholder="-65.6290" placeholderTextColor="#64748B" keyboardType="numeric" value={tempLng} onChangeText={setTempLng} />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={styles.cancelButton}><Text style={{color: '#94A3B8'}}>Cancel</Text></TouchableOpacity>
                                <TouchableOpacity onPress={handleSaveLocation} style={styles.modalSaveButton}><Text style={{color: '#1E293B', fontWeight: 'bold'}}>Save & Update</Text></TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>


                   {/* --- TUTORIAL MODAL (WITH WEATHER PANEL) --- */}
                               <Modal animationType="slide" transparent={true} visible={tutorialVisible} onRequestClose={() => setTutorialVisible(false)}>
                                   <View style={{flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)', justifyContent: 'center', alignItems: 'center'}}>

                                       {/* Fixed Width Container */}
                                       <View style={{backgroundColor: 'white', borderRadius: 24, width: 340, paddingVertical: 24, height: '75%'}}>

                                           {/* Header */}
                                           <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10}}>
                                               <Text style={{fontSize: 22, fontWeight: '900', color: '#0F172A'}}>LobsterLog Guide</Text>
                                               <TouchableOpacity onPress={() => setTutorialVisible(false)} style={{padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20}}>
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
                                               <View style={{width: 340, paddingHorizontal: 20, alignItems: 'center'}}>
                                                   <View style={{height: 160, width: '100%', backgroundColor: '#EFF6FF', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24}}>
                                                       <Scale size={64} color="#3B82F6" />
                                                   </View>
                                                   <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center'}}>1. The Daily Log</Text>
                                                   <Text style={{fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center'}}>
                                                       Start your day on the <Text style={{fontWeight: 'bold'}}>Log Screen</Text>. Enter your total pounds and market price here.
                                                       {"\n\n"}
                                                       This keeps a historical log, so you can look back throught the years, and season totals automatically.
                                                   </Text>
                                               </View>

                                               {/* SLIDE 2: AUTOMATIC WEATHER (NEW) */}
                                               <View style={{width: 340, paddingHorizontal: 20, alignItems: 'center'}}>
                                                   <View style={{height: 160, width: '100%', backgroundColor: '#E0F2FE', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24}}>
                                                       <Wind size={64} color="#0EA5E9" />
                                                   </View>
                                                   <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center'}}>2. Automatic Weather</Text>
                                                   <Text style={{fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center'}}>
                                                       Stop guessing the wind speed.
                                                       {"\n\n"}
                                                       The app automatically fetches the <Text style={{fontWeight: 'bold'}}>Wind, Temp, and Direction</Text> for your specific location every time you save a log.
                                                   </Text>
                                               </View>

                                               {/* SLIDE 3: MAP BASICS */}
                                               <View style={{width: 340, paddingHorizontal: 20, alignItems: 'center'}}>
                                                   <View style={{height: 160, width: '100%', backgroundColor: '#F0FDF4', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24}}>
                                                       <MapPin size={64} color="#22C55E" />
                                                   </View>
                                                   <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center'}}>3. Active vs. History</Text>
                                                   <Text style={{fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center'}}>
                                                       <Text style={{fontWeight: 'bold'}}>White Lines</Text> are gear currently in the water (Active).
                                                       {"\n\n"}
                                                       <Text style={{fontWeight: 'bold'}}>Colored Lines</Text> appear on the Heatmap after you haul them (History).
                                                   </Text>
                                               </View>

                                               {/* SLIDE 4: THE SWAP CYCLE */}
                                               <View style={{width: 340, paddingHorizontal: 20, alignItems: 'center'}}>
                                                   <View style={{height: 160, width: '100%', backgroundColor: '#FEF2F2', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24}}>
                                                       <Layers size={64} color="#EF4444" />
                                                   </View>
                                                   <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center'}}>4. The "Swap" Cycle</Text>
                                                   <Text style={{fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center'}}>
                                                       When you log a trawl on the map, the app does two things instantly:
                                                       {"\n\n"}
                                                       1. It <Text style={{fontWeight: 'bold', color: '#EF4444'}}>HAULS</Text> the old string (moves it to History).
                                                       {"\n"}
                                                       2. It <Text style={{fontWeight: 'bold', color: '#22C55E'}}>SETS</Text> the new string at your current spot.
                                                   </Text>
                                               </View>

                                               {/* SLIDE 5: DATA ENTRY */}
                                               <View style={{width: 340, paddingHorizontal: 20, alignItems: 'center'}}>
                                                   <View style={{height: 160, width: '100%', backgroundColor: '#FFF7ED', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24}}>
                                                       <Save size={64} color="#F97316" />
                                                   </View>
                                                   <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center'}}>5. Entering Data</Text>
                                                   <Text style={{fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center'}}>
                                                       Because of the swap logic, remember:
                                                       {"\n\n"}
                                                       <Text style={{fontWeight: 'bold'}}>Catch:</Text> Enter what was in the trap you JUST hauled up.
                                                       {"\n"}
                                                       <Text style={{fontWeight: 'bold'}}>Bait:</Text> Enter the bait for the trap you are setting RIGHT NOW.
                                                   </Text>
                                               </View>

                                                {/* SLIDE 6: HEATMAP */}
                                                <View style={{width: 340, paddingHorizontal: 20, alignItems: 'center'}}>
                                                   <View style={{height: 160, width: '100%', backgroundColor: '#F5F3FF', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24}}>
                                                       <TrendingUp size={64} color="#8B5CF6" />
                                                   </View>
                                                   <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10, textAlign: 'center'}}>6. Pro Insights</Text>
                                                   <Text style={{fontSize: 15, color: '#475569', lineHeight: 22, textAlign: 'center'}}>
                                                       Toggle the <Text style={{fontWeight: 'bold'}}>Heatmap</Text> to see your past performance.
                                                       {"\n\n"}
                                                       Red lines = High Catch.
                                                       {"\n"}
                                                       Use this to plan where to set your gear next season.
                                                   </Text>
                                               </View>

                                           </ScrollView>

                                           {/* Pagination & Button */}
                                           <View style={{alignItems: 'center', width: '100%', paddingHorizontal: 20}}>
                                               <Text style={{color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginBottom: 15}}>SWIPE FOR MORE →</Text>

                                               <TouchableOpacity onPress={() => setTutorialVisible(false)} style={{backgroundColor: '#0F172A', paddingVertical: 16, width: '100%', borderRadius: 16, alignItems: 'center'}}>
                                                   <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>Got it, Let's Fish</Text>
                                               </TouchableOpacity>
                                           </View>

                                       </View>
                                   </View>
                               </Modal>
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
            </View>
        );
    };
// ==========================================
// 🛠️ MASTER HELPER FUNCTIONS
// ==========================================

// 1. Format Date for IDs (YYYY-MM-DD)
function formatDateId(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// 2. Parse Local Date (Fixes timezone bugs)
function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
}

// 3. Compass Direction (Converts degrees to N, NE, etc.)
function getWindDirection(degrees) {
    if (degrees === undefined || degrees === null) return '';
    const sectors = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW', 'N'];
    const index = Math.round(degrees / 22.5);
    return sectors[index % 16];
}

// 4. Season Config Helpers
function getLastMondayOfNovember(year) {
    const date = new Date(year, 10, 30);
    const day = date.getDay();
    const diff = (day - 1 + 7) % 7;
    date.setDate(date.getDate() - diff);
    return formatDateId(date);
}

function getDefaultSeasonConfig(startYear) {
    return {
        start: getLastMondayOfNovember(startYear),
        end: `${startYear + 1}-05-31`
    };
}

// 5. PRO FEATURE: 12-Hour Weather Averages (Updated with Gusts)
async function getAverageWeather(lat, lng) {
    try {
        const end = new Date();
        const start = new Date(end.getTime() - (12 * 60 * 60 * 1000)); // 12 hours ago

        const params = 'windSpeed,waveHeight,windDirection,gust';
        const url = `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=${params}&start=${start.toISOString()}&end=${end.toISOString()}`;

        const response = await fetch(url, {
            headers: { 'Authorization': STORMGLASS_API_KEY }
        });
        const json = await response.json();

        if (json.errors) throw new Error("Weather API Error");

        // Calculate Averages
        let totalWind = 0;
        let totalSwell = 0;
        let totalGust = 0;

        // Variables for Vector Averaging of Direction
        let sinSum = 0;
        let cosSum = 0;
        let count = 0;

        json.hours.forEach(hour => {
            const wind = hour.windSpeed?.noaa || hour.windSpeed?.sg || 0;
            const swell = hour.waveHeight?.noaa || hour.waveHeight?.sg || 0;
            const dir = hour.windDirection?.noaa || hour.windDirection?.sg || 0;
            const gust = hour.gust?.noaa || hour.gust?.sg || 0;

            totalWind += wind;
            totalSwell += swell;
            totalGust += gust;

            // Convert degrees to radians and sum vectors
            const rad = dir * (Math.PI / 180);
            sinSum += Math.sin(rad);
            cosSum += Math.cos(rad);

            count++;
        });

        if (count === 0) return null;

        const avgRad = Math.atan2(sinSum, cosSum);
        let avgDeg = avgRad * (180 / Math.PI);
        if (avgDeg < 0) avgDeg += 360;

        return {
            avgWindKnots: (totalWind / count) * 1.94384,
            avgGustKnots: (totalGust / count) * 1.94384,
            avgSwellMeters: (totalSwell / count),
            avgDirection: avgDeg
        };

    } catch (error) {
        console.log("Could not fetch average weather:", error);
        return null;
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    masterContainer: { flex: 1, backgroundColor: '#1E3A8A' },
    mainContentContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    loginContainer: { flex: 1, backgroundColor: '#1E3A8A' },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#1E3A8A',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 60,
    },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerIcon: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 8 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    headerSubtitle: { color: '#93C5FD', fontSize: 12 },
    headerRight: { flexDirection: 'row', gap: 8 },
    navButton: { padding: 8, borderRadius: 8 },
    navButtonActive: { backgroundColor: '#1E40AF' },
    content: { flex: 1 },
    loginContent: { padding: 24, width: '100%' },
    loginHeader: { alignItems: 'center', marginBottom: 30 },
    logoCircle: { width: 80, height: 80, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    loginTitle: { color: 'white', fontSize: 28, fontWeight: 'bold' },
    loginSubtitle: { color: '#BFDBFE', fontSize: 16 },
    logContainer: { padding: 16, gap: 16 },
    dateNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
    dateText: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    yearText: { fontSize: 12, color: '#94A3B8' },
    arrowButton: { padding: 10, backgroundColor: '#F1F5F9', borderRadius: 10 },
    statsGrid: { flexDirection: 'row', gap: 12 },
    statCard: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    statLabel: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8' },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
    statSub: { fontSize: 11, color: '#94A3B8' },
    formCard: { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
    formHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    formTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBox: { backgroundColor: '#DBEAFE', padding: 4, borderRadius: 6 },
    formTitle: { fontWeight: 'bold', color: '#334155' },
    savingText: { fontSize: 12, color: '#2563EB', fontWeight: 'bold' },
    formBody: { padding: 16, gap: 16 },
    label: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', marginBottom: 6 },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 16, fontWeight: '600', color: '#334155' },
    row: { flexDirection: 'row', gap: 12 },
    col: { flex: 1 },
    inputWithIcon: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
    prefix: { position: 'absolute', left: 12, zIndex: 1, fontSize: 16, fontWeight: 'bold', color: '#94A3B8' },
    inputIcon: { position: 'absolute', left: 12, zIndex: 1 },
    pickerScroll: { flexDirection: 'row' },
    chip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    chipActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
    chipText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
    chipTextActive: { color: '#2563EB' },
    actionButtons: { gap: 10, marginTop: 10 },
    skipButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0' },
    skipButtonText: { fontWeight: 'bold', color: '#64748B' },
    saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#1E40AF', borderWidth: 2, borderColor: '#1E40AF' },
    saveButtonText: { fontWeight: 'bold', color: 'white' },
    historyCard: { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
        historyHeader: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#FEF3C7', alignItems: 'center' },
        historyTitle: { fontSize: 13, fontWeight: 'bold', color: '#92400E' },
        historyWeekContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFBEB' },
        historyDayBtn: { alignItems: 'center', padding: 8, borderRadius: 8, minWidth: 44 },
        historyDayBtnActive: { backgroundColor: '#F59E0B' },
        historyDayText: { fontSize: 11, color: '#92400E', fontWeight: 'bold' },
        historyDateText: { fontSize: 16, color: '#92400E', fontWeight: 'bold' },
        historyDayTextActive: { color: 'white' },
        historyDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D97706', marginTop: 4 },
        historyListContainer: { paddingBottom: 10 },
        historySubHeader: { padding: 12, fontSize: 12, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase' },
        historyRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
        historyYear: { fontSize: 12, fontWeight: 'bold', color: '#94A3B8', marginBottom: 2 },
        historyLbsLarge: { fontSize: 22, fontWeight: '900', color: '#1E293B', lineHeight: 28 },
        historyPriceLarge: { fontSize: 17, fontWeight: 'bold', color: '#059669' },
        historyDetailsLarge: { fontSize: 13, fontWeight: '600', color: '#475569', lineHeight: 20 },
        historyNoteContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
        historyNoteText: { fontSize: 13, fontStyle: 'italic', color: '#64748B' },
        noHistoryText: { padding: 20, textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', fontSize: 14 },settingsContainer: { padding: 16, gap: 16 },
    card: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 20, textAlign: 'center' },
    cardHeader: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    inputGroup: { marginBottom: 15 },
    inputWrapper: { position: 'relative', justifyContent: 'center' },
    primaryButton: { backgroundColor: '#1E40AF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    primaryButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    switchButton: { padding: 10, alignItems: 'center', marginTop: 10 },
    switchButtonText: { color: '#64748B', fontWeight: '500' },
    copyright: { color: '#93C5FD', textAlign: 'center', marginTop: 30, fontSize: 12 },
    outlineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' },
    outlineButtonText: { fontWeight: 'bold', color: '#475569' },
    deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', marginTop: 12 },
    deleteButtonText: { fontWeight: 'bold', color: '#EF4444' },
    graphHeader: { padding: 16, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    yearNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    graphTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
    iconButton: { padding: 4 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    statBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    statText: { fontSize: 12, fontWeight: 'bold', color: '#64748B' },
    emptyGraph: { padding: 40, alignItems: 'center' },
    emptyGraphText: { color: '#94A3B8' },
    proContainer: { flex: 1, backgroundColor: '#1E293B' },
    proBanner: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
    proTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginTop: 10 },
    proHeader: { padding: 20, backgroundColor: '#0F172A' },
    proLocation: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    proTime: { color: 'white', fontSize: 32, fontWeight: '300' },
    weatherGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
    weatherCard: { width: '45%', backgroundColor: '#334155', borderRadius: 16, padding: 16, margin: '2.5%', alignItems: 'center' },
    weatherIconBox: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 50, marginBottom: 10 },
    weatherLabel: { color: '#94A3B8', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
    weatherValue: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    weatherSub: { color: '#94A3B8', fontSize: 12 },
    comingSoonCard: { margin: 20, padding: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
    comingSoonTitle: { color: '#94A3B8', fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase', fontSize: 12 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    featureText: { color: '#CBD5E1' },
    sectionContainer: { marginTop: 20, paddingHorizontal: 16 },
    sectionTitle: { color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12, marginBottom: 10 },
    tideRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#334155', marginBottom: 8, borderRadius: 10 },
    tideType: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    tideTime: { color: '#CBD5E1', fontSize: 14 },
    tideHeight: { color: '#FBBF24', fontWeight: 'bold', fontSize: 14 },
    forecastCard: { backgroundColor: '#334155', padding: 12, borderRadius: 12, marginRight: 10, minWidth: 90, alignItems: 'center' },
    forecastTime: { color: 'white', fontWeight: 'bold', fontSize: 12, marginBottom: 6 },
    forecastDivider: { width: '100%', height: 1, backgroundColor: '#475569', marginBottom: 6 },
    forecastRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    forecastValue: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    forecastUnit: { color: '#94A3B8', fontSize: 10 },
    longRangeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', padding: 16, marginBottom: 8, borderRadius: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#1E293B', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 5 },
    modalSubtitle: { color: '#94A3B8', marginBottom: 20 },
    inputLabel: { color: '#94A3B8', fontSize: 10, fontWeight: 'bold', marginBottom: 5, marginTop: 10 },
    modalInput: { backgroundColor: '#0F172A', color: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155', fontSize: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
    cancelButton: { padding: 12 },
    modalSaveButton: {
        backgroundColor: '#FBBF24',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8
    },
});