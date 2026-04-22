import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Svg, Line, Rect, Path, Circle } from 'react-native-svg';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

// Imports from your new folders
import { styles } from '../styles/GlobalStyles';
import { parseLocalDate, getDefaultSeasonConfig } from '../utils/helpers';

const HistoryGraph = ({ logs, startYear, onYearChange, profile }: any) => {
    // --- NEW: State to track which bar your finger is currently over ---
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const range = useMemo(() => {
        if (!profile || !profile.seasons) return null;
        const conf = profile.seasons[startYear] || getDefaultSeasonConfig(startYear);
        return {
            start: parseLocalDate(conf.start),
            end: parseLocalDate(conf.end),
            label: `${startYear}/${(startYear + 1).toString().slice(-2)} Season`
        };
    }, [profile, startYear]);

    const dataPoints = useMemo(() => {
        if (!range) return [];
        return Object.values(logs).filter((log: any) => {
            const logDate = parseLocalDate(log.dateId);
            const hasWeight = Number(log.lbs) > 0;
            return logDate >= range.start && logDate <= range.end && hasWeight;
        }).sort((a: any, b: any) => a.dateId.localeCompare(b.dateId)).map((log: any) => ({
            date: parseLocalDate(log.dateId),
            lbs: Number(log.lbs) || 0,
            temp: Number(log.temp) || 0
        }));
    }, [logs, range]);

    const totals = useMemo(() => {
        const totalLbs = dataPoints.reduce((acc, curr) => acc + curr.lbs, 0);
        const validTemps = dataPoints.filter(d => d.temp > 0);
        const avgTemp = validTemps.length > 0 ? (validTemps.reduce((acc, curr) => acc + curr.temp, 0) / validTemps.length).toFixed(1) : 0;
        return { totalLbs, avgTemp };
    }, [dataPoints]);

    // Early return AFTER all hooks
    if (!range) return null;

    const width = 350; const height = 200; const padding = 20;
    const maxLbs = Math.max(...dataPoints.map(d => d.lbs), 100);
    const minTemp = Math.min(...dataPoints.filter(d => d.temp > 0).map(d => d.temp), 30);
    const maxTemp = Math.max(...dataPoints.map(d => d.temp), minTemp + 10);

    const getX = (index: number) => padding + (index / (dataPoints.length - 1 || 1)) * (width - 2 * padding);
    const getY_Lbs = (lbs: number) => height - padding - (lbs / maxLbs) * (height - 2 * padding);
    const getY_Temp = (temp: number) => height - padding - ((temp - minTemp) / (maxTemp - minTemp)) * (height - 2 * padding);

    const tempPath = dataPoints.map((d, i) => {
        if (d.temp === 0) return null;
        const x = getX(i); const y = getY_Temp(d.temp);
        return `${i === 0 || dataPoints[i-1].temp === 0 ? 'M' : 'L'} ${x},${y}`;
    }).filter(p => p !== null).join(' ');

    // --- NEW: Function to track finger drag and update the selected index ---
    const handleTouch = (event: any) => {
        if (dataPoints.length === 0) return;
        const x = event.nativeEvent.locationX;
        const chartWidth = width - 2 * padding;

        // Ensure the touch is within the chart bounds
        const relativeX = Math.max(0, Math.min(x - padding, chartWidth));
        const percentage = relativeX / chartWidth;

        // Find the closest data point
        let index = Math.round(percentage * (dataPoints.length - 1));
        setSelectedIndex(index);
    };

    return (
        <View style={styles.card}>
            <View style={styles.graphHeader}>
                <View style={styles.yearNav}>
                    <TouchableOpacity onPress={() => onYearChange(startYear - 1)} style={styles.iconButton}><ChevronLeft size={24} color="#475569" /></TouchableOpacity>
                    <Text style={styles.graphTitle}>{range.label}</Text>
                    <TouchableOpacity onPress={() => onYearChange(startYear + 1)} style={styles.iconButton}><ChevronRight size={24} color="#475569" /></TouchableOpacity>
                </View>
                <View style={styles.statsRow}>
                    <View style={styles.statBadge}><View style={[styles.dot, { backgroundColor: '#60A5FA' }]} /><Text style={styles.statText}>{totals.totalLbs.toLocaleString()} lbs</Text></View>
                    <View style={styles.statBadge}><View style={[styles.dot, { backgroundColor: '#EF4444' }]} /><Text style={styles.statText}>Avg {totals.avgTemp}°F</Text></View>
                </View>
            </View>

            {/* --- NEW: The Floating Tooltip positioned above the graph --- */}
            <View style={{ height: 40, justifyContent: 'flex-end', alignItems: 'center', zIndex: 10 }}>
                {selectedIndex !== null && dataPoints[selectedIndex] && (
                    <View style={{
                        backgroundColor: '#1E293B',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 5
                    }}>
                        <Text style={{ color: '#F8FAFC', fontWeight: 'bold' }}>
                            {dataPoints[selectedIndex].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                        <Text style={{ color: '#60A5FA', fontWeight: 'bold' }}>
                            {dataPoints[selectedIndex].lbs.toLocaleString()} lbs
                        </Text>
                        {dataPoints[selectedIndex].temp > 0 && (
                            <Text style={{ color: '#F87171', fontWeight: 'bold' }}>
                                {dataPoints[selectedIndex].temp}°F
                            </Text>
                        )}
                    </View>
                )}
            </View>

            {dataPoints.length > 0 ? (
                <View
                    style={{ width: width, height: height, alignSelf: 'center' }}
                    // --- NEW: Gesture Responders to track your finger ---
                    onStartShouldSetResponder={() => true}
                    onResponderGrant={handleTouch}
                    onResponderMove={handleTouch}
                    onResponderRelease={() => setSelectedIndex(null)} // Hides popup when you lift your thumb
                >
                    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E2E8F0" strokeWidth="1" />
                        <Line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#E2E8F0" strokeWidth="1" />

                        {/* Bars */}
                        {dataPoints.map((d, i) => (
                            <Rect
                                key={`bar-${i}`}
                                x={getX(i) - 2}
                                y={getY_Lbs(d.lbs)}
                                width={4}
                                height={height - padding - getY_Lbs(d.lbs)}
                                fill="#60A5FA"
                                // Dim bars that aren't selected
                                opacity={selectedIndex === null ? 0.6 : (selectedIndex === i ? 1 : 0.3)}
                            />
                        ))}

                        {/* Temp Line */}
                        <Path d={tempPath} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Temp Dots */}
                        {dataPoints.map((d, i) => d.temp > 0 && (
                            <Circle key={`dot-${i}`} cx={getX(i)} cy={getY_Temp(d.temp)} r="2" fill="#EF4444" />
                        ))}

                        {/* --- NEW: Vertical dashed line that follows your finger --- */}
                        {selectedIndex !== null && (
                            <>
                                <Line
                                    x1={getX(selectedIndex)}
                                    y1={padding}
                                    x2={getX(selectedIndex)}
                                    y2={height - padding}
                                    stroke="#94A3B8"
                                    strokeWidth="1"
                                    strokeDasharray="4, 4"
                                />
                                {/* Highlight ring on the temp dot you are currently hovering */}
                                {dataPoints[selectedIndex].temp > 0 && (
                                    <Circle
                                        cx={getX(selectedIndex)}
                                        cy={getY_Temp(dataPoints[selectedIndex].temp)}
                                        r="4"
                                        fill="#1E293B"
                                        stroke="#EF4444"
                                        strokeWidth="2"
                                    />
                                )}
                            </>
                        )}
                    </Svg>
                </View>
            ) : (<View style={styles.emptyGraph}><Text style={styles.emptyGraphText}>No data recorded for this period.</Text></View>)}
        </View>
    );
};

export default HistoryGraph;