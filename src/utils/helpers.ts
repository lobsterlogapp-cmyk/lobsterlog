// src/utils/helpers.ts

// ⚠️ YOUR API KEYS
export const STORMGLASS_API_KEY = '39f9eb1e-e694-11f0-a8f4-0242ac130003-39f9eb8c-e694-11f0-a8f4-0242ac130003';

// 1. Format Date for IDs (YYYY-MM-DD)
export function formatDateId(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function parseLocalDate(dateStr: string): Date {
    // This creates the date at midnight UTC, which is much
    // safer for comparisons than hardcoding Noon.
    return new Date(`${dateStr}T00:00:00`);
}

// 3. Compass Direction (Converts degrees to N, NE, etc.)
export function getWindDirection(degrees: number | null | undefined): string {
    if (degrees === undefined || degrees === null) return '';
    const sectors = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW', 'N'];
    const index = Math.round(degrees / 22.5);
    return sectors[index % 16] || '';
}

// 4. Season Config Helpers
export function getLastMondayOfNovember(year: number): string {
    const date = new Date(year, 10, 30);
    const day = date.getDay();
    const diff = (day - 1 + 7) % 7;
    date.setDate(date.getDate() - diff);
    return formatDateId(date);
}

export function getDefaultSeasonConfig(startYear: number) {
    return {
        start: getLastMondayOfNovember(startYear),
        end: `${startYear + 1}-05-31`
    };
}

// 5. PRO FEATURE: 12-Hour Weather Averages
export async function getAverageWeather(lat: string | number, lng: string | number) {
    // Define the safe fallback object at the top
    const DEFAULT_WEATHER = {
        avgWindKnots: 0,
        avgGustKnots: 0,
        avgSwellMeters: 0,
        avgDirection: 0
    };

    try {
        const end = new Date();
        const start = new Date(end.getTime() - (12 * 60 * 60 * 1000));

        const params = 'windSpeed,waveHeight,windDirection,gust';
        const url = `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=${params}&start=${start.toISOString()}&end=${end.toISOString()}`;

        const response = await fetch(url, {
            headers: { 'Authorization': STORMGLASS_API_KEY }
        });
        const json = await response.json();

        if (json.errors) throw new Error("Weather API Error");

        let totalWind = 0, totalSwell = 0, totalGust = 0;
        let sinSum = 0, cosSum = 0, count = 0;

        if (json.hours) {
            json.hours.forEach((hour: any) => {
                const wind = hour.windSpeed?.noaa || hour.windSpeed?.sg || 0;
                const swell = hour.waveHeight?.noaa || hour.waveHeight?.sg || 0;
                const dir = hour.windDirection?.noaa || hour.windDirection?.sg || 0;
                const gust = hour.gust?.noaa || hour.gust?.sg || 0;

                totalWind += wind;
                totalSwell += swell;
                totalGust += gust;

                const rad = dir * (Math.PI / 180);
                sinSum += Math.sin(rad);
                cosSum += Math.cos(rad);
                count++;
            });
        }

        // 1. Check count OUTSIDE the object definition
        if (count === 0) return DEFAULT_WEATHER;

        const avgRad = Math.atan2(sinSum, cosSum);
        let avgDeg = avgRad * (180 / Math.PI);
        if (avgDeg < 0) avgDeg += 360;

        return {
            avgWindKnots: (totalWind / count) * 1.94384,
            avgGustKnots: (totalGust / count) * 1.94384,
            avgSwellMeters: (totalSwell / count),
            avgDirection: avgDeg
        };

    } catch (error) {
        console.log("Weather fetch failed:", error);
        // 2. Return the DEFAULT instead of null to prevent the iOS crash
        return DEFAULT_WEATHER;
    }
}