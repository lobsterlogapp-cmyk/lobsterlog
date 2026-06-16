import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
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
import { saveXmlArchiveEntry } from '../utils/dfoLogStorage';
import { generateDfoXmlFileName } from '../utils/dfoXmlGenerator';
import { loadCaptainProfile, CaptainProfile, EMPTY_PROFILE } from '../utils/captainStorage';

interface Props {
  onClose: () => void;
}

interface FormState {
  periodStartDate: string;
  periodEndDate: string;
  reason: string;
}

const EMPTY_FORM: FormState = {
  periodStartDate: '',
  periodEndDate: '',
  reason: '',
};

export default function Form233Screen({ onClose }: Props) {
  const { t } = useTranslation('dfo');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [profile, setProfile] = useState<CaptainProfile>(EMPTY_PROFILE);
  const [reasonOpen, setReasonOpen] = useState(false);

  useEffect(() => {
    loadCaptainProfile().then(setProfile);
  }, []);

  const set = (key: keyof FormState) => (value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.periodStartDate || !form.periodEndDate || !form.reason) {
      Alert.alert('Missing Fields', 'Please complete all required fields before submitting.');
      return;
    }

    Alert.alert(
      'Submit to DFO?',
      'This inactivity report will be submitted to DFO.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            try {
              const entry: Form233Entry = {
                uid: generateForm233Uid(),
                savedAt: Date.now(),
                periodStartDate: form.periodStartDate,
                periodEndDate: form.periodEndDate,
                reason: form.reason,
                licenceNo: profile.fishingNumber,
                fin: profile.licenceHolderFin,
                sentToDfo: false,
              };

              const xml = generateForm233Xml(entry, profile);
              const validation = validateForm233Xml(xml);
              if (!validation.valid) {
                Alert.alert(
                  'Validation Failed',
                  `Form 233 failed schema validation and was not sent.\n\n${validation.errors.join('\n')}`,
                  [{ text: 'OK' }]
                );
                return;
              }

              // Simulate HTTP call — replace with real fetch() once DFO provides endpoint URL
              generateSoap233Envelope(
                xml,
                profile.elogKey,
                generateDfoXmlFileName(profile.regId ?? 1004, profile.fishingNumber)
              );

              entry.sentToDfo = true;
              entry.sentAt = Date.now();
              await saveForm233Entry(entry);
              await saveXmlArchiveEntry({ logId: `FORM233-${entry.uid}`, savedAt: Date.now(), xml });

              Alert.alert('Submitted', 'Form 233 has been sent to DFO.', [{ text: 'OK', onPress: onClose }]);
            } catch (e: any) {
              Alert.alert('Submission Failed', e.message ?? 'Unknown error');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
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
            <Text style={styles.label}>{t('form233.startDateLabel')}</Text>
            <TextInput
              style={styles.input}
              value={form.periodStartDate}
              onChangeText={set('periodStartDate')}
              placeholder={t('form233.datePlaceholder')}
              placeholderTextColor="#CBD5E1"
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <View style={[styles.inputGroup, styles.lastInputGroup]}>
            <Text style={styles.label}>{t('form233.endDateLabel')}</Text>
            <TextInput
              style={styles.input}
              value={form.periodEndDate}
              onChangeText={set('periodEndDate')}
              placeholder={t('form233.datePlaceholder')}
              placeholderTextColor="#CBD5E1"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('form233.reasonCard')}</Text>

          <View style={[styles.inputGroup, styles.lastInputGroup]}>
            <Text style={styles.label}>{t('form233.reasonLabel')}</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setReasonOpen(o => !o)}
              activeOpacity={0.8}
            >
              <Text style={form.reason ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                {form.reason || t('form233.reasonPlaceholder')}
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
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8}>
          <Text style={styles.submitButtonText}>{t('form233.submitButton')}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  submitButtonText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontSize: 16,
  },
});
