// Reusable transmission-register card + detail modal (Session 60).
// Used by BOTH DfoLogsListScreen (capped to 30 sent) and LogHistoryScreen (full archive)
// so the sent-log layout and tap-to-detail live in exactly one place.
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, SafeAreaView, StyleSheet, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, X, Eye, FileCode, Download } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { DfoLog, TransmissionRecord, transmissionKind, SEND_FAILURE_SHEET_KEY, isSendFailureKind, loadXmlArchive } from '../utils/dfoLogStorage';
// S163 Phase 3 — save-to-phone reuses the delete-account export route (S150B/S151),
// not a new one: DocumentDir write + iOS share sheet / Android view intent.
import { writeTransmissionRecordExport } from '../utils/exportTransmissionRecord';
import { formatSentDateTime } from '../utils/formatSentDateTime';

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
  // S163 Phase 1 — the door into the full read-only log (App's onViewLog route).
  // OPTIONAL so LogHistoryScreen, which shares this card but has no route to the
  // form, renders exactly as before unless deliberately wired (§6 item 5).
  onView?: () => void;
}

export const SentLogCard: React.FC<SentLogCardProps> = ({ log, record, onPress, onView }) => {
  const { t, i18n } = useTranslation('dfo');
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
        {/* LGBK_UID surface (S116 P3) — read from the log, not the record (B0 route) */}
        {!!log.lgbkUid && <Field label={t('logs.elogUidLabel')} value={log.lgbkUid} />}
        {!!record?.vrn && <Field label={t('logs.regVesselLabel')} value={record.vrn} />}
        {!!record?.confNumber && <Field label={t('logs.regConfLabel')} value={record.confNumber} />}
        <Field label={t('logs.regSentLabel')} value={formatSentDateTime(record?.attemptedAt, i18n.language)} />
      </View>

      {onView && (
        <TouchableOpacity style={styles.viewButton} onPress={onView} activeOpacity={0.7}>
          <Eye size={15} color="#1E3A8A" />
          <Text style={styles.viewButtonText}>{t('logs.viewButton')}</Text>
        </TouchableOpacity>
      )}
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
  const { t, i18n } = useTranslation('dfo');
  const insets = useSafeAreaInsets(); // S95: edge-to-edge safe-area top for this full-screen modal header
  const tripNum = record?.tripNum ?? log?.tripNum;

  // S163 Phase 3 — the sent XML, visible and saveable. Resolution order: the
  // xml_archive entry for this logId (the §13.4 store, success-only by design),
  // falling back to the record's own xmlSnapshot — which is how a FAILED attempt's
  // document is reachable at all (ruled in the build doc: the button renders for
  // both outcomes whenever bytes exist; the outcome badge above the card already
  // says which kind of document this is). Empty both ways → no button.
  const [xmlText, setXmlText] = useState<string>('');
  const [xmlOpen, setXmlOpen] = useState(false);
  useEffect(() => {
    let stale = false;
    setXmlOpen(false);
    setXmlText('');
    if (!visible || !record) return;
    (async () => {
      const archive = await loadXmlArchive();
      const entry = archive.find(e => e.logId === record.logId);
      if (!stale) setXmlText(entry?.xml || record.xmlSnapshot || '');
    })();
    return () => { stale = true; };
  }, [visible, record]);

  // Filename: the DFO name from the record; a degraded old record without one
  // falls back to <logId>.XML so the save path never invents a DFO-shaped name.
  const xmlFileName = record?.fileName || `${record?.logId ?? 'log'}.XML`;

  const handleSaveXml = async () => {
    const res = await writeTransmissionRecordExport(xmlText, xmlFileName);
    if (res.ok) {
      Alert.alert(t('logs.xmlSaveOkTitle'), t('logs.xmlSaveOkBody', { fileName: xmlFileName }));
    } else {
      Alert.alert(t('logs.xmlSaveFailTitle'), t('logs.xmlSaveFailBody'));
    }
  };

  // For form records (no backing DfoLog) the header is derived from the record kind,
  // mirroring FormSentCard's title contract; logbook records ignore this and use log.*.
  const formKind = record ? transmissionKind(record) : undefined;
  const formTitle =
    formKind === 'form222' ? t('logs.regForm222Title')
    : formKind === 'form233' ? t('logs.regForm233Title')
    : record?.logId ?? '';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.detailContainer}>
        <View style={[styles.detailHeader, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.detailTitle}>{t('logs.detailTitle')}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {!record ? (
            <Text style={styles.noRecord}>{t('logs.detailNoRecord')}</Text>
          ) : (
            <>
              <View style={styles.detailIdRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logId}>{log ? log.id : formTitle}</Text>
                  <Text style={styles.logDate}>{log ? log.dateFished : formatSentDateTime(record.attemptedAt, i18n.language)}</Text>
                </View>
                <OutcomeBadge outcome={record.outcome} />
              </View>

              {/* S148 R-A/R-E — TWO READERS, ONE SHEET. This line is the harvester's: plain words
                  in his own language, translated here from the record's language-neutral marker so
                  a mid-session language change follows it (R-F). Everything below is the officer's:
                  the raw technical rows, complete and untranslated. A record written before S148
                  carries no marker, so this line is simply absent and the rows below still show
                  exactly what they always showed — nothing renders blank (R-E). */}
              {record.outcome === 'failure' && isSendFailureKind(record.failureKind) && (
                <Text style={styles.failurePlain}>{t(SEND_FAILURE_SHEET_KEY[record.failureKind])}</Text>
              )}

              <View style={styles.detailCard}>
                {log && <DetailRow label={t('logs.regTripLabel')} value={tripNum !== undefined ? `#${tripNum}` : '—'} />}
                {/* LGBK_UID surface (S116 P3) — resolved from the originating log (B0 route:
                    the record stores no lgbkUid). Hidden when there is no backing log
                    (form records, deleted logs) — no stray row, historical records degrade
                    gracefully. */}
                {!!log?.lgbkUid && <DetailRow label={t('logs.elogUidLabel')} value={log.lgbkUid} />}
                <DetailRow label={t('logs.regVesselLabel')} value={record.vrn || '—'} />
                <DetailRow label={t('logs.regConfLabel')} value={record.confNumber || '—'} />
                <DetailRow label={t('logs.regSentLabel')} value={formatSentDateTime(record.attemptedAt, i18n.language)} />
                {record.outcome === 'failure' && (
                  <DetailRow label={t('logs.detailErr')} value={record.errorMessage || '—'} />
                )}
                <DetailRow label={t('logs.detailWsCode')} value={record.wsErrCode || '—'} />
                <DetailRow label={t('logs.detailFileName')} value={record.fileName || '—'} />
                {/* S163 Phase 4 — the §13.3.1 XSD validation result, back on the card.
                    xsdValid is written ONLY by an actually-executed validator run
                    (doSubmit :309 / sendFormEntry :33,:63 — proven, no default-true
                    anywhere), so "Passed" is earned; absent = no check ran = "—".
                    Values REUSE export.xsdPassed/xsdFailed: one stored fact, one
                    string — the card and the deletion export cannot drift apart. */}
                <DetailRow
                  label={t('logs.detailXsd')}
                  value={
                    record.xsdValid === true ? t('export.xsdPassed')
                    : record.xsdValid === false ? t('export.xsdFailed')
                    : '—'
                  }
                />
                <DetailRow label={t('logs.detailHttp')} value={record.httpStatus !== undefined ? String(record.httpStatus) : '—'} last />
              </View>

              {/* S163 Phase 3 — the document itself, whenever bytes exist (archive for a
                  success, the record's own snapshot for a failure). */}
              {!!xmlText && (
                <TouchableOpacity style={styles.xmlButton} onPress={() => setXmlOpen(true)} activeOpacity={0.7}>
                  <FileCode size={16} color="#1E3A8A" />
                  <Text style={styles.xmlButtonText}>{t('logs.viewXmlButton')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>

        {/* S163 Phase 3 — full-screen XML viewer: monospaced, scrollable, selectable,
            with save-to-phone through the existing export route. */}
        <Modal visible={xmlOpen} animationType="slide" onRequestClose={() => setXmlOpen(false)}>
          <SafeAreaView style={styles.detailContainer}>
            <View style={[styles.detailHeader, { paddingTop: insets.top + 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{t('logs.xmlViewerTitle')}</Text>
                <Text style={styles.xmlFileName}>{xmlFileName}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setXmlOpen(false)}>
                <X size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text selectable style={styles.xmlBody}>{xmlText}</Text>
            </ScrollView>
            <View style={[styles.xmlFooter, { paddingBottom: insets.bottom + 12 }]}>
              <TouchableOpacity style={styles.xmlSaveButton} onPress={handleSaveXml} activeOpacity={0.8}>
                <Download size={16} color="#FFFFFF" />
                <Text style={styles.xmlSaveButtonText}>{t('logs.saveXmlButton')}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
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
  // S163 Phase 1 — mirrors the list screen's editButton so View reads the same
  // everywhere a card offers it.
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    backgroundColor: '#EFF6FF',
    marginTop: 8,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
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
  // S148 — the plain-words failure line above the technical rows. Deliberately NOT styled like an
  // error banner: it is the sentence the harvester reads, not an alarm.
  failurePlain: {
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  noRecord: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 40,
  },
  // S163 Phase 3 — XML button + viewer
  xmlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    backgroundColor: '#EFF6FF',
  },
  xmlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  xmlFileName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  xmlBody: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    lineHeight: 16,
    color: '#1E293B',
  },
  xmlFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  xmlSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#1E3A8A',
  },
  xmlSaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
