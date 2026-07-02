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
import { ChevronLeft, ChevronDown, Calendar, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  Form222Entry,
  generateForm222Uid,
  generateForm222Xml,
  generateSoap222Envelope,
  saveForm222Entry,
  validateForm222Xml,
  MARINE_MAMMAL_SPECIES,
  MARINE_MAMMAL_SPECIES_LABELS,
  INTERACTION_TYPES,
  INTERACTION_TYPE_LABELS,
  CONFIDENCE_LEVEL_LABELS,
  SPECIMEN_CONDITION_LABELS,
  LENGTH_CATEGORY_LABELS,
} from '../utils/dfoForm222Generator';
import { loadLastLog } from '../utils/dfoLogStorage';
import { submitDfoXml, isValidFormVrn } from '../utils/submitDfoXml';
import { triggerBackup } from '../utils/dfoBackup';
import { generateDfoXmlFileName } from '../utils/dfoXmlGenerator';
import { loadCaptainProfile, CaptainProfile, EMPTY_PROFILE } from '../utils/captainStorage';

interface Props {
  onClose: () => void;
}

interface FormState {
  interactInd: 'Y' | 'N';
  reportDate: string;
  interactionDate: string;
  interactionTime: string;
  lat: string;
  lon: string;
  speciesLabel: string;
  nbAnimals: string;
  interactionTypeLabel: string;
  injuryInd: 'Y' | 'N';
  deathInd: 'Y' | 'N';
  entangleInd: 'Y' | 'N';
  releaseInd: 'Y' | 'N';
  gearDamageInd: 'Y' | 'N';
  observerNm: string;
  contactInfo: string;
  remarks: string;
  confidenceLabel: string;   // → ID_CNFDNCE_ID (optional)
  specimenCondLabel: string; // → SPCMN_COND_ID (optional)
  lengthCatLabel: string;    // → BDY_LEN_ID (optional)
  lgbkNumRef: string;
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);

const EMPTY_FORM: FormState = {
  interactInd: 'N',
  reportDate: todayISO(),
  interactionDate: '',
  interactionTime: '',
  lat: '',
  lon: '',
  speciesLabel: '',
  nbAnimals: '',
  interactionTypeLabel: '',
  injuryInd: 'N',
  deathInd: 'N',
  entangleInd: 'N',
  releaseInd: 'N',
  gearDamageInd: 'N',
  observerNm: '',
  contactInfo: '',
  remarks: '',
  confidenceLabel: '',
  specimenCondLabel: '',
  lengthCatLabel: '',
  lgbkNumRef: '',
};

// Mirror of FullDfoForm.formatDate / formatTime — picker Date → the strings the generator accepts.
const formatPickerDate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatPickerTime = (d: Date): string => {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

// Seed the picker from the currently-entered YYYY-MM-DD (+ optional HH:MM); mirror of FullDfoForm.parseDateTime.
const parsePickerDateTime = (dateStr: string, timeStr: string): Date => {
  const d = new Date();
  if (dateStr) {
    const [y, mo, da] = dateStr.split('-').map(Number);
    if (!isNaN(y) && !isNaN(mo) && !isNaN(da)) d.setFullYear(y, mo - 1, da);
  }
  if (timeStr) {
    const [h, mi] = timeStr.split(':').map(Number);
    if (!isNaN(h) && !isNaN(mi)) d.setHours(h, mi, 0, 0);
  }
  return d;
};

export default function Form222Screen({ onClose }: Props) {
  const { t } = useTranslation('dfo');
  const { t: tc } = useTranslation('common');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [profile, setProfile] = useState<CaptainProfile>(EMPTY_PROFILE);
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [interactionTypeOpen, setInteractionTypeOpen] = useState(false);
  const [confidenceOpen, setConfidenceOpen] = useState(false);
  const [specimenCondOpen, setSpecimenCondOpen] = useState(false);
  const [lengthCatOpen, setLengthCatOpen] = useState(false);
  const [latError, setLatError] = useState('');
  const [lonError, setLonError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadCaptainProfile().then(setProfile);
    // LGBK_NUM_REF prefill: the most recent logbook this interaction likely refers to
    loadLastLog().then(last => {
      if (last?.lgbkUid) setForm(prev => prev.lgbkNumRef ? prev : { ...prev, lgbkNumRef: last.lgbkUid });
    });
  }, []);

  const set = <K extends keyof FormState>(key: K) => (value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleYN = (key: keyof FormState) => () => {
    setForm(prev => ({ ...prev, [key]: prev[key] === 'Y' ? 'N' : 'Y' }));
  };

  // Date/time pickers (mirror FullDfoForm's platform-split). Report = date-only; interaction = datetime.
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<'report' | 'interaction' | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());

  const openPicker = (field: 'report' | 'interaction') => {
    const current = field === 'interaction'
      ? parsePickerDateTime(form.interactionDate, form.interactionTime)
      : parsePickerDateTime(form.reportDate, '');
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
    if (pickerField === 'report') {
      set('reportDate')(formatPickerDate(d));
    } else if (pickerField === 'interaction') {
      // One picker, two stored strings — mirror of FullDfoForm's mmTime case.
      set('interactionDate')(formatPickerDate(d));
      set('interactionTime')(formatPickerTime(d));
    }
  };

  const handleLatChange = (v: string) => {
    set('lat')(v);
    const n = parseFloat(v);
    // XSD 39588.222 latitude type: 38-72 deg
    if (v && (isNaN(n) || n < 38 || n > 72)) {
      setLatError(t('form222.latError'));
    } else {
      setLatError('');
    }
  };

  const handleLonChange = (v: string) => {
    set('lon')(v);
    const n = parseFloat(v);
    // XSD 39588.222 longitude type: -148 to -40 deg
    if (v && (isNaN(n) || n < -148 || n > -40)) {
      setLonError(t('form222.lonError'));
    } else {
      setLonError('');
    }
  };

  const handleSubmit = async () => {
    if (sending) return; // re-tap guard while a send is in flight (mirror logbook)
    // Rule 528 — VRN must be 4-6 digits on the Form 222 path (FS-NAT-222-1-EN.pdf).
    // Hard block before any envelope/submit: no send, no mark-sent, no archive.
    if (!isValidFormVrn(profile.vesselNumber.trim())) {
      Alert.alert(t('sendGate.vrnRule528Title'), t('sendGate.vrnRule528'));
      return;
    }
    if (form.interactInd === 'Y') {
      const missing =
        !form.reportDate ||
        !form.interactionDate ||
        !form.interactionTime ||
        !form.lat ||
        !form.lon ||
        !form.speciesLabel ||
        !form.nbAnimals ||
        !form.interactionTypeLabel ||
        !form.observerNm ||
        !form.contactInfo;

      if (missing || latError || lonError) {
        Alert.alert('Missing Fields', 'Please complete all required fields before submitting.');
        return;
      }
    }

    Alert.alert(
      t('form222.confirmTitle'),
      t('form222.confirmBody'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: t('form222.submitButton'),
          style: 'default',
          onPress: async () => {
            try {
              setSending(true);
              const entry: Form222Entry = {
                uid: generateForm222Uid(),
                savedAt: Date.now(),
                interactInd: form.interactInd,
                reportDate: form.reportDate,
                interactionDate: form.interactionDate,
                interactionTime: form.interactionTime,
                lat: form.lat,
                lon: form.lon,
                speciesLabel: form.speciesLabel,
                nbAnimals: form.nbAnimals,
                interactionTypeLabel: form.interactionTypeLabel,
                injuryInd: form.injuryInd,
                deathInd: form.deathInd,
                entangleInd: form.entangleInd,
                releaseInd: form.releaseInd,
                gearDamageInd: form.gearDamageInd,
                observerNm: form.observerNm,
                contactInfo: form.contactInfo,
                remarks: form.remarks,
                confidenceLabel: form.confidenceLabel,
                specimenCondLabel: form.specimenCondLabel,
                lengthCatLabel: form.lengthCatLabel,
                lgbkNumRef: form.lgbkNumRef,
                sentToDfo: false,
              };

              const xml = generateForm222Xml(entry, profile);
              const validation = validateForm222Xml(xml);
              if (!validation.valid) {
                Alert.alert(
                  'Validation Failed',
                  `${t('form222.validationFailed')}\n\n${validation.errors.join('\n')}`,
                  [{ text: 'OK' }]
                );
                return;
              }

              const fileName = generateDfoXmlFileName(profile.regId ?? 1004, profile.fishingNumber);
              const result = await submitDfoXml({
                soap: generateSoap222Envelope(xml, profile.elogKey, fileName),
                xml,
                fileName,
                recordId: `FORM222-${entry.uid}`,
                logId: `FORM222-${entry.uid}`,
                kind: 'form222',
                snapshot: { vrn: profile.vesselNumber, xsdValid: validation.valid },
              });

              if (!result.ok) {
                const detail = [
                  result.errCode && `Error ${result.errCode}`,
                  result.httpStatus && `HTTP ${result.httpStatus}`,
                  result.errorMessage,
                ].filter(Boolean).join('\n');
                Alert.alert('Submission Failed', detail || 'Unknown error');
                return;
              }

              entry.sentToDfo = true;
              entry.sentAt = Date.now();
              await saveForm222Entry(entry);
              triggerBackup(); // best-effort cloud backup; fire-and-forget, never blocks the send

              Alert.alert('Submitted', t('form222.submitSuccess'), [{ text: 'OK', onPress: onClose }]);
            } catch (e: any) {
              Alert.alert('Submission Failed', e.message ?? 'Unknown error');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const renderDropdown = (
    label: string,
    value: string,
    options: string[],
    isOpen: boolean,
    setOpen: (v: boolean) => void,
    onSelect: (v: string) => void,
    placeholder: string,
    isLast = false,
  ) => (
    <View style={[styles.inputGroup, isLast && styles.lastInputGroup]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => {
          setSpeciesOpen(false);
          setInteractionTypeOpen(false);
          setConfidenceOpen(false);
          setSpecimenCondOpen(false);
          setLengthCatOpen(false);
          setOpen(!isOpen);
        }}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
          {value || placeholder}
        </Text>
        <ChevronDown size={18} color="#94A3B8" />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdownList}>
          {options.map((opt, i) => {
            const selected = value === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.dropdownItem,
                  selected && styles.dropdownItemSelected,
                  i === options.length - 1 && styles.dropdownItemLast,
                ]}
                onPress={() => { onSelect(opt); setOpen(false); }}
              >
                <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextSelected]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderYNToggle = (label: string, value: 'Y' | 'N', onToggle: () => void) => (
    <View style={styles.ynRow}>
      <Text style={styles.ynLabel}>{label}</Text>
      <View style={styles.ynToggleGroup}>
        <TouchableOpacity
          style={[styles.ynButton, value === 'Y' && styles.ynButtonActive]}
          onPress={() => { if (value !== 'Y') onToggle(); }}
          activeOpacity={0.8}
        >
          <Text style={[styles.ynButtonText, value === 'Y' && styles.ynButtonTextActive]}>
            {t('form222.interactIndYes')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ynButton, value === 'N' && styles.ynButtonActive]}
          onPress={() => { if (value !== 'N') onToggle(); }}
          activeOpacity={0.8}
        >
          <Text style={[styles.ynButtonText, value === 'N' && styles.ynButtonTextActive]}>
            {t('form222.interactIndNo')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('form222.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Master INTERACT_IND toggle */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('form222.interactCard')}</Text>
          <View style={styles.lastInputGroup}>
            <Text style={styles.label}>{t('form222.interactIndLabel')}</Text>
            <View style={styles.ynToggleGroupFull}>
              <TouchableOpacity
                style={[styles.ynButtonFull, form.interactInd === 'Y' && styles.ynButtonActive]}
                onPress={() => set('interactInd')('Y')}
                activeOpacity={0.8}
              >
                <Text style={[styles.ynButtonText, form.interactInd === 'Y' && styles.ynButtonTextActive]}>
                  {t('form222.interactIndYes')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ynButtonFull, form.interactInd === 'N' && styles.ynButtonActive]}
                onPress={() => set('interactInd')('N')}
                activeOpacity={0.8}
              >
                <Text style={[styles.ynButtonText, form.interactInd === 'N' && styles.ynButtonTextActive]}>
                  {t('form222.interactIndNo')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {form.interactInd === 'N' ? (
          <View style={styles.noInteractCard}>
            <Text style={styles.noInteractText}>{t('form222.noInteractMessage')}</Text>
          </View>
        ) : (
          <>
            {/* Report details */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.reportDetailsCard')}</Text>
              <View style={styles.lastInputGroup}>
                <Text style={styles.label}>{t('form222.reportDateLabel')}</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => openPicker('report')}
                  activeOpacity={0.8}
                >
                  <Text style={form.reportDate ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                    {form.reportDate || t('form222.datePlaceholder')}
                  </Text>
                  <Calendar size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              <View style={styles.lastInputGroup}>
                <Text style={styles.label}>{t('form222.lgbkNumRefLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={form.lgbkNumRef}
                  onChangeText={set('lgbkNumRef')}
                  placeholder={t('form222.lgbkNumRefPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  maxLength={15}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Interaction details */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.interactionDetailsCard')}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('form222.interactionDateLabel')}</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => openPicker('interaction')}
                  activeOpacity={0.8}
                >
                  <Text style={form.interactionDate ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                    {form.interactionDate || t('form222.datePlaceholder')}
                  </Text>
                  <Calendar size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.lastInputGroup}>
                <Text style={styles.label}>{t('form222.interactionTimeLabel')}</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => openPicker('interaction')}
                  activeOpacity={0.8}
                >
                  <Text style={form.interactionTime ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                    {form.interactionTime || t('form222.timePlaceholder')}
                  </Text>
                  <Clock size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Location */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.locationCard')}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('form222.latLabel')}</Text>
                <TextInput
                  style={[styles.input, latError ? styles.inputError : null]}
                  value={form.lat}
                  onChangeText={handleLatChange}
                  placeholder={t('form222.latPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  keyboardType="numeric"
                />
                {!!latError && <Text style={styles.errorText}>{latError}</Text>}
              </View>

              <View style={styles.lastInputGroup}>
                <Text style={styles.label}>{t('form222.lonLabel')}</Text>
                <TextInput
                  style={[styles.input, lonError ? styles.inputError : null]}
                  value={form.lon}
                  onChangeText={handleLonChange}
                  placeholder={t('form222.lonPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  keyboardType="numeric"
                />
                {!!lonError && <Text style={styles.errorText}>{lonError}</Text>}
              </View>
            </View>

            {/* Species & numbers */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.speciesCard')}</Text>

              {renderDropdown(
                t('form222.speciesLabel'),
                form.speciesLabel,
                MARINE_MAMMAL_SPECIES_LABELS,
                speciesOpen,
                setSpeciesOpen,
                set('speciesLabel'),
                t('form222.speciesPlaceholder'),
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('form222.nbAnimalsLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={form.nbAnimals}
                  onChangeText={set('nbAnimals')}
                  placeholder={t('form222.nbAnimalsPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  keyboardType="number-pad"
                />
              </View>

              {renderDropdown(
                t('form222.interactionTypeLabel'),
                form.interactionTypeLabel,
                INTERACTION_TYPE_LABELS,
                interactionTypeOpen,
                setInteractionTypeOpen,
                set('interactionTypeLabel'),
                t('form222.interactionTypePlaceholder'),
              )}

              {/* Optional specimen detail (XSD minOccurs=0) → ID_CNFDNCE_ID / SPCMN_COND_ID / BDY_LEN_ID */}
              {renderDropdown(
                t('form222.confidenceLabel'),
                form.confidenceLabel,
                CONFIDENCE_LEVEL_LABELS,
                confidenceOpen,
                setConfidenceOpen,
                set('confidenceLabel'),
                t('form222.confidencePlaceholder'),
              )}

              {renderDropdown(
                t('form222.specimenCondLabel'),
                form.specimenCondLabel,
                SPECIMEN_CONDITION_LABELS,
                specimenCondOpen,
                setSpecimenCondOpen,
                set('specimenCondLabel'),
                t('form222.specimenCondPlaceholder'),
              )}

              {renderDropdown(
                t('form222.lengthCatLabel'),
                form.lengthCatLabel,
                LENGTH_CATEGORY_LABELS,
                lengthCatOpen,
                setLengthCatOpen,
                set('lengthCatLabel'),
                t('form222.lengthCatPlaceholder'),
                true,
              )}
            </View>

            {/* Outcome indicators */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.indicatorsCard')}</Text>
              {renderYNToggle(t('form222.injuryIndLabel'),     form.injuryInd,     toggleYN('injuryInd'))}
              {renderYNToggle(t('form222.deathIndLabel'),      form.deathInd,      toggleYN('deathInd'))}
              {renderYNToggle(t('form222.entangleIndLabel'),   form.entangleInd,   toggleYN('entangleInd'))}
              {form.entangleInd === 'Y' &&
                renderYNToggle(t('form222.releaseIndLabel'),   form.releaseInd,    toggleYN('releaseInd'))}
              {renderYNToggle(t('form222.gearDamageIndLabel'), form.gearDamageInd, toggleYN('gearDamageInd'))}
            </View>

            {/* Observer */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.observerCard')}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('form222.observerNmLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={form.observerNm}
                  onChangeText={set('observerNm')}
                  placeholder={t('form222.observerNmPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                />
              </View>

              <View style={styles.lastInputGroup}>
                <Text style={styles.label}>{t('form222.contactInfoLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={form.contactInfo}
                  onChangeText={set('contactInfo')}
                  placeholder={t('form222.contactInfoPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Remarks */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.remarksCard')}</Text>
              <View style={styles.lastInputGroup}>
                <TextInput
                  style={[styles.input, styles.remarksInput]}
                  value={form.remarks}
                  onChangeText={set('remarks')}
                  placeholder={t('form222.remarksPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </>
        )}

        {sending ? (
          <View style={styles.submitButtonSending}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.submitButtonText}>{t('logs.sending')}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8}>
            <Text style={styles.submitButtonText}>{t('form222.submitButton')}</Text>
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
                mode={pickerField === 'interaction' ? 'datetime' : 'date'}
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
          mode={pickerField === 'interaction' ? 'datetime' : 'date'}
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
  noInteractCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  noInteractText: {
    fontSize: 15,
    color: '#166534',
    textAlign: 'center',
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
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  remarksInput: {
    height: 100,
    fontWeight: '400',
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
  // Y/N toggles for master interact indicator
  ynToggleGroupFull: {
    flexDirection: 'row',
    gap: 8,
  },
  ynButtonFull: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  // Y/N toggles for outcome indicators
  ynRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ynLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  ynToggleGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  ynButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  ynButtonActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  ynButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  ynButtonTextActive: {
    color: '#FFFFFF',
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
