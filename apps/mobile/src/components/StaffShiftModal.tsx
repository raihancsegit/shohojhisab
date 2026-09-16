import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';

export default function StaffShiftModal() {
  const { activeRoleMode, switchRoleMode, triggerHaptic } = useAuth();
  const { isStaffModalOpen, closeStaffModal } = useNav();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handlePinSubmit = (inputPin: string) => {
    if (inputPin === '1234') {
      switchRoleMode('owner');
      setPin('');
      setError('');
      closeStaffModal();
    } else if (inputPin === '2222' || inputPin === '4444') {
      switchRoleMode('staff');
      setPin('');
      setError('');
      closeStaffModal();
    } else {
      triggerHaptic('warning');
      setError('ভুল পিন! মালিকের পিন ১২৩৪ অথবা স্টাফের পিন ২২২২ দিন।');
    }
  };

  return (
    <Modal
      visible={isStaffModalOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={closeStaffModal}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={closeStaffModal} />

        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🔄 ক্যাশিয়ার / স্টাফ শিফট পরিবর্তন</Text>
              <Text style={styles.subtitle}>
                বর্তমান মোড: <Text style={{ color: '#4f46e5', fontWeight: 'bold' }}>{activeRoleMode === 'owner' ? 'দোকান মালিক (Owner)' : 'স্টাফ (Cashier)'}</Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={closeStaffModal}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* PIN Input */}
          <View style={styles.pinSection}>
            <Text style={styles.pinLabel}>৪-ডিজিট পিন (PIN) কোড দিন:</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.pinInput}
                value={pin}
                onChangeText={setPin}
                placeholder="••••"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
              <TouchableOpacity
                style={styles.pinSubmitBtn}
                onPress={() => handlePinSubmit(pin)}
              >
                <Text style={styles.pinSubmitBtnText}>প্রবেশ</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick 1-Click Switchers */}
          <Text style={styles.quickLabel}>⚡ দ্রুত শিফট পরিবর্তন:</Text>

          <TouchableOpacity
            style={[
              styles.roleCard,
              activeRoleMode === 'owner' && styles.roleCardActive
            ]}
            onPress={() => handlePinSubmit('1234')}
          >
            <View style={styles.roleCardLeft}>
              <Text style={styles.roleCardEmoji}>👑</Text>
              <View>
                <Text style={styles.roleCardTitle}>দোকান মালিক (Owner)</Text>
                <Text style={styles.roleCardSub}>সম্পূর্ণ এক্সেস ও মোট লাভ</Text>
              </View>
            </View>
            <Text style={styles.roleCardPin}>PIN: 1234</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              activeRoleMode === 'staff' && styles.roleCardActive
            ]}
            onPress={() => handlePinSubmit('2222')}
          >
            <View style={styles.roleCardLeft}>
              <Text style={styles.roleCardEmoji}>👤</Text>
              <View>
                <Text style={styles.roleCardTitle}>ক্যাশিয়ার স্টাফ (Cashier)</Text>
                <Text style={styles.roleCardSub}>শুধু POS বিক্রি ও কালেকশন</Text>
              </View>
            </View>
            <Text style={styles.roleCardPin}>PIN: 2222</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pinSection: {
    marginBottom: 16,
  },
  pinLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pinInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 18,
    letterSpacing: 4,
    backgroundColor: '#f8fafc',
  },
  pinSubmitBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  quickLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  roleCardActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  roleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleCardEmoji: {
    fontSize: 20,
  },
  roleCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  roleCardSub: {
    fontSize: 11,
    color: '#64748b',
  },
  roleCardPin: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4f46e5',
  },
});
