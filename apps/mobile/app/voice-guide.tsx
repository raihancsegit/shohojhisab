import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { parseBengaliCommand } from '../src/lib/offlineAiEngine';

const COMMAND_CATEGORIES = [
  {
    category: '🛒 বিক্রয় ও কুইক POS কমান্ড',
    commands: [
      { cmd: '২ কেজি চিনি বিক্রি করো', desc: 'স্বয়ংক্রিয়ভাবে কার্টে চিনি ২ কেজি যোগ করে' },
      { cmd: 'নাপা এক্সট্রা ৫ পাতা বিক্রি', desc: 'ফার্মেসিতে ৫ পাতা নাপা যোগ করে' },
      { cmd: 'ক্যাশ ৫০০ টাকা বিক্রি সম্পন্ন', desc: 'নগদ বিক্রি রসিদ তৈরি ও সাউন্ডবক্স ঘোষণা' }
    ]
  },
  {
    category: '📖 বাকির খাতা ও কালেকশন কমান্ড',
    commands: [
      { cmd: 'রহিমের বাকিতে ৩০০ টাকা লেখো', desc: 'রহিমের খতিয়ানে ৩০০ টাকা বাকি যোগ করে' },
      { cmd: 'করিমের কাছ থেকে ৫০০ টাকা জমা নাও', desc: 'বাকি আদায় করে ব্যালেন্স আপডেট ও সাউন্ডবক্স বলবে' },
      { cmd: 'মোট বাকি কত আছে বলো', desc: 'দোকানের সর্বমোট বাকি টাকার হিসাব পড়ে শোনাবে' }
    ]
  },
  {
    category: '📦 স্টক ও ইনভেন্টরি চেক',
    commands: [
      { cmd: 'সয়াবিন তেলের স্টক কত আছে', desc: 'তেলের বর্তমান গোডাউন ও দোকান স্টক জানাবে' },
      { cmd: 'কম স্টক আইটেম দেখাও', desc: 'যেসব মালের স্টক কমে গেছে তার তালিকা দেবে' }
    ]
  },
  {
    category: '💸 দৈনিক খরচ ও ক্যাশ ড্রয়ার',
    commands: [
      { cmd: 'দোকান ভাড়া ১০০০ টাকা খরচ লেখো', desc: 'খরচের খতিয়ানে ১০০০ টাকা এন্ট্রি করবে' },
      { cmd: 'আজকের মোট বিক্রি কত', desc: 'আজকের মোট বিক্রি ও ক্যাশ জমা জানাবে' }
    ]
  }
];

export default function VoiceGuideScreen() {
  const { theme, triggerHaptic, speakAnnouncement } = useAuth();
  const router = useRouter();

  const handleTestCommand = (commandText: string) => {
    triggerHaptic('success');
    speakAnnouncement(`কমান্ড গৃহীত হয়েছে: ${commandText}`);
    const parsed = parseBengaliCommand(commandText);
    if (parsed.action === 'sale') {
      setTimeout(() => router.push('/pos'), 1200);
    } else if (parsed.action === 'due_add' || parsed.action === 'due_payment') {
      setTimeout(() => router.push('/khata'), 1200);
    } else if (parsed.action === 'expense') {
      setTimeout(() => router.push('/expenses'), 1200);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: '🎙️ ভয়েস নির্দেশিকা (কমান্ড গাইড)',
          headerStyle: { backgroundColor: theme.primaryColor || '#059669' },
          headerTintColor: '#ffffff',
        }}
      />

      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>🎙️</Text>
        <Text style={styles.bannerTitle}>সহজ হিসাব স্মার্ট বাংলা ভয়েস এআই</Text>
        <Text style={styles.bannerSub}>ইন্টারনেট ছাড়াও ১০০% অফলাইনে মুখে বাংলায় বলে দোকান চালান</Text>
      </View>

      {COMMAND_CATEGORIES.map((cat, idx) => (
        <View key={idx} style={styles.catBox}>
          <Text style={styles.catTitle}>{cat.category}</Text>
          {cat.commands.map((c, cIdx) => (
            <TouchableOpacity
              key={cIdx}
              style={styles.cmdCard}
              onPress={() => handleTestCommand(c.cmd)}
            >
              <View style={styles.cmdHeader}>
                <Text style={styles.cmdText}>🗣️ "{c.cmd}"</Text>
                <Text style={styles.testBadge}>পরীক্ষা করুন ▶</Text>
              </View>
              <Text style={styles.cmdDesc}>{c.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, gap: 14 },
  banner: { backgroundColor: '#1e1b4b', padding: 20, borderRadius: 16, alignItems: 'center' },
  bannerEmoji: { fontSize: 32, marginBottom: 4 },
  bannerTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  bannerSub: { fontSize: 12, color: '#c7d2fe', marginTop: 2, textAlign: 'center' },
  catBox: { gap: 8 },
  catTitle: { fontSize: 13.5, fontWeight: '800', color: '#334155' },
  cmdCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cmdHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cmdText: { fontSize: 13.5, fontWeight: '800', color: '#059669' },
  testBadge: { fontSize: 11, fontWeight: '800', color: '#4f46e5', backgroundColor: '#eef2ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cmdDesc: { fontSize: 11.5, color: '#64748b' },
});
