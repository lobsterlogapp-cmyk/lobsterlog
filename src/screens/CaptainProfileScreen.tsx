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
import { ChevronLeft, ChevronDown, Eye, EyeOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  CaptainProfile,
  EMPTY_PROFILE,
  loadCaptainProfile,
  saveCaptainProfile,
} from '../utils/captainStorage';
import { DFO_FMA_LIST } from '../utils/dfoConstants';
import { changeLanguage } from '../i18n';

// Rule 260 — valid FIN formats: 9 digits | C/D + 7 digits | 5–6 digits | DFOCC + 9 digits
const isValidFin = (s: string): boolean =>
  /^(\d{9}|[CD]\d{7}|\d{5,6}|DFOCC\d{9})$/.test(s);

// VRN validation — DFO XSD (F222/F233/F234) types VRN as string_12 (max 12 chars,
// alphanumeric). The original '// Rule 528 — exactly 4-6 digits' citation could not be
// verified against the on-disk Standard v6.1 or any fact sheet — flagged for follow-up
// with Kane. Widened to match XSD pending clarification.
const isValidVrn = (s: string): boolean => /^[A-Za-z0-9]{1,12}$/.test(s);

const LFA_OPTIONS = [
  'LFA 1', 'LFA 2', 'LFA 3', 'LFA 4', 'LFA 5', 'LFA 6', 'LFA 7', 'LFA 8',
  'LFA 9', 'LFA 10', 'LFA 11', 'LFA 12', 'LFA 13', 'LFA 14', 'LFA 15',
  'LFA 16', 'LFA 17', 'LFA 18', 'LFA 19', 'LFA 20', 'LFA 21', 'LFA 22',
  'LFA 23', 'LFA 23A', 'LFA 24', 'LFA 25', 'LFA 26A', 'LFA 26B',
  'LFA 27', 'LFA 28', 'LFA 29', 'LFA 30', 'LFA 31', 'LFA 32',
  'LFA 33', 'LFA 34', 'LFA 35', 'LFA 36', 'LFA 37', 'LFA 38', 'LFA 41',
];

interface Props {
  onClose: () => void;
}

export default function CaptainProfileScreen({ onClose }: Props) {
  const { t, i18n } = useTranslation('common');
  const [profile, setProfile] = useState<CaptainProfile>(EMPTY_PROFILE);
  const [lfaDropdownOpen, setLfaDropdownOpen] = useState(false);
  const [showElogKey, setShowElogKey] = useState(false);
  const [finError, setFinError] = useState('');
  const [vrnError, setVrnError] = useState('');

  useEffect(() => {
    loadCaptainProfile().then(setProfile);
  }, []);

  const handleSave = async () => {
    if (profile.licenceHolderFin.trim() && !isValidFin(profile.licenceHolderFin.trim())) {
      setFinError(t('profile.finError'));
      return;
    }
    if (profile.vesselNumber.trim() && !isValidVrn(profile.vesselNumber.trim())) {
      setVrnError(t('profile.vrnError'));
      return;
    }
    await saveCaptainProfile(profile);
    Alert.alert(t('profile.saved'));
    onClose();
  };

  const setField = (key: keyof CaptainProfile) => (value: string) =>
    setProfile(prev => ({ ...prev, [key]: value }));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        {/* Spacer keeps the title centred */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('profile.vesselDetails')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.operatorNameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={profile.operatorName}
              onChangeText={setField('operatorName')}
              placeholder={t('profile.operatorNamePlaceholder')}
              placeholderTextColor="#CBD5E1"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.finLabel')}</Text>
            <TextInput
              style={styles.input}
              value={profile.licenceHolderFin}
              onChangeText={v => {
                setField('licenceHolderFin')(v);
                setFinError(v.trim() && !isValidFin(v.trim()) ? t('profile.finError') : '');
              }}
              placeholder={t('profile.finPlaceholder')}
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
            />
            {!!finError && <Text style={styles.fieldError}>{finError}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.vesselNumberLabel')}</Text>
            <TextInput
              style={styles.input}
              value={profile.vesselNumber}
              onChangeText={v => {
                setField('vesselNumber')(v);
                setVrnError(v.trim() && !isValidVrn(v.trim()) ? t('profile.vrnError') : '');
              }}
              placeholder={t('profile.vesselNumberPlaceholder')}
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
            />
            {!!vrnError && <Text style={styles.fieldError}>{vrnError}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.fishingLicenceLabel')}</Text>
            <TextInput
              style={styles.input}
              value={profile.fishingNumber}
              onChangeText={setField('fishingNumber')}
              placeholder={t('profile.fishingLicencePlaceholder')}
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.fishingAreaLabel')}</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setLfaDropdownOpen(o => !o)}
              activeOpacity={0.8}
            >
              <Text style={profile.fishingArea ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                {profile.fishingArea || t('profile.fishingAreaPlaceholder')}
              </Text>
              <ChevronDown size={18} color="#94A3B8" />
            </TouchableOpacity>
            {lfaDropdownOpen && (
              <View style={styles.dropdownList}>
                {LFA_OPTIONS.map((option, index) => {
                  const selected = profile.fishingArea === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownItem,
                        selected && styles.dropdownItemSelected,
                        index === LFA_OPTIONS.length - 1 && styles.dropdownItemLast,
                      ]}
                      onPress={() => {
                        setProfile(prev => ({
                                                  ...prev,
                                                  fishingArea: option,
                                                  fmaId: DFO_FMA_LIST.find(f => f.label === option)?.codeId ?? null,
                                                }));
                                                setLfaDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextSelected]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.totalGearLabel')}</Text>
            <TextInput
              style={styles.input}
              value={profile.totalGearCount}
              onChangeText={setField('totalGearCount')}
              placeholder={t('profile.totalGearPlaceholder')}
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
            />
          </View>

          <View style={[styles.inputGroup, styles.lastInputGroup]}>
            <Text style={styles.label}>{t('profile.gearTypeLabel')}</Text>
            <TextInput
              style={styles.input}
              value={profile.gearType}
              onChangeText={setField('gearType')}
              placeholder={t('profile.gearTypePlaceholder')}
              placeholderTextColor="#CBD5E1"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('profile.dfoSettings')}</Text>
          <View style={[styles.inputGroup, styles.lastInputGroup]}>
            <Text style={styles.label}>{t('profile.elogKeyLabel')}</Text>
            <View style={styles.elogKeyRow}>
              <TextInput
                style={[styles.input, styles.elogKeyInput]}
                value={profile.elogKey}
                onChangeText={setField('elogKey')}
                placeholder={t('profile.elogKeyPlaceholder')}
                placeholderTextColor="#CBD5E1"
                secureTextEntry={!showElogKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.elogKeyToggle}
                onPress={() => setShowElogKey(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showElogKey ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('settings.language')}</Text>
          <View style={styles.languageToggleRow}>
            <TouchableOpacity
              style={[styles.langPill, i18n.language === 'en' && styles.langPillActive]}
              onPress={() => changeLanguage('en')}
              activeOpacity={0.8}
            >
              <Text style={[styles.langPillText, i18n.language === 'en' && styles.langPillTextActive]}>
                {t('settings.english')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langPill, i18n.language === 'fr' && styles.langPillActive]}
              onPress={() => changeLanguage('fr')}
              activeOpacity={0.8}
            >
              <Text style={[styles.langPillText, i18n.language === 'fr' && styles.langPillTextActive]}>
                {t('settings.french')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>{t('profile.save')}</Text>
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1E40AF',
  },
  saveButtonText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontSize: 16,
  },
  elogKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  elogKeyInput: {
    flex: 1,
  },
  elogKeyToggle: {
    padding: 8,
  },
  languageToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  langPillActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  langPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  langPillTextActive: {
    color: '#FFFFFF',
  },
  fieldError: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 4,
    fontWeight: '500',
  },
});
