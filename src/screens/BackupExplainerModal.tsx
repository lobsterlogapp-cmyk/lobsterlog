import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// One-screen plain-language explainer for DFO cloud backup: what is stored,
// where it lives, and that it is the harvester's to turn off. Informational
// only — consent is the toggle on CaptainProfileScreen, not this screen.
// Opened as a full-screen Modal from CaptainProfileScreen.

interface Props {
  onClose: () => void;
}

export default function BackupExplainerModal({ onClose }: Props) {
  const { t } = useTranslation('common');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('backup.explainerTitle')}</Text>
        <Text style={styles.headerSub}>{t('backup.explainerSubtitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('backup.whatTitle')}</Text>
          <Text style={styles.body}>{t('backup.whatBody')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('backup.whereTitle')}</Text>
          <Text style={styles.body}>{t('backup.whereBody')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('backup.controlTitle')}</Text>
          <Text style={styles.body}>{t('backup.controlBody')}</Text>
        </View>
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.closeText}>{t('backup.closeButton')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: '#BFDBFE',
    fontWeight: '500',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  closeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1E40AF',
  },
  closeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
