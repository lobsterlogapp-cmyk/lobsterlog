import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Animated } from 'react-native';
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
    const [tidePhase, setTidePhase] = useState<'FLOODING' | 'EBBING' | null>(null);
    const [tideStrength, setTideStrength] = useState<'SLACK' | 'BUILDING' | 'PEAK' | 'EASING' | null>(null);
    const [slackPulse] = useState(new Animated.Value(1));
    const [astronomy, setAstronomy] = useState<any>(null);
    const [seaCharacter, setSeaCharacter] = useState<string>('');
    const [seaAlignment, setSeaAlignment] = useState<string>('');

    // New Logbook State
    const [historyModalVisible, setHistoryModalVisible] = useState(false);

    // NATIVE AUTH CALL
    const [currentUser] = useState(user || auth.currentUser);

    const [lastRefreshTime, setLastRefreshTime] = useState(
      new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    );

    const roundedLat = lat ? Math.round(parseFloat(lat) * 10) : 0;
    const roundedLng = lng ? Math.round(parseFloat(lng) * 10) : 0;

    useEffect(() => {
        const isFallback = (lat === '43.4426' || lat === 43.4426);
        if (isPro && roundedLat && roundedLng && !isFallback) {
            console.log("📍 Valid GPS detected. Loading data for:", lat, lng);
            loadData();
        } else {
            console.log("⏳ Waiting for valid GPS lock...");
        }
    }, [isPro, roundedLat, roundedLng]);

    useEffect(() => {
        if (!tideStrength) return;
        if (tideStrength === 'SLACK') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(slackPulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
                    Animated.timing(slackPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        } else {
            slackPulse.stopAnimation();
            slackPulse.setValue(1);
        }
    }, [tideStrength]);

    useEffect(() => {
        const updateCountdown = () => {
            const now = Date.now();
            const sortedTides = [...tides].sort((a, b) =>
                new Date(a.time).getTime() - new Date(b.time).getTime()
            );

            const prevTide = [...sortedTides].reverse().find(t => new Date(t.time).getTime() <= now);
            const nextTide = sortedTides.find(t => new Date(t.time).getTime() > now);
            if (!nextTide) return;

            // Countdown
            const ms = new Date(nextTide.time).getTime() - now;
            const hours = Math.floor(ms / (1000 * 60 * 60));
            const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
            const label = nextTide.type?.toLowerCase() === 'high' ? 'High' : 'Low';
            setTideCountdown(`${label} in ${hours}h ${mins}m`);

            // FLOOD or EBB
            if (nextTide.type?.toLowerCase() === 'high') {
                setTidePhase('FLOOD');
            } else {
                setTidePhase('EBB');
            }

            // Cycle strength — minutes since last tide or until next tide
            if (prevTide) {
                const cycleLength = new Date(nextTide.time).getTime() - new Date(prevTide.time).getTime();
                const elapsed = now - new Date(prevTide.time).getTime();
                const remaining = new Date(nextTide.time).getTime() - now;
                const elapsedMins = elapsed / (1000 * 60);
                const remainingMins = remaining / (1000 * 60);

                if (elapsedMins <= 15 || remainingMins <= 15) {
                    setTideStrength('SLACK');
                } else if (elapsedMins <= 120) {
                    setTideStrength('BUILDING');
                } else if (elapsedMins <= 240) {
                    setTideStrength('PEAK');
                } else {
                    setTideStrength('EASING');
                }
            }
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
        if (data.astronomy) setAstronomy(data.astronomy);
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

                const now2 = new Date();
                const closest = processedHours.reduce((prev: any, curr: any) =>
                    Math.abs(new Date(curr.time).getTime() - now2.getTime()) < Math.abs(new Date(prev.time).getTime() - now2.getTime())
                        ? curr : prev
                );
                setCurrent(closest);

                // Compute sea character from closest hour
                const swellH = getValue(closest.swellHeight);
                const windWaveH = getValue(closest.windWaveHeight);
                const swellP = getValue(closest.swellPeriod);
                const waveP = getValue(closest.wavePeriod);
                const windDir = getValue(closest.windDirection);
                const swellDir = getValue(closest.swellDirection);
                const windWaveDir = getValue(closest.windWaveDirection);
                setSeaCharacter(getSeaCharacter(swellP, waveP, swellH, windWaveH));
                setSeaAlignment(getSeaAlignment(windDir, swellDir, windWaveDir, swellH, windWaveH));

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

    const getSeaCharacter = (swellPeriod: number, wavePeriod: number, swellHeight: number, windWaveHeight: number): string => {
        // Weighted average period based on dominant component
        const totalHeight = swellHeight + windWaveHeight;
        if (totalHeight === 0) return '--';
        const dominantPeriod = swellHeight >= windWaveHeight ? swellPeriod : wavePeriod;
        if (dominantPeriod >= 9) return 'ROLLING';
        if (dominantPeriod >= 6) return 'MIXED';
        return 'CHOPPY';
    };

    const getSeaAlignment = (windDir: number, swellDir: number, windWaveDir: number, swellHeight: number, windWaveHeight: number): string => {
        // Use dominant component direction
        const dominantDir = swellHeight >= windWaveHeight ? swellDir : windWaveDir;
        let angle = Math.abs(windDir - dominantDir);
        if (angle > 180) angle = 360 - angle;
        if (angle <= 45) return 'FOLLOWING SEA';
        if (angle <= 135) return 'CROSSING SEA';
        return 'WIND AGAINST SEA ⚠';
    };

    const getMoonEmoji = (phase: number): string => {
        if (phase < 0.025) return '🌑';
        if (phase < 0.25) return '🌒';
        if (phase < 0.475) return '🌓';
        if (phase < 0.525) return '🌕';
        if (phase < 0.75) return '🌖';
        if (phase < 0.975) return '🌗';
        if (phase < 1.0) return '🌘';
        return '🌑';
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
                            {/* TIDE STATE */}
                            <View style={styles.weatherCard}>
                                <View style={[styles.weatherIconBox, {
                                    transform: [{ rotate: `${getValue(current.currentDirection)}deg` }],
                                    padding: 4, backgroundColor: 'rgba(251, 191, 36, 0.1)'
                                }]}>
                                    <TideArrow size={36} color="#FBBF24" />
                                </View>
                                <Text style={styles.weatherLabel}>TIDE STATE</Text>
                                <Text style={{
                                    color: tidePhase === 'FLOODING' ? '#10B981' : '#3B82F6',
                                    fontSize: 16, fontWeight: '900', marginTop: 4,
                                    textAlign: 'center', letterSpacing: 1,
                                }}>
                                    {tidePhase || '--'}
                                </Text>
                                {tideStrength === 'SLACK' ? (
                                    <Animated.Text style={{
                                        color: '#FBBF24', fontSize: 13, fontWeight: 'bold',
                                        marginTop: 2, textAlign: 'center', letterSpacing: 1,
                                        opacity: slackPulse,
                                    }}>
                                        SLACK
                                    </Animated.Text>
                                ) : (
                                    <Text style={{
                                        color: tideStrength === 'BUILDING' ? '#10B981' :
                                               tideStrength === 'PEAK' ? '#FFFFFF' :
                                               tideStrength === 'EASING' ? '#64748B' : '#94A3B8',
                                        fontSize: 13, fontWeight: 'bold', marginTop: 2,
                                        textAlign: 'center', letterSpacing: 1,
                                    }}>
                                        {tideStrength || '--'}
                                    </Text>
                                )}
                                {tideCountdown ? (
                                    <Text style={{ color: '#FBBF24', fontSize: 13, marginTop: 6, textAlign: 'center', fontWeight: 'bold' }}>
                                        {tideCountdown}
                                    </Text>
                                ) : null}
                            </View>

                            {/* WIND */}
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
                        </View>

                       {/* SEAS */}
                       <View style={{ backgroundColor: '#334155', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, marginHorizontal: '5%', marginVertical: '2.5%', alignItems: 'center' }}>
                           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                               <Waves size={18} color="#3B82F6" />
                               <Text style={styles.weatherLabel}>SEAS</Text>
                           </View>
                           <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 2 }}>
                               {current.realWaveHeight?.toFixed(1) || '--'} m
                           </Text>

                           {/* SWELL + character + WIND WAVE all on one row */}
                           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 2 }}>
                               {/* SWELL - left */}
                               <View style={{ alignItems: 'center', flex: 1 }}>
                                   <Text style={{ color: '#64748B', fontSize: 11 }}>SWELL</Text>
                                   <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                                       {getValue(current.swellHeight).toFixed(1)}m
                                   </Text>
                                   <Text style={{ color: '#64748B', fontSize: 11 }}>
                                       {getValue(current.swellPeriod).toFixed(0)}s · {getDirectionText(getValue(current.swellDirection))}
                                   </Text>
                               </View>

                               {/* CENTER - character labels */}
                               <View style={{ alignItems: 'center', flex: 1 }}>
                                   <Text style={{
                                       color: seaCharacter === 'ROLLING' ? '#10B981' :
                                              seaCharacter === 'MIXED' ? '#FBBF24' : '#F87171',
                                       fontSize: 13, fontWeight: 'bold', letterSpacing: 1,
                                   }}>
                                       {seaCharacter}
                                   </Text>
                                   <Text style={{
                                       color: seaAlignment.includes('⚠') ? '#F87171' :
                                              seaAlignment === 'CROSSING SEA' ? '#FBBF24' : '#10B981',
                                       fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textAlign: 'center',
                                   }}>
                                       {seaAlignment}
                                   </Text>
                               </View>

                               {/* WIND WAVE - right */}
                               <View style={{ alignItems: 'center', flex: 1 }}>
                                   <Text style={{ color: '#64748B', fontSize: 11 }}>WIND WAVE</Text>
                                   <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                                       {getValue(current.windWaveHeight).toFixed(1)}m
                                   </Text>
                                   <Text style={{ color: '#64748B', fontSize: 11 }}>
                                       {getValue(current.wavePeriod).toFixed(0)}s · {getDirectionText(getValue(current.windWaveDirection))}
                                   </Text>
                               </View>
                           </View>
                       </View>

                        {/* AIR/WATER TEMP + MOON/SUN */}
                        <View style={{ flexDirection: 'row', marginHorizontal: '5%', marginVertical: '2.5%', gap: '5%' }}>
                            {/* AIR + WATER TEMP */}
                            <View style={{ flex: 1, backgroundColor: '#334155', borderRadius: 16, padding: 16, alignItems: 'center' }}>
                                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 50, marginBottom: 10 }}>
                                    <Thermometer size={24} color="#EF4444" />
                                </View>
                                <Text style={styles.weatherLabel}>TEMPERATURE</Text>
                                <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: 'bold', marginTop: 8 }}>AIR</Text>
                                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
                                    {getValue(current.airTemperature).toFixed(1)}°C
                                </Text>
                                <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 2 }}>
                                    {((getValue(current.airTemperature) * 9/5) + 32).toFixed(1)}°F
                                </Text>
                                <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 2 }}>
                                    Feels {getWindChillMetric(getValue(current.airTemperature), (getValue(current.windSpeed) * 1.94384)).toFixed(0)}°C
                                </Text>
                                <View style={{ width: '100%', height: 1, backgroundColor: '#475569', marginVertical: 10 }} />
                                <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: 'bold' }}>WATER</Text>
                                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 4 }}>
                                    {((getValue(current.waterTemperature) * 9/5) + 32).toFixed(1)}°F
                                </Text>
                            </View>

                            {/* MOON + SUN */}
                            <View style={{ flex: 1, backgroundColor: '#334155', borderRadius: 16, padding: 16, alignItems: 'center' }}>
                                {astronomy ? (
                                    <>
                                        <Text style={{ fontSize: 32, marginBottom: 4 }}>
                                            {getMoonEmoji(astronomy.moonPhase?.current?.value ?? 0)}
                                        </Text>
                                        <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
                                            {astronomy.moonPhase?.current?.text ?? ''}
                                        </Text>
                                        <View style={{ width: '100%', height: 1, backgroundColor: '#475569', marginVertical: 8 }} />
                                        <View style={{ gap: 6, width: '100%' }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: '#64748B', fontSize: 12 }}>FIRST LIGHT</Text>
                                                <Text style={{ color: '#94A3B8', fontSize: 12 }}>{formatTime(astronomy.nauticalDawn)}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: '#64748B', fontSize: 12 }}>SUNRISE</Text>
                                                <Text style={{ color: '#FBBF24', fontSize: 12 }}>{formatTime(astronomy.sunrise)}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: '#64748B', fontSize: 12 }}>SUNSET</Text>
                                                <Text style={{ color: '#FBBF24', fontSize: 12 }}>{formatTime(astronomy.sunset)}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: '#64748B', fontSize: 12 }}>LAST LIGHT</Text>
                                                <Text style={{ color: '#94A3B8', fontSize: 12 }}>{formatTime(astronomy.nauticalDusk)}</Text>
                                            </View>
                                        </View>
                                    </>
                                ) : (
                                    <ActivityIndicator size="small" color="#FBBF24" />
                                )}
                            </View>
                        </View>

                        {/* TIDES SECTION */}
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Next 4 Tides</Text>
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