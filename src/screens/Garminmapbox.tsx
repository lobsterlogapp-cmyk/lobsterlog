import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, TextInput, Switch, ActivityIndicator, ScrollView, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Layers, X, Plus, Minus, MapPin, Trash2, LocateFixed } from 'lucide-react-native';

// NATIVE FIREBASE IMPORTS
import { auth, db } from '../../firebaseConfig';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
  deleteDoc,
  arrayUnion
} from '@react-native-firebase/firestore';

// Styles & Services
import { styles } from '../styles/GlobalStyles';
import { getWeatherData, getNextTide, getTimeUntil } from '../utils/weatherService';
import TideArrow from '../components/TideArrow';

// Initialize Mapbox with your Public Token
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');

const Garminmapbox = ({ savedLat, savedLng, onClose, user, dateId }: any) => {
    const mapRef = useRef<Mapbox.MapView>(null);
    const cameraRef = useRef<Mapbox.Camera>(null);

    // Track the center of the map for dropping pins
    const mapCenterRef = useRef<number[]>([parseFloat(savedLng) || -65.62, parseFloat(savedLat) || 43.44]);

    const [currentUser, setCurrentUser] = useState(user || auth.currentUser);

    // Data State
    const [todaysPins, setTodaysPins] = useState<any[]>([]);
    const [historicalPins, setHistoricalPins] = useState<any[]>([]);
    const [myLocation, setMyLocation] = useState<number[] | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // UI State
    const [tideInfo, setTideInfo] = useState<any>(null);
    const [nextTide, setNextTide] = useState<any>(null);
    const [countDown, setCountDown] = useState("--:--:--");
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedPin, setSelectedPin] = useState<any>(null);

    // Form State
    const [trawlNumber, setTrawlNumber] = useState('');
    const [catchCount, setCatchCount] = useState('');
    const [selectedBait, setSelectedBait] = useState('Mackerel');
    const [baitList, setBaitList] = useState(['Mackerel', 'Herring', 'Redfish', 'Flounder']);
    const [newBaitName, setNewBaitName] = useState('');
    const [isAddingBait, setIsAddingBait] = useState(false);

    // --- 1. WEATHER & TIDES ---
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

    useEffect(() => {
        if (!nextTide) return;
        const timer = setInterval(() => setCountDown(getTimeUntil(nextTide.time)), 1000);
        return () => clearInterval(timer);
    }, [nextTide]);

    // --- 2. FIREBASE: ACTIVE PINS ---
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

    // --- 3. HEATMAP LOGIC ---
    useEffect(() => {
        if (!showHeatmap || !currentUser) { setHistoricalPins([]); return; }

        const fetchHistory = async () => {
            const targetDate = new Date(dateId);
            const queryPromises = [];
            for (let i = 0; i <= 5; i++) {
                const pastDate = new Date(targetDate);
                pastDate.setFullYear(targetDate.getFullYear() - i);
                const startStr = new Date(pastDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const endStr = new Date(pastDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                const q = query(collection(db, 'users', currentUser.uid, 'trawls'),
                    where("dateId", ">=", startStr), where("dateId", "<=", endStr), where("status", "==", "history"));
                queryPromises.push(getDocs(q));
            }

            const snapshots = await Promise.all(queryPromises);
            const matches: any[] = [];
            const seenIds = new Set();
            snapshots.forEach(snap => snap.forEach(doc => {
                const data = doc.data();
                if (seenIds.has(doc.id)) return;
                seenIds.add(doc.id);
                matches.push({ id: doc.id, ...data, displayYear: new Date(data.dateId).getFullYear().toString().slice(-2) });
            }));
            setHistoricalPins(matches);
        };
        fetchHistory();
    }, [showHeatmap, currentUser, dateId, refreshTrigger]);

    // --- 4. PIN SAVING ---
    const handleDropPin = () => { setSelectedPin(null); setCatchCount(''); setTrawlNumber(''); setModalVisible(true); };
    const handlePinPress = (pin: any) => { setSelectedPin(pin); setCatchCount(''); setTrawlNumber(pin.trawlNumber?.toString() || ''); setSelectedBait(pin.bait || 'Herring'); setModalVisible(true); };

    const savePin = async () => {
        if (!currentUser) return;
        setSaving(true);
        try {
            const batch = writeBatch(db);
            const pinsRef = collection(db, 'users', currentUser.uid, 'trawls');

            // Use GPS if available, otherwise use map center
            const finalLng = myLocation ? myLocation[0] : mapCenterRef.current[0];
            const finalLat = myLocation ? myLocation[1] : mapCenterRef.current[1];

            const activeQuery = query(pinsRef, where("trawlNumber", "==", parseInt(trawlNumber)), where("status", "==", "active"));
            const oldSnap = await getDocs(activeQuery);

            oldSnap.forEach((docSnap) => {
                batch.update(docSnap.ref, { status: 'history', count: parseInt(catchCount) || 0, haulDate: dateId });
            });

            const newDocRef = doc(pinsRef);
            batch.set(newDocRef, {
                trawlNumber: parseInt(trawlNumber),
                status: 'active',
                dateId: dateId,
                center: { lat: finalLat, lng: finalLng },
                bait: selectedBait,
                timestamp: serverTimestamp()
            });

            await batch.commit();
            setModalVisible(false);
            setRefreshTrigger(p => p + 1);
        } catch (e: any) { Alert.alert("Error", e.message); }
        finally { setSaving(false); }
    };

    return (
        <View style={{flex: 1, backgroundColor: '#0F172A'}}>
            <Mapbox.MapView
                ref={mapRef}
                style={{flex: 1}}
                styleURL={Mapbox.StyleURL.Satellite}
                onCameraChanged={(e) => { mapCenterRef.current = e.geometry.coordinates; }}
                logoEnabled={false}
                attributionEnabled={false}
            >
                <Mapbox.Camera
                    ref={cameraRef}
                    zoomLevel={12}
                    centerCoordinate={mapCenterRef.current}
                />

                {/* THE NAUTICAL DATA (GARMIN PLACEHOLDER) */}
                <Mapbox.RasterSource id="nautical" tileUrlTemplates={["https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"]}>
                    <Mapbox.RasterLayer id="nauticalLayer" sourceID="nautical" style={{ rasterOpacity: 0.8 }} />
                </Mapbox.RasterSource>

                <Mapbox.UserLocation onUpdate={(location) => setMyLocation([location.coords.longitude, location.coords.latitude])} />

                {/* ACTIVE PINS */}
                {!showHeatmap && todaysPins.map((pin) => (
                    <Mapbox.PointAnnotation
                        key={pin.id}
                        id={pin.id}
                        coordinate={[parseFloat(pin.center.lng), parseFloat(pin.center.lat)]}
                        onSelected={() => handlePinPress(pin)}
                    >
                        <View style={{backgroundColor: '#FBBF24', padding: 4, borderRadius: 8, borderWidth: 2, borderColor: 'white'}}>
                            <Text style={{fontWeight: 'bold', fontSize: 10}}>#{pin.trawlNumber}</Text>
                        </View>
                    </Mapbox.PointAnnotation>
                ))}
            </Mapbox.MapView>

            {/* UI: TIDE DISPLAY */}
            <View style={{position: 'absolute', top: 50, left: 20}}>
                {tideInfo && (
                    <View style={{backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, borderRadius: 16, width: 140}}>
                         <Text style={{color: '#94A3B8', fontSize: 10, fontWeight: 'bold'}}>TIDE SPEED</Text>
                         <Text style={{color: 'white', fontWeight: 'bold', fontSize: 18}}>{(tideInfo.currentSpeed?.sg * 1.94).toFixed(1)} kts</Text>
                    </View>
                )}
            </View>

            {/* UI: ZOOM & GPS */}
            <View style={{position: 'absolute', top: 110, right: 20, gap: 10}}>
                <TouchableOpacity onPress={() => cameraRef.current?.zoomTo(15)} style={{backgroundColor: '#334155', padding: 10, borderRadius: 12}}>
                    <Plus size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => myLocation && cameraRef.current?.setCamera({ centerCoordinate: myLocation, zoomLevel: 14 })} style={{backgroundColor: '#2563EB', padding: 10, borderRadius: 12}}>
                    <LocateFixed size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* DROP PIN BUTTON */}
            <View style={{position: 'absolute', bottom: 40, alignSelf: 'center'}}>
                <TouchableOpacity onPress={handleDropPin} style={{backgroundColor: '#2563EB', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 40, flexDirection: 'row', gap: 12}}>
                    <MapPin size={24} color="white" />
                    <Text style={{color: 'white', fontWeight: 'bold', fontSize: 18}}>DROP PIN & LOG</Text>
                </TouchableOpacity>
            </View>

            {/* Standard Modal and Close Button would go here, identical to your Google file */}
        </View>
    );
};

export default Garminmapbox;