import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Shield } from 'lucide-react-native';
import { loadCaptainProfile, CaptainProfile, EMPTY_PROFILE } from '../utils/captainStorage';
import { loadAllLogs, DfoLog } from '../utils/dfoLogStorage';
import LZString from 'lz-string';
import QRCode from 'react-native-qrcode-svg';

interface Props {
  onClose: () => void;
}

export default function InspectionModeScreen({ onClose }: Props) {
  const [captain, setCaptain] = useState<CaptainProfile>(EMPTY_PROFILE);
  const [activeDraft, setActiveDraft] = useState<DfoLog | null>(null);
  const [last5, setLast5] = useState<DfoLog[]>([]);
  const [qrValue, setQrValue] = useState<string>('');

  useEffect(() => {
    async function load() {
      const [profile, logs] = await Promise.all([
        loadCaptainProfile(),
        loadAllLogs(), // returns newest-first
      ]);

      const completed = logs.filter(l => l.status === 'complete').slice(0, 5);
      // newest-first, so first draft is the most recent
      const latestDraft = logs.find(l => l.status === 'draft') ?? null;

      const payload = {
        captain: profile,
        activeTripId: latestDraft?.id ?? null,
        activeTripDate: latestDraft?.dateFished ?? null,
        last5: completed.map(log => ({
          tripId: log.id,
          dateFished: log.dateFished,
          mode: log.mode,
          status: log.status,
          catchWeight: log.data.catchWeight || '',
          trapHauls: log.data.trapHauls || '',
          gridNumber: log.data.gridNumber || '',
          portLanded: log.data.portLanded || '',
          departurePort: log.data.departurePort || '',
          timeSailed: log.data.timeSailed || '',
          timeStartedHauling: log.data.timeStartedHauling || '',
          timeStoppedHauling: log.data.timeStoppedHauling || '',
          timeOfLanding: log.data.timeOfLanding || '',
          soakDuration: log.data.soakDuration || '',
          gpsLat: log.data.gpsLat || '',
          gpsLng: log.data.gpsLng || '',
          vNotchCount: log.data.vNotchCount || '',
          personalUse: log.data.personalUse || '',
          bycatchYes: log.data.bycatchYes || '',
          bycatchEntries: log.data.bycatchEntries || '[]',
          baitEntries: log.data.baitEntries || '[]',
          transferYes: log.data.transferYes || '',
          transfers: log.data.transfers || '',
          crewRegistry: log.data.crewRegistry || '[]',
          mmYes: log.data.mmYes || '',
          mmSpecies: log.data.mmSpecies || '',
          mmWhat: log.data.mmWhat || '',
          mmLat: log.data.mmLat || '',
          mmLng: log.data.mmLng || '',
          mmDate: log.data.mmDate || '',
          mmTime: log.data.mmTime || '',
          sarYes: log.data.sarYes || '',
          sarSpecies: log.data.sarSpecies || '',
          sarWhat: log.data.sarWhat || '',
          sarLat: log.data.sarLat || '',
          sarLng: log.data.sarLng || '',
          sarDate: log.data.sarDate || '',
          sarTime: log.data.sarTime || '',
          lostGearYes: log.data.lostGearYes || '',
          lostGearType: log.data.lostGearType || '',
          lostGearLat: log.data.lostGearLat || '',
          lostGearLng: log.data.lostGearLng || '',
          lostGearDate: log.data.lostGearDate || '',
          lostGearTime: log.data.lostGearTime || '',
          sentToDfo: String(log.sentToDfo ?? false),
        })),
      };

      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));

      setCaptain(profile);
      setActiveDraft(latestDraft);
      setLast5(completed);
      setQrValue(compressed);
    }

    load();
  }, []);

  const handleExitPress = () => {
    Alert.alert(
      'Exit Inspection Mode?',
      'Are you sure you want to leave inspection mode?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: onClose },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.shieldBadge}>
          <Shield size={22} color="#FBBF24" />
        </View>
        <Text style={styles.headerTitle}>INSPECTION MODE</Text>
        <Text style={styles.headerSubtitle}>DFO Officer View — Read Only</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── QR Code Card ── */}
        <View style={styles.qrCard}>
          <Text style={styles.qrCardEyebrow}>SCAN TO VERIFY</Text>
          {qrValue ? (
            <QRCode
              value={qrValue}
              size={280}
              color="#000000"
              backgroundColor="#FFFFFF"
            />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>Loading…</Text>
            </View>
          )}
          <Text style={styles.qrHint}>
            Contains vessel, licence, and recent catch data
          </Text>
        </View>

        {/* ── Text Summary Card ── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summarySection}>VESSEL &amp; LICENCE</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Operator</Text>
            <Text style={styles.summaryValue}>{captain.operatorName || '—'}</Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>FIN</Text>
            <Text style={styles.summaryValue}>{captain.licenceHolderFin || '—'}</Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Vessel (VRN)</Text>
            <Text style={styles.summaryValue}>{captain.vesselNumber || '—'}</Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Active Trip</Text>
            <Text
              style={[
                styles.summaryValue,
                activeDraft ? styles.activeTripValue : styles.noTripValue,
              ]}
            >
              {activeDraft ? activeDraft.id : 'No active trip'}
            </Text>
          </View>

          <Text style={[styles.summarySection, { marginTop: 22 }]}>
            LAST 5 COMPLETED LOGS
          </Text>

          {last5.length > 0 ? (
            last5.map((log, i) => (
              <View key={log.id}>
                {i > 0 && <View style={styles.rowDivider} />}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{log.dateFished}</Text>
                  <Text style={styles.summaryValue}>{log.id}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyLogsText}>No completed logs on this device</Text>
          )}
        </View>
      </ScrollView>

      {/* ── Exit Button ── */}
      <View style={styles.exitContainer}>
        <TouchableOpacity
          style={styles.exitButton}
          onPress={handleExitPress}
          activeOpacity={0.85}
        >
          <Text style={styles.exitButtonText}>Exit Inspection Mode</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  shieldBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 12,
    borderRadius: 50,
    marginBottom: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 5,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.4,
  },

  // Scroll body
  scroll: {
    flex: 1,
    backgroundColor: '#162f73',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },

  // QR Card
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  qrCardEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 2.5,
    marginBottom: 22,
  },
  qrPlaceholder: {
    width: 280,
    height: 280,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 15,
  },
  qrHint: {
    marginTop: 20,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  summarySection: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 2,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '700',
    flex: 2,
    textAlign: 'right',
  },
  activeTripValue: {
    color: '#1E3A8A',
  },
  noTripValue: {
    color: '#94A3B8',
    fontStyle: 'italic',
    fontWeight: '400',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  emptyLogsText: {
    color: '#94A3B8',
    fontStyle: 'italic',
    fontSize: 13,
    paddingVertical: 10,
  },

  // Exit
  exitContainer: {
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#1E3A8A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  exitButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  exitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
