import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
  Easing
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

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  // Pulse animation for mic
  useEffect(() => {
    if (isOpen) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOpen]);

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
        { label: 'কালামের ৫০০ টাকা জমা নাও', cmd: 'কালামের ৫০০ টাকা জমা নাও' },
        { label: 'রহিমের বাকিতে ৩০০ টাকা লেখো', cmd: 'রহিমের বাকিতে ৩০০ টাকা লেখো' },
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
    setLastSpeech('শুনছি... মুখে বলুন (যেমন: ২ কেজি চিনি বিক্রি)');
    speakNativeText('জি বলুন, কী হিসাব করতে হবে?');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
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

    // Auto-navigate if requested
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
                <Animated.View style={[styles.avatarBox, { backgroundColor: isDark ? '#1e293b' : '#eef2ff', transform: [{ scale: pulseAnim }] }]}>
                  <Text style={styles.assistantAvatar}>🎙️</Text>
                </Animated.View>
                <View>
                  <Text style={[styles.sheetTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                    সহজ হিসাব এআই ভয়েস সহকারী
                  </Text>
                  <Text style={styles.sheetSub}>১০০% অফলাইন বাংলা ভয়েস ও হিসাব ইঞ্জিন</Text>
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
                🗣️ {lastSpeech || 'শুনছি... মুখে বলুন বা নিচের কমান্ডে চাপুন'}
              </Text>
            </View>

            {/* Voice Input Field */}
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    borderColor: isDark ? '#334155' : '#cbd5e1'
                  }
                ]}
                placeholder="🎙️ মুখে বলুন বা লিখুন (যেমন: ২ কেজি চিনি বিক্রি)..."
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

            {/* 💡 Keyboard Mic Helper Tip */}
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                💡 কিবোর্ডের মাইক্রোফোন (🎙️) চাপলে সরাসরি আপনার মুখের বাংলা কথা লেখা হয়ে যাবে।
              </Text>
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
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: 24
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '85%',
    elevation: 20
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
    gap: 10,
    flex: 1
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center'
  },
  assistantAvatar: {
    fontSize: 22
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '900'
  },
  sheetSub: {
    fontSize: 11,
    color: '#64748b'
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9'
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b'
  },
  speechBubble: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10
  },
  speechText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  textInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    borderWidth: 1.5
  },
  sendBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13
  },
  tipBox: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10
  },
  tipText: {
    fontSize: 10.5,
    color: '#92400e',
    fontWeight: '700'
  },
  commandScroll: {
    maxHeight: 280
  },
  catGroup: {
    marginBottom: 12
  },
  catGroupTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    marginBottom: 6
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  chipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '700'
  }
});
