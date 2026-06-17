// Reusable transmission-register card + detail modal (Session 60).
// Used by BOTH DfoLogsListScreen (capped to 30 sent) and LogHistoryScreen (full archive)
// so the sent-log layout and tap-to-detail live in exactly one place.
import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import { CheckCircle, XCircle, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { DfoLog, TransmissionRecord } from '../utils/dfoLogStorage';

// Latest SUCCESS transmission record per logId. A log can have several attempts
// (failures + the eventual success); the register card always shows the success.
export function indexSuccessRecords(records: TransmissionRecord[]): Record<string, TransmissionRecord> {
  const map: Record<string, TransmissionRecord> = {};
  for (const r of records) {
    if (r.outcome !== 'success') continue;
    const existing = map[r.logId];
    if (!existing || r.attemptedAt > existing.attemptedAt) map[r.logId] = r;
  }
  return map;
}

// Every FAILED transmission attempt, newest-first — one entry per attempt (NOT collapsed
// per logId the way successes are): §13.3.3 wants a FAIL row for each failed send.
export function indexFailureRecords(records: TransmissionRecord[]): TransmissionRecord[] {
  return records
    .filter(r => r.outcome === 'failure')
    .sort((a, b) => b.attemptedAt - a.attemptedAt);
}

const formatSentDate = (ts?: number): string => {
  if (!ts) return '—';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value}</Text>
  </View>
);

// Success keeps the green "Accepted" badge; failure shows a red one. Driven by the record
// outcome so the same card + modal render both register row types (§13.3.3).
const OutcomeBadge: React.FC<{ outcome?: TransmissionRecord['outcome'] }> = ({ outcome }) => {
  const { t } = useTranslation('dfo');
  if (outcome === 'failure') {
    return (
      <View style={styles.failBadge}>
        <XCircle size={13} color="#B91C1C" />
        <Text style={styles.failBadgeText}>{t('logs.regFail')}</Text>
      </View>
    );
  }
  return (
    <View style={styles.successBadge}>
      <CheckCircle size={13} color="#15803D" />
      <Text style={styles.successBadgeText}>{t('logs.regSuccess')}</Text>
    </View>
  );
};

interface SentLogCardProps {
  log: DfoLog;
  record?: TransmissionRecord;
  onPress: () => void;
}

export const SentLogCard: React.FC<SentLogCardProps> = ({ log, record, onPress }) => {
  const { t } = useTranslation('dfo');
  const tripNum = record?.tripNum ?? log.tripNum;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.logId}>{log.id}</Text>
          <Text style={styles.logDate}>{log.dateFished}</Text>
        </View>
        <OutcomeBadge outcome={record?.outcome} />
      </View>

      <View style={styles.fieldGrid}>
        {tripNum !== undefined && <Field label={t('logs.regTripLabel')} value={`#${tripNum}`} />}
        {!!record?.vrn && <Field label={t('logs.regVesselLabel')} value={record.vrn} />}
        {!!record?.confNumber && <Field label={t('logs.regConfLabel')} value={record.confNumber} />}
        <Field label={t('logs.regSentLabel')} value={formatSentDate(record?.attemptedAt)} />
      </View>
    </TouchableOpacity>
  );
};

interface SentLogDetailModalProps {
  visible: boolean;
  log: DfoLog | null;
  record?: TransmissionRecord;
  onClose: () => void;
}

export const SentLogDetailModal: React.FC<SentLogDetailModalProps> = ({ visible, log, record, onClose }) => {
  const { t } = useTranslation('dfo');
  const tripNum = record?.tripNum ?? log?.tripNum;
  const xsdLabel =
    record?.xsdValid === true ? t('logs.detailXsdPass')
    : record?.xsdValid === false ? t('logs.detailXsdFail')
    : t('logs.detailXsdUnknown');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{t('logs.detailTitle')}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {!log || !record ? (
            <Text style={styles.noRecord}>{t('logs.detailNoRecord')}</Text>
          ) : (
            <>
              <View style={styles.detailIdRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logId}>{log.id}</Text>
                  <Text style={styles.logDate}>{log.dateFished}</Text>
                </View>
                <OutcomeBadge outcome={record.outcome} />
              </View>

              <View style={styles.detailCard}>
                <DetailRow label={t('logs.regTripLabel')} value={tripNum !== undefined ? `#${tripNum}` : '—'} />
                <DetailRow label={t('logs.regVesselLabel')} value={record.vrn || '—'} />
                <DetailRow label={t('logs.regConfLabel')} value={record.confNumber || '—'} />
                <DetailRow label={t('logs.regSentLabel')} value={formatSentDate(record.attemptedAt)} />
                {record.outcome === 'failure' && (
                  <DetailRow label={t('logs.detailErr')} value={record.errorMessage || '—'} />
                )}
                <DetailRow label={t('logs.detailXsd')} value={xsdLabel} />
                <DetailRow label={t('logs.detailWsCode')} value={record.wsErrCode || '—'} />
                <DetailRow label={t('logs.detailFileName')} value={record.fileName || '—'} />
                <DetailRow label={t('logs.detailHttp')} value={record.httpStatus !== undefined ? String(record.httpStatus) : '—'} last />
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const DetailRow: React.FC<{ label: string; value: string; last?: boolean }> = ({ label, value, last }) => (
  <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
    <Text style={styles.detailRowLabel}>{label}</Text>
    <Text style={styles.detailRowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  // Card — matches DfoLogsListScreen logCard styling
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
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
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  failBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  failBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  field: {
    width: '50%',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  // Detail modal
  detailContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeBtn: {
    padding: 4,
  },
  detailIdRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailRowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  detailRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    textAlign: 'right',
  },
  noRecord: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 40,
  },
});
