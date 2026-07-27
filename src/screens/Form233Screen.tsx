import React, { useEffect, useState } from 'react';
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
import { ChevronLeft, ChevronDown, Calendar, StickyNote } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  Form233Entry,
  generateForm233Uid,
  generateForm233Xml,
  generateSoap233Envelope,
  saveForm233Entry,
  validateForm233Xml,
  INACTIVITY_REASONS,
} from '../utils/dfoForm233Generator';
import { submitDfoXml, isValidFormVrn } from '../utils/submitDfoXml';
import { triggerBackup } from '../utils/dfoBackup';
import { generateDfoXmlFileName } from '../utils/dfoXmlGenerator';
import { loadCaptainProfile, CaptainProfile, EMPTY_PROFILE } from '../utils/captainStorage';
import { loadLastLog } from '../utils/dfoLogStorage';
import { REQUIRED_ASTERISK_COLOR } from '../styles/GlobalStyles';

interface Props {
  onClose: () => void;
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

export default function Form233Screen({ onClose }: Props) {
  const { t } = useTranslation('dfo');
  const { t: tc } = useTranslation('common');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [profile, setProfile] = useState<CaptainProfile>(EMPTY_PROFILE);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => {
    loadCaptainProfile().then(setProfile);
    // LOGBOOK_UID_REFERED prefill: the most recent logbook this inactivity likely follows
    // (mirrors the Form 222 LGBK_NUM_REF prefill — same guard, never overwrites typed text).
    loadLastLog().then(last => {
      if (last?.lgbkUid) setForm(prev => prev.logbookUidRefered ? prev : { ...prev, logbookUidRefered: last.lgbkUid });
    });
  }, []);

  const set = (key: keyof FormState) => (value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

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

  const handleSubmit = async () => {
    if (sending) return; // re-tap guard while a send is in flight (mirror logbook)
    // Rule 528 — VRN must be 4-6 digits on the Form 233 path (FS-NAT-233-2-EN.pdf).
    // Hard block before any envelope/submit: no send, no mark-sent, no archive.
    if (!isValidFormVrn(profile.vesselNumber.trim())) {
      Alert.alert(t('sendGate.vrnRule528Title'), t('sendGate.vrnRule528'));
      return;
    }
    if (!form.periodStartDate || !form.periodEndDate || !form.reason) {
      Alert.alert(t('form233.missingFieldsTitle'), t('form233.missingFieldsBody'));
      return;
    }

    Alert.alert(
      t('form233.confirmTitle'),
      t('form233.confirmBody'),
      [
        { text: tc('nav.cancel'), style: 'cancel' },
        {
          text: t('form233.submitButton'),
          style: 'default',
          onPress: async () => {
            try {
              setSending(true);
              const entry: Form233Entry = {
                uid: generateForm233Uid(),
                savedAt: Date.now(),
                periodStartDate: form.periodStartDate,
                periodEndDate: form.periodEndDate,
                reason: form.reason,
                licenceNo: profile.fishingNumber,
                fin: profile.licenceHolderFin,
                remarks: form.remarks,
                reportDtlRemarks: form.reportDtlRemarks,
                logbookUidRefered: form.logbookUidRefered.trim(),
                sentToDfo: false,
              };

              const xml = generateForm233Xml(entry, profile);
              const validation = validateForm233Xml(xml);
              if (!validation.valid) {
                Alert.alert(
                  t('form233.validationFailedTitle'),
                  `${t('form233.validationFailed')}\n\n${validation.errors.join('\n')}`,
                  [{ text: tc('nav.ok') }]
                );
                return;
              }

              const fileName = generateDfoXmlFileName(profile.regId ?? 1004, profile.fishingNumber);
              const result = await submitDfoXml({
                soap: generateSoap233Envelope(xml, profile.elogKey, fileName),
                xml,
                fileName,
                recordId: `FORM233-${entry.uid}`,
                logId: `FORM233-${entry.uid}`,
                kind: 'form233',
                snapshot: { vrn: profile.vesselNumber, xsdValid: validation.valid },
              });

              if (!result.ok) {
                const detail = [
                  result.errCode && `Error ${result.errCode}`,
                  result.httpStatus && `HTTP ${result.httpStatus}`,
                  result.errorMessage,
                ].filter(Boolean).join('\n');
                Alert.alert(t('form233.submissionFailedTitle'), detail || t('form233.unknownError'));
                return;
              }

              entry.sentToDfo = true;
              entry.sentAt = Date.now();
              await saveForm233Entry(entry);
              triggerBackup(); // best-effort cloud backup; fire-and-forget, never blocks the send

              Alert.alert(t('form233.submittedTitle'), t('form233.submitSuccess'), [{ text: tc('nav.ok'), onPress: onClose }]);
            } catch (e: any) {
              Alert.alert(t('form233.submissionFailedTitle'), e.message ?? t('form233.unknownError'));
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
            <Text style={styles.label}>{t('form233.startDateLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text></Text>
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
            <Text style={styles.label}>{t('form233.endDateLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text></Text>
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
            <Text style={styles.label}>{t('form233.reasonLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text></Text>
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

        {sending ? (
          <View style={styles.submitButtonSending}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.submitButtonText}>{t('logs.sending')}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8}>
            <Text style={styles.submitButtonText}>{t('form233.submitButton')}</Text>
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
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1E40AF',
  },
  submitButtonSending: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1E40AF',
  },
  submitButtonText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontSize: 16,
  },
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
