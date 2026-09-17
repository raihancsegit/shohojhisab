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
  const isDark = themeMode === 'dark';

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for mic
  useEffect(() => {
    if (isOpen) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOpen]);

  // Voice Navigation & Action Categories (No keyboard needed, 100% voice command driven)
  const categorizedCommands = [
    {
      category: '🚀 পেজে যাওয়া (১-ট্যাপ ভয়েস নেভিগেশন)',
      items: [
        { label: 'খাতা পেজে যাও', cmd: 'খাতা পেজে যাও', icon: '📒' },
        { label: 'স্টক পেজে যাও', cmd: 'স্টক পেজে যাও', icon: '📦' },
        { label: 'পস কাউন্টারে যাও', cmd: 'পস পেজে যাও', icon: '🛒' },
        { label: 'কিস্তি খাতা খোল', cmd: 'কিস্তি খাতা খোল', icon: '📅' },
        { label: 'রিপোর্ট ও লাভ দেখো', cmd: 'রিপোর্ট পেজে যাও', icon: '📊' },
        { label: 'ডিলার খাতা খোল', cmd: 'ডিলার খাতা খোল', icon: '🛍️' },
        { label: 'খরচ পেজে যাও', cmd: 'খরচ পেজে যাও', icon: '💸' },
        { label: 'দিন শেষ পেজে যাও', cmd: 'দিন শেষ পেজে যাও', icon: '🌙' }
      ]
    },
    {
      category: '📊 হিসাব ও লাভ রিপোর্ট (লাইভ অডিও উত্তর)',
      items: [
        { label: 'আজকের বিক্রি ও লাভ কত?', cmd: 'আজকের বিক্রি ও লাভ কত', icon: '💰' },
        { label: 'দোকানে মোট বাকি কত আছে?', cmd: 'মোট বাকি কত আছে বলো', icon: '📖' },
        { label: 'কোন পণ্যের স্টক কম?', cmd: 'কোন মালের স্টক কম', icon: '⚠️' },
        { label: 'মোট কত স্টক আছে?', cmd: 'আজকের স্টক কত', icon: '📦' }
      ]
    },
    {
      category: '⚡ দ্রুত হিসাব এন্ট্রি (কুইক অ্যাকশন)',
      items: [
        { label: 'তেল ১ লিটার বিক্রি', cmd: 'তেল ১ লিটার বিক্রি করো', icon: '🛒' },
        { label: 'চিনি ২ কেজি বিক্রি', cmd: 'চিনি ২ কেজি বিক্রি করো', icon: '🛒' },
        { label: 'কালামের ৫০০ টাকা জমা', cmd: 'কালামের ৫০০ টাকা জমা নাও', icon: '💵' },
        { label: 'রহিমের ৩০০ টাকা বাকি', cmd: 'রহিমের বাকিতে ৩০০ টাকা লেখো', icon: '📝' },
        { label: 'চা নাস্তা ৬০ টাকা খরচ', cmd: 'চা নাস্তা ৬০ টাকা খরচ লেখো', icon: '☕' }
      ]
    }
  ];

  const handleOpenAssistant = () => {
    triggerHaptic('medium');
    playNativeChime('beep');
    setIsOpen(true);
    setLastSpeech('শুনছি... নিচের যেকোনো কমান্ডে চাপুন বা কথা বলুন');
    speakNativeText('জি বলুন, কী করতে হবে?');
  };

  const handleRunCommand = (textToRun: string) => {
    const q = textToRun.trim();
    if (!q) return;

    triggerHaptic('medium');
    setInputText('');
    playNativeChime('beep');

    const result = executeMobileAiCommand(tenant.id, q);
    const speechText = result.speech || result.reply;
    setLastSpeech(speechText);

    // Speak announcement loudly via native TTS
    speakNativeText(speechText);
    refreshVault();

    // Auto-navigate if requested
    if (result.navigateTo) {
      setTimeout(() => {
        setIsOpen(false);
        router.push(result.navigateTo as any);
      }, 700);
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
                    সহজ হিসাব ভয়েস সহকারী
                  </Text>
                  <Text style={styles.sheetSub}>মুখের কথা শুনে স্বয়ংক্রিয় পেজ নেভিগেশন ও হিসাব</Text>
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
                🗣️ {lastSpeech || 'শুনছি... নিচের যেকোনো কমান্ডে চাপুন'}
              </Text>
            </View>

            {/* Optional Text input for flexibility */}
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
                placeholder="কমান্ড লিখুন বা মুখে বলুন..."
                placeholderTextColor="#94a3b8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleRunCommand(inputText)}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: primaryColor }]}
                onPress={() => handleRunCommand(inputText)}
              >
                <Text style={styles.sendBtnText}>চালান ▶</Text>
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
                          {item.icon} {item.label}
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
    marginBottom: 10
  },
  textInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 12.5,
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
    fontSize: 12.5
  },
  commandScroll: {
    maxHeight: 300
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
