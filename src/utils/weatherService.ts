// src/utils/weatherService.ts
import { STORMGLASS_API_KEY } from './helpers';

// Shared Cache (Lives here now so Map & Dashboard can both use it)
let globalCache = {
    weather: null as any,
    tides: null as any,
    lastWeatherFetch: 0,
    lastTideFetch: 0,
    lat: 0,
    lng: 0
};

// 1. Fetch Logic with Split Timers
export const getWeatherData = async (lat: number, lng: number) => {
    const now = Date.now();
    const WEATHER_TIMEOUT = 60 * 60 * 1000; // 1 Hour
    const TIDE_TIMEOUT = 5 * 60 * 1000;     // 5 Minutes

    const isLocSame = (Math.abs(lat - globalCache.lat) < 0.01) && (Math.abs(lng - globalCache.lng) < 0.01);

    // Initialize result with cached data
    let result = {
        weather: globalCache.weather,
        tides: globalCache.tides
    };

    try {
        // A. Check Weather Cache (1 Hour)
        if (!isLocSame || !globalCache.weather || (now - globalCache.lastWeatherFetch > WEATHER_TIMEOUT)) {
            console.log("🌊 Fetching NEW Weather...");
            const params = 'airTemperature,waterTemperature,waveHeight,windWaveHeight,swellHeight,secondarySwellHeight,windSpeed,windDirection,gust,currentSpeed,currentDirection';
            const resp = await fetch(`https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=${params}`, {
                headers: { 'Authorization': STORMGLASS_API_KEY }
            });
            const json = await resp.json();
            if (json.hours) {
                globalCache.weather = json;
                globalCache.lastWeatherFetch = now;
                result.weather = json;
            }
        }

        // B. Check Tide Cache (5 Minutes)
        if (!isLocSame || !globalCache.tides || (now - globalCache.lastTideFetch > TIDE_TIMEOUT)) {
            console.log("🌖 Fetching NEW Tides...");
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const resp = await fetch(`https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lng}&start=${new Date().toISOString()}&end=${tomorrow.toISOString()}`, {
                headers: { 'Authorization': STORMGLASS_API_KEY }
            });
            const json = await resp.json();
            if (json.data) {
                globalCache.tides = json;
                globalCache.lastTideFetch = now;
                result.tides = json;
            }
        }

        // Update location
        globalCache.lat = lat;
        globalCache.lng = lng;

        return result;

    } catch (e) {
        console.log("Weather Service Error", e);
        return result; // Return whatever we have cached if it fails
    }
};

// 2. Helper: Find Next Tide Event (High or Low)
export const getNextTide = (tides: any[]) => {
    if (!tides || tides.length === 0) return null;
    const now = new Date();
    // Find the first tide in the future
    const next = tides.find((t: any) => new Date(t.time) > now);
    return next || null;
};

// 3. Helper: Format Countdown (e.g. "02:14:05")
export const getTimeUntil = (targetDateStr: string) => {
    const total = Date.parse(targetDateStr) - Date.now();
    if (total <= 0) return "00:00:00";
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const seconds = Math.floor((total / 1000) % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};