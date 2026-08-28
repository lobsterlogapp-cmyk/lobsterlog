import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Plus, FileText, Send, Edit3, Eye, Trash2, CheckCircle, User, Shield, RotateCcw, Archive, HelpCircle } from 'lucide-react-native';
import HelpSupportScreen from './HelpSupportScreen';
import { loadAllLogs, deleteLog, markSentToDfo, DfoLog, saveTransmissionRecord, TransmissionRecord, SendFailureKind, SEND_FAILURE_BADGE_KEY, SEND_FAILURE_SHEET_KEY, isSendFailureKind, saveXmlArchiveEntry, loadTransmissionRegister, transmissionKind, unclosedUsedGroupKeys, logsOwingForm222, getCompletionDetails } from '../utils/dfoLogStorage';
import { useTimer } from '../context/TimerContext';
import { triggerBackup } from '../utils/dfoBackup';
import { SentLogCard, SentLogDetailModal, indexSuccessRecords, indexFailureRecords } from '../components/SentLogCard';
import { FormSentCard } from '../components/FormSentCard';
import { generateElogXml, generateSoapEnvelope, generateReportUid, validateElogXml, hailGateSections, generateUniqueDfoXmlFileName, findEffortOverlap, DFO_SOAP_ACTION_SAVE, DFO_UAT_ENDPOINT } from '../utils/dfoXmlGenerator';
import { parseDfoSoapResponse, isValidFormVrn, failureDetailFor } from '../utils/submitDfoXml';
// S125 7b: send a CLOSED-unsent form from its list card (send moved off the form).
import { sendForm222Entry, sendForm233Entry } from '../utils/sendFormEntry';
import { loadCaptainProfile, loadPrivacyAccepted, savePrivacyAccepted, isProfileComplete } from '../utils/captainStorage';
import CaptainProfileScreen from './CaptainProfileScreen';
import InspectionModeScreen from './InspectionModeScreen';
import Form222Screen from './Form222Screen';
import Form233Screen from './Form233Screen';
// S125 7c: the list reads + deletes parked form DRAFTS (first structured reader of these stores).
import { Form222Entry, loadForm222Entries, deleteForm222Entry } from '../utils/dfoForm222Generator';
import { Form233Entry, loadForm233Entries, deleteForm233Entry } from '../utils/dfoForm233Generator';
import PrivacyNoticeModal from './PrivacyNoticeModal';
import AttestationModal from './AttestationModal';

let attestationShownThisSession = false;

// S125 Phase 9: dgClose* data-group key → the i18n key of its ON-SCREEN card name (the exact words
// the harvester sees on the Close & Save controls). Used to name the sections in the send guard's
// refusal (ruling 1 — never internal keys). Same title keys the renderCloseControl calls pass.
const CLOSE_SECTION_NAME_KEY: Record<string, string> = {
  dgCloseEffort: 'form234.catchEffortSection',
  dgCloseLanding: 'form234.landingSection',
  dgCloseBaitUsed: 'form234.baitReportingSection',
  dgClosePconsBycatch: 'form234.bycatchSubsection',
  dgClosePconsPersonal: 'form234.personalUseSection',
  dgCloseSar: 'form234.sarSubsection',
  dgCloseTransfer: 'form234.transfersSubsection',
  dgCloseHlin: 'form234.hlinSection',
  dgCloseHlout: 'form234.hloutSection',
};

// --- Completion % --- (S141 P4: the screen's own proposal-era field list and its two local
// meter functions are RETIRED — getCompletionDetails now comes from dfoLogStorage, driven by
// the shared requirements table, so the bar and the form's Close-&-Save-All button agree.)

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

// --- DFO submission constants ---
// parseDfoSoapResponse now lives in ../utils/submitDfoXml (shared with the form screens).

const SEND_TIMEOUT_MS = 30000;

interface DfoLogsListScreenProps {
  onNewLog: () => void;
  onEditLog: (logId: string) => void;
  onViewLog: (logId: string) => void;
  onOpenHistory: () => void;
  refreshKey?: number;
  // Kept for the App.tsx call site; currently unused here (its sole consumer, the
  // XML Test Harness button, was removed in S121 — DfoTestHarnessScreen.tsx stays on disk).
  isAdmin?: boolean;
}

// Cap the SENT logs shown on the main screen; the full archive lives in Log History.
const SENT_DISPLAY_CAP = 30;

const DfoLogsListScreen: React.FC<DfoLogsListScreenProps> = ({
  onNewLog,
  onEditLog,
  onViewLog,
  onOpenHistory,
  refreshKey = 0,
  isAdmin = false,
}) => {
  const { t, i18n } = useTranslation('dfo');
  const { t: tc } = useTranslation('common');
  const isFr = i18n.language.startsWith('fr');
  const { clearTimersForLog } = useTimer(); // S124: wipe a deleted log's running timers

  const [drafts, setDrafts] = useState<DfoLog[]>([]);
  const [completed, setCompleted] = useState<DfoLog[]>([]);
  const [successRecords, setSuccessRecords] = useState<Record<string, TransmissionRecord>>({});
  const [failureRecords, setFailureRecords] = useState<TransmissionRecord[]>([]);
  const [register, setRegister] = useState<TransmissionRecord[]>([]);
  const [detailLog, setDetailLog] = useState<DfoLog | null>(null);
  const [detailRecord, setDetailRecord] = useState<TransmissionRecord | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [captainProfileVisible, setCaptainProfileVisible] = useState(false);
  const [inspectionModeVisible, setInspectionModeVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false); // S121 Phase 3 — Help & Support
  const [form222Visible, setForm222Visible] = useState(false);
  const [form233Visible, setForm233Visible] = useState(false);
  // S125 7c/7b: parked form DRAFTS and CLOSED-unsent entries, kept in their OWN state — NEVER
  // merged into drafts/completed (that would make handleNewLogPress's 234-only guards see them;
  // rulings 1 & 2). Display-only.
  const [form222Drafts, setForm222Drafts] = useState<Form222Entry[]>([]);
  const [form233Drafts, setForm233Drafts] = useState<Form233Entry[]>([]);
  const [form222Closed, setForm222Closed] = useState<Form222Entry[]>([]);
  const [form233Closed, setForm233Closed] = useState<Form233Entry[]>([]);
  // Which parked draft to open (undefined = a fresh, EMPTY form — the trap fix).
  const [form222EntryUid, setForm222EntryUid] = useState<string | undefined>(undefined);
  const [form233EntryUid, setForm233EntryUid] = useState<string | undefined>(undefined);
  // S137 Phase 6: the logs owing a marine-mammal declaration (rulings R-D/R-E/R-F), computed
  // live in refresh() from BOTH stores. Non-empty ⇒ the Form 222 button renders red.
  const [owed222, setOwed222] = useState<DfoLog[]>([]);
  // S137 Phase 6 (R-J): when exactly ONE log owes, the red button hands its lgbkUid to the
  // 222 screen so the logbook-reference prefill names the owing log instead of the
  // most-recent-completed guess. Every other open path passes undefined (unchanged behavior).
  const [form222PrefillUid, setForm222PrefillUid] = useState<string | undefined>(undefined);
  // S125 7a: each form screen registers its park-then-close handler here so the Modal's
  // onRequestClose (Android hardware back) routes through the SAME single exit path as "← Back".
  // Fallback (before the screen registers, or if it doesn't) just hides + refreshes.
  const form222CloseRef = useRef<() => void>(() => { setForm222Visible(false); refresh(); });
  const form233CloseRef = useRef<() => void>(() => { setForm233Visible(false); refresh(); });
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
    const register = await loadTransmissionRegister();
    setRegister(register);
    setSuccessRecords(indexSuccessRecords(register));
    setFailureRecords(indexFailureRecords(register));
    // S125 7c/7b: split the form stores into DRAFT and CLOSED-unsent buckets. Sent 222/233 keep
    // rendering from the transmission register via FormSentCard — the arrays are NOT read for sent
    // rows. Nothing is invisible (ruling 2): a not-sent record is a DRAFT unless it is complete AND
    // carries a closeDt (a real Close & Save) — the anomaly 'complete' && no-closeDt stays a DRAFT.
    const isClosedUnsent = (e: { status?: string; sentToDfo?: boolean; closeDt?: string }) =>
      e.sentToDfo !== true && e.status === 'complete' && !!e.closeDt;
    const isFormDraft = (e: { status?: string; sentToDfo?: boolean; closeDt?: string }) =>
      e.sentToDfo !== true && !isClosedUnsent(e);
    const [f222, f233] = await Promise.all([loadForm222Entries(), loadForm233Entries()]);
    setForm222Drafts(f222.filter(isFormDraft));
    setForm233Drafts(f233.filter(isFormDraft));
    setForm222Closed(f222.filter(isClosedUnsent));
    setForm233Closed(f233.filter(isClosedUnsent));
    // S137 Phase 6: both stores are in hand — compute the owed set over ALL logs (sent logs
    // are complete, so they stay in; R-D(b)). The selector is single-sourced in dfoLogStorage.
    setOwed222(logsOwingForm222(all, f222));
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

    // S148 defect 87 / R-A: wsErrCode is written ONLY when DFO actually sent a code. The HTTP
    // 4xx/5xx and timeout/network callers pass nothing, so the sheet's "DFO response code" row
    // honestly renders a dash rather than a code this app invented.
    const saveFailureRecord = async (
      httpStatus: number | undefined,
      errorMessage: string,
      failureKind: SendFailureKind,
      wsErrCode?: string,
    ) => {
      const record: TransmissionRecord = {
        id: log.id,
        logId: log.id,
        attemptedAt: Date.now(),
        outcome: 'failure',
        kind: 'logbook',
        ...(httpStatus !== undefined && { httpStatus }),
        errorMessage,
        failureKind,
        ...(wsErrCode && { wsErrCode }),
        ...(fileName && { fileName }),
        xmlSnapshot: xml,
        soapSnapshot: soap,
      };
      await saveTransmissionRecord(record);
    };

    try {
      const captainProfile = await loadCaptainProfile();

      // Captain Profile must be complete before anything can be sent to DFO.
      const profileCheck = isProfileComplete(captainProfile);
      if (!profileCheck.complete) {
        const missingList = profileCheck.missing.map(k => `• ${tc(k)}`).join('\n');
        Alert.alert(
          t('sendGate.title'),
          `${t('sendGate.body')}\n\n${missingList}`,
          [
            { text: tc('nav.cancel'), style: 'cancel' },
            { text: t('sendGate.openProfile'), onPress: () => setCaptainProfileVisible(true) },
          ]
        );
        return;
      }

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

      // S125 Phase 9: refuse the send if a USED data group carries no real close stamp — loud, not
      // lossy (the removed now() fallback would have fabricated a close the harvester never made).
      // Names the sections still needing closing, in the app's own card words. Same "used" formula
      // as the Close & Save controls (unclosedUsedGroupKeys → usedDataGroupKeys). The validator below
      // is a second net; this is the clear message.
      const unclosed = unclosedUsedGroupKeys(log);
      if (unclosed.length > 0) {
        const sections = unclosed.map(k => t(CLOSE_SECTION_NAME_KEY[k])).filter(Boolean).join(', ');
        Alert.alert(t('logs.unclosedGroupsTitle'), t('logs.unclosedGroupsBody', { sections }), [{ text: tc('nav.ok') }]);
        return;
      }

      xml = generateElogXml(log, captainProfile);

      const validation = validateElogXml(xml, log.subformId ?? 90);
      // S142 defect 52: the validator now refuses a 38b/41 MAR log with no hail (Rules
      // 2024/2025) and a hail group whose company code is missing. Both are the same job
      // from the deck — finish the hail card — so they share ONE message in the harvester's
      // own words, named by the card headings, instead of the developer-worded error list.
      const hailSections = hailGateSections(validation.errors).map(k => t(CLOSE_SECTION_NAME_KEY[k]));
      if (hailSections.length > 0) {
        Alert.alert(
          t('logs.hailRequiredTitle'),
          t('logs.hailRequiredBody', { sections: hailSections.join(', ') }),
          [{ text: tc('nav.ok') }]
        );
        return;
      }
      if (!validation.valid) {
        Alert.alert(
          t('logs.validationFailedTitle'),
          `${t('logs.validationFailedBody')}${validation.errors.join('\n')}`,
          [{ text: tc('nav.ok') }]
        );
        return;
      }

      // File name: [RegionalID]-[LicenceNumber]-[UTC timestamp].XML (Standard v6.1 §3.10).
      // S128 Phase 3: never reuse a name this account has already sent — the register holds
      // every prior file name (success + failure); advance the second past any collision.
      const usedNames = (await loadTransmissionRegister()).map(r => r.fileName).filter(Boolean) as string[];
      fileName = generateUniqueDfoXmlFileName(log.regId ?? 1004, captainProfile.fishingNumber, usedNames);
      soap = generateSoapEnvelope(xml, captainProfile.elogKey, fileName);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
      let httpStatus = 0;
      let responseBody = '';
      try {
        // ⚠️ LIVE UAT TRANSMISSION — this really POSTs the logbook to DFO's UAT server.
        const response = await fetch(DFO_UAT_ENDPOINT, {
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
        // R-D condition 1 — shares 'unclear' with condition 3 by ruling. The HTTP number itself
        // is not lost: it stays in errorMessage, the raw technical row, and in httpStatus.
        await saveFailureRecord(httpStatus, `HTTP ${httpStatus}`, 'unclear');
        setFailedSends(prev => ({ ...prev, [log.id]: 'unclear' }));
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
        // result.errCode — DFO's own code only (R-A). result.errorCode may be an app marker
        // (SOAP_FAULT / NO_CONF / NO_WS_RESP) and is deliberately NOT passed here.
        const failureKind = result.failureKind ?? 'unclear';
        await saveFailureRecord(httpStatus, detail, failureKind, result.errCode);
        // S148 defect 84: the hardcoded English literal 'DFO error' is gone. The card stores a
        // language-neutral marker and translates it at the render site.
        setFailedSends(prev => ({ ...prev, [log.id]: failureKind }));
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
        kind: 'logbook',
        httpStatus,
        fileName,
        ...(result.conf && { confNumber: result.conf }),
        // §13.3.1 register snapshot captured at send time (Session 60)
        ...(captainProfile.vesselNumber && { vrn: captainProfile.vesselNumber }),
        ...(log.tripNum !== undefined && { tripNum: log.tripNum }),
        xsdValid: validation.valid,
        ...(result.errCode && { wsErrCode: result.errCode }),
        xmlSnapshot: xml,
        soapSnapshot: soap,
      };
      await saveTransmissionRecord(record);
      await saveXmlArchiveEntry({ logId: log.id, savedAt: Date.now(), xml });
      await markSentToDfo(log.id);
      triggerBackup(); // best-effort cloud backup; fire-and-forget, never blocks the send
      setFailedSends(prev => { const n = { ...prev }; delete n[log.id]; return n; });
      Alert.alert(t('logs.submittedTitle'), t('logs.submittedBody', { id: log.id }), [{ text: tc('nav.ok') }]);
      refresh();

    } catch (e: any) {
      const isTimeout = e.name === 'AbortError';
      // S148 E2 — was `e.message`, which on our own AbortController abort is the single word
      // 'Aborted'. That is what the sheet's "Error" / « Erreur » row showed a boarding officer on
      // every timed-out logbook send: one word that does not say what happened. Both send paths
      // now share failureDetailFor, so they cannot store different sentences for the same event.
      // Still raw, still English, still untranslated — this row is evidence, not a message (R-E).
      const errMsg: string = failureDetailFor(e);
      // R-D conditions 4 and 5. No DFO code exists on either path, so none is written (R-A).
      await saveFailureRecord(undefined, errMsg, isTimeout ? 'timeout' : 'notSent');
      // S146 defect 83: store a language-neutral marker, never a translated word — the badge
      // translates at the render site so a mid-session language change updates it.
      setFailedSends(prev => ({ ...prev, [log.id]: isTimeout ? 'timeout' : 'notSent' }));
      if (isTimeout) {
        Alert.alert(
          t('logs.timeoutTitle'),
          t('logs.timeoutBody'),
          [{ text: tc('nav.ok') }]
        );
      } else {
        // S148 defect 84: the body used to be the platform's raw English sentence and nothing
        // else, under a French title. Plain words in the harvester's own language first, then the
        // raw technical detail kept complete underneath for the officer (R-E).
        Alert.alert(
          t('logs.submissionFailedTitle'),
          `${t('logs.sheetFailedNotSent')}\n\n${errMsg}`,
          [{ text: tc('nav.ok') }]
        );
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
            await clearTimersForLog(logId); // S124: don't let this log's timers bleed onto the next
            refresh();
          },
        },
      ]
    );
  };

  // S125 Phase 8: delete a completed-UNSENT 234 log from its card. NAMES the log (ruling 1 —
  // logId + dateFished interpolated, never a generic "this log") so the fisherman confirms the
  // right one; calls clearTimersForLog exactly like the draft delete (S124 — no timer bleed onto
  // the next log); confirm-only, no type-to-confirm (ruling 3).
  const handleDeleteCompleted = (log: DfoLog) => {
    Alert.alert(
      t('logs.deleteLogTitle'),
      t('logs.deleteLogBody', { logId: log.id, dateFished: log.dateFished }),
      [
        { text: tc('nav.cancel'), style: 'cancel' },
        {
          text: tc('nav.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteLog(log.id);
            await clearTimersForLog(log.id);
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
            {/* LGBK_UID surface (S116 P3) — the value the 222/233 reference boxes want.
                Rendered only when present: no stray label beside nothing. */}
            {!!log.lgbkUid && (
              <Text style={styles.draftUidLine}>{`${t('logs.elogUidLabel')} · ${log.lgbkUid}`}</Text>
            )}
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

  // S125 7c: delete a parked form draft — same confirm as the 234 draft (reused generic strings,
  // destructive non-default button). deleteForm22xEntry landed in 7a; refresh re-reads the list.
  const handleDeleteFormDraft = (kind: 'form222' | 'form233', uid: string) => {
    Alert.alert(
      t('logs.deleteDraftTitle'),
      t('logs.deleteDraftBody'),
      [
        { text: tc('nav.cancel'), style: 'cancel' },
        {
          text: tc('nav.delete'),
          style: 'destructive',
          onPress: async () => {
            if (kind === 'form222') await deleteForm222Entry(uid);
            else await deleteForm233Entry(uid);
            refresh();
          },
        },
      ],
    );
  };

  // S125 7c: amber draft card for a parked 222/233 — form name + date + SAVED TIME (required:
  // two same-day 222 drafts default reportDate to today, so the time is what tells them apart) +
  // Edit/Delete. No percent/progress bar (forms have no completion map), no opaque uid.
  const renderFormDraftCard = (kind: 'form222' | 'form233', entry: Form222Entry | Form233Entry) => {
    const title = t(kind === 'form222' ? 'logs.regForm222Title' : 'logs.regForm233Title');
    const dateLine = kind === 'form222'
      ? (entry as Form222Entry).reportDate
      : [(entry as Form233Entry).periodStartDate, (entry as Form233Entry).periodEndDate].filter(Boolean).join(' – ');
    const savedWhen = new Date(entry.savedAt).toLocaleString(isFr ? 'fr-CA' : 'en-CA',
      { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const open = () => {
      if (kind === 'form222') { setForm222EntryUid(entry.uid); setForm222PrefillUid(undefined); setForm222Visible(true); }
      else { setForm233EntryUid(entry.uid); setForm233Visible(true); }
    };
    return (
      <View key={`${kind}-${entry.uid}`} style={styles.draftCard}>
        <View style={styles.draftCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.draftId}>{title}</Text>
            {!!dateLine && <Text style={styles.draftDate}>{dateLine}</Text>}
            <Text style={styles.draftUidLine}>{t('logs.formSavedAt', { when: savedWhen })}</Text>
          </View>
        </View>
        <View style={styles.logActions}>
          <TouchableOpacity style={styles.editButton} onPress={open}>
            <Edit3 size={15} color="#1E3A8A" />
            <Text style={styles.editButtonText}>{tc('nav.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteFormDraft(kind, entry.uid)}>
            <Trash2 size={15} color="#B45309" />
            <Text style={styles.deleteButtonText}>{tc('nav.delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // S125 7b: send a CLOSED-unsent form from its card. Loads the profile, enforces Rule 528 (222
  // VRN mandatory / 233 only when present), then delegates to the UI-free sendForm22xEntry (which
  // owns generate/validate/envelope/submitDfoXml + the register on success AND failure). A failed
  // send leaves the closed-unsent card in place (submitDfoXml wrote a failure row; entry unchanged).
  const handleSendForm = async (kind: 'form222' | 'form233', entry: Form222Entry | Form233Entry) => {
    if (sendingLogs.has(entry.uid)) return;
    const isF222 = kind === 'form222';
    const failTitle = t(isF222 ? 'form222.submissionFailedTitle' : 'form233.submissionFailedTitle');
    const unknown = t(isF222 ? 'form222.unknownError' : 'form233.unknownError');
    const profile = await loadCaptainProfile();
    const vrn = (profile.vesselNumber ?? '').trim();
    const vrnBad = isF222 ? !isValidFormVrn(vrn) : (!!vrn && !isValidFormVrn(vrn));
    if (vrnBad) { Alert.alert(t('sendGate.vrnRule528Title'), t('sendGate.vrnRule528')); return; }
    setSendingLogs(prev => new Set(prev).add(entry.uid));
    try {
      const result = isF222
        ? await sendForm222Entry(entry as Form222Entry, profile)
        : await sendForm233Entry(entry as Form233Entry, profile);
      if (!result.ok) {
        // PHASE 4 (S148) — the validation-refusal path. The logbook has shown a plain-words heading
        // above its raw validator list since long before this; the form path showed the bare list
        // under "Submission Failed" and nothing else. It now gets the same treatment, using the
        // form's OWN long-orphaned keys so each form names itself correctly: the logs.* pair the
        // prompt named says « Le journal JBE » — the LOGBOOK — which would be false here.
        if (result.validationErrors?.length) {
          Alert.alert(
            t(isF222 ? 'form222.validationFailedTitle' : 'form233.validationFailedTitle'),
            `${t(isF222 ? 'form222.validationFailed' : 'form233.validationFailed')}\n\n${result.validationErrors.join('\n')}`,
            [{ text: tc('nav.ok') }]
          );
          return;
        }
        // PHASE 3 (S148) defect 84, forms half — a real send failure. Plain words in the
        // harvester's own language first, from the same marker the card badge and the sheet read,
        // then the raw technical detail underneath, complete and untranslated, for the officer.
        const detail = [
          result.errCode && `Error ${result.errCode}`,
          result.httpStatus && `HTTP ${result.httpStatus}`,
          result.errorMessage,
        ].filter(Boolean).join('\n');
        const plain = isSendFailureKind(result.failureKind)
          ? t(SEND_FAILURE_SHEET_KEY[result.failureKind])
          : '';
        Alert.alert(failTitle, [plain, detail || unknown].filter(Boolean).join('\n\n'), [{ text: tc('nav.ok') }]);
        return;
      }
      Alert.alert(t(isF222 ? 'form222.submittedTitle' : 'form233.submittedTitle'), t(isF222 ? 'form222.submitSuccess' : 'form233.submitSuccess'));
    } catch (e: any) {
      Alert.alert(failTitle, e?.message ?? unknown);
    } finally {
      setSendingLogs(prev => { const n = new Set(prev); n.delete(entry.uid); return n; });
      refresh();
    }
  };

  // S125 7b: CLOSED-unsent form card — form name + date + Closed banner + Send + Delete (ruling 5:
  // no Edit once closed). Mirrors renderFormDraftCard; Send styling reused from the 234 card.
  const renderFormClosedCard = (kind: 'form222' | 'form233', entry: Form222Entry | Form233Entry) => {
    const title = t(kind === 'form222' ? 'logs.regForm222Title' : 'logs.regForm233Title');
    const dateLine = kind === 'form222'
      ? (entry as Form222Entry).reportDate
      : [(entry as Form233Entry).periodStartDate, (entry as Form233Entry).periodEndDate].filter(Boolean).join(' – ');
    const closedWhen = entry.closeDt
      ? new Date(entry.closeDt).toLocaleString(isFr ? 'fr-CA' : 'en-CA',
          { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
    const isSending = sendingLogs.has(entry.uid);
    // S125 8a: derive the failed-send state from the PERSISTED register by this card's own record id
    // (FORM222-/FORM233-<uid>) — survives an app restart, unlike the 234's in-memory failedSends. A
    // still-closed-unsent entry with a failure record means the last attempt failed (a success would
    // have flipped sentToDfo → out of this bucket). Reuses the 234 card's failed treatment verbatim.
    const recordId = `${kind === 'form222' ? 'FORM222' : 'FORM233'}-${entry.uid}`;
    // S148 defect 85: this badge used to show the stored ENGLISH technical string inline, on a
    // French screen as readily as an English one. It now reads the language-neutral marker off the
    // same persisted record and translates it here (R-F). A record written before S148 has no
    // marker, so it falls back to what it always showed — never blank (R-E).
    const lastFailure = register
      .filter(r => r.logId === recordId && r.outcome === 'failure')
      .pop();
    const failError = lastFailure
      ? (isSendFailureKind(lastFailure.failureKind)
          ? t(SEND_FAILURE_BADGE_KEY[lastFailure.failureKind])
          : (lastFailure.errorMessage || lastFailure.wsErrCode || ''))
      : '';
    return (
      <View key={`closed-${kind}-${entry.uid}`} style={[styles.logCard, !!failError && styles.logCardFailed]}>
        <Text style={styles.logId}>{title}</Text>
        {!!dateLine && <Text style={styles.logDate}>{dateLine}</Text>}
        {!!closedWhen && <Text style={styles.logUidLine}>{t('form234.closedAtLabel', { time: closedWhen })}</Text>}
        {!!failError && (
          <View style={styles.failedBadge}>
            <Text style={styles.failedBadgeText}>{t('logs.lastSendFailed', { error: failError })}</Text>
          </View>
        )}
        {/* S125 7d/8a: row 1 = Send to DFO full-width primary — or a red Retry when the last attempt
            failed (matches the 234 card). Row 2 = Review + Delete. */}
        <View style={styles.logActions}>
          {isSending ? (
            <View style={styles.sendingButton}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.sendButtonText}>{t('logs.sending')}</Text>
            </View>
          ) : failError ? (
            <TouchableOpacity style={styles.retryButton} onPress={() => handleSendForm(kind, entry)} activeOpacity={0.8}>
              <RotateCcw size={16} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>{t('logs.retry')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.sendButton} onPress={() => handleSendForm(kind, entry)} activeOpacity={0.8}>
              <Send size={16} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>{t('logs.sendToDfo')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.logActions, { marginTop: 8 }]}>
          {/* Review opens the closed entry read-only by uid (the lock is derived from its stored
              closeDt on the screen's mount — no new read-only mode). No Edit (ruling 5). */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              if (kind === 'form222') { setForm222EntryUid(entry.uid); setForm222PrefillUid(undefined); setForm222Visible(true); }
              else { setForm233EntryUid(entry.uid); setForm233Visible(true); }
            }}
          >
            <Eye size={15} color="#1E3A8A" />
            <Text style={styles.editButtonText}>{t('logs.reviewButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteFormDraft(kind, entry.uid)}>
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
    // S146 defect 83 started this; S148 finishes it. ALL FOUR failure conditions now store a
    // language-neutral marker and it is translated HERE, at the render site, so a mid-session
    // language change re-renders the badge (R-F). The two writers that used to store raw technical
    // strings — `HTTP 500` and the hardcoded English 'DFO error' — are gone (defect 84). The
    // fallback keeps any unrecognised value rendering as itself rather than as a blank badge.
    const failLabel = isSendFailureKind(failError) ? t(SEND_FAILURE_BADGE_KEY[failError]) : failError;

    return (
      <View key={log.id} style={[styles.logCard, !!failError && styles.logCardFailed]}>
        <Text style={styles.logId}>{log.id}</Text>
        <Text style={styles.logDate}>{log.dateFished}</Text>
        {/* LGBK_UID surface (S116 P3) — rendered only when present */}
        {!!log.lgbkUid && (
          <Text style={styles.logUidLine}>{`${t('logs.elogUidLabel')} · ${log.lgbkUid}`}</Text>
        )}

        {!sent && renderCountdown(log)}

        {failError && (
          <View style={styles.failedBadge}>
            <Text style={styles.failedBadgeText}>{t('logs.lastSendFailed', { error: failLabel })}</Text>
          </View>
        )}

        {sent ? (
          /* SENT — unchanged single row: View + Sent ✓ (Phase 8 touches only the unsent card). */
          <View style={styles.logActions}>
            <TouchableOpacity style={styles.editButton} onPress={() => onViewLog(log.id)}>
              <Eye size={16} color="#1E3A8A" />
              <Text style={styles.editButtonText}>{t('logs.viewButton')}</Text>
            </TouchableOpacity>
            <View style={styles.sentButton}>
              <CheckCircle size={16} color="#64748B" />
              <Text style={styles.sentButtonText}>{t('logs.sentConfirmed')}</Text>
            </View>
          </View>
        ) : (
          /* S125 Phase 8: completed-UNSENT — two rows (matches 7d's form closed card). Row 1 =
             Send to DFO (or Retry / Sending) full-width primary. Row 2 = Edit / Review + Delete. */
          <>
            <View style={styles.logActions}>
              {isSending ? (
                <View style={styles.sendingButton}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>{t('logs.sending')}</Text>
                </View>
              ) : failError ? (
                <TouchableOpacity style={styles.retryButton} onPress={() => handleSendToDfo(log)}>
                  <RotateCcw size={16} color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>{t('logs.retry')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.sendButton} onPress={() => handleSendToDfo(log)}>
                  <Send size={16} color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>{t('logs.sendToDfo')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.logActions, { marginTop: 8 }]}>
              {/* "Edit / Review" — honest label: closed groups are locked, Trip Information stays
                  editable (Trip is not in CLOSE_DATA_KEYS). Opens the log via the existing edit path. */}
              <TouchableOpacity style={styles.editButton} onPress={() => onEditLog(log.id)}>
                <Edit3 size={16} color="#1E3A8A" />
                <Text style={styles.editButtonText}>{t('logs.editReviewButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteCompleted(log)}>
                <Trash2 size={15} color="#B45309" />
                <Text style={styles.deleteButtonText}>{tc('nav.delete')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  const isEmpty = !loading && drafts.length === 0 && completed.length === 0
    && form222Drafts.length === 0 && form233Drafts.length === 0
    && form222Closed.length === 0 && form233Closed.length === 0;

  // S125 7c: DISPLAY-ONLY merge of 234 drafts + parked form drafts for the IN PROGRESS section,
  // newest-first. The underlying drafts/completed and form-draft arrays stay separate — this array
  // is never read by handleNewLogPress (whose guards must see 234 logs only; rulings 1 & 2).
  type DraftRow =
    | { kind: 'log'; ts: number; log: DfoLog }
    | { kind: 'form222'; ts: number; entry: Form222Entry }
    | { kind: 'form233'; ts: number; entry: Form233Entry };
  const mergedDrafts: DraftRow[] = [
    ...drafts.map((l): DraftRow => ({ kind: 'log', ts: l.createdAt, log: l })),
    ...form222Drafts.map((e): DraftRow => ({ kind: 'form222', ts: e.savedAt, entry: e })),
    ...form233Drafts.map((e): DraftRow => ({ kind: 'form233', ts: e.savedAt, entry: e })),
  ].sort((a, b) => b.ts - a.ts);

  // Unsent completed logs (awaiting send / overdue) are shown in FULL, no cap.
  // Sent logs are capped to the 30 most recent here; Log History holds the full archive.
  // `completed` is already newest-first (loadAllLogs sorts by createdAt desc).
  const completedUnsent = completed.filter(l => l.sentToDfo !== true);
  const sentLogs = completed.filter(l => l.sentToDfo === true);

  // S125 7b: DISPLAY-ONLY merge of 234 completed-unsent + CLOSED-unsent form entries for the
  // COMPLETED LOGS section, newest-first. Separate state underneath (rulings 1 & 2); form rows
  // sort by their close time. Sent form rows are NOT here — they render from the register below.
  type CompletedRow =
    | { kind: 'log'; ts: number; log: DfoLog }
    | { kind: 'form222'; ts: number; entry: Form222Entry }
    | { kind: 'form233'; ts: number; entry: Form233Entry };
  const mergedCompleted: CompletedRow[] = [
    ...completedUnsent.map((l): CompletedRow => ({ kind: 'log', ts: l.createdAt, log: l })),
    ...form222Closed.map((e): CompletedRow => ({ kind: 'form222', ts: e.closeDt ? Date.parse(e.closeDt) : e.savedAt, entry: e })),
    ...form233Closed.map((e): CompletedRow => ({ kind: 'form233', ts: e.closeDt ? Date.parse(e.closeDt) : e.savedAt, entry: e })),
  ].sort((a, b) => b.ts - a.ts);

  // S121 Phase 4 — a completed-but-unsent log warns before starting a new ELOG (the
  // in-progress/draft case is already covered by the S95 restore dialog; this closes the
  // finished-unsent gap). "Review it" stays on the list, where the unsent log card sits.
  const handleNewLogPress = () => {
    if (completedUnsent.length > 0) {
      Alert.alert(
        t('logs.unsentWarnTitle'),
        t('logs.unsentWarnBody'),
        [
          { text: t('logs.unsentWarnReview'), style: 'cancel' },
          { text: t('logs.unsentWarnStartNew'), onPress: onNewLog },
        ],
      );
      return;
    }
    // S123 — an in-progress draft must be reviewed or deleted before a new ELOG can be
    // started (Appendix B TC5 / §12.1: "previous trip data has not been closed … must review
    // before proceeding"). BLOCK, not warn-and-choose: there is no "start new" button here, so
    // a second stacked draft cannot be created. The escape hatch is Review (dismiss to the list,
    // where the amber card's Edit sits) or Delete. Fires on ANY draft; the completed-unsent
    // guard above wins when both exist (it carries a Rule 601 clock, a draft does not). Assume
    // one draft; if more than one exists, act on the oldest — picked explicitly by createdAt
    // so it does not depend on the loadAllLogs sort order.
    if (drafts.length > 0) {
      const target = drafts.reduce((oldest, d) => (d.createdAt < oldest.createdAt ? d : oldest));
      const { filled, total } = getCompletionDetails(target);
      Alert.alert(
        t('logs.draftWarnTitle'),
        t('logs.draftWarnBody', { tripId: target.id, filled, total }),
        [
          { text: t('logs.draftWarnReview'), style: 'cancel' },
          {
            text: t('logs.draftWarnDelete'),
            style: 'destructive',
            onPress: async () => {
              await deleteLog(target.id);
              await clearTimersForLog(target.id); // S124: wipe this log's running timers
              refresh();
            },
          },
        ],
      );
      return;
    }
    onNewLog();
  };
  const sentCapped = sentLogs.slice(0, SENT_DISPLAY_CAP);

  // FAIL rows come straight from the persisted register (one per attempt), so failures
  // survive an app restart — unlike the in-memory failedSends behind the retry cards.
  const logById = new Map(completed.map(l => [l.id, l] as const));
  const failureRows = failureRecords
    .map(rec => ({ rec, log: logById.get(rec.logId) }))
    .filter((x): x is { rec: TransmissionRecord; log: DfoLog } => !!x.log);

  // Scope B: register records with no backing DfoLog (Form 222/233). They are NOT routed
  // through logById — they render with FormSentCard. Split by outcome so successes interleave
  // into the SENT section and failures into the FAILED section (both by attemptedAt).
  const formRecords = register.filter(r => transmissionKind(r) !== 'logbook');
  const formSuccessRecords = formRecords.filter(r => r.outcome === 'success');
  const formFailureRecords = formRecords.filter(r => r.outcome === 'failure');

  // SENT section, interleaved newest-first. Logbook rows keep their exact data (capped at 30,
  // unchanged); form rows are added on top (uncapped, per decision). Logbook ts falls back to
  // createdAt when no success record is present, matching the screen's existing ordering basis.
  type SentRow =
    | { kind: 'logbook'; key: string; ts: number; log: DfoLog; record?: TransmissionRecord }
    | { kind: 'form'; key: string; ts: number; record: TransmissionRecord };
  const sentRows: SentRow[] = [
    ...sentCapped.map((log): SentRow => ({
      kind: 'logbook',
      key: log.id,
      ts: successRecords[log.id]?.attemptedAt ?? log.createdAt,
      log,
      record: successRecords[log.id],
    })),
    ...formSuccessRecords.map((r): SentRow => ({ kind: 'form', key: r.id, ts: r.attemptedAt, record: r })),
  ].sort((a, b) => b.ts - a.ts);

  // FAILED section, interleaved newest-first by attemptedAt (logbook rows unchanged).
  type FailRow =
    | { kind: 'logbook'; key: string; ts: number; log: DfoLog; rec: TransmissionRecord }
    | { kind: 'form'; key: string; ts: number; rec: TransmissionRecord };
  const failRowsMerged: FailRow[] = [
    ...failureRows.map(({ rec, log }): FailRow => ({ kind: 'logbook', key: `${rec.logId}-${rec.attemptedAt}`, ts: rec.attemptedAt, log, rec })),
    ...formFailureRecords.map((r): FailRow => ({ kind: 'form', key: `${r.logId}-${r.attemptedAt}`, ts: r.attemptedAt, rec: r })),
  ].sort((a, b) => b.ts - a.ts);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => setCaptainProfileVisible(true)}
          >
            <User size={14} color="#1E3A8A" />
            <Text style={styles.pillButtonText}>{t('logs.profileButton')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle}>{t('logs.headerTitle')}</Text>

        <View style={[styles.headerSide, styles.headerSideRight]}>
          {/* Inspection Mode (QR) — hidden for now: demoed to DFO, not currently wanted.
              NOT deleted — flip false→true to re-enable. Screen + modal + state left intact. */}
          {false && (
            <TouchableOpacity
              style={styles.pillButtonShield}
              onPress={() => setInspectionModeVisible(true)}
            >
              <Shield size={14} color="#FFFFFF" />
              <Text style={styles.pillButtonShieldText}>{t('logs.inspectButton')}</Text>
            </TouchableOpacity>
          )}

          {/* XML Test Harness button REMOVED (S121) — no longer needed; the harness screen
              itself (DfoTestHarnessScreen.tsx) stays on disk unimported for now. */}

          {/* Help & Support (S121 Phase 3) — visible to ALL roles incl. the DFO demo
              account (Appendix B TC1 step 5) */}
          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => setHelpVisible(true)}
          >
            <HelpCircle size={14} color="#1E3A8A" />
            <Text style={styles.pillButtonText}>{t('logs.helpButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <TouchableOpacity style={styles.newLogButton} onPress={handleNewLogPress}>
          <Plus size={22} color="#FFFFFF" />
          <Text style={styles.newLogButtonText}>{t('logs.newElogButton')}</Text>
        </TouchableOpacity>

        {/* S137 Phase 6 (defect 45): the Form 222 button IS the reminder (rulings R-B/R-C).
            Solid red + a third line while any closed log owes a declaration; a small count
            when two or more owe (R-H). Both buttons are permanently three lines tall so the
            row never reflows (R-I) — the variants are ADDITIVE, the shared styles untouched. */}
        <View style={styles.secondaryButtons}>
          <TouchableOpacity
            style={[styles.secondaryButton, styles.secondaryButtonTall, owed222.length > 0 && styles.secondaryButtonOwed]}
            onPress={() => {
              setForm222EntryUid(undefined);
              // R-J: exactly one owing log → hand its lgbkUid to the 222 prefill.
              setForm222PrefillUid(owed222.length === 1 ? owed222[0].lgbkUid : undefined);
              setForm222Visible(true);
            }}
          >
            <Text style={[styles.secondaryButtonText, owed222.length > 0 && styles.secondaryButtonTextOwed]}>
              {t('logs.form222Button')}{owed222.length > 0 ? `\n${t('logs.form222Needed')}` : ''}
            </Text>
            {owed222.length >= 2 && (
              <View style={styles.owedCountBadge}>
                <Text style={styles.owedCountBadgeText}>{owed222.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, styles.secondaryButtonTall]}
            onPress={() => { setForm233EntryUid(undefined); setForm233Visible(true); }}
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

        {mergedDrafts.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>{t('logs.inProgress')}</Text>
            {mergedDrafts.map(row =>
              row.kind === 'log' ? renderDraftCard(row.log)
              : row.kind === 'form222' ? renderFormDraftCard('form222', row.entry)
              : renderFormDraftCard('form233', row.entry))}
          </>
        )}

        {mergedCompleted.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, mergedDrafts.length > 0 && { marginTop: 16 }]}>
              {t('logs.completedLogs')}
            </Text>
            {mergedCompleted.map(row =>
              row.kind === 'log' ? renderCompletedCard(row.log)
              : row.kind === 'form222' ? renderFormClosedCard('form222', row.entry)
              : renderFormClosedCard('form233', row.entry))}
          </>
        )}

        {sentRows.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, (mergedDrafts.length > 0 || mergedCompleted.length > 0) && { marginTop: 16 }]}>
              {t('logs.sentLogs')}
            </Text>
            {sentRows.map(row => row.kind === 'logbook' ? (
              <SentLogCard
                key={row.key}
                log={row.log}
                record={row.record}
                onPress={() => setDetailLog(row.log)}
              />
            ) : (
              <FormSentCard
                key={row.key}
                record={row.record}
                onPress={() => { setDetailRecord(row.record); setDetailLog(null); }}
              />
            ))}
            {sentLogs.length > SENT_DISPLAY_CAP && (
              <Text style={styles.sentCapNote}>
                {t('logs.sentCapNote', { shown: SENT_DISPLAY_CAP, total: sentLogs.length })}
              </Text>
            )}
          </>
        )}

        {failRowsMerged.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>
              {t('logs.failedLogs')}
            </Text>
            {failRowsMerged.map(row => row.kind === 'logbook' ? (
              <SentLogCard
                key={row.key}
                log={row.log}
                record={row.rec}
                onPress={() => { setDetailLog(row.log); setDetailRecord(row.rec); }}
              />
            ) : (
              <FormSentCard
                key={row.key}
                record={row.rec}
                onPress={() => { setDetailRecord(row.rec); setDetailLog(null); }}
              />
            ))}
          </>
        )}

        {!isEmpty && (
          <TouchableOpacity style={styles.historyButton} onPress={onOpenHistory}>
            <Archive size={18} color="#1E3A8A" />
            <Text style={styles.historyButtonText}>{t('logs.logHistoryButton')}</Text>
          </TouchableOpacity>
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

      {/* ── Help & Support Modal (S121 Phase 3) ── */}
      <Modal
        visible={helpVisible}
        animationType="slide"
        onRequestClose={() => setHelpVisible(false)}
      >
        <HelpSupportScreen onClose={() => setHelpVisible(false)} />
      </Modal>

      {/* ── Form 222 · Marine Mammal Modal ── */}
      <Modal
        visible={form222Visible}
        animationType="slide"
        onRequestClose={() => form222CloseRef.current()}
      >
        {/* S125 7c: mount only when visible so the screen's mount effect re-runs with the current
            entryUid on every open (fresh EMPTY for a new form, the parked entry for a card tap). */}
        {form222Visible && (
          <Form222Screen
            entryUid={form222EntryUid}
            prefillUid={form222PrefillUid}
            onClose={() => { setForm222Visible(false); refresh(); }}
            registerClose={(fn) => { form222CloseRef.current = fn; }}
          />
        )}
      </Modal>

      {/* ── Form 233 · Inactivity Modal ── */}
      <Modal
        visible={form233Visible}
        animationType="slide"
        onRequestClose={() => form233CloseRef.current()}
      >
        {/* S125 7c: mount only when visible (see the 222 modal note). */}
        {form233Visible && (
          <Form233Screen
            entryUid={form233EntryUid}
            onClose={() => { setForm233Visible(false); refresh(); }}
            registerClose={(fn) => { form233CloseRef.current = fn; }}
          />
        )}
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
                t('logs.privacyRequiredBody'),
                [{ text: tc('nav.ok') }]
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

      {/* ── Transmission Result detail (tap a sent card) ── */}
      <SentLogDetailModal
        visible={detailLog !== null || detailRecord !== undefined}
        log={detailLog}
        record={detailRecord ?? (detailLog ? successRecords[detailLog.id] : undefined)}
        onClose={() => { setDetailLog(null); setDetailRecord(undefined); }}
      />
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
    textAlign: 'center',
  },
  headerSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSideRight: {
    justifyContent: 'flex-end',
    // S121: the right slot can hold TWO pills on dev+admin builds (XML Test Harness + Help);
    // release builds compile the harness out, so users only ever see the Help pill.
    gap: 6,
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
  draftUidLine: {
    fontSize: 12,
    color: '#B45309',
    opacity: 0.8,
    marginTop: 2,
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
  logUidLine: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: -8,
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
  sentCapNote: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 4,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  historyButtonText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '700',
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
  // S137 Phase 6 — ADDITIVE variants only; the shared secondaryButton/secondaryButtonText
  // above are untouched (the 233 button uses them too).
  // Both buttons permanently sized to three lines (R-I): 3 × lineHeight 18 + 2 × paddingVertical 11.
  secondaryButtonTall: {
    minHeight: 76,
  },
  // R-C: solid red, never flashing — the established DFO-pill red (pillButtonShield).
  secondaryButtonOwed: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  secondaryButtonTextOwed: {
    color: '#FFFFFF',
  },
  // R-H: the ≥2 count — a small corner badge so the R-I third-line wording stays verbatim.
  owedCountBadge: {
    position: 'absolute',
    // top/right 2 still clears the button's 10px rounded corner at 34px: the badge circle's
    // nearest point toward the corner sits at (6.98, 6.98), which is 4.3px from the corner
    // arc's center (10,10) — well inside the arc, so the badge never pokes past the curve.
    top: 2,
    right: 2,
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  owedCountBadgeText: {
    color: '#DC2626',
    fontSize: 20,
    fontWeight: '800',
  },
});

export default DfoLogsListScreen;
