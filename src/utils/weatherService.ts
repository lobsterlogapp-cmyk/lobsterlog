// src/utils/weatherService.ts
import { formatInTimeZone } from 'date-fns-tz';

const CHS_STATIONS_URL = "https://api-iwls.dfo-mpo.gc.ca/api/v1/stations";
const CHS_PREDICTIONS_BASE = "https://api-iwls.dfo-mpo.gc.ca/api/v1/stations";
const TIMEZONE = "America/Halifax";

// Shared Cache
let globalCache = {
    weather: null as any,
    tides: null as any,
    lastWeatherFetch: 0,
    lastTideFetch: 0,
    lat: 0,
    lng: 0,
    stations: [] as any[] // Cache the wharf list to save bandwidth
};

/**
 * Haversine formula to find distance between coordinates in km
 */
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getWeatherData = async (lat: number, lng: number) => {
    const now = Date.now();
    const WEATHER_TIMEOUT = 60 * 60 * 1000; // 1 Hour
    const TIDE_TIMEOUT = 15 * 60 * 1000;    // 15 Minutes

    const isLocSame = (Math.abs(lat - globalCache.lat) < 0.001) && (Math.abs(lng - globalCache.lng) < 0.001);

    let result = {
        weather: globalCache.weather,
        tides: globalCache.tides
    };

    try {
        // A. Weather Fetch (Stormglass)
        if (!isLocSame || !globalCache.weather || (now - globalCache.lastWeatherFetch > WEATHER_TIMEOUT)) {
            console.log("🌊 Fetching NEW Weather...");
            const params = 'airTemperature,waterTemperature,waveHeight,windWaveHeight,swellHeight,secondarySwellHeight,windSpeed,windDirection,gust,currentSpeed,currentDirection';
            const resp = await fetch(`https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=${params}`, {
                            headers: { 'Authorization': process.env.EXPO_PUBLIC_STORMGLASS_API_KEY as string }
                        });
            const json = await resp.json();
            if (json.hours) {
                globalCache.weather = json;
                globalCache.lastWeatherFetch = now;
                result.weather = json;
            }
        }

        // B. Hybrid Tide Fetch (CHS + Stormglass)
        if (!isLocSame || !globalCache.tides || (now - globalCache.lastTideFetch > TIDE_TIMEOUT)) {
            console.log("🌖 Fetching Hybrid Tides...");

            if (globalCache.stations.length === 0) {
                const sResp = await fetch(CHS_STATIONS_URL);
                globalCache.stations = await sResp.json();
            }

            let nearestStation = globalCache.stations[0];
            let minDistance = Infinity;
            globalCache.stations.forEach((s: any) => {
                const d = getDistance(lat, lng, s.latitude, s.longitude);
                if (d < minDistance) { minDistance = d; nearestStation = s; }
            });

            // FIX 1: Use the correct CHS endpoint and date range
            const fromDate = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
            const toDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

            const [chsResp, sgResp] = await Promise.all([
                fetch(`${CHS_PREDICTIONS_BASE}/${nearestStation.id}/data?time-series-code=wlp-hilo&from=${fromDate}&to=${toDate}`),
                const [chsResp, sgResp] = await Promise.all([
                                fetch(`${CHS_PREDICTIONS_BASE}/${nearestStation.id}/data?time-series-code=wlp-hilo&from=${fromDate}&to=${toDate}`),
                                fetch(`https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lng}`, {
                                    headers: { 'Authorization': process.env.EXPO_PUBLIC_STORMGLASS_API_KEY as string }
                                })
            ]);

            const chsData = await chsResp.json();
            const sgData = await sgResp.json();

            // IMPROVED SAFETY CHECK
            if (!Array.isArray(chsData) || chsData.length === 0 || !sgData.data) {
                console.warn("Tide API returned invalid format, falling back to Stormglass only");
                const fallbackTides = {
                    data: sgData.data || [],
                    meta: { station: "Stormglass Fallback", dist: "0", source: "Stormglass" }
                };
                globalCache.tides = fallbackTides;
                globalCache.lastTideFetch = now;
                result.tides = fallbackTides;
            } else {
                // Sort CHS Data chronologically
                chsData.sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

                let blendFactor = 0;
                if (minDistance > 7 && minDistance < 15) {
                    blendFactor = (minDistance - 7) / (15 - 7);
                } else if (minDistance >= 15) {
                    blendFactor = 1;
                }

                const blendedTides = chsData.slice(0, 8).map((chsEvent: any, index: number) => {
                    // FIX 2: Match events by TIME, not by array index (prevents blending a high with a low)
                    const chsTime = new Date(chsEvent.eventDate).getTime();
                    const closestSg = sgData.data.reduce((prev: any, curr: any) =>
                        Math.abs(new Date(curr.time).getTime() - chsTime) < Math.abs(new Date(prev.time).getTime() - chsTime) ? curr : prev
                    );

                    // CHS wlp-hilo doesn't explicitly label high/low, so we calculate it
                    let finalType = 'low';
                    if (index === 0 && chsData.length > 1) {
                        finalType = chsEvent.value > chsData[1].value ? 'high' : 'low';
                    } else if (index > 0) {
                        finalType = chsEvent.value > chsData[index - 1].value ? 'high' : 'low';
                    }

                    // FIX 3: BLEND TIMES, BUT KEEP CHS HEIGHT
                    // Chart Datum (CHS) is critical. Blending MSL (Stormglass) heights creates dangerous numbers.
                    const finalTime = blendFactor > 0.5 ? closestSg.time : chsEvent.eventDate;

                    // Only use SG height if you are way offshore and fully relying on Stormglass
                    const finalHeight = blendFactor === 1 ? closestSg.height : chsEvent.value;

                    return {
                        time: finalTime,
                        height: parseFloat(finalHeight.toFixed(2)),
                        type: finalType
                    };
                });

                const tideFinal = {
                    data: blendedTides,
                    meta: {
                        station: nearestStation.officialName,
                        dist: minDistance.toFixed(1),
                        source: blendFactor === 0 ? "CHS" : blendFactor === 1 ? "Stormglass" : "Hybrid"
                    }
                };

                globalCache.tides = tideFinal;
                globalCache.lastTideFetch = now;
                result.tides = tideFinal;
            }
        }

        // 3. ALWAYS UPDATE POSITION IN CACHE
        globalCache.lat = lat;
        globalCache.lng = lng;
        return result;

    } catch (e) {
        console.error("Weather Service Error", e);
        return result;
    }
};

// Existing Helpers
export const getNextTide = (tides: any[]) => {
    if (!tides || tides.length === 0) return null;
    const now = new Date();
    const next = tides.find((t: any) => new Date(t.time) > now);
    return next || null;
};

export const getTimeUntil = (targetDateStr: string) => {
    const total = Date.parse(targetDateStr) - Date.now();
    if (total <= 0) return "00:00:00";
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const seconds = Math.floor((total / 1000) % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};