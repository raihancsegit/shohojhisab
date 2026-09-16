import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { executeMobileAiCommand } from '../src/lib/offlineAiEngine';
import { playNativeChime, speakNativeText } from '../src/lib/offlineAudioEngine';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  navigateTo?: string;
}

export default function AiAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tenant, theme, themeMode, triggerHaptic } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: `আসসালামু আলাইকুম! আমি ${tenant.shopName} এর ডিজিটাল এআই হিসাব সহকারী।\n\nআপনি মুখে যা বলবেন (যেমন: "আজকের লাভ কত", "রহিম ৫০০ টাকা বাকি নিল", "চা নাস্তা ৬০ টাকা খরচ", "কোন পণ্যের স্টক কম") আমি স্বয়ংক্রিয়ভাবে হিসাব রেখে সাউন্ডবক্সে ঘোষণা দেব।`,
      time: 'লাইভ'
    }
  ]);
  const [inputText, setInputText] = useState('');

  const presetChips = [
    '📦 আজকের স্টক কত?',
    '📊 আজকের বিক্রি ও লাভ কত?',
    '➕ নাপা ৫০ পাতা স্টক যোগ করো',
    '📖 রহিমের ৫০০ টাকা বাকি',
    '💵 রহিমের ৫০০ টাকা জমা নাও',
    '☕ চা নাস্তা ৬০ টাকা খরচ লেখো',
    '⚠️ কোন মালের স্টক কম?',
    '📖 বাজারে মোট বাকি কত?'
  ];

  const handleSendMessage = (msgText?: string) => {
    const q = (msgText || inputText).trim();
    if (!q) return;

    triggerHaptic('medium');
    playNativeChime('beep');

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      time: 'এইমাত্র'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Execute offline AI engine
    const res = executeMobileAiCommand(tenant.id, q);
    const replyText = res.speech || res.reply;

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        time: '🟢 অফলাইন এআই',
        navigateTo: res.navigateTo
      };
      setMessages(prev => [...prev, aiMsg]);
      speakNativeText(replyText);
      playNativeChime('success');
      triggerHaptic('success');
    }, 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      {/* Header Banner */}
      <View style={[styles.headerCard, { backgroundColor: isDark ? '#111827' : primaryColor }]}>
        <View style={styles.headerAvatar}>
          <Text style={styles.avatarIcon}>🤖</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>সহজ হিসাব ডিজিটাল সহকারী</Text>
          <Text style={styles.headerSub}>১০০% অফলাইন অন-ডিভাইস ভয়েস ও হিসাব ইঞ্জিন</Text>
        </View>
      </View>

      {/* Preset Chips */}
      <View style={[styles.presetRow, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 10 }}>
          {presetChips.map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.presetChip, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
              onPress={() => handleSendMessage(chip.replace(/^[^\s]+\s/, ''))}
            >
              <Text style={[styles.presetChipText, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Chat Messages */}
      <ScrollView
        style={styles.chatArea}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(m => (
          <View
            key={m.id}
            style={[
              styles.msgWrap,
              m.sender === 'user' ? styles.userMsgWrap : styles.aiMsgWrap
            ]}
          >
            <View
              style={[
                styles.msgBubble,
                m.sender === 'user'
                  ? [styles.userBubble, { backgroundColor: primaryColor }]
                  : [styles.aiBubble, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]
              ]}
            >
              <Text
                style={[
                  styles.msgText,
                  m.sender === 'user' ? styles.userText : [styles.aiText, { color: isDark ? '#f8fafc' : '#0f172a' }]
                ]}
              >
                {m.text}
              </Text>

              {m.navigateTo && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: primaryColor }]}
                  onPress={() => router.push(m.navigateTo as any)}
                >
                  <Text style={styles.actionBtnText}>পেজে যান ➔</Text>
                </TouchableOpacity>
              )}

              <Text style={[styles.timeText, m.sender === 'user' ? { color: 'rgba(255,255,255,0.7)' } : { color: '#94a3b8' }]}>
                {m.time}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Message Input Bar */}
      <View style={[styles.inputBar, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderTopColor: isDark ? '#1e293b' : '#e2e8f0', paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={[styles.textInput, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
          placeholder="মুখে বলুন বা লিখুন (যেমন: ২ কেজি চিনি বিক্রি)..."
          placeholderTextColor="#94a3b8"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSendMessage()}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: primaryColor }]}
          onPress={() => handleSendMessage()}
        >
          <Text style={styles.sendBtnText}>বলুন ▶</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarIcon: { fontSize: 24 },
  headerTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  presetRow: { paddingVertical: 8, borderBottomWidth: 1 },
  presetChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  presetChipText: { fontSize: 11.5, fontWeight: '700' },
  chatArea: { flex: 1 },
  msgWrap: { marginBottom: 12, width: '100%' },
  userMsgWrap: { alignItems: 'flex-end' },
  aiMsgWrap: { alignItems: 'flex-start' },
  msgBubble: { maxWidth: '85%', borderRadius: 16, padding: 12 },
  userBubble: { borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4, borderWidth: 1, elevation: 1 },
  msgText: { fontSize: 13.5, lineHeight: 20 },
  userText: { color: '#ffffff', fontWeight: '700' },
  aiText: { fontWeight: '600' },
  actionBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 8 },
  actionBtnText: { color: '#ffffff', fontSize: 11.5, fontWeight: '800' },
  timeText: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row', padding: 10, borderTopWidth: 1, gap: 8 },
  textInput: { flex: 1, height: 44, borderRadius: 12, paddingHorizontal: 14, fontSize: 13, fontWeight: '600' },
  sendBtn: { paddingHorizontal: 16, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900' }
});
