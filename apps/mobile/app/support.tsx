import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function SupportScreen() {
  const { theme, triggerHaptic } = useAuth();

  const handleCall = () => {
    triggerHaptic('light');
    Linking.openURL('tel:01986233234');
  };

  const handleWhatsApp = () => {
    triggerHaptic('light');
    Linking.openURL('https://wa.me/8801986233234');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: '🎧 হেল্প এন্ড সাপোর্ট',
          headerStyle: { backgroundColor: theme.primaryColor || '#4f46e5' },
          headerTintColor: '#ffffff',
        }}
      />

      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>🎧</Text>
        <Text style={styles.bannerTitle}>২৪/৭ কাস্টমার কেয়ার ও সাপোর্ট</Text>
        <Text style={styles.bannerSub}>সহজ হিসাব ব্যবহার করতে যে কোনো সহায়তায় আমরা আপনার সাথে আছি</Text>
      </View>

      <TouchableOpacity style={styles.contactCard} onPress={handleCall}>
        <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
          <Text style={styles.icon}>📞</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.contactTitle}>হটলাইন কল করুন</Text>
          <Text style={styles.contactSub}>০১৯৮৬-২৩৩২৩৪ (সকাল ৯টা - রাত ১০টা)</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.contactCard} onPress={handleWhatsApp}>
        <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
          <Text style={styles.icon}>💬</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.contactTitle}>হোয়াটসঅ্যাপে চ্যাট করুন</Text>
          <Text style={styles.contactSub}>সরাসরি সাপোর্ট প্রতিনিধির সাথে মেসেজ করুন</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      {/* FAQ */}
      <Text style={styles.faqHeader}>📌 সাধারণ জিজ্ঞাসাসমূহ (FAQ)</Text>

      <View style={styles.faqCard}>
        <Text style={styles.faqQ}>প্রশ্ন: ইন্টারনেট না থাকলে কি অ্যাপ কাজ করবে?</Text>
        <Text style={styles.faqA}>উত্তর: হ্যাঁ, সহজ হিসাব ১০০% অফলাইন-ফার্স্ট। ইন্টারনেট ছাড়াই আপনি বিক্রি, বাকি খাতা, স্টক ও রসিদ প্রিন্ট করতে পারবেন।</Text>
      </View>

      <View style={styles.faqCard}>
        <Text style={styles.faqQ}>প্রশ্ন: সাউন্ডবক্স কিভাবে কাজ করে?</Text>
        <Text style={styles.faqA}>উত্তর: প্রতিটি বিক্রির পর বা বাকি আদায়ের পর মোবাইলের স্পিকার স্বয়ংক্রিয়ভাবে বাংলায় টাকার পরিমাণ ঘোষণা করে।</Text>
      </View>
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
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 22 },
  contactTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  contactSub: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  arrow: { fontSize: 20, color: '#cbd5e1', fontWeight: 'bold' },
  faqHeader: { fontSize: 13.5, fontWeight: '800', color: '#334155', marginTop: 8 },
  faqCard: { backgroundColor: '#ffffff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  faqQ: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  faqA: { fontSize: 12, color: '#475569', lineHeight: 18 },
});
