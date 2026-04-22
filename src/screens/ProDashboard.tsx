import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import {
    Lock, Navigation, Waves, Wind, Thermometer, TrendingUp, History
} from 'lucide-react-native';

// Imports
import { styles } from '../styles/GlobalStyles';
import TideArrow from '../components/TideArrow';
import { getWeatherData } from '../utils/weatherService';
import { TrawlHistoryModal } from '../components/TrawlHistoryModal';

// NATIVE FIREBASE IMPORT
import { auth } from '../../firebaseConfig';

const ProDashboard = ({ isPro, onOpenMap, onUnlock, lat, lng, user }: any) => {
    // Weather Data State
    const [current, setCurrent] = useState<any>(null);
    const [forecast, setForecast] = useState<any[]>([]);
    const [longRange, setLongRange] = useState<any[]>([]);
    const [tides, setTides] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(0);
    const [tideCountdown, setTideCountdown] = useState('');

    // New Logbook State
    const [historyModalVisible, setHistoryModalVisible] = useState(false);

    // NATIVE AUTH CALL
    const [currentUser] = useState(user || auth.currentUser);

    const [lastRefreshTime, setLastRefreshTime] = useState(
      new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    );

    // Fetch Data using the new Service
    useEffect(() => {
        const isFallback = (lat === '43.4426' || lat === 43.4426);

        if (isPro && lat && lng && !isFallback) {
            console.log("📍 Valid GPS detected. Loading data for:", lat, lng);
            loadData();
        } else {
            console.log("⏳ Waiting for valid GPS lock...");
        }
    }, [isPro, lat, lng]);

    useEffect(() => {
      const updateCountdown = () => {
        const now = Date.now();
        const sortedTides = [...tides].sort((a, b) =>
          new Date(a.time).getTime() - new Date(b.time).getTime()
        );
        const nextTide = sortedTides.find(t => new Date(t.time).getTime() > now);
        if (!nextTide) return;

        const ms = new Date(nextTide.time).getTime() - now;
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((ms % (1000 * 60)) / 1000);
        const label = nextTide.type?.toLowerCase() === 'high' ? 'High' : 'Low';
        setTideCountdown(`${label} in ${hours}h ${mins}m `);
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }, [tides]);

    const loadData = async () => {
      console.log(`FETCHING DATA FOR: LAT ${lat} LNG ${lng}`);
      setLoading(true);
      const data = await getWeatherData(lat, lng);
      if (data.weather) processWeather(data.weather);
      if (data.tides && data.tides.data) setTides(data.tides.data);
      setLastFetchTime(Date.now());
      setLoading(false);
    };

    const handleRefresh = async () => {
      setRefreshing(true);

      const now = Date.now();
      const hoursSince = (now - lastFetchTime) / (1000 * 60 * 60);

      if (hoursSince >= 1 || lastFetchTime === 0) {
        const data = await getWeatherData(lat, lng);
        if (data.weather) processWeather(data.weather);
        if (data.tides && data.tides.data) setTides(data.tides.data);
        setLastFetchTime(now);
      } else {
        // Save current data
        const savedCurrent = current;
        const savedForecast = forecast;
        const savedLongRange = longRange;
        const savedTides = tides;

        // Briefly clear the data to trigger re-render
        setCurrent(null);
        setForecast([]);
        setLongRange([]);
        setTides([]);

        // Wait 2 seconds while spinner shows
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Restore the data — looks like it refreshed!
        setCurrent(savedCurrent);
        setForecast(savedForecast);
        setLongRange(savedLongRange);
        setTides(savedTides);
      }

      // Update time AFTER spinner finishes
      setLastRefreshTime(new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
      setRefreshing(false);
    };

    const processWeather = (weatherData: any) => {
            const now = new Date();
            if (weatherData.hours && weatherData.hours.length > 0) {
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

                setCurrent(processedHours[0]);
                const allFutureHours = processedHours.filter((h: any) => new Date(h.time) > now);

                // 1. UPDATE: Next 24 hours only
                setForecast(allFutureHours.slice(0, 24));

                // 2. UPDATE: Start from hour 24, get Morning (6am) and Night (6pm) for 10 days
                const distantData = allFutureHours.slice(24).filter((h: any) => {
                    const hour = new Date(h.time).getHours();
                    return hour === 6 || hour === 18;
                }).slice(0, 20); // 10 days * 2 slots (morning and night) = 20 items

                setLongRange(distantData);
            }
        };

    const getValue = (dataObj: any) => {
        if (!dataObj) return 0;
        return dataObj.meteo || dataObj.dwd || dataObj.sg || dataObj.noaa || 0;
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return '--:--';
        const date = new Date(isoString);
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
            <ScrollView
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#FBBF24"
                  colors={["#FBBF24"]}
                />
              }
            >
                <View style={styles.proHeader}>
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                        <View>
                            <Text style={styles.proLocation}>LAT: {parseFloat(lat || 0).toFixed(4)}</Text>
                            <Text style={styles.proLocation}>LNG: {parseFloat(lng || 0).toFixed(4)}</Text>
                            <Text style={styles.proTime}>{lastRefreshTime}</Text>
                        </View>

                        <View style={{flexDirection: 'row', gap: 10}}>
                            <TouchableOpacity onPress={() => setHistoryModalVisible(true)} style={{backgroundColor: '#334155', padding: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center'}}>
                                <History size={18} color="#FBBF24" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={onOpenMap} style={{backgroundColor: '#334155', padding: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6}}>
                                <Text style={{color: '#FBBF24', fontWeight: 'bold', fontSize: 12}}>OPEN CHART</Text>
                                <Navigation size={18} color="#FBBF24" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FBBF24" style={{marginTop: 50}} />
                ) : current ? (
                    <View>
                        {/* CURRENT CONDITIONS */}
                        <View style={styles.weatherGrid}>
                            <View style={styles.weatherCard}>
                                <View style={[styles.weatherIconBox, {
                                    transform: [{ rotate: `${getValue(current.currentDirection)}deg` }],
                                    padding: 4, backgroundColor: 'rgba(251, 191, 36, 0.1)'
                                }]}>
                                    <TideArrow size={36} color="#FBBF24" />
                                </View>
                                <Text style={styles.weatherLabel}>DRIFT / TIDE</Text>
                                <Text style={styles.weatherValue}>
                                    {(getValue(current.currentSpeed) * 1.94384).toFixed(1)} kts
                                </Text>
                                <Text style={styles.weatherSub}>
                                    {getDirectionText(getValue(current.currentDirection))}
                                </Text>
                                {tideCountdown ? (
                                  <Text style={{ color: '#FBBF24', fontSize: 16, marginTop: 6, textAlign: 'center', fontWeight: 'bold' }}>
                                    {tideCountdown}
                                  </Text>
                                ) : null}
                            </View>
                            <View style={styles.weatherCard}>
                                <View style={styles.weatherIconBox}><Wind size={24} color="#10B981" /></View>
                                <Text style={styles.weatherLabel}>WIND</Text>
                                <Text style={styles.weatherValue}>{(getValue(current.windSpeed) * 1.94384).toFixed(1)} kts</Text>
                                <Text style={styles.weatherSub}>{getDirectionText(getValue(current.windDirection))}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                    <Text style={{ color: '#64748B', fontSize: 14 }}>G:</Text>
                                    <Text style={{ color: '#F87171', fontSize: 16, fontWeight: 'bold' }}>
                                        {(getValue(current.gust) * 1.94384).toFixed(1)} kts
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.weatherCard}>
                                <View style={styles.weatherIconBox}>
                                    <Waves size={24} color="#3B82F6" />
                                </View>
                                <Text style={styles.weatherLabel}>SEAS</Text>
                                <Text style={styles.weatherValue}>
                                    {current.realWaveHeight?.toFixed(1) || '--'} m
                                </Text>
                            </View>
                            <View style={styles.weatherCard}>
                                <View style={styles.weatherIconBox}><Thermometer size={24} color="#EF4444" /></View>
                                <Text style={styles.weatherLabel}>AIR TEMP</Text>
                                <Text style={styles.weatherValue}>{getValue(current.airTemperature).toFixed(1)}°C</Text>
                                <Text style={{ color: '#94A3B8', fontSize: 15, fontWeight: '600', marginTop: 6 }}>
                                    Feels {getWindChillMetric(getValue(current.airTemperature), (getValue(current.windSpeed) * 1.94384)).toFixed(0)}°
                                </Text>
                            </View>
                        </View>

                        {/* TIDES SECTION */}
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

                        {/* HOURLY FORECAST */}
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>24 Hour Forecast</Text>
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

                        {/* LONG RANGE OUTLOOK */}
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>10 Day Outlook</Text>
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

            <TrawlHistoryModal
                visible={historyModalVisible}
                onClose={() => setHistoryModalVisible(false)}
                currentUser={currentUser}
            />
        </View>
    );
};

export default ProDashboard;