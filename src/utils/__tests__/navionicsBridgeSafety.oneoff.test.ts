// ─── S171 — THE NAVIONICS BRIDGE MUST NEVER CRASH THE APP ───────────────────────
//
// WHAT THIS GUARDS: the bridge's one hard rule — when the chart library is not there, every
// function returns a clean answer and nothing throws. That is not a nicety. Charts are
// absent on iOS today, absent in any build without Garmin's .aar files, and absent for
// every user until Garmin issues tokens. If the bridge threw in that state, a lobster
// fisherman would get a crashed app on the water instead of a map with no chart on it.
//
// WOULD THIS FAIL IF THE CODE WERE WRONG? Yes, and these are the specific wrong versions
// it catches:
//   - swapping requireOptionalNativeModule for requireNativeModule (throws at import);
//   - dropping any one of the `if (!NavionicsBridge)` guards (throws on call);
//   - "simplifying" a guard to rethrow, or to return undefined instead of a result object.
// Each of those is a real edit someone could make while tidying, and each one would put a
// crash back on the boat.

// The module is loaded with its native side ABSENT. That is the whole point — this suite
// tests the no-chart-library path, which is the path every user is on today.
jest.mock('expo-modules-core', () => ({
    requireOptionalNativeModule: () => null,
}));

import * as bridge from '../../../modules/navionics-bridge';

describe('S171 Navionics bridge — behaviour with no native chart library', () => {
    it('reports that the bridge is not available rather than pretending', () => {
        expect(bridge.isBridgeAvailable()).toBe(false);
    });

    it('getStatus resolves with "unavailable" instead of throwing', async () => {
        const status = await bridge.getStatus();
        expect(status.state).toBe('unavailable');
        expect(typeof status.detail).toBe('string');
    });

    it('initialize resolves cleanly instead of throwing', async () => {
        const result = await bridge.initialize({});
        expect(result.ok).toBe(false);
        expect(result.state).toBe('unavailable');
    });

    // The one that matters most: EVERY call that can be made from a screen, proven to
    // resolve rather than reject. A single unguarded call is a crash on the water.
    it('every chart action resolves with ok:false and never rejects', async () => {
        const bounds = { south: 43.0, west: -66.0, north: 44.0, east: -65.0 };

        const results = await Promise.all([
            bridge.showChart({}),
            bridge.hideChart(),
            bridge.applySettings({ easyView: true }),
            bridge.setMinimumZoom(8),
            bridge.canDownloadArea(bounds),
            bridge.downloadArea(bounds),
            bridge.stopDownload(),
            bridge.checkForUpdates(),
            bridge.applyUpdates(true),
            bridge.getChartDataSize(),
            bridge.deleteAllCharts(),
            bridge.shutdown(),
        ]);

        for (const result of results) {
            expect(result.ok).toBe(false);
            expect(typeof result.detail).toBe('string');
        }
    });

    it('getChartDataSize reports zero bytes rather than undefined', async () => {
        // A screen showing "Charts: undefined" is a bug a user would see.
        const result = await bridge.getChartDataSize();
        expect(result.bytes).toBe(0);
    });

    it('settings readers return empty objects, not undefined', async () => {
        // Callers do Object.entries() on these to build a settings list; undefined throws.
        await expect(bridge.getSettings()).resolves.toEqual({});
        await expect(bridge.getSettingLimits()).resolves.toEqual({});
    });

    it('setMapTag is safe to call with no native side, and with null', () => {
        expect(() => bridge.setMapTag(42)).not.toThrow();
        expect(() => bridge.setMapTag(null)).not.toThrow();
    });

    it('onDownload returns a working unsubscribe even with no native side', () => {
        // A screen calls this in useEffect and returns the result as the cleanup function.
        // If it returned undefined, React would throw on unmount.
        const unsubscribe = bridge.onDownload(() => { });
        expect(typeof unsubscribe).toBe('function');
        expect(() => unsubscribe()).not.toThrow();
    });
});

describe('S171 Navionics bridge — the SonarChart licence guard', () => {
    // ⛔ The signed licence is for Bathymetry Content and EXCLUDES the SonarChart product.
    // The library offers a SonarCharts map mode; the bridge must never expose it.
    //
    // This reads the bridge's own source, because the guard is the ABSENCE of a key — and
    // absence is not something a normal call can demonstrate.
    const fs = require('fs');
    const path = require('path');

    const androidSource = fs.readFileSync(
        path.join(__dirname, '../../../modules/navionics-bridge/android/src/main/java/expo/modules/navionicsbridge/NavionicsBridgeModule.kt'),
        'utf8'
    );
    const jsSource = fs.readFileSync(
        path.join(__dirname, '../../../modules/navionics-bridge/index.ts'),
        'utf8'
    );

    it('the native side pins the map mode to Default', () => {
        expect(androidSource).toContain('setMapMode(NMSEnum.NMSMapMode.NMSMapModeDefault)');
    });

    it('the native side never CALLS the SonarCharts mode', () => {
        // Comments must be stripped first. The file explains in prose why SonarCharts is
        // off limits, and that explanation is worth keeping — the ban is on calling it,
        // not on naming it. Checking the raw text would fail on our own warning, which is
        // exactly the wrong thing to make someone delete.
        const code = androidSource
            .split('\n')
            .map((line: string) => line.replace(/\/\/.*$/, ''))
            .join('\n');
        expect(code).not.toContain('NMSMapModeSonarCharts');
    });

    it('the JavaScript settings type offers no way to ask for a map mode', () => {
        // If someone adds `mapMode?:` to ChartSettings, a caller could request SonarCharts
        // and this test goes red on the spot.
        expect(jsSource).not.toMatch(/^\s*mapMode\?:/m);
    });
});
