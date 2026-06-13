import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { db } from '../../firebaseConfig';
import { doc, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';

// Style Import
import { styles } from '../styles/GlobalStyles';

const BaitStats = ({ user, isPro, onUnlock }: any) => {
     const { t } = useTranslation('common');
     const [averages, setAverages] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
     const [seasonStart, setSeasonStart] = useState<Date | null>(null);

     // NATIVE LISTENER 1: Season Config
     useEffect(() => {
         if (!user) return;
         const configRef = doc(db, 'users', user.uid, 'settings', 'seasonConfig');
         const unsubConfig = onSnapshot(configRef, (snap) => {
                if (snap && snap.exists && snap.data()?.baitSeasonStart) {
                    setSeasonStart(new Date(snap.data()?.baitSeasonStart));
                } else {
                    setSeasonStart(null);
                }
            }, (error) => console.log("BaitStats Config Error:", error));

         return () => unsubConfig();
     }, [user]);

     // NATIVE LISTENER 2: Trawl History
     useEffect(() => {
         if (!user) return;
         const trawlsRef = collection(db, 'users', user.uid, 'trawls');
         const trawlsQuery = query(trawlsRef, where("status", "==", "history"));
         const unsubscribe = onSnapshot(trawlsQuery, (snapshot) => {
                const baitMap: any = {};

                snapshot?.forEach((trawlDoc) => {
                    const data = trawlDoc.data();
                    if (seasonStart) {
                        const trawlDate = data.timestamp ? new Date(data.timestamp.toDate ? data.timestamp.toDate() : data.timestamp) : new Date(data.haulDate);
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
                })).sort((a: any, b: any) => b.avg - a.avg);

                setAverages(stats);
                setLoading(false);
            }, (error) => console.log("BaitStats Data Error:", error));

         return () => unsubscribe();
     }, [user, seasonStart]);

     if (!isPro) {
         return (
             <TouchableOpacity onPress={onUnlock} activeOpacity={0.8}>
                 <View style={{backgroundColor: '#F1F5F9', margin: 20, padding: 20, borderRadius: 16, alignItems: 'center'}}>
                     <Lock size={32} color="#94A3B8" style={{marginBottom: 10}}/>
                     <Text style={{fontWeight: 'bold', fontSize: 16, color: '#334155'}}>{t('bait.title')}</Text>
                     <Text style={{textAlign: 'center', color: '#64748B', marginTop: 5}}>{t('bait.upgradeSub')}</Text>
                 </View>
             </TouchableOpacity>
         );
     }

     if (loading) return <ActivityIndicator color="#2563EB" style={{margin: 20}} />;

     if (averages.length === 0) {
         return (
             <View style={{margin: 20, padding: 20, backgroundColor: 'white', borderRadius: 16, alignItems: 'center'}}>
                 <Text style={{color: '#64748B'}}>{t('bait.noData')}</Text>
                 <Text style={{fontSize: 12, color: '#94A3B8', marginTop: 5}}>{t('bait.noDataSub')}</Text>
             </View>
         );
     }

     return (
         <View style={{margin: 20, padding: 20, backgroundColor: 'white', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10}}>
             <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15}}>
                 <Text style={{fontSize: 18, fontWeight: '900', color: '#0F172A'}}>{t('bait.title')}</Text>
                 <View style={{backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6}}>
                     <Text style={{fontSize: 10, fontWeight: 'bold', color: '#2563EB'}}>{t('bait.avgLabel')}</Text>
                 </View>
             </View>

             {averages.map((item, index) => (
                 <View key={index} style={{marginBottom: 16}}>
                     <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                         <Text style={{fontWeight: 'bold', color: '#334155'}}>{item.bait}</Text>
                         <Text style={{fontWeight: '900', color: '#0F172A'}}>{item.avg} <Text style={{fontSize: 10, color: '#94A3B8', fontWeight: 'normal'}}>{t('bait.avgUnit')}</Text></Text>
                     </View>
                     <View style={{height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden'}}>
                         <View style={{
                             height: '100%',
                             width: `${Math.min((Number(item.avg) / (Number(averages[0].avg) * 1.2)) * 100, 100)}%`,
                             backgroundColor: index === 0 ? '#10B981' : '#3B82F6',
                             borderRadius: 4
                         }} />
                     </View>
                     <Text style={{fontSize: 10, color: '#94A3B8', marginTop: 4}}>{t('bait.stringsLogged', { count: item.strings })}</Text>
                 </View>
             ))}
         </View>
     );
 };

 export default BaitStats;