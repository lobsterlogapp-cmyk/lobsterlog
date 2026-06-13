import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, TextInput, Switch, ActivityIndicator, ScrollView, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Layers, X, Plus, Minus, MapPin, Trash2, LocateFixed } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

// NATIVE FIREBASE IMPORTS
import { auth, db } from '../../firebaseConfig';
import { collection, doc, onSnapshot, query, where, getDocs, getDoc, setDoc, writeBatch, serverTimestamp, deleteDoc, arrayUnion } from '@react-native-firebase/firestore';

// Styles & Services
import { styles } from '../styles/GlobalStyles';
import { getWeatherData, getNextTide, getTimeUntil } from '../utils/weatherService';
import TideArrow from '../components/TideArrow';
import { loadNavionicsPurchase, isNavionicsPurchaseActive } from '../utils/navionicsStorage';
import { runNavionicsPurchase, NAVIONICS_PRODUCT_ANNUAL } from '../utils/navionicsPurchase';

// Initialize Mapbox with your Public Token
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');

const TODAY = () => new Date().toISOString().split('T')[0];

const Garminmapbox = ({ savedLat, savedLng, onClose }: any) => {
    const mapRef = useRef<Mapbox.MapView>(null);
    const cameraRef = useRef<Mapbox.Camera>(null);
    const catchInputRef = useRef<TextInput>(null);

    const { t } = useTranslation('map');
    const { t: tc } = useTranslation('common');

    const mapCenterRef = useRef<number[]>([
        parseFloat(savedLng) || -65.62,
        parseFloat(savedLat) || 43.44
    ]);

    const currentUser = auth.currentUser;

    const [currentZoom, setCurrentZoom] = useState(12);
    const [todaysPins, setTodaysPins] = useState<any[]>([]);
    const [historicalPins, setHistoricalPins] = useState<any[]>([]);
    const [myLocation, setMyLocation] = useState<number[] | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [navionicsActive, setNavionicsActive] = useState(false);

    const [tideInfo, setTideInfo] = useState<any>(null);
    const [nextTide, setNextTide] = useState<any>(null);
    const [countDown, setCountDown] = useState("--:--:--");
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedPin, setSelectedPin] = useState<any>(null);

    const [trawlNumber, setTrawlNumber] = useState('');
    const [catchCount, setCatchCount] = useState('');
    const [selectedBait, setSelectedBait] = useState('Mackerel');
    const [baitList, setBaitList] = useState(['Mackerel', 'Herring', 'Redfish', 'Flounder']);
    const [newBaitName, setNewBaitName] = useState('');
    const [isAddingBait, setIsAddingBait] = useState(false);

    useEffect(() => {
        const fetchTide = async () => {
            try {
                const data = await getWeatherData(mapCenterRef.current[1], mapCenterRef.current[0]);
                if (data?.weather?.hours) setTideInfo(data.weather.hours[0]);
                if (data?.tides?.data) setNextTide(getNextTide(data.tides.data));
            } catch (e) { console.log("Weather Error:", e); }
        };
        fetchTide();
    }, []);

    // Gate Navionics tiles on an active (non-expired) stored purchase
    useEffect(() => {
        const checkNavionics = async () => {
            const purchase = await loadNavionicsPurchase();
            const active = isNavionicsPurchaseActive(purchase);
            console.log('🧭 Navionics check on mount — purchase:', purchase, '| navionicsActive =', active);
            setNavionicsActive(active);
        };
        checkNavionics();
    }, []);

    useEffect(() => {
        if (!nextTide) return;
        const timer = setInterval(() => setCountDown(getTimeUntil(nextTide.time)), 1000);
        return () => clearInterval(timer);
    }, [nextTide]);

    useEffect(() => {
        if (!currentUser) return;
        const trawlsRef = collection(db, 'users', currentUser.uid, 'trawls');
        const activeTrawlsQuery = query(trawlsRef, where("status", "==", "active"));
        const unsubscribe = onSnapshot(activeTrawlsQuery, (snap) => {
            const data: any[] = [];
            snap?.forEach(d => {
                const docData = d.data();
                if (docData.center?.lat && docData.center?.lng) {
                    data.push({ id: d.id, ...docData });
                }
            });
            setTodaysPins(data);
        });
        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        const loadBaits = async () => {
            if (!currentUser) return;
            const prefRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
            const snap = await getDoc(prefRef);
            if (snap.exists() && snap.data()?.customBaits) {
                setBaitList(prev => [...new Set([...prev, ...snap.data().customBaits])]);
            }
        };
        loadBaits();
    }, [currentUser]);

    // --- GARMIN SANDBOX TEST (hidden; live flow runs via runNavionicsPurchase on Pro purchase) ---
    const testGarminTrialAccess = async () => {
        if (!currentUser) return;
        await runNavionicsPurchase(NAVIONICS_PRODUCT_ANNUAL, currentUser.email || '');
    };

    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result.toISOString().split('T')[0];
    };

    useEffect(() => {
        if (!showHeatmap || !currentUser) { setHistoricalPins([]); return; }

        const fetchHistory = async () => {
            const targetDate = new Date(TODAY());
            const YEARS_TO_CHECK = 5;
            const WINDOW_DAYS = 14;
            const queryPromises = [];

            for (let i = 0; i <= YEARS_TO_CHECK; i++) {
                const pastDate = new Date(targetDate);
                pastDate.setFullYear(targetDate.getFullYear() - i);
                const startStr = addDays(pastDate, -WINDOW_DAYS);
                const endStr = addDays(pastDate, WINDOW_DAYS);
                const q = query(
                    collection(db, 'users', currentUser.uid, 'trawls'),
                    where("dateId", ">=", startStr),
                    where("dateId", "<=", endStr),
                    where("status", "==", "history")
                );
                queryPromises.push(getDocs(q));
            }

            try {
                const snapshots = await Promise.all(queryPromises);
                const matches: any[] = [];
                const seenIds = new Set();
                snapshots.forEach(snap => {
                    snap.forEach(doc => {
                        const data = doc.data();
                        if (seenIds.has(doc.id)) return;
                        if (!data.center || isNaN(data.center.lat) || isNaN(data.center.lng)) return;
                        seenIds.add(doc.id);
                        matches.push({
                            id: doc.id,
                            ...data,
                            displayYear: new Date(data.dateId).getFullYear().toString().slice(-2)
                        });
                    });
                });
                setHistoricalPins(matches);
            } catch (err: any) {
                console.log("Heatmap fetch error:", err);
            }
        };
        fetchHistory();
    }, [showHeatmap, currentUser, refreshTrigger]);

    const { coloredPins } = useMemo(() => {
        const catches = historicalPins.map(p => Number(p.count) || 0);
        const max = Math.max(...catches, 1);
        const colored = historicalPins.map(pin => {
            const count = Number(pin.count) || 0;
            const percentage = (count / max) * 100;
            let color = '#3B82F6';
            if (percentage >= 90) color = '#EF4444';
            else if (percentage >= 70) color = '#F97316';
            else if (percentage >= 50) color = '#EAB308';
            else if (percentage >= 25) color = '#FFFFFF';
            return { ...pin, color, count };
        });
        return { coloredPins: colored };
    }, [historicalPins]);

    const handleDropPin = () => { setSelectedPin(null); setCatchCount(''); setTrawlNumber(''); setModalVisible(true); };
    const handlePinPress = (pin: any) => { setSelectedPin(pin); setCatchCount(''); setTrawlNumber(pin.trawlNumber?.toString() || ''); setSelectedBait(pin.bait || 'Herring'); setModalVisible(true); };

    const savePin = async () => {
        if (!currentUser) return;
        if (!selectedPin && !trawlNumber) { Alert.alert(t('map.missingInfoTitle'), t('map.pleaseEnterTrawl')); return; }
        setSaving(true);
        try {
            const batch = writeBatch(db);
            const pinsRef = collection(db, 'users', currentUser.uid, 'trawls');
            const catchNum = parseInt(catchCount) || 0;
            const tNum = parseInt(trawlNumber);

            let boatLat: number;
            let boatLng: number;

            if (selectedPin) {
                boatLat = parseFloat(selectedPin.center.lat);
                boatLng = parseFloat(selectedPin.center.lng);
            } else {
                const loc = myLocation || mapCenterRef.current;
                boatLng = Array.isArray(loc) ? loc[0] : mapCenterRef.current[0];
                boatLat = Array.isArray(loc) ? loc[1] : mapCenterRef.current[1];
            }

            const activeQuery = query(pinsRef, where("trawlNumber", "==", tNum), where("status", "==", "active"));
            const oldSnap = await getDocs(activeQuery);

            if (!oldSnap.empty) {
                oldSnap.forEach((docSnap) => {
                    const oldData = docSnap.data();
                    const setTime = oldData.timestamp ? new Date(oldData.timestamp.toDate ? oldData.timestamp.toDate() : oldData.timestamp) : new Date();
                    const haulTime = new Date();
                    const diffMs = Math.abs(haulTime.getTime() - setTime.getTime());
                    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const days = Math.floor(totalHours / 24);
                    const remainingHours = totalHours % 24;
                    const soakDisplay = days > 0 ? (days === 1 ? '1 Day' : `${days} Days`) : `${remainingHours}h`;

                    batch.update(docSnap.ref, {
                        status: 'history',
                        count: catchNum,
                        setDate: oldData.dateId,
                        haulDate: TODAY(),
                        soakTime: soakDisplay,
                        baitAtHaul: oldData.bait || 'Mackerel'
                    });
                });
            }

            const newDocRef = doc(pinsRef);
            batch.set(newDocRef, {
                trawlNumber: tNum,
                status: 'active',
                dateId: TODAY(),
                center: { lat: boatLat, lng: boatLng },
                bait: selectedBait || 'Mackerel',
                count: 0,
                timestamp: serverTimestamp()
            });

            await batch.commit();
            setRefreshTrigger(prev => prev + 1);
            setModalVisible(false);
        } catch (e: any) {
            Alert.alert(tc('settings.errorTitle'), e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedPin || !currentUser) return;
        try {
            const pinDocRef = doc(db, 'users', currentUser.uid, 'trawls', selectedPin.id);
            await deleteDoc(pinDocRef);
            setModalVisible(false);
        } catch (e) { console.log(e); }
    };

    const handleAddCustomBait = async () => {
        if (!newBaitName.trim()) { setIsAddingBait(false); return; }
        setBaitList(prev => [...prev, newBaitName]);
        setSelectedBait(newBaitName);
        const prefRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
        await setDoc(prefRef, { customBaits: arrayUnion(newBaitName) }, { merge: true });
        setNewBaitName('');
        setIsAddingBait(false);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
            <Mapbox.MapView
                ref={mapRef}
                style={{ flex: 1 }}
                styleURL={Mapbox.StyleURL.Satellite}
                onCameraChanged={(e) => {
                    if (e.properties?.center) mapCenterRef.current = e.properties.center;
                    if (e.properties?.zoom) setCurrentZoom(e.properties.zoom);
                }}
                logoEnabled={false}
                attributionEnabled={false}
            >
                <Mapbox.Camera ref={cameraRef} defaultSettings={{ zoomLevel: 12, centerCoordinate: mapCenterRef.current }} />

                {/* TODO(Aldo): replace with REAL Navionics tile URL + correct token placement.
                    Current URL is a PLACEHOLDER — wrong host (this is the purchase API host, not a
                    tile server) AND EXPO_PUBLIC_NAVIONICS_TOKEN is undefined (real vars are
                    _TOKEN_IOS / _TOKEN_ANDROID). Tiles will NOT render until this is replaced. */}
                {navionicsActive && (
                    <Mapbox.RasterSource id="navionics-sandbox" tileUrlTemplates={[`https://developers-store-sandbox.navionics.com/tile/{z}/{x}/{y}?token=${process.env.EXPO_PUBLIC_NAVIONICS_TOKEN}`]}>
                        <Mapbox.RasterLayer id="navionics-layer" sourceID="navionics-sandbox" style={{ rasterOpacity: 0.8 }} />
                    </Mapbox.RasterSource>
                )}

                <Mapbox.UserLocation onUpdate={(location) => setMyLocation([location.coords.longitude, location.coords.latitude])} />

                {!showHeatmap && todaysPins.map((pin) => (
                    <Mapbox.PointAnnotation key={pin.id} id={pin.id} coordinate={[parseFloat(pin.center.lng), parseFloat(pin.center.lat)]} onSelected={() => handlePinPress(pin)}>
                        <View style={{ backgroundColor: '#FBBF24', padding: 4, borderRadius: 8, borderWidth: 2, borderColor: 'white', minWidth: 26, alignItems: 'center' }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 10, color: '#1E293B' }}>#{pin.trawlNumber}</Text>
                        </View>
                    </Mapbox.PointAnnotation>
                ))}

                {showHeatmap && coloredPins.map((pin) => (
                    <Mapbox.PointAnnotation key={`heat-${pin.id}`} id={`heat-${pin.id}`} coordinate={[parseFloat(pin.center.lng), parseFloat(pin.center.lat)]}>
                        <View style={{ backgroundColor: pin.color, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'white' }}>
                            <Text style={{ color: pin.color === '#FFFFFF' ? 'black' : 'white', fontWeight: '900', fontSize: 10 }}>
                                {pin.count} <Text style={{ fontSize: 8, opacity: 0.8 }}>{pin.displayYear}</Text>
                            </Text>
                        </View>
                    </Mapbox.PointAnnotation>
                ))}
            </Mapbox.MapView>

            <View style={{ position: 'absolute', top: 50, left: 20 }}>
                {tideInfo && (
                    <View style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, borderRadius: 16, width: 140, marginBottom: 10 }}>
                        <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>{t('map.currentTide')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ transform: [{ rotate: `${tideInfo.currentDirection?.sg || 0}deg` }] }}>
                                <TideArrow size={24} />
                            </View>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                                {(tideInfo.currentSpeed?.sg * 1.94384).toFixed(1)} <Text style={{ fontSize: 12, color: '#94A3B8' }}>kts</Text>
                            </Text>
                        </View>
                        {nextTide && (
                            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#334155' }}>
                                <Text style={{ color: nextTide.type === 'high' ? '#4ADE80' : '#F87171', fontSize: 10, fontWeight: 'bold' }}>
                                    {nextTide.type === 'high' ? t('map.highIn') : t('map.lowIn')}
                                </Text>
                                <Text style={{ color: 'white', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 16, marginTop: 2 }}>
                                    {countDown}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 10, borderRadius: 12, alignItems: 'center', width: 140 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <Layers size={16} color="#FBBF24" />
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>{t('map.heatMap')}</Text>
                    </View>
                    <Switch value={showHeatmap} onValueChange={setShowHeatmap} trackColor={{ false: '#334155', true: '#FBBF24' }} thumbColor={showHeatmap ? '#FFF' : '#94A3B8'} />
                </View>

                {__DEV__ && (
                <TouchableOpacity onPress={testGarminTrialAccess} style={{ backgroundColor: '#10B981', padding: 10, borderRadius: 12, marginTop: 10, alignItems: 'center', width: 140 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>TEST GARMIN</Text>
                </TouchableOpacity>
                )}
            </View>

            <View style={{ position: 'absolute', top: 110, right: 20, backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: 20, padding: 8, gap: 12, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => cameraRef.current?.setCamera({ zoomLevel: currentZoom + 1, animationDuration: 400 })} style={{ padding: 8, backgroundColor: '#334155', borderRadius: 12 }}>
                    <Plus size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => cameraRef.current?.setCamera({ zoomLevel: currentZoom - 1, animationDuration: 400 })} style={{ padding: 8, backgroundColor: '#334155', borderRadius: 12 }}>
                    <Minus size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => myLocation ? cameraRef.current?.setCamera({ centerCoordinate: myLocation, zoomLevel: 14, animationDuration: 500 }) : Alert.alert(t('map.waitingForGps'))} style={{ padding: 8, backgroundColor: '#2563EB', borderRadius: 12 }}>
                    <LocateFixed size={24} color="white" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 50, right: 20, backgroundColor: '#EF4444', padding: 12, borderRadius: 30 }}>
                <X size={28} color="white" />
            </TouchableOpacity>

            <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center' }}>
                <TouchableOpacity onPress={handleDropPin} style={{ backgroundColor: '#2563EB', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 40, flexDirection: 'row', gap: 12, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 }}>
                    <MapPin size={24} color="white" fill="white" />
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>{t('map.dropPinLog')}</Text>
                </TouchableOpacity>
            </View>

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 }}>
                                        <X size={20} color="#64748B" />
                                    </TouchableOpacity>
                                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B' }}>{selectedPin ? t('map.editCatch') : t('map.logHaulSet')}</Text>
                                    {selectedPin ? (
                                        <TouchableOpacity onPress={handleDelete} style={{ backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8 }}>
                                            <Trash2 size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    ) : <View style={{ width: 36 }} />}
                                </View>

                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94A3B8' }}>{t('map.trawlNumberLabel')}</Text>
                                <TextInput keyboardType="number-pad" returnKeyType="next" onSubmitEditing={() => catchInputRef.current?.focus()} blurOnSubmit={false} style={{ backgroundColor: '#F1F5F9', fontSize: 18, fontWeight: 'bold', padding: 15, borderRadius: 10, marginTop: 5, marginBottom: 15, color: '#1E293B' }} placeholder={t('map.trawlNumberPlaceholder')} value={trawlNumber} onChangeText={setTrawlNumber} />

                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94A3B8' }}>{t('map.lobstersCaughtLabel')}</Text>
                                <TextInput ref={catchInputRef} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} style={{ backgroundColor: '#F1F5F9', fontSize: 32, fontWeight: 'bold', padding: 15, borderRadius: 10, marginTop: 5, color: '#1E40AF', textAlign: 'center' }} placeholder="0" value={catchCount} onChangeText={setCatchCount} />

                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94A3B8', marginTop: 20 }}>{t('map.baitLabel')}</Text>
                                {isAddingBait ? (
                                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                        <TextInput style={{ flex: 1, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10 }} placeholder={t('map.newBaitPlaceholder')} value={newBaitName} onChangeText={setNewBaitName} />
                                        <TouchableOpacity onPress={handleAddCustomBait} style={{ backgroundColor: '#22C55E', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 10 }}>
                                            <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('map.addBaitButton')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 10 }}>
                                        {baitList.map((bait, i) => (
                                            <TouchableOpacity key={i} onPress={() => setSelectedBait(bait)} style={{ padding: 10, backgroundColor: selectedBait === bait ? '#EFF6FF' : '#F1F5F9', borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: selectedBait === bait ? '#3B82F6' : 'transparent' }}>
                                                <Text style={{ color: selectedBait === bait ? '#2563EB' : '#64748B' }}>{bait}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity onPress={() => setIsAddingBait(true)} style={{ padding: 10, backgroundColor: '#F1F5F9', borderRadius: 10 }}>
                                            <Plus size={20} color="#64748B" />
                                        </TouchableOpacity>
                                    </ScrollView>
                                )}

                                <TouchableOpacity onPress={savePin} disabled={saving} style={{ marginTop: 20, backgroundColor: '#1E40AF', padding: 16, borderRadius: 12, alignItems: 'center' }}>
                                    {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{t('map.cycleTrawlSave')}</Text>}
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

export default Garminmapbox;