import { requireOptionalNativeModule } from 'expo-modules-core';

// ─── S171 — THE NAVIONICS CHART BRIDGE (JavaScript side) ────────────────────────
//
// requireOptionalNativeModule, NOT requireNativeModule: the optional form returns null
// when the native side is missing instead of throwing at import time. A module that is not
// there must look like "charts unavailable", never like a crashed app — the same rule the
// whole bridge follows for missing tokens.
//
// EVERY function here resolves. None of them reject. Callers check `ok`.

const NavionicsBridge = requireOptionalNativeModule('NavionicsBridge');

// ── STATUS ──────────────────────────────────────────────────────────────────────

/**
 * - `ready`          — the chart library is running and charts can be shown.
 * - `not-configured` — no credentials, or Garmin refused them. The normal state today.
 * - `not-started`    — nothing has tried to start it yet.
 * - `unavailable`    — the native module is not present at all (iOS, or a broken build).
 */
export type ChartState = 'ready' | 'not-configured' | 'not-started' | 'unavailable';

export type StatusResult = {
    state: ChartState;
    sdkVersion?: string | null;
    extensionVersion?: string | null;
    detail?: string;
};

/** A plain result. `ok` is the only field every call is guaranteed to carry. */
export type BridgeResult = {
    ok: boolean;
    /** Which route found the map: 'tag' (exact), 'tree' (the working one), 'none'. */
    route?: 'tag' | 'tree' | 'none';
    /** Plain-words explanation when ok is false. */
    detail?: string;
    [key: string]: unknown;
};

// ── CREDENTIALS ─────────────────────────────────────────────────────────────────

/**
 * The four things Garmin requires. Passed IN — this module never reads them from the
 * environment and never holds them, because where they come from is still an open
 * decision and nothing here should quietly settle it.
 */
export type NavionicsCredentials = {
    projectToken: string;
    configurationToken: string;
    privateKey: string;
    /** Garmin's sandbox vs production is a flag on the same library. Defaults to sandbox. */
    sandbox?: boolean;
    /** 'en' | 'fr' — pass the app's current language so the chart matches it. */
    language?: string;
};

// ── HOW THE CHART LOOKS ─────────────────────────────────────────────────────────

/**
 * Every display setting Garmin's library offers, with one deliberate exception.
 *
 * ⛔ THERE IS NO `mapMode` KEY, AND THAT IS ON PURPOSE. The library offers a SonarCharts
 * mode, but the signed licence is for Bathymetry Content and explicitly excludes the
 * SonarChart product. The native side pins the mode to Default. Do not add a key for it.
 *
 * The numeric settings are clamped natively to the limits the SDK reports, so an
 * out-of-range value is corrected rather than refused. Ask getSettingLimits() to build
 * correct sliders instead of hardcoding numbers.
 */
export type ChartSettings = {
    depthUnit?: 'meters' | 'feet' | 'fathoms';
    distanceUnit?: 'nauticalMiles' | 'kilometers' | 'statuteMiles';
    speedUnit?: 'knots' | 'mph' | 'kph';
    /** How many depth lines are drawn. Higher is more detail and a busier chart. */
    contourDensity?: 'low' | 'medium' | 'high' | 'veryHigh';
    /** Navionics' readability mode — bigger text and symbols. Good for a wet phone. */
    easyView?: boolean;
    /** Show seabed composition — mud, sand, rock. Directly useful on lobster ground. */
    seabedArea?: boolean;
    /** Recolours the chart around a chosen depth band. */
    fishingMode?: boolean;
    /** Draw every contour rather than only the highlighted band. */
    allDepthContours?: boolean;
    depthContours?: number;
    depthAreas?: number;
    /** Anything shallower than this is marked as shallow — the danger shading. */
    shallowDepthLimit?: number;
    fishingAreaRangeLower?: number;
    fishingAreaRangeUpper?: number;
    /** Water-level offset for lakes and reservoirs. Almost certainly irrelevant to us. */
    poolWaterLevel?: number;
};

export type SettingLimits = Record<string, { min: number; max: number }>;

/** A download area, as plain degrees. */
export type Bounds = {
    south: number;
    west: number;
    north: number;
    east: number;
};

// ── DOWNLOAD EVENTS ─────────────────────────────────────────────────────────────

export type DownloadEvent =
    /** ⭐ The size, reported BEFORE any bytes move — this is the "costs N MB, go ahead?" moment. */
    | { kind: 'sizeKnown'; totalBytes: number }
    | { kind: 'status'; status: 'calculating' | 'started' | 'ended' | 'aborted' | 'unknown' }
    | { kind: 'progress'; progressBytes: number; totalBytes: number }
    | { kind: 'error'; detail: string };

// ── THE API ─────────────────────────────────────────────────────────────────────

/** False means the native module is missing — the hop is broken, not that charts are off. */
export function isBridgeAvailable(): boolean {
    return NavionicsBridge !== null;
}

const unavailable = (what: string): BridgeResult => ({
    ok: false,
    detail: `Charts are not available on this device (${what}).`,
});

/**
 * Optional: tell the bridge the map's native tag, from findNodeHandle(mapRef.current).
 *
 * The bridge finds the map by walking the screen's views, which works and is what carries
 * everything. This lets it ALSO try the exact route — resolving the tag through React.
 * That route does not work under the new architecture today (proven at S171, and proven
 * not to be a timing problem), so nothing depends on this. It costs one call and means the
 * precise route starts working by itself if React ever fixes it.
 */
export function setMapTag(tag: number | null): void {
    NavionicsBridge?.setMapTag(tag);
}

/** Is the chart library ready? Never throws. Ask this before showing anything chart-related. */
export async function getStatus(): Promise<StatusResult> {
    if (!NavionicsBridge) {
        return { state: 'unavailable', detail: 'The chart module is not present in this build.' };
    }
    return NavionicsBridge.getStatus();
}

/**
 * Start the chart library.
 *
 * With no credentials this reports `not-configured` and does NOT touch the SDK. That is a
 * normal state today, not a failure to handle loudly — Garmin has not issued tokens yet.
 */
export async function initialize(credentials: Partial<NavionicsCredentials>): Promise<BridgeResult & { state: ChartState }> {
    if (!NavionicsBridge) {
        return { ...unavailable('module missing'), state: 'unavailable' };
    }
    return NavionicsBridge.initialize(credentials ?? {});
}

/**
 * Put the chart on the map that is currently on screen.
 *
 * ⚠ `ok: false` here cannot tell you WHY. Garmin's method returns a bare boolean, and it
 * returns false for missing credentials, for empty map content, AND for a layer already
 * present. Do not read a specific cause into it.
 */
export async function showChart(options?: {
    /** The content string Garmin supplies. Without it no chart will draw. */
    mapContent?: string;
    /** Whether our satellite view shows through the chart. Defaults to true. */
    transparent?: boolean;
    lowResolution?: boolean;
    smallTiles?: boolean;
    cacheControl?: number;
    settings?: ChartSettings;
}): Promise<BridgeResult> {
    if (!NavionicsBridge) return unavailable('module missing');
    return NavionicsBridge.showChart(options ?? {});
}

/** Take the chart off the map. Safe to call when it was never on. */
export async function hideChart(): Promise<BridgeResult> {
    if (!NavionicsBridge) return unavailable('module missing');
    return NavionicsBridge.hideChart();
}

/** Change how the chart looks. Only the keys you pass are changed. */
export async function applySettings(settings: ChartSettings): Promise<BridgeResult> {
    if (!NavionicsBridge) return unavailable('module missing');
    return NavionicsBridge.applySettings(settings ?? {});
}

/** What the chart is currently set to. */
export async function getSettings(): Promise<ChartSettings & { ok?: boolean }> {
    if (!NavionicsBridge) return {};
    return NavionicsBridge.getSettings();
}

/** ⭐ The SDK's own min/max for each numeric setting. Build sliders from this, not guesses. */
export async function getSettingLimits(): Promise<SettingLimits> {
    if (!NavionicsBridge) return {};
    return NavionicsBridge.getSettingLimits();
}

/**
 * Hide the chart below a zoom level.
 * ⚠ Garmin caps this between 5 and 11; a value outside that is clamped, not refused.
 * The result reports both what was asked for and what was applied.
 */
export async function setMinimumZoom(zoom: number, fadeIn = true): Promise<BridgeResult> {
    if (!NavionicsBridge) return unavailable('module missing');
    return NavionicsBridge.setMinimumZoom(zoom, fadeIn);
}

/** Can this area be downloaded at all? Ask before offering it — Garmin refuses areas outside our region. */
export async function canDownloadArea(bounds: Bounds): Promise<BridgeResult> {
    if (!NavionicsBridge) return unavailable('module missing');
    return NavionicsBridge.canDownloadArea(bounds);
}

/**
 * Download the charts for an area.
 * The size and the progress arrive on the download listener, not as a return value —
 * subscribe with onDownload() BEFORE calling this.
 */
export async function downloadArea(bounds: Bounds): Promise<BridgeResult> {
    if (!NavionicsBridge) return unavailable('module missing');
    return NavionicsBridge.downloadArea(bounds);
}

export async function stopDownload(): Promise<BridgeResult> {
    if (!NavionicsBridge) return unavailable('module missing');
    return NavionicsBridge.stopDownload();
}

/** Ask whether downloaded charts have updates. The answer arrives as a 'sizeKnown' event. */
export async function checkForUpdates(): Promise<BridgeResult> {
    if (!NavionicsBridge) return unavailable('module missing');
    return NavionicsBridge.checkForUpdates();
}

/** Go ahead with (or decline) the update offered by checkForUpdates(). */
export async function applyUpdates(confirm: boolean): Promise<BridgeResult> {
    if (!NavionicsBridge) return unavailable('module missing');
    return NavionicsBridge.applyUpdates(confirm);
}

/** How much chart data is on the phone, in bytes. */
export async function getChartDataSize(): Promise<BridgeResult & { bytes?: number }> {
    if (!NavionicsBridge) return { ...unavailable('module missing'), bytes: 0 };
    return NavionicsBridge.getChartDataSize();
}

/**
 * ⚠⚠ WIPES EVERY DOWNLOADED CHART.
 * Garmin provides no per-area delete — this is the only removal method that exists.
 * Never call it without asking the user first.
 */
export async function deleteAllCharts(): Promise<BridgeResult> {
    if (!NavionicsBridge) return unavailable('module missing');
    return NavionicsBridge.deleteAllCharts();
}

/** Stop the chart library. It must be initialised again before it can be used. */
export async function shutdown(): Promise<BridgeResult> {
    if (!NavionicsBridge) return unavailable('module missing');
    return NavionicsBridge.shutdown();
}

/**
 * Listen for download size, progress, completion and errors.
 * Returns an unsubscribe function; call it on unmount.
 */
export function onDownload(listener: (event: DownloadEvent) => void): () => void {
    if (!NavionicsBridge) return () => { };
    const subscription = NavionicsBridge.addListener('onChartDownload', listener);
    return () => subscription?.remove?.();
}
