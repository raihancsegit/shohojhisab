import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { executeMobileAiCommand } from '../lib/offlineAiEngine';
import { playNativeChime, speakNativeText } from '../lib/offlineAudioEngine';

export default function FloatingVoiceFab() {
  const router = useRouter();
  const { tenant, theme, themeMode } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [lastSpeech, setLastSpeech] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const isDark = themeMode === 'dark';

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
        style={[
          styles.fab,
          { backgroundColor: theme.primaryColor || '#4f46e5' }
        ]}
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
          <View style={[styles.sheetCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.assistantAvatar}>🤖</Text>
                <View>
                  <Text style={[styles.sheetTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                    সহজ হিসাব সহকারী
                  </Text>
                  <Text style={styles.sheetSub}>১০০% অফলাইন অন-ডিভাইস ভয়েস ইঞ্জিন</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Speech Response Bubble */}
            {lastSpeech ? (
              <View style={[styles.speechBubble, { backgroundColor: isDark ? '#1e293b' : '#eff6ff', borderColor: isDark ? '#334155' : '#bfdbfe' }]}>
                <Text style={[styles.speechText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>🗣️ {lastSpeech}</Text>
              </View>
            ) : null}

            {/* Command Input Bar */}
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a', borderColor: isDark ? '#334155' : '#cbd5e1' }]}
                placeholder="মুখে বলুন বা লিখুন (যেমন: স্টক পেজে যাও)..."
                placeholderTextColor="#94a3b8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleRunCommand(inputText)}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: theme.primaryColor || '#10b981' }]}
                onPress={() => handleRunCommand(inputText)}
              >
                <Text style={styles.sendBtnText}>বলুন</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Prompt Chips */}
            <Text style={[styles.chipHeading, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              ⚡ কুইক ভয়েস শর্টকাট (১-ট্যাপ কমান্ড):
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              {quickCommands.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.chipBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
                  onPress={() => handleRunCommand(q.cmd)}
                >
                  <Text style={[styles.chipText, { color: isDark ? '#e2e8f0' : '#334155' }]}>{q.label}</Text>
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
    bottom: 84,
    right: 14,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 999
  },
  fabIcon: {
    fontSize: 22
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 32
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  assistantAvatar: {
    fontSize: 26
  },
  sheetTitle: {
    fontSize: 16.5,
    fontWeight: '800'
  },
  sheetSub: {
    fontSize: 11,
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
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12
  },
  speechText: {
    fontSize: 13,
    fontWeight: '700'
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14
  },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600'
  },
  sendBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13
  },
  chipHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    marginBottom: 8
  },
  chipScroll: {
    flexDirection: 'row'
  },
  chipBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginRight: 8
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '700'
  }
});
