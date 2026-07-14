import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import i18next from 'i18next';
import { db } from '../../firebaseConfig';
import { doc, setDoc } from '@react-native-firebase/firestore';
import { formatDateId, getWindDirection, getAverageWeather } from '../utils/helpers';
import { DEFAULT_LOCATION } from '../config/constants';

export function useLogForm(user: any, profile: any, dateId: string, isPro: boolean) {
  const [formData, setFormData] = useState({
    lbs: '', price: '', temp: '', wind: '', windDir: '', weather: [] as string[], notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // This effect runs when dateId changes but we need logs passed in
    // We'll handle this via the loadFormData function called from App
  }, [dateId]);

  const loadFormData = (logs: any, dateId: string) => {
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
        .filter((l: any) => l.dateId < dateId && l.price && l.price !== '0')
        .sort((a: any, b: any) => b.dateId.localeCompare(a.dateId));
      const lastPrice = previousLogs.length > 0 ? (previousLogs[0] as any).price : '';
      setFormData({
        lbs: '',
        price: lastPrice,
        temp: '',
        wind: '',
        windDir: '',
        weather: [] as string[],
        notes: ''
      });
    }
  };

  const toggleWeather = (option: string) => {
    let current = Array.isArray(formData.weather) ? formData.weather : (formData.weather ? [formData.weather] : []);
    if (option === 'No Fishing') {
      setFormData({ ...formData, weather: ['No Fishing'] });
      return;
    }
    if (current.includes('No Fishing')) current = [];
    if (current.includes(option)) {
      setFormData({ ...formData, weather: current.filter(w => w !== option) });
    } else {
      setFormData({ ...formData, weather: [...current, option] });
    }
  };

  const saveLogData = async (data = formData) => {
    if (!user) return;
    setSaving(true);

    const safeDateId = dateId || formatDateId(new Date());
    const [year, month, day] = safeDateId.split('-').map(Number);

    try {
      let finalData = {
        lbs: String(data.lbs ?? '0'),
        price: String(data.price ?? '0'),
        temp: String(data.temp ?? ''),
        wind: String(data.wind ?? ''),
        windDir: String(data.windDir ?? ''),
        notes: String(data.notes ?? ''),
        swell: String((data as any).swell ?? '0.0'),
        gust: String((data as any).gust ?? '0.0'),
        weather: Array.isArray(data.weather) ? data.weather : []
      };

      let needsWeatherSync = false;
      const hasManualWind = data.wind && data.wind.trim() !== '';

      if (isPro && !hasManualWind) {
        try {
          const lat = profile?.lat || DEFAULT_LOCATION.lat;
          const lng = profile?.lng || DEFAULT_LOCATION.lng;

          const weatherPromise = getAverageWeather(lat, lng, safeDateId);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout: Assumed offshore')), 4000)
          );

          const weatherAvg = await Promise.race([weatherPromise, timeoutPromise]) as any;

          if (weatherAvg) {
            finalData.wind = String((weatherAvg.avgWindKnots || 0).toFixed(1));
            finalData.swell = String((weatherAvg.avgSwellMeters || 0).toFixed(1));
            finalData.gust = String((weatherAvg.avgGustKnots || 0).toFixed(1));
            finalData.windDir = String(getWindDirection(weatherAvg.avgDirection) ?? '');
          } else {
            needsWeatherSync = true;
          }
        } catch {
          needsWeatherSync = true;
        }
      }

      const payload = {
        ...finalData,
        dateId: safeDateId,
        year: year || new Date().getFullYear(),
        month: month || new Date().getMonth() + 1,
        day: day || new Date().getDate(),
        updatedAt: new Date().toISOString(),
        needsWeatherSync
      };

      const logDocRef = doc(db, 'users', user.uid, 'logs', safeDateId);
      await setDoc(logDocRef, payload, { merge: true });

      Alert.alert(i18next.t('log.logSavedTitle'), isPro && !hasManualWind && finalData.wind ? i18next.t('log.logSavedWeather') : i18next.t('log.logSavedBody'));

    } catch (e: any) {
      Alert.alert(i18next.t('log.saveErrorTitle'), e.message);
    } finally {
      setSaving(false);
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
    saveLogData(skipped);
  };

  return {
    formData,
    setFormData,
    saving,
    loadFormData,
    toggleWeather,
    saveLogData,
    handleSkipDay
  };
}