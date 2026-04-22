import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { db } from '../../firebaseConfig';
import {
  collection,
  doc,
  onSnapshot,
  setDoc
} from '@react-native-firebase/firestore';
import { getDefaultSeasonConfig } from '../utils/helpers';

export function useProfile(user: any) {
  const [logs, setLogs] = useState({});
  const [profile, setProfile] = useState({ captainName: '', boatName: 'New Boat', seasons: {}, role: 'user' });
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());
  const [manageYear, setManageYear] = useState(new Date().getFullYear());
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [tempLat, setTempLat] = useState('');
  const [tempLng, setTempLng] = useState('');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  useEffect(() => {
    if (!user) return;

    const logsRef = collection(db, 'users', user.uid, 'logs');
    const unsubLogs = onSnapshot(logsRef, (snap) => {
      const newLogs = {};
      snap?.forEach(d => newLogs[d.id] = d.data());
      setLogs(newLogs);
    }, (error) => console.log('Logs Error:', error));

    const profileRef = doc(db, 'users', user.uid, 'settings', 'profile');
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap && snap.exists()) {
        const data = snap.data();
        const now = new Date();
        const currentSeasonStartYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();

        setProfile(prev => ({
          ...prev,
          captainName: data.captainName || prev.captainName || '',
          boatName: data.boatName || prev.boatName || 'New Boat',
          lat: data.lat || null,
          lng: data.lng || null,
          role: data.role || 'user',
          seasons: data.seasons || {},
          ...data
        }));

        setHistoryYear(currentSeasonStartYear);
        setManageYear(currentSeasonStartYear);
      } else {
        setProfile({ captainName: '', boatName: 'New Boat', seasons: {}, role: 'user' });
      }
    }, (error) => console.log('Profile Sync Error:', error.message));

    return () => {
      unsubLogs();
      unsubProfile();
    };
  }, [user]);

  const handleGetCurrentLocation = async () => {
    setIsFetchingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access in your device settings to use this feature.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setTempLat(location.coords.latitude.toString());
      setTempLng(location.coords.longitude.toString());
    } catch (error) {
      Alert.alert('Location Error', 'Could not fetch your location. Make sure your GPS is enabled.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!tempLat || !tempLng) {
      Alert.alert('Invalid Input', 'Please enter both Latitude and Longitude.');
      return;
    }

    // 24-hour lock on coordinate changes
    const lastChanged = profile?.locationLastChanged;
    if (lastChanged) {
      const hoursSince = (Date.now() - new Date(lastChanged).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince);
        Alert.alert(
          'Location Locked',
          `You can only update your fishing location once every 24 hours. Try again in ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}.`
        );
        return;
      }
    }

    setProfile(prev => ({ ...prev, lat: tempLat, lng: tempLng }));
    setLocationModalVisible(false);
    if (user) {
      const profileRef = doc(db, 'users', user.uid, 'settings', 'profile');
      await setDoc(profileRef, {
        lat: tempLat,
        lng: tempLng,
        locationLastChanged: new Date().toISOString()
      }, { merge: true });
      Alert.alert('Location Saved', 'Weather and charts will update automatically.');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const profRef = doc(db, 'users', user.uid, 'settings', 'profile');
      await setDoc(profRef, profile);
      Alert.alert('Success', 'Settings saved!');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleResetSeason = async () => {
    Alert.alert(
      'Start New Bait Season?',
      'This will reset your bait performance stats to zero for the new season.\n\n(Your old fishing logs will NOT be deleted, just hidden from the current stats.)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Fresh',
          style: 'destructive',
          onPress: async () => {
            try {
              const seasonRef = doc(db, 'users', user.uid, 'settings', 'seasonConfig');
              await setDoc(seasonRef, { baitSeasonStart: new Date().toISOString() }, { merge: true });
              Alert.alert('Season Reset', 'Bait stats have been cleared for the new season!');
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  return {
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
    handleResetSeason
  };
}