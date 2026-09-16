import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { executeMobileAiCommand } from '../lib/offlineAiEngine';
import { playNativeChime, speakNativeText } from '../lib/offlineAudioEngine';

const { width } = Dimensions.get('window');

export default function FloatingVoiceFab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tenant, theme, themeMode, triggerHaptic, refreshVault } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [lastSpeech, setLastSpeech] = useState('');
  const [isListeningState, setIsListeningState] = useState(false);
  const isDark = themeMode === 'dark';

  const categorizedCommands = [
    {
      category: '🛒 বিক্রয় ও কুইক POS মেমো',
      items: [
        { label: 'তেল ১ লিটার বিক্রি করো', cmd: 'তেল ১ লিটার বিক্রি করো' },
        { label: 'চিনি ২ কেজি বিক্রি করো', cmd: 'চিনি ২ কেজি বিক্রি করো' },
        { label: 'নাপা ৫০ পাতা বিক্রি', cmd: 'নাপা ৫০ পাতা বিক্রি' },
        { label: 'পস কাউন্টারে যাও', cmd: 'পস পেজে যাও' }
      ]
    },
    {
      category: '📖 বাকির খাতা ও কালেকশন',
      items: [
        { label: 'রহিমের বাকিতে ৫০০ টাকা লেখো', cmd: 'রহিমের বাকিতে ৫০০ টাকা লেখো' },
        { label: 'করিমের ২০০ টাকা জমা নাও', cmd: 'করিমের ২০০ টাকা জমা নাও' },
        { label: 'বাজারে মোট বাকি কত আছে?', cmd: 'মোট বাকি কত আছে বলো' },
        { label: 'খাতা পেজে যাও', cmd: 'খাতায় যাও' }
      ]
    },
    {
      category: '📊 হিসাব, লাভ ও খরচ রিপোর্ট',
      items: [
        { label: 'আজকের বিক্রি ও লাভ কত?', cmd: 'আজকের বিক্রি ও লাভ কত' },
        { label: 'দোকানের মোট স্টক কত?', cmd: 'আজকের স্টক কত' },
        { label: 'চা নাস্তা ৬০ টাকা খরচ', cmd: 'চা নাস্তা ৬০ টাকা খরচ লেখো' },
        { label: 'রিপোর্ট পেজে যাও', cmd: 'রিপোর্ট পেজে যাও' }
      ]
    }
  ];

  const handleOpenAssistant = () => {
    triggerHaptic('medium');
    playNativeChime('beep');
    setIsOpen(true);
    setIsListeningState(true);
    setLastSpeech('শুনছি... মুখে বলুন অথবা নিচের কমান্ডে চাপুন');
    speakNativeText('জি বলুন, কী হিসাব করতে হবে?');
  };

  const handleRunCommand = (textToRun: string) => {
    const q = textToRun.trim();
    if (!q) return;

    triggerHaptic('medium');
    setInputText('');
    playNativeChime('beep');
    setIsListeningState(false);

    const result = executeMobileAiCommand(tenant.id, q);
    const speechText = result.speech || result.reply;
    setLastSpeech(speechText);

    // Speak announcement loudly via native TTS
    speakNativeText(speechText);
    refreshVault();

    // Auto-navigate only if user explicitly asked for navigation
    const isExplicitNav = /যাও|খোল|নিয়ে চল|পেজে|কাউন্টারে/i.test(q) || (result.reply && result.reply.includes('নিয়ে যাচ্ছি'));
    if (result.navigateTo && isExplicitNav) {
      setTimeout(() => {
        setIsOpen(false);
        router.push(result.navigateTo as any);
      }, 1200);
    }
  };

  const primaryColor = theme.primaryColor || '#059669';
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 14 : 20);
  const fabBottom = 58 + bottomInset + 16;

  return (
    <>
      {/* 🎙️ Sleek Circular Floating Voice FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleOpenAssistant}
        style={[
          styles.fab,
          {
            backgroundColor: primaryColor,
            bottom: fabBottom
          }
        ]}
      >
        <Text style={styles.fabIcon}>🎙️</Text>
      </TouchableOpacity>

      {/* 🤖 Universal AI Voice Assistant Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.sheetCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff', paddingBottom: insets.bottom + 20 }]}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.headerLeft}>
                <View style={[styles.avatarBox, { backgroundColor: isDark ? '#1e293b' : '#eef2ff' }]}>
                  <Text style={styles.assistantAvatar}>🤖</Text>
                </View>
                <View>
                  <Text style={[styles.sheetTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                    সহজ হিসাব এআই সহকারী
                  </Text>
                  <Text style={styles.sheetSub}>১০০% অফলাইন বাংলা ভয়েস ইঞ্জিন</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 🎙️ Live Animated Speech Bubble */}
            <View style={[
              styles.speechBubble,
              {
                backgroundColor: isDark ? '#1e293b' : '#eff6ff',
                borderColor: isDark ? '#334155' : '#bfdbfe'
              }
            ]}>
              <Text style={[styles.speechText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
                🗣️ {lastSpeech || 'শুনছি... মুখে বলুন বা নিচের বাটনে চাপুন'}
              </Text>
            </View>

            {/* Command Input Bar */}
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    borderColor: isDark ? '#334155' : '#cbd5e1'
                  }
                ]}
                placeholder="মুখে বলুন বা লিখুন (যেমন: ২ কেজি চিনি বিক্রি)..."
                placeholderTextColor="#94a3b8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleRunCommand(inputText)}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: primaryColor }]}
                onPress={() => handleRunCommand(inputText)}
              >
                <Text style={styles.sendBtnText}>বলুন ▶</Text>
              </TouchableOpacity>
            </View>

            {/* 1-Tap Voice Commands Directory */}
            <ScrollView style={styles.commandScroll} showsVerticalScrollIndicator={false}>
              {categorizedCommands.map((cat, idx) => (
                <View key={idx} style={styles.catGroup}>
                  <Text style={[styles.catGroupTitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    {cat.category}
                  </Text>
                  <View style={styles.chipGrid}>
                    {cat.items.map((item, iIdx) => (
                      <TouchableOpacity
                        key={iIdx}
                        style={[
                          styles.chipBtn,
                          {
                            backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                            borderColor: isDark ? '#334155' : '#e2e8f0'
                          }
                        ]}
                        onPress={() => handleRunCommand(item.cmd)}
                      >
                        <Text style={[styles.chipText, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                          🎙️ "{item.label}"
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
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
    right: 14,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    borderWidth: 2.5,
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
    maxHeight: '82%'
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  assistantAvatar: {
    fontSize: 22
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  sheetSub: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700'
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 'bold'
  },
  speechBubble: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  speechText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18
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
  commandScroll: {
    maxHeight: 280
  },
  catGroup: {
    marginBottom: 14
  },
  catGroupTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  chipGrid: {
    gap: 6
  },
  chipBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700'
  }
});
