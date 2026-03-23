// src/utils/helpers.ts

// ⚠️ YOUR API KEYS
export const STORMGLASS_API_KEY = process.env.EXPO_PUBLIC_STORMGLASS_API_KEY;

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

// 5. PRO FEATURE: 24-Hour Weather Averages & Max Swell
export async function getAverageWeather(lat: string | number, lng: string | number, dateId: string | null = null) {
    try {
        const targetDate = dateId ? new Date(`${dateId}T12:00:00`) : new Date();

        const start = new Date(targetDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);

        const params = 'windSpeed,waveHeight,windDirection,gust';
        const url = `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=${params}&start=${start.toISOString()}&end=${end.toISOString()}`;

        const response = await fetch(url, {
            headers: { 'Authorization': STORMGLASS_API_KEY }
        });
        const json = await response.json();

        if (json.errors) return null; // Fail cleanly on API error

        let totalWind = 0, totalGust = 0, maxSwell = 0;
        let sinSum = 0, cosSum = 0, count = 0;

        if (json.hours) {
            json.hours.forEach((hour: any) => {
                const wind = hour.windSpeed?.noaa || hour.windSpeed?.sg || 0;
                const swell = hour.waveHeight?.noaa || hour.waveHeight?.sg || 0;
                const dir = hour.windDirection?.noaa || hour.windDirection?.sg || 0;
                const gust = hour.gust?.noaa || hour.gust?.sg || 0;

                totalWind += wind;
                totalGust += gust;

                if (swell > maxSwell) {
                    maxSwell = swell;
                }

                const rad = dir * (Math.PI / 180);
                sinSum += Math.sin(rad);
                cosSum += Math.cos(rad);
                count++;
            });
        }

        if (count === 0) return null; // Fail cleanly if no data

        const avgRad = Math.atan2(sinSum, cosSum);
        let avgDeg = avgRad * (180 / Math.PI);
        if (avgDeg < 0) avgDeg += 360;

        return {
            avgWindKnots: (totalWind / count) * 1.94384,
            avgGustKnots: (totalGust / count) * 1.94384,
            avgSwellMeters: maxSwell,
            avgDirection: avgDeg
        };

    } catch (error) {
        console.log("Weather fetch failed:", error);
        return null; // THE CRITICAL FIX: Return null instead of fake zeros!
    }
}