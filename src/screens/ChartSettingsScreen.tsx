import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X, RotateCcw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    getStatus,
    getSettingLimits,
    applySettings,
    type ChartSettings,
    type SettingLimits,
    type ChartState,
} from '../../modules/navionics-bridge';

// ─── S171 PHASE 3 — THE CHART SETTINGS SCREEN ───────────────────────────────────
//
// What this is for: Jonathon shaping how the chart looks BEFORE Garmin's tokens arrive.
// Every setting here is real — read off Garmin's shipped library, not invented — so the
// choices made now are the ones that will apply the moment charts can draw.
//
// ⛔ FOURTEEN SETTINGS, NOT FIFTEEN. The library also offers a SonarCharts map mode, and it
// is absent here on purpose: the signed licence is for Bathymetry Content and excludes the
// SonarChart product. There is no key for it in ChartSettings and the native side pins the
// mode to Default. Do not add it.
//
// ⚠ NOTHING HERE HAS BEEN SEEN ON A CHART. No chart has ever drawn, on any build. The
// descriptions are a careful reading of what each setting does; the screen says so plainly
// at the top rather than implying more certainty than we have.
//
// Choices are saved on the phone, so they survive a restart and are ready to apply the day
// tokens land.

const STORAGE_KEY = '@lobsterlog:chart_settings';

// Garmin's library reports its own min/max for the numeric settings. These are only a
// fallback for the state we are in today — the library cannot be asked until it starts.
const FALLBACK_LIMITS: SettingLimits = {
    depthContours: { min: 0, max: 200 },
    depthAreas: { min: 0, max: 200 },
    shallowDepthLimit: { min: 0, max: 200 },
    fishingAreaRangeLower: { min: 0, max: 200 },
    fishingAreaRangeUpper: { min: 0, max: 200 },
    poolWaterLevel: { min: -50, max: 50 },
};

const DEFAULTS: ChartSettings = {
    depthUnit: 'fathoms',
    distanceUnit: 'nauticalMiles',
    speedUnit: 'knots',
    contourDensity: 'high',
    easyView: false,
    seabedArea: true,
    fishingMode: false,
    allDepthContours: false,
    depthContours: 10,
    depthAreas: 10,
    shallowDepthLimit: 5,
    fishingAreaRangeLower: 5,
    fishingAreaRangeUpper: 30,
    poolWaterLevel: 0,
};

// Pull every numeric setting back inside whatever range the library reports. Keys the
// library says nothing about are left exactly as they are.
const clampToLimits = (settings: ChartSettings, limits: SettingLimits): ChartSettings => {
    const next: ChartSettings = { ...settings };
    for (const [key, limit] of Object.entries(limits)) {
        const value = (next as Record<string, unknown>)[key];
        if (typeof value === 'number' && limit) {
            (next as Record<string, unknown>)[key] = Math.min(limit.max, Math.max(limit.min, value));
        }
    }
    return next;
};

type Props = {
    visible: boolean;
    onClose: () => void;
};

const ChartSettingsScreen = ({ visible, onClose }: Props) => {
    const { t } = useTranslation('map');
    const insets = useSafeAreaInsets();

    const [settings, setSettings] = useState<ChartSettings>(DEFAULTS);
    const [limits, setLimits] = useState<SettingLimits>(FALLBACK_LIMITS);
    const [state, setState] = useState<ChartState | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;

        (async () => {
            setLoading(true);

            // Saved choices first, so the screen opens on what he last picked.
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (!cancelled && stored) setSettings({ ...DEFAULTS, ...JSON.parse(stored) });
            } catch {
                // A broken saved value must not keep the screen shut. Fall back to defaults.
            }

            // Ask the chart library what it is and what its real limits are. Both calls
            // answer safely when the library is not running — that is the state today.
            const status = await getStatus();
            const reported = await getSettingLimits();
            if (cancelled) return;

            setState(status.state);

            // Only trust reported limits when the library actually answered with some.
            //
            // ⚠ These come back even before the library has started, and in that state some
            // of them look wrong — Garmin reported 60–60 for one setting on the first walk.
            // They should be re-read once initialisation succeeds. Until then they are
            // better than hardcoded guesses, but they are not gospel.
            if (reported && Object.keys(reported).length > 0) {
                setLimits(reported);
                // Bring any saved value back inside the reported range, so what is stored
                // matches what is shown rather than drifting out of sight.
                setSettings((previous) => clampToLimits(previous, reported));
            }
            setLoading(false);
        })();

        return () => { cancelled = true; };
    }, [visible]);

    const update = async (change: Partial<ChartSettings>) => {
        const next = { ...settings, ...change };
        setSettings(next);
        // Save first: the choice must survive even if the chart library is not listening.
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => { });
        // Then offer it to the chart. Today this returns "not available" and that is fine.
        applySettings(change).catch(() => { });
    };

    const resetAll = async () => {
        setSettings(DEFAULTS);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS)).catch(() => { });
        applySettings(DEFAULTS).catch(() => { });
    };

    // ── the small building blocks ───────────────────────────────────────────────
    // One row shape for every setting, so the screen reads as one list rather than
    // fourteen separate designs.

    const Row = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
            <Text style={{ color: 'white', fontSize: 15, fontWeight: '600' }}>{title}</Text>
            {hint ? (
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 3, lineHeight: 17 }}>{hint}</Text>
            ) : null}
            <View style={{ marginTop: 10 }}>{children}</View>
        </View>
    );

    const Choice = ({ options, value, onChange }: {
        options: { key: string; label: string }[];
        value: string | undefined;
        onChange: (key: string) => void;
    }) => (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {options.map((option) => {
                const selected = option.key === value;
                return (
                    <TouchableOpacity
                        key={option.key}
                        onPress={() => onChange(option.key)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={{
                            paddingVertical: 9,
                            paddingHorizontal: 14,
                            borderRadius: 10,
                            backgroundColor: selected ? '#FBBF24' : '#1E293B',
                        }}
                    >
                        <Text style={{
                            color: selected ? '#0F172A' : '#CBD5E1',
                            fontWeight: selected ? 'bold' : '500',
                            fontSize: 13,
                        }}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    // A plain on/off pair rather than a Switch, so the state is a word and not only a
    // colour — the same reasoning as the map buttons.
    const OnOff = ({ value, onChange }: { value: boolean | undefined; onChange: (v: boolean) => void }) => (
        <Choice
            options={[{ key: 'on', label: t('map.on') }, { key: 'off', label: t('map.off') }]}
            value={value ? 'on' : 'off'}
            onChange={(key) => onChange(key === 'on')}
        />
    );

    // Steppers rather than a slider: no new dependency, and a precise number beats a
    // thumb-drag on a boat.
    const Stepper = ({ value, limitKey, unitLabel, onChange }: {
        value: number | undefined;
        limitKey: string;
        unitLabel?: string;
        onChange: (v: number) => void;
    }) => {
        const limit = limits[limitKey] ?? FALLBACK_LIMITS[limitKey];

        // ⚠ Clamp for DISPLAY, not just on change. A saved value — or a default — can sit
        // outside the range the library reports, and showing "10" under "can be set from 60
        // to 60" makes the screen look broken. Caught on the first walk: Garmin reports
        // 60–60 for this one before the library has started.
        const current = Math.min(limit.max, Math.max(limit.min, value ?? limit.min));

        // When the library reports a single allowed value there is nothing to step through,
        // and two dead buttons either side of a number is worse than saying so.
        const fixed = limit.min >= limit.max;
        const step = Math.max(1, Math.round((limit.max - limit.min) / 40));

        if (fixed) {
            return (
                <View>
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
                        {limit.min}{unitLabel ? <Text style={{ fontSize: 12, color: '#94A3B8' }}> {unitLabel}</Text> : null}
                    </Text>
                    <Text style={{ color: '#64748B', fontSize: 11, marginTop: 6 }}>{t('map.onlyValue')}</Text>
                </View>
            );
        }

        const button = (label: string, next: number, enabled: boolean, a11y: string) => (
            <TouchableOpacity
                onPress={() => onChange(next)}
                disabled={!enabled}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={a11y}
                style={{
                    width: 46, height: 42, borderRadius: 10,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: enabled ? '#1E293B' : '#0F172A',
                }}
            >
                <Text style={{ color: enabled ? '#FBBF24' : '#475569', fontSize: 20, fontWeight: 'bold' }}>{label}</Text>
            </TouchableOpacity>
        );

        return (
            <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {button('−', Math.max(limit.min, current - step), current > limit.min, t('map.decrease'))}
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', minWidth: 62, textAlign: 'center' }}>
                        {current}{unitLabel ? <Text style={{ fontSize: 12, color: '#94A3B8' }}> {unitLabel}</Text> : null}
                    </Text>
                    {button('+', Math.min(limit.max, current + step), current < limit.max, t('map.increase'))}
                </View>
                <Text style={{ color: '#64748B', fontSize: 11, marginTop: 6 }}>
                    {t('map.rangeIs', { min: limit.min, max: limit.max })}
                </Text>
            </View>
        );
    };

    // The depth unit the harvester picked, echoed onto the depth settings so a number
    // like "5" says what it is.
    const depthWord =
        settings.depthUnit === 'meters' ? t('map.unitMetres')
            : settings.depthUnit === 'feet' ? t('map.unitFeet')
                : t('map.unitFathoms');

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: '#0F172A', paddingTop: insets.top, paddingBottom: insets.bottom }}>
                <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 20, paddingVertical: 14,
                    borderBottomWidth: 1, borderBottomColor: '#1E293B',
                }}>
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{t('map.chartSettingsTitle')}</Text>
                    <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={t('map.close')} style={{ padding: 6 }}>
                        <X size={24} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color="#FBBF24" />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>

                        {/* ⚠ Says plainly where things stand. Settings that change nothing
                            visible would otherwise look broken. */}
                        {state !== 'ready' && (
                            <View style={{
                                backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginTop: 16,
                                borderLeftWidth: 3, borderLeftColor: '#FBBF24',
                            }}>
                                <Text style={{ color: '#FBBF24', fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>
                                    {t('map.chartsNotReadyTitle')}
                                </Text>
                                <Text style={{ color: '#CBD5E1', fontSize: 12, lineHeight: 18 }}>
                                    {t('map.chartsNotReadyBody')}
                                </Text>
                            </View>
                        )}

                        <Text style={{ color: '#64748B', fontSize: 11, fontWeight: 'bold', marginTop: 24, letterSpacing: 1 }}>
                            {t('map.groupUnits')}
                        </Text>

                        <Row title={t('map.depthUnitTitle')}>
                            <Choice
                                options={[
                                    { key: 'fathoms', label: t('map.unitFathoms') },
                                    { key: 'feet', label: t('map.unitFeet') },
                                    { key: 'meters', label: t('map.unitMetres') },
                                ]}
                                value={settings.depthUnit}
                                onChange={(key) => update({ depthUnit: key as ChartSettings['depthUnit'] })}
                            />
                        </Row>

                        <Row title={t('map.distanceUnitTitle')}>
                            <Choice
                                options={[
                                    { key: 'nauticalMiles', label: t('map.unitNauticalMiles') },
                                    { key: 'kilometers', label: t('map.unitKilometres') },
                                    { key: 'statuteMiles', label: t('map.unitStatuteMiles') },
                                ]}
                                value={settings.distanceUnit}
                                onChange={(key) => update({ distanceUnit: key as ChartSettings['distanceUnit'] })}
                            />
                        </Row>

                        <Row title={t('map.speedUnitTitle')}>
                            <Choice
                                options={[
                                    { key: 'knots', label: t('map.unitKnots') },
                                    { key: 'mph', label: t('map.unitMph') },
                                    { key: 'kph', label: t('map.unitKph') },
                                ]}
                                value={settings.speedUnit}
                                onChange={(key) => update({ speedUnit: key as ChartSettings['speedUnit'] })}
                            />
                        </Row>

                        <Text style={{ color: '#64748B', fontSize: 11, fontWeight: 'bold', marginTop: 28, letterSpacing: 1 }}>
                            {t('map.groupDetail')}
                        </Text>

                        <Row title={t('map.contourDensityTitle')} hint={t('map.contourDensityHint')}>
                            <Choice
                                options={[
                                    { key: 'low', label: t('map.densityLow') },
                                    { key: 'medium', label: t('map.densityMedium') },
                                    { key: 'high', label: t('map.densityHigh') },
                                    { key: 'veryHigh', label: t('map.densityVeryHigh') },
                                ]}
                                value={settings.contourDensity}
                                onChange={(key) => update({ contourDensity: key as ChartSettings['contourDensity'] })}
                            />
                        </Row>

                        <Row title={t('map.allContoursTitle')} hint={t('map.allContoursHint')}>
                            <OnOff value={settings.allDepthContours} onChange={(v) => update({ allDepthContours: v })} />
                        </Row>

                        <Row title={t('map.easyViewTitle')} hint={t('map.easyViewHint')}>
                            <OnOff value={settings.easyView} onChange={(v) => update({ easyView: v })} />
                        </Row>

                        <Row title={t('map.seabedTitle')} hint={t('map.seabedHint')}>
                            <OnOff value={settings.seabedArea} onChange={(v) => update({ seabedArea: v })} />
                        </Row>

                        <Text style={{ color: '#64748B', fontSize: 11, fontWeight: 'bold', marginTop: 28, letterSpacing: 1 }}>
                            {t('map.groupDepths')}
                        </Text>

                        <Row title={t('map.shallowLimitTitle')} hint={t('map.shallowLimitHint')}>
                            <Stepper
                                value={settings.shallowDepthLimit}
                                limitKey="shallowDepthLimit"
                                unitLabel={depthWord}
                                onChange={(v) => update({ shallowDepthLimit: v })}
                            />
                        </Row>

                        <Row title={t('map.depthContoursTitle')} hint={t('map.depthContoursHint')}>
                            <Stepper
                                value={settings.depthContours}
                                limitKey="depthContours"
                                unitLabel={depthWord}
                                onChange={(v) => update({ depthContours: v })}
                            />
                        </Row>

                        <Row title={t('map.depthAreasTitle')} hint={t('map.depthAreasHint')}>
                            <Stepper
                                value={settings.depthAreas}
                                limitKey="depthAreas"
                                unitLabel={depthWord}
                                onChange={(v) => update({ depthAreas: v })}
                            />
                        </Row>

                        <Text style={{ color: '#64748B', fontSize: 11, fontWeight: 'bold', marginTop: 28, letterSpacing: 1 }}>
                            {t('map.groupFishing')}
                        </Text>

                        <Row title={t('map.fishingModeTitle')} hint={t('map.fishingModeHint')}>
                            <OnOff value={settings.fishingMode} onChange={(v) => update({ fishingMode: v })} />
                        </Row>

                        <Row title={t('map.fishingShallowTitle')} hint={t('map.fishingShallowHint')}>
                            <Stepper
                                value={settings.fishingAreaRangeLower}
                                limitKey="fishingAreaRangeLower"
                                unitLabel={depthWord}
                                onChange={(v) => update({ fishingAreaRangeLower: v })}
                            />
                        </Row>

                        <Row title={t('map.fishingDeepTitle')} hint={t('map.fishingDeepHint')}>
                            <Stepper
                                value={settings.fishingAreaRangeUpper}
                                limitKey="fishingAreaRangeUpper"
                                unitLabel={depthWord}
                                onChange={(v) => update({ fishingAreaRangeUpper: v })}
                            />
                        </Row>

                        <Text style={{ color: '#64748B', fontSize: 11, fontWeight: 'bold', marginTop: 28, letterSpacing: 1 }}>
                            {t('map.groupOther')}
                        </Text>

                        <Row title={t('map.poolLevelTitle')} hint={t('map.poolLevelHint')}>
                            <Stepper
                                value={settings.poolWaterLevel}
                                limitKey="poolWaterLevel"
                                unitLabel={depthWord}
                                onChange={(v) => update({ poolWaterLevel: v })}
                            />
                        </Row>

                        <TouchableOpacity
                            onPress={resetAll}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            style={{
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                                marginTop: 28, paddingVertical: 14, borderRadius: 12,
                                borderWidth: 1, borderColor: '#334155',
                            }}
                        >
                            <RotateCcw size={16} color="#94A3B8" />
                            <Text style={{ color: '#94A3B8', fontWeight: 'bold', fontSize: 13 }}>{t('map.resetDefaults')}</Text>
                        </TouchableOpacity>

                        <Text style={{ color: '#475569', fontSize: 11, marginTop: 20, lineHeight: 16 }}>
                            {t('map.settingsFootnote')}
                        </Text>
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
};

export default ChartSettingsScreen;
