import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, Calendar, StickyNote, Lock, Save } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  Form233Entry,
  generateForm233Uid,
  saveForm233Entry,
  loadForm233EntryByUid,
  INACTIVITY_REASONS,
} from '../utils/dfoForm233Generator';
// S125 7b: send moved off the form onto the list card — the screen no longer imports the
// generate/validate/envelope/submit/backup surface (now in sendFormEntry.ts, called from the list).
import { loadCaptainProfile, CaptainProfile, EMPTY_PROFILE } from '../utils/captainStorage';
import { loadLastLog } from '../utils/dfoLogStorage';
import { REQUIRED_ASTERISK_COLOR } from '../styles/GlobalStyles';
import { isFieldRequired, missingInContainer, MissingField } from '../utils/dfoRequirements';

interface Props {
  onClose: () => void;
  // S125 7a: lets the parent Modal's onRequestClose (Android hardware back) invoke this
  // screen's park-then-close handler, so EVERY exit goes through one path that parks the draft.
  registerClose?: (fn: () => void) => void;
  // S125 7c: which parked draft to open. Provided → hydrate that entry; absent → fresh EMPTY form.
  // Replaces 7a's auto-restore-newest-draft (the trap: no way to start a new form / delete one).
  entryUid?: string;
}

interface FormState {
  periodStartDate: string;
  periodEndDate: string;
  reason: string;
  remarks: string;            // → REPORT.REM (string_2000, optional) — Session 111
  reportDtlRemarks: string;   // → REPORT_DTL.REM (string_2000, optional) — Session 112
  logbookUidRefered: string;  // → REPORT.LOGBOOK_UID_REFERED (string_6, optional) — S116
}

const EMPTY_FORM: FormState = {
  periodStartDate: '',
  periodEndDate: '',
  reason: '',
  remarks: '',
  reportDtlRemarks: '',
  logbookUidRefered: '',
};

// Mirror of FullDfoForm.formatDate — picker Date → YYYY-MM-DD (the string the generator accepts).
const formatPickerDate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Seed the picker from the currently-entered YYYY-MM-DD (mirror of FullDfoForm.parseDateTime, date-only).
const parsePickerDate = (dateStr: string): Date => {
  const d = new Date();
  if (dateStr) {
    const [y, mo, da] = dateStr.split('-').map(Number);
    if (!isNaN(y) && !isNaN(mo) && !isNaN(da)) d.setFullYear(y, mo - 1, da);
  }
  return d;
};

export default function Form233Screen({ onClose, registerClose, entryUid }: Props) {
  const { t } = useTranslation('dfo');
  const { t: tc } = useTranslation('common');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [profile, setProfile] = useState<CaptainProfile>(EMPTY_PROFILE);
  // S140 P2: every star asks the shared table (the 233's three required fields
  // are region-invariant).
  const req = (f: string) => isFieldRequired(f, { subformId: profile.subformId ?? 90 }, {}, 'form233');
  const [reasonOpen, setReasonOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  // S125 7b/7d: the lock is derived STRICTLY from the loaded entry's stored closeDt (ruling 2 —
  // storage is the single source of truth; NEVER a flag set by the close action). Non-null ⇒ this
  // is a closed record opened read-only via Review: body frozen, banner shown, no Close control.
  // Set ONLY from draft.closeDt in the mount effect, so a force-quit + reopen re-derives it.
  const [lockedCloseDt, setLockedCloseDt] = useState<string | null>(null);

  // S125 7a draft lifecycle refs:
  //  prefillRef  — the logbookUidRefered value auto-prefilled on mount; the empty-check counts
  //                the reference field as content only when it DIFFERS from this (a user fix).
  //  draftUidRef — uid this screen instance owns: the hydrated draft's uid, else minted on first
  //                park. Reusing it makes save/park an upsert (one draft per session).
  const prefillRef = useRef<string>('');
  const draftUidRef = useRef<string | null>(null);

  useEffect(() => {
    loadCaptainProfile().then(setProfile);
    (async () => {
      // S125 7c: hydrate the SPECIFIC entry the list asked for (entryUid), else start fresh.
      // No more auto-restore-newest — that was the trap (couldn't start a new form or delete one).
      const [last, draft] = await Promise.all([
        loadLastLog(),
        entryUid ? loadForm233EntryByUid(entryUid) : Promise.resolve(null),
      ]);
      const prefill = last?.lgbkUid ?? '';
      prefillRef.current = prefill;
      if (draft) {
        draftUidRef.current = draft.uid;
        // 7d ruling 2: derive the lock from stored closeDt. A closed entry opened via Review
        // renders read-only; survives force-quit because it is re-read from storage every mount.
        if (draft.closeDt) setLockedCloseDt(draft.closeDt);
        setForm({
          periodStartDate: draft.periodStartDate,
          periodEndDate: draft.periodEndDate,
          reason: draft.reason,
          remarks: draft.remarks ?? '',
          reportDtlRemarks: draft.reportDtlRemarks ?? '',
          logbookUidRefered: draft.logbookUidRefered ?? '',
        });
      } else if (prefill) {
        // LOGBOOK_UID_REFERED prefill (mirrors the Form 222 LGBK_NUM_REF prefill — never
        // overwrites typed text) on a fresh form.
        setForm(prev => prev.logbookUidRefered ? prev : { ...prev, logbookUidRefered: prefill });
      }
    })();
  }, []);

  const set = (key: keyof FormState) => (value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // S125 7a: build a Form233Entry from current state at the given lifecycle stage. Shared by the
  // park path (status:'draft', sentToDfo:false) and the send path (status:'complete') so a parked
  // draft and a sent record differ only in status/sent flags. uid reuses the owned draft uid.
  const buildEntry = (status: 'draft' | 'complete', sentToDfo: boolean, closeDt?: string): Form233Entry => ({
    uid: draftUidRef.current ?? generateForm233Uid(),
    savedAt: Date.now(),
    periodStartDate: form.periodStartDate,
    periodEndDate: form.periodEndDate,
    reason: form.reason,
    licenceNo: profile.fishingNumber,
    fin: profile.licenceHolderFin,
    remarks: form.remarks,
    reportDtlRemarks: form.reportDtlRemarks,
    logbookUidRefered: form.logbookUidRefered.trim(),
    ...(closeDt ? { closeDt } : {}),
    status,
    sentToDfo,
  });

  // S125 7a: "empty" = nothing the USER caused. reportDate has no equivalent here; the reference
  // field counts only when CHANGED from the mount prefill (ruling 2).
  const isEmpty = (): boolean => {
    const typed = [form.periodStartDate, form.periodEndDate, form.reason, form.remarks, form.reportDtlRemarks]
      .some(v => v.trim() !== '');
    const refChanged = form.logbookUidRefered !== prefillRef.current;
    return !(typed || refChanged);
  };

  // S125 7a/7b: the ONE exit path. Parks a non-empty draft — UNLESS the form was just closed
  // (already persisted as 'complete'; parking would overwrite it back to a draft).
  const handleClose = async () => {
    if (!lockedCloseDt && !isEmpty()) {
      if (!draftUidRef.current) draftUidRef.current = generateForm233Uid();
      await saveForm233Entry(buildEntry('draft', false));
    }
    onClose();
  };
  // Register the latest handleClose with the parent (via a ref so we register once), so the
  // Modal's onRequestClose — Android hardware back — runs the same park-then-close path.
  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;
  useEffect(() => { registerClose?.(() => { void handleCloseRef.current(); }); }, []);

  // Section note → REPORT_DTL.REM (S112). Mirrors the logbook FullDfoForm "Add a note" affordance
  // (renderNoteButton/renderNoteInput are inline closures over state there — the recon confirmed
  // it is NOT an importable component, so it is re-implemented locally here). R-A: same
  // interaction as the 234 — collapse/expand, text held in form state, no badge/count/filled
  // styling. Collapsing preserves the text (it lives in form.reportDtlRemarks); persisted at send.
  const renderNoteButton = () => (
    <TouchableOpacity style={styles.addNoteBtn} onPress={() => setNoteOpen(o => !o)} activeOpacity={0.7}>
      <StickyNote size={13} color="#1E3A8A" />
      <Text style={styles.addNoteBtnText}>{t('form234.addNote')}</Text>
    </TouchableOpacity>
  );
  const renderNoteInput = () =>
    noteOpen ? (
      <TextInput
        style={styles.noteInput}
        value={form.reportDtlRemarks}
        onChangeText={set('reportDtlRemarks')}
        placeholder={t('form234.notePlaceholder')}
        placeholderTextColor="#94A3B8"
        multiline
        maxLength={2000}
      />
    ) : null;

  // Date pickers (mirror FullDfoForm's platform-split). Both fields are date-only.
  const insets = useSafeAreaInsets(); // S95: edge-to-edge safe-area top for the modal header
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<'start' | 'end' | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());

  const openPicker = (field: 'start' | 'end') => {
    const current = parsePickerDate(field === 'start' ? form.periodStartDate : form.periodEndDate);
    setPickerDate(current);
    setTempDate(current);
    setPickerField(field);
    setPickerVisible(true);
  };

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    if (Platform.OS === 'android') {
      setPickerVisible(false);
      if (event.type === 'dismissed') return;
      applyPickerValue(selected);
    } else {
      setTempDate(selected);
    }
  };

  const applyPickerValue = (d: Date) => {
    const value = formatPickerDate(d);
    if (pickerField === 'start') set('periodStartDate')(value);
    else if (pickerField === 'end') set('periodEndDate')(value);
  };

  // S125 7b: local "YYYY-MM-DD HH:MM" for the Closed banner (mirrors FullDfoForm.formatClose).
  const formatClose = (iso: string): string => {
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
  };

  // S125 7b/7d: Close & Save — never-suppressible confirm (DFO 234.7 finality) → stamp the real
  // close time, persist as a closed-unsent record, then LEAVE the form and return to the DFO ELOGs
  // list (7d parity with the 234's Close & Save All). The save is AWAITED before onClose so the
  // list's refresh reads the closed record; if the save FAILS we stay on the form and say so
  // (ruling 1 — never navigate off unsaved data). No send here (send is from the list card).
  // S141 P3b: refusal bullets — blank fields read as their bare label; invalid values
  // carry their field's error wording (the 953 format line, the period-order line).
  const closeBulletText = (m: MissingField): string => {
    if (m.reason === 'invalid') {
      const errKey =
        m.fieldKey === 'logbookUidRefered' ? 'form233.refFormatError' :
        m.fieldKey === 'periodEndDate' ? 'form233.periodOrderError' : null;
      if (errKey) return t(errKey);
    }
    return t(m.labelKey);
  };

  const handleCloseAndSave = () => {
    if (lockedCloseDt) return;
    // S141 P3b: refuse to seal a form the send validator would refuse to send. The table
    // check runs BEFORE the confirm dialog; nothing is stamped on a refusal. Ruling 3:
    // the 233 SNAPSHOTS the profile licence into the record at save, so a blank profile
    // licence at close would seal a permanently unsendable report — refused here with a
    // bullet pointing at the Captain Profile (the 222 needs no twin: it reads the
    // profile at send time).
    const missing = missingInContainer('form233', { subformId: profile.subformId ?? 90 }, { ...form });
    const rows = missing.map(closeBulletText);
    if (!profile.fishingNumber.trim()) rows.push(t('form233.licenceNoCloseBullet'));
    if (rows.length) {
      // S141 P4 amendment (W-2): the walk-caught defect — a malformed Referred ELOG UID or
      // an out-of-order period end is "incorrect", not "blank"; the body now admits it.
      const mixed = missing.some(m => m.reason === 'invalid' || m.reason === 'pair-both');
      Alert.alert(
        t('form234.closeBlockedTitle'),
        `${t(mixed ? 'form234.closeBlockedBodyMixed' : 'form234.closeBlockedBody')}\n• ${rows.join('\n• ')}`,
        [{ text: tc('nav.ok') }],
      );
      return;
    }
    Alert.alert(
      t('form233.closeConfirmTitle'),
      t('form234.closeConfirmBody'),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
        {
          text: t('form234.closeConfirmYes'),
          style: 'destructive',
          onPress: async () => {
            const nowIso = new Date().toISOString();
            if (!draftUidRef.current) draftUidRef.current = generateForm233Uid();
            try {
              await saveForm233Entry(buildEntry('complete', false, nowIso));
            } catch {
              Alert.alert(tc('settings.errorTitle'), t('form234.saveError'));
              return;
            }
            onClose();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => { void handleClose(); }} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('form233.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* S125 7b: freeze the whole body once closed (view-only; the ScrollView still scrolls). */}
        <View pointerEvents={lockedCloseDt ? 'none' : 'auto'} style={lockedCloseDt ? styles.closedBody : undefined}>
        {/* Pre-populated from Captain Profile — read-only */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('form233.licenceDetailsCard')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('form233.operatorNameLabel')}</Text>
            <View style={styles.readOnlyField}>
              <Text style={profile.operatorName ? styles.readOnlyText : styles.readOnlyPlaceholder}>
                {profile.operatorName || t('form233.operatorNamePlaceholder')}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('form233.licenceNoLabel')}</Text>
            <View style={styles.readOnlyField}>
              <Text style={profile.fishingNumber ? styles.readOnlyText : styles.readOnlyPlaceholder}>
                {profile.fishingNumber || t('form233.licenceNoPlaceholder')}
              </Text>
            </View>
          </View>

          <View style={[styles.inputGroup, styles.lastInputGroup]}>
            <Text style={styles.label}>{t('form233.finLabel')}</Text>
            <View style={styles.readOnlyField}>
              <Text style={profile.licenceHolderFin ? styles.readOnlyText : styles.readOnlyPlaceholder}>
                {profile.licenceHolderFin || t('form233.finPlaceholder')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('form233.reportingPeriodCard')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('form233.startDateLabel')}{req('periodStartDate') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => openPicker('start')}
              activeOpacity={0.8}
            >
              <Text style={form.periodStartDate ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                {form.periodStartDate || t('form233.datePlaceholder')}
              </Text>
              <Calendar size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, styles.lastInputGroup]}>
            <Text style={styles.label}>{t('form233.endDateLabel')}{req('periodEndDate') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => openPicker('end')}
              activeOpacity={0.8}
            >
              <Text style={form.periodEndDate ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                {form.periodEndDate || t('form233.datePlaceholder')}
              </Text>
              <Calendar size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Section note → REPORT_DTL.REM (S112). Mirrors the logbook "Add a note" affordance. */}
          <View style={styles.noteBlock}>
            <View style={styles.noteButtonRow}>{renderNoteButton()}</View>
            {renderNoteInput()}
          </View>
        </View>

        {/* Related logbook → REPORT.LOGBOOK_UID_REFERED (string_6, optional) — S116.
            Identifier, not a remark: plain TextInput, own card (one concept per card).
            Prefilled from the most recent complete log's lgbkUid; fully editable.
            No optional-marker on the header: unmarked-means-optional is the screen
            convention (required fields carry the asterisk); the "(Optional)" class is
            cleared in one later pass per the S113 ruling. */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('form233.logbookUidRefLabel')}</Text>
          <View style={styles.lastInputGroup}>
            <TextInput
              style={styles.input}
              value={form.logbookUidRefered}
              onChangeText={v => set('logbookUidRefered')(v.toUpperCase())}
              placeholder={t('form233.logbookUidRefPlaceholder')}
              placeholderTextColor="#CBD5E1"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('form233.reasonCard')}</Text>

          <View style={[styles.inputGroup, styles.lastInputGroup]}>
            <Text style={styles.label}>{t('form233.reasonLabel')}{req('reason') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setReasonOpen(o => !o)}
              activeOpacity={0.8}
            >
              <Text style={form.reason ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                {form.reason ? t(`form233.reasonOptions.${form.reason}`, { defaultValue: form.reason }) : t('form233.reasonPlaceholder')}
              </Text>
              <ChevronDown size={18} color="#94A3B8" />
            </TouchableOpacity>
            {reasonOpen && (
              <View style={styles.dropdownList}>
                {INACTIVITY_REASONS.map((opt, i) => {
                  const selected = form.reason === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.dropdownItem,
                        selected && styles.dropdownItemSelected,
                        i === INACTIVITY_REASONS.length - 1 && styles.dropdownItemLast,
                      ]}
                      onPress={() => { set('reason')(opt); setReasonOpen(false); }}
                    >
                      <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextSelected]}>
                        {t(`form233.reasonOptions.${opt}`, { defaultValue: opt })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Comments (REPORT.REM, string_2000, optional) */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('form233.remarksCard')}</Text>
          <View style={styles.lastInputGroup}>
            <TextInput
              style={[styles.input, styles.remarksInput]}
              value={form.remarks}
              onChangeText={set('remarks')}
              placeholder={t('form233.remarksPlaceholder')}
              placeholderTextColor="#CBD5E1"
              maxLength={2000}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        </View>
        {/* S125 7b: Close & Save (view-only banner once closed). Send is on the list card. */}
        {lockedCloseDt ? (
          <View style={styles.closedBanner}>
            <Lock size={14} color="#64748B" />
            <Text style={styles.closedBannerText}>{t('form234.closedAtLabel', { time: formatClose(lockedCloseDt) })}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={handleCloseAndSave} activeOpacity={0.8}>
            <Save size={18} color="#FFFFFF" />
            <Text style={styles.submitText}>{t('form233.closeButton')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {Platform.OS === 'ios' && (
        <Modal visible={pickerVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Text style={styles.modalCancel}>{tc('nav.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { applyPickerValue(tempDate); setPickerVisible(false); }}>
                  <Text style={styles.modalConfirm}>{tc('nav.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(_e: DateTimePickerEvent, s?: Date) => { if (s) setTempDate(s); }}
                style={{ backgroundColor: '#FFFFFF' }}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && pickerVisible && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={handlePickerChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 14 : 14,
  },
  backButton: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  inputGroup: {
    marginBottom: 15,
  },
  lastInputGroup: {
    marginBottom: 0,
  },
  // Section note affordance — copied verbatim from FullDfoForm.tsx addNoteBtn/addNoteBtnText/noteInput
  // so the 233 note reads identically to the logbook's (R-A). noteBlock/noteButtonRow are local
  // layout wrappers (the 233 card has no flex header row to hang the button on — see gate doc).
  noteBlock: { marginTop: 14 },
  noteButtonRow: { flexDirection: 'row' },
  addNoteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
  },
  addNoteBtnText: { fontSize: 11, fontWeight: '700', color: '#1E3A8A' },
  noteInput: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8,
    padding: 10, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC',
    minHeight: 64, textAlignVertical: 'top', marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  remarksInput: {
    height: 100,
    fontWeight: '400',
  },
  readOnlyField: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  readOnlyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  readOnlyPlaceholder: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#94A3B8',
  },
  dropdownButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  dropdownList: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#334155',
  },
  dropdownItemTextSelected: {
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
  // S125 7d: Close & Save foot button — copied verbatim from FullDfoForm's submitButton/submitText
  // (the 234's Close & Save All) so the three forms match, not merely resemble. The old near-miss
  // submitButton (#1E40AF / radius 12) and the amber closeSectionBtn are deleted (rulings 3/6).
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1E3A8A', paddingVertical: 14, borderRadius: 10,
  },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  // S125 7b: Closed banner + frozen body — copied verbatim from FullDfoForm's closure styles.
  closedBody: { opacity: 0.55 },
  closedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1',
  },
  closedBannerText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 16,
    borderTopRightRadius: 16, paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  modalCancel: { fontSize: 16, color: '#64748B', fontWeight: '600' },
  modalConfirm: { fontSize: 16, color: '#1E3A8A', fontWeight: '700' },
});
