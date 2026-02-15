import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Svg, Line, Rect, Path, Circle } from 'react-native-svg';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

// Imports from your new folders
import { styles } from '../styles/GlobalStyles';
import { parseLocalDate, getDefaultSeasonConfig } from '../utils/helpers';

const HistoryGraph = ({ logs, startYear, onYearChange, profile }: any) => {
    if (!profile || !profile.seasons) return null;

    const range = useMemo(() => {
        const conf = profile.seasons[startYear] || getDefaultSeasonConfig(startYear);
        return {
            start: parseLocalDate(conf.start),
            end: parseLocalDate(conf.end),
            label: `${startYear}/${(startYear + 1).toString().slice(-2)} Season`
        };
    }, [profile, startYear]);

    const dataPoints = useMemo(() => {
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
            {dataPoints.length > 0 ? (
                <View style={{ alignItems: 'center' }}>
                    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E2E8F0" strokeWidth="1" />
                        <Line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#E2E8F0" strokeWidth="1" />
                        {dataPoints.map((d, i) => (<Rect key={`bar-${i}`} x={getX(i) - 2} y={getY_Lbs(d.lbs)} width={4} height={height - padding - getY_Lbs(d.lbs)} fill="#60A5FA" opacity={0.6} />))}
                        <Path d={tempPath} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {dataPoints.map((d, i) => d.temp > 0 && (<Circle key={`dot-${i}`} cx={getX(i)} cy={getY_Temp(d.temp)} r="2" fill="#EF4444" />))}
                    </Svg>
                </View>
            ) : (<View style={styles.emptyGraph}><Text style={styles.emptyGraphText}>No data recorded for this period.</Text></View>)}
        </View>
    );
};

export default HistoryGraph;