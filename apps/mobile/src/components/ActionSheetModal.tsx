import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';

export default function ActionSheetModal() {
  const { triggerHaptic } = useAuth();
  const { isActionSheetOpen, closeActionSheet } = useNav();
  const router = useRouter();

  const handleAction = (href: string) => {
    triggerHaptic('medium');
    closeActionSheet();
    router.push(href as any);
  };

  const handleTriggerVoice = () => {
    triggerHaptic('medium');
    closeActionSheet();
    router.push('/voice-guide');
  };

  return (
    <Modal
      visible={isActionSheetOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={closeActionSheet}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop Press to Close */}
        <Pressable style={styles.backdrop} onPress={closeActionSheet} />

        {/* Action Sheet Container */}
        <View style={styles.sheetContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Section 1: বিক্রয় */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>বিক্রয়</Text>
                <View style={styles.sectionDivider} />
              </View>

              <View style={styles.grid}>
                {/* 1. বিক্রয় */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => handleAction('/pos')}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                    <Text style={styles.icon}>📦</Text>
                  </View>
                  <Text style={styles.actionLabel}>বিক্রয়</Text>
                </TouchableOpacity>

                {/* 2. বিক্রি রিটার্ন */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => handleAction('/reports')}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#fdf2f8' }]}>
                    <Text style={styles.icon}>🛍️</Text>
                  </View>
                  <Text style={styles.actionLabel}>বিক্রি রিটার্ন</Text>
                </TouchableOpacity>

                {/* 3. বাকি আদায় */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => handleAction('/khata')}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#fff7ed' }]}>
                    <Text style={styles.icon}>🤲</Text>
                  </View>
                  <Text style={styles.actionLabel}>বাকি আদায়</Text>
                </TouchableOpacity>

                {/* 4. বাকির কিস্তি */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => handleAction('/installments')}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#e0e7ff' }]}>
                    <Text style={styles.icon}>📅</Text>
                  </View>
                  <Text style={styles.actionLabel}>বাকির কিস্তি</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 2: ক্রয় */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>ক্রয়</Text>
                <View style={styles.sectionDivider} />
              </View>

              <View style={styles.grid}>
                {/* 1. ক্রয় */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => handleAction('/dealers')}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                    <Text style={styles.icon}>🛒</Text>
                  </View>
                  <Text style={styles.actionLabel}>ক্রয়</Text>
                </TouchableOpacity>

                {/* 2. ক্রয় রিটার্ন */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => handleAction('/dealers')}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#ecfdf5' }]}>
                    <Text style={styles.icon}>🔄</Text>
                  </View>
                  <Text style={styles.actionLabel}>ক্রয় রিটার্ন</Text>
                </TouchableOpacity>

                {/* 3. বাকি পরিশোধ */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => handleAction('/dealers')}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
                    <Text style={styles.icon}>💸</Text>
                  </View>
                  <Text style={styles.actionLabel}>বাকি পরিশোধ</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 3: অর্ডার */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>অর্ডার</Text>
                <View style={styles.sectionDivider} />
              </View>

              <View style={styles.grid}>
                {/* 1. বিক্রয় অর্ডার */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => handleAction('/pos')}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                    <Text style={styles.icon}>📋</Text>
                  </View>
                  <Text style={styles.actionLabel}>বিক্রয় অর্ডার</Text>
                </TouchableOpacity>

                {/* 2. ক্রয় অর্ডার */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => handleAction('/dealers')}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#fefce8' }]}>
                    <Text style={styles.icon}>📝</Text>
                  </View>
                  <Text style={styles.actionLabel}>ক্রয় অর্ডার</Text>
                </TouchableOpacity>

                {/* 3. স্টক ফর্দ */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => handleAction('/stock')}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#f8fafc' }]}>
                    <Text style={styles.icon}>🏷️</Text>
                  </View>
                  <Text style={styles.actionLabel}>স্টক ফর্দ</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 4: অন্যান্য */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>অন্যান্য</Text>
                <View style={styles.sectionDivider} />
              </View>

              <View style={styles.grid}>
                {/* 1. লাভ/ক্ষতি */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => handleAction('/reports')}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                    <Text style={styles.icon}>📊</Text>
                  </View>
                  <Text style={styles.actionLabel}>লাভ/ক্ষতি</Text>
                </TouchableOpacity>

                {/* 2. ক্যাশ মিলাই */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => handleAction('/day-end')}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
                    <Text style={styles.icon}>⚖️</Text>
                  </View>
                  <Text style={styles.actionLabel}>ক্যাশ মিলাই</Text>
                </TouchableOpacity>

                {/* 3. ভয়েস হিসাব */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={handleTriggerVoice}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#fef2f2' }]}>
                    <Text style={styles.icon}>🎙️</Text>
                  </View>
                  <Text style={[styles.actionLabel, { color: '#dc2626' }]}>ভয়েস হিসাব</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 99,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    borderBottomWidth: 1.5,
    borderBottomColor: '#c7d2fe',
    borderStyle: 'dashed',
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#5b50e6',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '30%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
  },
});
