import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Generic, reusable password-reauthentication modal. Self-contained: it owns its
// own <Modal> and renders identically on iOS AND Android (the whole reason it
// exists — Alert.prompt is iOS-only and does nothing on Android). It carries NO
// feature-specific copy: the caller supplies title / message / confirmLabel /
// cancelLabel / error and handles onConfirm(password) + onCancel. Styled with the
// same tokens as BackupExplainerModal / PrivacyNoticeModal so it looks native.
//
// The `error` prop shows inline WITHOUT closing the modal (e.g. wrong password),
// so the caller can keep it open for a retry. The password field clears itself on
// every dismiss so the modal never reopens with a stale value.

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  error?: string;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

export default function ReauthPasswordModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const [password, setPassword] = useState('');

  // Clear the field whenever the modal is dismissed, so it never reopens stale.
  useEffect(() => {
    if (!visible) setPassword('');
  }, [visible]);

  const handleCancel = () => {
    setPassword('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#CBD5E1"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.8}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, !password && styles.confirmButtonDisabled]}
              onPress={() => onConfirm(password)}
              disabled={!password}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    marginBottom: 16,
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
  error: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1E40AF',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
