import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, TextInput, Switch, ActivityIndicator, ScrollView,KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import MapView, { UrlTile, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Layers, X, Plus, Minus, MapPin, Trash2, LocateFixed, Clock } from 'lucide-react-native';

// Firebase Imports
import { auth, db } from '../../firebaseConfig';
import { collection, doc, deleteDoc, query, where, getDocs, writeBatch, arrayUnion, getDoc, onSnapshot } from 'firebase/firestore';

// Styles & Services
import { styles } from '../styles/GlobalStyles';
import { getWeatherData, getNextTide, getTimeUntil } from '../utils/weatherService';
import TideArrow from '../components/TideArrow';

const FishingMap = ({ savedLat, savedLng, onClose, user, dateId }: any) => {
    const mapRef = useRef<MapView>(null);
    const regionRef = useRef<any>(null);
    const catchInputRef = useRef<TextInput>(null);
    const [currentUser, setCurrentUser] = useState(user || auth.currentUser);

    // Data State
    const [todaysPins, setTodaysPins] = useState<any[]>([]);
    const [historicalPins, setHistoricalPins] = useState<any[]>([]);
    const [myLocation, setMyLocation] = useState<any>(null);

    // Tide & UI State
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

    // SAFETY: Ensure initial region are valid numbers
    const initialRegion = {
        latitude: parseFloat(savedLat) || 43.44,
        longitude: parseFloat(savedLng) || -65.62,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    // --- FETCH TIDE ---
    useEffect(() => {
        const fetchTide = async () => {
            try {
                const data = await getWeatherData(initialRegion.latitude, initialRegion.longitude);
                if (data && data.weather && data.weather.hours) setTideInfo(data.weather.hours[0]);
                if (data && data.tides && data.tides.data) setNextTide(getNextTide(data.tides.data));
            } catch (e) {
                console.log("Weather Fetch Error (Non-Critical):", e);
            }
        };
        fetchTide();
    }, []);

    useEffect(() => {
        if (!nextTide) return;
        const timer = setInterval(() => setCountDown(getTimeUntil(nextTide.time)), 1000);
        return () => clearInterval(timer);
    }, [nextTide]);

    // --- LISTEN FOR ACTIVE PINS (With Crash Guard) ---
    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, 'users', currentUser.uid, 'trawls'), where("status", "==", "active"));
        const unsubscribe = onSnapshot(q, (snap) => {
            const data: any[] = [];
            snap.forEach(d => {
                const docData = d.data();
                // GUARD: Only push if coordinates exist
                if (docData.center && docData.center.lat && docData.center.lng) {
                    data.push({ id: d.id, ...docData });
                }
            });
            setTodaysPins(data);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // --- HEATMAP LOGIC ---
    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result.toISOString().split('T')[0];
    };

    useEffect(() => {
        if (!showHeatmap || !currentUser) {
            setHistoricalPins([]);
            return;
        }

        const fetchHistory = async () => {
            console.log("🔥 Fetching Heatmap Data...");
            const targetDate = new Date(dateId);
            const currentYear = targetDate.getFullYear();
            const YEARS_TO_CHECK = 5;
            const WINDOW_DAYS = 14;

            const queryPromises = [];

            for (let i = 0; i <= YEARS_TO_CHECK; i++) {
                const pastYear = currentYear - i;
                const pastDate = new Date(targetDate);
                pastDate.setFullYear(pastYear);

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
                        // GUARD: Skip data without valid location
                        if (!data.center || isNaN(data.center.lat) || isNaN(data.center.lng)) return;

                        seenIds.add(doc.id);

                        const d = new Date(data.dateId);
                        const displayYear = d.getFullYear().toString().slice(-2);
                        matches.push({ id: doc.id, ...data, displayYear });
                    });
                });
                console.log(`✅ Found ${matches.length} history pins`);
                setHistoricalPins(matches);
            } catch (err: any) {
                console.log("❌ Error fetching history:", err);
                if(err.message && err.message.includes("index")) {
                    Alert.alert("Missing Index", "Firestore needs an index to show this heatmap. Check your console logs for the link!");
                }
            }
        };
        fetchHistory();
    }, [showHeatmap, currentUser, dateId]);

    // --- COLOR LOGIC ---
    const { coloredPins } = useMemo(() => {
        // Guard against NaN
        const max = Math.max(...historicalPins.map(p => Number(p.count) || 0), 1);

        const colored = historicalPins.map(pin => {
            const count = Number(pin.count) || 0;
            const percentage = (count / max) * 100;
            let color = '#94A3B8'; // Default Grey
            if (percentage >= 90) color = '#EF4444';      // Red
            else if (percentage >= 70) color = '#F97316'; // Orange
            else if (percentage >= 50) color = '#EAB308'; // Yellow
            else if (percentage >= 25) color = '#3B82F6'; // Blue
            return { ...pin, color, count }; // Ensure count is passed as number
        });
        return { coloredPins: colored };
    }, [historicalPins]);

    // --- SAVE LOGIC ---
    const handleDropPin = () => { setSelectedPin(null); setCatchCount(''); setTrawlNumber(''); setModalVisible(true); };
    const handlePinPress = (pin: any) => { setSelectedPin(pin); setCatchCount(pin.count.toString()); setTrawlNumber(pin.trawlNumber?.toString()||''); setSelectedBait(pin.bait||'Herring'); setModalVisible(true); };

   const savePin = async () => {
       if (!currentUser) return;
       if (!selectedPin && !trawlNumber) { Alert.alert("Missing Info", "Please enter a Trawl Number."); return; }

       setSaving(true);
       try {
           const batch = writeBatch(db);
           const pinsRef = collection(db, 'users', currentUser.uid, 'trawls');
           const catchNum = parseInt(catchCount) || 0;
           const tNum = parseInt(trawlNumber);

           if (selectedPin) {
                // Editing a pin you tapped on the map
                const pinRef = doc(db, 'users', currentUser.uid, 'trawls', selectedPin.id);
                batch.update(pinRef, { trawlNumber: tNum, count: catchNum, bait: selectedBait });
           } else {
               // Dropping a brand new pin from the bottom button
               let pinLocation = myLocation || regionRef.current || initialRegion;
               const lat = parseFloat(pinLocation.latitude || pinLocation.lat);
               const lng = parseFloat(pinLocation.longitude || pinLocation.lng);

               if (isNaN(lat) || isNaN(lng)) {
                   throw new Error("Invalid Coordinates. Please move the map and try again.");
               }

               // 1. If you logged a catch, save that catch data to history first
               if (catchNum > 0) {
                   const historyDocRef = doc(pinsRef);
                   batch.set(historyDocRef, {
                       trawlNumber: tNum,
                       status: 'history',
                       dateId: dateId,
                       haulDate: dateId,
                       center: { lat: lat, lng: lng },
                       bait: selectedBait || 'Herring',
                       count: catchNum,
                       timestamp: new Date().toISOString()
                   });
               }

               // 2. Find any old active trap with this number and retire it to history
               const oldTrawlQuery = query(pinsRef, where("trawlNumber", "==", tNum), where("status", "==", "active"));
               const oldSnap = await getDocs(oldTrawlQuery);
               oldSnap.forEach((docSnap) => {
                   const docRef = doc(db, 'users', currentUser.uid, 'trawls', docSnap.id);
                   batch.update(docRef, { status: 'history', haulDate: dateId });
               });

               // 3. ALWAYS drop a new ACTIVE yellow pin for the trap currently soaking
               const newDocRef = doc(pinsRef);
               batch.set(newDocRef, {
                   trawlNumber: tNum,
                   status: 'active',
                   dateId: dateId,
                   center: { lat: lat, lng: lng },
                   bait: selectedBait || 'Herring',
                   count: 0, // Reset the catch count for the new set
                   timestamp: new Date().toISOString()
               });
           }
           await batch.commit();
           setModalVisible(false);
       } catch (e) {
           Alert.alert("Error", e.message);
       } finally {
           setSaving(false);
       }
   };

    const handleDelete = async () => {
        if (!selectedPin || !currentUser) return;
        try { await deleteDoc(doc(db, 'users', currentUser.uid, 'trawls', selectedPin.id)); setModalVisible(false); } catch(e) { console.log(e); }
    };

    // --- BAIT HELPERS ---
    useEffect(() => {
        const loadBaits = async () => {
            if(!currentUser) return;
            const snap = await getDoc(doc(db, 'users', currentUser.uid, 'settings', 'preferences'));
            if(snap.exists() && snap.data().customBaits) setBaitList(prev => [...prev, ...snap.data().customBaits]);
        };
        loadBaits();
    }, [currentUser]);

    const handleAddCustomBait = async () => {
        if (!newBaitName.trim()) { setIsAddingBait(false); return; }
        setBaitList(prev => [...prev, newBaitName]);
        setSelectedBait(newBaitName);
        await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'preferences'), { customBaits: arrayUnion(newBaitName) }, { merge: true });
        setIsAddingBait(false);
    };

    return (
        <View style={{flex: 1, backgroundColor: '#1E293B'}}>
            <MapView
                ref={mapRef}
                style={{flex: 1}}
                initialRegion={initialRegion}
                provider={PROVIDER_GOOGLE}
                showsUserLocation={true}
                showsMyLocationButton={false}
                mapType="satellite"
                onUserLocationChange={(e) => setMyLocation(e.nativeEvent.coordinate)}
                onRegionChange={(r) => regionRef.current = r}
                onRegionChangeComplete={(r) => regionRef.current = r}
            >
                <UrlTile urlTemplate="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" maximumZ={19} zIndex={1} />

                {/* 1. HEATMAP LAYER (Safety Checks Added) */}
                {showHeatmap && coloredPins.map((pin) => {
                    // STRICT SAFETY CHECK: Don't render bad coordinates
                    if (!pin.center || isNaN(pin.center.lat) || isNaN(pin.center.lng)) return null;

                    return (
                        <Marker
                            key={pin.id}
                            coordinate={{latitude: parseFloat(pin.center.lat), longitude: parseFloat(pin.center.lng)}}
                            anchor={{x: 0.5, y: 0.5}}
                            opacity={0.9}
                            tracksViewChanges={false}
                        >
                            <View style={{
                                backgroundColor: pin.color,
                                paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
                                borderWidth: 1, borderColor: 'white',
                                shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.3, shadowRadius: 1
                            }}>
                                <Text style={{color: 'white', fontWeight: '900', fontSize: 10}}>
                                    {pin.count} <Text style={{fontSize: 8, color: 'rgba(255,255,255,0.8)'}}>'{pin.displayYear}</Text>
                                </Text>
                            </View>
                        </Marker>
                    );
                })}

                {/* 2. ACTIVE PINS (Safety Checks Added) */}
                {!showHeatmap && todaysPins.map((pin) => {
                    // STRICT SAFETY CHECK
                    if (!pin.center || isNaN(pin.center.lat) || isNaN(pin.center.lng)) return null;

                    return (
                        <Marker
                            key={pin.id}
                            coordinate={{latitude: parseFloat(pin.center.lat), longitude: parseFloat(pin.center.lng)}}
                            onPress={() => handlePinPress(pin)}
                        >
                            <View style={{backgroundColor: '#FBBF24', padding: 4, borderRadius: 8, borderWidth: 2, borderColor: 'white', minWidth: 26, alignItems: 'center'}}>
                                <Text style={{fontWeight: 'bold', fontSize: 10, color: 'black'}}>#{pin.trawlNumber}</Text>
                            </View>
                        </Marker>
                    );
                })}
            </MapView>

            {/* --- CONTROLS (Identical to previous, just context preserved) --- */}
            <View style={{position: 'absolute', top: 50, left: 20}}>
                {/* TIDE TILE */}
                {tideInfo && (
                    <View style={{backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, borderRadius: 16, width: 140, marginBottom: 10}}>
                         <Text style={{color: '#94A3B8', fontSize: 10, fontWeight: 'bold', marginBottom: 4}}>CURRENT TIDE</Text>
                         <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                             <View style={{transform: [{ rotate: `${tideInfo.currentDirection?.sg || 0}deg` }]}}><TideArrow size={24} /></View>
                             <Text style={{color: 'white', fontWeight: 'bold', fontSize: 18}}>{(tideInfo.currentSpeed?.sg * 1.94384).toFixed(1)} <Text style={{fontSize: 12, color: '#94A3B8'}}>kts</Text></Text>
                         </View>
                         {nextTide && (
                             <View style={{marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#334155'}}>
                                 <Text style={{color: nextTide.type === 'high' ? '#4ADE80' : '#F87171', fontSize: 10, fontWeight: 'bold'}}>{nextTide.type === 'high' ? 'HIGH' : 'LOW'} IN:</Text>
                                 <Text style={{color: 'white', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 16, marginTop: 2}}>{countDown}</Text>
                             </View>
                         )}
                    </View>
                )}
                {/* HEATMAP */}
                <View style={{backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 10, borderRadius: 12, alignItems: 'center', width: 140}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5}}>
                        <Layers size={16} color="#FBBF24" />
                        <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>HISTORY PINS</Text>
                    </View>
                    <Switch value={showHeatmap} onValueChange={setShowHeatmap} trackColor={{false: '#334155', true: '#FBBF24'}} thumbColor={showHeatmap ? '#FFF' : '#94A3B8'} />
                </View>
            </View>

            {/* ZOOM CONTROLS */}
            <View style={{position: 'absolute', top: 110, right: 20, backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: 20, padding: 8, gap: 12, alignItems: 'center'}}>
                <TouchableOpacity onPress={async () => {
                        const camera = await mapRef.current?.getCamera();
                        if (camera) { camera.zoom = (camera.zoom || 15) + 1; mapRef.current?.animateCamera(camera, { duration: 400 }); }
                    }} style={{padding: 8, backgroundColor: '#334155', borderRadius: 12}}>
                    <Plus size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity onPress={async () => {
                        const camera = await mapRef.current?.getCamera();
                        if (camera) { camera.zoom = (camera.zoom || 15) - 1; mapRef.current?.animateCamera(camera, { duration: 400 }); }
                    }} style={{padding: 8, backgroundColor: '#334155', borderRadius: 12}}>
                    <Minus size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => myLocation ? mapRef.current?.animateToRegion({...myLocation, latitudeDelta: 0.05, longitudeDelta: 0.05}, 500) : Alert.alert("Waiting for GPS")} style={{padding: 8, backgroundColor: '#2563EB', borderRadius: 12}}><LocateFixed size={24} color="white" /></TouchableOpacity>
            </View>

            {/* CLOSE BUTTON */}
            <TouchableOpacity onPress={onClose} style={{position: 'absolute', top: 50, right: 20, backgroundColor: '#EF4444', padding: 12, borderRadius: 30}}><X size={28} color="white" /></TouchableOpacity>

            {/* DROP PIN BUTTON */}
            <View style={{position: 'absolute', bottom: 40, alignSelf: 'center'}}>
                <TouchableOpacity onPress={handleDropPin} style={{backgroundColor: '#2563EB', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 40, flexDirection: 'row', gap: 12, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10}}>
                    <MapPin size={24} color="white" fill="white"/>
                    <Text style={{color: 'white', fontWeight: 'bold', fontSize: 18}}>DROP PIN & LOG</Text>
                </TouchableOpacity>
            </View>

            {/* MODAL */}
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                {/* 1. Allows tapping anywhere in the dark background to close the keyboard */}
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                     <View style={{flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)'}}>

                        {/* 2. Pushes the white card up when the keyboard opens on iOS */}
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        >
                            {/* Your white modal card starts here */}
                            <View style={{backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24}}>

                                {/* Header Row */}
                                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={{padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8}}>
                                        <X size={20} color="#64748B" />
                                    </TouchableOpacity>
                                    <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1E293B'}}>{selectedPin ? 'Edit Catch' : 'Log Haul & Set'}</Text>
                                    {selectedPin ? ( <TouchableOpacity onPress={handleDelete} style={{backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8}}><Trash2 size={20} color="#EF4444"/></TouchableOpacity>) : (<View style={{width: 36}} />)}
                                </View>

                                {/* Trawl Number Input */}
                                <Text style={{fontSize: 10, fontWeight:'bold', color:'#94A3B8'}}>TRAWL NUMBER</Text>
                                <TextInput
                                    keyboardType="number-pad"
                                    returnKeyType="next"
                                    onSubmitEditing={() => catchInputRef.current?.focus()}
                                    blurOnSubmit={false}
                                    style={{backgroundColor:'#F1F5F9', fontSize: 18, fontWeight: 'bold', padding: 15, borderRadius: 10, marginTop:5, marginBottom: 15, color:'#1E293B'}}
                                    placeholder="e.g. 15"
                                    value={trawlNumber}
                                    onChangeText={setTrawlNumber}
                                />

                                {/* Catch Count Input */}
                                <Text style={{fontSize: 10, fontWeight:'bold', color:'#94A3B8'}}>LOBSTERS CAUGHT (From Old Haul)</Text>
                                <TextInput
                                    ref={catchInputRef}
                                    keyboardType="number-pad"
                                    returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss}
                                    style={{backgroundColor:'#F1F5F9', fontSize: 32, fontWeight: 'bold', padding: 15, borderRadius: 10, marginTop:5, color:'#1E40AF', textAlign: 'center'}}
                                    placeholder="0"
                                    value={catchCount}
                                    onChangeText={setCatchCount}
                                />

                                {/* Bait Selection */}
                                <Text style={{fontSize: 10, fontWeight:'bold', color:'#94A3B8', marginTop: 20}}>BAIT (For New Set)</Text>
                                {isAddingBait ? (
                                    <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                                        <TextInput style={{flex: 1, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10}} placeholder="New bait..." value={newBaitName} onChangeText={setNewBaitName} />
                                        <TouchableOpacity onPress={handleAddCustomBait} style={{backgroundColor: '#22C55E', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 10}}><Text style={{color:'white', fontWeight:'bold'}}>Add</Text></TouchableOpacity>
                                    </View>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row', marginVertical: 10}}>
                                        {baitList.map((bait, i) => ( <TouchableOpacity key={i} onPress={() => setSelectedBait(bait)} style={{padding: 10, backgroundColor: selectedBait === bait ? '#EFF6FF' : '#F1F5F9', borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: selectedBait===bait?'#3B82F6':'transparent'}}><Text style={{color: selectedBait===bait?'#2563EB':'#64748B'}}>{bait}</Text></TouchableOpacity> ))}
                                        <TouchableOpacity onPress={() => setIsAddingBait(true)} style={{padding: 10, backgroundColor: '#F1F5F9', borderRadius: 10}}><Plus size={20} color="#64748B" /></TouchableOpacity>
                                    </ScrollView>
                                )}

                                {/* Save Button */}
                                <TouchableOpacity onPress={savePin} disabled={saving} style={{marginTop: 20, backgroundColor: '#1E40AF', padding: 16, borderRadius: 12, alignItems: 'center'}}>
                                    {saving ? <ActivityIndicator color="white"/> : <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>Cycle Trawl & Save</Text>}
                                </TouchableOpacity>

                            </View>
                        </KeyboardAvoidingView>
                     </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

export default FishingMap;