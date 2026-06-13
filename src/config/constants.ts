// src/config/constants.ts

// ⚠️ REPLACE WITH YOUR REAL KEYS
export const REVENUECAT_KEYS = {
    apple: 'appl_AowyslcahlREELrBvDwiZCNGoet',
    google: 'goog_SfShqGNnKyMOcmJZpTrKEUXoYeR'
} as const;

export const ENTITLEMENT_ID = 'Lobster Log Pro';

export const DEFAULT_LOCATION = {
    lat: '43.4426',
    lng: '-65.6290'
};

export const WEATHER_OPTIONS = [
  'Sunny',
  'Cloudy',
  'Rain',
  'Fog',
  'Windy',
  'Too Windy',
  'Rough',
  'Snow',
  'No Fishing'
];

// --- View routing ---
export type AppView = 'log' | 'history' | 'settings' | 'pro' | 'map' | 'dfo-demo' | 'dfo-list' | 'dfo-setup' | 'dfo-trip';