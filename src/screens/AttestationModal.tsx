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

interface Props {
  onAgree: () => void;
}

export default function AttestationModal({ onAgree }: Props) {
  const { t } = useTranslation('dfo');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('attestation.headerTitle')}</Text>
        <Text style={styles.headerSub}>{t('attestation.headerSub')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} centerContent>
        <View style={styles.attestationBox}>
          <Text style={styles.quoteMarks}>"</Text>
          <Text style={styles.attestationText}>{t('attestation.text')}</Text>
          <Text style={[styles.quoteMarks, styles.quoteClose]}>"</Text>
        </View>

        <Text style={styles.note}>{t('attestation.note')}</Text>
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.agreeButton} onPress={onAgree} activeOpacity={0.8}>
          <Text style={styles.agreeText}>{t('attestation.agree')}</Text>
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
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  attestationBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quoteMarks: {
    fontSize: 48,
    color: '#BFDBFE',
    fontWeight: 'bold',
    lineHeight: 48,
    marginBottom: -8,
  },
  quoteClose: {
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 0,
  },
  attestationText: {
    fontSize: 17,
    color: '#1E293B',
    lineHeight: 27,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  note: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  buttonRow: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  agreeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#1E40AF',
  },
  agreeText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
