import React, { useState, useEffect, useCallback } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  BackHandler,
} from 'react-native';
import { Plus, FileText, Send, Edit3, Eye, Play, Trash2, CheckCircle, User, Shield, RotateCcw } from 'lucide-react-native';
import { loadAllLogs, deleteLog, markSentToDfo, DfoLog, saveTransmissionRecord, TransmissionRecord, saveXmlArchiveEntry } from '../utils/dfoLogStorage';
import { generateElogXml, generateSoapEnvelope, generateReportUid, validateElogXml, generateDfoXmlFileName, findEffortOverlap, DFO_SOAP_ACTION_SAVE } from '../utils/dfoXmlGenerator';
import { loadCaptainProfile, loadPrivacyAccepted, savePrivacyAccepted } from '../utils/captainStorage';
import CaptainProfileScreen from './CaptainProfileScreen';
import InspectionModeScreen from './InspectionModeScreen';
import Form222Screen from './Form222Screen';
import Form233Screen from './Form233Screen';
import PrivacyNoticeModal from './PrivacyNoticeModal';
import AttestationModal from './AttestationModal';

let attestationShownThisSession = false;

// --- Completion % ---
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

const getCompletionDetails = (log: DfoLog): { filled: number; total: number; pct: number } => {
  const fields = log.mode === 'full' ? FULL_REQUIRED : PROPOSAL_REQUIRED;
  const data: Record<string, string> = { dateFished: log.dateFished, ...log.data };
  const filled = fields.filter(f => data[f] && data[f].trim() !== '').length;
  const arrayTotal = log.mode === 'full' ? 2 : 1;
  let arrayFilled = 0;
  try { if (JSON.parse(log.data.bycatchEntries || '[]').length > 0) arrayFilled++; } catch { /* noop */ }
  if (log.mode === 'full') {
    try { if (JSON.parse(log.data.baitEntries || '[]').length > 0) arrayFilled++; } catch { /* noop */ }
  }
  const total = fields.length + arrayTotal;
  const filledTotal = filled + arrayFilled;
  return { filled: filledTotal, total, pct: Math.round((filledTotal / total) * 100) };
};

// --- 72-hour countdown helper ---
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

const DEADLINE_MS = 72 * 60 * 60 * 1000;

const getCountdownLabel = (log: DfoLog, now: number): { label: string; urgent: boolean } | null => {
  const stopTs = getStopHaulTimestamp(log);
  if (!stopTs) return null;
  const deadline = stopTs + DEADLINE_MS;
  const remaining = deadline - now;
  if (remaining <= 0) return { label: i18next.t('logs.overdue', { ns: 'dfo' }), urgent: true };
  const totalMins = Math.floor(remaining / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const urgent = hrs < 6;
  if (hrs >= 24) {
    const days = Math.floor(hrs / 24);
    const remHrs = hrs % 24;
    return { label: i18next.t('logs.countdownDays', { ns: 'dfo', days, hours: remHrs }), urgent: false };
  }
  return { label: i18next.t('logs.countdownHours', { ns: 'dfo', hours: hrs, mins }), urgent };
};

// --- DFO submission constants and response parser ---

const DFO_ELOG_ENDPOINT = ''; // Replace with URL from Jennifer Mooney — Ticket #2126
const SEND_TIMEOUT_MS = 30000;

// Response contract — ELOG_Web_Service_3_6_Eng.pdf §3.1.3: the SaveIncomingFile result is
// a WS_RESP XML document (usually XML-escaped inside <SaveIncomingFileResult> in the SOAP
// response). <ERR> = WS0000 means success; any other code is a failure (messages in the
// Web Service Technical Guide). A missing response or null/0 <CONF> is also a failure.
// On success: <VRN>, <FIN>, and one <LGBK_UID> per logbook (Form 233: <REPORT_UID> instead).
export function parseDfoSoapResponse(text: string): {
  success: boolean;
  conf?: string;
  errorCode?: string;
  errorMessage?: string;
  lgbkUids?: string[];
  reportUids?: string[];
} {
  // Transport-level SOAP fault from the .asmx service
  if (/<(soap:)?Fault[\s>]/i.test(text)) {
    const msg = text.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i)?.[1]?.trim();
    return { success: false, errorCode: 'SOAP_FAULT', errorMessage: msg ?? 'SOAP fault' };
  }

  // The WS_RESP document arrives XML-escaped inside the SOAP result element — unescape once
  let body = text;
  if (!/<WS_RESP>/i.test(body) && /&lt;WS_RESP&gt;/i.test(body)) {
    body = body
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }

  const grab = (el: string) =>
    body.match(new RegExp(`<${el}\\s*>\\s*([^<]*)<\\/\\s*${el}\\s*>`, 'i'))?.[1]?.trim();
  const grabAll = (el: string) =>
    [...body.matchAll(new RegExp(`<${el}\\s*>\\s*([^<]*)<\\/\\s*${el}\\s*>`, 'gi'))]
      .map(m => m[1].trim())
      .filter(Boolean);

  const conf = grab('CONF');
  const err = grab('ERR');

  if (err === 'WS0000') {
    if (!conf || conf === '0') {
      return { success: false, conf, errorCode: 'NO_CONF', errorMessage: 'WS0000 but confirmation number missing — treat as failed and retry' };
    }
    return { success: true, conf, lgbkUids: grabAll('LGBK_UID'), reportUids: grabAll('REPORT_UID') };
  }
  if (err) {
    return { success: false, conf, errorCode: err, errorMessage: `DFO Web Service error ${err}` };
  }
  // No WS_RESP at all — per §3.1.3 the transmission must be considered failed
  return { success: false, errorCode: 'NO_WS_RESP', errorMessage: 'No WS_RESP document in response' };
}

interface DfoLogsListScreenProps {
  onNewLog: () => void;
  onEditLog: (logId: string) => void;
  onViewLog: (logId: string) => void;
  refreshKey?: number;
}

const DfoLogsListScreen: React.FC<DfoLogsListScreenProps> = ({
  onNewLog,
  onEditLog,
  onViewLog,
  refreshKey = 0,
}) => {
  const { t } = useTranslation('dfo');
  const { t: tc } = useTranslation('common');

  const [drafts, setDrafts] = useState<DfoLog[]>([]);
  const [completed, setCompleted] = useState<DfoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [captainProfileVisible, setCaptainProfileVisible] = useState(false);
  const [inspectionModeVisible, setInspectionModeVisible] = useState(false);
  const [form222Visible, setForm222Visible] = useState(false);
  const [form233Visible, setForm233Visible] = useState(false);
  const [failedSends, setFailedSends] = useState<Record<string, string>>({});
  const [sendingLogs, setSendingLogs] = useState<Set<string>>(new Set());
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [attestationDone, setAttestationDone] = useState(attestationShownThisSession);

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

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadPrivacyAccepted().then(accepted => {
      setPrivacyAccepted(accepted);
      setPrivacyChecked(true);
    });
  }, []);

  const doSubmit = async (log: DfoLog) => {
    setSendingLogs(prev => { const n = new Set(prev); n.add(log.id); return n; });
    let xml = '';
    let soap = '';
    let fileName = '';

    const saveFailureRecord = async (httpStatus: number | undefined, errorMessage: string) => {
      const record: TransmissionRecord = {
        id: log.id,
        logId: log.id,
        attemptedAt: Date.now(),
        outcome: 'failure',
        ...(httpStatus !== undefined && { httpStatus }),
        errorMessage,
        ...(fileName && { fileName }),
        xmlSnapshot: xml,
        soapSnapshot: soap,
      };
      await saveTransmissionRecord(record);
    };

    try {
      const captainProfile = await loadCaptainProfile();

      // Rule 33: effort period must not overlap another previously entered effort
      const allLogs = await loadAllLogs();
      const overlapId = findEffortOverlap(log, allLogs);
      if (overlapId) {
        Alert.alert(
          t('logs.validationFailedTitle'),
          t('logs.effortOverlapBody', { logId: overlapId }),
          [{ text: tc('nav.ok') }]
        );
        return;
      }

      xml = generateElogXml(log, captainProfile);

      const validation = validateElogXml(xml, log.subformId ?? 90);
      if (!validation.valid) {
        Alert.alert(
          t('logs.validationFailedTitle'),
          `${t('logs.validationFailedBody')}${validation.errors.join('\n')}`,
          [{ text: tc('nav.ok') }]
        );
        return;
      }

      // File name: [RegionalID]-[LicenceNumber]-[UTC timestamp].XML (Standard v6.1 §3.10)
      fileName = generateDfoXmlFileName(log.regId ?? 1004, captainProfile.dfoLicenceNo);
      soap = generateSoapEnvelope(xml, captainProfile.elogKey, fileName);

      if (!DFO_ELOG_ENDPOINT) {
        throw Object.assign(
          new Error('DFO endpoint URL not yet configured. Awaiting credentials from Jennifer Mooney (Ticket #2126).'),
          { code: 'NO_ENDPOINT' }
        );
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
      let httpStatus = 0;
      let responseBody = '';
      try {
        const response = await fetch(DFO_ELOG_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': `"${DFO_SOAP_ACTION_SAVE}"`,
          },
          body: soap,
          signal: controller.signal,
        });
        httpStatus = response.status;
        responseBody = await response.text();
      } finally {
        clearTimeout(timer);
      }

      // HTTP 4xx / 5xx
      if (httpStatus >= 400) {
        await saveFailureRecord(httpStatus, `HTTP ${httpStatus}`);
        setFailedSends(prev => ({ ...prev, [log.id]: `HTTP ${httpStatus}` }));
        Alert.alert(
          t('logs.serverErrorTitle'),
          t('logs.serverErrorBody', { status: httpStatus }),
          [{ text: tc('nav.ok') }]
        );
        return;
      }

      // HTTP 200 — parse DFO application response
      const result = parseDfoSoapResponse(responseBody);
      if (!result.success) {
        const detail = [
          result.errorCode && `Error ${result.errorCode}`,
          result.errorMessage,
        ].filter(Boolean).join(': ');
        await saveFailureRecord(httpStatus, detail);
        setFailedSends(prev => ({ ...prev, [log.id]: result.errorCode ?? 'DFO error' }));
        Alert.alert(
          t('logs.rejectedTitle'),
          t('logs.rejectedBody', { detail }),
          [{ text: tc('nav.ok') }]
        );
        return;
      }

      // Success
      const record: TransmissionRecord = {
        id: log.id,
        logId: log.id,
        attemptedAt: Date.now(),
        outcome: 'success',
        httpStatus,
        fileName,
        ...(result.conf && { confNumber: result.conf }),
        xmlSnapshot: xml,
        soapSnapshot: soap,
      };
      await saveTransmissionRecord(record);
      await saveXmlArchiveEntry({ logId: log.id, savedAt: Date.now(), xml });
      await markSentToDfo(log.id);
      setFailedSends(prev => { const n = { ...prev }; delete n[log.id]; return n; });
      Alert.alert(t('logs.submittedTitle'), t('logs.submittedBody', { id: log.id }), [{ text: tc('nav.ok') }]);
      refresh();

    } catch (e: any) {
      const isTimeout = e.name === 'AbortError';
      const errMsg: string = e.message ?? 'Unknown error';
      await saveFailureRecord(undefined, errMsg);
      setFailedSends(prev => ({ ...prev, [log.id]: isTimeout ? 'Timeout' : 'Not sent' }));
      if (isTimeout) {
        Alert.alert(
          t('logs.timeoutTitle'),
          t('logs.timeoutBody'),
          [{ text: tc('nav.ok') }]
        );
      } else {
        Alert.alert(t('logs.submissionFailedTitle'), errMsg, [{ text: tc('nav.ok') }]);
      }
    } finally {
      setSendingLogs(prev => { const n = new Set(prev); n.delete(log.id); return n; });
    }
  };

  const handleSendToDfo = (log: DfoLog) => {
    if (log.sentToDfo || sendingLogs.has(log.id)) return;
    const isRetry = !!failedSends[log.id];
    Alert.alert(
      isRetry ? t('logs.retryConfirmTitle') : t('logs.sendConfirmTitle'),
      t('logs.sendConfirmBody', { id: log.id }),
      [
        { text: tc('nav.cancel'), style: 'cancel' },
        { text: isRetry ? t('logs.retry') : t('logs.sendButton'), style: 'default', onPress: () => doSubmit(log) },
      ]
    );
  };

  const handleDeleteDraft = (logId: string) => {
    Alert.alert(
      t('logs.deleteDraftTitle'),
      t('logs.deleteDraftBody'),
      [
        { text: tc('nav.cancel'), style: 'cancel' },
        {
          text: tc('nav.delete'),
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
    const { filled, total, pct } = getCompletionDetails(log);
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

        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: '#2563EB' }]} />
        </View>
        <Text style={styles.progressLabel}>{t('logs.draftProgressDetail', { filled, total, pct })}</Text>

        <View style={styles.logActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEditLog(log.id)}
          >
            <Edit3 size={15} color="#1E3A8A" />
            <Text style={styles.editButtonText}>{tc('nav.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteDraft(log.id)}
          >
            <Trash2 size={15} color="#B45309" />
            <Text style={styles.deleteButtonText}>{tc('nav.delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCompletedCard = (log: DfoLog) => {
    const sent = log.sentToDfo === true;
    const isSending = sendingLogs.has(log.id);
    const failError = failedSends[log.id];

    return (
      <View key={log.id} style={[styles.logCard, !!failError && styles.logCardFailed]}>
        <Text style={styles.logId}>{log.id}</Text>
        <Text style={styles.logDate}>{log.dateFished}</Text>

        {!sent && renderCountdown(log)}

        {failError && (
          <View style={styles.failedBadge}>
            <Text style={styles.failedBadgeText}>{t('logs.lastSendFailed', { error: failError })}</Text>
          </View>
        )}

        <View style={styles.logActions}>
          {sent ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => onViewLog(log.id)}
            >
              <Eye size={16} color="#1E3A8A" />
              <Text style={styles.editButtonText}>{t('logs.viewButton')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => onEditLog(log.id)}
            >
              <Edit3 size={16} color="#1E3A8A" />
              <Text style={styles.editButtonText}>{tc('nav.edit')}</Text>
            </TouchableOpacity>
          )}

          {sent ? (
            <View style={styles.sentButton}>
              <CheckCircle size={16} color="#64748B" />
              <Text style={styles.sentButtonText}>{t('logs.sentConfirmed')}</Text>
            </View>
          ) : isSending ? (
            <View style={styles.sendingButton}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.sendButtonText}>{t('logs.sending')}</Text>
            </View>
          ) : failError ? (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => handleSendToDfo(log)}
            >
              <RotateCcw size={16} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>{t('logs.retry')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => handleSendToDfo(log)}
            >
              <Send size={16} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>{t('logs.sendToDfo')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const isEmpty = !loading && drafts.length === 0 && completed.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.pillButton}
          onPress={() => setCaptainProfileVisible(true)}
        >
          <User size={14} color="#1E3A8A" />
          <Text style={styles.pillButtonText}>{t('logs.profileButton')}</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('logs.headerTitle')}</Text>

        <TouchableOpacity
          style={styles.pillButtonShield}
          onPress={() => setInspectionModeVisible(true)}
        >
          <Shield size={14} color="#FFFFFF" />
          <Text style={styles.pillButtonShieldText}>{t('logs.inspectButton')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <TouchableOpacity style={styles.newLogButton} onPress={onNewLog}>
          <Plus size={22} color="#FFFFFF" />
          <Text style={styles.newLogButtonText}>{t('logs.newElogButton')}</Text>
        </TouchableOpacity>

        <View style={styles.secondaryButtons}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setForm222Visible(true)}
          >
            <Text style={styles.secondaryButtonText}>{t('logs.form222Button')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setForm233Visible(true)}
          >
            <Text style={styles.secondaryButtonText}>{t('logs.form233Button')}</Text>
          </TouchableOpacity>
        </View>

        {isEmpty && (
          <View style={styles.emptyState}>
            <FileText size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>{t('logs.noLogs')}</Text>
            <Text style={styles.emptySub}>
              {t('logs.emptySubtitle')}
            </Text>
          </View>
        )}

        {drafts.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>{t('logs.inProgress')}</Text>
            {drafts.map(renderDraftCard)}
          </>
        )}

        {completed.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, drafts.length > 0 && { marginTop: 16 }]}>
              {t('logs.completedLogs')}
            </Text>
            {completed.map(renderCompletedCard)}
          </>
        )}
      </ScrollView>

      {/* ── Captain Profile Modal ── */}
      <Modal
        visible={captainProfileVisible}
        animationType="slide"
        onRequestClose={() => setCaptainProfileVisible(false)}
      >
        <CaptainProfileScreen onClose={() => setCaptainProfileVisible(false)} />
      </Modal>

      {/* ── Inspection Mode Modal ── */}
      <Modal
        visible={inspectionModeVisible}
        animationType="fade"
        onRequestClose={() => setInspectionModeVisible(false)}
      >
        <InspectionModeScreen onClose={() => setInspectionModeVisible(false)} />
      </Modal>

      {/* ── Form 222 · Marine Mammal Modal ── */}
      <Modal
        visible={form222Visible}
        animationType="slide"
        onRequestClose={() => setForm222Visible(false)}
      >
        <Form222Screen onClose={() => setForm222Visible(false)} />
      </Modal>

      {/* ── Form 233 · Inactivity Modal ── */}
      <Modal
        visible={form233Visible}
        animationType="slide"
        onRequestClose={() => setForm233Visible(false)}
      >
        <Form233Screen onClose={() => setForm233Visible(false)} />
      </Modal>

      {/* ── Privacy Notice — one-time before DFO access ── */}
      <Modal
        visible={privacyChecked && !privacyAccepted}
        animationType="fade"
        transparent={false}
        onRequestClose={() => {}}
      >
        <PrivacyNoticeModal
          onAccept={async () => {
            await savePrivacyAccepted();
            setPrivacyAccepted(true);
          }}
          onDecline={() => {
            if (Platform.OS === 'android') {
              BackHandler.exitApp();
            } else {
              Alert.alert(
                t('privacy.title'),
                'You must accept the Privacy Notice to use DFO features.',
                [{ text: 'OK' }]
              );
            }
          }}
        />
      </Modal>

      {/* ── Harvester Attestation — once per session ── */}
      <Modal
        visible={privacyChecked && privacyAccepted && !attestationDone}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {}}
      >
        <AttestationModal
          onAgree={() => {
            attestationShownThisSession = true;
            setAttestationDone(true);
          }}
        />
      </Modal>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: '700',
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  pillButtonText: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '700',
  },
  pillButtonShield: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DC2626',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillButtonShieldText: {
    color: '#FFFFFF',
    fontSize: 13,
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
  logCardFailed: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  failedBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  failedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B91C1C',
  },
  sendingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#64748B',
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#B91C1C',
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    marginTop: -14,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  secondaryButtonText: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default DfoLogsListScreen;