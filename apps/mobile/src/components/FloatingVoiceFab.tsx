import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, StyleSheet, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { executeMobileAiCommand } from '../lib/offlineAiEngine';
import { playNativeChime, speakNativeText } from '../lib/offlineAudioEngine';

export default function FloatingVoiceFab() {
  const router = useRouter();
  const { tenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [lastSpeech, setLastSpeech] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const quickCommands = [
    { label: '📊 আজকের বিক্রি ও লাভ', cmd: 'আজকের বিক্রি ও লাভ কত' },
    { label: '📦 মোট স্টক কত?', cmd: 'আজকের স্টক কত' },
    { label: '🛒 POS কাউন্টার', cmd: 'পস' },
    { label: '📖 বাকির খাতা', cmd: 'খাতা' },
    { label: '➕ নাপা ৫০ পাতা স্টক', cmd: 'নাপা ৫০ পাতা স্টক যোগ করো' },
    { label: '☕ চা নাস্তা ৬০ টাকা খরচ', cmd: 'চা নাস্তা ৬০ টাকা খরচ লেখো' }
  ];

  const handleRunCommand = (textToRun: string) => {
    const q = textToRun.trim();
    if (!q) return;

    setIsProcessing(true);
    setInputText('');
    playNativeChime('beep');

    const result = executeMobileAiCommand(tenant.id, q);
    setLastSpeech(result.speech || result.reply);

    speakNativeText(result.speech);

    if (result.navigateTo) {
      setTimeout(() => {
        setIsOpen(false);
        router.push(result.navigateTo as any);
      }, 900);
    }
    setIsProcessing(false);
  };

  return (
    <>
      {/* 🎙️ Circular Floating FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          playNativeChime('beep');
          setIsOpen(true);
        }}
        style={styles.fab}
      >
        <Text style={styles.fabIcon}>🎙️</Text>
      </TouchableOpacity>

      {/* 🤖 Assistant Modal Sheet */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheetCard}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.assistantAvatar}>🤖</Text>
                <View>
                  <Text style={styles.sheetTitle}>সহজ হিসাব সহকারী</Text>
                  <Text style={styles.sheetSub}>১০০% অফলাইন অন-ডিভাইস ভয়েস ইঞ্জিন</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Speech Response Bubble */}
            {lastSpeech ? (
              <View style={styles.speechBubble}>
                <Text style={styles.speechText}>🗣️ {lastSpeech}</Text>
              </View>
            ) : null}

            {/* Command Input Bar */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="মুখে বলুন বা লিখুন (যেমন: স্টক পেজে যাও)..."
                placeholderTextColor="#94a3b8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleRunCommand(inputText)}
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => handleRunCommand(inputText)}
              >
                <Text style={styles.sendBtnText}>যাও →</Text>
              </TouchableOpacity>
            </View>

            {/* 1-Tap Quick Action Chips */}
            <Text style={styles.chipHeading}>💡 দ্রুত কমান্ড নির্বাচন করুন:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {quickCommands.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.chipBtn}
                  onPress={() => handleRunCommand(chip.cmd)}
                >
                  <Text style={styles.chipText}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    zIndex: 999
  },
  fabIcon: {
    fontSize: 24
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  sheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  assistantAvatar: {
    fontSize: 28
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a'
  },
  sheetSub: {
    fontSize: 11.5,
    color: '#059669',
    fontWeight: '700'
  },
  closeBtn: {
    padding: 6
  },
  closeBtnText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '700'
  },
  speechBubble: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14
  },
  speechText: {
    fontSize: 13.5,
    color: '#1e40af',
    fontWeight: '700'
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0f172a',
    fontWeight: '600'
  },
  sendBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13.5
  },
  chipHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 8
  },
  chipScroll: {
    flexDirection: 'row'
  },
  chipBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155'
  }
});
