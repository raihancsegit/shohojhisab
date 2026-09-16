import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

const TUTORIALS = [
  { id: '1', title: '🛒 ১ মিনিটে POS কাউন্টার থেকে দ্রুত বিক্রি করার নিয়ম', duration: '১:৩০ মিনিট', tag: 'বিক্রি' },
  { id: '2', title: '📖 বাকি খাতায় কাস্টমার যুক্ত ও কিস্তি আদায় করার উপায়', duration: '২:১৫ মিনিট', tag: 'খাতা' },
  { id: '3', title: '📦 নতুন পণ্যের স্টক তোলা ও পাইকারি ডিলার ক্রয় হিসাব', duration: '১:৪৫ মিনিট', tag: 'স্টক' },
  { id: '4', title: '🎙️ মুখে বাংলায় বলে ভয়েস কমান্ডের মাধ্যমে হিসাব রাখা', duration: '১:১০ মিনিট', tag: 'এআই ভয়েস' },
  { id: '5', title: '🌙 দিন শেষে ক্যাশ ড্রয়ার মিলানো ও নিট লাভ দেখা', duration: '২:০০ মিনিট', tag: 'রিপোর্ট' },
];

export default function TutorialsScreen() {
  const { theme, triggerHaptic, speakAnnouncement } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: '🎬 টিউটোরিয়াল ভিডিও গাইড',
          headerStyle: { backgroundColor: theme.primaryColor || '#4f46e5' },
          headerTintColor: '#ffffff',
        }}
      />

      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>🎬</Text>
        <Text style={styles.bannerTitle}>ভিডিও টিউটোরিয়াল ও ব্যবহার নির্দেশিকা</Text>
        <Text style={styles.bannerSub}>সহজ হিসাবের প্রতিটি ফিচারের সহজ বাংলা ভিডিও গাইড</Text>
      </View>

      {TUTORIALS.map(tut => (
        <TouchableOpacity
          key={tut.id}
          style={styles.card}
          onPress={() => {
            triggerHaptic('light');
            speakAnnouncement(tut.title);
          }}
        >
          <View style={styles.thumbBox}>
            <Text style={styles.playIcon}>▶️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tut.tag}</Text>
            </View>
            <Text style={styles.tutTitle}>{tut.title}</Text>
            <Text style={styles.tutDuration}>⏱️ সময়কাল: {tut.duration}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, gap: 12 },
  banner: { backgroundColor: '#1e1b4b', padding: 20, borderRadius: 16, alignItems: 'center' },
  bannerEmoji: { fontSize: 32, marginBottom: 4 },
  bannerTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  bannerSub: { fontSize: 12, color: '#c7d2fe', marginTop: 2, textAlign: 'center' },
  card: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 12, alignItems: 'center' },
  thumbBox: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  playIcon: { fontSize: 24 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#eef2ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#4f46e5' },
  tutTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', lineHeight: 18 },
  tutDuration: { fontSize: 11, color: '#64748b', marginTop: 4 },
});
