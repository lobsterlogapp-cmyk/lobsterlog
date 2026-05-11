import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Plus, FileText, Send, Edit3, Play, Trash2, CheckCircle } from 'lucide-react-native';
import { loadAllLogs, deleteLog, markSentToDfo, DfoLog } from '../utils/dfoLogStorage';

// --- Completion % (inline so screen works regardless of dfoLogStorage version) ---
const FULL_REQUIRED = [
  'dateFished','crewRegistry','departurePort','portLanded',
  'timeSailed','timeStartedHauling','timeStoppedHauling','timeOfLanding',
  'soakDuration','gridNumber','catchWeight','trapHauls',
  'vNotchCount','gpsLat','gpsLng','personalUse',
];
const PROPOSAL_REQUIRED = [
  'dateFished','departurePort','portLanded','crewRegistry',
  'gridNumber','catchWeight','trapHauls',
  'timeStartedHauling','timeStoppedHauling',
];

const getCompletionPercent = (log: DfoLog): number => {
  const fields = log.mode === 'full' ? FULL_REQUIRED : PROPOSAL_REQUIRED;
  const data: Record<string, string> = { dateFished: log.dateFished, ...log.data };
  const filled = fields.filter(f => data[f] && data[f].trim() !== '').length;
  let arrayTotal = log.mode === 'full' ? 2 : 1;
  let arrayFilled = 0;
  try { if (JSON.parse(log.data.bycatchEntries || '[]').length > 0) arrayFilled++; } catch { /* noop */ }
  if (log.mode === 'full') {
    try { if (JSON.parse(log.data.baitEntries || '[]').length > 0) arrayFilled++; } catch { /* noop */ }
  }
  return Math.round(((filled + arrayFilled) / (fields.length + arrayTotal)) * 100);
};

// --- 72-hour countdown helper ---
// Parses "HH:MM" time string on the log's dateFished date into a ms timestamp
const getStopHaulTimestamp = (log: DfoLog): number | null => {
  const timeStr = log.data?.timeStoppedHauling;
  const dateStr = log.dateFished;
  if (!timeStr || !dateStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const [y, mo, d] = dateStr.split('-').map(Number);
  if (isNaN(h) || isNaN(m) || isNaN(y) || isNaN(mo) || isNaN(d)) return null;
  const dt = new Date(y, mo - 1, d, h, m, 0, 0);
  return dt.getTime();
};

const DEADLINE_MS = 72 * 60 * 60 * 1000; // 72 hours in ms

const getCountdownLabel = (log: DfoLog, now: number): { label: string; urgent: boolean } | null => {
  const stopTs = getStopHaulTimestamp(log);
  if (!stopTs) return null;
  const deadline = stopTs + DEADLINE_MS;
  const remaining = deadline - now;
  if (remaining <= 0) return { label: 'OVERDUE', urgent: true };
  const totalMins = Math.floor(remaining / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const urgent = hrs < 6;
  if (hrs >= 24) {
    const days = Math.floor(hrs / 24);
    const remHrs = hrs % 24;
    return { label: `${days}d ${remHrs}h to submit`, urgent: false };
  }
  return { label: `${hrs}h ${mins}m to submit`, urgent };
};

interface DfoLogsListScreenProps {
  onNewLog: () => void;
  onEditLog: (logId: string) => void;
  refreshKey?: number;
}

const DfoLogsListScreen: React.FC<DfoLogsListScreenProps> = ({
  onNewLog,
  onEditLog,
  refreshKey = 0,
}) => {
  const [drafts, setDrafts] = useState<DfoLog[]>([]);
  const [completed, setCompleted] = useState<DfoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    setLoading(true);
    const all = await loadAllLogs();
    setDrafts(all.filter(l => l.status === 'draft'));
    setCompleted(all.filter(l => l.status === 'complete' || !l.status));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  // Tick every minute so countdowns stay live
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSendToDfo = (log: DfoLog) => {
    if (log.sentToDfo) return; // already sent, button is disabled
    Alert.alert(
      'Send to DFO?',
      'Are you sure you want to send this log to DFO?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'default',
          onPress: async () => {
            await markSentToDfo(log.id);
            Alert.alert(
              'Demo Mode',
              "In production, this would submit to DFO's Maritimes ELOG API.",
              [{ text: 'OK' }]
            );
            refresh();
          },
        },
      ]
    );
  };

  const handleDeleteDraft = (logId: string) => {
    Alert.alert(
      'Delete Draft?',
      'This draft will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLog(logId);
            refresh();
          },
        },
      ]
    );
  };

  const renderCountdown = (log: DfoLog) => {
    const countdown = getCountdownLabel(log, now);
    if (!countdown) return null;
    return (
      <View style={[styles.countdownBadge, countdown.urgent && styles.countdownBadgeUrgent]}>
        <Text style={[styles.countdownText, countdown.urgent && styles.countdownTextUrgent]}>
          ⏱ {countdown.label}
        </Text>
      </View>
    );
  };

  const renderDraftCard = (log: DfoLog) => {
    const pct = getCompletionPercent(log);
    return (
      <View key={log.id} style={styles.draftCard}>
        <View style={styles.draftCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.draftId}>{log.id}</Text>
            <Text style={styles.draftDate}>{log.dateFished}</Text>
          </View>
          <View style={styles.pctBadge}>
            <Text style={styles.pctBadgeText}>{pct}%</Text>
          </View>
        </View>

        {renderCountdown(log)}

        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressLabel}>Draft · {pct}% complete</Text>

        <View style={styles.logActions}>
          <TouchableOpacity
            style={styles.resumeButton}
            onPress={() => onEditLog(log.id)}
          >
            <Play size={15} color="#FFFFFF" />
            <Text style={styles.resumeButtonText}>Resume</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteDraft(log.id)}
          >
            <Trash2 size={15} color="#B45309" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCompletedCard = (log: DfoLog) => {
    const sent = log.sentToDfo === true;
    return (
      <View key={log.id} style={styles.logCard}>
        <Text style={styles.logId}>{log.id}</Text>
        <Text style={styles.logDate}>{log.dateFished}</Text>

        {!sent && renderCountdown(log)}

        <View style={styles.logActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEditLog(log.id)}
          >
            <Edit3 size={16} color="#1E3A8A" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          {sent ? (
            <View style={styles.sentButton}>
              <CheckCircle size={16} color="#64748B" />
              <Text style={styles.sentButtonText}>Sent ✓</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => handleSendToDfo(log)}
            >
              <Send size={16} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>Send to DFO</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const isEmpty = !loading && drafts.length === 0 && completed.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DFO ELOGs</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <TouchableOpacity style={styles.newLogButton} onPress={onNewLog}>
          <Plus size={22} color="#FFFFFF" />
          <Text style={styles.newLogButtonText}>Fill Out New ELOG</Text>
        </TouchableOpacity>

        {isEmpty && (
          <View style={styles.emptyState}>
            <FileText size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No logs yet</Text>
            <Text style={styles.emptySub}>
              Tap "Fill Out New ELOG" above to create your first trip log.
            </Text>
          </View>
        )}

        {drafts.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>INCOMPLETE LOGS</Text>
            {drafts.map(renderDraftCard)}
          </>
        )}

        {completed.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, drafts.length > 0 && { marginTop: 16 }]}>
              COMPLETED LOGS
            </Text>
            {completed.map(renderCompletedCard)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  newLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  newLogButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },

  // --- Countdown badge ---
  countdownBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  countdownBadgeUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  countdownTextUrgent: {
    color: '#B91C1C',
  },

  // --- Draft card ---
  draftCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  draftCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  draftId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  draftDate: {
    fontSize: 13,
    color: '#B45309',
  },
  pctBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pctBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: '#B45309',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  resumeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#D97706',
  },
  resumeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  deleteButtonText: {
    color: '#B45309',
    fontSize: 14,
    fontWeight: '700',
  },

  // --- Completed card ---
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  logDate: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  logActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    backgroundColor: '#EFF6FF',
  },
  editButtonText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '700',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sentButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default DfoLogsListScreen;