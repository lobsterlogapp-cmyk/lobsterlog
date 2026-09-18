import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Plus, Minus, LocateFixed, Download } from 'lucide-react-native';

import {
    getStatus,
    canDownloadArea,
    downloadArea,
    stopDownload,
    onDownload,
    type Bounds,
    type ChartState,
    type DownloadEvent,
    type ChartSettings,
} from '../../modules/navionics-bridge';

// ─── S171 — THE OFFLINE CHART DOWNLOAD SCREEN ───────────────────────────────────
//
// Pick an area on the map and pull Garmin's charts onto the phone for use with no signal.
//
// HOW THE PICKER WORKS: the box does NOT move. It is a fixed frame on the screen, and you
// pan and zoom the map underneath it. That is easier to aim on a moving boat than dragging
// a box around, and it means the download area is always the same size on screen.
// Everything outside the box is darkened but still visible, so you can see what is nearby —
// and the box itself is lifted slightly, because darkening alone is invisible over open
// water. See the measured note further down.
//
// ⚠⚠ ON THE SIZE FIGURE — READ BEFORE CHANGING THE PILL.
// Garmin's SDK has NO way to ask "how big would this area be" before downloading. Checked
// the whole library: `canDownloadBoundingBox` answers yes/no only, and the byte count
// arrives on the download listener during its CALCULATING_DOWNLOAD_SIZE phase — that is,
// AFTER a download has been started. So:
//   • before you tap Download, the pill shows the area's real width on the ground, in
//     whichever distance unit Chart Settings is set to — true, and updates as you move;
//   • the megabyte figure appears once Garmin reports it, during the download.
// Inventing a megabytes-per-square-kilometre constant would put a made-up number in front
// of a harvester deciding whether to spend his data. We do not do that.
//
// ⚠ OFFLINE: this screen needs signal, because it is the screen that downloads. What it
// downloads is stored on the phone and is what works offline afterwards.

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// The same store Chart Settings writes to. The width of the area is shown in whatever
// distance unit he picked there — nautical miles by default — not always kilometres.
const SETTINGS_KEY = '@lobsterlog:chart_settings';

// The picker box: a square, generous but leaving the surroundings visible.
const BOX_SIZE = Math.min(SCREEN_W * 0.74, SCREEN_H * 0.42);

type Props = {
    visible: boolean;
    onClose: () => void;
    startLat?: number;
    startLng?: number;
};

const ChartDownloadScreen = ({ visible, onClose, startLat, startLng }: Props) => {
    const { t } = useTranslation('map');
    const insets = useSafeAreaInsets();

    const mapRef = useRef<Mapbox.MapView>(null);
    const cameraRef = useRef<Mapbox.Camera>(null);

    const [state, setState] = useState<ChartState | null>(null);
    const [bounds, setBounds] = useState<Bounds | null>(null);
    const [zoom, setZoom] = useState(9);
    const [myLocation, setMyLocation] = useState<number[] | null>(null);
    const [distanceUnit, setDistanceUnit] = useState<ChartSettings['distanceUnit']>('nauticalMiles');

    // Download progress, only while one is running.
    const [downloading, setDownloading] = useState(false);
    const [totalBytes, setTotalBytes] = useState<number | null>(null);
    const [doneBytes, setDoneBytes] = useState(0);

    const centre: [number, number] = [
        Number.isFinite(startLng) ? (startLng as number) : -65.62,
        Number.isFinite(startLat) ? (startLat as number) : 43.44,
    ];

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        (async () => {
            const status = await getStatus();
            if (!cancelled) setState(status.state);
            // Follow the unit picked in Chart Settings rather than always showing km.
            try {
                const saved = await AsyncStorage.getItem(SETTINGS_KEY);
                if (!cancelled && saved) {
                    const parsed = JSON.parse(saved) as ChartSettings;
                    if (parsed?.distanceUnit) setDistanceUnit(parsed.distanceUnit);
                }
            } catch {
                // A broken saved value just means the default, nautical miles.
            }
        })();
        return () => { cancelled = true; };
    }, [visible]);

    // Garmin reports size, progress and errors on a listener, not as return values.
    useEffect(() => {
        if (!visible) return;
        const unsubscribe = onDownload((event: DownloadEvent) => {
            if (event.kind === 'sizeKnown') {
                setTotalBytes(event.totalBytes);
            } else if (event.kind === 'progress') {
                setDoneBytes(event.progressBytes);
                setTotalBytes(event.totalBytes);
            } else if (event.kind === 'status') {
                if (event.status === 'ended' || event.status === 'aborted') {
                    setDownloading(false);
                    if (event.status === 'ended') {
                        Alert.alert(t('map.downloadDoneTitle'), t('map.downloadDoneBody'));
                    }
                }
            } else if (event.kind === 'error') {
                setDownloading(false);
                Alert.alert(t('map.downloadFailedTitle'), event.detail);
            }
        });
        return unsubscribe;
    }, [visible, t]);

    // Turn the box's screen corners into real coordinates. Uses the map's own
    // screen-to-geo conversion rather than interpolating the visible bounds, because
    // latitude is not linear across the screen on a Mercator map.
    const readBox = useCallback(async () => {
        const map = mapRef.current;
        if (!map) return;
        const left = (SCREEN_W - BOX_SIZE) / 2;
        const top = (SCREEN_H - BOX_SIZE) / 2;
        try {
            const [topLeft, bottomRight] = await Promise.all([
                map.getCoordinateFromView([left, top]),
                map.getCoordinateFromView([left + BOX_SIZE, top + BOX_SIZE]),
            ]);
            if (!topLeft || !bottomRight) return;
            const [westLng, northLat] = topLeft;
            const [eastLng, southLat] = bottomRight;
            setBounds({
                south: Math.min(northLat, southLat),
                north: Math.max(northLat, southLat),
                west: Math.min(westLng, eastLng),
                east: Math.max(westLng, eastLng),
            });
        } catch {
            // A conversion can fail while the map is still settling. Leave the last good
            // box in place rather than blanking the pill.
        }
    }, []);

    // ── the pill text ───────────────────────────────────────────────────────────
    const pillText = (): string => {
        if (downloading) {
            if (totalBytes) return t('map.downloadingOf', { done: formatBytes(doneBytes), total: formatBytes(totalBytes) });
            return t('map.workingOutSize');
        }
        // ⚠ No credentials — say so, and do not imply a size we cannot know.
        if (state !== 'ready') return t('map.sizeOnceSetUp');
        if (!bounds) return t('map.workingOutSize');
        const { value, unit } = boxWidthInUnit(bounds, distanceUnit);
        return t('map.areaAcross', { across: formatDistance(value), unit: t(unit) });
    };

    const handleDownload = async () => {
        if (!bounds) return;

        const allowed = await canDownloadArea(bounds);
        if (!allowed.ok) {
            Alert.alert(t('map.cannotDownloadTitle'), allowed.detail ?? t('map.cannotDownloadBody'));
            return;
        }

        setDownloading(true);
        setDoneBytes(0);
        setTotalBytes(null);

        const started = await downloadArea(bounds);
        if (!started.ok) {
            setDownloading(false);
            Alert.alert(t('map.downloadFailedTitle'), started.detail ?? t('map.cannotDownloadBody'));
        }
    };

    const handleCancel = async () => {
        await stopDownload();
        setDownloading(false);
    };

    const zoomBy = (delta: number) => {
        const next = Math.max(3, Math.min(16, zoom + delta));
        cameraRef.current?.setCamera({ zoomLevel: next, animationDuration: 300 });
    };

    const goToMyLocation = async () => {
        try {
            const { status: permission } = await Location.requestForegroundPermissionsAsync();
            if (permission !== 'granted') {
                Alert.alert(t('map.waitingForGps'));
                return;
            }
            const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const here: [number, number] = [position.coords.longitude, position.coords.latitude];
            setMyLocation(here);
            cameraRef.current?.setCamera({ centerCoordinate: here, zoomLevel: 11, animationDuration: 600 });
        } catch {
            Alert.alert(t('map.waitingForGps'));
        }
    };

    const ready = state === 'ready';
    const boxLeft = (SCREEN_W - BOX_SIZE) / 2;
    const boxTop = (SCREEN_H - BOX_SIZE) / 2;

    // The darkened surround is four panes around the clear box. pointerEvents 'none' on
    // every one of them, so panning and pinching still reach the map underneath.
    const shade = 'rgba(15, 23, 42, 0.55)';

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
                <Mapbox.MapView
                    ref={mapRef}
                    style={{ flex: 1 }}
                    styleURL={Mapbox.StyleURL.Satellite}
                    logoEnabled={true}
                    attributionEnabled={true}
                    // The map is full-bleed, so Mapbox's scale bar landed on top of the
                    // system clock. Push it below the status bar and clear of the pill.
                    scaleBarPosition={{ top: insets.top + 64, left: 16 }}
                    attributionPosition={Platform.OS === 'ios'
                        ? { bottom: 21, right: 16 }
                        : { bottom: insets.bottom + 16, right: 16 }}
                    logoPosition={Platform.OS === 'ios'
                        ? { bottom: 76, left: 8 }
                        : { bottom: 112, left: 8 }}
                    onCameraChanged={(e) => {
                        if (e.properties?.zoom) setZoom(e.properties.zoom);
                        readBox();
                    }}
                    onDidFinishLoadingMap={readBox}
                >
                    <Mapbox.Camera
                        ref={cameraRef}
                        defaultSettings={{ zoomLevel: 9, centerCoordinate: centre }}
                    />
                    {myLocation && <Mapbox.UserLocation />}
                </Mapbox.MapView>

                {/* ── THE PICKER BOX ─────────────────────────────────────────────
                    Four dark panes around a clear square. None of them take touches,
                    so the map still pans and zooms underneath. */}
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: boxTop, backgroundColor: shade }} />
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: boxTop + BOX_SIZE, bottom: 0, backgroundColor: shade }} />
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, width: boxLeft, top: boxTop, height: BOX_SIZE, backgroundColor: shade }} />
                <View pointerEvents="none" style={{ position: 'absolute', left: boxLeft + BOX_SIZE, right: 0, top: boxTop, height: BOX_SIZE, backgroundColor: shade }} />

                {/* ⚠ MEASURED, NOT ASSUMED: darkening the surround works over land (the
                    inside came out 1.62x brighter) but does NOTHING over open water —
                    inside and outside both measured 1.00x, because 55% shade over
                    near-black ocean is still near-black. A harvester picking open water
                    could not tell what was selected.
                    So the box is made legible by its OWN markings: a faint warm lift
                    inside it, a heavier frame, and long corner ticks. The selection now
                    reads on black water, which is the terrain that actually matters here. */}
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        left: boxLeft,
                        top: boxTop,
                        width: BOX_SIZE,
                        height: BOX_SIZE,
                        borderWidth: 2.5,
                        borderColor: '#FBBF24',
                        borderRadius: 4,
                        backgroundColor: 'rgba(251, 191, 36, 0.10)',
                    }}
                >
                    {/* Corner ticks — they read as a picker frame rather than a plain box. */}
                    {[
                        { top: -3, left: -3, borderTopWidth: 6, borderLeftWidth: 6 },
                        { top: -3, right: -3, borderTopWidth: 6, borderRightWidth: 6 },
                        { bottom: -3, left: -3, borderBottomWidth: 6, borderLeftWidth: 6 },
                        { bottom: -3, right: -3, borderBottomWidth: 6, borderRightWidth: 6 },
                    ].map((corner, i) => (
                        <View key={i} style={{ position: 'absolute', width: 30, height: 30, borderColor: '#FBBF24', ...corner }} />
                    ))}
                </View>

                {/* ── BACK ARROW ─────────────────────────────────────────────── */}
                <TouchableOpacity
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel={t('map.back')}
                    style={{
                        position: 'absolute',
                        top: insets.top + 12,
                        left: 20,
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        padding: 10,
                        borderRadius: 24,
                    }}
                >
                    <ArrowLeft size={22} color="#FBBF24" />
                </TouchableOpacity>

                {/* ── SIZE PILL ──────────────────────────────────────────────── */}
                <View
                    pointerEvents="none"
                    accessibilityRole="text"
                    accessibilityLabel={pillText()}
                    style={{
                        position: 'absolute',
                        top: insets.top + 14,
                        alignSelf: 'center',
                        maxWidth: SCREEN_W - 140,
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        paddingVertical: 9,
                        paddingHorizontal: 16,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: ready ? '#FBBF24' : '#334155',
                    }}
                >
                    <Text numberOfLines={2} style={{ color: ready ? '#FBBF24' : '#94A3B8', fontWeight: 'bold', fontSize: 13, textAlign: 'center' }}>
                        {pillText()}
                    </Text>
                </View>

                {/* ── ZOOM + MY LOCATION ─────────────────────────────────────── */}
                <View style={{
                    position: 'absolute',
                    top: insets.top + 80,
                    right: 20,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: 20,
                    padding: 8,
                    gap: 12,
                    alignItems: 'center',
                }}>
                    <TouchableOpacity onPress={() => zoomBy(1)} accessibilityRole="button" accessibilityLabel={t('map.zoomIn')} style={{ padding: 8, backgroundColor: '#334155', borderRadius: 12 }}>
                        <Plus size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => zoomBy(-1)} accessibilityRole="button" accessibilityLabel={t('map.zoomOut')} style={{ padding: 8, backgroundColor: '#334155', borderRadius: 12 }}>
                        <Minus size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={goToMyLocation} accessibilityRole="button" accessibilityLabel={t('map.myLocation')} style={{ padding: 8, backgroundColor: '#2563EB', borderRadius: 12 }}>
                        <LocateFixed size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* ── DOWNLOAD BUTTON ────────────────────────────────────────────
                    Same position and shape as DROP PIN & LOG on the Pro map. */}
                <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center', alignItems: 'center' }}>
                    {!ready && (
                        <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 10, textAlign: 'center', maxWidth: SCREEN_W - 80 }}>
                            {t('map.sizeOnceSetUp')}
                        </Text>
                    )}
                    <TouchableOpacity
                        onPress={downloading ? handleCancel : handleDownload}
                        disabled={!ready && !downloading}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !ready && !downloading }}
                        accessibilityLabel={downloading ? t('map.cancelDownload') : t('map.downloadCharts')}
                        style={{
                            backgroundColor: downloading ? '#B91C1C' : ready ? '#2563EB' : '#1E293B',
                            paddingVertical: 16,
                            paddingHorizontal: 32,
                            borderRadius: 40,
                            flexDirection: 'row',
                            gap: 12,
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOpacity: 0.3,
                            shadowRadius: 10,
                        }}
                    >
                        {downloading
                            ? <ActivityIndicator color="white" />
                            : <Download size={22} color={ready ? 'white' : '#64748B'} />}
                        <Text style={{ color: ready || downloading ? 'white' : '#64748B', fontWeight: 'bold', fontSize: 18 }}>
                            {downloading ? t('map.cancelDownload') : t('map.downloadCharts')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ── plain helpers ───────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
}

function formatDistance(value: number): string {
    return value >= 100 ? `${Math.round(value)}` : `${value.toFixed(1)}`;
}

// Convert the box's width into whichever unit Chart Settings is set to.
function boxWidthInUnit(b: Bounds, unit: ChartSettings['distanceUnit']) {
    const km = boxWidthKm(b);
    if (unit === 'kilometers') return { value: km, unit: 'map.abbrevKm' };
    if (unit === 'statuteMiles') return { value: km / 1.609344, unit: 'map.abbrevMiles' };
    return { value: km / 1.852, unit: 'map.abbrevNauticalMiles' };
}

// How wide the box is on the ground, across the middle of it. One degree of longitude
// shrinks towards the poles, so it is measured at the box's own latitude.
function boxWidthKm(b: Bounds): number {
    const midLat = (b.north + b.south) / 2;
    const kmPerDegLng = 111.32 * Math.cos((midLat * Math.PI) / 180);
    return Math.abs(b.east - b.west) * kmPerDegLng;
}

export default ChartDownloadScreen;
