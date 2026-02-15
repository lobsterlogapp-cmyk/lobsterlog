import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator, Platform } from 'react-native';
import { X, Calendar, ChevronDown, ChevronUp, MapPin } from 'lucide-react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

const ExpandableTrawlCard = ({ item }: { item: any }) => {
    const [expanded, setExpanded] = useState(false);

    // Format the timestamp to show a readable haul time (e.g., 10:45 AM)
    const haulTime = item.timestamp
        ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--:--';

    return (
        <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            style={{backgroundColor: '#334155', borderRadius: 12, marginBottom: 12, padding: 16}}
        >
            {/* Always Visible Header */}
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                    <View style={{backgroundColor: '#FBBF24', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6}}>
                        <Text style={{fontWeight: 'bold', color: '#1E293B', fontSize: 14}}>#{item.trawlNumber}</Text>
                    </View>
                    <View>
                        <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>
                            {item.count} Lobsters
                        </Text>
                        <Text style={{color: '#64748B', fontSize: 10}}>
                            Hauled at {haulTime}
                        </Text>
                    </View>
                </View>

                <View style={{alignItems: 'flex-end', gap: 4}}>
                    <Text style={{color: '#94A3B8', fontSize: 12, fontWeight: 'bold'}}>
                        {item.soakTime ? `Soak: ${item.soakTime}` : 'New Set'}
                    </Text>
                    {expanded ? <ChevronUp color="#94A3B8" size={16} /> : <ChevronDown color="#94A3B8" size={16} />}
                </View>
            </View>

            {/* Expanded Details */}
            {expanded && (
                <View style={{marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#475569', gap: 10}}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Text style={{color: '#94A3B8', fontSize: 12, fontWeight: 'bold'}}>BAIT USED</Text>
                        {/* Uses baitAtHaul if available, otherwise falls back to bait */}
                        <Text style={{color: 'white', fontSize: 14, fontWeight: 'bold'}}>{item.baitAtHaul || item.bait || 'Unknown'}</Text>
                    </View>

                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                        <Text style={{color: '#94A3B8', fontSize: 12, fontWeight: 'bold'}}>COORDINATES</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                            <MapPin size={12} color="#94A3B8" />
                            <Text style={{color: 'white', fontSize: 12, fontFamily: 'monospace'}}>
                                {parseFloat(item.center?.lat || 0).toFixed(4)}, {parseFloat(item.center?.lng || 0).toFixed(4)}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
};

export const DailyHistoryModal = ({ visible, onClose, currentUser }: any) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const formattedDateId = selectedDate.toISOString().split('T')[0];

    useEffect(() => {
        if (!visible || !currentUser) return;

        const fetchDailyHistory = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'users', currentUser.uid, 'trawls'),
                    where("status", "==", "history"),
                    where("dateId", "==", formattedDateId)
                );

                const snap = await getDocs(q);
                const trawls: any[] = [];
                snap.forEach(doc => {
                    trawls.push({ id: doc.id, ...doc.data() });
                });

                // Sort by trawl number, then by timestamp so multiple hauls of same trawl appear in order
                trawls.sort((a, b) => {
                    if (a.trawlNumber !== b.trawlNumber) {
                        return (Number(a.trawlNumber) || 0) - (Number(b.trawlNumber) || 0);
                    }
                    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                });

                setHistoryData(trawls);
            } catch (error) {
                console.log("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDailyHistory();
    }, [visible, selectedDate, currentUser]);

    const addDays = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const onDateChange = (event: any, selected?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }
        if (selected) {
            setSelectedDate(selected);
        }
    };

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={{flex: 1, backgroundColor: '#1E293B', marginTop: 50, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: {width: 0, height: -4}, shadowOpacity: 0.2, shadowRadius: 10}}>

                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                    <Text style={{fontSize: 24, fontWeight: 'bold', color: 'white'}}>Daily Logbook</Text>
                    <TouchableOpacity onPress={onClose} style={{padding: 8, backgroundColor: '#334155', borderRadius: 20}}>
                        <X size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F172A', padding: 12, borderRadius: 12, marginBottom: 20}}>
                    <TouchableOpacity onPress={() => addDays(-1)} style={{padding: 10}}><Text style={{color: '#3B82F6', fontWeight: 'bold'}}>← Prev</Text></TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowPicker(true)} style={{flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10}}>
                        <Calendar size={18} color="#FBBF24" />
                        <Text style={{color: 'white', fontSize: 16, fontWeight: 'bold'}}>{formattedDateId}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => addDays(1)} style={{padding: 10}}><Text style={{color: '#3B82F6', fontWeight: 'bold'}}>Next →</Text></TouchableOpacity>
                </View>

                {showPicker && (
                    <View style={Platform.OS === 'ios' ? { backgroundColor: 'white', borderRadius: 12, padding: 10, marginBottom: 20 } : {}}>
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            maximumDate={new Date()}
                        />
                        {Platform.OS === 'ios' && (
                            <TouchableOpacity onPress={() => setShowPicker(false)} style={{backgroundColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10}}>
                                <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>Confirm Date</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {loading ? (
                    <ActivityIndicator size="large" color="#3B82F6" style={{marginTop: 50}} />
                ) : historyData.length === 0 ? (
                    <View style={{alignItems: 'center', marginTop: 50}}>
                        <Text style={{color: '#64748B', fontSize: 16}}>No trawls recorded for this date.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={historyData}
                        keyExtractor={(item) => item.id}
                        renderItem={({item}) => <ExpandableTrawlCard item={item} />}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </Modal>
    );
};