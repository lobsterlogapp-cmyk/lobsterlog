import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
    Lock, Navigation, Waves, Wind, Thermometer, TrendingUp, History // <-- Added History icon
} from 'lucide-react-native';

// Imports
import { styles } from '../styles/GlobalStyles';
import TideArrow from '../components/TideArrow';
import { getWeatherData } from '../utils/weatherService';
import { DailyHistoryModal } from '../components/DailyHistoryModal'; // <-- Added Modal Import
import { auth } from '../../firebaseConfig'; // <-- Added Auth for Firebase

const ProDashboard = ({ isPro, onOpenMap, onUnlock, lat, lng, user }: any) => {
    // Weather Data State
    const [current, setCurrent] = useState<any>(null);
    const [forecast, setForecast] = useState<any[]>([]);
    const [longRange, setLongRange] = useState<any[]>([]);
    const [tides, setTides] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // New Logbook State
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [currentUser] = useState(user || auth.currentUser);

    // Fetch Data using the new Service
    useEffect(() => {
        // GUARD: Don't fetch if lat/lng are missing OR if they match the simulator fallback exactly
        const isFallback = (lat === '43.4426' || lat === 43.4426);

        if (isPro && lat && lng && !isFallback) {
            console.log("📍 Valid GPS detected. Loading data for:", lat, lng);
            loadData();
        } else {
            console.log("⏳ Waiting for valid GPS lock...");
        }
    }, [isPro, lat, lng]);

    const loadData = async () => {
        console.log(`FETCHING DATA FOR: LAT ${lat} LNG ${lng}`);
        setLoading(true);
        const data = await getWeatherData(lat, lng);

        if (data.weather) processWeather(data.weather);
        if (data.tides && data.tides.data) setTides(data.tides.data);
        setLoading(false);
    };

    const processWeather = (weatherData: any) => {
        const now = new Date();
        if (weatherData.hours && weatherData.hours.length > 0) {

            // 1. PREP STEP: Calculate "Real" Waves and "Dominant" Direction for every hour
            const processedHours = weatherData.hours.map((h: any) => {
                const wHeight = getValue(h.windWaveHeight);
                const sHeight = getValue(h.swellHeight);
                const s2Height = getValue(h.secondarySwellHeight);

                const combinedSea = Math.sqrt(
                    Math.pow(wHeight, 2) +
                    Math.pow(sHeight, 2) +
                    Math.pow(s2Height, 2)
                );

                const dominantDirection = wHeight >= sHeight
                    ? getValue(h.windDirection)
                    : getValue(h.swellDirection);

                return {
                    ...h,
                    realWaveHeight: combinedSea > 0 ? combinedSea : getValue(h.waveHeight),
                    displayDirection: dominantDirection
                };
            });

            // 2. USE THE PREPPED DATA: Update your state with the processed hours
            setCurrent(processedHours[0]);

            const allFutureHours = processedHours.filter((h: any) => new Date(h.time) > now);

            // 3-Day Forecast
            setForecast(allFutureHours.slice(0, 72));

            // Long Range
            const distantData = allFutureHours.slice(72).filter((h: any) => {
                const hour = new Date(h.time).getHours();
                return hour === 6 || hour === 18;
            });
            setLongRange(distantData);
        }
    };

    // Helpers
    const getValue = (dataObj: any) => {
        if (!dataObj) return 0;
        return dataObj.meteo || dataObj.dwd || dataObj.sg || dataObj.noaa || 0;
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return '--:--';

        // 1. Create the date object from the UTC string
        const date = new Date(isoString);

        // 2. Use 'en-GB' or 'en-CA' with the specific Halifax timezone.
        // This forces the calculation to be UTC - 4 hours (AST)
        // or UTC - 3 hours (ADT) based on the date.
        return date.toLocaleTimeString('en-CA', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Halifax'
        });
    };

    const formatDate = (isoString: string) => {
        if (!isoString) return '--';
        const date = new Date(isoString);
        // This ensures the date label matches the time you are seeing
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };
    const getDirectionText = (degrees: number) => {
        if (degrees === undefined || degrees === null) return '--';
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return directions[Math.round(degrees / 45) % 8];
    };

    const getWindChillMetric = (tempC: number, windKts: number) => {
        const windKmh = windKts * 1.852;
        if (tempC > 10 || windKmh < 4.8) return tempC;
        return 13.12 + (0.6215 * tempC) - (11.37 * Math.pow(windKmh, 0.16)) + (0.3965 * tempC * Math.pow(windKmh, 0.16));
    };

    if (!isPro) {
        return (
            <View style={styles.proContainer}>
                <View style={styles.proBanner}>
                    <Lock size={60} color="#FBBF24" />
                    <Text style={styles.proTitle}>LobsterLog Pro</Text>
                    <Text style={{color: '#94A3B8', textAlign: 'center', marginTop: 10, paddingHorizontal: 40, lineHeight: 22}}>
                        Upgrade to unlock live marine weather, tides, and advanced charts.
                    </Text>
                    <TouchableOpacity
                        onPress={onUnlock}
                        style={{
                            backgroundColor: '#FBBF24',
                            paddingVertical: 16,
                            paddingHorizontal: 32,
                            borderRadius: 12,
                            marginTop: 30,
                            width: '80%',
                            alignItems: 'center',
                            shadowColor: '#FBBF24',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 8,
                        }}
                    >
                        <Text style={{ color: '#1E293B', fontWeight: '900', fontSize: 18 }}>
                            UPGRADE NOW
                        </Text>
                    </TouchableOpacity>
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

                        {/* --- NEW BUTTON ROW START --- */}
                        <View style={{flexDirection: 'row', gap: 10}}>
                            {/* History Logbook Button */}
                            <TouchableOpacity onPress={() => setHistoryModalVisible(true)} style={{backgroundColor: '#334155', padding: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center'}}>
                                <History size={18} color="#FBBF24" />
                            </TouchableOpacity>

                            {/* Existing Open Chart Button */}
                            <TouchableOpacity onPress={onOpenMap} style={{backgroundColor: '#334155', padding: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6}}>
                                <Text style={{color: '#FBBF24', fontWeight: 'bold', fontSize: 12}}>OPEN CHART</Text>
                                <Navigation size={18} color="#FBBF24" />
                            </TouchableOpacity>
                        </View>
                        {/* --- NEW BUTTON ROW END --- */}

                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FBBF24" style={{marginTop: 50}} />
                ) : current ? (
                    <View>
                        {/* --- 1. CURRENT CONDITIONS --- */}
                        <View style={styles.weatherGrid}>
                             {/* Tide Card */}
                            <View style={styles.weatherCard}>
                                <View style={[styles.weatherIconBox, {
                                    transform: [{ rotate: `${getValue(current.currentDirection)}deg` }],
                                     padding: 4, backgroundColor: 'rgba(251, 191, 36, 0.1)'
                                }]}>
                                     <TideArrow size={36} />
                                </View>
                                <Text style={styles.weatherLabel}>DRIFT / TIDE</Text>
                                <Text style={styles.weatherValue}>
                                    {(getValue(current.currentSpeed) * 1.94384).toFixed(1)} kts{' '}
                                </Text>
                            </View>
                            {/* Wind Card */}
                            <View style={styles.weatherCard}>
                                <View style={styles.weatherIconBox}><Wind size={24} color="#10B981" /></View>
                                <Text style={styles.weatherLabel}>WIND</Text>
                                <Text style={styles.weatherValue}>{(getValue(current.windSpeed) * 1.94384).toFixed(1)} kts</Text>
                                <Text style={styles.weatherSub}>{getDirectionText(getValue(current.windDirection))}</Text>
                            </View>
                            {/* Combined Sea Card */}
                            <View style={styles.weatherCard}>
                                <View style={styles.weatherIconBox}>
                                    <Waves size={24} color="#3B82F6" />
                                </View>
                                <Text style={styles.weatherLabel}>SEAS</Text>
                                <Text style={styles.weatherValue}>
                                    {current.realWaveHeight?.toFixed(1) || '--'} m
                                </Text>
                            </View>
                            {/* Temp Card */}
                            <View style={styles.weatherCard}>
                                <View style={styles.weatherIconBox}><Thermometer size={24} color="#EF4444" /></View>
                                <Text style={styles.weatherLabel}>AIR TEMP</Text>
                                <Text style={styles.weatherValue}>{getValue(current.airTemperature).toFixed(1)}°C</Text>
                                <Text style={styles.weatherSub}>Feels {getWindChillMetric(getValue(current.airTemperature), (getValue(current.windSpeed) * 1.94384)).toFixed(0)}°</Text>
                            </View>
                        </View>

                        {/* --- 2. TIDES SECTION --- */}
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Tides (Today)</Text>
                            {tides && tides.length > 0 ? (
                                [...tides]
                                    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
                                    .filter(t => new Date(t.time).getTime() > Date.now() - (60 * 60 * 1000))
                                    .slice(0, 4)
                                    .map((tide, index) => (
                                        <View key={index} style={styles.tideRow}>
                                            <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                                                {tide.type.toLowerCase() === 'high' ?
                                                    <TrendingUp size={16} color="#10B981"/> :
                                                    <TrendingUp size={16} color="#F87171" style={{transform: [{rotate: '180deg'}]}}
                                                />}
                                                <Text style={styles.tideType}>{tide.type.toLowerCase() === 'high' ? 'High' : 'Low'}</Text>
                                            </View>
                                            <View style={{flexDirection:'row', alignItems:'center', gap: 15}}>
                                                <Text style={styles.tideTime}>{formatTime(tide.time)}</Text>
                                                <Text style={styles.tideHeight}>{tide.height.toFixed(1)}m</Text>
                                            </View>
                                        </View>
                                    ))
                            ) : (
                                <ActivityIndicator size="small" color="#FBBF24" style={{ padding: 20 }} />
                            )}
                        </View>

                        {/* --- 3. HOURLY FORECAST --- */}
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
                                            <Text style={[styles.forecastValue, { fontSize: 16 }]}>{(getValue(hour.windSpeed) * 1.94384).toFixed(0)}</Text>
                                        </View>

                                        {hour.gust && (
                                            <Text style={{ color: '#F87171', fontSize: 13, fontWeight: 'bold' }}>
                                                G: {(getValue(hour.gust) * 1.94384).toFixed(0)}
                                            </Text>
                                        )}

                                        <Text style={[styles.forecastUnit, { fontSize: 12, marginTop: 4 }]}>{getDirectionText(getValue(hour.windDirection))}</Text>

                                        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Waves size={18} color="#3B82F6"/>
                                            <Text style={[styles.forecastValue, { fontSize: 16 }]}>
                                                {hour.realWaveHeight?.toFixed(1) || '--'} m
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        {/* --- 4. LONG RANGE OUTLOOK --- */}
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
                                                <Text style={{color: 'white', fontWeight: 'bold', fontSize: 18}}>{(getValue(hour.windSpeed) * 1.94384).toFixed(0)} kts</Text>
                                            </View>
                                             {hour.gust && (
                                                <Text style={{ color: '#F87171', fontSize: 13, fontWeight: 'bold' }}>
                                                    G: {(getValue(hour.gust) * 1.94384).toFixed(0)}
                                                </Text>
                                            )}
                                            <Text style={{color: '#64748B', fontSize: 13}}>{getDirectionText(getValue(hour.windDirection))}</Text>
                                        </View>
                                        <View style={{alignItems: 'center'}}>
                                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                                                <Waves size={18} color="#3B82F6" />
                                                <Text style={{color: 'white', fontWeight: 'bold', fontSize: 18}}>
                                                    {hour.realWaveHeight?.toFixed(1) || '--'} m
                                                </Text>
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

            {/* --- NEW LOGBOOK MODAL --- */}
            <DailyHistoryModal
                visible={historyModalVisible}
                onClose={() => setHistoryModalVisible(false)}
                currentUser={currentUser}
            />
        </View>
    );
};

export default ProDashboard;