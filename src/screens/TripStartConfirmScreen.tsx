import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, CheckCircle, User } from 'lucide-react-native';
import { loadCaptainProfile, CaptainProfile } from '../utils/captainStorage';
import { DFO_SUBFORM_REGISTRY } from '../utils/dfoConstants';
import CaptainProfileScreen from './CaptainProfileScreen';

interface Props {
  onConfirm: (tripStartTime: string) => void;
  onBack: () => void;
}

export default function TripStartConfirmScreen({ onConfirm, onBack }: Props) {
  const { t, i18n } = useTranslation('dfo');
  const [profile, setProfile] = useState<CaptainProfile | null>(null);
  // Fixed at mount — this is the moment the user tapped "Fill Out New ELOG"
  const [tripStartTime] = useState(() => new Date().toISOString());
  const [editProfileVisible, setEditProfileVisible] = useState(false);

  const reload = useCallback(async () => {
    const p = await loadCaptainProfile();
    setProfile(p);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const regionInfo = profile ? DFO_SUBFORM_REGISTRY[profile.subformId] : null;
  const regionDisplay = regionInfo
    ? `${regionInfo.regionLabel} — ${t('tripConfirm.subformWord')} ${regionInfo.subformId}`
    : t('tripConfirm.notSet');

  const formatTripStart = (iso: string) => {
    const d = new Date(iso);
    const locale = i18n.language.startsWith('fr') ? 'fr-CA' : 'en-CA';
    return d.toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' });
  };

  const renderRow = (label: string, value: string) => (
    <View style={styles.fieldRow} key={label}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, !value && styles.fieldValueEmpty]}>
        {value || t('tripConfirm.notSet')}
      </Text>
    </View>
  );

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1E3A8A" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <ChevronLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{t('tripConfirm.headerTitle')}</Text>
          <Text style={styles.headerSub}>{t('tripConfirm.headerSub')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Trip start timestamp */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('tripConfirm.tripStartCard')}</Text>
          {renderRow(t('tripConfirm.tripStartLabel'), formatTripStart(tripStartTime))}
        </View>

        {/* Profile details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('tripConfirm.profileCard')}</Text>
          {renderRow(t('tripConfirm.operatorNameLabel'), profile.operatorName)}
          {renderRow(t('tripConfirm.vrnLabel'), profile.vesselNumber)}
          {renderRow(t('tripConfirm.licenceNoLabel'), profile.fishingNumber)}
          {renderRow(t('tripConfirm.finLabel'), profile.licenceHolderFin)}
          {renderRow(t('tripConfirm.regionLabel'), regionDisplay)}
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setEditProfileVisible(true)}
          activeOpacity={0.8}
        >
          <User size={16} color="#1E3A8A" />
          <Text style={styles.editButtonText} numberOfLines={1} adjustsFontSizeToFit>{t('tripConfirm.editProfileButton')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => onConfirm(tripStartTime)}
          activeOpacity={0.8}
        >
          <CheckCircle size={16} color="#FFFFFF" />
          <Text style={styles.confirmButtonText}>{t('tripConfirm.confirmButton')}</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Profile modal — reloads profile on close */}
      <Modal
        visible={editProfileVisible}
        animationType="slide"
        onRequestClose={() => { setEditProfileVisible(false); reload(); }}
      >
        <CaptainProfileScreen
          onClose={() => { setEditProfileVisible(false); reload(); }}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    // S99: no window-top inset here — this screen renders BELOW the persistent app header,
    // which already consumes insets.top (App.tsx). The Android StatusBar.currentHeight
    // padding drew a spurious gap band between the two headers (the "double header").
  },
  header: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    color: '#BFDBFE',
    fontWeight: '500',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    flex: 1,
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 2,
    textAlign: 'right',
  },
  fieldValueEmpty: {
    color: '#CBD5E1',
    fontWeight: '400',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    backgroundColor: '#EFF6FF',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    // Text defaults to flexShrink 0 in a row — unconstrained, it overflows the button
    // and adjustsFontSizeToFit never engages. Shrinkable bounds let the scale kick in.
    flexShrink: 1,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1E3A8A',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
