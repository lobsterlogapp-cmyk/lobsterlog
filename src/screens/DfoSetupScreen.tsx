import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Purchases from 'react-native-purchases';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { loadCaptainProfile, saveCaptainProfile } from '../utils/captainStorage';
import { DFO_SUBFORM_REGISTRY } from '../utils/dfoConstants';
import DfoTestHarnessScreen from './DfoTestHarnessScreen';

interface Props {
  onActivated: () => void;
  onClose: () => void;
  isAdmin?: boolean;
}

// Rule 260 — valid FIN formats: 9 digits | C/D + 7 digits | 5–6 digits | DFOCC + 9 digits
const isValidFin = (s: string): boolean =>
  /^(\d{9}|[CD]\d{7}|\d{5,6}|DFOCC\d{9})$/.test(s);

const REGIONS = [
  { label: 'Maritimes', subformId: 90 },
  { label: 'Gulf',      subformId: 89 },
  { label: 'Quebec',    subformId: 88 },
  { label: 'Nfld & Lab', subformId: 91 },
] as const;

export default function DfoSetupScreen({ onActivated, onClose, isAdmin }: Props) {
  const { t } = useTranslation('dfo');
  const [selectedSubformId, setSelectedSubformId] = useState<number>(90);
  const [licenceNo, setLicenceNo] = useState('');
  const [fin, setFin] = useState('');
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [harnessVisible, setHarnessVisible] = useState(false);
  const [finError, setFinError] = useState('');

  const selectedRegionLabel = REGIONS.find(r => r.subformId === selectedSubformId)?.label ?? 'Region';

  const handleActivate = async () => {
    if (!licenceNo.trim()) {
      Alert.alert('Missing', 'Please enter your Licence Number.');
      return;
    }
    if (!fin.trim()) {
      Alert.alert('Missing', 'Please enter your FIN (Fisher ID Number).');
      return;
    }
    if (!isValidFin(fin.trim())) {
      setFinError('Invalid FIN — must be 9 digits, 5–6 digits, C/D + 7 digits, or DFOCC + 9 digits.');
      return;
    }

    if (devMode) {
      setLoading(true);
      try {
        const regId = DFO_SUBFORM_REGISTRY[selectedSubformId]?.regId ?? 1004;
        const profile = await loadCaptainProfile();
        await saveCaptainProfile({
          ...profile,
          subformId: selectedSubformId,
          regId,
          dfoLicenceNo: licenceNo.trim(),
          dfoFin: fin.trim(),
        });
        onActivated();
      } catch (e: any) {
        Alert.alert('Dev Error', e.message ?? 'Something went wrong.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const products = await Purchases.getProducts(['dfo_elog_seasonal']);
      if (!products || products.length === 0) {
        Alert.alert('Unavailable', 'The DFO ELOG purchase is not available right now. Please try again later.');
        return;
      }
      await Purchases.purchaseStoreProduct(products[0]);
      const regId = DFO_SUBFORM_REGISTRY[selectedSubformId]?.regId ?? 1004;
      const profile = await loadCaptainProfile();
      await saveCaptainProfile({
        ...profile,
        subformId: selectedSubformId,
        regId,
        dfoLicenceNo: licenceNo.trim(),
        dfoFin: fin.trim(),
        dfoActivated: true,
      });
      onActivated();
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Error', e.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!fin.trim()) {
      Alert.alert('Missing', 'Please enter your FIN (Fisher ID Number).');
      return;
    }
    if (!isValidFin(fin.trim())) {
      setFinError('Invalid FIN — must be 9 digits, 5–6 digits, C/D + 7 digits, or DFOCC + 9 digits.');
      return;
    }
    setLoading(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasPurchase = customerInfo.allPurchasedProductIdentifiers?.includes('dfo_elog_seasonal');
      if (hasPurchase) {
        const regId = DFO_SUBFORM_REGISTRY[selectedSubformId]?.regId ?? 1004;
        const profile = await loadCaptainProfile();
        await saveCaptainProfile({
          ...profile,
          subformId: selectedSubformId,
          regId,
          dfoLicenceNo: licenceNo.trim(),
          dfoFin: fin.trim(),
          dfoActivated: true,
        });
        onActivated();
      } else {
        Alert.alert('Not Found', 'No previous DFO ELOG purchase was found for this account.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not restore purchases.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {isAdmin ? (
          <TouchableOpacity
            onPress={() => setDevMode(d => !d)}
            style={[styles.devPill, devMode && styles.devPillActive]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.devPillText}>DEV</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <Text style={styles.headerTitle}>{t('setup.headerTitle')}</Text>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Region selector */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('setup.yourRegion')}</Text>
          <View style={styles.pillRow}>
            {REGIONS.map(r => (
              <TouchableOpacity
                key={r.subformId}
                style={[styles.pill, selectedSubformId === r.subformId && styles.pillActive]}
                onPress={() => setSelectedSubformId(r.subformId)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, selectedSubformId === r.subformId && styles.pillTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Licence details */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('setup.licenceDetails')}</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('setup.licenceNoLabel')}</Text>
            <TextInput
              style={styles.input}
              value={licenceNo}
              onChangeText={setLicenceNo}
              placeholder={t('setup.licenceNoPlaceholder')}
              placeholderTextColor="#CBD5E1"
              autoCapitalize="characters"
            />
          </View>
          <View style={[styles.inputGroup, styles.lastInputGroup]}>
            <Text style={styles.label}>{t('setup.finLabel')}</Text>
            <TextInput
              style={styles.input}
              value={fin}
              onChangeText={v => {
                setFin(v);
                setFinError(v.trim() && !isValidFin(v.trim()) ? 'Invalid FIN — must be 9 digits, 5–6 digits, C/D + 7 digits, or DFOCC + 9 digits.' : '');
              }}
              placeholder={t('setup.finPlaceholder')}
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
            />
            {!!finError && <Text style={styles.fieldError}>{finError}</Text>}
          </View>
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{t('setup.infoText')}</Text>
        </View>

        {/* Price box */}
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>{t('setup.priceLabel')}</Text>
          <Text style={styles.priceAmount}>{t('setup.priceAmount')}</Text>
          <Text style={styles.priceSub}>{t('setup.priceSub')}</Text>
        </View>

        {/* Activate button */}
        <TouchableOpacity
          style={[
            styles.activateButton,
            loading && styles.activateButtonDisabled,
            devMode && styles.activateButtonDev,
          ]}
          onPress={handleActivate}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Text style={styles.activateButtonText}>
            {loading ? t('setup.processing') : devMode ? t('setup.previewAs', { region: selectedRegionLabel }) : t('setup.activateButton')}
          </Text>
        </TouchableOpacity>

        {/* Restore purchase — hidden in dev mode */}
        {!devMode && (
          <TouchableOpacity onPress={handleRestore} disabled={loading} style={styles.restoreButton}>
            <Text style={styles.restoreText}>{t('setup.restoreButton')}</Text>
          </TouchableOpacity>
        )}

        {/* Test Harness — DEV only, shown when DEV pill is active */}
        {devMode && isAdmin && (
          <TouchableOpacity
            style={styles.harnessButton}
            onPress={() => setHarnessVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.harnessText}>{t('setup.harnessButton')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={harnessVisible} animationType="slide" presentationStyle="fullScreen">
        <DfoTestHarnessScreen onClose={() => setHarnessVisible(false)} />
      </Modal>
    </View>
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
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 14 : 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  headerSpacer: { width: 36 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 36,
    alignItems: 'flex-end',
  },
  scroll: { flex: 1 },
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
    marginBottom: 14,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  pillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  inputGroup: { marginBottom: 14 },
  lastInputGroup: { marginBottom: 0 },
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
  infoBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  priceBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  priceSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 3,
  },
  activateButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  activateButtonDisabled: {
    backgroundColor: '#93A3C2',
  },
  activateButtonDev: {
    backgroundColor: '#EA580C',
  },
  devPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    minWidth: 36,
    alignItems: 'center',
  },
  devPillActive: {
    backgroundColor: '#EA580C',
  },
  devPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  restoreText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  harnessButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EA580C',
  },
  harnessText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
  },
  fieldError: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 4,
    fontWeight: '500',
  },
});
