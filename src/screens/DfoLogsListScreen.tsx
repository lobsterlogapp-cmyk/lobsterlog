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
import { ChevronLeft, Plus, FileText, Send, Edit3 } from 'lucide-react-native';
import { loadAllLogs, DfoLog } from '../utils/dfoLogStorage';

interface DfoLogsListScreenProps {
  onClose: () => void;
  onNewLog: () => void;
  onEditLog: (logId: string) => void;
}

const DfoLogsListScreen: React.FC<DfoLogsListScreenProps> = ({
  onClose,
  onNewLog,
  onEditLog,
}) => {
  const [logs, setLogs] = useState<DfoLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Load logs every time this screen becomes active
  const refresh = useCallback(async () => {
    setLoading(true);
    const all = await loadAllLogs();
    setLogs(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSendToDfo = (logId: string) => {
    Alert.alert(
      'Send to DFO?',
      'Are you sure you want to send this log to DFO?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'default',
          onPress: () => {
            Alert.alert(
              'Demo Mode',
              "In production, this would submit to DFO's Maritimes ELOG API.",
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <ChevronLeft size={24} color="#1E3A8A" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DFO ELOGs</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* New Log Button */}
        <TouchableOpacity style={styles.newLogButton} onPress={onNewLog}>
          <Plus size={22} color="#FFFFFF" />
          <Text style={styles.newLogButtonText}>Fill Out New ELOG</Text>
        </TouchableOpacity>

        {/* Section Header */}
        <Text style={styles.sectionHeader}>SAVED LOGS</Text>

        {/* Empty state */}
        {!loading && logs.length === 0 && (
          <View style={styles.emptyState}>
            <FileText size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No logs yet</Text>
            <Text style={styles.emptySub}>
              Tap "Fill Out New ELOG" above to create your first trip log.
            </Text>
          </View>
        )}

        {/* Log cards */}
        {logs.map((log) => (
          <View key={log.id} style={styles.logCard}>
            <Text style={styles.logId}>{log.id}</Text>
            <Text style={styles.logDate}>{log.dateFished}</Text>
            <View style={styles.logActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEditLog(log.id)}
              >
                <Edit3 size={16} color="#1E3A8A" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => handleSendToDfo(log.id)}
              >
                <Send size={16} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>Send to DFO</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
  },
  backText: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 2,
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
});

export default DfoLogsListScreen;